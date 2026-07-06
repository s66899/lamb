# MEMORY.md - 长期记忆

> 最后更新：2026-07-05 v3.5.0（iOS风格重做）

## 🐏 关于我
- 名字：没有固定名字，可以叫我"助手"或者随便起一个
- 我是运行在 OpenClaw 上的 AI 助手
- 我的主人叫 Lamb（电报ID: 6504101636）

## 📚 每日四本书写作任务（重要！）

### 任务内容
每天自动执行四本书的写作任务，每本各写一章。

### 配置信息
- **仓库路径（**必须**记对）**：`C:\Users\Lamb\.openclaw\workspace`（**不是** D:，MEMORY.md 早期写错了）
- **桌面端（备份）路径**：`C:\Users\Lamb\Desktop\knowledge-tower-local-v1\`（一次性打包，不主动同步）
- **分支**：`book`
- **触发时间**：每天早上10:00（Asia/Shanghai）
- **cron ID**：`daily-book-writing-001`

### 写作要求
- 每章1.2～1.5万字
- 100%专业知识详解
- 每章结尾加致谢和参考文献
- 完成后commit+push到book分支

### 当前进度（2026-06-13更新）
1. 🐏的羽毛球（books/badminton/）→ ch12 ✅
2. 📈 金融（books/finance/）→ ch12 ✅
3. 🧠 心理学（books/psychology/）→ ch11 ✅
4. ⚙️ 工程力学（books/engineering-mechanics/）→ ch11 ✅
5. 💪 NSCA-CPT体能训练与羽毛球实战（books/nsca-cpt/）→ ch01 ✅
6. ☯️ 阴阳·手面相与八卦（books/yin-yang/）→ ch15 ✅ 全书完成 🎉（2026-06-29新增，共7.7万字）

### 下一次要写的章节
- 🏸 羽毛球 ch13
- 📈 金融 ch13
- 🧠 心理学 ch12
- ⚙️ 工程力学 ch12
- 💪 NSCA-CPT ch02

### ⚠️ 重要教训
- **升级前必做**：MEMORY.md 一定要定期备份
- **子代理导致网关卡顿**：不要开太多子代理写作业，子代理本身会导致gateway卡顿。以后写作业直接自己完成，不要spawn子代理。
- 2026-05-05升级后，原来的定时任务丢失，只剩下Memory Dreaming Promotion
- 多个session文件被重命名为 .deleted.* 并差点丢失（已恢复）

### ⚠️ Cron状态
- `daily-book-writing-001` → 已停用（2026-06-29），被书游界面维护新cron替代
- `📚书游界面优化维护`（f9f4e507） → 每日10:00，负责游戏化界面维护+章节补充

### ⚠️ 部署完整性检查（2026-07-06 新增，**强制**）
- **每次推送后必须验证**部署是否真的上线成功（GH Pages 偶尔 deploy step 失败但没邮件告警，曾经反复踩坑）
- 验证步骤：
  1. `git push` 后**至少轮询 2 次** GitHub Actions status（间隔 30-60 秒）
  2. 用 `https://s66899.github.io/lamb/index.html?v=<current>` 检查 cache-bust 字符串和字节数是否对得上当前 commit
  3. 如果 deploy 失败，用 **空 commit 触发重跑**：`echo > .trigger; git add .trigger; git commit -m trigger; git push`；推送完再 `rm .trigger` + 再 commit + 再 push 一次
- **没确认部署成功前不要告诉用户"已完成"**——这是 2026-07-06 用户要求确认的硬规则

