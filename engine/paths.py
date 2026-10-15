# -*- coding: utf-8 -*-
"""🐑 助手工程师 —— 路径与项目结构。

项目文件夹是自包含的:整个拷走就能换机器用。
内部文件以下划线开头或放在编号目录下,便于识别与排除。
"""

from __future__ import annotations

import json
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path


def _base_dir() -> Path:
    """打包成 exe 后,__file__ 指向 PyInstaller 的临时解包目录,
    必须改用 exe 所在目录,否则模板/项目会写进临时目录。"""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


def _res_dir() -> Path:
    """只读资源(模板等)。PyInstaller 6 onedir 会放在 _internal 下。"""
    if getattr(sys, "frozen", False):
        base = getattr(sys, "_MEIPASS", None)
        if base:
            p = Path(base)
            for cand in (p / "templates", p / "_internal" / "templates"):
                if cand.is_dir():
                    return cand
            return p
    return _base_dir()


APP_DIR = _base_dir()          # 可写:项目、日志、配置
RES_DIR = _res_dir()           # 只读:模板
# ★ 打包后 `_res_dir()` 返回的**已经是 templates 目录本身**
#   (它内部试的就是 `p/templates` 和 `p/_internal/templates`)。
#   可这里原来又拼了一次 `/templates`,于是 TPL_DIR 变成
#   `_internal/templates/templates` —— 一层多出来的目录。
#   表现出来是:exe 里「看板模板」靠各处兜底循环才找得到,
#   而 `BOM表模板.xlsx` 那些**没有兜底**的直接报「找不到模板」。
#   `sheep template` 在 exe 里第一次跑就挂了 —— 而源码运行一切正常,
#   因为源码模式下 RES_DIR = APP_DIR,拼一次是对的。
#   所以:冻结时 TPL_DIR 就是 RES_DIR,不能再拼。
TPL_DIR = (RES_DIR if getattr(sys, "frozen", False)
           else RES_DIR / "templates")
REGISTRY_DIR = APP_DIR / "项目"
REGISTRY_FILE = REGISTRY_DIR / "项目清单.json"
LOG_DIR = APP_DIR / "日志"
PID_FILE = APP_DIR / "监听.pid"
DASH_TPL = TPL_DIR / "看板.html"
# 标准 BOM 模板(P4)。放在 templates/ 里,打包脚本按 glob("*") 整目录复制,
# 所以 exe 里自带这三份文件。
BOM_TPL = TPL_DIR / "BOM表模板.xlsx"
BOM_TPL_DOC = TPL_DIR / "BOM表模板_说明.xlsx"
BOM_TPL_MD = TPL_DIR / "BOM表模板说明.md"

# 文档(P9/P10)。**放在程序根目录而不是 templates/** ——
# templates 是给看板/表格模板用的,文档不是模板。
# 打包脚本按 DOC_FILES 整份复制,漏了就检查下面这条断言。
#
# ★ P14 起把发布相关的一并带上:声明和致谢是**面向使用者**的,
#   放在程序里比只放在代码托管站上更有用 —— 拿到 exe 的人
#   不一定会去翻仓库。漏带的后果和以前一样:入口点开是空的。
DOC_FILES = ("说明书.md", "架构文档.md", "开发计划.md", "备份说明.md",
             "README.md", "项目主页.md", "声明.md", "致谢.md",
             "CHANGELOG.md", "发布清单.md")


