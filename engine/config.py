# -*- coding: utf-8 -*-
"""🐑 助手工程师 —— 默认配置模板与合并。

所有可变项都在配置里,换项目不改代码。
"""

from __future__ import annotations

DEFAULT = {
    "project": {
        "name": "",
        "description": "",
        "code": "",            # 项目代号,用于文件名(留空则用图号)
    },
    # 数据源:可以是项目内 1_源数据,也可以是外部绝对路径(只读)
    "sources": [],           # [{"tag":"A","path":"...","sheet":null,"copy":false}]
    # 图片源:BOM 表决定「有哪些零件、要什么交付物」,这里只决定「图用哪张」。
    # {"机加工件": "D:/.../机加工件物料表_带图.xlsx", ...}
    # 必须单列一个字段,不能靠 sources —— sources 是零件表,BOM 优先时会先读
    # BOM 表,图就跟着 BOM 表里那张旧图走了(实测你更新了源表图,BOM 表没同步,
    # 看板一直显示旧的)。图源独立,图永远以源表为准。
    "imageSources": {},
    "extract": {
        "sheet": None,            # null = 第一个工作表
        "dataColumns": 10,        # 参与读写的列数(A..J)
        "headerRow": 2,           # 表头所在行
        "firstDataRow": 4,        # 数据起始行
        "sectionColumn": 2,       # 分类段行所在的列
        "noColumn": 1,
        "imgColumn": 2,
        "partNumberColumn": 3,
        "nameColumn": 4,
        "materialColumn": 5,
        "qtyColumn": 6,
        "craftColumn": 7,
        "noteColumn": 8,
        "redColumn": 8,           # 底色判定为「新改动」的列
        "redColors": ["FFFF0000", "FFC00000", "FFE00000", "FFFF9999"],
        "newNote": "新加工件",
        "keepRedFill": True,
        # 源表里人在 I/J/K/L 手工写的意图标注(STEP / 出工程图STEP / 新 / 改),
        # 这些是最权威的「这件要不要出图」信号,要带进看板。
        "markColumns": [9, 10, 11, 12],
    },
    "categories": {
        # 固定顺序,看板与目录都按这个排,不混放
        "order": ["3D打印件", "塑胶件", "钣金件", "机加工件", "外购件"],
        "display": {},         # 分类 -> 看板色值 class
        # 段名直接决定分类
        "directSections": {"3D打印件": "3D打印件", "塑胶件": "塑胶件",
                           "钣金件": "钣金件", "外购件": "外购件",
                           "标准件": "外购件", "采购件": "外购件"},
        # 这些段内要再按规则细分(加工段里混着标准件)
        "openSections": ["机加件", "机加工件", "加工件", "机加", "五金件"],
        # 图号前缀 -> 判为加工件。
        # 旧版是空列表,导致「机加件」开放段里的所有行都掉进外购件,
        # 机加工件分类在看板上一个不剩(实测 18 件全丢)。这里补一套通用
        # 机加件前缀兜底,项目导入后还会按实际表再算一份建议。
        "machinedPrefixes": [
            "MT-", "mt-", "ZB-", "zb-", "LG-", "lg-", "FBZ", "fbz",
            "FB-", "fb-", "DB-", "db-", "KT-", "kt-", "KT_", "AMT",
            "AMIFENGDIAN", "A03-", "a03-", "JHZ", "jhz-", "WSG-", "wsg-",
            "GUAGOU", "KTU", "AM-", "JB-", "jb-", "SH-", "sh-", "CX-",
            "cx-", "SZ-", "sz-", "GJ-", "gj-", "DL-", "dl-", "PG-",
            "pg-", "HUB", "hub-", "SL-", "sl-", "BL-", "bl-", "JS-",
            "js-", "CG-", "cg-", "BX-", "bx-", "TS-", "ts-", "YJ-",
            "yj-", "LD-", "ld-", "ZC-", "zc-", "SY-", "sy-",
        ],
        # 图号或名称含关键字 -> 判为外购件(标准件/辅料)。
        # 注意别收「水管」「软管」这类词:机械零件名里很常见
        # (实测「污水管支撑B」是机加件),会被误抓进外购件。
        "purchaseKeywords": [
            "螺丝", "螺钉", "螺母", "螺栓", "垫片", "垫圈", "弹簧", "轴承",
            "卡扣", "卡簧", "铰链", "拉手", "把手", "轮子", "脚轮", "胶水",
            "胶带", "密封圈", "密封条", "O型圈", "油封", "铜柱", "铜螺母",
            "压铆", "端子", "排针", "屏蔽罩", "马达", "电机", "齿轮",
            "皮带", "轴承座", "导轨", "滑块", "开关", "插座", "接头",
            "接插件", "定位柱", "支柱", "螺杆", "导柱",
        ],
        # 图号前缀认不出来时,再按名称里的机加词汇兜底。
        # 开放段(图加件/五金件)里既有标准件也有自制件,前缀覆盖不全,
        # 实测「03-aB_改_B 卷簧轴加长B」就是前缀认不出、前缀表也没有的。
        "machinedKeywords": [
            "轴", "销", "法兰", "丝座", "连杆", "摇臂", "凸轮", "阀体",
            "铝型材", "端盖", "盖板", "面板", "支脚", "地脚", "底板",
            "支架", "压板", "挡板", "垫块", "定位块", "接水盘", "安装座",
            "固定件", "固定盖", "翻版", "拉簧连接",
        ],
        "machinedCategory": "机加工件",
        "purchaseCategory": "外购件",
        "unmatchedCategory": "外购件",
        "dedupe": ["外购件"],      # 跨样机去重(数量累加)的分类
        "dedupeKey": "name",       # name | partNumber
        "subfolders": True,        # 交付物目录下按分类建子目录
    },
    # 交付物只有两类,不再拆成「STEP零件 / 工程图 / 2D图」三个:
    #   3D图(STEP) -> 3_3D图
    #   2D图(工程图) -> 4_2D图
    # 「工程图就是 2D 图」,单独再开一个 4_工程图 目录只会让人以为
    # 有两种东西要交,文件放错目录还查不出来。
    "deliverables": {
        "step": {"label": "3D图(STEP)", "ext": ".step", "dirKey": "step",
                 "cats": ["机加工件", "塑胶件", "钣金件", "3D打印件"],
                 # 别名:导入别人(或旧版自己)生成的 BOM 表时,表头写的是
                 # 老名字。不认这些别名的话,读回来的表一个交付物都认不出,
                 # 看板会显示「零需求」—— 明明表里写着 42 个 STEP。
                 "aliases": ["STEP零件", "STEP", "3D图", "3D", "三维图"]},
        # 2D 图默认平铺放在 4_2D图 根下,不按分类建子目录。
        # 历史项目(以及旧版 bomkit 的 2D图/)都是这么存的;若跟着按分类
        # 建子目录,整批工程图会被判成「缺失」—— 实测 51 个需求一个都
        # 匹配不上。文件多到需要分类时,把 subfolder 改成 true 即可。
        "2d":   {"label": "2D图(工程图)", "ext": ".pdf", "dirKey": "2d",
                 "cats": ["机加工件", "钣金件"], "subfolder": False,
                 "aliases": ["工程图", "2D图", "2D", "图纸"]},
        # 总装图 = 装配体 STEP + **同名截图**。P5 新增。
        #
        # `cats: []` 是刻意的,三个后果都是要的:
        #   1. 不进任何分类白名单 -> 不参与齐套统计(本人明确要求)
        #   2. 看板统计卡不生成「总装图到位」那张(那是零件维度的指标)
        #   3. 产出 BOM 表里不生成交付物列 —— 总装图是**装配级**的东西,
        #      按零件列一行「xxx.STEP」只会让对方以为每个零件都要出装配图
        # 代价是:它也不进 `watchDirs` 之外的自动巡检以外任何统计,
        # 所以配了 `watchDirs` 让它照样能触发看板刷新。
        "assy":  {"label": "总装图", "ext": ".step", "dirKey": "assy",
                  "cats": [], "subfolder": False,
                  "shot": True,          # 要求配同名截图(.png/.jpg)
                  "aliases": ["总装图", "装配图", "装配体", "assy"]},
    },
    "naming": {
        "usePartNumber": True,      # 优先用图号做文件名
        "fallbackToName": True,     # 图号为空时退回用名称
        "sanitize": True,           # 去掉 Windows 非法字符
    },
    "watch": {
        "interval": 2,              # 轮询秒数
        "debounce": 1.5,            # 文件稳定多久后才动手
        # 只监听「交付物目录」。不要把 2_BOM表 / 6_看板 加进来 ——
        # 那是工具自己的输出,会触发无限重建循环。
        # 5_总装图(P5)要加：它也是人工往里放文件，放了得让看板跟着刷新。
        "watchDirs": ["step", "2d", "assy"],
        "autoBuild": True,          # 源表变动时自动重建
    },
    "server": {"port": 8900, "host": "127.0.0.1", "openBrowser": True},
}


