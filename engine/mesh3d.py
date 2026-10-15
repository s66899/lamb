# -*- coding: utf-8 -*-
"""3D 网格:解析 + 纯 numpy 软件光栅化(不依赖 OpenGL / 浏览器)。

为什么自己写光栅化:
    需求是「在 exe 程序内直接看,不要跳浏览器、不要调外部软件」。
    Tk 本身没有 3D;引 OpenGL/pyopengl 要额外原生依赖,打包进 exe 很容易炸。
    纯 numpy 的 z-buffer 光栅化在这个量级完全够用 —— 实测 2 万三角面
    投影+排序只要 7ms,整帧(含扫描线填充)在 30~80ms,交互跟手。

提供:
    load_mesh()   STL(二进制/ASCII) / OBJ / PLY(ASCII) -> 顶点数组
    Raster        旋转/缩放/平移 + z-buffer + 平面着色,直接出 RGB 数组
    step_to_stl() STEP -> 二进制 STL(需要 OCP),带磁盘缓存
"""
from __future__ import annotations

import re
import os
import struct
import time
from pathlib import Path

import numpy as np

MESH_EXT = (".stl", ".obj", ".ply", ".3mf")
STEP_EXT = (".step", ".stp")


class MeshError(Exception):
    """解析失败。消息直接给本人看。"""


# ---------------------------------------------------------------- 解析
def load_stl(path: Path) -> np.ndarray:
    """返回 (N,3,3) 的三角面顶点数组。"""
    raw = Path(path).read_bytes()
    if len(raw) < 84:
        raise MeshError(f"文件太小,不像 STL:{len(raw)} 字节")
    n = struct.unpack_from("<I", raw, 80)[0]
    # 84 + 50*n == 文件大小 -> 二进制
    if 84 + n * 50 == len(raw) and 0 < n < 50_000_000:
        dt = np.dtype([("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")])
        rec = np.frombuffer(raw, dtype=dt, count=n, offset=84)
        return np.ascontiguousarray(rec["v"], dtype=np.float32)
    # 否则当 ASCII
    txt = raw.decode("utf-8", "replace")
    m = re.search(r"\bvertex\s+(\S+)\s+(\S+)\s+(\S+)", txt)
    if not m:
        raise MeshError("既不是二进制也不是 ASCII STL")
    vals = np.fromiter(
        (float(x) for mm in re.finditer(
            r"\bvertex\s+(\S+)\s+(\S+)\s+(\S+)", txt)
         for x in mm.groups()), dtype=np.float32)
    if vals.size < 9 or vals.size % 9:
        raise MeshError(f"ASCII STL 顶点不是 9 的倍数({vals.size})")
    return vals.reshape(-1, 3, 3)


def load_obj(path: Path):
    """OBJ -> (顶点数组, 面索引)。OBJ 的面可以是多边形,这里扇形拆三角。"""
    vtx, idx = [], []
    tri = []
    face = []
    for line in Path(path).read_text(encoding="utf-8", errors="replace").splitlines():
        s = line.strip()
        if not s or s[0] == "#":
            continue
        p = s.split()
        c = p[0]
        if c == "v":
            vtx.append((float(p[1]), float(p[2]), float(p[3])))
        elif c == "f":
            face = []
            for tok in p[1:]:
                h = tok.split("/")[0]
                if h:
                    face.append(int(h))
            if len(face) >= 3:
                for i in range(1, len(face) - 1):
                    tri.append((face[0], face[i], face[i + 1]))
    if not vtx or not tri:
        raise MeshError("OBJ 里没有顶点或三角面")
    v = np.asarray(vtx, dtype=np.float32)
    t = np.asarray(tri, dtype=np.int64)
    t = np.where(t > 0, t - 1, len(v) + t)          # OBJ 负索引 = 从后数
    return v, t


