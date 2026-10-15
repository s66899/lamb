# -*- coding: utf-8 -*-
"""🐑 助手工程师 —— 核心:提取 / 归并 / 三方合并 / 数据检查。"""

from __future__ import annotations

import base64
import json
import re
import zipfile
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook

from . import paths
from .paths import Project


# --------------------------------------------------------------------------
# 小工具
# --------------------------------------------------------------------------
def txt(v) -> str:
    return "" if v is None else str(v).strip()


def fill_rgb(cell):
    fl = cell.fill
    if fl is None or not fl.fill_type:
        return None
    g = fl.fgColor
    if g is not None and g.type == "rgb" and g.rgb:
        return str(g.rgb).upper()
    return None


def safe_name(s: str) -> str:
    s = txt(s).replace("\n", "_")
    s = re.sub(r'[<>:"/\\|?*]', "_", s)
    return s.strip(" .") or "未命名"


def parse_qty(q):
    t = txt(q)
    if not t:
        return None
    try:
        return float(re.sub(r"[^0-9.\-]", "", t))
    except ValueError:
        return None


def fmt_qty(qtys):
    nums = [n for n in (parse_qty(q) for q in qtys) if n is not None]
    if not nums:
        return None
    f = lambda n: str(int(n)) if n == int(n) else str(n)
    if len(nums) == 1:
        return f(nums[0])
    return "+".join(f(n) for n in nums) + "=" + f(sum(nums))


def _same(a, b) -> bool:
    if a is None and b is None:
        return True
    if a is None or b is None:
        return str(a or "").strip() == str(b or "").strip() == ""
    return str(a).strip() == str(b).strip()


# --------------------------------------------------------------------------
# DISPIMG 单元格图片(WPS)
# --------------------------------------------------------------------------
def _image_map(xlsx: Path) -> dict:
    try:
        with zipfile.ZipFile(xlsx) as z:
            if "xl/cellimages.xml" not in z.namelist():
                return {}
            ci = z.read("xl/cellimages.xml").decode("utf-8", "ignore")
            try:
                rels = z.read("xl/_rels/cellimages.xml.rels").decode("utf-8", "ignore")
            except KeyError:
                return {}
            rm = dict(re.findall(r'Id="([^"]+)"[^>]*?Target="([^"]+)"', rels))
            out = {}
            for blk in re.findall(r"<etc:cellImage>(.*?)</etc:cellImage>", ci, re.S):
                mn = re.search(r'name="(ID_[^"]+)"', blk)
                mr = re.search(r'r:embed="([^"]+)"', blk)
                if mn and mr and mr.group(1) in rm:
                    out[mn.group(1)] = "xl/" + rm[mr.group(1)].lstrip("/")
            return out
    except Exception:
        return {}


def _read_media(xlsx: Path, media: str):
    try:
        with zipfile.ZipFile(xlsx) as z:
            return z.read(media)
    except Exception:
        return None


def row_images(ws, xlsx: Path, id2png: dict, img_col: int, ncol: int) -> dict:
    """行号 -> 图片 bytes。两种机制都要认,否则必漏。

    实测两种机制是**互斥**的,不是并存的:
      - 零件表(样机A/B/C、总物料):图示列是 WPS 的 `DISPIMG` 公式,
        图片本体在 xlsx 内部的 `xl/media/`,`ws._images` 读出来是空的。
      - BOM 表(*物料表_带图):图是真嵌入图片,openpyxl 的 `ws._images`
        能读,但整张表一个 DISPIMG 都没有。

    以前 `extract()` 只认第一种、回读路径只认第二种,于是:
      - 导入零件表 -> 图全有
      - 导入已完工项目(只有 BOM 表) -> **一张图都没有**
    这里两种一起收,谁有给谁,同一行两种都有时优先 DISPIMG(它是源表原样)。
    """
    out = {}
    for r, im in _embedded_images(ws).items():
        raw = _img_bytes(im)
        if raw:
            out[r] = raw
    for r in range(1, (ws.max_row or 0) + 1):
        if r in out:
            continue
        v = ws.cell(r, img_col).value if img_col <= ncol else None
        if not v or "DISPIMG" not in str(v):
            continue
        m = re.search(r"ID_([0-9A-Fa-f]+)", str(v))
        k = "ID_" + m.group(1) if m else None
        if k and k in id2png:
            raw = _read_media(xlsx, id2png[k])
            if raw:
                out[r] = raw
    return out


def _embedded_images(ws) -> dict:
    """行号 -> openpyxl 图片对象。"""
    out = {}
    try:
        imgs = ws._images
    except Exception:
        return out
    for im in imgs or []:
        row = None
        try:
            a = im.anchor
            if hasattr(a, "_from"):
                row = a._from.row + 1
        except Exception:
            row = None
        if row is not None and row not in out:
            out[row] = im
    return out


def _img_bytes(im):
    try:
        raw = im._data()
    except Exception:
        return None
    return raw if raw else None


def row_links(ws, r: int, ncol: int, prefer: int = 0) -> str:
    """取这一行的超链接。

    以往只有「回读 BOM 表」那条路径读链接,而且只读备注列。走零件表
    (extract)时**一个链接都没读**,`link` 靠「备注文本以 http 开头」兜底 ——
    于是源表里 H/I 列上几百个真实超链接在看板上全是空的。
    实测零件表 H 列有 82 个、I 列 1 个,总物料表 H 列 82 个。

    优先备注列,再按列序找第一个;单元格文本是网址时也认。
    """
    order = [c for c in ([prefer] if prefer else []) + list(range(1, ncol + 1))
             if 1 <= c <= ncol]
    for c in order:
        try:
            cell = ws.cell(r, c)
        except Exception:
            continue
        hl = getattr(cell, "hyperlink", None)
        tgt = getattr(hl, "target", None) if hl is not None else None
        if tgt and str(tgt).lower().startswith(("http://", "https://")):
            return str(tgt)
        if not tgt and c == prefer:
            v = txt(cell.value)
            if v.lower().startswith(("http://", "https://")):
                return v
    return ""


