# -*- coding: utf-8 -*-
"""🐑 助手工程师 —— 命令行入口

把「多个 BOM 表里标红的改动件」拆成加工包,生成可外发的看板,
并在源表或交付文件变动时自动重建。

  sheep new <项目名>                    新建项目文件夹
  sheep import <项目名> --source <目录>  导入已有 BOM 表目录(自动探测结构)
  sheep list                            列出项目
  sheep build [项目]                    构建 BOM 表 + 看板
  sheep watch [项目] --serve            实时监听(+本地服务,浏览器自动打开)
  sheep serve [项目]                    只起服务
  sheep status [项目]                   统计 + 数据检查
  sheep export [项目]                   打包交付
  sheep fix-case [项目]                 规范交付文件名(大小写/扩展名)
  sheep reset [项目]                    丢弃基线,按源表全量重建
  sheep remove <项目>                   从列表移除(不删文件)
  sheep doctor                          环境自检
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time
import traceback
import zipfile
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
    except Exception:
        pass

try:
    from openpyxl import load_workbook
except ImportError:
    sys.exit("缺少 openpyxl。请运行:  pip install openpyxl")

from engine import config as C
from engine import core, dashboard, excel, paths, probe, server
import build_core          # 读取逻辑的唯一入口,不要自己 extract/consolidate

APP = paths.APP_DIR
TAG = "🐑 助手工程师"


def resolve_project(name: str, path: str = "") -> paths.Project:
    """按名字或路径定位项目。

    只做 `APP/项目/<名>` 的路径拼接是不够的:项目一旦是用
    `new <名> --path <别处>` 建的,后面所有不带 --path 的命令就再也
    找不到它了(注册表里明明有)。所以优先按路径,否则查注册表,
    最后才退回默认位置。
    """
    if path:
        return paths.Project(Path(path).resolve())
    try:
        return paths.find_project(name)
    except FileNotFoundError:
        return paths.Project(APP / "项目" / name)


# ==========================================================================
# 构建
# ==========================================================================
def build(proj: paths.Project, full=True, fresh=False, console=print,
          live=False) -> dict:
    """统一走 build_core,保证 CLI 与图形界面行为一致。"""
    from build_core import run_build
    run_build(proj, log=console, full=full, fresh=fresh, live=live)
    return {}


# ==========================================================================
# new
# ==========================================================================
def cmd_new(a):
    name = a.name
    proj = resolve_project(name, a.path)
    if proj.exists() and not a.force:
        print(f"项目已存在: {proj.root}\n"
              f"加 --force 覆盖配置(不会删已有表)")
        return 1                                  # 之前返回 None -> 退出码 0
    cfg = json.loads(json.dumps(C.DEFAULT))
    cfg["project"]["name"] = name
    cfg["project"]["description"] = a.desc or f"{name} · 改动零件外发加工"
    cfg["project"]["baseDir"] = str(proj.source)
    cfg["sources"] = []
    cfg["output"] = {"html": a.html}
    proj.save(cfg)
    proj.ensure_dirs()
    paths.registry_add(proj, name)
    print(f"已创建项目: {proj.root}")
    _print_tree(proj)
    print("\n下一步二选一:")
    print(f"  A. 导入现有 BOM 表:  sheep import {name} --source \"<BOM表所在目录>\"")
    print(f"  B. 从零开始:        把 xlsx 放进 {proj.source}")
    print(f"                     再运行  sheep import {name} --rescan")


def _print_tree(proj: paths.Project):
    print(f"\n项目文件夹结构: {proj.root}")
    for k in paths.SUBDIRS:
        d = proj.d(k)
        n = len([x for x in d.iterdir() if not x.name.startswith('.')]) if d.is_dir() else 0
        note = f"  ({n} 个文件)" if n else "  (空)"
        print(f"  {paths.LAYOUT[k]:<16} {note}")


# ==========================================================================
# import
# ==========================================================================
def cmd_import(a):
    name = a.name
    proj = resolve_project(name, a.path)
    if not proj.exists():
        print(f"项目不存在,先创建:  sheep new {name}")
        return 1                                  # 之前 return -> 退出码 0
    cfg = C.with_defaults(C.load(proj))

    found = []
    if a.rescan:
        found = probe.discover(proj.source)
        if not found and not a.source:
            print(f"{proj.source} 里没有 xlsx")
            return 1
    if a.source:
        src = Path(a.source).resolve()
        if not src.is_dir():
            print(f"源目录不存在: {src}")
            return 1
        print(f"扫描: {src}")
        found += probe.discover(src)
    if not found:
        print("没有找到可用的 BOM 表(需要含『图号/名称』表头,且有红底色标记)")
        print("可放宽: --pattern \".*\"")
        return 1                                  # 之前 return -> 退出码 0

    print(f"\n发现 {len(found)} 个候选表:\n")
    for p in found:
        print(f"  {p['name']}")
        print(f"     工作表={p['sheet']}  表头行={p['headerRow']}  "
              f"数据行={p['firstDataRow']}  列数={p['dataColumns']}")
        print(f"     红底列={p.get('redColumn')}({p.get('redRows',0)} 行)  "
              f"单元格图片={'有' if p['cellImages'] else '无'}")
        print("     全部红底列: " + ", ".join(
            f"{k}={v}" for k, v in (p.get("redAllColumns") or {}).items()))
        if p.get("redAmbiguous"):
            print(f"     ⚠ 有多个列红底数量接近,默认取 {p.get('redColumn')}。"
                  f"若不对,用 --red-column 指定(如 --red-column 8)")
        print("     识别列: " + "  ".join(
            f"{k}={v}" for k, v in p["columns"].items()))
        if p.get("sectionList"):
            secs = list(dict.fromkeys(p["sectionList"]))[:12]
            print(f"     分类段: {' / '.join(secs)}")
        if p.get("notes"):
            print(f"     注意: {'; '.join(p['notes'])}")
        print()

    if a.dry_run:
        print("--dry-run: 未写入配置")
        return

    chosen = found
    if not a.all:
        ans = input(f"采用全部 {len(found)} 个表? [Y/n/(数字选单个)] ").strip().lower()
        if ans in ("n", "no", "否"):
            print("已取消,未写入配置。")
            return 1                              # 用户主动取消也算非成功
        if ans.isdigit() and 1 <= int(ans) <= len(found):
            chosen = [found[int(ans) - 1]]

    # 用第一个表的探测结果作为全局列布局
    ref = chosen[0]
    ex = dict(C.DEFAULT["extract"])
    mapping = {"no": "noColumn", "img": "imgColumn",
               "partNumber": "partNumberColumn", "name": "nameColumn",
               "material": "materialColumn", "qty": "qtyColumn",
               "craft": "craftColumn", "note": "noteColumn"}
    for k, col in ref["columns"].items():
        if k in mapping:
            ex[mapping[k]] = col
    ex["headerRow"] = ref["headerRow"]
    ex["firstDataRow"] = ref["firstDataRow"]
    ex["dataColumns"] = max(ref["dataColumns"],
                            max(ex[m] for m in mapping.values() if ex[m]))
    if ref.get("redColumn"):
        ex["redColumn"] = a.red_column or ref["redColumn"]
    if ref.get("sectionColumn"):
        ex["sectionColumn"] = ref["sectionColumn"]
    # 标红行为 0 时,直接把该表当无红底(用占位列避免误判)
    if not ref.get("redRows"):
        ex["redColumn"] = max(ex["noColumn"], ex["partNumberColumn"])
        ex["redColors"] = []
    cfg["extract"] = ex
    cfg["categories"]["directSections"] = _sections_to_map(ref.get("sectionList", []))
    cfg["categories"]["openSections"] = [
        s for s in dict.fromkeys(ref.get("sectionList", []))
        if s not in cfg["categories"]["directSections"].keys()]

    sources = []
    base = proj.source
    for p in chosen:
        src = Path(p["path"])
        if a.copy or a.rescan:
            base.mkdir(parents=True, exist_ok=True)
            dst = base / src.name
            if src.resolve() != dst.resolve():
                if dst.exists():
                    dst.unlink()
                shutil.copy2(src, dst)
            stored = dst
        else:
            stored = src
        sources.append({"tag": p.get("tag", ""), "path": str(stored),
                        "sheet": p["sheet"]})
    cfg["sources"] = sources
    cfg["project"]["baseDir"] = str(proj.source)
    proj.save(cfg)
    print(f"已写入配置: {proj.config_file}")
    print(f"  源表 {len(sources)} 个: " +
          ", ".join(f'[{s["tag"] or "?"}] {Path(s["path"]).name}' for s in sources))
    print(f"  标红判定列 = 第 {ex['redColumn']} 列, 颜色 = "
          f"{', '.join(ex['redColors']) or '无(整表收录)'}")
    print(f"  分类段列 = 第 {ex['sectionColumn']} 列")
    print(f"\n现在可以构建:  sheep build {name}")


def _sections_to_map(sections):
    """段名 → 分类。只有明确的段(如「塑胶件」)才进 directSections;
    开放段(如「机加件」)必须留给 openSections,否则段内细分规则不会生效。"""
    out = {}
    for s in sections or []:
        for key, cat in C.DEFAULT["categories"]["directSections"].items():
            if key in s:
                out[s] = cat
                break
    return out


def _clean_rules(cfg):
    """防御:开放段不能同时出现在 directSections 里。"""
    c = cfg["categories"]
    opens = set(c.get("openSections") or [])
    bad = [s for s in c.get("directSections", {}) if s in opens]
    for s in bad:
        c["directSections"].pop(s, None)
    return bad


# ==========================================================================
# 其他子命令
# ==========================================================================
def cmd_rules(a):
    """配置开放段内的分类规则(加工件 vs 外购件)。"""
    from collections import Counter
    proj = paths.find_project(a.project)
    cfg = C.with_defaults(C.load(proj))
    cfg["_proj_root"] = str(proj.root)
    if not cfg["sources"]:
        print("这个项目只有 BOM 表,没有零件表。\n"
              "开放段细分规则只对零件表生效 —— 导入零件表后这条命令才有内容。\n"
              "(BOM 表已经是核对过的最终表,分类直接写在文件名/工作表名上)")
        return 1
    recs = core.extract(cfg, log=lambda m: None)
    cats = cfg["categories"]
    opens = set(cats.get("openSections") or [])
    # 只看「开放段」里的行 —— 它们才是需要靠规则细分的
    pool = [r for r in recs if r.get("section") in opens] if opens \
        else [r for r in recs if r["cat"] == cats["unmatchedCategory"]]

    print("当前规则")
    print(f"  图号前缀 → {cats['machinedCategory']}: "
          f"{', '.join(cats['machinedPrefixes']) or '(空)'}")
    print(f"  关键字   → {cats['purchaseCategory']}: "
          f"{', '.join(cats['purchaseKeywords']) or '(空)'}")
    print(f"  都不命中 → {cats['unmatchedCategory']}")
    print(f"\n开放段 {sorted(opens) or '(未设置)'} 里的行: {len(pool)} 条"
          f"  (当前落在 {cats['machinedCategory']} "
          f"{sum(1 for r in pool if r['cat'] == cats['machinedCategory'])} 条 / "
          f"{cats['purchaseCategory']} "
          f"{sum(1 for r in pool if r['cat'] == cats['purchaseCategory'])} 条)")

    groups = {}
    for r in pool:
        pn = r["pn"]
        if not pn:
            continue
        g = next((pn[:n] for n in (4, 3, 2)
                  if pn[:n].replace("_", "").replace("-", "").isalnum()), pn[:2])
        groups.setdefault(g, []).append(r)
    unnamed = [r for r in pool if not r["pn"]]

    print("\n图号前缀分布(前 30):")
    for g, rs in sorted(groups.items(), key=lambda kv: -len(kv[1]))[:30]:
        names = ", ".join(sorted({x["nm"] for x in rs if x["nm"]})[:3])
        print(f"  {g:<8}{len(rs):>3} 个   {names}")
    if unnamed:
        print(f"\n图号为空的: {len(unnamed)} 个")

    hits = {}
    for w in C.COMMON_PURCHASE_WORDS:
        n = sum(1 for r in pool if w in f'{r["pn"]} {r["nm"]}')
        if n:
            hits[w] = n
    if hits:
        print("\n标准件关键字命中(→ 建议归外购件):")
        for w, n in sorted(hits.items(), key=lambda kv: -kv[1])[:20]:
            print(f"  {w:<10}{n:>3} 个")

    if a.auto:
        pre = sorted(groups, key=lambda g: -len(groups[g]))
        kw = sorted(hits, key=lambda w: -hits[w])
        merged_pre = sorted(set(pre) | set(cats["machinedPrefixes"]))
        merged_kw = sorted(set(kw) | set(cats["purchaseKeywords"]))
        cats["machinedPrefixes"] = merged_pre
        cats["purchaseKeywords"] = merged_kw
        trial = json.loads(json.dumps(cfg))
        cnt = Counter(r["cat"] for r in core.extract(trial, log=lambda m: None))
        print("\n写入后的分类分布:")
        for c in cats["order"]:
            if cnt.get(c):
                print(f"  {c:<10}{cnt[c]:>3} 条")
        proj.save(cfg)
        print(f"\n已写入: 前缀 {len(merged_pre)} 个(与原有合并), "
              f"关键字 {len(merged_kw)} 个")
        return
    if not a.interactive:
        print("\n提示: 加 --auto 用建议自动写入;或加 --interactive 逐项挑选。")
        return 1                          # 什么都没写,不算成功

    while True:
        print("\n操作:  1)逐个勾选前缀  2)填加工件前缀  "
              "3)填外购关键字  4)一键用建议  0)保存退出")
        c = input("> ").strip()
        if c in ("", "0"):
            break
        if c == "4":
            cats["machinedPrefixes"] = sorted(groups, key=lambda g: -len(groups[g]))
            cats["purchaseKeywords"] = sorted(hits, key=lambda w: -hits[w])
            print(f"  已填 {len(cats['machinedPrefixes'])} 前缀 / "
                  f"{len(cats['purchaseKeywords'])} 关键字")
        elif c == "1":
            keys = sorted(groups, key=lambda g: -len(groups[g]))
            cur = set(cats["machinedPrefixes"])
            picked = set()
            print("  回车=保留现状 y=加入 n=移除 q=结束")
            for g in keys:
                ans = input(f"   {'[x]' if g in cur else '[ ]'} {g:<8}"
                            f"({len(groups[g])} 个) > ").strip().lower()
                if ans == "q":
                    break
                if ans in ("a", "y"):
                    picked.add(g)
                elif ans != "n" and g in cur:
                    picked.add(g)
            cats["machinedPrefixes"] = sorted(picked)
            print(f"  当前: {', '.join(sorted(picked)) or '(空)'}")
        elif c in ("2", "3"):
            key = "machinedPrefixes" if c == "2" else "purchaseKeywords"
            s = input(f"  {key}(逗号分隔): ").replace("，", ",")
            cats[key] = [x.strip() for x in s.split(",") if x.strip()]
            print(f"  已填 {len(cats[key])} 个")

    cnt = Counter(r["cat"] for r in core.extract(cfg, log=lambda m: None))
    print("\n新规则下的分类:")
    for c in cats["order"]:
        if cnt.get(c):
            print(f"  {c:<10}{cnt[c]:>3} 条")
    proj.save(cfg)
    print(f"\n已保存: {proj.config_file}")


def cmd_list(a):
    rows = paths.registry_list()
    if not rows:
        print("还没有项目。  sheep new <项目名>  新建")
        return
    print(f"{'项目名':<22}{'状态':<8}{'最近构建':<20}路径")
    for r in rows:
        print(f"{r['name']:<22}{'就绪' if r['exists'] else '配置丢失':<8}"
              f"{(r.get('last') or '-'):<20}{r['path']}")


def cmd_status(a):
    proj = paths.find_project(a.project)
    cfg = C.with_defaults(C.load(proj))
    cfg["_proj_root"] = str(proj.root)
    print(f"项目: {proj.name}    {proj.root}")
    print("-" * 64)
    if build_core.table_count(cfg) == 0:
        print("  还没有任何表。用 import 导入,或把 xlsx 放进 1_源数据 后点「扫描源数据」")
        return
    # 和界面/构建走同一套读取逻辑,不能自己 extract/consolidate ——
    # 只认 cfg["sources"] 的话,导入 BOM 表的项目会显示「尚未配置源表」。
    items, src = build_core.read_items(cfg, proj)
    print(f"  来源: {src}")
    if not items:
        print("  没有读到零件(表是空的,或没有标红的新改动件)")
        return
    issues = core.check_items(cfg, items)
    for c in cfg["categories"]["order"]:
        g = [i for i in items if i["cat"] == c]
        if not g:
            continue
        ms = sum(1 for i in g
                 if any(i.get(k) and not i.get(k + "_exists")
                        for k in cfg["deliverables"] if cfg["deliverables"][k].get("cats")))
        print(f"  {c:<10}{len(g):>3} 条    缺文件 {ms}")
    print("-" * 64)
    for k, spec in cfg["deliverables"].items():
        if not spec.get("cats"):
            continue
        need = [i for i in items if i.get(k)]
        ok = sum(1 for i in need if i.get(k + "_exists"))
        if need:
            print(f"  {spec['label']:<10}{ok}/{len(need)} 到位")
    nonmiss = [i for i in issues if i["level"] != "miss"]
    print(f"  数据问题 {len(nonmiss)}")
    for lv in ("err", "warn", "info"):
        g = [i for i in nonmiss if i["level"] == lv]
        if g:
            print(f"    [{lv}] {len(g)}")
            for i in g[:10]:
                print(f"        {i['tag']:<10} {i['who']}")
            if len(g) > 10:
                print(f"        ... 还有 {len(g) - 10}")
    if proj.conflict_txt.is_file():
        print(f"\n  上次更新有手动修改冲突,详见: {proj.conflict_txt}")


def cmd_build(a):
    proj = paths.find_project(a.project)
    build(proj, full=not a.html_only, fresh=a.fresh)


def cmd_watch(a):
    proj = paths.find_project(a.project)
    cfg = C.with_defaults(C.load(proj))
    w = cfg["watch"]
    url = None
    if a.serve or a.port:
        port = a.port or cfg["server"]["port"]
        _, _, url = server.start_server(proj, port,
                                        cfg["server"].get("openBrowser", True)
                                        and not a.no_open)
        print(f"本地服务: {url}")
    build_fn = lambda full, console: build(proj, full=full, console=console,
                                           live=bool(url))
    server.watch_loop(proj, cfg, build_fn,
                      interval=w.get("interval", 2),
                      debounce=w.get("debounce", 1.5),
                      console=print)


def cmd_template(a):
    """把标准 BOM 模板复制出来。

    模板的表结构是照着工具实际读取的列位置做的,所以拿它当起点最省事 ——
    自己新建表容易少列、错列,那样图和链接都会读不出来。
    """
    src = paths.BOM_TPL_DOC if a.doc else paths.BOM_TPL
    if not src.is_file():
        print(f"错误: 找不到模板 {src}")
        print("  源码运行时应在 D:\\助手工程师\\templates\\ ;"
              "打包后应在 exe 同级的 templates\\ 下。")
        return 1
    out = Path(a.out) if a.out else Path.cwd()
    # `--out exetpl` 这种**还不存在**的路径,用户八成是想建个目录。
    # 以前 `out.is_dir()` 为 False,就把 xlsx 直接存成了名叫 exetpl 的**文件**,
    # 说明书还甩到了它的父目录里 —— 命令行没报错,结果和意图的相反。
    # 判据:不存在 + 没有扩展名 -> 当目录建。
    if out.is_dir() or (not out.exists() and not out.suffix):
        out.mkdir(parents=True, exist_ok=True)
        dst = out / src.name
    else:
        dst = out
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    print(f"已复制: {src}")
    print(f"     -> {dst}")
    if not a.doc and paths.BOM_TPL_MD.is_file():
        md = dst.with_name(paths.BOM_TPL_MD.name)
        shutil.copy2(paths.BOM_TPL_MD, md)
        print(f"     -> {md}(说明书)")
    print()
    print("用法提醒:")
    print("  1. 文件名要带分类名,比如 机加工件物料表.xlsx;"
          "工作表名也写成「机加工件」")
    print("     —— 分类由文件名决定,不看表里的内容")
    print("  2. 数据从第 4 行开始,不要删列、不要调列序")
    print("  3. 交付物两列的表头文字不能改")
    print("     3D图认: 3D图(STEP) / STEP零件 / STEP / 3D图 / 三维图")
    print("     2D图认: 2D图(工程图) / 工程图 / 2D图 / 2D / 图纸")
    print("  4. 填了交付物文件名 = 这件需要(计入齐套率);"
          "留空 = 不需要")
    return 0


def cmd_resume(a):
    """恢复(或暂停)自动检测。导出定档后跑一次就行。"""
    proj = paths.find_project(a.project)
    if a.pause:
        proj.set_paused(True, reason="手动暂停", log=print)
    else:
        proj.set_paused(False, log=print)
        # 恢复之后顺手补一次检测 —— 暂停期间文件可能动过。
        # 不补的话,要等下一轮 watch_loop 才反应过来,而那一刻
        # 指纹已经刷新过了,变动就被当成「没发生」。
        if not a.pause:
            print("  正在补一次检测…")
            build_core.run_scan(proj, apply_change=True,
                                log=lambda m: print("  " + m))
    return 0


def cmd_detect(a):
    """开始检测 —— 恢复自动检测 + 手动识别文件夹变更。

    定位:`import` 是给「还没导入过的项目」用的(要选表);
    这里是给**已经导入过**的项目用的 —— 新 STEP 丢进源目录、
    源表改了,点一下就能识别并重建,不用重新走一遍导入。

    P6:这个命令同时负责**恢复自动检测**。导出定档后自动检测是暂停的,
    本人要求的恢复方式就是点这一个按钮,不要再单独搞一个「恢复」按钮 ——
    两个按钮干一件事,迟早只记得点其中一个。
    """
    proj = paths.find_project(a.project)
    print(f"项目: {proj.name}    {proj.root}")
    print("-" * 64)
    if proj.is_paused():
        proj.set_paused(False, log=print)
        print("-" * 64)
    d, rebuilt = build_core.run_scan(proj, apply_change=not a.no_build,
                                     log=print)
    print("-" * 64)
    if not d.get("any"):
        print("结论: 没有变化")
        return 0
    print(f"结论: 有变化{'并已重建' if rebuilt else '(未重建)'}")
    return 0


def cmd_bg(a):
    """后台启动监听并立即返回。"""
    proj = paths.find_project(a.project)
    existing = read_watch_pid()
    if existing:
        print(f"监听已在运行 (PID {existing})。要重启请先执行:  sheep bg-stop")
        return 1
    p = _spawn_watch(proj.root, serve=a.serve, no_open=a.no_open)
    # 必须确认进程真的活着,不能只 sleep 一下就报成功
    ok = False
    for _ in range(20):
        time.sleep(0.15)
        if read_watch_pid():
            ok = True
            break
        if p.poll() is not None:            # 已经退了
            break
    if not ok:
        print(f"启动失败(可能立刻退出,退出码 {p.poll()})。")
        print(f"看日志: {proj.logs / '更新.log'}")
        return 1
    print(f"已在后台启动 (PID {p.pid})  项目: {proj.name}")
    print(f"日志: {proj.logs / '更新.log'}")
    print("停止: sheep bg-stop")


def read_watch_pid():
    import ctypes
    if not paths.PID_FILE.is_file():
        return None
    try:
        pid = int(paths.PID_FILE.read_text(encoding="utf-8").split()[0])
    except Exception:
        return None
    k = ctypes.windll.kernel32
    h = k.OpenProcess(0x1000, False, pid)
    if not h:
        return None
    try:
        code = ctypes.c_ulong()
        if not k.GetExitCodeProcess(h, ctypes.byref(code)):
            return None
        return pid if code.value == 259 else None
    finally:
        k.CloseHandle(h)


def cmd_bg_stop(a):
    import subprocess
    import time as _t
    pid = read_watch_pid()
    if not pid:
        paths.PID_FILE.unlink(missing_ok=True)
        print("监听进程: 未运行")
        return 0                          # 本来就没运行,不是错误
    # taskkill 必须给 timeout,否则进程卡死时会把这里一起锁住
    try:
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"],
                       capture_output=True, text=True, errors="replace",
                       timeout=15)
    except subprocess.TimeoutExpired:
        print(f"taskkill 超时(15s),PID {pid} 可能已卡死。")
        print("可手动结束: 任务管理器里找 python / 助手工程师 进程。")
        return 1
    _t.sleep(0.8)
    if read_watch_pid():
        try:
            os.kill(pid, 15)
        except OSError:
            pass
        _t.sleep(0.5)
    paths.PID_FILE.unlink(missing_ok=True)
    if read_watch_pid():
        print(f"⚠ 进程 {pid} 没能停掉。请到任务管理器手动结束。")
        return 1
    print(f"监听进程: 已停止 (PID {pid})")


def cmd_serve(a):
    proj = paths.find_project(a.project)
    cfg = C.with_defaults(C.load(proj))
    build(proj, full=False, console=print, live=True)
    _, _, url = server.start_server(proj, a.port or cfg["server"]["port"], not a.no_open)
    print(f"服务已启动: {url}")
    print("Ctrl+C 退出")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass


def cmd_export_html(a):
    from build_core import run_export_html
    proj = paths.find_project(a.project)
    run_export_html(proj, Path(a.out) if a.out else None, log=print)


def cmd_export(a):
    proj = paths.find_project(a.project)
    dest = Path(a.dest) if a.dest else (proj.root.parent /
                                       f"{proj.name}_加工包_{datetime.now():%Y%m%d}.zip")
    # 这里**必须**转调 build_core.run_export。
    #
    # 以前 cmd_export 自己抄了一份 zip 逻辑(整棵 rglob + `Path(proj.name)/rel`
    # 前缀 + 跳过 _基线/_日志/_报告),而界面那边调的是 build_core.run_export。
    # 两份各自演化 —— P5 改了 run_export(去前缀 + 四目录),**命令行完全没变**,
    # 于是界面导出的包和命令行导出的包结构不一样,而两边测试都「通过」。
    # 「同一件事写两遍」迟早长歪,这里只留一个实现。
    from build_core import run_export
    run_export(proj, dest, log=print)
    return 0


def cmd_fix_case(a):
    proj = paths.find_project(a.project)
    cfg = C.with_defaults(C.load(proj))
    cfg["_proj_root"] = str(proj.root)
    items, _src = build_core.read_items(cfg, proj)
    n = 0
    for it in items:
        for k, spec in cfg["deliverables"].items():
            if not it.get(k):
                continue
            want = it[k + "_path"]
            if not want.parent.is_dir():
                continue
            actual = None
            for p in want.parent.iterdir():
                if p.is_file() and p.name.lower() == want.name.lower():
                    actual = p
                    break
            if actual and actual.name != want.name:
                print(f"  {actual.name}  ->  {want.name}")
                if not a.dry:
                    actual.rename(want)
                n += 1
    print(f"共 {n} 个文件名" + ("(dry-run 未实际改名)" if a.dry else ""))


def cmd_reset(a):
    proj = paths.find_project(a.project)
    shutil.rmtree(proj.baseline, ignore_errors=True)
    proj.conflict_txt.unlink(missing_ok=True)
    print("基线与冲突报告已清空,按源表全量重建…")
    build(proj, full=True, fresh=True)


def cmd_remove(a):
    proj = paths.find_project(a.project)
    paths.registry_remove(proj)
    print(f"已从列表移除: {proj.name}  (文件保留在 {proj.root})")


def _spawn_watch(proj_root, serve=True, no_open=False):
    """派生后台监听进程。冻结成 exe 后要靠参数而不是脚本路径。"""
    import subprocess
    if paths.is_frozen():
        args = [sys.executable, "watch", str(proj_root)]
    else:
        args = [sys.executable, str(paths.APP_DIR / "sheep.py"),
                "watch", str(proj_root)]
    if serve:
        args.append("--serve")
    if no_open:
        args.append("--no-open")
    return subprocess.Popen(args, creationflags=0x00000008 | 0x00000200)


def cmd_gui(a):
    import gui
    if a.project:
        try:
            paths.find_project(a.project)
            gui.OPEN_PROJECT = a.project
        except Exception:
            pass
    gui.main()


def cmd_doctor(a):
    from build_core import run_doctor
    # run_doctor 返回的已经是退出码(0 正常 / 1 有问题),别再当布尔解释
    return run_doctor(log=print)


# ==========================================================================
# CLI
# ==========================================================================
def _hide_console():
    """GUI 模式下把黑色控制台窗口藏掉。
    打包用 --console(这样命令行子命令才有输出),双击时再隐藏窗口。"""
    if not getattr(sys, "frozen", False):
        return
    try:
        import ctypes
        ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)
    except Exception:
        pass


def main():
    argv = sys.argv[1:]
    if not argv:
        _hide_console()              # 双击:图形界面,不弹黑框
        import gui
        gui.main()
        return
    ap = argparse.ArgumentParser(
        prog="助手工程师", description=f"{TAG} —— BOM 加工包与跟进看板",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("new", help="新建项目文件夹")
    p.add_argument("name", help="项目名")
    p.add_argument("--path", default="", help="项目文件夹位置(默认 <程序目录>/项目/<名>)")
    p.add_argument("--desc", default="")
    p.add_argument("--html", default="改动零件看板.html")
    p.add_argument("--force", action="store_true")
    p.set_defaults(fn=cmd_new)

    p = sub.add_parser("import", help="导入已有 BOM 表目录(自动探测结构)")
    p.add_argument("name")
    p.add_argument("--path", default="", help="项目文件夹位置(默认 <程序目录>/项目/<名>)")
    p.add_argument("--source", default="", help="BOM 表所在目录")
    p.add_argument("--rescan", action="store_true", help="重新扫描项目内 1_源数据")
    p.add_argument("--pattern", default=r"物料|清单|BOM|bom|表", help="文件名筛选正则")
    p.add_argument("--red-column", type=int, default=0,
                   help="强制指定「新改动」标记所在列号(1 起)")
    p.add_argument("--copy", action="store_true", help="把源表复制进项目 1_源数据")
    p.add_argument("--all", action="store_true", help="全部采用,不询问")
    p.add_argument("--dry-run", action="store_true", help="只探测不写配置")
    p.set_defaults(fn=cmd_import)

    p = sub.add_parser("bg", help="后台启动监听(立即返回)")
    p.add_argument("project", nargs="?")
    p.add_argument("--serve", action="store_true", default=True)
    p.add_argument("--no-open", action="store_true")
    p.set_defaults(fn=cmd_bg)

    p = sub.add_parser("bg-stop", help="停止后台监听")
    p.set_defaults(fn=cmd_bg_stop)

    p = sub.add_parser("list", help="列出项目")
    p.set_defaults(fn=cmd_list)

    p = sub.add_parser("rules", help="配置加工件/外购件分类规则")
    p.add_argument("project", nargs="?")
    p.add_argument("--auto", action="store_true", help="直接用建议自动写入")
    p.add_argument("--interactive", action="store_true", help="逐项挑选")
    p.set_defaults(fn=cmd_rules)

    p = sub.add_parser("build", help="构建 BOM 表 + 看板")
    p.add_argument("project", nargs="?")
    p.add_argument("--fresh", action="store_true", help="丢弃基线与手动修改,全量重建")
    p.add_argument("--html", dest="html_only", action="store_true", help="只刷看板")
    p.set_defaults(fn=cmd_build)

    p = sub.add_parser("template",
                       help="取出标准 BOM 模板(新项目照着填)")
    p.add_argument("--out", default="", help="复制到指定文件或目录(默认当前目录)")
    p.add_argument("--doc", action="store_true", help="只取使用说明")
    p.set_defaults(fn=cmd_template)

    p = sub.add_parser("detect",
                       help="开始检测:恢复自动检测 + 手动识别文件夹变更")
    p.add_argument("project", nargs="?")
    p.add_argument("--no-build", action="store_true",
                   help="只报变更,不重建")
    p.set_defaults(fn=cmd_detect)

    p = sub.add_parser("resume",
                       help="恢复自动检测(导出定档后用)")
    p.add_argument("project", nargs="?")
    p.add_argument("--pause", action="store_true",
                   help="反过来:暂停自动检测")
    p.set_defaults(fn=cmd_resume)

    p = sub.add_parser("watch", help="实时监听变动自动更新")
    p.add_argument("project", nargs="?")
    p.add_argument("--serve", action="store_true", help="同时起本地服务并开浏览器")
    p.add_argument("--port", type=int, default=0)
    p.add_argument("--no-open", action="store_true")
    p.set_defaults(fn=cmd_watch)

    p = sub.add_parser("serve", help="只起本地服务")
    p.add_argument("project", nargs="?")
    p.add_argument("--port", type=int, default=0)
    p.add_argument("--no-open", action="store_true")
    p.set_defaults(fn=cmd_serve)

    p = sub.add_parser("status", help="统计 + 数据检查")
    p.add_argument("project", nargs="?")
    p.set_defaults(fn=cmd_status)

    p = sub.add_parser("export-html", help="人工核对后导出单文件 HTML 看板")
    p.add_argument("project", nargs="?")
    p.add_argument("--out", default="", help="导出到指定文件或目录")
    p.set_defaults(fn=cmd_export_html)

    p = sub.add_parser("export", help="打包交付(3D图/工程图/BOM表)")
    p.add_argument("project", nargs="?")
    p.add_argument("--dest", default="")
    p.set_defaults(fn=cmd_export)

    p = sub.add_parser("fix-case", help="规范交付文件名(大小写/扩展名)")
    p.add_argument("project", nargs="?")
    p.add_argument("--dry", action="store_true")
    p.set_defaults(fn=cmd_fix_case)

    p = sub.add_parser("reset", help="清空基线,按源表全量重建")
    p.add_argument("project", nargs="?")
    p.set_defaults(fn=cmd_reset)

    p = sub.add_parser("remove", help="从列表移除(不删文件)")
    p.add_argument("project", nargs="?")
    p.set_defaults(fn=cmd_remove)

    p = sub.add_parser("gui", help="打开图形界面(推荐)")
    p.add_argument("project", nargs="?", help="直接打开某个项目")
    p.set_defaults(fn=cmd_gui)

    p = sub.add_parser("doctor", help="环境自检")
    p.set_defaults(fn=cmd_doctor)

    a = ap.parse_args()
    try:
        # 注意:不能用 `a.fn(a) or 0` —— cmd 返回 1 表示失败,
        # 但 `1 or 0` 还是 1 没问题,可返回 None(成功)的路径又必须归 0。
        # 这里显式区分:None 视为成功,任何非零值原样作为退出码。
        rc = a.fn(a)
        sys.exit(0 if rc is None else int(rc))
    except SystemExit:
        raise
    except KeyboardInterrupt:
        print("\n已中断。")
        sys.exit(130)
    except FileNotFoundError as e:
        print(f"错误: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"出错: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
