# -*- coding: utf-8 -*-
"""给分发包算 SHA256,写成 `SHA256SUMS.txt` 放在 Release 里。

为什么要有这个:
    下载的是几百 MB 的压缩包,传输出错、被人替换、下载到一半断线 ——
    这三种情况**看不出来**,因为包照样能解开,只是解出来的东西不对。
    有了校验和,对方一条命令就能确认拿到的是不是完整的那一份:

        Windows  PowerShell:
            Get-FileHash 助手工程师-便携版.zip -Algorithm SHA256
        Linux / Git Bash:
            sha256sum -c SHA256SUMS.txt

用法:
    python make_sums.py
"""
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

OUT = Path(r"D:\助手工程师\发布")
SKIP = {"SHA256SUMS.txt"}
CHUNK = 4 << 20


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        while True:
            b = f.read(CHUNK)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def main() -> int:
    files = sorted(
        p for p in OUT.iterdir()
        if p.is_file() and p.suffix.lower() in (".zip", ".zst", ".7z", ".exe")
        and p.name not in SKIP)
    if not files:
        print("发布目录里没有可校验的分发包。")
        print("先跑:  python make_zst.py   然后   python make_zip.py")
        return 1
    lines = []
    for p in files:
        print(f"  算 {p.name} ...", end="", flush=True)
        d = sha256(p)
        lines.append(f"{d}  {p.name}")
        print(f" {d[:16]}...  {p.stat().st_size / 1048576:.1f} MB")
    dst = OUT / "SHA256SUMS.txt"
    body = ("# 助手工程师 分发包校验和\n"
            "# 校验:  sha256sum -c SHA256SUMS.txt\n"
            "# 或  :  Get-FileHash <文件名> -Algorithm SHA256\n\n"
            + "\n".join(lines) + "\n")
    dst.write_text(body, encoding="utf-8")
    print(f"\n已写出 {dst}")
    print(f"共 {len(files)} 个文件")
    return 0


if __name__ == "__main__":
    sys.exit(main())