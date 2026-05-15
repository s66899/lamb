# 🏸 羽毛球教练蒸馏项目

> 蒸馏真实教练的思维方式，生成可运行的AI教练Skill。

## 项目背景

参考 [女娲 nuwa-skill](https://github.com/alchaincyf/nuwa-skill) 的理念，把羽毛球教练的：

- 教学技巧
- 注意事项
- 说话语气
- 专业程度

这些提取成 AI Skill，让AI能够像这位教练一样思考和表达。

## 目录结构

```
badminton-coach-skill/
├── SKILL.md                          # 最终产物（教练AI）
├── README.md                         # 项目说明
├── references/
│   ├── research/                     # 调研结果
│   │   ├── 01-teaching-skills.md     # 教学技巧
│   │   ├── 02-expression-dna.md      # 表达DNA
│   │   ├── 03-professional-level.md   # 专业程度
│   │   ├── 04-attention-points.md     # 注意事项
│   │   ├── 05-decision-logic.md       # 决策逻辑
│   │   └── 06-counter-patterns.md      # 反模式
│   └── sources/                      # 一手素材
│       ├── videos/                    # 教学视频
│       └── transcripts/               # 文字/聊天记录
└── scripts/                          # 工具脚本
```

## 工作流程

1. **收集素材** → 教练的视频、文字、聊天记录
2. **多维度分析** → 教学技巧/语气/专业度/注意事项
3. **提炼框架** → 心智模型/教学启发式/表达DNA
4. **生成Skill** → 输出可用的SKILL.md

## 当前状态

模板已搭建，等待教练素材输入。

---

*参考项目：[女娲 nuwa-skill](https://github.com/alchaincyf/nuwa-skill)*