# --------------------------------------------------------------------------
# 分类
# --------------------------------------------------------------------------
def classify_detail(cfg, section, pn, nm):
    """返回 (分类, 判定原因)。

    原因必须区分开,否则「开放段里没认出来的行」和「明确判定为外购的行」
    会混在一起 —— unmatchedCategory 和 purchaseCategory 默认都是「外购件」,
    光看分类结果根本分不出是哪条规则命中的,数据检查就会大面积误报。
    """
    c = cfg["categories"]
    if section:
        if section in c["directSections"]:
            return c["directSections"][section], f'段落「{section}」直接决定'
        if section not in c["openSections"]:
            return (c["openSections"][0] if c["openSections"]
                    else c["unmatchedCategory"]), f'段落「{section}」无对应规则'
    blob = f"{pn} {nm}"
    # 关键字优先级高于前缀:「AMIFENGDIAN 涡轮轴端盖垫片」名字里有「垫片」,
    # 那是要买的垫片,不是一块要铣的板。
    hit = next((k for k in c["purchaseKeywords"] if k and k in blob), None)
    if hit:
        return c["purchaseCategory"], f'名称含外购关键字「{hit}」'
    hit = next((p for p in c["machinedPrefixes"]
                if p and pn and pn.lower().startswith(p.lower())), None)
    if hit:
        return c["machinedCategory"], f'图号前缀「{hit}」'
    hit = next((k for k in c.get("machinedKeywords") or [] if k and k in nm), None)
    if hit:
        return c["machinedCategory"], f'名称含机加件特征「{hit}」'
    return c["unmatchedCategory"], "规则没认出来"


def classify(cfg, section, pn, nm) -> str:
    return classify_detail(cfg, section, pn, nm)[0]


# --------------------------------------------------------------------------
# 提取
# --------------------------------------------------------------------------
def cat_hint(cfg, fname: str = "", sheet: str = "") -> str:
    """从文件名 / 工作表名里认分类。

    按分类拆好的 BOM 表(「塑胶件物料表_带图.xlsx」/ 工作表名「塑胶件」)
    里面**没有分类段**,分类信息只写在文件名和工作表名上。以前完全没读,
    于是这些表全被当成无段表走关键字细分,结果 46 个外购件 + 18 个机加工件
    被混成 58 个外购件 + 32 个机加工件,3D打印件/塑胶件/钣金件整类消失。
    """
    cats = cfg["categories"]
    names = list(cats["order"]) + list(cats["directSections"].values())
    names += [k for k in cats["directSections"]]
    for raw in (sheet or "", fname or ""):
        t = txt(raw)
        if not t:
            continue
        for nm in names:
            if nm and nm in t:
                return nm
    return ""


def extract(cfg, log=print) -> list:
    ex = cfg["extract"]
    ncol = ex["dataColumns"]
    redset = {x.upper() for x in ex["redColors"]}
    base = Path(cfg["project"].get("baseDir") or ".")
    recs = []

    for s in cfg["sources"]:
        p = Path(s["path"])
        if not p.is_absolute():
            p = base / p
        if not p.is_file():
            log(f"  [跳过] 源表不存在: {p}")
            continue
        id2png = _image_map(p)
        try:
            wb = load_workbook(p, data_only=True)
        except Exception as e:
            log(f"  [跳过] 打不开: {p.name} ({e})")
            continue
        sheet = s.get("sheet") or ex["sheet"] or wb.sheetnames[0]
        if sheet not in wb.sheetnames:
            log(f"  [跳过] {p.name} 无工作表 {sheet}")
            wb.close()
            continue
        ws = wb[sheet]
        # 分类可能写在文件名/工作表名上,优先于段名
        file_cat = s.get("cat") or cat_hint(cfg, p.stem, sheet)
        imgs = row_images(ws, p, id2png, ex["imgColumn"], ncol)
        section, n = None, 0
        for r in range(ex["firstDataRow"] - 2, ws.max_row + 1):
            a = txt(ws.cell(r, ex["noColumn"]).value)
            b = txt(ws.cell(r, ex["sectionColumn"]).value)
            d = txt(ws.cell(r, ex["nameColumn"]).value)
            if b and not a and not d and "DISPIMG" not in b:
                section = b
                continue
            if fill_rgb(ws.cell(r, ex["redColumn"])) not in redset:
                continue
            rv = [ws.cell(r, c).value for c in range(1, ncol + 1)]
            for i in range(ncol):
                if rv[i] is not None and "DISPIMG" in str(rv[i]):
                    rv[i] = None
            pn = txt(rv[ex["partNumberColumn"] - 1])
            nm = txt(rv[ex["nameColumn"] - 1])
            if file_cat:
                cat, why = file_cat, f'表名/工作表名判定为「{file_cat}」'
            else:
                cat, why = classify_detail(cfg, section, pn, nm)
            recs.append({
                "tag": s.get("tag", ""), "cat": cat, "why": why,
                "section": section or file_cat,
                "src": p.name, "rv": rv, "png": imgs.get(r),
                "link": row_links(ws, r, ncol, ex["noteColumn"]),
                "hrgb": fill_rgb(ws.cell(r, ex["redColumn"])),
                "pn": pn, "nm": nm,
                "mat": txt(rv[ex["materialColumn"] - 1]),
                "qty": txt(rv[ex["qtyColumn"] - 1]),
                "craft": txt(rv[ex["craftColumn"] - 1]),
                "note": txt(rv[ex["noteColumn"] - 1]),
                # 源表里人在 markColumns(默认 I/J/K/L)手写的意图标注,
                # 如 STEP / 出工程图STEP / 新 / 改 —— 决定这件要不要出图。
                "marks": _marks(cfg, rv, ex),
            })
            n += 1
        wb.close()
        log(f"  {p.name}: 标红 {n} 条")
    return recs


