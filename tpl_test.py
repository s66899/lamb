# -*- coding: utf-8 -*-
"""模板 CSS 结构自检。

为什么需要:改 CSS 时把某条规则写坏(比如少一个右花括号),
浏览器会把**从那里往后的整张样式表**都丢掉 —— 页面看着还能用,
只是少了一堆样式,灯箱不再 fixed、图不再圆角、提示条消失,
极难联想到是 CSS 断了。

这个脚本在打包前跑,括号不平衡 / 关键规则丢失就退出非 0。
"""
import re
import sys
from pathlib import Path

TPL = Path(r"D:\助手工程师\templates\看板.html")
FAIL = []


def check(name, ok, extra=""):
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}"
          + (f" -> {extra}" if extra else ""))
    if not ok:
        FAIL.append(name)
    return ok


def strip_css(text):
    """去掉注释和 base64,免得数据里的花括号干扰计数。"""
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"url\([^)]*\)", "url()", text)
    text = re.sub(r"data:[^\"')]+", "data:", text)
    return text


src = TPL.read_text(encoding="utf-8")
m = re.search(r"<style>(.*?)</style>", src, re.S)
if not check("模板里有 <style> 块", bool(m)):
    sys.exit(1)
css = strip_css(m.group(1))

print("\n=== 1. 花括号必须配平 ===")
depth = 0
bad_at = None
line = 1
for ch in css:
    if ch == "\n":
        line += 1
    elif ch == "{":
        depth += 1
    elif ch == "}":
        depth -= 1
        if depth < 0 and bad_at is None:
            bad_at = line
check("花括号配平", depth == 0 and bad_at is None,
      f"-> 结束时 depth={depth}"
      + (f", 第 {bad_at} 行多了一个右花括号" if bad_at else ""))
if depth != 0:
    # 指出第一个不平衡的位置
    d = 0
    for i, ch in enumerate(css):
        if ch == "{":
            d += 1
        elif ch == "}":
            d -= 1
            if d < 0:
                print(f"    第 {css[:i].count(chr(10)) + 1} 行开始就不平衡")
                print("    上下文: " + css[max(0, i - 120):i + 60].replace("\n", " "))
                break

print("\n=== 2. 关键规则必须存在 ===")
# 这些是页面能用起来的前提。少一条就会有"看着正常但某处不对"的怪问题
NEEDED = [
    ("#lb", "大图灯箱(少了 position:fixed 就会跑到页面最下面)"),
    ("#lb img", "灯箱里的图"),
    (".vp", "看图按钮(表格里不再摆缩略图,点它弹大图)"),
    (".noph", "无图占位"),
    ("th", "表头"),
    ("td", "表格单元"),
    (".toast", "操作提示"),
    ("table{width:100%", "表格基础样式(这条被写坏过,后面全废)"),
    (".catsec>div", "分类区横向滚动"),
    (".mtab", "缺失清单表格"),
    (".near", "相近文件"),
    (".mini", "分类维度概览"),
    ("details.catsec", "分类折叠块"),
]
for sel, why in NEEDED:
    check(f"有 {sel} 规则", sel in css, f"— {why}")

print("\n=== 3. 规则条数 ===")
rules = re.findall(r"\{", css)
print(f"    规则数 {len(rules)}")
check("规则数正常(>=40)", len(rules) >= 40, f"-> {len(rules)}")

print("\n=== 4. 声明块里不能出现裸的嵌套选择器 ===")
# table{...;th{...} 这种写法浏览器会吞掉后面全部样式,
# 曾经就因为给 table 加 min-width 时误改了这一行。
# @keyframes / @media 内部本来就嵌套,先摘掉再查。
no_at = re.sub(r"@(?:keyframes|media|supports)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}",
               "", css)
nest = re.findall(r"\{[^}]*\{", no_at)
check("没有嵌套的花括号", not nest,
      f"-> {len(nest)} 处" + (f": {nest[0][:70]}" if nest else ""))

print("\n=== 5. 占位符齐全 ===")
for ph in ("__DATA__", "__ISSUES__", "__ORDER__", "__CATS__", "__CARDS__",
           "__DL__", "__DL_LABEL__", "__CONFLICT__",
           # P6:暂停横幅。少这个占位符的话,dashboard.render 里的
           # .replace("__PAUSED__", ...) 什么也不替换,模板原样带出去 ——
           # 页面不会报错,只是横幅永远不显示,也就是「静默地停掉了」。
           "__PAUSED__"):
    check(f"模板含 {ph}", ph in src)

# 占位符和 dashboard.py 里实际 replace 的必须一一对上,
# 少一个就是「模板里有、代码没替换」—— 输出的看板带着 __XXX__ 字面量。
import re as _re
_dash = Path(r"D:\助手工程师\engine\dashboard.py").read_text(encoding="utf-8")
_used = set(_re.findall(r'\.replace\("(__[A-Z_]+__)"', _dash))
check("模板里的占位符都有对应的 replace",
      set(_re.findall(r"__[A-Z_]+__", src)) - {"__BASE__", "__BASE_VALUE__"} - _used == set(),
      f"-> 模板里有但没被替换: "
      f"{sorted(set(_re.findall(r'__[A-Z_]+__', src)) - {'__BASE__', '__BASE_VALUE__'} - _used)}")

# __BASE__ 的坑:曾把 `const __BASE__ = "../"` 整体替换成裸文本,
# 产出 `return ../+String(p)` —— 引号没了,JS 语法错,页面全空,
# 而文件大小、DATA、图片全都正常。现在只允许替换 __BASE_VALUE__。
check("__BASE_VALUE__ 占位符存在",
      "__BASE_VALUE__" in src,
      "基准前缀必须可注入")