# ---------------------------------------------------------------- 桌面
def desktop_dir() -> Path:
    """本人**真正的**桌面在哪。

    ★ 千万别写 `Path.home() / "Desktop"`。
      `Path.home()` 永远是 `%USERPROFILE%`,而桌面是可以**整个搬到别的盘**的
      —— 本人的桌面就在 `D:\\Desktop`,不在 C 盘。用 home 拼出来的是
      `C:\\Users\\Administrator\\Desktop`,一个他平时根本看不到的目录。
      表现出来是:「另存到桌面」的文件他翻遍桌面也找不到,
      而 C 盘那个目录里悄悄多出东西 —— 本人 2026-10-15 指出过这件事。

      正解是问 Windows 自己要:
        HKCU\\Software\\Microsoft\\Windows\\CurrentVersion
            \\Explorer\\User Shell Folders  →  Desktop
      这一项存的是**真实路径**,而且允许是 `%OneDrive%` 这种环境变量形式,
      所以还得 expandvars 一次。装了 OneDrive 的机器桌面会被重定向到
      OneDrive\\Desktop,同样只有这条路能拿到。

      依次退:
        1) 注册表 User Shell Folders\\Desktop(展开环境变量后)
        2) 注册表 Shell Folders\\Desktop(老式键,XP 时代的机器还在用)
        3) `~/Desktop`
        4) 当前目录 —— 宁可落在程序旁边,也不要落在 C 盘那个假桌面
    """
    if os.name != "nt":
        return Path.home() / "Desktop"
    try:
        import winreg
        for sub in (r"Software\Microsoft\Windows\CurrentVersion"
                    r"\Explorer\User Shell Folders",
                    r"Software\Microsoft\Windows\CurrentVersion"
                    r"\Explorer\Shell Folders"):
            try:
                with winreg.OpenKey(winreg.HKEY_CURRENT_USER, sub) as k:
                    raw = winreg.QueryValueEx(k, "Desktop")[0]
            except OSError:
                continue
            p = Path(os.path.expandvars(str(raw)))
            if p.is_dir():
                return p
    except Exception:
        pass
    p = Path.home() / "Desktop"
    return p if p.is_dir() else Path.cwd()



def _find_doc(name: str) -> Path:
    """找文档。源码运行、打包后都要能找得到。"""
    for base in (APP_DIR, RES_DIR, TPL_DIR):
        p = Path(base) / name
        if p.is_file():
            return p
    return APP_DIR / name          # 找不到也返回一个路径,让调用方自己报错


MANUAL_MD = _find_doc("说明书.md")          # 给本人看的操作手册
ARCH_MD = _find_doc("架构文档.md")          # 给改代码的人看的
PLAN_MD = _find_doc("开发计划.md")
BACKUP_MD = _find_doc("备份说明.md")
# 打包后资源可能落在 _internal,老位置也找一下(和 DASH_TPL 同样的兜底逻辑)
if not BOM_TPL.is_file():
    for _alt in (APP_DIR / "BOM表模板.xlsx", APP_DIR / "templates" / "BOM表模板.xlsx"):
        if _alt.is_file():
            BOM_TPL = _alt
            break


def is_frozen() -> bool:
    return bool(getattr(sys, "frozen", False))


# 自动检测暂停标记的名字(放项目里的 _基线/ 下)
PAUSE_NAME = "检测暂停.json"


def script_path(name: str) -> Path:
    """取一个脚本的路径;冻结后脚本被编译进 exe,返回 None。"""
    if is_frozen():
        return None
    return APP_DIR / name

LAYOUT = {
    "config": "项目配置.json",
    "source": "1_源数据",
    "bom": "2_BOM表",
    "step": "3_3D图",
    "2d": "4_2D图",
    # 总装图(装配体 STEP + 同名截图)。P5 新增。
    # 单独一个目录而不是塞进 3_3D图 —— 交付方的「零件图」和「装配图」
    # 是两类东西,混在一起的话对方会把装配体当成一个零件去对图号。
    "assy": "5_总装图",
    "dash": "6_看板",
    "archive": "7_归档",
    "baseline": "_基线",
    "logs": "_日志",
    "report": "_报告",
}
SUBDIRS = ["source", "bom", "step", "2d", "assy", "dash", "archive",
           "baseline", "logs", "report"]

