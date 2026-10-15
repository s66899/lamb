# -*- coding: utf-8 -*-
"""🐑 助手工程师 —— GUI 与 CLI 共用的动作实现。

把这些抽出来,是为了让图形界面和命令行行为完全一致,
也方便打包成 exe 后从界面里调用后台进程。
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import threading
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from engine import config as C          # noqa: E402
from engine import core, dashboard, excel, paths  # noqa: E402

APP_DIR = paths.APP_DIR          # 冻结后 = exe 所在目录,不是 _internal

# 同进程重入计数:{(锁文件路径, 线程 id) -> 持有层数}
# 必须按线程隔离:用全局计数的话,B 线程进 __enter__ 时看到 A 持有,
# 会当成「同线程重入」直接放行,互斥就没了(实测两个线程同时拿到锁)。
_LOCK_DEPTH = {}
_LOCK_MUTEX = threading.Lock()


# --------------------------------------------------------------------------
# 构建
# --------------------------------------------------------------------------
class build_lock:
    """同一项目的构建互斥锁(跨进程、同进程可重入)。

    监听进程、手动点「构建」、命令行 build 完全可能同时跑。
    之前实测三个并发 build 时:项目清单.json 读成半截(报「注册表损坏」)、
    图片缓存 png 读成半截(报 cannot identify image file)、看板写坏。
    原子写解决了「读到半截」,这个锁解决「两个进程同时改同一套产出」。
    """

    def __init__(self, proj, timeout=1800, log=print):
        self.path = Path(proj.root) / "_基线" / ".build.lock"
        self.timeout = timeout
        self.log = log
        self.fh = None
        self.acquired = False
        self.reentrant = False

    def __enter__(self):
        import time
        # 同一进程重复加锁要直接放行。
        # msvcrt 的文件锁按 fd 走,同进程第二次锁同一区域会失败,
        # 于是 __enter__ 一直重试到 timeout —— 表现就是「脚本卡住不动」。
        # 只要有地方在锁内又调 run_build(同步脚本就是这种),
        # 不做可重入就必然自锁。
        key = (str(self.path), threading.get_ident())
        with _LOCK_MUTEX:
            depth = _LOCK_DEPTH.get(key, 0)
            if depth > 0:
                _LOCK_DEPTH[key] = depth + 1
                self.acquired = True
                self.reentrant = True
                return self
        self.path.parent.mkdir(parents=True, exist_ok=True)
        deadline = time.time() + self.timeout
        announced = False
        while True:
            try:
                self.fh = open(str(self.path), "a+b")
                if os.name == "nt":
                    import msvcrt
                    self.fh.seek(0)
                    try:
                        msvcrt.locking(self.fh.fileno(), msvcrt.LK_NBLCK, 1)
                    except OSError:
                        self.fh.close()
                        self.fh = None
                        raise BlockingIOError
                self.acquired = True
                with _LOCK_MUTEX:
                    _LOCK_DEPTH[key] = 1
                return self
            except (BlockingIOError, OSError):
                if self.fh:
                    try:
                        self.fh.close()
                    except OSError:
                        pass
                    self.fh = None
                if time.time() > deadline:
                    self.log("⚠ 等不到构建锁(可能有另一个 build 卡住了),"
                             "继续执行可能产生不一致的产出。")
                    return self                    # 放弃加锁,不要永久卡死
                if not announced:
                    self.log("  另一个构建正在进行,排队等待…")
                    announced = True
                time.sleep(0.5)

    def __exit__(self, *exc):
        key = (str(self.path), threading.get_ident())
        with _LOCK_MUTEX:
            depth = _LOCK_DEPTH.get(key, 0)
            if depth <= 1:
                _LOCK_DEPTH.pop(key, None)
            else:
                _LOCK_DEPTH[key] = depth - 1
        if self.reentrant:
            return False           # 内层不负责解锁,交给最外层
        if self.fh is not None:
            try:
                if os.name == "nt":
                    import msvcrt
                    self.fh.seek(0)
                    msvcrt.locking(self.fh.fileno(), msvcrt.LK_UNLCK, 1)
            except OSError:
                pass
            try:
                self.fh.close()
            except OSError:
                pass
            self.fh = None
        return False


def run_build(proj: paths.Project, log=print, full=True, fresh=False,
              live=False):
    with build_lock(proj, log=log):
        return _run_build_locked(proj, log=log, full=full, fresh=fresh,
                                 live=live)


def bom_tables(cfg, proj, log=None):
    """当前可用的 BOM 表 [(路径, 分类, 工作表)]。

    优先级:**按分类**,项目自己的 `2_BOM表` > 导入时登记的外部 BOM 表。

    ★ 早先的写法是「只要有任何一个 bomSources 就整个用外部的」——
      和这句 docstring 写的正好相反。真实项目上直接踩了:
      外部那份 `BOM表\\` 里少了一份 `外购件物料表.xlsx`,于是
      `bom_tables()` 返回 4 张表,**外购件整类从看板上消失**
      —— 89 件变 41 件,而且一页构建日志都没提这件事。
      `excel.build` 也跟着少生成一张产出表,越重建越少。
      按分类取才对:你在 `2_BOM表` 里核对过的那几张优先用它,
      从没生成过的那一类才回退去外部找。
    ★ 某一类**两边都没有**时必须喊出来。整类零件静默消失,
      本人只会以为「这个项目外购件本来就这么多」。
    """
    log = log or (lambda _m: None)
    ext = {}
    for s in cfg.get("bomSources") or []:
        f = Path(s["path"])
        if f.is_file():
            ext.setdefault(s.get("cat", ""), (f, s.get("sheet")))
    out, missing = [], []
    for c in cfg["categories"]["order"]:
        own = proj.bom_file(c)
        if own.is_file():
            out.append((own, c, None))
        elif c in ext:
            f, sh = ext[c]
            out.append((f, c, sh))
        else:
            missing.append(c)
    if missing:
        log("  [提醒] 分类 " + "、".join(missing)
            + " 在 2_BOM表 和导入的 BOM 表里都没有 ——"
              " 这一类不会出现在看板上")
    return out


def read_items(cfg, proj, log=None, full=True):
    """读出这个项目的零件列表。返回 (items, 来源说明)。

    **只有这一个入口。** 构建、工作台零件总览、状态栏、导出都必须走它。

    以前 GUI 那边自己写了一份 `consolidate(extract(cfg))`,只认
    `cfg["sources"]`;构建这边改成了「有 BOM 表就以 BOM 为主」。
    两份逻辑分叉的直接后果:导入一个只有 BOM 表的项目后,
    构建能出看板,但工作台零件总览是空的、标题写着「0 个源表」——
    用户看到的正是你截图那样。

    返回值第二项是给界面显示的来源说明:
      "BOM 表 3D打印件/塑胶件/..." 或 "零件表 4 张" 或 "没有可读的表"
    """
    log = log or (lambda m: None)
    boms = bom_tables(cfg, proj, log=log)
    if boms:
        cats = "/".join(sorted({c for _, c, _ in boms if c}))
        log(f"==> 读取 BOM 表(优先){'  ' + cats if cats else ''}")
        items = core.read_items_from_tables(cfg, proj, tables=boms,
                                            log=lambda m: log("  " + m))
        return items, f"BOM 表 {cats}" if cats else "BOM 表"
    if not cfg["sources"]:
        return [], "没有可读的表"
    log("==> 读取零件表")
    recs = core.extract(cfg, log=lambda m: log("  " + m) if full
                        else (lambda _x: None))
    return core.consolidate(cfg, recs), f"零件表 {len(cfg['sources'])} 张"


def table_count(cfg) -> int:
    """这个项目一共有多少张可读的表(零件表 + BOM 表)。

    标题栏以前直接用 `len(cfg["sources"])`,导入 BOM 表的项目会显示
    「0 个源表」—— 明明有 5 张表,只是它们归在 bomSources 里。
    """
    return len(cfg.get("sources") or []) + len(cfg.get("bomSources") or [])


def _run_build_locked(proj: paths.Project, log=print, full=True, fresh=False,
                      live=False):
    cfg = C.with_defaults(C.load(proj))
    cfg["_proj_root"] = str(proj.root)
    items, _src = read_items(cfg, proj, log=lambda m: log("  " + m)
                             if full else (lambda _x: None), full=full)
    if not items:
        if table_count(cfg) == 0:
            log("  还没有表。用「添加文件夹」导入,或把 xlsx 放进 1_源数据 后点「扫描源数据」。")
        else:
            log("  没有读到零件(表是空的,或没有标红的新改动件)")
        return
    conflicts = []
    if full:
        log("==> 生成 BOM 表")
        _, conflicts = excel.build(cfg, proj, items, fresh=fresh, log=log)
    core.write_conflict_report(proj, conflicts)
    log("==> 生成看板")
    issues = core.check_items(cfg, items)
    out = dashboard.render(cfg, proj, items, issues, conflicts, live=live,
                           log=(log if full else None))

    parts = []
    for k, spec in cfg["deliverables"].items():
        if not spec.get("cats"):
            continue
        need = [i for i in items if i.get(k)]
        ok = sum(1 for i in need if i.get(k + "_exists"))
        if need:
            parts.append(f'{spec["label"]} {ok}/{len(need)}')
    log(f'    零件 {len(items)} | ' + " | ".join(parts) +
        f' | 数据待补 {len([i for i in issues if i["level"] != "miss"])}')
    if conflicts:
        kept = len([c for c in conflicts if c["col"]])
        gone = len([c for c in conflicts if not c["col"]])
        log(f'    手动修改保护: {kept} 格保留 / {gone} 行移除')
        log(f'    报告: {proj.conflict_txt}')
    paths.registry_add(proj)
    log(f"    看板: {out}")


# --------------------------------------------------------------------------
# 导入
# --------------------------------------------------------------------------
def _sections_to_map(sections):
    """段名 → 分类。只有明确的段才进 directSections;
    开放段必须留给 openSections,否则段内细分规则不会生效。"""
    out = {}
    for s in sections or []:
        for key, cat in C.DEFAULT["categories"]["directSections"].items():
            if key in s:
                out[s] = cat
                break
    return out


def _is_bom_table(cfg, p: dict) -> str:
    """这张表是不是「按分类拆好的 BOM 表」?是的话返回分类名,否则空串。

    判据:文件名或工作表名里能认出分类名,而且表里没有分类段。
    这类表(如「塑胶件物料表_带图.xlsx」/ 工作表名「塑胶件」)是人工核对过
    的最终成果 —— 图是嵌入图片、链接也齐,是**权威来源**,优先级高于零件表。
    以前它们和零件表被一起塞进 sources 走 extract(),结果:
      - 图片全丢(extract 只认零件表的 DISPIMG 公式)
      - 链接全丢(extract 根本不读超链接)
      - 分类也丢(表里没有分类段,分类只写在文件名/工作表名上)
    """
    if p.get("sectionList"):
        return ""
    return core.cat_hint(cfg, Path(p["path"]).stem, p.get("sheet") or "")


def _md5_of(p: Path) -> str:
    import hashlib
    h = hashlib.md5()
    with p.open("rb") as fh:
        for blk in iter(lambda: fh.read(1 << 20), b""):
            h.update(blk)
    return h.hexdigest()


def _archive_deliverables(proj, src, backup_dir: Path, log):
    """把源目录里的 3D图 / 2D图 **完整复制**进项目,旧版先归档。

    这是 P1 的正题:以前 `probe.scan_dir` 的 skip_dirs 里含 `3D图`、`2D图`,
    导入时这两个目录**整个被跳过**,于是源目录里的 STEP / PDF 一个都没进项目
    —— 表现就是「导入完看板全是缺件」。

    这里按扩展名归位:
        .step/.stp/.igs/.sldprt -> 3_3D图
        .pdf/.dwg/.dxf          -> 4_2D图
    分类子目录保留(源目录 3D图/塑胶件/xx.STEP 就是这么放的),
    这样 apply_deliverables 才能按分类找到文件。

    规则:**最新导入的为主**,被顶掉的旧文件搬进 导入前备份_<时间>/。
    """
    SRC = Path(src)
    EXT3 = {".step", ".stp", ".igs", ".iges", ".sldprt", ".x_t", ".sat"}
    EXT2 = {".pdf", ".dwg", ".dxf"}
    SHOTS = {".png", ".jpg", ".jpeg", ".webp"}
    n_add = n_arch = n_same = 0

    for sub, exts, key in (("3D图", EXT3, "step"),
                           ("2D图", EXT2 | SHOTS, "2d")):
        s_root = SRC / sub
        if not s_root.is_dir():
            continue
        for sf in sorted(s_root.rglob("*")):
            if not sf.is_file() or sf.name.startswith(("~$", ".")):
                continue
            if sf.suffix.lower() not in exts:
                continue
            rel = sf.relative_to(s_root)
            # 源目录 3D图/塑胶件/x.STEP -> 项目 3_3D图/塑胶件/x.STEP
            df = proj.d(key) / rel
            if df.is_file():
                # 内容没变就跳过。只比大小不够:同名不同内容的 STEP
                # 大小可能一样,不比 MD5 会把改动当成没变而丢掉。
                try:
                    same = (df.stat().st_size == sf.stat().st_size
                            and _md5_of(df) == _md5_of(sf))
                except OSError:
                    same = False
                if same:
                    n_same += 1
                    continue
                bak = backup_dir / paths.LAYOUT[key] / rel
                bak.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(df), str(bak))
                n_arch += 1
            df.parent.mkdir(parents=True, exist_ok=True)
            tmp = df.with_name(f"{df.name}.复制中{os.getpid()}")
            try:
                shutil.copy2(sf, tmp)
                os.replace(str(tmp), str(df))
            except BaseException:
                try:
                    tmp.unlink(missing_ok=True)
                except OSError:
                    pass
                raise
            n_add += 1
    if n_add or n_arch:
        log(f"  交付物:复制 {n_add} / 归档旧版 {n_arch} / 未变 {n_same}"
            f"  -> {paths.LAYOUT['step']} + {paths.LAYOUT['2d']}")
    else:
        log(f"  交付物:源目录没有 3D图 / 2D图(或全部未变,{n_same} 个)")


def do_import(proj: paths.Project, name: str, src: Path, found: list,
              copy: bool = True, log=print):
    """把探测到的表写进项目配置。found 来自 probe.discover。"""
    log(f"准备导入 {len(found)} 个表 → {proj.root}")
    # 分类判据要用的 categories 是默认的(还没写进项目配置),
    # 所以先用默认分类去认 BOM 表
    found = list(found)
    for p in found:
        p["bomCat"] = _is_bom_table(C.DEFAULT, p)
    n_bom = sum(1 for p in found if p.get("bomCat"))
    if n_bom:
        log(f"  其中 {n_bom} 张是按分类拆好的 BOM 表 —— "
            f"以它们为准(图和链接都在里面)")
    ref = next((p for p in found if not p.get("bomCat")), found[0])
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
        ex["redColumn"] = ref["redColumn"]
    if ref.get("sectionColumn"):
        ex["sectionColumn"] = ref["sectionColumn"]
    if not ref.get("redRows"):
        ex["redColumn"] = max(ex["noColumn"], ex["partNumberColumn"])
        ex["redColors"] = []

    if proj.exists():
        cfg = C.with_defaults(C.load(proj))
        if cfg["sources"] and not (proj.source / Path(cfg["sources"][0]["path"]).name).is_file():
            pass
    else:
        cfg = json.loads(json.dumps(C.DEFAULT))
        cfg["project"]["name"] = name
        cfg["project"]["description"] = f"{name} · 改动零件外发加工"
    cfg["extract"] = ex
    cfg["categories"]["directSections"] = _sections_to_map(ref.get("sectionList", []))
    cfg["categories"]["openSections"] = [
        s for s in dict.fromkeys(ref.get("sectionList", []))
        if s not in cfg["categories"]["directSections"]]

    base = proj.source
    sources, bom_sources = [], []

    # 导入前的旧版本归档目录:导入时间戳。重复导入同一项目时,
    # 上一次的表会搬进这里,不会被直接覆盖掉。
    stamp = paths.now_stamp()
    backup_dir = proj.archive / f"导入前备份_{stamp}"

    def _same_file(a: Path, b: Path) -> bool:
        """两个文件内容是否一致(先比大小,再比 MD5)。"""
        try:
            if a.stat().st_size != b.stat().st_size:
                return False
            import hashlib

            def _md5(p):
                h = hashlib.md5()
                with p.open("rb") as fh:
                    for blk in iter(lambda: fh.read(1 << 20), b""):
                        h.update(blk)
                return h.hexdigest()
            return _md5(a) == _md5(b)
        except OSError:
            return False

    def _archive_old(dst: Path, incoming: Path | None = None) -> bool:
        """目标已存在且**和进来的不一样** -> 搬进 导入前备份_<时间>/,再让新的覆盖。

        直接 os.replace 覆盖就是「文件丢失」:源表改错了、或者上次导入的是
        旧版本,一覆盖就没了。归档之后最新数据生效,旧数据也还在,
        万一要回滚就在 7_归档 里找。

        关键:内容没变就**不要**归档。
        否则重复导入同一个未改动的源目录时,会把一模一样的文件来回搬,
        归档目录越滚越大,而且真正的那份「旧版本」被顶掉了 ——
        实测正是这样:连跑 3 遍之后归档里全是新版,旧版反而没了。
        """
        if not dst.is_file():
            return False
        if incoming is not None and _same_file(dst, incoming):
            return False
        bak = backup_dir / dst.relative_to(proj.root)
        bak.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(dst), str(bak))
        log(f"    旧版已归档 -> {bak.relative_to(proj.root)}")
        return True

    def _copy(f: Path, dst_dir: Path, label: str) -> Path:
        """复制一张表。**最新导入的为主**,旧的先归档再让位。

        临时名 + 原子替换,避免留下半张表。
        """
        if not copy:
            log(f"  引用 {f.name}")
            return f
        dst_dir.mkdir(parents=True, exist_ok=True)
        dst = dst_dir / f.name
        if f.resolve() == dst.resolve():
            return dst
        # 内容一模一样就什么都不做 —— 不归档、不重写。
        # 重复导入没改动的目录时,这能避免归档里堆满同一个文件的多份副本。
        if dst.is_file() and _same_file(dst, f):
            log(f"  未变(跳过){label} {f.name}")
            return dst
        # 先归档再复制:顺序反了的话,归档会把刚复制进来的新文件搬走
        _archive_old(dst, incoming=f)
        tmp = dst.with_name(f"{dst.stem}.复制中{os.getpid()}{dst.suffix}")
        try:
            shutil.copy2(f, tmp)
            os.replace(str(tmp), str(dst))
        except BaseException:
            try:
                tmp.unlink(missing_ok=True)
            except OSError:
                pass
            raise
        log(f"  已复制{label} {f.name}")
        return dst

    for p in found:
        f = Path(p["path"])
        cat = p.get("bomCat") or ""
        if cat:
            # BOM 表不能平铺丢进 1_源数据 —— 它们按分类各一张,
            # 平铺后名字会互相盖(同名时 os.replace 直接覆盖,内容就没了)。
            # 必须按分类落到 2_BOM表/<分类>物料表.xlsx。
            stored = _copy(f, proj.bom_dir_for(cat), f"[{cat}]")
            bom_sources.append({"cat": cat, "path": str(stored),
                                "sheet": p["sheet"]})
        else:
            stored = _copy(f, base, "")
            sources.append({"tag": p.get("tag", ""), "path": str(stored),
                            "sheet": p["sheet"]})

    _archive_deliverables(proj, src, backup_dir, log)
    # 备份位置要说清楚 —— 事后「东西去哪了」只能靠这行输出。
    if backup_dir.exists():
        n = len([f for f in backup_dir.rglob("*") if f.is_file()])
        log(f"  备份位置: {backup_dir}")
        log(f"  本次归档 {n} 个文件。真删错了从这里找回。")
    cfg["sources"] = sources
    cfg["bomSources"] = bom_sources
    cfg["project"]["baseDir"] = str(base)
    proj.save(cfg)
    proj.ensure_dirs()
    paths.registry_add(proj, name)
    log("导入完成。")
    return cfg


# --------------------------------------------------------------------------
# 手动检测刷新(P2)
# --------------------------------------------------------------------------
def run_scan(proj: paths.Project, apply_change: bool = True, log=print,
             baseline: Path | None = None):
    """扫一遍文件夹,列出变更;`apply_change=True` 时顺便重建。

    这是「手动检测刷新按钮」的后端。定位:**替代重新导入项目** ——
    你把新文件丢进源目录、或改了源表,点一下就能识别,不用重新走一遍导入。

    `baseline` 是上次快照的文件。存盘之后,下次点按钮只报「上次之后
    新增了什么」;不传则和当前磁盘状态比,报不出差异(首次点按这个走)。

    返回 (变更字典, 是否重建过)。变更字典给界面显示明细。
    """
    from engine import scan

    cfg = C.with_defaults(C.load(proj))
    cfg["_proj_root"] = str(proj.root)

    # 读和写必须用**同一个**路径。早先写成「读用 baseline 参数 / 写用
    # proj.baseline」,结果 baseline=None 时读到的是 None、写的是
    # _基线\扫描基线.json —— 于是每次都报「首次检测」,增量检测整个失效,
    # 而快照文件明明就在那儿。
    bl = Path(baseline) if baseline else (proj.baseline / "扫描基线.json")

    cur = scan.snapshot(cfg, proj)
    if bl.is_file():
        try:
            old = json.loads(bl.read_text(encoding="utf-8"))
        except Exception as e:
            log(f"  上次快照读不了({e}),按首次检测处理")
            old = None
    else:
        old = None

    d = scan.diff(old or {"src": {}, "del": {}}, cur) if old else {
        "src_changed": [], "src_renamed": [], "del_added": [],
        "del_updated": [], "del_removed": [],
        "any": bool(cur["src"]) or any(cur["del"].values())}

    n_src = len(cur["src"])
    n_del = sum(len(v) for v in cur["del"].values())
    log(f"扫描:{n_src} 张源表 / {n_del} 个交付物")

    if old is None:
        log("首次检测(没有上次快照):已记录当前状态,下次点按钮会报差异")
    else:
        log(f"变更:{scan.summarize(d)}")
        for name, why in d["src_changed"][:8]:
            log(f"    源表 {name} — {why}")
        for a, b in d["src_renamed"][:8]:
            log(f"    源表 {a} -> {b}(改名)")
        for r in d["del_added"][:8]:
            log(f"    新增 {r}")
        if len(d["del_added"]) > 8:
            log(f"    … 还有 {len(d['del_added']) - 8} 个新增")
        for r in d["del_updated"][:5]:
            log(f"    更新 {r}")
        for r in d["del_removed"][:8]:
            log(f"    移出 {r}")
        if len(d["del_removed"]) > 8:
            log(f"    … 还有 {len(d['del_removed']) - 8} 个移出")

    # 快照落盘(原子写:两个按钮可能同时点)。bl 已在上面定好,别再算一遍。
    bl.parent.mkdir(parents=True, exist_ok=True)
    paths.atomic_write_text(bl, json.dumps(cur, ensure_ascii=False))

    rebuilt = False
    if apply_change and d.get("any"):
        full = scan.needs_full_build(d)
        log(f"\n{'全量' if full else '增量'}重建…")
        run_build(proj, log=log, full=full)
        rebuilt = True
    elif apply_change:
        log("没有变化,跳过重建。")
    return d, rebuilt


# --------------------------------------------------------------------------
# 导出核对版 HTML:从「你核对完的表」读取,而不是从源表
# --------------------------------------------------------------------------
def run_export_html(proj: paths.Project, dest: Path | None = None,
                    log=print):
    """人工核对完成后,把当前表格内容导出成单文件 HTML。

    与 build 生成的看板不同,这个是从 2_BOM表 里的最终内容读出来的,
    你手动改过的材料/数量/备注/图号都会如实反映。
    """
    cfg = C.with_defaults(C.load(proj))
    cfg["_proj_root"] = str(proj.root)
    if not any(proj.bom.glob("*.xlsx")):
        log("2_BOM表 里还没有表,请先构建。")
        return None
    log("==> 读取 2_BOM表 当前内容(含你的手动修改)")
    items = core.read_items_from_tables(cfg, proj)
    if not items:
        log("没读到数据")
        return None
    counts = {}
    for it in items:
        counts[it["cat"]] = counts.get(it["cat"], 0) + 1
    log("    " + " / ".join(f"{k} {v}" for k, v in counts.items()))
    imgs = sum(1 for i in items if i.get("img"))
    log(f"    零件 {len(items)}  带图 {imgs}")

    issues = core.check_items(cfg, items)
    out = dashboard.render(cfg, proj, items, issues, [], live=False,
                           suffix="核对版", stamp=True)
    if dest:
        dest = Path(dest)
        if dest.is_dir():
            dest = dest / out.name
        dest = dest.resolve()
        if dest != out.resolve():
            # 同名时加序号,绝不覆盖已有导出
            if dest.exists():
                stem, suf = dest.stem, dest.suffix
                i = 2
                while (dest.parent / f"{stem}({i}){suf}").exists():
                    i += 1
                dest = dest.parent / f"{stem}({i}){suf}"
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(out, dest)
        out = dest
    log(f"    已导出: {out}  ({out.stat().st_size/1024/1024:.2f} MB)")
    log("    提示: 打开双击即可,发给别人也只需要这一个文件。")
    return out


# --------------------------------------------------------------------------
# 打包 / 自检
# --------------------------------------------------------------------------
SKIP_TOP = {"_基线", "_日志", "_报告", "7_归档"}

SHOT_EXT = (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif")


def scan_assembly(proj: paths.Project, log=print) -> dict:
    """盘 5_总装图:装配体 STEP 和同名截图是否配对。

    总装图**不参与齐套统计**(本人要求),但「一个 STEP 孤零零躺在那里、
    没有截图」这种事还是得说出来 —— 不然对方打开发现没法预览,根本不知道
    是漏了还是根本没有。所以这里是**只提醒、不计分**。

    配对规则是**同名**:xxx.STEP 配 xxx.png / xxx.jpg(大小写不敏感)。
    截图允许缺目录层级 —— 5_总装图 下不再分子目录。
    """
    d = proj.d("assy")
    res = {"step": [], "shot": [], "no_shot": [], "orphan_shot": [], "dir": d}
    if not d.is_dir():
        return res
    shots = {}
    for f in d.rglob("*"):
        if not f.is_file() or f.name.startswith(("~$", ".")):
            continue
        if f.suffix.lower() in SHOT_EXT:
            shots.setdefault(f.stem.lower(), []).append(f)
    steps = []
    for f in d.rglob("*"):
        if not f.is_file() or f.name.startswith(("~$", ".")):
            continue
        if f.suffix.lower() in (".step", ".stp"):
            steps.append(f)
    res["step"] = sorted(steps)
    res["shot"] = sorted(f for v in shots.values() for f in v)
    res["no_shot"] = sorted(f for f in steps if f.stem.lower() not in shots)
    step_stems = {f.stem.lower() for f in steps}
    res["orphan_shot"] = sorted(
        f for k, v in shots.items() if k not in step_stems for f in v)
    if res["no_shot"]:
        log(f"    [提醒] {len(res['no_shot'])} 个装配体没有同名截图(不影响齐套统计):")
        for f in res["no_shot"][:8]:
            log(f"       {f.name}  -> 需要 {f.stem}.png")
        if len(res["no_shot"]) > 8:
            log(f"       ... 还有 {len(res['no_shot']) - 8}")
    if res["orphan_shot"]:
        log(f"    [提醒] {len(res['orphan_shot'])} 个截图没有对应的 STEP:")
        for f in res["orphan_shot"][:8]:
            log(f"       {f.name}")
        if len(res["orphan_shot"]) > 8:
            log(f"       ... 还有 {len(res['orphan_shot']) - 8}")
    return res


def run_export(proj: paths.Project, dest: Path, log=print, pause=True):
    """导出交付包。

    `pause=True`(默认)时**导完保持暂停**,由本人点「开始检测」恢复 ——
    这是本人明确要求的:导出是「定档」动作,定档期间自动检测再插手,
    等于一边打包一边改,出来的包和看板对不上。
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    was_paused = proj.is_paused()
    if pause and not was_paused:
        proj.set_paused(True, reason="导出定档", log=log)
    elif pause and was_paused:
        log("    自动检测本来就处于暂停状态,导出结束后仍保持暂停。")
    try:
        return _zip_deliverables(proj, dest, log)
    finally:
        if pause and not was_paused:
            log("    导出完成。自动检测**仍是暂停**的 —— "
                "确认包没问题后点「开始检测」恢复。")
            log("      命令行恢复:sheep.py resume <项目>")