# --------------------------------------------------------------------------
# 归并(去重 / 命名 / 交付物路径)
# --------------------------------------------------------------------------
# 源表手工标注 -> 交付物类型。
# 人写「出工程图STEP」是在说意图,但 deliverables.cats 是按分类白名单判定的;
# 两者不一致时以标注为准,并由 check_items 报一条 warn 提醒改 cats。
_MARK_KW = {
    "step": ("step", "stp", "三维", "3d"),
    # 这里刻意不放「工程图」:源表里「出工程图STEP」是一个整体说法,
    # 意思是"出工程图的 STEP",即 STEP 而不是 PDF。旧看板(bomkit)对
    # mtb-01「马桶壁」就是 3D图 有、2D图 无。若把「工程图」算进 2d,
    # 会凭空多出一个不存在的 2D 图需求,清单里永远消不掉。
    "2d": ("2d图", "2d", "dwg", "dxf", "pdf", "图纸"),
}


def mark_wants(blob: str) -> set:
    """源表手工标注 -> 这件需要哪些交付物。

    和 deliverables.*.cats 是叠加关系,不是替代:
    分类说「塑胶件要出 STEP」,标注说「出工程图STEP」,两者都成立。
    标注存在的意义是覆盖分类说不了的情况(分类没配 / 标注单独点名)。
    """
    low = (blob or "").lower()
    if not low:
        return set()
    out = set()
    if any(k in low for k in _MARK_KW["step"]):
        out.add("step")
    for key in ("2d",):
        if any(k in low for k in _MARK_KW[key]):
            out.add(key)
    if "step" not in out and "工程图" in low:
        out.add("2d")
    return out


def apply_deliverables(cfg, proj, out: dict, cat: str, base: str = "",
                       explicit: dict | None = None) -> None:
    """把交付物判定写进 item(原地修改)。

    零件表(consolidate→make)和 BOM 表(read_items_from_tables)两条读取路径
    都调这里。以前是两段各自维护的代码,已经开始跑偏 —— BOM 那段没有
    「_want 三态」、没有根目录兜底、没有 mark_wants 提升。

    `explicit`: BOM 表里已经填好的交付物列 {key: 文件名}。给了就以表里
    写的为准(那是人工核对的结果);没给就按 base + ext 推算。
    """
    cats = cfg["categories"]
    dd = cfg["deliverables"]
    mw = mark_wants(" ".join(out.get("marks") or []))
    for key, spec in dd.items():
        want = cat in spec.get("cats", []) or key in mw
        if explicit is not None:
            fn = txt(explicit.get(key))
            want = bool(fn)
        else:
            fn = base + spec["ext"] if want else ""
        out[key + "_want"] = bool(want and fn)
        if not out[key + "_want"]:
            out[key] = None
            for suf in ("_rel", "_path", "_found", "_href", "_real_path"):
                out[key + suf] = None
            out[key + "_how"] = ""
            out[key + "_exists"] = False
            out[key + "_near"] = []
            continue
        d = (proj.d(spec["dirKey"]) if proj is not None else None)
        if d is None:
            # 没有项目根(纯解析模式):只保留意图,不做文件核对
            out[key] = fn
            out[key + "_real_path"] = None
            continue
        sub = cats["subfolders"] and spec.get("subfolder", True)
        sub_dir = (d / cat) if sub else d
        stem = Path(fn).stem
        exts = ext_variants(spec["ext"])
        actual, how = find_deliverable(sub_dir, stem, exts)
        actual_dir = sub_dir
        if not actual and sub_dir != d:
            # 子目录里没有就回交付物根目录再找一遍。
            # 工程图这类历史上是平铺放的,配置一旦改成按分类建子目录,
            # 整批文件就会被判成「缺失」,而看板上看不出是查找方式的问题。
            actual2, how2 = find_deliverable(d, stem, exts)
            if actual2:
                actual, how, actual_dir = actual2, how2 + "/平铺", d
        out[key] = fn
        out[key + "_dir"] = str(sub_dir.relative_to(proj.root))
        out[key + "_rel"] = f'{out[key+"_dir"]}/{fn}'
        out[key + "_path"] = sub_dir / fn
        out[key + "_found"] = actual
        out[key + "_how"] = how
        out[key + "_exists"] = bool(actual)
        out[key + "_near"] = ([] if actual else near_files(sub_dir, stem, exts)
                              or ([] if sub_dir == d
                                  else near_files(d, stem, exts)))
        out[key + "_href"] = (
            (f'{actual_dir.relative_to(proj.root)}/{actual}') if actual
            else out[key + "_rel"])
        # **真正命中的那个文件**的绝对路径。
        #
        # `step_path` 是按 BOM 表里的文件名推的(3_3D图/机加工件/FBZ_A.step),
        # 而实际文件常常叫 FBZ_A1.STEP(how=前缀)。任何「拿 step_path 去读文件」
        # 的地方都会拿到一个不存在的路径 —— 以前 3D 预览就栽在这:
        # 41 件里有 2 件静默地没有网格,而看板只显示「有文件」,
        # 看不出那 2 件点开会是空的。
        #
        # 名字带 _path 后缀是有意的:dashboard 拼 payload 时会把这类键剔掉,
        # 13MB 的看板不该为绝对路径再撑一份。
        out[key + "_real_path"] = (actual_dir / actual) if actual else None