def deep_merge(base: dict, over: dict) -> dict:
    out = dict(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def migrate(cfg: dict) -> dict:
    """老配置 -> 新结构。

    交付物从三类(STEP零件 / 工程图 / 2D图)并成两类:
    「工程图就是 2D 图」,只留 `step`(3D图)和 `2d`(2D图)。
    老配置里的 `dwg` 直接改名为 `2d`,不要的键丢掉,
    否则老项目读出来会带着一个指向已删除目录的 `4_工程图`。
    """
    dd = cfg.get("deliverables")
    if not isinstance(dd, dict):
        return cfg
    if "dwg" in dd and "2d" not in dd:
        dd["2d"] = dd.pop("dwg")
    elif "dwg" in dd:
        dd.pop("dwg")
    elif "2d" in dd and not dd["2d"].get("cats"):
        # 老配置里 `2d` 是空的 .dxf 类型、真正的工程图在 dwg 上;
        # 已经并过的不动,没并过的保持现状(2d 仍为空 = 不需要)
        pass
    return cfg


def load(p) -> dict:
    """读项目配置并与默认模板深合并。p 可以是 Project 或路径。"""
    from .paths import Project
    proj = p if isinstance(p, Project) else Project(p)
    return migrate(deep_merge(DEFAULT, proj.load()))


CAT_COLORS = {
    "3D打印件": "#fdba74", "塑胶件": "#67e8f9", "钣金件": "#cbd5e1",
    "机加工件": "#c4b5fd", "外购件": "#86efac",
}

# 标准件常见词 —— 只在 import / rules 时作为建议,不自动生效
COMMON_PURCHASE_WORDS = [
    "螺钉", "螺丝", "螺栓", "螺母", "螺帽", "螺杆", "垫圈", "垫片",
    "卡簧", "卡扣", "轴承", "同步轮", "同步带", "皮带", "齿轮", "弹簧",
    "接头", "快插", "T母", "型材螺母", "气管", "软管", "密封圈", "油封",
    "内塞", "防返臭", "齿板", "PU", "V型圈", "O型圈", "直接", "三通",
    "弯头", "变径", "水龙头", "角阀", "毛刷", "滤网",
    "电源", "电机", "线束", "端子", "开关", "电池", "灯", "插头", "插座",
    "玻璃", "陶瓷", "亚克力", "EPDM", "硅胶",
]


def with_defaults(cfg: dict) -> dict:
    c = cfg["categories"]
    if not c.get("display"):
        c["display"] = dict(CAT_COLORS)
    # 防御:开放段若被误写进 directSections,段内细分规则永远不会生效
    opens = set(c.get("openSections") or [])
    for s in [k for k in (c.get("directSections") or {}) if k in opens]:
        c["directSections"].pop(s, None)
    return cfg

