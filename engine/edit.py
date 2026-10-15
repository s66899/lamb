# -*- coding: utf-8 -*-
"""P7 —— 看板在线编辑的落盘端。

铁律(本人要求 + 之前踩过的坑):

1. **只写 `2_BOM表/*.xlsx`,绝不碰源表。**
   源目录 `1_源数据` / 配置里登记的 `sources` / `bomSources` 一个字节都不许动。
   所以这里所有路径都经 `_safe_bom_file()` 校验,过不了就抛,不做兜底。

2. **先备份再写。** 每次写盘前把要改的表整份复制到
   `7_归档/改表前备份_<时间戳>/`,和之前改表前备份一个套路。

3. **原子写。** 先写同目录临时文件再 `os.replace`。
   写到一半断电 / Excel 正开着这个文件,都不会留下半张表。

4. **两段式。** `preview_edits()` 只算不改,返回清单;
   `apply_edits()` 才真写。本人要求「提交前弹窗列清单,确认后才写盘」,
   所以前端拿的是预览,确认后才发第二次请求。

5. 行号用「行号 + 图号」双重校验。看板可能开着很久,期间源表重建过,
   行号早就漂了 —— 只按行号写会把内容写到**别的零件**上,而且不报错。
   图号对不上就整条拒绝,并告诉本人是哪一行。
"""
from __future__ import annotations

import json
import os
import shutil
import time
from pathlib import Path

from openpyxl import load_workbook

from . import config as C

# 看板能改的字段 -> extract 里对应的列号。
# **刻意不含交付物列**:交付物列是「要交什么文件」的人工核对结果,
# 改错了不会报错,只会让齐套统计悄悄变掉。
EDITABLE = {
    "pn": "partNumberColumn",
    "nm": "nameColumn",
    "mat": "materialColumn",
    "qty": "qtyColumn",
    "craft": "craftColumn",
    "note": "noteColumn",
}
EDIT_LABEL = {"pn": "图号", "nm": "名称", "mat": "材料",
              "qty": "数量", "craft": "工艺", "note": "备注"}
MAX_LEN = {"pn": 64, "nm": 128, "mat": 64, "qty": 8,
           "craft": 64, "note": 500}
MAX_EDITS = 500          # 一次提交上限,防手抖点出几千条


class EditError(Exception):
    """校验不过。消息直接给本人看,不要包成 500。"""


def _safe_bom_file(proj, cat: str) -> Path:
    """只允许落在 `2_BOM表` 里。

    `cat` 来自 HTTP,可能有 `../`。所以不能拼完就 `is_file()` 了事 ——
    必须 resolve 之后确认它确实在 2_BOM表 下面。
    """
    if not cat or any(ch in cat for ch in "/\\"):
        raise EditError(f"分类名不合法:{cat!r}")
    bom_dir = (proj.root / P_BOM).resolve()
    f = (proj.bom / f"{cat}物料表.xlsx").resolve()
    try:
        f.relative_to(bom_dir)
    except ValueError:
        raise EditError(f"拒绝写入 {f}:不在 2_BOM表 里")
    if f.name.startswith("~$"):
        raise EditError("拒绝写入 Excel 临时文件")
    if not f.is_file():
        raise EditError(f"找不到产出表:{f.name}")
    return f


P_BOM = "2_BOM表"          # 和 paths.LAYOUT["bom"] 一致;这里不 import paths
                          # 是为了避免 paths <-> core 的循环依赖


def _norm(v) -> str:
    return "" if v is None else str(v).strip()


def _check_edits(cfg, proj, edits):
    """校验 + 归一化。不碰磁盘。"""
    if not isinstance(edits, list) or not edits:
        raise EditError("没有要保存的修改")
    if len(edits) > MAX_EDITS:
        raise EditError(f"一次最多 {MAX_EDITS} 条,现在有 {len(edits)} 条")
    order = cfg["categories"]["order"]
    by_cat: dict[str, list] = {}
    for i, e in enumerate(edits, 1):
        if not isinstance(e, dict):
            raise EditError(f"第 {i} 条格式不对")
        cat = _norm(e.get("cat"))
        field = _norm(e.get("field"))
        if cat not in order:
            raise EditError(f"第 {i} 条:未知分类 {cat!r}")
        if field not in EDITABLE:
            raise EditError(
                f"第 {i} 条:字段 {field!r} 不可改(可改:"
                + "、".join(EDIT_LABEL.values()) + ")")
        try:
            row = int(e.get("row"))
        except (TypeError, ValueError):
            raise EditError(f"第 {i} 条:行号不是整数({e.get('row')!r})")
        if row < 1:
            raise EditError(f"第 {i} 条:行号 {row} 无效")
        val = "" if e.get("value") is None else str(e["value"])
        if len(val) > MAX_LEN[field]:
            raise EditError(
                f"第 {i} 条 ({EDIT_LABEL[field]}):内容 {len(val)} 字,"
                f"超过上限 {MAX_LEN[field]}")
        if field == "qty" and val.strip():
            if not val.strip().isdigit() and not _is_num(val):
                raise EditError(f"第 {i} 条:数量「{val}」不是数字")
        by_cat.setdefault(cat, []).append(
            {"row": row, "field": field, "value": val,
             "pn": _norm(e.get("pn")), "was": e.get("was")})
    return by_cat


def _is_num(s: str) -> bool:
    try:
        float(s)
        return True
    except ValueError:
        return False