def consolidate(cfg, recs) -> list:
    cats = cfg["categories"]
    ex = cfg["extract"]
    nn = ex["newNote"]

    proj = Project(cfg["_proj_root"]) if cfg.get("_proj_root") else None

    def base_of(key):
        if not proj:
            return None
        return {"step": proj.step, "2d": proj.dash2d,
                "dwg": proj.dwg}.get(key)

    def make(rec, qty_override=None):
        base = ""
        if cfg["naming"]["usePartNumber"] and rec["pn"]:
            base = rec["pn"]
        elif cfg["naming"]["fallbackToName"] and rec["nm"]:
            base = rec["nm"]
        if cfg["naming"]["sanitize"]:
            base = safe_name(base)
        rv = list(rec["rv"])
        rv[ex["imgColumn"] - 1] = None
        if qty_override:
            rv[ex["qtyColumn"] - 1] = qty_override
        rv[ex["noteColumn"] - 1] = f"{nn}\n{rec['note']}" if rec["note"] else nn
        out = {
            # 来源段 + 判定原因。开放段(机加件等)靠规则细分,细分不出来时
            # 要能报出来让用户去补前缀/关键字,不能默默变外购件。
            "sec": rec.get("section"), "why": rec.get("why", ""),
            "cat": rec["cat"], "proto": rec["tag"], "src": rec["src"],
            "pn": rec["pn"], "nm": rec["nm"], "mat": rec["mat"],
            "qty": qty_override or rec["qty"], "craft": rec["craft"],
            "note": rec["note"],
            # 真实超链接。以前只认「备注文本以 http 开头」,源表里
            # H/I 列上几百个真链接在看板上全是空的。
            "link": rec.get("link") or (
                rec["note"] if rec["note"].lower().startswith(
                    ("http://", "https://")) else None),
            "hrgb": rec["hrgb"], "base": base,
            # 源表里人手工写的意图标注(STEP / 出工程图STEP / 新 / 改 …)。
            # 这是最权威的「这件要不要出图」信号,旧看板会带出来,
            # 助手工程师之前直接丢掉了,排查时非常吃亏。
            "marks": rec.get("marks") or [],
            "img": ("data:image/png;base64," +
                    base64.b64encode(rec["png"]).decode()) if rec["png"] else None,
            "_rv": rv, "_png": rec["png"],
        }
        # ---- 交付物逐项判定 ----------------------------------------
        # 要分清三件事,旧版把它们混成了一个「有/无」:
        #   1. 这件要不要这个交付物(_want)
        #   2. 要的话,期望文件名是什么(_rel)
        #   3. 实际文件在不在(_exists / _found / _how)
        # 分不清的话,看板里「不适用」会被显示成「缺失」,清单全是假警报。
        # 具体判定在 apply_deliverables —— 零件表和 BOM 表两条读取路径
        # 必须走同一套,否则同一份数据两条路出来的看板会对不上。
        apply_deliverables(cfg, proj, out, rec["cat"], base=base)
        return out

    items = []
    for cat in cats["order"]:
        pool = [r for r in recs if r["cat"] == cat]
        if not pool:
            continue
        bucket = []
        if cat in cats["dedupe"]:
            dk = {"name": "nm", "partNumber": "pn"}.get(cats["dedupeKey"],
                                                       cats["dedupeKey"])
            groups, order = {}, []
            for r in pool:
                key = txt(r[dk]) or f'{r["pn"]}|{r["nm"]}'
                if key in groups:
                    g = groups[key]
                    g["qtys"].append(r["qty"])
                    g["tags"].append(r["tag"])
                    if not g["rec"]["png"] and r["png"]:
                        g["rec"]["png"] = r["png"]
                else:
                    groups[key] = {"rec": r, "qtys": [r["qty"]], "tags": [r["tag"]]}
                    order.append(key)
            for k in order:
                g = groups[k]
                proto = "".join(sorted({t for t in g["tags"] if t}))[:2]
                it = make(g["rec"], fmt_qty(g["qtys"]))
                it["proto"] = proto or g["rec"]["tag"]
                bucket.append(it)
        else:
            rank = {s.get("tag", ""): i for i, s in enumerate(cfg["sources"])}
            pool.sort(key=lambda r: rank.get(r["tag"], 99))
            bucket.extend(make(r) for r in pool)
        for i, it in enumerate(bucket, 1):        # 每类独立 1..N
            it["no"] = i
            it["_rv"][ex["noColumn"] - 1] = i
        items.extend(bucket)
    return items


# --------------------------------------------------------------------------
# 基线 + 三方合并(保护手动修改)
# --------------------------------------------------------------------------
def row_key(cat, pn, nm) -> str:
    return f'{cat}|{txt(pn).lower()}|{txt(nm).lower()}'


# --------------------------------------------------------------------------
# 反向读取:从「你核对完的表」还原零件
# --------------------------------------------------------------------------
# 核对列(A核对/B核对/C核对)所在列,按出现顺序对应 A/B/C
_PROTO_COL = 10


def _images_by_row(ws, img_col: int) -> dict:
    """把工作表里的图片按锚定行号归类,转成 base64 data URI。"""
    out = {}
    try:
        imgs = ws._images
    except Exception:
        return out
    for im in imgs:
        row = None
        try:
            anchor = im.anchor
            if hasattr(anchor, "_from"):
                row = anchor._from.row + 1
        except Exception:
            row = None
        if row is None:
            continue
        try:
            raw = im._data()
        except Exception:
            continue
        if not raw:
            continue
        out.setdefault(row, "data:image/png;base64,"
                   + base64.b64encode(raw).decode())
    return out