def load_ply(path: Path) -> np.ndarray:
    """只支持 ASCII PLY(够用,且这类文件都是导出的三角网格)。"""
    txt = Path(path).read_text(encoding="utf-8", errors="replace")
    if "format binary" in txt.split("\n")[0:8][-1:][0] if False else \
            "format binary" in txt[:400]:
        raise MeshError("只支持 ASCII PLY,这个是二进制的")
    lines = txt.splitlines()
    nv = nf = 0
    i = 0
    for i, l in enumerate(lines):
        if l.startswith("element vertex"):
            nv = int(l.split()[-1])
        elif l.startswith("element face"):
            nf = int(l.split()[-1])
        elif l.startswith("end_header"):
            break
    if not nv or not nf:
        raise MeshError("PLY 头里没有 vertex/face 数量")
    props, cur = [], None
    for l in lines[i + 1:]:
        p = l.split()
        if not p:
            continue
        if p[0] == "property":
            cur = None if p[1] == "list" else p[-1]
        elif p[0] == "end_header":
            break
    verts = np.empty((nv, 3), dtype=np.float32)
    j = i + 1
    for k in range(nv):
        p = lines[j + k].split()
        verts[k] = (float(p[0]), float(p[1]), float(p[2]))
    j += nv
    tris = np.empty((nf, 3), dtype=np.int64)
    for k in range(nf):
        p = lines[j + k].split()
        tris[k] = (int(p[1]), int(p[2]), int(p[3]))
    return verts[tris]


def load_mesh(path: Path) -> np.ndarray:
    """按扩展名分派,统一返回 (N,3,3) float32。"""
    p = Path(path)
    ext = p.suffix.lower()
    if ext == ".stl":
        return load_stl(p)
    if ext == ".obj":
        v, t = load_obj(p)
        return v[t]
    if ext == ".ply":
        return load_ply(p)
    if ext == ".3mf":
        raise MeshError("3MF 还没支持,先转成 STL")
    raise MeshError(f"不认识的网格格式:{ext}")