check("__BASE__ 变量声明完整且带引号",
      re.search(r'const\s+__BASE__\s*=\s*"__BASE_VALUE__"\s*;', src)
      is not None,
      '必须写成 const __BASE__ = "__BASE_VALUE__";(带引号的完整语句)')
check("fixPath 用的是 __BASE__ 变量而不是硬编码 ../",
      re.search(r"return\s+__BASE__\+", src) is not None,
      "基准前缀不能写死,看板会被复制到别处")
# 裸的 __BASE__ 不能作为待替换标记存在(那是这次的坑)。
# dashboard.py 只替换 `__BASE_VALUE__`,**从不替换 `__BASE__`**,所以
# 多几个**引用**是安全的;危险的是:
#   (a) 第二个 `const __BASE__ =` 声明 —— 互相覆盖或 TDZ 报错
#   (b) `__BASE__` 出现在**字符串字面量里** —— 那才是「被当占位符吃掉引号」
# 原来的规则是「总共只能出现 2 次」,P7 加了 fetch(__BASE__+…) 就误报了。
_code = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
_code = re.sub(r"^\s*//.*$", "", _code, flags=re.M)
_decl = len(re.findall(r"\bconst\s+__BASE__\s*=", _code))
check("__BASE__ 声明恰好 1 次(多个声明会互相覆盖)", _decl == 1,
      f"-> {len(re.findall(r'const __BASE__ =', _code))} 次")

# (b) 真正的红线:字符串里不许出现裸 __BASE__。
#     先把字符串字面量全抠出来,再看里面有没有 __BASE__ —— 比
#     「正则里有没有 __BASE__」准,不然 `const __BASE__ = "__BASE_VALUE__"`
#     里的 VALUE 会被误当成违规。
_lits = re.findall(r'"([^"\n]*)"|\'([^\'\n]*)\'', _code)
_bad = [a or b for a, b in _lits
        if re.search(r"(?<!_)\b__BASE__\b", a or b or "")]
check("字符串字面量里没有裸 __BASE__(会被 .replace 吃掉引号)",
      not _bad, f"-> 违规: {_bad[:3]}")

# (c) 引用得是表达式,不能是被赋值的目标
check("__BASE__ 没有被重新赋值",
      not re.search(r"__BASE__\s*=(?!=)", _code.replace("const __BASE__ =", "")))

# 类名撞车:统计卡的进度条 `.bar` 是 dashboard.py::_card() 生成的
# <div class="bar">,规则 `.bar{height:7px;overflow:hidden}`。
# 3D 预览的工具条一开始也叫 .bar —— `.v3d .bar` 里没写 height,
# 于是工具条被压成 7px、24px 的按钮溢出后被 overflow:hidden 裁掉,
# 屏幕上只剩几条重叠的字。HTML/JS/CSS 语法全对,最难查的一类。
check("模板里没有再出现字面量 class=\"bar\"",
      'class="bar"' not in src,
      "-> 统计卡的进度条 .bar 是 height:7px;overflow:hidden,"
      "3D 工具条必须叫 .tbar,否则被压成一根 7px 的细条")
check("3D 工具条用的是 .tbar",
      'class="tbar"' in src and ".v3d .tbar{" in css)

print("\n=== 12. 核对栏:采购件核的是型号 + 到货数量 ===")
# ★ 这一节盯的是「数据有、界面不显示」这一类静默丢失。
#   真出过一次:chkGet() 只把 st/note 挑出来重新组了个对象,
#   qty 直接丢了 —— 核对表里明明记着到货 508,网页上那个框却永远是空的,
#   只剩占位的「—」。不报错、测试全过,本人只会以为没记过。
_m = re.search(r"function\s+chkGet\s*\(([^)]*)\)\s*\{(.*?)\n\}", src, re.S)
if check("模板里有 chkGet()", bool(_m)):
    _body = _m.group(2)
    check("chkGet 会把 qty 带出来",
          re.search(r"\bqty\s*:", _body) is not None,
          "-> 只返回 st/note 的话,外购件的到货数量永远显示不出来")
    check("chkGet 用 !=null 判断 qty",
          re.search(r"qty\s*:\s*\(?\s*c\s*&&\s*c\.qty\s*!=\s*null", _body)
          is not None,
          "-> 用 || 会被 qty=0 当成没记,「到货 0 个」就显示不出来")

check("模板里有到货数量输入框",
      'class="cn-q' in src or "cn-q" in src,
      "-> 外购件那一栏要能填到货数量")
check("到货数量框带 .short 样式(少了要标红)",
      "input.cn-q.short{" in css,
      "-> 数量不够必须一眼看出来")
check("到货数量要显示需求量作对照",
      "需 <b>" in src or "chkShort" in src,
      "-> 只填到货数、不告诉本人要几个,等于让人自己心算")
check("save 时把 qty 一起发出去",
      re.search(r"kind:d\.kind,st:d\.st,note:d\.note,\s*\n?\s*qty:", src)
      is not None,
      "-> 不带 qty 的话网页端改了数量也存不进去")
check("核对栏整格有自己的底色",
      "td.ck{" in css and "background" in css.split("td.ck{")[1].split("}")[0],
      "-> 核对栏要读得出是单独一列")

print("\n" + "=" * 50)
if FAIL:
    print(f"失败 {len(FAIL)} 项:")
    for f in FAIL:
        print(f"  - {f}")
    sys.exit(1)
print("模板自检全部通过")
print("=" * 50)
