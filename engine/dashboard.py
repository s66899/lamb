# -*- coding: utf-8 -*-
"""🐑 助手工程师 —— 看板生成(单文件 HTML,可直接发给加工厂)。"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from . import checklist, paths


def esc(s) -> str:
    return (str(s or "").replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def _card(n, label, sub="", cls="", pct=None):
    bar = (f'<div class="bar"><i style="width:{pct}%"></i></div>'
           if pct is not None else "")
    return (f'<div class="card {cls}"><div class="n">{n}</div>'
            f'<div class="l">{label}</div>'
            + (f'<div class="s">{sub}</div>' if sub else "") + bar + "</div>")


_SHOT_EXT = (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif")


def _assy_stat(proj) -> dict:
    """数 5_总装图:几个装配体、几个配了同名截图。

    放在 dashboard 里而不是 import build_core —— build_core 会反过来
    import dashboard,那边 import 这边就成循环了。逻辑两边一致,
    区别只在 build_core 那份还会往日志里打提醒。

    **只统计,不判定齐套** —— 总装图不参与齐套率是本人的明确要求。
    """
    out = {"steps": [], "shots": [], "no_shot": []}
    try:
        d = proj.d("assy")
    except Exception:
        return out
    if not d or not d.is_dir():
        return out
    shots, steps = set(), []
    for f in d.rglob("*"):
        if not f.is_file() or f.name.startswith(("~$", ".")):
            continue
        if f.suffix.lower() in _SHOT_EXT:
            shots.add(f.stem.lower())
        elif f.suffix.lower() in (".step", ".stp"):
            steps.append(f)
    out["steps"] = sorted(steps)
    out["shots"] = sorted(shots)
    out["no_shot"] = sorted(f for f in steps if f.stem.lower() not in shots)
    return out


# 浏览器内 3D 预览能吃的网格格式。**STEP 不在里面** —— 浏览器不认 STEP。
MESH_EXT = (".stl", ".obj")


def _assy_payload(proj) -> list:
    """总装图清单,给看板的「总装图」区块用。

    每个装配体给:STEP 的相对路径、同名截图的相对路径、
    以及**同名网格文件**(STL/OBJ)—— 有网格才能在浏览器里转起来。

    相对路径都相对项目根,看板在 `6_看板/` 下,拼的时候前面要加 `../`
    (和 fixPath 用的是同一个基准前缀)。
    """
    out = []
    try:
        d = proj.d("assy")
    except Exception:
        return out
    if not d or not d.is_dir():
        return out
    root = Path(proj.root)

    def rel(p):
        try:
            return p.relative_to(root).as_posix()
        except ValueError:
            return None

    by_stem = {}
    for f in d.rglob("*"):
        if not f.is_file() or f.name.startswith(("~$", ".")):
            continue
        by_stem.setdefault(f.stem.lower(), {})[f.suffix.lower()] = f
    for stem, group in sorted(by_stem.items()):
        step = group.get(".step") or group.get(".stp")
        if not step:
            continue
        shot = next((group[e] for e in _SHOT_EXT if e in group), None)
        mesh = next((group[e] for e in MESH_EXT if e in group), None)
        out.append({
            "name": step.stem,
            "step": rel(step),
            "shot": rel(shot) if shot else None,
            "mesh": rel(mesh) if mesh else None,
            "bytes": step.stat().st_size,
        })
    return out


def _mesh_payload(proj, items, log=None, div: int = 0) -> int:
    """给每一件存在的 STEP 备好 STL 网格,写进 `item["step_mesh"]`。

    ★ 为什么必须在这里做,而不是让浏览器直接读 STEP:

        浏览器不认 STEP。`3_3D图/x.STEP` 直接双击/点开,浏览器就
        当**纯文本**显示 —— 满屏 `ISO-10303-21;` / `CARTESIAN_POINT`。
        以前看板的交付物列就是一个 `<a href=...STEP>`,于是「点 3D 图」
        = 「看一堆乱码」,本人以为文件坏了。

        所以构建时用 OCP 把每个 STEP 转成 STL 落到 `_网格缓存/`,
        看板里那格变成一个 **WebGL 预览按钮** —— 浏览器里直接转起来,
        全程离线(不引 three.js、不引 WASM、不联网)。

    转换失败**不抛异常**:几十个文件里有一个坏的,不该让整块看板生成不出来。
    失败的那件没有 `step_mesh`,格子退回原来的链接并标注「转不成网格」。

    返回成功转出的个数。

    ``div=0`` = 用 `mesh3d.PREVIEW_DIV`(默认 20 的粗网格)。
    本人要的是**外形和尺寸**,不是内部细节 —— div=60 的上万面
    在浏览器里纯属浪费(实测同一零件 60 → 20,面数掉到 1/9),
    而外形尺寸、孔距这类读数一点没变。
    """
    from . import mesh3d
    div = div or mesh3d.PREVIEW_DIV
    if not any(i.get("step") and i.get("step_exists") for i in items):
        return 0
    ok, err = mesh3d.ocp_available()
    if not ok:
        if log:
            log(f"    跳过 3D 网格转换:{err}")
        return 0
    root = Path(proj.root)
    n = 0
    if log:
        log(f"==> 准备 3D 预览网格(STEP -> STL,div={div} 粗网格)")
    for i in items:
        if not (i.get("step") and i.get("step_exists")):
            continue
        # ★ 用 `_real_path`(真正命中的那个文件),不是 `_path`。
        #   `_path` 是按 BOM 表里的文件名推的,而文件名常常对不上
        #   (表里写 FBZ_A.step,盘上是 FBZ_A1.STEP,how=前缀) ——
        #   拿 `_path` 去读,41 件里有 2 件会静默地没有网格。
        src = i.get("step_real_path") or i.get("step_path")
        if not src or not Path(src).is_file():
            if log:
                log(f"    {i.get('pn') or i.get('nm')}: 找不到文件,跳过")
            continue
        if log:
            log(f"    {i.get('pn') or i.get('nm') or Path(src).name}")
        stl, info = mesh3d.ensure_step_mesh(src, root, div=div, log=log)
        if stl is None:
            i["step_mesh"] = None
            i["step_mesh_err"] = info
            if log:
                log(f"      ✗ 转不了:{info}")
            continue
        try:
            i["step_mesh"] = stl.relative_to(root).as_posix()
            i["step_mesh_err"] = ""
            n += 1
        except ValueError:
            # 缓存落在项目根之外(极端情况)—— 不给相对路径,
            # 硬塞会让看板里的 URL 指向别处,比不给更糟。
            i["step_mesh"] = None
    if log:
        log(f"    网格就绪 {n} 件")
    return n


def render(cfg, proj, items, issues, conflicts=None, live=False,
           suffix="", stamp=False, out=None, log=None) -> Path:
    tpl_path = paths.DASH_TPL
    if not tpl_path.is_file():
        # 兜底:模板可能被放在了 _internal 之类的位置
        for alt in (paths.TPL_DIR, paths.RES_DIR, paths.APP_DIR):
            f = Path(alt) / "看板.html"
            if f.is_file():
                tpl_path = f
                break
    tpl = tpl_path.read_text(encoding="utf-8")

    dd = cfg["deliverables"]
    dl_keys = [k for k in dd if dd[k].get("cats")
               and any(i.get(k) for i in items)]
    dl_label = {k: dd[k]["label"] for k in dl_keys}
    need = {k: [i for i in items if i.get(k)] for k in dl_keys}
    ok = {k: sum(1 for i in need[k] if i.get(k + "_exists")) for k in dl_keys}

    order = [c for c in cfg["categories"]["order"]
             if any(i["cat"] == c for i in items)]
    colors = cfg["categories"].get("display") or {}
    cats_meta = {c: {"color": colors.get(c, "#cbd5e1")} for c in order}
    img_n = sum(1 for i in items if i.get("img"))
    real = [i for i in issues if i["level"] != "miss"]

    # ---- 统计卡 ----
    cards = [_card(len(items), "零件总数", f'{len(order)} 个分类')]
    for k in dl_keys:
        t, o = len(need[k]), ok[k]
        pct = int(o / t * 100) if t else 100
        cards.append(_card(f"{o}/{t}", f'{dd[k]["label"]}到位',
                           "/".join(dd[k]["cats"]), "ok" if o == t else "warn", pct))
        miss = t - o
        if miss:
            cards.append(_card(miss, f'缺{dd[k]["label"]}', "", "miss"))
    cards.append(_card(len(real), "数据待补", "缺图号/名称/材料/数量",
                       "warn" if real else "ok"))
    cards.append(_card(img_n, "带图示", "表格里看缩略图,点一下放大", "info"))

    # ---- P14:加工后核对 / 新购件核对 ----
    # 「还剩几件没验」是本人最常问的一句话,所以进度直接摆在最上面,
    # 不藏在折叠区里。数字全部来自 checklist.tally(),和原生看板
    # 用的是同一个函数 —— 两边各算一遍迟早差一两个。
    for _kind in ("m", "p"):
        _t = checklist.tally(items, _kind)
        if not _t["total"]:
            continue
        sub = []
        # ★ 自产件说的是「不合格」,外购件说的是「型号不对」——
        #   同一句「型号不对」套到自产件上就是错话了。
        if _t.get("bad"):
            sub.append(("型号不对 " if _kind == "p" else "不合格 ")
                       + str(_t["bad"]))
        if _t.get("short"):
            sub.append("数量不足 " + str(_t["short"]))
        if not sub:
            sub.append("全部已核" if not _t["todo"]
                       else f'还剩 {_t["todo"]} 件没核')
        cards.append(_card(
            f'{_t["done"]}/{_t["total"]}', checklist.LABELS[_kind],
            " · ".join(sub),
            "miss" if (_t["bad"] or _t.get("short"))
            else ("ok" if not _t["todo"] else "warn"),
            int(_t["done"] / _t["total"] * 100)))

    # ---- 总装图:独立卡片,**不进齐套统计**(P5)----
    # assy 的 cats 是空的,所以上面那个 for k in dl_keys 循环压根看不见它 ——
    # 这是对的(齐套率是零件维度的指标,装配体不是零件)。但本人要求
    # 看板上有它,所以这里单独数一遍 5_总装图 目录。
    asy = _assy_stat(proj)
    if asy["steps"]:
        note = (f'{len(asy["steps"])} 个装配体'
                + (f' · 缺截图 {len(asy["no_shot"])}' if asy["no_shot"] else ""))
        cards.append(_card(
            len(asy["steps"]), "总装图", note,
            "warn" if asy["no_shot"] else "ok",
            100 if not asy["no_shot"] else
            int(len(asy["steps"]) - len(asy["no_shot"])) / len(asy["steps"]) * 100))

    # ---- P6:暂停横幅 ----
    # 暂停时看板顶部必须有一条醒目的横幅。静默地停掉是最糟的做法:
    # 本人以为在实时同步,其实早就停了两天,交出去的东西对不上。
    paused = False
    pause_txt = ""
    try:
        if proj.is_paused():
            paused = True
            pi = proj.pause_info()
            pause_txt = (pi.get("at") or "?") + \
                (f" · {pi['reason']}" if pi.get("reason") else "")
            if pi.get("error"):
                pause_txt = pi["error"]
    except Exception as e:            # 读标记失败也要显示,不能装作没暂停
        paused, pause_txt = True, f"读不到暂停状态({e})"

    kept = len([c for c in (conflicts or []) if c["col"]])
    gone = len([c for c in (conflicts or []) if not c["col"]])
    # 3D 预览网格要在拼 payload **之前**备好:stl 路径要写进每件零件的数据里。
    # 只在看板写到项目自己的 6_看板\ 下时才转 —— 导出到别处时
    # 基准前缀(__BASE__)对不上,网格 URL 会指向不存在的地方。
    if out is None:
        _mesh_payload(proj, items, log=log)
    payload = [{k: v for k, v in i.items()
                if not k.startswith("_") and not k.endswith("_path")}
               for i in items]

    html = (tpl
            .replace("__TITLE__", esc(
                (cfg["project"].get("name") or "改动零件看板")
                + (f" · {suffix}" if suffix else "")))
            .replace("__DESC__", esc(cfg["project"].get("description") or ""))
            .replace("__GEN__", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            .replace("__LIVETXT__", "实时已连接" if live else
                     ("核对完成版 · 静态快照" if suffix else "静态快照 · 双击打开"))
            .replace("__CARDS__", "".join(cards))
            .replace("__LIVE__", "true" if live else "false")
            .replace("__ORDER__", json.dumps(order, ensure_ascii=False))
            .replace("__CATS__", json.dumps(cats_meta, ensure_ascii=False))
            .replace("__DL__", json.dumps(dl_keys, ensure_ascii=False))
            .replace("__DL_LABEL__", json.dumps(dl_label, ensure_ascii=False))
            .replace("__CONFLICT__", json.dumps(
                {"kept": kept, "gone": gone} if (kept or gone) else None,
                ensure_ascii=False))
            # P6:暂停信息给的是**字符串**(暂停时间 + 原因)而不是布尔,
            # 因为「什么时候停的、为什么停」直接写在横幅上,本人一眼能对上
            # 「上次那个包是哪会儿导的」。没暂停时给 null。
            .replace("__PAUSED__", json.dumps(pause_txt if paused else None,
                                              ensure_ascii=False))
            # P11:总装图清单。空数组也照样给,免得模板里出现字面量 __ASSY__。
            .replace("__ASSY__", json.dumps(_assy_payload(proj),
                                            ensure_ascii=False))
            .replace("__ISSUES__", json.dumps(issues, ensure_ascii=False))
            # P14:核对栏的分类归属和统计。**在服务端算好再注入**,
            # 网页端和原生看板用同一份 checklist.tally(),否则两边
            # 「还剩几件没验」会差一两个(各自统计口径不同最容易出这种事)。
            # 两栏的**状态选项不一样**:自产件问「做得对不对」,
            # 外购件问「型号对不对」(本人原话:采购件的核对是核对数量和型号)。
            # 前端不能自己判断该渲染哪个下拉 —— 判定全在这份元数据里。
            .replace("__CHK_META__", json.dumps(
                {k: {"label": checklist.LABELS[k],
                     "cats": list(checklist.MACHINED_CATS if k == "m"
                                  else checklist.PURCHASE_CATS),
                     "tally": checklist.tally(items, k),
                     "statuses": checklist.statuses_of(k),
                     "fields": list(checklist.LABEL_FIELDS[k]),
                     "hasQty": k == "p"}
                 for k in ("m", "p")},
                ensure_ascii=False))
            # 交付物链接的基准前缀。看板写在 6_看板\ 下,交付物在 3_3D图\ /
            # 4_2D图\ 下,相对路径要先退一级。构建时注入而不是在 JS 里猜 ——
            # 看板还会被复制到别处(发出去、发回源目录),那时前缀不同。
            #
            # 只替换 __BASE_VALUE__,整条 `const __BASE__ = "..."` 留在文件里。
            # 之前直接替换 __BASE__ 会把引号一起吃掉,产出 `return ../+String(p)`,
            # JS 语法错、页面全空,而文件大小和数据都正常,极难发现。
            .replace("__BASE_VALUE__", "../")
            .replace("__DATA__", json.dumps(payload, ensure_ascii=False)))
    proj.dash_dir.mkdir(parents=True, exist_ok=True)
    base = cfg.get("output", {}).get("html") or "改动零件看板.html"
    if suffix:
        stem = Path(base).stem
        base = f"{stem}_{suffix}.html"
    if stamp:
        base = f"{Path(base).stem}_{datetime.now():%m%d_%H%M}.html"
    # out 给了就写到那儿去,别碰项目里的看板。
    # 以前没有这个口子,于是「渲染一份看板看看效果」这种测试动作
    # **直接把项目的正式看板覆盖掉了** —— 测完项目里的看板就不是刚才那份了,
    # 而测试自己完全没察觉(它只看渲染结果,对不对它不关心)。
    out = Path(out) if out else proj.dash_dir / base
    out.parent.mkdir(parents=True, exist_ok=True)
    # 原子写:看板可能有几十 MB,直接写时若中途失败/被读,
    # 用户手上就是一个打不开的半截文件。
    paths.atomic_write_text(out, html)
    return out
