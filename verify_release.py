# -*- coding: utf-8 -*-
"""验收打包好的 exe —— 不看源码,只看产物。

存在的理由:
    **源码跑得通 ≠ exe 跑得通。**
    以前有过两次只在 exe 上才暴露的问题:
      ① `paths.TPL_DIR` 在冻结时多拼了一层 `templates/templates`,
         源码模式恰好对、exe 模式直接报「找不到模板」;
      ② 72 个 OCC dll 一个都没进包,而 `import OCP` 在**第一次用到**时才炸
         —— `doctor` 那时还没有「STEP 转换」这一行,所以一片绿。

    所以这个脚本专盯「源码测不出来」的那部分。

跑法:
    python verify_release.py
"""
from __future__ import annotations

import hashlib
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile
from pathlib import Path

APP = Path(r"D:\助手工程师")
REL = APP / "发布"
EXE = REL / "助手工程师" / "助手工程师.exe"
FAILS: list[str] = []
N = [0]


def ck(name, ok, extra=""):
    N[0] += 1
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f" -> {extra}" if extra else ""))
    if not ok:
        FAILS.append(name)


def run(args, timeout=900, cwd=None):
    t0 = time.time()
    p = subprocess.run([str(EXE)] + args, capture_output=True,
                       timeout=timeout, cwd=str(cwd or REL / "助手工程师"))
    # ★ exe 的控制台输出是 **GBK/ANSI**,不是 UTF-8。
    #   按 utf-8 解会得到满屏「鏉ユ簮」这种乱码,断言一个也匹配不上,
    #   表现出来就是「测试莫名其妙失败」,而程序其实完全正常。
    #   这里两个编码都试一遍,取能解出中文的那个。
    outs = []
    for enc in ("utf-8", "gbk", "mbcs", "latin-1"):
        try:
            outs.append((p.stdout or b"").decode(enc))
        except Exception:
            pass
    out = max(outs, key=lambda s: sum("一" <= c <= "鿿" for c in s)) \
        if outs else ""
    return p.returncode, out, time.time() - t0


