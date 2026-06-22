# -*- coding: utf-8 -*-
import re, sys

with open('app.js', 'r', encoding='utf-8') as f:
    c = f.read()

# Use unicode escapes to avoid terminal encoding issues
reps = {
    # Reader nav buttons
    '← 上一章': '\u25c0 \u4e0a\u7ae0',  # ◀ 上章
    '下一章 →': '\u4e0b\u7ae0 \u25b6',  # 下章 ▶
    '❓ 本章测验': '\U0001f9ea \u6d4b\u9a8c',  # 🧪 测验
    
    # Chapter title
    'ch': '\U0001f4d6',  # 📖
    
    # Loading
    '⏳ 加载中…': '\u23f3 \u8bfb\u5165\u4e2d\u2026',  # ⏳ 读入中…
    '暂无测验': '\U0001f937 \u65e0\u6d4b\u9a8c',  # 🤷 无测验
    '加载中…': '\u23f3 \u52a0\u8f7d\u2026',  # ⏳ 加载…
    
    # Hero
    ' 本书 · ': ' \u672c \u00b7 ',
    ' 章 · ': ' \u7ae0 \u00b7 ',
    ' 万字': '\u4e07',
    
    # Search
    '按 Enter 搜索全部内容': '\u2318 \u8f93\u8bcd &middot; \u23ce \u641c\u5168\u4e66',  # ⌨ 输词·↵ 搜全书
    '😅 没找到 · 🔄 换词': '\U0001f605 \u6ca1\u627e\u5230',  # 😅 没找到
    
    # Stats
    '✅ 已读章节': '\u2705 \u5df2\u8bfb',  # ✅ 已读
    '📚 待读章节': '\U0001f4d6 \u5269',  # 📖 剩
    '书籍总数': '\U0001f4da \u4e66',  # 📚 书
    '📊 总进度': '\U0001f4ca \u8fdb\u5ea6',  # 📊 进度
    '阅读连续 ': '\U0001f525 ',  # 🔥
    
    # Study mode  
    '🎉🏆🎉': '\U0001f389\U0001f3c6\U0001f389',  # 🎉🏆🎉
    '👏 全记住了！': '\U0001f3af \u5168\u8bb0\u4f4f\uff01',  # 🎯 全记住了！
    '🧠 知识就是力量': '\U0001f9e0 \u7ee7\u7eed\u52a0\u6cb9',  # 🧠 继续加油
    '🔄 再来一轮': '\U0001f504 \u518d\u7ec3',  # 🔄 再练
    '🤔 说说「': '\U0001f914 \u8bf4\u8bf4\u300c',  # 🤔 说说「
    '👁 查看提示': '\U0001f4a1 \u7ed9\u70b9\u63d0\u793a',  # 💡 给点提示
    '😅 没搜到 · 换个词试试': '\U0001f605 \u6ca1\u627e\u5230',
    
    # Read mark
    '✅ 已读': '\u2705',  # ✅
    
    # Other
    '开始阅读，保持连续！': '\U0001f4d6 \u5f00\u59cb\u5427',  # 📖 开始吧
}

for old, new in reps.items():
    if old != new:
        c = c.replace(old, new)
        count = c.count(new)
        if count == 0 and '📖' not in old:  # don't warn about ch replacement
            pass

# Fix ch replacement carefully (only in readerTitle context)
c = c.replace("`📖 ${", "`\U0001f4d6 ${")  # Add 📖 before template string

# Fix start reading streak
old_streak_0 = "`🔥 0天连读`"
new_streak_0 = "`\U0001f4d6 \u5f00\u59cb\u5427`"
if old_streak_0 not in c:
    # Try to find the pattern
    pass

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(c)

print('Done')
