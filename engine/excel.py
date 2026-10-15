# -*- coding: utf-8 -*-
"""🐑 助手工程师 —— Excel 输出(带手动修改保护与冲突标黄)。"""

from __future__ import annotations

import os
import shutil
import time
from copy import copy
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from . import core, paths

CONFLICT_FILL = "FFFFF2CC"
CONFLICT_BORDER = Border(**{s: Side(style="thin", color="FFBF8F00")
                             for s in ("left", "right", "top", "bottom")})
FALLBACK_HEADERS = {1: "序号", 2: "图示", 3: "图号", 4: "名称", 5: "材料",
                    6: "数量", 7: "工艺", 8: "备注"}
# 标注列(STEP / 出工程图STEP / 新 / 改 这些手工意图)的表头。
# 源表里这几列本来就是没标题的空格,产出表给个名字才看得懂哪列是哪列。
MARK_HEADERS = {9: "意图标注", 10: "样机", 11: "意图标注", 12: "意图标注"}


def _style_from_source(path: Path, ex: dict):
    """借用源表的字体/边框/行高/表头,让产出表和原表观感一致。"""
    if not path or not Path(path).is_file():
        return None, {}
    try:
        wb = load_workbook(path, data_only=True)
    except Exception:
        return None, {}
    ws = wb[wb.sheetnames[0]]
    ncol = ex["dataColumns"]
    probe_r = ex.get("firstDataRow", 4)
    cols, widths = {}, {}
    for c in range(1, ncol + 1):
        cell = ws.cell(probe_r, c)
        cols[c] = (copy(cell.font), copy(cell.border), copy(cell.alignment),
                   cell.number_format)
        d = ws.column_dimensions.get(get_column_letter(c))
        widths[c] = d.width if d and d.width else 12
    hr = ex.get("headerRow", 2)
    headers = {c: core.txt(ws.cell(hr, c).value)
               for c in range(1, ncol + 1)}
    style = {"cols": cols, "widths": widths,
             "rowh": ws.row_dimensions[probe_r].height or 90,
             "titleFont": copy(ws.cell(hr, 2).font),
             "headerFont": copy(ws.cell(hr, 1).font)}
    wb.close()
    return style, headers