# 导出 zip 里固定的四个子目录 —— **不加项目名前缀**。
# 本人要求:导出就这四个文件夹,不要再套一层「马桶项目改动零件加工/」。
# 套一层的话,对方解压后还得手动进同名目录才能看到图。
EXPORT_LAYOUT = [
    ("2D图纸", "2d"),
    ("3D图纸", "step"),
    ("BOM表", "bom"),
    ("总装图", "assy"),
]


def now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


# --------------------------------------------------------------------------
# 原子写
# --------------------------------------------------------------------------
# 直接 write_text 是「先清空再写」,写到一半进程被杀 / 另一个进程同时读,
# 就会读到空文件或半截内容。并发 build(监听 + 手动 + 打包同时跑)时实测踩过:
#   项目清单.json  -> 报「注册表损坏」
#   _图片缓存/*.png -> 报「cannot identify image file」
# 改成「写同目录临时文件 -> os.replace 原子替换」,读到的永远是完整旧版或完整新版。
def atomic_write_text(path, text: str, encoding: str = "utf-8"):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_name(f"{p.name}.tmp{os.getpid()}")
    try:
        tmp.write_text(text, encoding=encoding)
        os.replace(str(tmp), str(p))          # 同一文件系统内是原子操作
    except BaseException:
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass
        raise


def atomic_write_bytes(path, data: bytes):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_name(f"{p.name}.tmp{os.getpid()}")
    try:
        tmp.write_bytes(data)
        os.replace(str(tmp), str(p))
    except BaseException:
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass
        raise


