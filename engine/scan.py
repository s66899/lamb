# -*- coding: utf-8 -*-
"""增量变动检测(P2 手动检测刷新 / P3 自动同步 共用)。

要解决两件事:
  1. **源表变动检测不到**(真 bug):`signature()` 只扫 `cfg["sources"]`,
     而导入 BOM 表的项目全部登记在 `bomSources` 里 —— 于是监听开着
     也不会因为改了 BOM 表而重建。
  2. **说不出到底变了什么**:以前只有一个 True/False。手动检测按钮
     必须告诉本人「新增 3 个 / 更新 1 个 / 移出 2 个」,否则不敢点。

指纹用 (相对路径, 大小, mtime_ns)。mtime 用纳秒而不是秒 —— 秒级
在「一秒内连续改两次」时会漏判,而批量导入恰好就是这种情况。
"""
from __future__ import annotations

import time
from pathlib import Path

from . import paths

# 交付物目录 key -> 项目内目录名。assy 是总装图(P5 加),先留位置。
DIRKEYS = {"step": "step", "2d": "2d", "assy": "assy", "bom": "bom",
           "dash": "dash"}


def _fp(p: Path, root: Path) -> tuple:
    """单个文件的指纹 = (大小, mtime_ns)。取不到返回 None。

    **必须只返回二元组。** 早先这里返回 `(相对路径, 大小, mtime)` 三元组,
    而 snapshot / diff 全按「值 = (大小, mtime)」来比 —— 于是结构对不上,
    表现为什么都没动也报「5 张源表 + 69 个交付物全改」。
    相对路径由调用方作为 dict 的 key 提供,不该混进值里。
    """
    try:
        st = p.stat()
    except OSError:
        return None
    return (st.st_size, st.st_mtime_ns)


def _dir_fp(d: Path, root: Path) -> dict:
    """目录下所有文件的指纹表。跳过临时文件(~$ 开头的)和目录本身。"""
    out = {}
    if not d.is_dir():
        return out
    for f in d.rglob("*"):
        if not f.is_file() or f.name.startswith(("~$", ".")):
            continue
        fp = _fp(f, root)
        if fp:
            out[f.relative_to(root).as_posix()] = fp
    return out


def source_files(cfg, proj) -> list:
    """本项目所有在读的源表路径(sources + bomSources 都要)。

    以前 signature() 只看 sources,bomSources 里的表一个都不算 ——
    而「导入已完工项目」这种最常见的场景,源表全在 bomSources。
    结果就是:改了 BOM 表,监听开着也不会重建。
    """
    out = []
    base = Path(cfg["project"].get("baseDir") or ".")

    def _abs(s):
        p = Path(s)
        return p if p.is_absolute() else (base / p)

    for key in ("sources", "bomSources"):
        for s in cfg.get(key) or []:
            raw = s.get("path") if isinstance(s, dict) else s
            if not raw:
                continue
            p = _abs(raw)
            out.append({"key": key, "path": str(p),
                        "fp": _fp(p, proj.root),   # 二元组或 None
                        "name": p.name,
                        "cat": (s.get("cat") or "") if isinstance(s, dict)
                               else ""})
    return out


def snapshot(cfg, proj) -> dict:
    """拍一张全项目快照,供前后对比。

    结构:
        {"src":  {路径: (大小, mtime_ns)},
         "del":  {目录key: {相对路径: (大小, mtime_ns)}}}
    """
    snap = {"src": {}, "del": {}}
    for s in source_files(cfg, proj):
        snap["src"][s["path"]] = s["fp"] or (0, 0)
    for k in cfg["watch"].get("watchDirs", []):
        dkey = DIRKEYS.get(k)
        if not dkey:
            continue
        snap["del"][dkey] = _dir_fp(proj.d(dkey), proj.root)
    return snap


def _norm_fp(v):
    """把指纹统一成 tuple。

    JSON 存盘再读回来,`(123, 456)` 会变成 `[123, 456]`,于是
    `tuple != list` —— 表现为**什么都没动,却报 5 张源表 + 69 个文件全改**。
    这个坑很隐蔽:快照文件明明在、也确实读了,就是比不出来。
    """
    if isinstance(v, (list, tuple)):
        return tuple(int(x) for x in v)
    return v


def _norm_snap(s: dict) -> dict:
    out = {"src": {}, "del": {}}
    for p, fp in (s.get("src") or {}).items():
        out["src"][p] = _norm_fp(fp)
    for dkey, files in (s.get("del") or {}).items():
        out["del"][dkey] = {rel: _norm_fp(fp)
                            for rel, fp in (files or {}).items()}
    return out