# ---------------------------------------------------------------- 渲染
class Raster:
    """软件光栅化器:绕 X/Y 转 + 缩放 + 平移,z-buffer 消隐,朗伯着色。

    图像以 RGB uint8 (H,W,3) 返回,调用方自己转成 Tk PhotoImage。
    """

    def __init__(self, tris: np.ndarray, bg=(16, 26, 44)):
        self.bg = np.array(bg, dtype=np.uint8)
        self.set_mesh(tris)
        # ★ 初值必须由 set_mesh 决定(默认斜 30/35 度),这里**不要再写 0**。
        #   以前 __init__ 在 set_mesh 之后又把 rx/ry 归零,
        #   于是 set_mesh 里那句「初始视角:斜 30/25 度,一眼能看出立体感」
        #   当场被覆盖 —— 打开就是正视图,每个面一样亮,
        #   本人说「没有立体感、像 2D 图」,根源就在这两行。
        self.zoom = 1.0
        self.pan = np.zeros(2)
        self._dirty = True

    def set_mesh(self, tris: np.ndarray):
        t = np.asarray(tris, dtype=np.float32)
        if t.ndim != 3 or t.shape[1:] != (3, 3) or t.shape[0] == 0:
            raise MeshError(f"三角面数组形状不对:{t.shape}")
        self.tris = t
        v = t.reshape(-1, 3)
        self.lo = v.min(axis=0).astype(np.float32)
        self.hi = v.max(axis=0).astype(np.float32)
        # ★ 用**包围盒中心**当旋转/取景中心,不用顶点均值。
        #   均值会被顶点数分布带偏 —— 实测 MTB-01 的均值比包围盒中心
        #   偏了 118mm(y 方向),于是 fit() 明明算好了范围,
        #   画面却一边留白一边把顶部裁掉。包围盒中心天然居中且对称。
        self.center = ((self.lo + self.hi) * 0.5).astype(np.float32)
        self.radius = float(max(
            np.linalg.norm(self.lo - self.center),
            np.linalg.norm(self.hi - self.center))) or 1.0
        # 初始视角:斜 30/25 度,一眼能看出立体感
        self.rx = 0.52
        self.ry = 0.62
        self._dirty = True

    def reset(self):
        self.rx, self.ry = 0.52, 0.62
        self.zoom = 1.0
        self.pan[:] = 0
        self._dirty = True

    # ---- 旋转矩阵 ----
    def _rot(self):
        cx, sx = np.cos(self.rx), np.sin(self.rx)
        cy, sy = np.cos(self.ry), np.sin(self.ry)
        # R = Ry * Rx  (行主序)
        return np.array([
            [cy, sy * sx, sy * cx],
            [0.0, cx, -sx],
            [-sy, cy * sx, cy * cx],
        ], dtype=np.float32)

    def project(self, w, h):
        """返回屏幕坐标 (N,3,2)、深度 (N,3)、可见掩码 (N,)。

        背面剔除在这里做:法线背对相机的三角形直接丢掉,三角面数能少一半,
        填充也快一倍。
        """
        R = self._rot()
        v = self.tris - self.center                 # (N,3,3)
        p = v @ R.T                                 # 转到相机系
        s = (min(w, h) * 0.42) * self.zoom / self.radius
        sx = p[..., 0] * s + w / 2 + self.pan[0]
        sy = -p[..., 1] * s + h / 2 + self.pan[1]   # 屏幕 y 向下
        sz = p[..., 2]
        # 背面剔除:叉积 z 分量 <= 0 的丢掉
        e1 = self.tris[:, 1] - self.tris[:, 0]
        e2 = self.tris[:, 2] - self.tris[:, 0]
        nrm = np.cross(e1, e2)
        facing = (nrm * R.T[2]).sum(axis=1) > 0     # 与视线(0,0,1)同向
        pts = np.stack([sx, sy], axis=-1)
        return pts, sz, facing

    def fit(self, w, h):
        """按**当前视角**把模型摆满画面。

        不能每帧都算 —— 一边转一边自动缩放,模型会「呼吸」,看着晕。
        所以只在:载入时、窗口尺寸变了、点了「适应窗口」时才调。
        用旋转后的包围盒**八个角**的投影范围来定尺寸,高瘦件能占满高度,
        扁宽件能占满宽度,不像用 min(w,h)*k 那样两头都留白。

        ★ zoom 是**倍率**,不是「每模型单位多少像素」。
          早先这里直接写 zoom = 700*0.86/ex(那是像素/模型单位),
          而 project() 里又乘了一遍 min(w,h)*0.42/radius ——
          两套单位混用,环形件直接被放大到屏幕外,整幅画一个像素都不剩。
          所以这里要拿「需要的像素比例」除以「当前基础比例」,换算成倍率。
        """
        R = self._rot()
        lo, hi = self.lo, self.hi
        corners = np.array([[x, y, z] for x in (lo[0], hi[0])
                            for y in (lo[1], hi[1]) for z in (lo[2], hi[2])],
                           dtype=np.float32)
        p = (corners - self.center) @ R.T
        ex = float(p[:, 0].max() - p[:, 0].min()) or 1.0
        ey = float(p[:, 1].max() - p[:, 1].min()) or 1.0
        need = min(w * 0.86 / ex, h * 0.86 / ey)   # 需要的 像素/模型单位
        base = (min(w, h) * 0.42) / self.radius    # 当前 像素/模型单位
        self.zoom = float(need / base) if base else 1.0
        self.pan[:] = 0
        self._dirty = True

    def render(self, w: int, h: int) -> np.ndarray:
        """光栅化,返回 (H,W,3) uint8。带 z-buffer。"""
        w = max(16, int(w))
        h = max(16, int(h))
        img = np.empty((h, w, 3), dtype=np.uint8)
        img[:] = self.bg
        if not len(self.tris):
            return img
        pts, sz, facing = self.project(w, h)
        idx = np.nonzero(facing)[0]
        if not len(idx):
            return img
        zbuf = np.full((h, w), np.inf, dtype=np.float32)

        # 光照。两盏灯 + 环境光 + 高光,全部在**相机系**里算。
        #
        # ★ 为什么必须在相机系:
        #   用**世界系**的固定灯去照一个一直在转的零件,转到某些角度
        #   正面那几片会正好背光,整个零件一片死暗 ——
        #   实测过:亮度 min/中位/max = 43/42/62,跨度只有 19,
        #   「立体感」当然一点都没有(那还只是背光的情况,不是 bug)。
        #   把法线先转到相机系(`n_world @ R.T`,和 project() 里
        #   顶点 `v @ R.T` 同一个变换),灯就永远从观者这边打过来,
        #   转��哪一面都看得清。网页端(WebGL)也是这么做的。
        e1 = self.tris[:, 1] - self.tris[:, 0]
        e2 = self.tris[:, 2] - self.tris[:, 0]
        nw = np.cross(e1, e2)
        ln = np.linalg.norm(nw, axis=1, keepdims=True)
        ln[ln == 0] = 1
        nw = nw / ln
        nc = nw @ self._rot().T          # -> 相机系
        # 背面剔除保证 nc[:,2] > 0,这里只是兜底(有的 STL 绕序相反)
        flip = nc[:, 2] < 0
        if flip.any():
            nc = np.where(flip[:, None], -nc, nc)
        L1 = np.array([-0.42, 0.58, 0.70], dtype=np.float32)
        L2 = np.array([0.62, -0.22, 0.45], dtype=np.float32)
        L1 /= np.linalg.norm(L1)
        L2 /= np.linalg.norm(L2)
        d1 = np.clip(nc @ L1, 0, 1)
        d2 = np.clip(nc @ L2, 0, 1)
        spec = d1 ** 22
        # 配色:浅钢蓝 + 深藏青网格线,和网页端一致。
        # 原来的 (104,158,214) 配 0.26 环境项,背光面只剩 ~27,27,27,
        # 落在深色背景上就是一团黑,轮廓全糊 —— 本人说「颜色好暗、看不清」。
        base = np.array([170, 205, 245], dtype=np.float32)
        amb = np.array([52, 74, 108], dtype=np.float32)
        cols = (base[None, :] * (0.30 * d1[:, None] + 0.24 * d2[:, None])
                + amb[None, :] + 90.0 * spec[:, None])
        # 深度雾:越远越往背景色靠,前后层次分得开(z 越大越远,
        # 和 project() 里「远的先画」的排序一致)。
        # Z = sz 必须在**下面**那一行之前就有值,所以这里直接用 sz。
        fog = np.clip(sz.mean(axis=1) / max(self.radius, 1e-6) * 0.5,
                      0.0, 0.38)
        cols = cols + (self.bg[None, :].astype(np.float32) - cols) * fog[:, None]
        cols = np.clip(cols, 0, 255).astype(np.uint8)

        Z = sz
        P = pts
        C = cols
        y0 = np.clip(np.floor(P[:, :, 1].min(axis=1)), 0, h - 1).astype(np.int32)
        y1 = np.clip(np.ceil(P[:, :, 1].max(axis=1)), 0, h - 1).astype(np.int32)
        x0 = np.clip(np.floor(P[:, :, 0].min(axis=1)), 0, w - 1).astype(np.int32)
        x1 = np.clip(np.ceil(P[:, :, 0].max(axis=1)), 0, w - 1).astype(np.int32)
        bw = x1 - x0 + 1
        bh = y1 - y0 + 1
        box = bw.astype(np.int64) * bh.astype(np.int64)
        order = idx[np.argsort(-Z[idx].mean(axis=1))]     # 远的先画
        for i in order:
            if box[i] <= 0 or box[i] > 4_000_000:
                continue
            ax, ay = P[i, 0]
            bx, by = P[i, 1]
            cx_, cy_ = P[i, 2]
            d = (by - cy_) * (ax - cx_) + (cx_ - bx) * (ay - cy_)
            if d == 0:
                continue
            X, Y = np.meshgrid(np.arange(x0[i], x1[i] + 1),
                               np.arange(y0[i], y1[i] + 1))
            w0 = ((by - cy_) * (X - cx_) + (cx_ - bx) * (Y - cy_)) / d
            w1 = ((cy_ - ay) * (X - cx_) + (ax - cx_) * (Y - cy_)) / d
            w2 = 1.0 - w0 - w1
            m = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
            if not m.any():
                continue
            # ★ z-buffer:画家算法在「几乎侧视的平面」(圆锥底盘)上会
            #   把背面的面片画到前面,表现为一条横贯画面的细线。
            #   重心权重已经有了,插值一个 z 就能正确消隐,几乎不额外花钱。
            zz = w0 * Z[i, 0] + w1 * Z[i, 1] + w2 * Z[i, 2]
            sub_z = zbuf[y0[i]:y1[i] + 1, x0[i]:x1[i] + 1]
            m &= zz < sub_z
            if not m.any():
                continue
            sub_z[m] = zz[m]
            img[y0[i]:y1[i] + 1, x0[i]:x1[i] + 1][m] = C[i]
        return img