def _zip_deliverables(proj: paths.Project, dest: Path, log=print):
    """真正打包。

    **固定四个子目录,不加项目名前缀**(本人要求):

        2D图纸/   <- 4_2D图
        3D图纸/   <- 3_3D图
        BOM表/    <- 2_BOM表
        总装图/   <- 5_总装图

    旧版是 `z.write(f, Path(proj.name) / rel)` —— 把整个项目目录树原样塞进去,
    外面还套一层同名文件夹。对方解压后要点两次才能看到图,而且里面混着
    1_源数据、图片缓存、基线、归档这些东西,不知道哪些是要交的。

    四个目录**即使为空也建出来** —— 固定结构是为了让对方一眼看全,
    「少一个目录」会被当成「漏交了」。
    """
    counts = {}
    total = 0
    dest.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
        for out_name, dirkey in paths.EXPORT_LAYOUT:
            src = proj.d(dirkey)
            # 空目录也建(z.writestr 写目录项),否则 zip 里没有这个条目,
            # 对方解压看到的是三个文件夹而不是四个 —— 「少一个」会被当成漏交。
            zi = zipfile.ZipInfo(out_name + "/")
            zi.external_attr = (0o40775 << 16) | 0x10      # 目录标记
            z.writestr(zi, b"")
            n = 0
            if src.is_dir():
                for f in sorted(src.rglob("*")):
                    if not f.is_file() or f.name.startswith(("~$", ".")):
                        continue
                    z.write(f, f"{out_name}/{f.relative_to(src).as_posix()}")
                    n += 1
            counts[out_name] = n
            total += n
        # 总装图配对检查 —— 只提醒,不计分
        asy = scan_assembly(proj, log=lambda m: None)
        if asy["step"]:
            log(f"    总装图: {len(asy['step'])} 个装配体 / {len(asy['shot'])} 张截图")
            if asy["no_shot"]:
                log(f"    [提醒] {len(asy['no_shot'])} 个装配体没有同名截图"
                    f"(总装图不计入齐套统计,不影响交付):")
                for f in asy["no_shot"][:6]:
                    log(f"       {f.name}  -> 需要 {f.stem}.png")
    log(f"已打包 {total} 个文件: {dest}  ({dest.stat().st_size/1024/1024:.2f} MB)")
    for k, _ in paths.EXPORT_LAYOUT:
        log(f"    {k:<8} {counts.get(k, 0):>4} 个")
    log("看板请单独发送: " + str(proj.html))
    return dest


