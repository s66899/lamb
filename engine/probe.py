# -*- coding: utf-8 -*-
"""🐑 助手工程师 —— 源表自动探测。

导入别人的项目时,靠这里把「表长什么样」猜出来,尽量不让用户手填配置。
探测项:工作表、表头行、分类段列、红色列、图号/名称/数量等列。
"""

from __future__ import annotations

import re
import zipfile
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.utils import get_column_letter

HEADER_HINTS = {
    "no": ["序号", "序", "编号", "no", "item"],
    "img": ["图示", "图片", "图形", "外观", "photo", "pic", "image", "figure"],
    "partNumber": ["图号", "图号/名称", "件号", "料号", "物料号", "编码",
                   "part", "pn", "drawing no", "part number"],
    "name": ["名称", "品名", "零件名称", "物料名称", "描述", "name",
             "description", "part name"],
    "material": ["材料", "材质", "原料", "material"],
    "qty": ["数量", "用量", "qty", "quantity", "count", "用量 pcs"],
    "craft": ["工艺", "加工工艺", "工序", "process", "craft"],
    "note": ["备注", "说明", "remark", "note", "comment", "comment/remark"],
    "red": ["核对", "check", "确认", "更改", "修改", "新增", "变动", "改"],
}

SECTION_WORDS = ["机加", "加工", "钣金", "塑胶", "塑料", "3D打印", "3d打印",
                 "标准件", "外购", "采购", "五金", "注塑", "压铸", "钼", "齿轮",
                 "丝印", "线束", "包材", "模具"]

RED_HEX = ("FFFF0000", "FFC00000", "FFE00000", "FFFF9999", "FF9C0006",
           "FFFFC7CE", "FFFFEB9C")


def _txt(v):
    return "" if v is None else str(v).strip()


def _fill(cell):
    fl = cell.fill
    if fl is None or not fl.fill_type:
        return None
    g = fl.fgColor
    if g is not None and g.type == "rgb" and g.rgb:
        return str(g.rgb).upper()
    return None


def has_cell_images(xlsx: Path) -> bool:
    try:
        with zipfile.ZipFile(xlsx) as z:
            return "xl/cellimages.xml" in z.namelist()
    except Exception:
        return False


def _norm(s: str) -> str:
    return re.sub(r"[\s　()（）:：*·、,，。/\\_\-]", "", s).lower()


def _match_col(headers: dict, key: str) -> int | None:
    """在表头里找某一列。精确包含优先,再退化到首字匹配。"""
    hints = [h.lower() for h in HEADER_HINTS.get(key, [])]
    if not hints:
        return None
    for c, txt in headers.items():
        n = _norm(txt)
        if not n:
            continue
        for h in hints:
            if n == h or n.startswith(h):
                return c
    for c, txt in headers.items():
        n = _norm(txt)
        if not n:
            continue
        for h in hints:
            if h in n or n in h:
                return c
    return None


def _find_header_row(ws, max_scan=25) -> int:
    """表头 = 非空字符串最多的一行(且至少 3 列)。"""
    best, best_n = 1, 0
    for r in range(1, min(ws.max_row, max_scan) + 1):
        vals = [_txt(ws.cell(r, c).value) for c in range(1, min(ws.max_column, 30) + 1)]
        strings = [v for v in vals if v and not v.startswith("=")]
        if len(strings) >= 3 and len(strings) > best_n:
            best, best_n = r, len(strings)
    return best


