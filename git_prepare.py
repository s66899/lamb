# -*- coding: utf-8 -*-
"""准备 GitHub 仓库:确认该提交的、不该提交的,并给出可直接粘贴的命令。

为什么不直接 `git init` + `git add .`:
    `发布/` 380 MB、`项目/` 74 MB(里面有源表和交付物)。
    `git add .` 会把它们一起吞进去 —— 仓库当场废掉,而且**删不干净**
    (历史里还在,`.gitignore` 只对**未跟踪**的文件生效)。
    所以这里先做**提交前体检**,把「哪些会进去、哪些不会」列清楚。

跑法:
    python git_prepare.py           # 体检 + 打印命令,不执行任何 git 操作
    python git_prepare.py --yes     # 真的执行 git init/add/commit
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

APP = Path(r"D:\助手工程师")
VERSION = "v1.0.0"
REPO_NAME = "助手工程师"

# 必须排除的:二进制、用户数据、构建中间物
MUST_EXCLUDE = {
    "发布": "380 MB 的 exe + 两个压缩包 —— 走 Release 附件,绝不进仓库",
    "项目": "用户数据:源表、交付物、核对结果",
    "日志": "日志",
    "_沙箱测试项目": "测试沙箱,每次跑测试都会重建",
    "_打包": "PyInstaller 工作目录",
    "__pycache__": "Python 字节码",
    "build": "构建产物",
    "dist": "构建产物",
    "外部BOM表": "测试用的临时目录",
}


def run_git(args, cwd=APP):
    p = subprocess.run(["git"] + args, cwd=str(cwd), capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def dir_size(p: Path) -> int:
    if not p.exists():
        return 0
    if p.is_file():
        return p.stat().st_size
    return sum(f.stat().st_size for f in p.rglob("*") if f.is_file())


def collect(what: set) -> list[Path]:
    out = []
    for name in what:
        out += [p for p in APP.rglob(name) if ".git" not in p.parts]
    return out


def main() -> int:
    print("=" * 62)
    print("GitHub 发布准备 —— 提交前体检")
    print("=" * 62)

    print("\n【1】必须排除的东西")
    total_excl = 0
    for name, why in MUST_EXCLUDE.items():
        hits = collect({name})
        sz = sum(dir_size(p) for p in hits)
        total_excl += sz
        mark = "✗ 仍存在" if hits else "— 没有"
        print(f"  {mark:>8}  {name:<18} {sz / 1048576:>8.1f} MB   {why}")
    print(f"\n  合计排除 {total_excl / 1048576:.0f} MB —— "
          f"这些进仓库就废了")

    print("\n【2】.gitignore 是否盖住了")
    gi = APP / ".gitignore"
    if gi.is_file():
        txt = gi.read_text(encoding="utf-8")
        for name in MUST_EXCLUDE:
            hit = (name + "/") in txt or (name + "\\") in txt
            print(f"  {'OK ' if hit else '缺!'}  {name}")
    else:
        print("  缺! 没有 .gitignore")

    print("\n【3】将要提交的源码(粗算)")
    skip = set(MUST_EXCLUDE) | {".git", "资源"}
    files, sz = [], 0
    for p in APP.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(APP)
        if rel.parts[0] in skip or "__pycache__" in rel.parts:
            continue
        if p.suffix in (".pyc", ".bak", ".tmp"):
            continue
        files.append(rel)
        sz += p.stat().st_size
    print(f"  {len(files)} 个文件,合计 {sz / 1024:.0f} KB")
    for f in sorted(files)[:14]:
        print(f"    {f.as_posix()}")
    if len(files) > 14:
        print(f"    … 还有 {len(files) - 14} 个")
    big = [f for f in files if (APP / f).stat().st_size > 200 * 1024]
    if big:
        print("\n  ⚠ 超过 200 KB 的文件:")
        for f in big:
            print(f"    {(APP / f).stat().st_size / 1024:>8.0f} KB  {f.as_posix()}")
        print("    （模板 xlsx / 图标之类，提交没问题；但**绝不能**是 exe/zip。")
    else:
        print("  没有超过 200 KB 的文件 —— 干净")

    print("\n【4】发布产物（走 Release 附件，不进仓库）")
    rel = APP / "发布"
    for p in sorted(rel.iterdir()):
        if p.is_file():
            print(f"  {p.stat().st_size / 1048576:>8.1f} MB  {p.name}")
        else:
            print(f"  {dir_size(p) / 1048576:>8.1f} MB  {p.name}/  "
                  f"(本地自用)")
    sums = rel / "SHA256SUMS.txt"
    if sums.is_file():
        print("\n  校验和:")
        for line in sums.read_text(encoding="utf-8").splitlines():
            if line and not line.startswith("#"):
                print("   ", line)

    print("\n" + "=" * 62)
    print("下面这些命令在 D:\\助手工程师 里执行（先 cd 过去）")
    print("=" * 62)
    print(f"""
git init
git add .
git status --short                  ← ★ 先看这一行有没有意外的 exe/zip
git commit -m "{VERSION} 首个正式版"
git branch -M main
git remote add origin https://github.com/<你的账号>/{REPO_NAME}.git
git push -u origin main
git tag -a {VERSION} -m "{VERSION}"
git push origin {VERSION}
""")
    print("然后到仓库页面：")
    print(f"  Releases -> Draft a new release -> 选 {VERSION}")
    print("  正文粘贴 RELEASE_NOTES.md 的内容")
    print("  附件拖入 发布\\ 里的 .tar.zst / .zip / SHA256SUMS.txt")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())