def run_doctor(log=print):
    log("🐑 助手工程师 环境自检")
    log("=" * 52)
    ok = True
    log(f"  Python        {sys.version.split()[0]}")
    try:
        import openpyxl
        log(f"  openpyxl      {openpyxl.__version__}  OK")
    except Exception as e:
        log(f"  openpyxl      缺失  ({e})")
        ok = False
    tpl = paths.DASH_TPL
    found = tpl.is_file()
    if not found:
        for alt in (paths.RES_DIR / "看板.html", paths.APP_DIR / "看板.html"):
            if alt.is_file():
                found = True
                break
    log(f"  看板模板      {'OK  ' + tpl.name if found else '缺失'}")
    if not found:
        log(f"    查找位置: {paths.TPL_DIR}")
        log(f"    资源目录: {paths.RES_DIR}")
        log(f"    程序目录: {paths.APP_DIR}")
    ok &= found

    # ★ STEP 转换能力(OCP)。以前 doctor **完全不看**这一项 ——
    #   而打包脚本曾经一个 OCC 的 dll 都没带进去,打包照样返回 0、
    #   exe 照样能开、doctor 照样说「可以正常使用」,
    #   直到本人点开 STEP 才炸在 `import OCP`。
    #   自检里加这一行,这类问题当场就能看见,不用等点开文件。
    try:
        from engine import mesh3d
        has, why = mesh3d.ocp_available()
        if has:
            log(f"  STEP 转换     OK(OCP)  {why}")
        else:
            log(f"  STEP 转换     缺失  {why}")
            log("    程序内 3D 预览 / 看板的「3D 预览」都会没有网格")
            log("    源码:pip install cadquery-ocp 后重跑 打包exe.py")
            ok = False
    except Exception as e:
        log(f"  STEP 转换     未知  ({type(e).__name__}: {e})")

    # PDF 渲染同理:少了 pypdfium2,点工程图时只抛 ImportError,
    # 报错完全看不出是「程序没带这个库」。
    try:
        import pypdfium2                                     # noqa: F401
        log("  PDF 渲染      OK(pypdfium2)")
    except Exception as e:
        log(f"  PDF 渲染      缺失  ({e})")
        log("    程序里看不了工程图,可点「用本地软件打开」")
    # 核对栏(P14)。数据层是纯 openpyxl,坏了的话表现是「核对栏全显示待核对」,
    # 那和「还没核对过」长得一模一样 —— 必须能一眼分清是读不到还是真没核。
    try:
        from engine import checklist as _cl
        log("  核对栏        OK(" + _cl.FILE_NAME + ",纯 openpyxl)")
    except Exception as e:
        log("  核对栏        缺失  (" + type(e).__name__ + ": " + str(e) + ")")
    log(f"  程序目录      {APP_DIR}")
    frozen = getattr(sys, "frozen", False)
    log(f"  运行方式      {'打包的 exe' if frozen else 'Python 脚本'}")
    reg = paths.registry_list()
    log(f"  已注册项目    {len(reg)}")
    for p in reg:
        if p["exists"]:
            cfg = C.with_defaults(C.load(paths.Project(Path(p["path"]))))
            miss = [s["path"] for s in cfg["sources"]
                    if not (Path(s["path"]) if Path(s["path"]).is_absolute()
                            else Path(cfg["project"].get("baseDir", ".")) / s["path"]).is_file()]
            log(f"    - {p['name']:<20} 源表 {len(cfg['sources'])} 个"
                + (f"  缺 {len(miss)}" if miss else "  OK"))
    from stop_watch import read_pid
    pid = read_pid()
    log(f"  监听进程      {'运行中 PID %d' % pid if pid else '未运行'}")
    log("=" * 52)
    log("结论: " + ("可以正常使用" if ok else "有问题,见上"))
    return 0 if ok else 1