class Project:
    def __init__(self, root):
        self.root = Path(root).resolve()

    def d(self, key: str) -> Path:
        return self.root / LAYOUT[key]

    @property
    def config_file(self) -> Path:  return self.root / LAYOUT["config"]
    @property
    def source(self) -> Path:      return self.d("source")
    @property
    def bom(self) -> Path:         return self.d("bom")
    @property
    def step(self) -> Path:        return self.d("step")
    # 2D 图就是工程图。只有一个目录,不再有独立的「工程图」目录。
    @property
    def dwg(self) -> Path:         return self.d("2d")
    @property
    def dash2d(self) -> Path:      return self.d("2d")
    @property
    def dash_dir(self) -> Path:    return self.d("dash")
    @property
    def archive(self) -> Path:     return self.d("archive")
    @property
    def baseline(self) -> Path:    return self.d("baseline")
    @property
    def logs(self) -> Path:        return self.d("logs")
    @property
    def report(self) -> Path:      return self.d("report")

    def pause_file(self) -> Path:
        """自动检测的暂停标记(P6)。

        放项目里而不是放程序目录 —— 暂停是**这个项目的状态**。
        项目可能被换台机器打开,标记跟着项目走,
        才不会「A 机器暂停了、B 机器以为还开着」。
        """
        return self.baseline / PAUSE_NAME

    def is_paused(self) -> bool:
        try:
            return self.pause_file().is_file()
        except OSError:
            return False

    def pause_info(self) -> dict:
        """读暂停标记。内容坏了也要读得出来 —— 不许静默。"""
        p = self.pause_file()
        if not p.is_file():
            return {}
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
            return d if isinstance(d, dict) else {"raw": str(d)}
        except Exception as e:
            return {"error": f"暂停标记读不出来(会被当成「没暂停」): {e}"}

    def set_paused(self, on: bool, reason: str = "", log=print) -> None:
        """开关暂停。解除时备份一份标记 —— 停了多久、为什么停,事后要查。"""
        p = self.pause_file()
        if on:
            if p.is_file():
                return                      # 已经暂停,别覆盖掉原始原因
            p.parent.mkdir(parents=True, exist_ok=True)
            data = {"at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "reason": reason, "pid": os.getpid()}
            atomic_write_text(p, json.dumps(data, ensure_ascii=False, indent=2))
            log(f"自动检测已暂停({reason or 手动})")
            return
        if not p.is_file():
            log("自动检测本来就没暂停")
            return
        try:
            info = self.pause_info()
            shutil.copy2(p, p.with_name(f"检测暂停_解除_{now_stamp()}.json"))
            p.unlink()
            at = info.get("at", "?")
            why = info.get("reason", "")
            log(f"自动检测已恢复(暂停于 {at}"
                + (f",原因:{why}" if why else "") + ")")
            self.clear_pause_backup()
        except OSError as e:
            log(f"恢复失败: {e}")

    def clear_pause_backup(self, keep: int = 20) -> None:
        """清掉积累的解除记录,免得 _基线 里堆几十个 json。"""
        try:
            fs = sorted(self.baseline.glob("检测暂停_解除_*.json"))
            for f in (fs[:-keep] if len(fs) > keep else []):
                f.unlink()
        except OSError:
            pass

    def bom_file(self, cat: str) -> Path:
        return self.bom / f"{cat}物料表.xlsx"

    def bom_dir_for(self, cat: str) -> Path:
        """导入外部 BOM 表时的落位目录(= 2_BOM表)。

        单独拆出来是为了让 do_import 少依赖一个属性名,
        也方便以后 BOM 表按分类再分子目录。
        """
        return self.bom

    # 旧目录 -> 新目录。交付物并成「3D图 / 2D图」两类之后,
    # 老项目的 4_工程图 和 5_2D图 要并到 4_2D图。
    _OLD_DIRS = {"4_工程图": "2d", "5_2D图": "2d"}

    def _migrate_old_dirs(self):
        """把老目录里的文件搬进新目录。搬完才删,失败不丢东西。"""
        import shutil
        for old, key in self._OLD_DIRS.items():
            src = self.root / old
            if not src.is_dir():
                continue
            dst = self.d(key)
            dst.mkdir(parents=True, exist_ok=True)
            for f in list(src.rglob("*")):
                if not f.is_file():
                    continue
                t = dst / f.relative_to(src)
                if t.exists():
                    f.unlink(missing_ok=True)      # 新目录已有同名,旧的丢弃
                    continue
                t.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(f), str(t))
            for d in sorted((x for x in src.rglob("*") if x.is_dir()),
                            key=lambda x: -len(x.parts)):
                try:
                    d.rmdir()
                except OSError:
                    pass
            try:
                src.rmdir()
            except OSError:
                pass

    @property
    def conflict_txt(self) -> Path:
        return self.report / "手动修改冲突.txt"

    @property
    def html(self) -> Path:
        try:
            fn = self.load()["output"].get("html") or "改动零件看板.html"
        except Exception:
            fn = "改动零件看板.html"
        return self.dash_dir / fn

    def load(self) -> dict:
        if not self.config_file.is_file():
            raise FileNotFoundError(f"项目配置不存在: {self.config_file}")
        return json.loads(self.config_file.read_text(encoding="utf-8-sig"))

    def save(self, cfg: dict):
        self.root.mkdir(parents=True, exist_ok=True)
        atomic_write_text(
            self.config_file,
            json.dumps(cfg, ensure_ascii=False, indent=2))

    @property
    def name(self) -> str:
        try:
            return self.load()["project"]["name"]
        except Exception:
            return self.root.name

    def exists(self) -> bool:
        return self.config_file.is_file()

    def ensure_dirs(self, cats=(), deliverable_dirs=(), subfolders=True):
        self.root.mkdir(parents=True, exist_ok=True)
        self._migrate_old_dirs()
        for k in SUBDIRS:
            self.d(k).mkdir(parents=True, exist_ok=True)
        base_of = {"step": self.step, "2d": self.dash2d, "dwg": self.dwg}
        for cat in cats:
            for dk in deliverable_dirs:
                b = base_of.get(dk, self.step)
                (b / cat if subfolders else b).mkdir(parents=True, exist_ok=True)

    def __repr__(self):
        return f"<Project {self.root}>"


