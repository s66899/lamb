# -*- coding: utf-8 -*-
"""桌面路径 —— 单测。

起因是本人 2026-10-15 直接指出来的:

    **「这个才是现在的桌面,保存文件记得是在这个位置不是在 C 盘的桌面」**

他的桌面被整个搬到了 `D:\\Desktop`。而程序里三处写的是
`Path.home() / "Desktop"` —— `Path.home()` 永远是 `%USERPROFILE%`,
拼出来的是 `C:\\Users\\Administrator\\Desktop`,
一个他平时**根本看不到**的目录。

表现:
  - 「另存到桌面」存完了,他在桌面上翻遍也找不到
  - C 盘那个目录里悄悄多出 BOM表模板.xlsx、看板 HTML,
    而他完全不知情 —— 没有任何报错,只是东西不见了

这类 bug 不会自己暴露,只能靠断言钉住。

跑法:
    python t16_desktop.py
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import engine.paths as paths                      # noqa: E402

ROOT = Path(__file__).resolve().parent
FAILS: list[str] = []
N = [0]


def ck(name, ok, extra=""):
    N[0] += 1
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}"
          + (f" -> {extra}" if extra else ""))
    if not ok:
        FAILS.append(name)
    return ok


def main() -> int:
    print("\n=== 1. 桌面解析出来的必须是真桌面 ===")
    d = paths.desktop_dir()
    print(f"     桌面 = {d}")
    ck("返回的是一个存在的目录", d.is_dir(), str(d))
    ck("不是 C 盘用户目录下的那个假桌面",
       not str(d).lower().startswith(str(Path.home()).lower() + r"\desktop"),
       f"home={Path.home()} -> 拼出来的是假桌面:{d}")

    # 跟 Windows 自己报的位置对一次。这是唯一权威的答案来源。
    if os.name == "nt":
        import winreg
        with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\CurrentVersion"
                r"\Explorer\User Shell Folders") as k:
            raw = str(winreg.QueryValueEx(k, "Desktop")[0])
        truth = Path(os.path.expandvars(raw))
        ck("和注册表 User Shell Folders\\Desktop 一致",
           d.resolve() == truth.resolve(),
           f"注册表={truth} 程序={d}")

    print("\n=== 2. 代码里不许再出现 home 拼桌面 ===")
    # 只查**真的会被执行的**代码:去掉注释和文档串再找。
    # 注释里可以写 `Path.home()/"Desktop"` 来解释为什么不能那么写。
    #
    # ★ `paths.desktop_dir()` 自己那两处 `home()/"Desktop"` 是**故意的**
    #   兜底(非 Windows、以及注册表整个读不到时的最后一档),
    #   所以把这个函数整段摘掉再查 —— 它是唯一被允许的例外。
    bad = []
    for f in list(ROOT.glob("*.py")) + list((ROOT / "engine").glob("*.py")):
        if f.name == Path(__file__).name:
            continue
        src = f.read_text(encoding="utf-8")
        if f.name == "paths.py":
            src = re.sub(r"def desktop_dir\(\).*?\n(?=\S)", "", src,
                         flags=re.S)
        code = re.sub(r'""".*?"""', "", src, flags=re.S)
        code = re.sub(r"'''.*?'''", "", code, flags=re.S)
        code = re.sub(r"#.*$", "", code, flags=re.M)
        for m in re.finditer(r'home\(\)\s*/\s*[\'"]Desktop[\'"]'
                             r'|expanduser\(\s*[\'"]~[\'"]\s*\)\s*/\s*[\'"]Desktop[\'"]',
                             code):
            ln = code[:m.start()].count("\n") + 1
            bad.append(f"{f.name}:{ln}")
    ck("没有 `home()/\"Desktop\"` 这种拼法(实现本身除外)", not bad,
       f"-> {bad}")

    print("\n=== 3. 三处「桌面」入口都走 desktop_dir() ===")
    gui = (ROOT / "gui.py").read_text(encoding="utf-8")
    n = gui.count("paths.desktop_dir()")
    ck("gui.py 至少两处用 desktop_dir()", n >= 2, f"-> {n} 处")
    ck("取 BOM 模板走 desktop_dir()",
       "dst_dir = paths.desktop_dir()" in gui)
    ck("「另存到桌面」走 desktop_dir()",
       "paths.desktop_dir() if self.x_copy.get()" in gui)

    print("\n" + "=" * 54)
    if FAILS:
        print(f"失败 {len(FAILS)} / {N[0]}")
        for f in FAILS:
            print("  -", f)
        return 1
    print(f"全部通过({N[0]} 项)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
