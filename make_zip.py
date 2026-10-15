# -*- coding: utf-8 -*-
"""做一个可分发的 zip(不含用户项目数据),放到 发布\\ 下。

用法:
    python make_zip.py            # 默认 deflate level 6
    python make_zip.py 9          # 更狠的压缩,慢一点、体积小一点
"""
import sys
import time
import zipfile
from pathlib import Path

OUT = Path(r"D:\助手工程师\发布")
APP = OUT / "助手工程师"
SKIP_DIRS = {"项目", "日志"}          # 用户数据,不是软件的一部分

README = """助手工程师 —— 便携版
========================================
运行:双击「助手工程师.exe」即可,不需要装 Python,不需要联网。

第一次用:
  1. 双击 助手工程师.exe
  2. 欢迎页 ->「导入已有 BOM 表项目」或「新建项目」
  3. 正式开工前先点左下角的「使用说明书」,里面有完整步骤

两个必须知道的点
----------------
* STEP / 工程图要看 3D 和 PDF,请**在程序里点「打开看板」**。
  它会自动起本地服务(http://127.0.0.1:8900/)再用浏览器打开。
  直接双击 HTML 文件的话,浏览器安全策略不许网页读本地网格,
  3D 预览会是空的。

* 换电脑:整个文件夹拷走就行。用户的项目、日志在 exe 同级的
  「项目」「日志」两个目录里(本压缩包不含这两个目录)。

自检:命令行跑 助手工程师.exe doctor,看「STEP 转换」是不是
     OK(OCP)。那一行不是 OK 的话,3D 预览和看板网格都不会有。
"""


def iter_files():
    for p in sorted(APP.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(APP)
        if rel.parts and rel.parts[0] in SKIP_DIRS:
            continue
        yield p, str(rel).replace("\\", "/")


def main():
    level = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    zip_path = OUT / "助手工程师-便携版.zip"
    files = list(iter_files())
    raw = sum(p.stat().st_size for p, _ in files)
    t0 = time.time()
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED,
                         compresslevel=level) as z:
        z.writestr("双击 助手工程师.exe 即可运行.txt", README)
        for i, (p, arc) in enumerate(files):
            z.write(p, f"助手工程师/{arc}")
            if (i + 1) % 1000 == 0:
                print(f"  {i + 1}/{len(files)}", flush=True)
    zs = zip_path.stat().st_size
    print(f"压缩级别 {level}")
    print(f"文件数   {len(files) + 1}")
    print(f"原始     {raw / 1048576:.1f} MB")
    print(f"压缩后   {zs / 1048576:.1f} MB  ({zs / raw * 100:.0f}%)")
    print(f"耗时     {time.time() - t0:.0f}s")
    print(f"路径     {zip_path}")


if __name__ == "__main__":
    main()