def image_donor(cfg, cat, log=print):
    """读 imageSources[cat] 指向的源表,返回 (图号->png, 重复图号集合, 路径)。

    只收图号在源表里**唯一**的行。外购件那种 `2020-395` 重复好几行的情况,
    按图号配会把 A 件的图挂到 B 件头上 —— 宁可这张不配,也不能张冠李戴,
    所以重复图号全部跳过并报出来。
    """
    src = (cfg.get("imageSources") or {}).get(cat)
    if not src:
        return {}, set(), None
    p = Path(src)
    if not p.is_file():
        log(f"  [图片源缺失] {cat}: {p}")
        return {}, set(), p
    ex = cfg["extract"]
    ncol = ex["dataColumns"]
    try:
        wb = load_workbook(p, data_only=True)
    except Exception as e:
        log(f"  [图片源读失败] {p.name}: {e}")
        return {}, set(), p
    ws = wb[cfg["extract"]["sheet"]] if cfg["extract"]["sheet"] in wb.sheetnames \
        else wb.active
    id2png = _image_map(p)
    imgs = row_images(ws, p, id2png, ex["imgColumn"], ncol)
    pns, dup = {}, set()
    for r in range(ex["firstDataRow"], ws.max_row + 1):
        vals = [ws.cell(r, c).value for c in range(1, ncol + 1)]
        if all(v is None for v in vals):
            continue
        pn = txt(vals[ex["partNumberColumn"] - 1]).strip()
        raw = imgs.get(r)
        if not pn or not raw:
            continue
        if pn in pns:
            dup.add(pn)
        pns[pn] = raw
    wb.close()
    for pn in dup:
        pns.pop(pn, None)
    if dup:
        log(f"  [图片源] {p.name}: {len(dup)} 个图号重复,按图号配会张冠李戴,"
            f"已跳过(例:{' / '.join(sorted(dup)[:3])})")
    return pns, dup, p


def read_items_from_tables(cfg, proj, tables=None, log=print) -> list:
    """读取 BOM 表的当前内容(含你手动改过的),还原成零件列表。

    BOM 表是**权威来源**:它是人工核对过、图和链接都齐的最终表。
    所以导入一个「已完工项目」时必须以它为准,而不是重新去读零件表 ——
    零件表只有 DISPIMG 公式图、没有链接,读出来等于把内容退回去。

    `tables` 不给时读项目自己的 2_BOM表(人工核对后的成果);
    给了就按 [(路径, 分类, 工作表)] 读,用于「刚导入、还没搬进项目」的情况。
    """
    ex = cfg["extract"]
    ncol = ex["dataColumns"]
    cats = cfg["categories"]
    dd = cfg["deliverables"]
    # 表头 -> 交付物。label + aliases + key 都认,
    # 导入旧表/别人做的表时表头名字可能不一样。
    by_label = {}
    for k, spec in dd.items():
        for nm in [spec.get("label"), k] + list(spec.get("aliases") or []):
            if nm:
                by_label[str(nm)] = (k, spec)
    if tables is None:
        tables = [(proj.bom_file(c), c, None) for c in cats["order"]]
    items = []
    donors = {}          # cat -> {图号: png},只建一次
    n_donor_hit = n_donor_chg = 0
    for f, cat, sheet in tables:
        if not f.is_file():
            continue
        # BOM 表里的图是上次构建写进去的旧图;你在源表里更新过图之后,
        # 它不会自己跟着变。这里拿 imageSources 的源表图覆盖掉。
        if cat not in donors:
            donors[cat] = image_donor(cfg, cat, log=log)[0]
        try:
            wb = load_workbook(f, data_only=True)
        except Exception as e:
            log(f"  [读表失败] {f.name}: {e}")
            continue
        if sheet and sheet in wb.sheetnames:
            ws = wb[sheet]
        else:
            ws = wb.active
        id2png = _image_map(f)
        dcol = {}
        for c in range(ncol + 1, (ws.max_column or ncol) + 1):
            lab = txt(ws.cell(ex["headerRow"], c).value)
            if lab in by_label:
                dcol[c] = by_label[lab][0]
        imgs = row_images(ws, f, id2png, ex["imgColumn"], ncol)
        n = 0
        for r in range(ex["firstDataRow"], ws.max_row + 1):
            vals = {c: ws.cell(r, c).value for c in range(1, ncol + 1)}
            if all(v is None for v in vals.values()):
                continue
            n += 1
            pn = txt(vals[ex["partNumberColumn"]])
            nm = txt(vals[ex["nameColumn"]])
            proto = txt(vals.get(_PROTO_COL)) or "A"
            proto = "".join(ch for ch in proto.upper() if ch in "ABC")[:2] or "A"
            hrgb = fill_rgb(ws.cell(r, ex["noteColumn"]))
            note = txt(vals[ex["noteColumn"]])
            link = row_links(ws, r, ncol, ex["noteColumn"])
            raw_img = imgs.get(r)
            # 源表优先:图以 imageSources 指向的源表为准
            donor = donors.get(cat) or {}
            if pn in donor:
                if donor[pn] != raw_img:
                    n_donor_chg += 1
                raw_img = donor[pn]
                n_donor_hit += 1
            it = {
                "cat": cat, "proto": proto, "src": f.name, "pn": pn, "nm": nm,
                # P7:这一行在 2_BOM表 里的真实行号。看板在线编辑要靠它
                # 定位单元格。以前没有,只能靠图号反查 —— 而图号可以为空
                # (外购件常见),空图号的行就永远定位不到。
                "xrow": r,
                "mat": txt(vals[ex["materialColumn"]]),
                "qty": txt(vals[ex["qtyColumn"]]),
                "craft": txt(vals[ex["craftColumn"]]),
                "note": note, "link": link or None, "hrgb": hrgb,
                "base": pn or nm,
                "no": n,
                # 形状必须和 make() 产出的完全一致:img 是 data URI(给看板),
                # _png 是原始 bytes(给写表)。以前这条路径只给 img,
                # 结果写表时找不到 _png,报「[图片失败] … '_png'」。
                "img": ("data:image/png;base64," +
                        base64.b64encode(raw_img).decode()) if raw_img else None,
                "_png": raw_img,
                # 标注列的原始值(含 ncol 之外的 9/10/11/12 列)。
                # _rv 只有 1..ncol,标注列取不到 —— 采集和写回都必须靠它。
                "_mv": {c: ws.cell(r, c).value
                        for c in (ex.get("markColumns") or [])},
                "marks": _marks(cfg, vals, ex,
                                extra={c: ws.cell(r, c).value
                                       for c in (ex.get("markColumns") or [])}),
                "_rv": [vals[c] for c in range(1, ncol + 1)],
            }
            for key in dd:
                # 显式记下「这一件到底要不要这个交付物」——
                # 表里没填文件名 = 不需要(而不是「缺件」),看板要能区分,
                # 否则清单里会混进大量其实不用的交付物。
                it[key + "_want"] = False
            apply_deliverables(cfg, proj, it, cat, explicit={
                k: txt(ws.cell(r, c).value) for c, k in dcol.items()})
            items.append(it)
        wb.close()
    if n_donor_hit:
        log(f"  [图片源] 用源表的图覆盖 {n_donor_hit} 件"
            + (f"(其中 {n_donor_chg} 件和 BOM 表里的旧图不同)"
               if n_donor_chg else ""))
    # ★ 加工后核对 / 新购件核对(P14)。
    #   挂在**这里**而不是各看板自己读,是为了让网页看板和原生看板
    #   拿到的是**同一份** `chk` —— 两边数据必须一致,否则会出现
    #   「网页上写着合格、程序里还显示待核对」这种没法解释的现象。
    #   attach 内部对任何异常都吞掉并给默认值:核对表读不出来,
    #   最多是看不到核对结果,不该把整个看板读挂。
    try:
        from . import checklist
        n_chk = checklist.attach(cfg, proj, items)
        if n_chk:
            log(f"  [核对表] 挂上 {n_chk} 件已核对的记录")
    except Exception as e:
        for it in items:
            it.setdefault("chk", {"m": {"st": "todo", "note": ""},
                                  "p": {"st": "todo", "note": ""}})
        log(f"  [核对表] 读不出来({e}),核对栏按「待核对」显示")
    return items