# --------------------------------------------------------------------------
# 注册表
# --------------------------------------------------------------------------
def _reg() -> dict:
    if not REGISTRY_FILE.is_file():
        return {"projects": []}
    try:
        # utf-8-soc 兼容:Windows 上很多工具(含 PowerShell Set-Content、
        # 旧版本程序)写 JSON 会带 BOM,用 utf-8 读会直接抛
        # "Unexpected UTF-8 BOM"。别因为一个 BOM 就当注册表全废 ——
        # 那会让所有项目「凭空消失」。
        raw = REGISTRY_FILE.read_text(encoding="utf-8-sig")
        data = json.loads(raw)
    except Exception as e:
        # 注册表损坏时不能静默当空 —— 那会让所有项目"凭空消失",
        # 用户以为文件没了。先备份坏文件,再退回空表。
        bak = REGISTRY_FILE.with_suffix(f".坏{now_stamp()}.json")
        try:
            shutil.copy2(REGISTRY_FILE, bak)
        except OSError:
            bak = None
        print(f"⚠ 项目注册表损坏: {e}")
        print(f"  已备份到: {bak}" if bak else "  备份失败(文件可能被占用)")
        print(f"  请检查 {REGISTRY_FILE},或删除它后重新 new/import。")
        return {"projects": []}
    if not isinstance(data.get("projects"), list):
        return {"projects": []}
    return data


def _write_reg(reg: dict):
    REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
    atomic_write_text(REGISTRY_FILE,
                      json.dumps(reg, ensure_ascii=False, indent=2))


def registry_list(with_stat=False) -> list:
    """项目列表。with_stat=True 时带上概览统计。

    统计刻意做得很轻:只读配置里的源表清单 + 数一下 BOM 表和看板文件存在与否,
    **不解析 xlsx**。欢迎页要秒开,解析 18MB 的源表会卡住界面。
    """
    out = []
    for e in _reg()["projects"]:
        p = Project(Path(e["path"]))
        row = {"name": e.get("name", p.root.name), "path": str(p.root),
               "exists": p.exists(), "last": e.get("last_build", "")}
        if with_stat and row["exists"]:
            row["stat"] = _quick_stat(p)
        out.append(row)
    return out


def _quick_stat(p: "Project") -> dict:
    """项目的轻量概览:表数 / 看板是否已生成 / 零件数。

    `n_src` 要把**零件表和 BOM 表一起数**。
    以前只数 `cfg["sources"]`,而导入「已完工项目」(只有 BOM 表)时
    那 5 张表都归在 `cfg["bomSources"]` 里 —— 于是欢迎页显示
    「待导入源表」,用户明明导了 5 张表,看着像没导入成功。
    """
    st = {"n_src": 0, "n_src_only": 0, "n_bom": 0,
          "has_dash": False, "n_part": 0, "n_miss": 0}
    try:
        cfg = p.load()
        srcs = cfg.get("sources") or []
        boms = cfg.get("bomSources") or []
        base = Path(cfg.get("project", {}).get("baseDir") or ".")

        def alive(entries):
            n = 0
            for s in entries:
                sp = Path(s.get("path", ""))
                if not sp.is_absolute():
                    sp = base / sp
                if sp.is_file():
                    n += 1
            return n

        st["n_src_only"] = alive(srcs)
        st["n_bom"] = alive(boms)
        if st["n_bom"] == 0 and not boms:
            # 没登记 BOM 表时,看项目自己的 2_BOM表(人工核对后的成果)
            try:
                st["n_bom"] = sum(1 for f in p.bom.glob("*.xlsx")
                                  if f.is_file()) if p.bom.is_dir() else 0
            except Exception:
                st["n_bom"] = 0
        st["n_src"] = st["n_src_only"] + st["n_bom"]
    except Exception:
        pass
    try:
        st["has_dash"] = p.html.is_file()
    except Exception:
        pass
    # 零件数/缺件数从基线读,基线是工具上次生成的 JSON,读起来很快
    try:
        if p.bom.is_dir():
            st["n_part"] = sum(1 for _ in p.bom.glob("*.xlsx"))
    except Exception:
        pass
    return st