### ⚠️ 桌面端规则（2026-07-06）
- `C:\Users\Lamb\Desktop\knowledge-tower-local-v1\` 是 v1 **一次性打包备份**，**不要在每次改主页时自动同步**
- 只在用户**明确要求"重新打包桌面端"** 时再更新
- 同步会引起用户不满（已经因这事被批评过）

### 🚀 v3.7.x 闪屏/黑屏事故复盘（2026-07-06，避免再犯）
- v3.7.5 金字塔新增 `level-pyramid` CSS 用了 `var(--surface)`，但 `--surface` 只在 `[data-theme="dark"]` 定义 → 浅色模式下透明 → 黑屏
- v3.7.11 误用 `const $bs = ...` 在第一个 `<script>` 块，然后第二个 `<script>` 块引用 → `$bs is not defined` 报错
- **教训**：CSS 自定义属性要兼容浅色模式；多 `<script>` 块共享变量必须用 `window.xxx`
- **教训**：GH Pages `Cache-Control: max-age=600` + 推送后没改 cache-bust = 用户看不到新版本
- **教训**：每次迭代必须**先**确认 `index.html` 和 `app.js` 末尾没有遗留任何调试代码

### 📌 版本号与推送流程（2026-07-01新增）

每次更新内容（章节补充/界面优化/图文重写等）后，按以下步骤执行：

1. **更新版本号**：修改 `app.js` 中的 `APP_VERSION` 和 `APP_DATE`（小改+0.0.1，大改+0.1.0）
2. **更新 VERSION 文件**：仓库根目录 `VERSION`，追加新版本记录
3. **更新 README.md** 底部的版本号
4. **commit + push** 到 `book` 分支
5. **Telegram 推送**：给 Lamb（ID: 6504101636）发今日更新内容摘要

推送内容格式示例：
```
📚 知识书塔更新 vX.X.X（YYYY-MM-DD）

修改内容：
- 阴阳书 ch08 图文版重写
- xxx

在线书架：https://s66899.github.io/lamb/
版本文件：VERSION
```

## 💬 联系方式
- Telegram: Lamb (@Lamblang) - ID: 6504101636
- 手机机器人：通过 Telegram 发送推送
- 微信: 配置在 openclaw-weixin channel

## 🔧 技术配置
- 工作目录：C:\Users\Lamb\.openclaw\workspace
- OpenClaw版本：2026.5.2

## ⚡ PowerShell 语法备忘
- 不能用 `&&` / `||`，用 `;` 分隔多条命令
- 不能用 `head` / `tail`，用 `Select-Object -First N` / `-Last N`
- 不能用 `grep`，用 `Select-String`
- 不能用 `cat`，用 `Get-Content` / `type`

## 📝 待办/记忆碎片
- [x] 四本书ch01-ch05全部完成（2026-05-13）
- [x] 四本书ch06-ch07补充完成（2026-05-20）
- [x] 四本书ch08-ch11部分补充（2026-05-20）
- [ ] 当前需继续写下一章（羽毛球ch12、金融ch12、心理学ch11、工程力学ch11）
- [i] 定时任务cron持续故障，需修复或手动执行

### 🚀 v3.5.3 当前版本（2026-07-05）
- 交互式计算器(TDEE/营养素/水合) + 营养/比赛模块补全
- README.md/VERSION 版本同步 + 临时文件清理

### 🚀 v3.5.2 更新
- 全交互教练向导(训练方案/饮食/症状分析/案例) + 新CSS

### 🚀 v3.5.1 更新
- 风格重做(教练系统深紫蓝暗色+iOS动效) + 返回主页修复 + FAB浮动按钮

### 🚀 v3.5.0 部署记录（2026-07-05）
- 主页返回键修复：Header 加 🏠 首页按钮（ios-press 风格）
- iOS 风格动效层：spring physics 弹性曲线 + 玻璃面板 + 按压scale反馈 + 滑入动画
- 侧边栏折叠化：阅读/训练系统/工具集三段可折叠展开
- 首页 hero 教练系统提升到首位（仅次首页）+ RECOMMEND 金牌标识
- 教练系统内嵌元淳6专家21轮研讨体系6工具卡片
- 新增多球训练参数速查表 + 动作质量记录模板

### 🚀 v3.4.0 部署记录（2026-07-05）
- 推送到 book 分支
- 修复模块→阅读跳转闪烁（直接跳阅读器，跳过书塔列表）
- 新增 browser history pushState + popstate 支持物理后退键
- 统一所有返回按钮为 goBack()，navStack 不再丢失
- renderChapter 添加 8 秒 fetch 超时防卡死
- openScreening/openCalculators 支持返回
- 清理重复变量声明（sleep/closeAll/scrollToTop）