def _marks(cfg, rv: list, ex: dict, extra: dict = None) -> list:
    """采集源表里的手工标注(STEP / 出工程图STEP / 新 / 改 …)。

    这些格子是人在源表上手写的意图标记,是「这件到底要不要出图」最权威的信号。
    旧看板(bomkit)会把它带进页面,助手工程师之前直接丢掉了,导致看板分不清
    「不需要出图」和「需要但没出」。

    `extra` 传 markColumns 里 ncol 之外的列值 —— `rv` 只到 ncol(=8),
    标注在 9/10/11/12 列,只扫 rv 等于永远扫不到(实测看板标记全空)。
    """
    cols = ex.get("markColumns") or []
    out = []
    for c in cols:
        if extra and c in extra:
            v = txt(extra[c])
        elif 1 <= c <= len(rv):
            v = txt(rv[c - 1])
        else:
            continue
        if v and v not in out:
            out.append(v)
    return out


def baseline_file(proj, cat) -> Path:
    return proj.baseline / f"{cat}.json"


def load_baseline(proj, cat) -> dict:
    f = baseline_file(proj, cat)
    if not f.is_file():
        return {}
    try:
        return json.loads(f.read_text(encoding="utf-8-sig")).get("rows", {})
    except Exception:
        return {}


def save_baseline(proj, cat, rows: dict):
    proj.baseline.mkdir(parents=True, exist_ok=True)
    paths.atomic_write_text(
        baseline_file(proj, cat),
        json.dumps({"generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "rows": rows}, ensure_ascii=False))


def read_existing(path: Path, ncol: int, first_data_row: int = 4):
    """读取用户手上的表(仅数据行)。文件不存在返回 None。"""
    if not path.is_file():
        return None
    try:
        wb = load_workbook(path, data_only=True)
    except Exception:
        return None
    ws = wb.active
    rows = []
    # 必须从数据行开始,否则标题行/表头行会被当成零件行
    for r in range(max(1, first_data_row), ws.max_row + 1):
        rec = {c: ws.cell(r, c).value for c in range(1, ncol + 1)}
        if all(v is None for v in rec.values()):
            continue
        rows.append(rec)
    wb.close()
    return rows


def _inc_cell(new: dict, c: int):
    if c in new:
        return new[c]
    rv = new.get("_rv") or []
    return rv[c - 1] if c <= len(rv) else None


def _nonempty(v) -> bool:
    return v is not None and str(v).strip() != ""


# --------------------------------------------------------------------------
# 交付物文件匹配:容忍「图纸1」后缀与图号后追加的编号
# --------------------------------------------------------------------------
_TAIL_JUNK = re.compile(r"[\s\-_]*(?:[-_]?\s*图纸\s*\d+|副本|copy)\s*$", re.I)


def _strip_tail(stem: str) -> str:
    return _TAIL_JUNK.sub("", stem).strip(" -_")


def ext_variants(ext: str) -> list:
    base = ext.lower()
    alt = {".step": [".step", ".stp"], ".pdf": [".pdf"],
           ".dxf": [".dxf", ".dwg"]}.get(base, [base])
    return list(alt) + [e.upper() for e in alt]


def near_files(dirpath, base: str, exts, limit: int = 3) -> list:
    """严格匹配失败时,列出目录里名字相近的文件(只作提示)。

    「相近」= 去掉文件名的字母前缀后能和图号对上。
    实测马桶项目源表图号写的是 gl-01 / mtb-01 / pz-a-3,
    而真实文件名是 AGL-01_1.STEP / AMTB-01_1.STEP / APZ-A-3_1.STEP —— 少了首字母 A。
    旧看板(bomkit)靠宽松匹配把它们悄悄算成齐套,挂对了是运气,挂错了没人知道。
    这里只提示、绝不自动当成齐套:挂错文件比报缺失危险得多。
    """
    if not base or not dirpath or not Path(dirpath).is_dir():
        return []
    exts = {e.lower() for e in exts}
    b = re.sub(r"^[a-z]+", "", base.lower())
    if not b:
        return []
    out = []
    for f in sorted(Path(dirpath).iterdir()):
        if not (f.is_file() and not f.name.startswith(("~$", "."))
                and f.suffix.lower() in exts):
            continue
        core = re.sub(r"^[a-z]+", "", f.stem.lower())
        if core and (core == b or core.startswith(b)):
            out.append(f.name)
        if len(out) >= limit:
            break
    return out


def find_deliverable(dirpath, base: str, exts) -> tuple:
    """在 dirpath 里找 base + 扩展名 的文件。

    依次尝试:
      1. 精确匹配(忽略大小写)
      2. 去掉尾部「 - 图纸1」「_图纸2」「副本」后精确匹配
      3. 去掉尾部后前缀匹配图号(如 AMT-MFFL → AMT-MFFL_4_11)
         多候选时取 stem 最短的(最接近图号的那个)
    返回 (实际文件名, 匹配方式);没找到返回 (None, "")。
    """
    if not base or not dirpath or not Path(dirpath).is_dir():
        return None, ""
    exts = {e.lower() for e in exts}
    files = [f for f in Path(dirpath).iterdir()
             if f.is_file() and not f.name.startswith(("~$", "."))
             and f.suffix.lower() in exts]
    if not files:
        return None, ""

    b = base.lower()
    for f in files:                                    # 1) 精确
        if f.stem.lower() == b:
            return f.name, "精确"

    tail = []                                          # 2) 去尾缀后精确
    for f in files:
        s = _strip_tail(f.stem)
        if s.lower() == b and s != f.stem:
            tail.append((len(f.stem), f))
    if tail:
        return sorted(tail)[0][1].name, "去尾缀"

    pre = []                                           # 3) 前缀
    for f in files:
        s = _strip_tail(f.stem)
        if s.lower().startswith(b) and len(s) > len(base):
            pre.append((len(s), f))
    if pre:
        pre.sort()
        how = "前缀" if len(pre) == 1 else f"前缀(多候选:{len(pre)})"
        return pre[0][1].name, how
    return None, ""


def _keymap(rows, cat, pc, nc, incoming):
    """key -> 行列表(按出现顺序)。同 key 的多行按顺序配对,
    避免「图号+名称都为空」的行互相顶掉。"""
    out = {}
    for r in rows:
        if incoming:
            k = row_key(cat, r.get("pn", ""), r.get("nm", ""))
        else:
            k = row_key(cat, txt(r.get(pc)), txt(r.get(nc)))
        out.setdefault(k, []).append(r)
    return out


def merge_rows(cat, incoming, existing, baseline, ncol, ex):
    """三方合并。返回 (合并行, 冲突, 被移除的(行key, 原行))。"""
    conflicts = []
    tool_cols = {ex["noColumn"], ex["imgColumn"]}
    pc, nc = ex["partNumberColumn"], ex["nameColumn"]
    if existing is None:
        return [dict(r) for r in incoming], conflicts, []

    inc = _keymap(incoming, cat, pc, nc, True)
    cur = _keymap(existing, cat, pc, nc, False)
    orphans = []

    merged = []
    for key, news in inc.items():
        bucket = cur.get(key, [])
        for idx, new in enumerate(news):
            c = bucket[idx] if idx < len(bucket) else None
            if c is None:
                merged.append(dict(new))
                continue
            base = baseline.get(key, {}).get("cells", {})
            row, dirty = dict(new), False
            for col in range(1, ncol + 1):
                if col in tool_cols:
                    continue
                cv = c.get(col)
                nv = _inc_cell(new, col)
                bv = base.get(str(col))
                if str(col) not in base:
                    if _same(cv, nv) or not _nonempty(cv):
                        continue
                    row[col] = cv
                    dirty = True
                    conflicts.append({"cat": cat, "key": key, "pn": new["pn"],
                                      "nm": new["nm"], "col": col,
                                      "kind": "首次对比",
                                      "detail": f'列{col}: 你的"{cv}" 保留, 新值"{nv}"'})
                    continue
                if _same(cv, bv):
                    continue                       # 你没动
                if _same(cv, nv) or not _nonempty(cv):
                    continue                       # 你改成一致了 / 你清空了
                row[col] = cv                      # 你改过 -> 保留
                dirty = True
                conflicts.append({"cat": cat, "key": key, "pn": new["pn"],
                                  "nm": new["nm"], "col": col, "kind": "手动修改",
                                  "detail": f'列{col}: 你的"{cv}" 保留, 新值"{nv}"'})
            row["_conflict"] = dirty
            merged.append(row)
        for extra in bucket[len(news):]:          # 多出来的 = 幽灵行/你删掉的
            orphans.append((key, extra))
    return merged, conflicts, orphans


def write_conflict_report(proj, conflicts) -> Path | None:
    if not conflicts:
        proj.conflict_txt.unlink(missing_ok=True)
        return None
    proj.report.mkdir(parents=True, exist_ok=True)
    kept = [c for c in conflicts if c["col"]]
    gone = [c for c in conflicts if not c["col"]]
    L = [f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", "=" * 62, "",
         f"【一】保留的手动修改  {len(kept)} 格   (表格里已标黄)",
         "这些格子是你改过的,工具不会动。", "想让工具接管:把它改回原值再更新即可。", ""]
    for c in kept:
        L.append(f'  {c["cat"]:8s} {c["pn"] or c["nm"] or "(空)"}')
        L.append(f'           {c["kind"]}: {c["detail"]}')
    L += ["", "=" * 62, "", f"【二】已移除的行  {len(gone)} 行",
          "这些行在当前源表里已不存在,已从表中移除。", "要保留请在源表补回后重新更新。", ""]
    for c in gone:
        L.append(f'  {c["cat"]:8s} {c["pn"] or c["nm"] or "(空)"}  — {c["detail"]}')
    paths.atomic_write_text(proj.conflict_txt, "\n".join(L))
    return proj.conflict_txt


# --------------------------------------------------------------------------
# 数据检查
# --------------------------------------------------------------------------
def check_items(cfg, items) -> list:
    c = cfg["categories"]
    mat_x = set(c.get("requireMaterialExempt", [c["purchaseCategory"]]))
    dup_x = set(c.get("duplicateCheckExempt", [c["purchaseCategory"]]))
    issues = []
    unmatched = c.get("unmatchedCategory")
    pn2cat, nm2cat = {}, {}
    for it in items:
        if it["pn"]:
            pn2cat.setdefault(it["pn"].lower(), set()).add(it["cat"])
        if it["nm"]:
            nm2cat.setdefault(it["nm"].lower(), set()).add(it["cat"])
    seen = {}
    for it in items:
        who = f'{it["cat"]} #{it["no"]} {it["pn"] or it["nm"] or "(空)"}'

        def add(level, tag, tip):
            issues.append({"level": level, "tag": tag, "who": who, "tip": tip})

        if not it["pn"]:
            add("warn", "缺图号", "图号为空,文件名会退回用名称")
        # 开放段靠前缀/关键字细分,细分不出来就落到 unmatchedCategory。
        # 以前这里是静默的:件被归到「外购件」,看起来像要买的,
        # 实际是要自己加工的,这类漏项最难发现。
        # 判定原因必须带过来 —— unmatchedCategory 和 purchaseCategory
        # 默认都叫「外购件」,只看分类结果会把 30 多条标准件全误报上来。
        if it.get("why") == "规则没认出来" and it["pn"]:
            add("warn", f'{it.get("sec") or "开放段"}细分不出',
                f'来自「{it.get("sec") or "开放段"}」段,前缀表和关键字都没认出来,'
                f'暂归「{unmatched}」。若这是自制件,请把图号前缀加进 '
                f'categories.machinedPrefixes')
        if not it["nm"]:
            add("err", "缺名称", "名称为空,加工厂无法识别零件")
        if not it["mat"] and it["cat"] not in mat_x:
            add("warn", "缺材料", "未填材料,影响询价与工艺判断")
        if not txt(it["qty"]):
            add("warn", "缺数量", "数量为空,需补后才能下单")
        elif parse_qty(it["qty"]) is None:
            add("warn", "数量非数字", f'数量值 "{it["qty"]}" 解析不出数字')
        if not it["img"]:
            add("info", "无图示", "原表图示列为空,无法核对形状")
        if it["pn"]:
            k = it["pn"].lower()
            cats = pn2cat.get(k, set())
            if len(cats) > 1:
                add("err", "跨分类重复",
                    f'同一图号还出现在 {"/".join(sorted(cats - {it["cat"]}))},会重复采购')
            elif it["cat"] not in dup_x:
                if k in seen:
                    add("warn", "图号重复", f'与 {seen[k]} 用了同一图号')
                else:
                    seen[k] = who
        if it["nm"]:
            cats = nm2cat.get(it["nm"].lower(), set())
            if len(cats) > 1:
                add("err", "同名跨分类",
                    f'同名件还出现在 {"/".join(sorted(cats - {it["cat"]}))}')
        for key, spec in cfg["deliverables"].items():
            if it.get(key) and not it.get(key + "_exists"):
                add("miss", f'缺{spec["label"]}', it[key + "_rel"])
                near = it.get(key + "_near") or []
                if near:
                    # 目录里确实有文件,只是名字和图号对不上。
                    # 这类以前是最容易蒙混过关的:旧看板靠宽松匹配悄悄算成齐套,
                    # 挂对了是运气,挂错了没人知道。必须单独点出来。
                    add("warn", f'{spec["label"]}名字对不上',
                        f'图号「{it["pn"] or it["nm"]}」期望 {it[key + "_rel"]},'
                        f'但目录里只有 {", ".join(near)}。'
                        f'像是图号漏了字母前缀,确认后改文件名或改源表图号')
        # 源表里人写了「出工程图STEP」这类标注,说明意图明确。
        # 两种出问题的方式要分开报:
        #   a) 分类在 cats 里,但交付物格空着 -> 少填了期望文件名
        #   b) 分类压根不在 cats 里 -> 配置漏了这个分类
        #      (make() 已按标注临时放行,但配置不修,下次新增段落还会再漏)
        marks = it.get("marks") or []
        mw = mark_wants(" ".join(marks))
        if marks:
            for key, spec in cfg["deliverables"].items():
                if key not in mw:
                    continue
                if it["cat"] in spec.get("cats", []):
                    if not it.get(key):
                        add("warn", f'标注要求{spec["label"]}但未填文件名',
                            f'源表标注「{" ".join(marks)}」,'
                            f'但 {spec["label"]} 交付物格是空的')
                else:
                    add("warn", f'{spec["label"]}的分类配置漏了「{it["cat"]}」',
                        f'源表标注「{" ".join(marks)}」要求出{spec["label"]},'
                        f'但 deliverables.{key}.cats 里没有「{it["cat"]}」,'
                        f'目前只能靠标注临时放行,建议加进配置')
    return issues