def main() -> int:
    print("\n=== 1. 产物在不在 ===")
    ck("exe 存在", EXE.is_file(), str(EXE))
    ck("exe 大于 1 MB", EXE.stat().st_size > 1e6,
       f"{EXE.stat().st_size / 1048576:.1f} MB")
    ck("_internal 存在", (REL / "助手工程师" / "_internal").is_dir())

    print("\n=== 2. exe doctor(只有真跑 exe 才有意义)===")
    rc, out, dt = run(["doctor"])
    ck("doctor 退出码 0", rc == 0, f"rc={rc}")
    for k in ("STEP 转换", "PDF 渲染", "核对栏", "看板模板"):
        ck(f"doctor 里有「{k}」", k in out)
    ck("结论是可以正常使用", "可以正常使用" in out,
       out.strip().splitlines()[-1] if out.strip() else "(无输出)")
    ck("是打包版不是源码版", "打包的 exe" in out)
    ck("自检耗时合理(<120s)", dt < 120, f"{dt:.0f}s")

    print("\n=== 3. 文档与模板真的在 exe 里 ===")
    # 打包成功**不等于**该带的都带上了 —— PyInstaller 只收 --add-data 指名的。
    import json
    want_docs = ["说明书.md", "架构文档.md", "开发计划.md", "备份说明.md",
                 "README.md", "项目主页.md", "声明.md", "致谢.md",
                 "CHANGELOG.md", "发布清单.md"]
    want_tpl = ["看板.html", "BOM表模板.xlsx", "BOM表模板_说明.xlsx",
                "BOM表模板说明.md"]
    found = {}
    for base in (REL / "助手工程师", REL / "助手工程师" / "_internal"):
        for f in base.rglob("*"):
            if f.is_file() and f.name in want_docs + want_tpl:
                found.setdefault(f.name, f)
    miss = [n for n in want_docs + want_tpl if n not in found]
    ck(f"{len(want_docs) + len(want_tpl)} 份文档/模板一个不缺", not miss, str(miss))
    empty = [n for n, p in found.items() if p.stat().st_size == 0]
    ck("没有 0 字节的", not empty, str(empty))

    print("\n=== 4. ★ 新功能:加工后核对 / 新购件核对 ===")
    # 必须在**打包后的 exe 所在目录**跑,才能验证它找得到自己的模块。
    tmp = Path(tempfile.mkdtemp(prefix="验收_核对_"))
    try:
        sys.path.insert(0, str(tmp))
        shutil.copy2(REL / "项目" / "项目清单.json", tmp / "x.json") \
            if (REL / "项目" / "项目清单.json").is_file() else None
        # 用 exe 跑一段脚本,验证 checklist 模块在冻结环境里可用
        probe = tmp / "_probe_chk.py"
        probe.write_text(
            "# -*- coding: utf-8 -*-\n"
            "import sys, json\n"
            "sys.path.insert(0, r'D:\\助手工程师\\engine')\n"
            "from engine import checklist as CL\n"
            "print('MODULE_OK', CL.FILE_NAME, len(CL.STATUSES), CL.LABELS['m'], CL.LABELS['p'])\n",
            encoding="utf-8")
        # 打包后的 exe 不能直接跑外部脚本,改为验证 import 本身:
        # 用 exe 的 template 子命令间接确认 engine 能被正常加载,再用源码验数据层。
        rc, out, dt = run(["template", "--out", str(tmp / "tpl")])
        ck("exe template 能跑(engine 模块加载正常)", rc == 0, f"rc={rc}")
        got = list((tmp / "tpl").glob("*")) if (tmp / "tpl").is_dir() else []
        ck("template 真的取出了文件", bool(got), str([p.name for p in got]))

        # 数据层:用源码验,因为验收的是**逻辑**不是打包;
        # 打包是否带全,由上面的「文档/模板一个不缺」和 doctor 的「核对栏 OK」保证。
        sys.path.insert(0, str(APP))
        for m in [m for m in list(sys.modules)
                  if m == "engine" or m.startswith("engine.")]:
            del sys.modules[m]
        import engine.checklist as CL          # noqa: E402
        ck("核对表文件名", CL.FILE_NAME == "核对表.xlsx", CL.FILE_NAME)
        ck("四个状态", [n for _, n in CL.STATUSES]
           == ["待核对", "合格", "不合格", "返工"])
        ck("两栏名字", CL.LABELS == {"m": "加工后核对", "p": "新购件核对"},
           str(CL.LABELS))
        ck("自产件走加工后核对",
           CL.kind_of({"cat": "机加工件"}) == "m"
           and CL.kind_of({"cat": "塑胶件"}) == "m"
           and CL.kind_of({"cat": "钣金件"}) == "m"
           and CL.kind_of({"cat": "3D打印件"}) == "m")
        ck("外购件走新购件核对", CL.kind_of({"cat": "外购件"}) == "p")
        # ★ 主键必须是 (表,行号) 而不是图号 —— 真实数据里 22 行图号相同。
        a = {"cat": "外购件", "src": "外购件物料表.xlsx", "xrow": 6,
             "pn": "杯头螺钉"}
        b = {"cat": "外购件", "src": "外购件物料表.xlsx", "xrow": 7,
             "pn": "杯头螺钉"}
        ck("同图号不同行分得开", CL.key_of(a) != CL.key_of(b),
           f"{CL.key_of(a)} vs {CL.key_of(b)}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print("\n=== 5. ★ 那个曾经静默吞掉外购件的 bug ===")
    rc, out, dt = run(["status", "马桶项目改动零件加工"])
    ck("exe status 能跑", rc == 0, f"rc={rc}")
    # `status` **只列出有零件的分类** —— 3D打印件那张表存在但没有标红改动件,
    # 于是它一行都不出现,这是对的。所以不能断言「五个分类名都要在」,
    # 那条断言第一次跑就失败,而程序其实完全正常。
    # 真正要钉住的是:**外购件那 48 件在不在**。
    m = re.search(r"外购件\s+(\d+)\s+条", out)
    ck("status 里能读到外购件", m is not None,
       out.strip().splitlines()[2][:50] if len(out.strip().splitlines()) > 2 else "")
    ck("外购件 48 件(就是曾经整类消失的那批)", m and int(m.group(1)) == 48,
       m.group(1) if m else "没找到")
    n = re.findall(r"(\d+)\s+条", out)
    ck("四类零件合计 89 件", sum(int(x) for x in n[:4]) == 89,
       " + ".join(n[:4]))
    ck("没有「这一类不会出现在看板上」的告警",
       "不会出现在看板上" not in out)

    print("\n=== 6. 分发包 ===")
    for name in ("助手工程师-便携版.zip", "助手工程师-便携版.tar.zst"):
        p = REL / name
        ck(f"{name} 存在", p.is_file(),
           f"{p.stat().st_size / 1048576:.1f} MB" if p.is_file() else "缺")
    sums = REL / "SHA256SUMS.txt"
    ck("SHA256SUMS.txt 存在", sums.is_file())

    print("\n=== 7. ★ zip 解到干净目录能不能真用 ===")
    # 「打包成功」和「别人能用」是两回事。解出来跑一次 doctor 才算数。
    tmp = Path(tempfile.mkdtemp(prefix="验收_zip_"))
    try:
        zp = REL / "助手工程师-便携版.zip"
        if zp.is_file():
            with zipfile.ZipFile(zp) as z:
                bad = z.testzip()
                ck("zip 自身没有损坏条目", bad is None, str(bad))
                z.extractall(tmp)
            got = list(tmp.rglob("助手工程师.exe"))
            ck("解出了 exe", bool(got),
               str([str(p) for p in got]))
            if got:
                e = got[0]
                ck("解出来的 exe 大小正常", e.stat().st_size > 1e6,
                   f"{e.stat().st_size / 1048576:.1f} MB")
                p2 = subprocess.run([str(e), "doctor"], capture_output=True,
                                    timeout=900, cwd=str(e.parent))
                so = (p2.stdout or b"")
                txt = ""
                for enc in ("utf-8", "gbk", "latin-1"):
                    try:
                        t = so.decode(enc)
                    except Exception:
                        continue
                    if sum("一" <= c <= "鿿" for c in t) > \
                            sum("一" <= c <= "鿿" for c in txt):
                        txt = t
                ck("干净解压后 doctor 能跑", p2.returncode == 0,
                   f"rc={p2.returncode}")
                ck("干净解压后结论正常", "可以正常使用" in txt,
                   txt.strip().splitlines()[-1][:50] if txt.strip() else "")
                ck("干净解压后 STEP 转换是 OK",
                   "STEP 转换" in txt and "OK(OCP)" in txt,
                   "OCP dll 少了就只有这一行会红")
                ck("干净解压后核对栏在", "核对栏" in txt)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print("\n" + "=" * 58)
    if FAILS:
        print(f"发布验收:失败 {len(FAILS)} / {N[0]}")
        for f in FAILS:
            print("  -", f)
        return 1
    print(f"发布验收全部通过({N[0]} 项)")
    return 0


if __name__ == "__main__":
    sys.exit(main())