class _reg_lock:
    """注册表的跨进程锁(msvcrt 独占锁)。

    原子写只能保证「读到的是完整文件」,保证不了「读-改-写」这一串
    不丢更新:两个进程同时 add,后写的会覆盖前一个的记录。
    所以读改写整个过程都要在锁里做。
    """

    def __enter__(self):
        self.fh = None
        try:
            REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
            self.fh = open(str(REGISTRY_FILE) + ".lock", "a+b")
            if os.name == "nt":
                import msvcrt
                self.fh.seek(0)
                msvcrt.locking(self.fh.fileno(), msvcrt.LK_LOCK, 1)
        except Exception:
            self.fh = None          # 拿不到锁也别把功能整个废掉
        return self

    def __exit__(self, *exc):
        if self.fh is not None:
            try:
                if os.name == "nt":
                    import msvcrt
                    self.fh.seek(0)
                    msvcrt.locking(self.fh.fileno(), msvcrt.LK_UNLCK, 1)
            except Exception:
                pass
            try:
                self.fh.close()
            except Exception:
                pass
        return False


def registry_add(p: Project, name=None):
    path = str(p.root)
    with _reg_lock():
        reg = _reg()
        for e in reg["projects"]:
            if e["path"] == path:
                e["name"] = name or e.get("name")
                e["last_build"] = now()
                _write_reg(reg)
                return
        # 同名但路径不同 -> 说明是另一个项目,提醒一下免得 find_project 找错
        dup = [e for e in reg["projects"] if e.get("name") == name]
        if dup:
            # 但如果老条目指向的目录已经没了,那就是上次删除后残留的记录,
            # 直接顶掉。留着会让「同名项目」警告变成噪音,而且按名字操作
            # 会一直打到一个死路径上 —— 用户重新导入同名项目却像是没生效。
            dead = [e for e in dup if not Path(e["path"]).is_dir()]
            if dead:
                for e in dead:
                    reg["projects"].remove(e)
            else:
                print(f"⚠ 已有同名项目「{name}」: {dup[0]['path']}")
                print(f"  本次是另一个位置: {path}")
                print("  按名字操作时会用先注册的那个。")
        reg["projects"].append({"name": name or p.root.name, "path": path,
                                "added": now(), "last_build": now()})
        _write_reg(reg)


def registry_remove(p: Project):
    with _reg_lock():
        reg = _reg()
        reg["projects"] = [e for e in reg["projects"]
                           if e["path"] != str(p.root)]
        _write_reg(reg)


def find_project(name=None) -> Project:
    if name:
        cand = Path(name)
        p = Project(cand)
        if p.exists():
            return p
        reg = registry_list()
        # 先精确匹配,再忽略大小写 —— Windows 上目录名常与项目名大小写不一致
        for e in reg:
            if e["name"] == name and e["exists"]:
                return Project(Path(e["path"]))
        for e in reg:
            if e["name"].lower() == name.lower() and e["exists"]:
                return Project(Path(e["path"]))
        # 找不到时把候选列出来,省得用户猜
        avail = [e["name"] for e in reg if e["exists"]]
        hint = f"\n现有项目: {', '.join(avail)}" if avail else \
            "\n还没有任何项目。先创建一个:  sheep new <项目名>"
        if cand.is_dir():
            # 目录在,但里面没有项目配置 —— 和"名字打错"是两回事
            raise FileNotFoundError(
                f"这个目录不是项目(缺 {p.config_file.name}): {cand}\n"
                f"在该目录建项目:  sheep new <项目名> --path \"{cand}\"{hint}")
        raise FileNotFoundError(f"找不到项目: {name}{hint}")
    reg = [e for e in registry_list() if e["exists"]]
    if not reg:
        raise FileNotFoundError("还没有任何项目。先创建一个:  sheep new <项目名>")
    if len(reg) == 1:
        return Project(Path(reg[0]["path"]))
    reg.sort(key=lambda e: e.get("last", ""), reverse=True)
    return Project(Path(reg[0]["path"]))