def build(cfg, proj, items, fresh=False, log=print):
    ex = cfg["extract"]
    ncol = ex["dataColumns"]
    cats = cfg["categories"]
    dirs = {k: cfg["deliverables"][k]["dirKey"]
            for k in cfg["deliverables"] if cfg["deliverables"][k].get("cats")}
    proj.ensure_dirs(cats=cats["order"], deliverable_dirs=dirs.values(),
                     subfolders=cats["subfolders"])
    cache = proj.root / "_图片缓存"
    cache.mkdir(parents=True, exist_ok=True)

    src = None
    for s in cfg["sources"]:
        p = Path(s["path"])
        if not p.is_absolute():
            p = Path(cfg["project"].get("baseDir") or ".") / p
        if p.is_file():
            src = p
            break
    style, headers = _style_from_source(src, ex)
    rowh = style["rowh"] if style else 90

    # 交付物列(表头接在数据列之后)
    keys = [k for k in cfg["deliverables"]
            if any(i.get(k) for i in items)]
    col_of = {}
    # 交付物列必须排在**标注列之后**。老 BOM 表数据区只到 H 列,
    # do_import 就把 dataColumns 推成 8,而 markColumns 还是默认的 [9,10,11,12],
    # 于是交付物写进 9/10 列把标注盖掉 —— _marks() 再从同一列读,
    # 读到的是文件名,看板上的「新/改/出工程图」标记全丢(实测 20 件全空)。
    n = max([ncol] + list(ex.get("markColumns") or []))
    for k in keys:
        n += 1
        col_of[k] = n
    total_col = n

    written, conflicts = [], []
    for cat in cats["order"]:
        rows = [i for i in items if i["cat"] == cat]
        if not rows:
            # ★ 分类变成空的时候,**不能直接跳过**(P8 实测发现的真 bug)。
            #
            # 以前是 `continue`,于是 `2_BOM表/<分类>物料表.xlsx` 会**留在原地不动** ——
            # 里面还是上一次的内容。本人把 3D打印件源表清空之后,产出表里
            # 那 2 行(QB-XJQ / XJQ-FBJG-B)就变成了「幽灵零件」:
            #   · 主看板 89 件(构建读源表,看不到它们)
            #   · `sheep export-html` 的核对版 91 件(它读 2_BOM表)
            #   · 导出的 `BOM表/` 里带着这张表,加工厂照着做两个不存在的零件
            # 而且**全程没有任何提示** —— 正好是本人最不想要的「静默」。
            #
            # 现在改成:归档旧表 → 写一张只有表头的空表 → 记进冲突报告,
            # 看板上会明确写出来「源表已无此分类,旧表已归档」。
            stale = proj.bom_file(cat)
            if not stale.is_file():
                continue
            arch = None
            try:
                ad = proj.archive / f"空分类归档_{time.strftime('%Y%m%d_%H%M%S')}"
                ad.mkdir(parents=True, exist_ok=True)
                shutil.copy2(stale, ad / stale.name)
                arch = str(ad / stale.name)
            except OSError as e:
                arch = f"(归档失败:{e})"
            try:
                stale.unlink()
            except OSError:
                pass
            log(f"  [清空] {cat}:源表已无任何零件,旧产出表已归档 -> {arch}")
            conflicts.append({"cat": cat, "key": None, "col": "分类",
                              "pn": "", "nm": "", "kind": "已清空",
                              "detail": "源表已无此分类的任何零件,旧产出表已归档"
                                        "(没有直接删,可在 7_归档 里找回)"})
            continue
        out = proj.bom_file(cat)
        fdr = ex.get("firstDataRow", 4)
        existing = None if fresh else core.read_existing(out, ncol, fdr)
        base = {} if fresh else core.load_baseline(proj, cat)
        merged, conf, orphans = core.merge_rows(cat, rows, existing, base, ncol, ex)
        for key, extra in orphans:
            conf.append({"cat": cat, "key": key,
                         "pn": core.txt(extra.get(ex["partNumberColumn"])),
                         "nm": core.txt(extra.get(ex["nameColumn"])),
                         "col": None, "kind": "已移除",
                         "detail": "本次源表已无此行,已移除(要保留请在源表补回)"})
        conflicts += conf

        wb = Workbook()
        ws = wb.active
        ws.title = cat
        W = (style or {}).get("widths", {})
        for c in range(1, total_col + 1):
            ws.column_dimensions[get_column_letter(c)].width = W.get(c, 12)
        ws.column_dimensions[get_column_letter(ex["imgColumn"])].width = 22
        for k in keys:
            if col_of.get(k):
                ws.column_dimensions[get_column_letter(col_of[k])].width = 28

        # 标题行
        n_conf = len(conf)
        tf = (style or {}).get("titleFont")
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=total_col)
        t = ws.cell(1, 1)
        t.value = (f"{cat}物料表    ⚠ {n_conf} 处手动修改已保留(标黄)"
                   if n_conf else f"{cat}物料表")
        t.font = Font(name=(tf.name if tf and tf.name else "宋体"),
                      size=max(12, int(tf.size) + 2) if tf and tf.size else 14,
                      bold=True)
        t.alignment = Alignment(horizontal="center", vertical="center")
        if n_conf:
            t.fill = PatternFill(fill_type="solid", start_color="FFFFE699",
                                 end_color="FFFFE699")
        ws.row_dimensions[1].height = 30

        # 表头(占两行)
        for c in range(1, total_col + 1):
            ws.merge_cells(start_row=2, start_column=c, end_row=3, end_column=c)
            cell = ws.cell(2, c)
            kk = next((k for k, v in col_of.items() if v == c), None)
            if kk:
                cell.value = cfg["deliverables"][kk]["label"]
            elif c <= ncol:
                cell.value = headers.get(c, "") or FALLBACK_HEADERS.get(c, "")
            elif c in (ex.get("markColumns") or []):
                # 标注位夹在数据列和交付物列之间,表头不能留空,
                # 否则打开表看不出这几列是干什么的
                cell.value = MARK_HEADERS.get(c, "标注")
            hf = (style or {}).get("headerFont")
            cell.font = Font(name=(hf.name if hf and hf.name else "宋体"),
                             size=hf.size if hf and hf.size else 11, bold=True)
            cell.alignment = Alignment(horizontal="center", vertical="center",
                                       wrap_text=True)
        ws.row_dimensions[2].height = 26
        ws.row_dimensions[3].height = 14

        marks = {(c["key"], c["col"]) for c in conf if c["col"]}
        reds = {x.upper() for x in ex["redColors"]}
        for i, it in enumerate(merged, 1):
            r = 3 + i
            key = core.row_key(cat, it.get("pn", ""), it.get("nm", ""))
            rv = it.get("_rv") or [None] * ncol
            for c in range(1, ncol + 1):
                cell = ws.cell(r, c)
                cell.value = it.get(c, rv[c - 1] if c <= len(rv) else None)
                if style:
                    f, bd, al, nf = style["cols"].get(c, (None, None, None, "General"))
                    if f: cell.font = copy(f)
                    if bd: cell.border = copy(bd)
                    cell.number_format = nf
                cell.alignment = Alignment(
                    horizontal="center" if c == ex["noColumn"] else "left",
                    vertical="center",
                    wrap_text=c in (ex["partNumberColumn"], ex["nameColumn"],
                                    ex["materialColumn"], ex["craftColumn"],
                                    ex["noteColumn"]))
                if (key, c) in marks:
                    cell.fill = PatternFill(fill_type="solid",
                                            start_color=CONFLICT_FILL,
                                            end_color=CONFLICT_FILL)
                    cell.border = CONFLICT_BORDER
                elif (ex["keepRedFill"] and c == ex["noteColumn"]
                      and it.get("hrgb") in reds):
                    cell.fill = PatternFill(fill_type="solid",
                                            start_color=it["hrgb"],
                                            end_color=it["hrgb"])
                else:
                    cell.fill = PatternFill(fill_type=None)
            if it.get("link"):
                nc2 = ws.cell(r, ex["noteColumn"])
                nc2.hyperlink = it["link"]
                nc2.font = Font(name="宋体", size=8, color="0563C1",
                                underline="single")
            # 标注列:把「新/改/STEP/出工程图STEP」这些意图原样写回去。
            # 不写的话产出表里这几列是空的,下次再导入就再也读不回来 ——
            # 标记只在源表的手工标注里,丢了就是永久丢失。
            # _mv 是读取时记下的标注列原始值(含 ncol 之外的列,_rv 里没有)。
            mv = it.get("_mv") or {}
            for mc in (ex.get("markColumns") or []):
                if mc <= ncol:
                    continue           # 数据列,上面已经写过
                if any(v == mc for v in col_of.values()):
                    continue           # 这一列现在是交付物列,别覆盖
                val_m = core.txt(mv.get(mc))
                proto_m = core.txt(it.get("proto"))
                if val_m or (proto_m and mc == 10):
                    cell = ws.cell(r, mc)
                    cell.value = proto_m if (proto_m and not val_m) else val_m
                    cell.alignment = Alignment(horizontal="left",
                                               vertical="center")
            ws.row_dimensions[r].height = (rowh * 1.6) if it.get("link") else rowh
            for k in keys:
                col = col_of.get(k)
                if col and it.get(k):
                    cell = ws.cell(r, col)
                    cell.value = it[k]
                    cell.hyperlink = "../" + it[k + "_rel"]
                    cell.font = Font(name="宋体", size=10, color="0563C1",
                                     underline="single")
                    cell.alignment = Alignment(horizontal="center",
                                               vertical="center")
            if it.get("img"):
                f = cache / f"{cat}_{i:03d}.png"
                try:
                    # 原子写:并发 build 时另一个进程可能正在读同一个缓存文件,
                    # 直接 write_bytes 会让它读到半截 -> "cannot identify image file"
                    paths.atomic_write_bytes(f, it["_png"])
                    im = XLImage(str(f))
                    ratio = min(150 / im.width, 85 / im.height, 1.0)
                    im.width = int(im.width * ratio)
                    im.height = int(im.height * ratio)
                    ws.add_image(im, f"{get_column_letter(ex['imgColumn'])}{r}")
                except Exception as e:
                    log(f"    [图片失败] {f.name}: {e}")
        try:
            # 先存到临时文件再替换:直接 wb.save(out) 写到一半失败,
            # 用户手里的表就成坏文件了(源表虽不动,产出表会)。
            tmp_out = out.with_name(f"{out.stem}.tmp{os.getpid()}{out.suffix}")
            try:
                wb.save(tmp_out)
                os.replace(str(tmp_out), str(out))
            except BaseException:
                try:
                    tmp_out.unlink(missing_ok=True)
                except OSError:
                    pass
                raise
        except PermissionError:
            log(f"  [被占用] {out.name} 正被 Excel/WPS 打开,请关闭后重试")
            continue
        # 基线必须存「工具生成的值」,否则保护只生效一次
        core.save_baseline(proj, cat, {
            core.row_key(cat, it.get("pn", ""), it.get("nm", "")):
            {"cells": {str(c): core._inc_cell(it, c) for c in range(1, ncol + 1)},
             "img": it.get("img") or ""}
            for it in rows})
        written.append(str(out))
        log(f"  {out.name}: {len(merged)} 条"
            + (f"   ⚠ 保留 {len([c for c in conf if c['col']])} 处手动修改"
               if any(c["col"] for c in conf) else ""))
    shutil.rmtree(cache, ignore_errors=True)
    return written, conflicts
