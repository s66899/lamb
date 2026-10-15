# -*- coding: utf-8 -*-
"""🐑 助手工程师 —— 打包成 exe。

用法:
    python 打包exe.py            # 打包成文件夹版(启动快,推荐)
    python 打包exe.py --onefile  # 打包成单文件
    python 打包exe.py --clean    # 先清理再打包

产物在  D:\\助手工程师\\发布\\
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

APP = Path(__file__).resolve().parent
sys.path.insert(0, str(APP))
# 文档清单从 engine.paths 取,不要在这里另抄一份 ——
# 两份清单迟早对不上,然后就出现「exe 里没有说明书」而没人知道为什么。
from engine.paths import DOC_FILES          # noqa: E402
OUT = APP / "发布"
NAME = "助手工程师"
# exe 的运行时目录。PyInstaller 打包时会整个删掉它重建,
# 而用户的项目库和日志正好在里面 —— 所以打包必须先摆开。
RUNTIME = OUT / NAME
ICON = APP / "资源" / "助手.ico"
MAIN = APP / "sheep.py"

# 需要显式告诉 PyInstaller 的隐藏导入(openpyxl 是动态导入的子模块很多)
HIDDEN = [
    "openpyxl", "openpyxl.cell._writer", "openpyxl.cell._reader",
    "openpyxl.styles.stylesheet", "openpyxl.styles.numbers",
    "openpyxl.styles.fonts", "openpyxl.styles.fills", "openpyxl.styles.borders",
    "openpyxl.styles.alignment", "openpyxl.styles.protection",
    "openpyxl.styles.differential", "openpyxl.styles.table",
    "openpyxl.worksheet._writer", "openpyxl.worksheet._reader",
    "openpyxl.worksheet.worksheet", "openpyxl.worksheet.hyperlink",
    "openpyxl.worksheet.dimensions", "openpyxl.worksheet.page",
    "openpyxl.worksheet.views", "openpyxl.worksheet.table",
    "openpyxl.workbook._writer", "openpyxl.workbook._reader",
    "openpyxl.workbook.workbook", "openpyxl.workbook.defined_name",
    "openpyxl.reader.excel", "openpyxl.reader.drawings",
    "openpyxl.writer.excel", "openpyxl.packaging.manifest",
    "openpyxl.packaging.workbook", "openpyxl.chart.reader",
    "openpyxl.chart._chart", "openpyxl.drawing.spreadsheet_drawing",
    "openpyxl.drawing.image", "openpyxl.utils.dataframe",
    "openpyxl.xml.functions", "openpyxl.xml.constants",
    "openpyxl.compat", "openpyxl.utils", "openpyxl.utils.datetime",
    "openpyxl.utils.exceptions", "openpyxl.utils.units",
    "openpyxl.formatting.formatting", "openpyxl.formula.translate",
    "openpyxl.worksheet.formula", "openpyxl.comments.comments",
    "openpyxl.worksheet.copier", "openpyxl.cell.rich_text",
    "PIL.Image", "PIL.ImageGrab", "PIL.ImageTk",
    # ---- P12:程序内查看器 ----
    # numpy 是**光栅化器**的地基,以前在 EXCLUDE 里被排掉了;
    # 排掉之后 3D 窗一开就是 "No module named numpy"。
    # 这类「打进去了但其实用不了」的坑,只有真跑 exe 才暴露。
    "numpy", "numpy.core._multiarray_umath", "numpy.lib._function_base_impl",
    "PIL.ImageTk", "tkinter.ttk",
    "pypdfium2", "pypdfium2.raw", "pypdfium2.internal",
    "OCP", "OCP.OCP", "OCP.STEPControl", "OCP.BRepMesh", "OCP.StlAPI",
    "OCP.BRepGProp", "OCP.GProp", "OCP.TopExp", "OCP.TopAbs", "OCP.IFSelect",
    "engine", "engine.paths", "engine.config", "engine.probe",
    "engine.core", "engine.excel", "engine.dashboard", "engine.server",
    "engine.mesh3d", "engine.viewer", "engine.dashview", "engine.edit",
    "engine.scan",
    "build_core", "gui", "stop_watch", "theme",
    "tkinter", "tkinter.filedialog", "tkinter.messagebox", "tkinter.ttk",
    "tkinter.colorchooser", "tkinter.font", "tkinter.constants",
    "http.server", "socketserver", "json", "zipfile", "webbrowser",
]

# ★ numpy 不能再排除了(P12 的 3D 光栅化靠它)。
EXCLUDE = ["matplotlib", "pandas", "scipy", "pytest", "IPython",
           "notebook", "setuptools", "pip", "PyQt5", "PySide2", "PySide6"]


def make_icon():
    """生成一个简单的 .ico(纯标准库,免依赖)。"""
    try:
        import struct
        import zlib
        from pathlib import Path
    except Exception:
        return None
    size = 64
    px = bytearray()
    for y in range(size):
        px.append(0)                                    # filter byte
        for x in range(size):
            dx, dy = x - 31.5, y - 31.5
            r2 = dx * dx + dy * dy
            if r2 < 24 * 24:                            # 深色圆底
                px += bytes((0x1E, 0x3A, 0x5F, 255))
            elif r2 < 27 * 27:                          # 青色环
                px += bytes((0x0E, 0xA5, 0xE9, 255))
            else:
                px += bytes((0, 0, 0, 0))
    # PNG 封装
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c))

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(bytes(px), 9))
           + chunk(b"IEND", b""))
    d = APP / "资源"
    d.mkdir(exist_ok=True)
    ico = d / "助手.ico"
    # ICO 里直接塞 PNG(PyInstaller/Win10 支持)
    ico.write_bytes(struct.pack("<HHH", 0, 1, 1)
                    + struct.pack("<BBBBHHII", size, size, 0, 0, 1, 32,
                                  len(png), 22)
                    + png)
    return ico


def _check_template():
    """打包前的模板自检:花括号配平 + 关键规则齐全。

    返回 True 表示可以继续打包。
    """
    import re
    tpl = APP / "templates" / "看板.html"
    try:
        src = tpl.read_text(encoding="utf-8")
    except Exception as e:
        print(f"❌ 读不到模板: {e}")
        return False
    m = re.search(r"<style>(.*?)</style>", src, re.S)
    if not m:
        print("❌ 模板里没有 <style> 块")
        return False
    css = re.sub(r"/\*.*?\*/", "", m.group(1), flags=re.S)
    css = re.sub(r"data:[^\"')]+", "data:", css)
    depth = 0
    for ch in css:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
    if depth != 0:
        print(f"❌ 模板 CSS 花括号不配平(结束时 depth={depth})")
        print("   浏览器会丢掉从断点往后的全部样式 —— 请检查 <style> 块")
        return False
    # 少写右花括号最常见的受害者
    must = ["#lb{", "#lb img", ".toast", ".vp", ".noph", ".mtab",
            "table{width:100%", "th{", "td{"]
    missing = [k for k in must if k not in css]
    if missing:
        print(f"❌ 模板缺少关键 CSS 规则: {missing}")
        return False
    print(f"✅ 模板自检通过({css.count('{')} 条规则)")
    return True


def main():
    onefile = "--onefile" in sys.argv
    clean = "--clean" in sys.argv
    py = sys.executable

    if clean:
        for d in (APP / "build", APP / f"{NAME}.spec"):
            if d.is_dir():
                shutil.rmtree(d, ignore_errors=True)
            elif d.is_file():
                d.unlink()
        print("已清理旧产物")

    icon = make_icon()
    if icon:
        print(f"图标: {icon}")

    OUT.mkdir(exist_ok=True)

    # ---- 保住用户的项目库和日志 ----------------------------------
    # PyInstaller 打包 COLLECT 时会「Removing dir 发布\助手工程师」
    # 整个删掉再重建。而 exe 的运行时数据目录正好就是它:
    #   发布\助手工程师\项目\          用户建的所有项目 + 项目清单.json
    #   发布\助手工程师\日志\崩溃.log
    # 也就是说**每次重新打包都会把用户的项目全部删掉**。
    # 之前就是这么丢过一个项目(用户导入的「马桶项目改动零件加工」)。
    # 这里先搬到临时位置,打完包再搬回去。
    keep = _stash_user_data()
    try:
        return _build(onefile, py, icon)
    finally:
        _restore_user_data(keep)


def _stash_user_data():
    """把输出目录里的用户数据搬到暂存处。返回清单,空列表表示没有。"""
    import tempfile
    saved = []
    for name in ("项目", "日志"):
        src = RUNTIME / name
        if not src.is_dir():
            continue
        dst = Path(tempfile.mkdtemp(prefix=f"助手工程师_{name}_")) / name
        try:
            shutil.move(str(src), str(dst))
            saved.append((name, dst))
            print(f"已暂存用户数据: {src} -> {dst}")
        except OSError as e:
            print(f"⚠ 暂存 {src} 失败({e}),"
                  f"打包会删掉它 —— 先手动挪走再打包")
    return saved


def _restore_user_data(saved):
    import tempfile
    for name, dst in saved or []:
        target = RUNTIME / name
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                shutil.rmtree(target, ignore_errors=True)
            shutil.move(str(dst), str(target))
            print(f"已恢复用户数据: {target}")
        except OSError as e:
            print(f"❌ 恢复 {name} 失败: {e}")
            print(f"   数据还在这里,请你手动挪回去: {dst.parent}")
        finally:
            shutil.rmtree(dst.parent, ignore_errors=True)


def _site_dir(name):
    """在 site-packages 里找一个包/目录,返回路径(找不到返回 None)。

    ★ 必须处理**没有 `__init__.py` 的目录**(PEP 420 命名空间包):
      `find_spec('cadquery_ocp.libs')` 对这种目录返回 None(它不是模块),
      于是 `_site_dir` 返回 None → 72 个 OCC 的 dll 一个都没进包,
      而**打包照样返回 0**、exe 也能开,只是第一次转 STEP 时
      `import OCP` 才炸 —— 典型的「打进去了却用不了」。
      这个坑在 `OCP.__file__` 那条路上不存在(OCP 是普通包),
      所以先试 find_spec,再拿 OCP 的位置当锚点去旁边找。
    """
    import importlib.util
    try:
        spec = importlib.util.find_spec(name)
    except Exception:
        spec = None
    if spec and spec.submodule_search_locations:
        return Path(list(spec.submodule_search_locations)[0])
    if spec and spec.origin:
        return Path(spec.origin).parent
    # 兜底:在 site-packages 里按目录名找(命名空间包)
    for root in _site_roots():
        cand = root / name
        if cand.is_dir():
            return cand
    return None


def _site_roots():
    """site-packages 目录列表。用 `OCP` 的位置反推,最稳。"""
    out = []
    try:
        import OCP
        out.append(Path(OCP.__file__).parent.parent)
    except Exception:
        pass
    import site
    for getter in (lambda: site.getsitepackages(),
                   lambda: [site.getusersitepackages()]):
        try:
            out.extend(Path(p) for p in getter())
        except Exception:
            pass
    seen, uniq = set(), []
    for p in out:
        if p not in seen and p.is_dir():
            seen.add(p)
            uniq.append(p)
    return uniq


def _ocp_collect_args():
    """收集 STEP 转换所需的原生文件。

    必带三样,少一样都是「exe 能开、一点就炸」:
      1. `OCP` 本体(--collect-all:那些 .pyd 子模块)
      2. `cadquery_ocp.libs` 里的 dll(用 --add-binary 逐个列,
         因为它没有 __init__.py,--collect-all 认不出来)
      3. `vtk.libs` —— 一个**空目录**。OCP 的 `__init__.py` 会无条件
         `os.add_dll_directory(vtk.libs)`,目录不存在就 FileNotFoundError。
         PyInstaller 没有「空目录」这种 add-data,所以用一个占位文件顶替。

    这里返回的是命令行参数片段;装不上 OCP 时返回空列表并说明,
    不让打包因为可选依赖缺失而失败 —— 但会明确告诉本人 STEP 看不了。
    """
    out = []
    ocp = _site_dir("OCP")
    if ocp is None:
        print("⚠ 没装 cadquery-ocp:exe 里将**不能**看 STEP(其它功能正常)")
        return out
    out += ["--collect-all", "OCP"]

    libs = _site_dir("cadquery_ocp.libs")
    n_dll = 0
    if libs and libs.is_dir():
        dlls = sorted(p for p in libs.glob("*.dll"))
        for d in dlls:
            out += ["--add-binary", f"{d}{os.pathsep}cadquery_ocp.libs"]
        n_dll = len(dlls)
    else:
        print("⚠ 找不到 cadquery_ocp.libs:OCP 的 dll 可能没进包")
    # vtk.libs 占位(只求这个目录存在)
    stub = OUT / "_打包" / "vtkstub.txt"
    stub.parent.mkdir(parents=True, exist_ok=True)
    stub.write_text("OCP 的 __init__ 会无条件 add_dll_directory('vtk.libs');\n"
                    "这个文件只为让该目录存在。真正的 dll 在 cadquery_ocp.libs。\n",
                    encoding="utf-8")
    out += ["--add-data", f"{stub}{os.pathsep}vtk.libs"]
    print(f"OCP:已列入 {n_dll} 个 dll + vtk.libs 占位")
    return out


def _build(onefile, py, icon=None):

    # 模板 CSS 结构自检 —— 必须在复制/打包之前。
    # 改 CSS 时少写一个右花括号,浏览器会把从那里往后的**整张样式表**
    # 都丢掉:页面看着还能用,只是灯箱不再 fixed(大图跑到页面最下面)、
    # 缩略图不圆角、提示条消失。这种问题极难联想到是 CSS 断了,
    # 所以打包前直接拦住。
    if not _check_template():
        print("\n❌ 模板自检没过,已中止打包")
        return 1

    workdir = OUT / "_打包"
    if workdir.exists():
        shutil.rmtree(workdir, ignore_errors=True)
    workdir.mkdir(parents=True)

    # 把源码 + 模板复制进去,避免把项目数据/缓存也打进去
    # theme.py 是设计系统,gui.py 直接 import 它 —— 漏了 exe 里会 ImportError
    for item in ("sheep.py", "gui.py", "build_core.py", "stop_watch.py",
                 "theme.py"):
        shutil.copy2(APP / item, workdir / item)
    shutil.copytree(APP / "engine", workdir / "engine",
                    ignore=shutil.ignore_patterns("__pycache__"))
    (workdir / "templates").mkdir(exist_ok=True)
    for f in (APP / "templates").glob("*"):
        shutil.copy2(f, workdir / "templates" / f.name)
    # 文档(P9/P10)。exe 里必须自带说明书 —— 换了机器、源码不在手边时,
    # 手册就是唯一能查的东西。
    # 逐个拷而不是整目录拷:文档在根目录,整目录拷会把项目数据也带进去。
    missing = []
    for name in DOC_FILES:
        src = APP / name
        if src.is_file():
            shutil.copy2(src, workdir / name)
        else:
            missing.append(name)
    if missing:
        # 缺文档不阻断打包,但必须喊出来 —— 静默少带一份,
        # 到了别人机器上才发现「怎么没有说明书」。
        print(f"⚠ 缺少文档,exe 里将没有:{', '.join(missing)}")
    else:
        print(f"已带入文档 {len(DOC_FILES)} 份")
    # 打包时的占位项目目录,运行时再创建
    (workdir / "项目").mkdir(exist_ok=True)
    (workdir / "日志").mkdir(exist_ok=True)

    cmd = [
        py, "-m", "PyInstaller",
        "--noconfirm", "--clean",
        "--name", NAME,
        "--distpath", str(OUT),
        "--workpath", str(workdir / "_build"),
        "--specpath", str(workdir),
        # 用 console 模式打包,命令行子命令才有输出;
        # 双击时 sheep.py 内部会调 ShowWindow 隐藏黑框。
        "--console",
        "--onefile" if onefile else "--onedir",
        "--hidden-import", "engine",
        "--collect-submodules", "engine",
    ]
    for h in HIDDEN:
        cmd += ["--hidden-import", h]
    for e in EXCLUDE:
        cmd += ["--exclude-module", e]
    # 模板是非 .py 数据文件,必须显式带上,否则看板模板缺失
    cmd += ["--add-data", f"{workdir / 'templates'}{os.pathsep}templates"]
    # ★ 文档也要显式带上。
    # 光把文件 copy 进 workdir **不够** —— PyInstaller 只收 `--add-data`
    # 指名的东西,加上被 import 的 .py。你复制进 workdir 的那份只是
    # 「打包时的源」,不在 --add-data 清单里就根本不会进包。
    # 表现是:打包日志明明打印「已带入文档 5 份」,exe 里一个都没有,
    # 而打包**成功**返回 0 —— 静默少带东西,最难查的一类。
    for name in DOC_FILES:
        src = workdir / name
        if src.is_file():
            cmd += ["--add-data", f"{src}{os.pathsep}."]
        else:
            print(f"⚠ 跳过 {name}(workdir 里没有)")
    if icon:
        cmd += ["--icon", str(icon)]
    # ★ OCP(OpenCASCADE)要整包带走 —— STEP 转换就是靠它。
    #   注意它不是普通的纯 Python 包:cadquery-ocp 把 OCC 的 72 个 dll
    #   放在**同级**的 `cadquery_ocp.libs` 目录里,PyInstaller 不会自动
    #   跟着搬。少了这一步,打包照样返回 0,exe 也能开,只是第一次点
    #   STEP 视图时在 `import OCP` 处炸 —— 典型的「打进去了却用不了」。
    #
    #   ★ 这里是 `cmd += _ocp_collect_args()`,**不是**逐元素 `cmd += extra`。
    #     `_ocp_collect_args()` 返回的是**字符串列表**
    #     (["--collect-all","OCP","--add-binary","....dll",...]),
    #     `for extra in ...: cmd += extra` 拿到的是单个字符串,
    #     `list += str` 会把字符串**按字符**摊开塞进去 ——
    #     "--add-binary" 变成 '-','-','a','d','d','-','b','i','n','a','r','y',
    #     72 个 dll 路径全被拆成一个个字符。PyInstaller 收到的命令行长这样:
    #         ... - - a d d - b i n a r y C : \ ... x.STEP <几十万个单字符>
    #     它把其中一个孤零零的 '-' 当成脚本名,报
    #         ERROR: Script file '-' does not exist.
    #     打包返回 1、什么都没打出来 —— 好在这时报错还算响;
    #     真正难查的是它哪天**没**报错、exe 打出来了、里面却没有 OCP。
    cmd += _ocp_collect_args()
    cmd += [str(workdir / "sheep.py")]

    print("\n开始打包(首次约 1-3 分钟)…\n")
    t0 = time.time()
    r = subprocess.run(cmd, cwd=str(workdir))
    if r.returncode != 0:
        print("\n打包失败,退出码", r.returncode)
        return r.returncode

    print(f"\n完成,耗时 {time.time()-t0:.0f}s")
    target = OUT / (f"{NAME}.exe" if onefile else NAME)
    if target.exists():
        if target.is_dir():
            size = sum(f.stat().st_size for f in target.rglob("*") if f.is_file())
        else:
            size = target.stat().st_size
        print(f"产物: {target}   {size/1024/1024:.1f} MB")

    # ★ 验收:打包成功**不等于**该带的都带上了。
    #   PyInstaller 少收一个数据文件照样返回 0,只有拆开产物才知道。
    #   所以这里逐个点名要的东西,缺一个就明确报出来(而不是让人等到
    #   换了机器、打开 exe 才发现「怎么没有说明书」)。
    if target.is_dir():
        def _find(name, sub):
            for base in (target, target / "_internal"):
                f = base / sub / name if sub else base / name
                if f.is_file():
                    return f
            return None

        print("\n验收:")
        miss = []
        for name in DOC_FILES:
            f = _find(name, "")
            if f:
                print(f"  OK  文档 {name:<18}{f.stat().st_size:>9,} 字节")
            else:
                miss.append(f"文档 {name}")
        for name in ("看板.html", "BOM表模板.xlsx", "BOM表模板_说明.xlsx",
                     "BOM表模板说明.md"):
            f = _find(name, "templates")
            if f:
                print(f"  OK  模板 {name:<18}{f.stat().st_size:>9,} 字节")
            else:
                miss.append(f"模板 {name}")

        # ---- P12:程序内查看器的能力依赖 ----
        # 光看文件在不在不够,还要确认「能用」的那几样进来了。
        # pypdfium2 的 .pyd 不带进来 -> PDF 一开就抛 ImportError;
        # OCC 的 dll 不带进来        -> STEP 一开就抛 FileNotFoundError;
        # 两者都是**点一下才炸**,而且报错信息完全看不出是少带了文件。
        #
        # ★ dll 要**数个数、算总量**,不能只看「找到一个」。
        #   以前只报 `next(glob("*.dll"))` 那一个文件的大小,
        #   72 个里进了 1 个也是「OK」——
        #   而 STEP 转换要的是**一整套**,少一个就在 import 时炸。
        #   顺带一提:这个检查当初报「OK」而包里一个 dll 都没有,
        #   因为 glob 是在 `cadquery_ocp.libs` 目录**不存在**时返回空,
        #   而 `hit` 被前一个 for 循环留下的旧值挡住了。
        #   现在每个能力独立判断,拿不到就是拿不到。
        cap = [
            # pypdfium2 5.x **不带 .pyd**:原生库是 pypdfium2_raw\pdfium.dll。
            # 只认 `*_pdfium*.pyd` 的话会误报「缺 PDF 渲染」——
            # 而实际上包里的 pdfium.dll 是好的,只是检查写错了。
            ("PDF 渲染(pypdfium2)", ["pypdfium2", "pypdfium2_raw"], "pdf"),
            ("STEP 转换(OCP 模块)", ["OCP"], "OCP"),
            ("STEP 转换(OCC dll)", ["cadquery_ocp.libs"], "dll"),
        ]
        for label, subs, kind in cap:
            files = []
            for base in (target, target / "_internal"):
                for sub in subs:
                    d = base / sub
                    if not d.is_dir():
                        continue
                    if kind == "pdf":
                        files += sorted(d.glob("*_pdfium*.pyd"))
                        files += sorted(d.glob("*.dll"))
                    elif kind == "OCP":
                        files += sorted(d.glob("**/*.pyd"))
                    else:
                        files += sorted(d.glob("*.dll"))
            files = [f for f in files if f.is_file()]
            if not files:
                miss.append(f"能力 {label}")
                continue
            total = sum(f.stat().st_size for f in files)
            print(f"  OK  能力 {label:<24}{len(files):>4} 个 /{total:>12,} 字节")
            if kind == "dll" and len(files) < 50:
                # 少了不是「可能没事」,STEP 转换一定会在 import 时炸
                miss.append(f"能力 {label}(只进了 {len(files)} 个 dll,"
                            f"OCC 需要整套)")
        # vtk.libs 占位 —— OCP 的 __init__ 硬依赖它存在
        vs = None
        for base in (target, target / "_internal"):
            if (base / "vtk.libs").is_dir():
                vs = base / "vtk.libs"
                break
        if vs:
            print(f"  OK  能力 {'vtk.libs 占位目录':<24}{'':>12}")
        else:
            miss.append("能力 vtk.libs 占位目录")

        if miss:
            print(f"\n⚠ 产物里缺 {len(miss)} 项:{'、'.join(miss)}")
        else:
            print("  文档与模板齐全")
    else:
        print("  (单文件模式,跳过内容验收)")

    shutil.rmtree(workdir, ignore_errors=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