def preview_edits(cfg, proj, edits):
    """只算不改,返回给本人看的清单。

    返回 {"ok": True, "rows": [...], "total": n, "cats": [...]}
    每行 = {cat, row, pn, field, label, was, now, file}
    """
    by_cat = _check_edits(cfg, proj, edits)
    ex = cfg["extract"]
    hdr = ex["headerRow"]
    first = ex["firstDataRow"]
    out, total, files = [], 0, []
    for cat in cfg["categories"]["order"]:
        if cat not in by_cat:
            continue
        f = _safe_bom_file(proj, cat)
        files.append(f)
        wb = load_workbook(f)
        ws = wb.active
        for e in by_cat[cat]:
            col = ex[EDITABLE[e["field"]]]
            if e["row"] > (ws.max_row or 0):
                wb.close()
                raise EditError(
                    f"{cat}:第 {e['row']} 行不存在(表只有 "
                    f"{ws.max_row} 行)。看板可能过期了,刷新一下再改。")
            # 行号会漂:用图号再对一次,对不上就整条拒 —— 宁可让人重改,
            # 也不能把「涡轮轴」的材料写到「底板垫块」上还不报错。
            if e["pn"]:
                cur_pn = _norm(ws.cell(e["row"], ex["partNumberColumn"]).value)
                if cur_pn and cur_pn != e["pn"]:
                    wb.close()
                    raise EditError(
                        f"{cat}:第 {e['row']} 行的图号现在是「{cur_pn}」,"
                        f"不是你要改的「{e['pn']}」。看板过期了,刷新后再改。")
            was = _norm(ws.cell(e["row"], col).value)
            if was == e["value"]:
                continue                      # 没真变,不列进清单
            total += 1
            # 清单里必须能看出**是哪一件**。优先用前端带来的图号,
            # 没有就读这一行真正的图号 —— 早先直接退回 `was`,
            # 于是改「材料」时清单里显示的是材料自己,本人根本对不上是哪件。
            row_pn = e["pn"] or _norm(
                ws.cell(e["row"], ex["partNumberColumn"]).value)
            row_nm = _norm(ws.cell(e["row"], ex["nameColumn"]).value)
            out.append({
                "cat": cat, "row": e["row"], "pn": row_pn, "nm": row_nm,
                "field": e["field"], "label": EDIT_LABEL[e["field"]],
                "was": was, "now": e["value"], "file": f.name})
        wb.close()
    return {"ok": True, "rows": out, "total": total,
            "cats": [f.name for f in files]}


def _backup(files, log=print):
    """改表前备份。

    放 `7_归档/改表前备份_看板编辑_<时间戳>/` —— 和程序生成的
    `导入前备份_*` / `同步前备份_*` 同一层。
    **刻意不叫 `改表前备份/`**:那个名字已经有一个手动的目录了
    (`7_归档/开发过程备份/改表前备份/`),同名两个目录,以后
    「东西不见了去哪找」就得先猜是哪一个。
    """
    if not files:
        return None
    d = (files[0].parents[1] / "7_归档"
         / f"改表前备份_看板编辑_{time.strftime('%Y%m%d_%H%M%S')}")
    n = 0
    for f in files:
        try:
            d.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, d / f.name)
            n += 1
        except OSError as e:
            log(f"[备份失败] {f.name}: {e}")
    return str(d) if n else None


def _atomic_save(wb, dest: Path):
    """同目录临时文件 -> os.replace。

    临时文件必须和目标**同一个目录**:跨盘符 os.replace 会报
    WinError 17。也不能用 tempfile.NamedTemporaryFile 直接命名 ——
    Windows 上它不给 .xlsx 后缀,openpyxl 照样能写,Excel 却打不开。
    """
    tmp = dest.with_name(dest.stem + f".tmp{os.getpid()}.xlsx")
    try:
        wb.save(str(tmp))
        os.replace(str(tmp), str(dest))
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass
        try:
            wb.close()
        except Exception:
            pass


def apply_edits(cfg, proj, edits, log=print):
    """确认之后才调这里。先备份 → 原子写 → 返回结果。"""
    by_cat = _check_edits(cfg, proj, edits)
    ex = cfg["extract"]
    files = [_safe_bom_file(proj, c) for c in by_cat]
    bak = _backup(files, log=log)
    if bak:
        log(f"  已备份 {len(files)} 张表 -> {bak}")

    written, skipped = 0, 0
    for cat, es in by_cat.items():
        f = _safe_bom_file(proj, cat)
        wb = load_workbook(f)
        ws = wb.active
        for e in es:
            col = ex[EDITABLE[e["field"]]]
            if e["row"] > (ws.max_row or 0):
                skipped += 1
                continue
            if e["pn"]:
                cur_pn = _norm(ws.cell(e["row"], ex["partNumberColumn"]).value)
                if cur_pn and cur_pn != e["pn"]:
                    skipped += 1
                    continue
            was = _norm(ws.cell(e["row"], col).value)
            if was == e["value"]:
                skipped += 1
                continue
            c = ws.cell(e["row"], col)
            c.value = e["value"]
            written += 1
            log(f"  {cat} 第{e['row']}行 {EDIT_LABEL[e['field']]}:"
                f"「{was or '空'}」→「{e['value']}」")
        _atomic_save(wb, f)
    return {"ok": True, "written": written, "skipped": skipped,
            "backup": bak, "cats": [f.name for f in files]}