# ---------------------------------------------------------------- STEP
def _ocp():
    """拿到 OCP。**没有就明说**,不要假装能转。

    OCP 的 `__init__.py` 会无条件跑这么一句:
        os.add_dll_directory(<site-packages>/vtk.libs)
    而 OCC 的 dll 其实在同级的 `cadquery_ocp.libs` 里(文件顶部那个
    delvewheel patch 才是对的)。`vtk.libs` 是 cadquery 构建时留下的
    无用代码,但 pip 只装 cadquery-ocp 时它**根本不存在**,
    于是 import 直接抛 `FileNotFoundError: 系统找不到指定的文件`。

    这里先把两个目录都准备好再 import:
      * 有的 -> add_dll_directory
      * 没有但能建 -> **建一个空的**骗过它那一行
    「建一个」这一步对 exe 尤其关键:PyInstaller 不会凭空造出
    `vtk.libs`,打包后这个目录必然缺失,于是 exe 里 STEP 转换
    会在第一次点击时才炸 —— 而报错信息(找不到 vtk.libs)
    和真实原因(少带了一个目录)完全对不上。
    """
    import importlib
    import importlib.util
    import os
    root = os.path.dirname(os.path.dirname(
        os.path.abspath(importlib.util.find_spec("OCP").origin)))
    handles = []
    for name in ("cadquery_ocp.libs", "vtk.libs"):
        d = os.path.join(root, name)
        if not os.path.isdir(d):
            try:
                os.makedirs(d, exist_ok=True)
            except OSError:
                continue          # 建不了就跳过,让 OCP 自己报错
        try:
            handles.append(os.add_dll_directory(d))
        except OSError:
            pass
    try:
        from OCP.STEPControl import STEPControl_Reader       # noqa: F401
        n = sum(len(fs) for _, _, fs in os.walk(
            os.path.join(root, "cadquery_ocp.libs"))) if os.path.isdir(
            os.path.join(root, "cadquery_ocp.libs")) else 0
        return True, f"OCC dll {n} 个" if n else ""
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def ocp_available() -> tuple:
    """(能不能转 STEP, 不能的话为什么)。"""
    try:
        ok, err = _ocp()
    except Exception as e:
        return False, f"OCP 没装或装坏了({type(e).__name__}: {e})"
    return ok, err