def probe(xlsx: Path) -> dict:
    """探测单个 xlsx 的结构。返回可直接填进配置的片段。"""
    xlsx = Path(xlsx)
    out = {
        "path": str(xlsx), "name": xlsx.name, "ok": False,
        "sheet": None, "sheetNames": [], "headerRow": 1, "firstDataRow": 2,
        "dataColumns": 10, "redColumn": None, "redCount": 0,
        "sectionColumn": None, "sections": [], "redRows": 0, "totalRows": 0,
        "columns": {}, "cellImages": has_cell_images(xlsx),
        "notes": [],
    }
    try:
        wb = load_workbook(xlsx, data_only=True)
    except Exception as e:
        out["notes"].append(f"无法打开: {e}")
        return out
    out["sheetNames"] = list(wb.sheetnames)

    best = None
    for name in wb.sheetnames:
        ws = wb[name]
        red = sum(1 for row in ws.iter_rows() for c in row
                  if _fill(c) in RED_HEX)
        filled = sum(1 for row in ws.iter_rows() for c in row if c.value is not None)
        score = red * 3 + filled
        if best is None or score > best[0]:
            best = (score, name, ws, red)
    if best is None:
        wb.close()
        out["notes"].append("没有可读的工作表")
        return out
    _, name, ws, red = best
    out["sheet"] = name
    out["redCount"] = red
    out["totalRows"] = ws.max_row

    hrow = _find_header_row(ws)
    out["headerRow"] = hrow
    headers = {c: _txt(ws.cell(hrow, c).value)
               for c in range(1, min(ws.max_column, 30) + 1)}
    headers = {c: v for c, v in headers.items() if v}
    out["headers"] = headers

    cols = {k: _match_col(headers, k) for k in
            ("no", "img", "partNumber", "name", "material", "qty", "craft",
             "note", "red")}
    out["columns"] = {k: v for k, v in cols.items() if v}
    if not cols.get("partNumber") and not cols.get("name"):
        out["notes"].append("表头里找不到「图号/名称」列,需要手工指定")
    else:
        out["ok"] = True

    # 红色最集中的列 = 新改动标记列。
    # 同一张表里可能多列都有红底(用户改过标记列),数量最多的是最可能的,
    # 但并列时无法判断 —— 一律把所有候选报出来让用户确认。
    red_per_col = {}
    for c in range(1, min(ws.max_column, 30) + 1):
        n = sum(1 for r in range(1, min(ws.max_row, 2000) + 1)
                if _fill(ws.cell(r, c)) in RED_HEX)
        if n:
            red_per_col[c] = n
    if red_per_col:
        top = max(red_per_col.values())
        cands = sorted(c for c, n in red_per_col.items() if n >= top * 0.8)
        out["redColumn"] = max(red_per_col, key=lambda k: red_per_col[k])
        out["redRows"] = red_per_col[out["redColumn"]]
        out["redAllColumns"] = {get_column_letter(k): v
                                for k, v in sorted(red_per_col.items())}
        out["redCandidates"] = [get_column_letter(c) for c in cands]
        out["redAmbiguous"] = len(cands) > 1
    else:
        out["redCandidates"] = []
        out["redAmbiguous"] = False
        out["notes"].append("没找到红底色单元格,无法自动识别「新改动」")

    # 分类段:某一列有值,而序号列与名称列为空
    nc = cols.get("no", 1)
    pc = cols.get("partNumber", 3)
    if nc and pc:
        cand = {}
        for c in range(1, min(ws.max_column, 30) + 1):
            if c in (nc, pc):
                continue
            n = 0
            for r in range(hrow + 1, min(ws.max_row, 2000) + 1):
                v = _txt(ws.cell(r, c).value)
                if v and not _txt(ws.cell(r, nc).value) and not _txt(ws.cell(r, pc).value):
                    n += 1
            if n:
                cand[c] = n
        if cand:
            c = max(cand, key=lambda k: cand[k])
            out["sectionColumn"] = c
            out["sections"] = [get_column_letter(c)]

    secs = []
    sc = out["sectionColumn"]
    if sc:
        for r in range(hrow + 1, min(ws.max_row, 2000) + 1):
            v = _txt(ws.cell(r, sc).value)
            if v and not _txt(ws.cell(r, nc).value) and not _txt(ws.cell(r, pc).value):
                if any(w in v for w in SECTION_WORDS) or len(v) <= 12:
                    secs.append(v)
    out["sectionList"] = secs
    out["firstDataRow"] = hrow + 2
    used = sorted([v for v in cols.values() if v])
    out["dataColumns"] = max(used + [8]) if used else 10
    wb.close()
    return out


def scan_dir(root, pattern: str = "物料|清单|BOM|bom|表") -> list:
    """扫描目录里所有候选 xlsx(排除临时文件与交付产物)。"""
    root = Path(root)
    pat = re.compile(pattern) if pattern else None
    # 除了助手自己的目录,旧版 bomkit 的目录名也要跳过:
    # 用户导入一个「已完工项目」时,里面既有 BOM表(要导入)
    # 也有看板产物(不要导入),不能一律按名字跳过 BOM表。
    #
    # 注意这里**不能**跳 3D图 / 2D图 —— 那是用户源目录里交付物的目录名,
    # 跳掉就等于「导入丢文件」。表在 3D图/ 下面极少见,真出现了也不该丢;
    # 真正的交付物是 .step/.pdf,不在这函数的扫描范围(只扫 xlsx/xlsm)。
    skip_dirs = {"2_BOM表", "3_3D图", "4_2D图", "4_工程图", "5_2D图", "6_看板",
                 "7_归档", "_基线", "_日志", "_报告", "项目", "日志",
                 "__pycache__", "templates", "engine",
                 "1_源数据"}
    found = []
    for p in sorted(root.rglob("*.xlsx")) + sorted(root.rglob("*.xlsm")):
        if p.name.startswith(("~$", ".")):
            continue
        if any(part in skip_dirs for part in p.parts):
            continue
        if pat and not pat.search(p.stem) and not pat.search(p.name):
            continue
        found.append(p)
    return found


def discover(root, pattern: str = "物料|清单|BOM|bom|表") -> list:
    """扫描 + 逐个探测,返回可用源表(附样机标记猜测)。"""
    res = []
    for p in scan_dir(root, pattern):
        pr = probe(p)
        if not pr["ok"]:
            continue
        m = (re.match(r"^([A-Za-z])样机", p.parent.name)
             or re.search(r"样机\s*([A-Za-z])", p.parent.name)
             or re.search(r"样机\s*([A-Za-z])", p.name)
             or re.search(r"[（(]\s*样机?\s*([A-Za-z])", p.name)
             or re.search(r"样机\s*([A-Za-z])", p.name))
        if m:
            pr["tag"] = m.group(1).upper()
        elif re.search(r"总(物料|表|清单)|汇总", p.stem):
            # 「节水马桶总物料」是整机的汇总表,不属于任何一台样机。
            # 以前回退到「取文件名首字」,得到 "节",于是和样机件合并去重时
            # 变成 "A节"/"B节",看板上的样机列全是这种看不懂的值。
            pr["tag"] = ""
        else:
            pr["tag"] = (p.stem[:1].upper()
                         if p.stem and not p.stem[0].isdigit() else "")
        pr["redRows"] = pr.get("redRows", 0)
        res.append(pr)
    return res
