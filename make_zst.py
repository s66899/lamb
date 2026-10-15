# -*- coding: utf-8 -*-
"""做一个 **zstd 高压缩** 的分发包(.tar.zst),比 zip 小一大截。

为什么需要第二个包:
    zip(deflate-9) 出来 107.5 MB,**超过 GitHub 单文件 100 MB 的硬限制**,
    push 会被直接拒。zstd-19 在这些 dll 上能压到 15%(deflate 只有 21%)。

用法:
    python make_zst.py            # 直接出 助手工程师-便携版.tar.zst
解压:
    Windows 11 自带 tar:`tar --zstd -xf 助手工程师-便携版.tar.zst`
    或用 7-Zip(选 .tar.zst → 再解 .tar 两层)
"""
import io
import tarfile
import time
from pathlib import Path

from compression import zstd

OUT = Path(r"D:\助手工程师\发布")
APP = OUT / "助手工程师"
SKIP_DIRS = {"项目", "日志"}          # 用户数据,不是软件的一部分

README = """助手工程师 —— 便携版(zstd 高压缩)
================================================
解压:Windows 自带的 tar 就行
      tar --zstd -xf 助手工程师-便携版.tar.zst
      (或用 7-Zip,先解 .tar.zst 再解里面的 .tar)

运行:双击「助手工程师.exe」,不需要装 Python,不需要联网。

★ 为什么有两个包(.zip 和 .tar.zst):
    .zip 双击就能解,最省事;但有 107 MB,超过 GitHub 单文件 100 MB 的
    硬限制。.tar.zst 小 40%,要上传到 GitHub/Gitee 就用它。

★ 3D 预览必须在程序里点「打开看板」:
    它会自动起本地服务(http://127.0.0.1:8900/)再用浏览器打开。
    直接双击 HTML 的话,浏览器安全策略不许网页读本地网格,预览是空的。
"""


def add(tar: tarfile.TarFile, p: Path, arc: str):
    ti = tar.gettarinfo(str(p), arcname=arc)
    if ti.isreg():
        with p.open("rb") as f:
            tar.addfile(ti, f)
    else:
        tar.addfile(ti)


def main():
    tar_path = OUT / "_tmp_portable.tar"
    zst_path = OUT / "助手工程师-便携版.tar.zst"
    t0 = time.time()
    files = []
    for p in sorted(APP.rglob("*")):
        rel = p.relative_to(APP)
        if rel.parts and rel.parts[0] in SKIP_DIRS:
            continue
        files.append((p, str(rel).replace("\\", "/")))
    raw = sum(p.stat().st_size for p, _ in files)
    print(f"待打包 {len(files)} 个文件,{raw / 1048576:.1f} MB", flush=True)

    with tarfile.open(tar_path, "w") as tar:
        ti = tarfile.TarInfo("双击 助手工程师.exe 即可运行.txt")
        data = README.encode("utf-8")
        ti.size = len(data)
        ti.mtime = int(time.time())
        tar.addfile(ti, io.BytesIO(data))
        for i, (p, arc) in enumerate(files):
            add(tar, p, f"助手工程师/{arc}")
            if (i + 1) % 200 == 0:
                print(f"  打包 {i + 1}/{len(files)}", flush=True)
    tar_size = tar_path.stat().st_size

    print("压缩中(zstd-19,流式)…", flush=True)
    # ★ 必须用 `zstd.open(...)` 流式写,不能用 `ZstdCompressor.compress()`。
    #   后者吐的是**没有结束标记**的一帧(设计上是给 zip/tarfile 内部用的),
    #   单独存成 .zst 就是坏文件 —— `tar --zstd -tf` 报
    #   "Truncated input file"。
    #   这个坑很隐蔽:Python 自己 decompress 回去是好的,只有外部工具读不了。
    with zstd.open(zst_path, "wb", level=19) as out, \
            tar_path.open("rb") as f:
        while True:
            chunk = f.read(4 << 20)
            if not chunk:
                break
            out.write(chunk)

    tar_path.unlink()
    zs = zst_path.stat().st_size
    print(f"tar      {tar_size / 1048576:.1f} MB")
    print(f"tar.zst  {zs / 1048576:.1f} MB  ({zs / raw * 100:.0f}%)")
    print(f"耗时     {time.time() - t0:.0f}s")
    print(f"路径     {zst_path}")


if __name__ == "__main__":
    main()