def step_to_stl(step: Path, stl: Path, div: int = 60,
                log=None) -> tuple:
    """STEP -> 二进制 STL。div 越小越精细(默认 L/60,屏幕上够看)。

    缓存策略:STL 比 STEP **小 1~2 个数量级**(实测 1.8MB STEP -> 570KB STL),
    所以第一次转好就放 _网格缓存/,以后直接读缓存,秒开。
    """
    from OCP.STEPControl import STEPControl_Reader
    from OCP.IFSelect import IFSelect_RetDone
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopAbs import TopAbs_FACE
    from OCP.BRepMesh import BRepMesh_IncrementalMesh
    from OCP.StlAPI import StlAPI_Writer
    from OCP.BRepGProp import BRepGProp
    from OCP.GProp import GProp_GProps

    t0 = time.time()
    rd = STEPControl_Reader()
    if rd.ReadFile(str(step)) != IFSelect_RetDone:
        raise MeshError(f"STEP 读不进来:{Path(step).name}")
    rd.TransferRoots()
    shape = rd.OneShape()

    nf = 0
    e = TopExp_Explorer(shape, TopAbs_FACE)
    while e.More():
        nf += 1
        e.Next()
    if not nf:
        raise MeshError(f"这个 STEP 里没有面,不是实体零件:{Path(step).name}")

    # 用体积开三次方估特征长度,分层偏差随零件大小走
    props = GProp_GProps()
    BRepGProp.VolumeProperties_s(shape, props)
    vol = props.Mass()
    L = vol ** (1 / 3.0) if vol > 0 else 50.0

    BRepMesh_IncrementalMesh(shape, L / div, False, 0.5, True).Perform()
    stl.parent.mkdir(parents=True, exist_ok=True)

    # ★ 必须写到**短的 ASCII 临时路径**,再用 Python 挪到目标位置。
    #
    # 实测 OCC 的 StlAPI_Writer 对路径长度是**按字节**算的,而且中文
    # 一个字算 3 字节(UTF-8)或按本地代码页算:
    #     D:\助手工程师\a2.stl                              (15 字符)  成功
    #     D:\助手工程师\项目\马桶项目改动零件加工\a3.stl     (29 字符)  失败
    #     D:\lh\aaaa…a.stl                                 (33 字符纯 ASCII) 成功
    # 所以不是「中文不能写」也不是「太长」,是**中文让字节数暴涨**。
    # 写盘失败时它只返回 False,**一句错误都不给** —— 表现就是
    # 「STEP 转 STL 失败」而查不出原因,极难定位。
    #
    # 绕法:先落到 %TEMP% 下的短名,再 shutil.move 过去。
    # move 是 Python 干的,没有长度限制。
    import shutil
    import tempfile
    tmpdir = Path(tempfile.gettempdir())
    tmp = tmpdir / f"_lhex_{os.getpid()}_{abs(hash(str(stl))) % 10**8}.stl"
    for p_ in (tmp,):
        try:
            if p_.exists():
                p_.unlink()
        except OSError:
            pass
    w = StlAPI_Writer()
    w.ASCIIMode = False                 # 默认 ASCII,体积大几十倍
    ok = False
    try:
        ok = bool(w.Write(shape, str(tmp)))
        if not ok or not tmp.exists():
            raise MeshError("OCC 没能写出网格")
        shutil.move(str(tmp), str(stl))
    finally:
        try:
            if tmp.exists():
                tmp.unlink()
        except OSError:
            pass
    dt = time.time() - t0
    if log:
        log(f"    {Path(step).name}: {nf} 面 -> "
            f"{stl.stat().st_size/1024:.0f} KB  {dt:.2f}s")
    return stl, {"faces": nf, "feature": L, "dev": L / div, "sec": dt}