def diff(old: dict, new: dict) -> dict:
    """对比两份快照,给出人类看得懂的变更清单。

    返回:
        {"src_changed": [(名, 说明)],   源表变了(改动/新增/丢失)
         "src_renamed": [(旧名, 新名)], 源表被换名(导入新版本最常见)
         "del_added":   [路径],          交付物新增
         "del_updated": [路径],          交付物内容变了(大小或时间不同)
         "del_removed": [路径],          交付物被移走
         "any": bool}
    """
    old = _norm_snap(old or {})
    new = _norm_snap(new or {})
    res = {"src_changed": [], "src_renamed": [], "del_added": [],
           "del_updated": [], "del_removed": [], "any": False}

    o_src, n_src = old.get("src") or {}, new.get("src") or {}
    o_by_name = {Path(p).name: p for p in o_src}
    n_by_name = {Path(p).name: p for p in n_src}
    for name, np in n_by_name.items():
        op = o_by_name.get(name)
        if op is None:
            # 同目录下有没有一个「看起来是同一张表但改了名」的
            hit = _same_table(o_src, np, n_src)
            if hit:
                res["src_renamed"].append((Path(hit).name, name))
            else:
                res["src_changed"].append((name, "新增"))
        elif o_src[op] != n_src[np]:
            res["src_changed"].append((name, "内容已改"))
    for name, op in o_by_name.items():
        if name not in n_by_name:
            res["src_changed"].append((name, "已丢失"))

    for dkey, n_files in (new.get("del") or {}).items():
        o_files = (old.get("del") or {}).get(dkey) or {}
        for rel, fp in n_files.items():
            if rel not in o_files:
                res["del_added"].append(rel)
            elif o_files[rel] != fp:
                res["del_updated"].append(rel)
        for rel in o_files:
            if rel not in n_files:
                res["del_removed"].append(rel)

    res["any"] = bool(res["src_changed"] or res["src_renamed"]
                      or res["del_added"] or res["del_updated"]
                      or res["del_removed"])
    return res


def _same_table(o_src: dict, n_path: str, n_src: dict, tol: float = 0.9) -> str:
    """在旧快照里找一张和新表「同源」的表 —— 用于识别「改名了」。

    同源判定:名字去掉分类前缀后相同,或者大小差得不多。
    目的是把「导入时表被改名 / 分类挪了」显示成改名,而不是
    「新增一张 + 丢失一张」两条让人以为出事了。
    """
    import re

    def norm(s):
        return re.sub(r"[^0-9a-z一-鿿]", "", Path(s).stem.lower())

    nn = norm(n_path)
    best, score = None, 0.0
    for op in o_src:
        if op in n_src:
            continue
        on = norm(op)
        if not on or not nn:
            continue
        if on == nn:
            return op
        common = len(set(on) & set(nn))
        r = common / max(len(set(on)), len(set(nn)))
        if r > score:
            best, score = op, r
    return best if score >= tol else None


def summarize(d: dict) -> str:
    """把变更清单压成一行,给界面/日志用。"""
    if not d.get("any"):
        return "没有变化"
    bits = []
    if d["src_changed"]:
        bits.append(f"源表 {len(d['src_changed'])} 张改动")
    if d["src_renamed"]:
        bits.append(f"源表改名 {len(d['src_renamed'])} 张")
    if d["del_added"]:
        bits.append(f"新增 {len(d['del_added'])}")
    if d["del_updated"]:
        bits.append(f"更新 {len(d['del_updated'])}")
    if d["del_removed"]:
        bits.append(f"移出 {len(d['del_removed'])}")
    return " / ".join(bits)


def needs_full_build(d: dict) -> bool:
    """这次变动要不要全量重建。

    - 源表变了 -> 必须全量(零件列表本身变了)
    - 只有交付物增删改 -> 增量(只刷看板,亚秒级)
    """
    return bool(d.get("src_changed") or d.get("src_renamed"))


class Detector:
    """记住上一次的快照,供反复调用。"""

    def __init__(self, cfg, proj):
        self.cfg = cfg
        self.proj = proj
        self.snap = snapshot(cfg, proj)

    def check(self) -> dict:
        """拍新快照并对比。**无论有没有变化都更新基准**,
        否则连续两次调用会一直重复报同一批变更。"""
        new = snapshot(self.cfg, self.proj)
        d = diff(self.snap, new)
        self.snap = new
        return d

    def reset(self):
        self.snap = snapshot(self.cfg, self.proj)