# ---------------------------------------------------------------- 缓存
# ★ 预览用**粗网格**。div 是「特征长度 / 偏差」,div 越小越精细。
#   实测:同一个零件 div=60 出 5 千~1 万面,div=20 只剩 1/9 ——
#   而本人看的是**外形和尺寸**,内部倒角、圆角细分根本看不出来,
#   光是那 9 倍的三角面就够把网页预览拖卡、手机上直接转不动。
#   直线段和外形尺寸不受影响(顶点位置本来就精确),
#   受影响的只有**曲面**的逼近精度 —— 半径测量在小圆角上会略偏。
#   想看细节改成 60,只要删掉 _网格缓存\ 或改文件名即可(缓存键带 div)。
PREVIEW_DIV = 20


def mesh_cache_dir(proj_root) -> Path:
    """网格缓存目录。**故意用 ASCII 目录名**。

    缓存键里要拼文件名和大小,本身没问题;但 OCC 的 STL 写入器
    对中文路径是按字节算长度的(见 step_to_stl 的注释),
    这个目录纯内部产物,统一 ASCII 少一类意外。
    """
    root = Path(proj_root) if proj_root else Path.home()
    return root / "_网格缓存"


def project_root_of(path) -> Path | None:
    """从文件往上找项目根(有 `项目配置.json` 的那一层)。

    **不能靠 `parents[N]` 猜** —— 交付物目录下面还有分类子目录,
    `3_3D图/机加工件/x.STEP` 和 `4_2D图/x.pdf` 深度就不同,
    写死一个 N 就是「换个分类层级,缓存写到别处去了」。
    """
    p = Path(path)
    for q in [p] + list(p.parents):
        try:
            if (q / "项目配置.json").is_file():
                return q
        except OSError:
            break
    return None


def mesh_cache_path(step: Path, proj_root=None, div: int = 0) -> Path:
    """STEP -> 它该用的缓存 STL 路径。

    键 = 文件名 + 大小 + mtime + **div**。前三个保证「STEP 改了就重转」;
    **div 必须进键** —— 否则把 PREVIEW_DIV 从 20 调回 60 之后,
    键完全没变,于是命中旧缓存,拿到**还是 20 的那一份**。
    表现是「我改了参数怎么没反应」,而日志明明打印了新的 div。
    (最容易查的一类:改配置没反应,第一反应永远是「缓存」。)
    """
    step = Path(step)
    root = proj_root or project_root_of(step)
    st = step.stat()
    key = f"{step.stem}_{st.st_size}_{int(st.st_mtime)}_d{div or PREVIEW_DIV}.stl"
    return mesh_cache_dir(root) / key


def ensure_step_mesh(step, proj_root=None, div: int = 0, log=None):
    """STEP -> 缓存 STL 路径(有缓存就直接返回,不重转)。

    ``div=0`` 表示用 `PREVIEW_DIV`(预览的默认粗网格)。
    返回 ``(stl_path, info)``;转不了返回 ``(None, 错误字符串)`` ——
    **不抛异常**:构建看板时几十个文件里有一个坏的不该让整块看板失败。
    """
    step = Path(step)
    div = div or PREVIEW_DIV
    try:
        stl = mesh_cache_path(step, proj_root, div)
        if stl.is_file() and stl.stat().st_size > 84:
            if log:
                log(f"    {step.name}: 缓存 {stl.stat().st_size / 1024:.0f} KB")
            return stl, {"cached": True, "div": div}
        stl.parent.mkdir(parents=True, exist_ok=True)
        _, info = step_to_stl(step, stl, div=div, log=log)
        return stl, {"cached": False, "div": div, **info}
    except Exception as e:                      # noqa: BLE001 —— 见 docstring
        return None, f"{type(e).__name__}: {e}"
