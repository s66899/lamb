# 🏸 Lamb 羽毛球训练系统 · 产品经理优化清单

> **诊断范围**：s66899.github.io/lamb ｜ 本地 `D:\Lamb\projects\qingyu` ｜ 分支 `book` ｜ v3.8.6 (2026-07-18)
> **核心现状**：深色模式 OK ｜ ⚠️ **白天模式对比度严重失败**（已采样 18 个元素几乎全不可读）

---

## 🚨 P0 · 紧急（1-2 天）

### 1. 白天模式色彩对比度问题（你已报告）
- **根因**：`toggleTheme()` 把 `''` 当浅色，CSS 变量不匹配 `:root` 也不匹配 `[data-theme="dark"]`，导致浅色态下仍是深色配色
- **证据**：切到 `data-theme=light` 后采样：
  - `.hero-title` 颜色 `rgb(216,230,216)`（暗色文字色）+ 背景 `rgb(15,31,23)`（暗色背景）
  - 对比度 ≈1.4:1，远低于 WCAG AA 4.5:1
- **影响**：hero、模块卡、统计、书塔、徽章、章节卡、阅读器、侧边栏共 18 个元素全坏
- **修复方案**：
  - **A1**：新增 `[data-theme="light"]` 显式覆盖（最稳，~30 行）
  - **A2**：默认 `:root` 为 light，dark 用 `[data-theme="dark"]` 覆盖（重构最小）
  - **A3**：用 `body.theme-light` 选择器统一管理
- **验收**：所有文字对比度 ≥ 4.5:1

---

## 🔥 P1 · 高优（本周）

### 2. 首屏加载性能
- ⚠️ 总资源 ~600KB（app.js 290KB + style.css 50KB + manifest_data.js 257KB）全同步加载
- ✅ `manifest_data.js` 按书懒加载
- ✅ `app.js` 拆 core + 工具两包
- ✅ 关键 CSS `<link rel="preload">`
- ✅ Service Worker 缓存静态资源

### 3. 代码架构
- ⚠️ `app.js` 290KB 单文件，无模块化
- ✅ 拆 `core.js`（路由/主题/存储）+ `views/*.js`
- ✅ 单例 state + 事件总线
- ✅ `manifest_data.js` 改 JSON 按需 fetch

### 4. TypeScript / JSDoc
- 全 JS 无类型
- ✅ 加 `/** @ts-check */` + JSDoc 注解
- ✅ 关键函数标注类型

---

## 🛠 P2 · 中优（两周）

### 5. 可访问性 (a11y)
- ⚠️ `<div>` 当按钮（`.side-link`、`.module-card`、`.tool-card`）
- ⚠️ 缺 ARIA：`aria-label`、键盘 `tabindex`、回车触发
- ⚠️ 缺 `prefers-reduced-motion` 兜底

### 6. 移动端
- ⚠️ 480px 以下侧边栏遮罩未做
- ⚠️ 阅读器目录强制 `display:none`（无法导航）
- ⚠️ 缺 swipe 退手势

### 7. 搜索
- ⚠️ 搜索框只有 UI，缺真实搜索
- ✅ 接 lunr.js / 简易 inverted index
- ✅ 支持：标题、正文标签、跨模块

### 8. SEO & Meta
- ⚠️ 缺 `meta description` / `og:*` / `twitter:card`
- ⚠️ 缺 `hreflang`

---

## 📚 P3 · 内容

### 9. 内容完整性
- ⚠️ UI 显示「62 关 / 0% 完成」全 0%
- ✅ 校 `manifest.json` vs `manifest_data.js` vs `books/` 一致性
- ✅ 修复书塔进度统计

### 10. 可读性细节
- ⚠️ 表格 / blockquote / code 块对比度复核
- ⚠️ 字体可调边界没设（`increaseFont`）

---

## 🎯 P4 · 体验增强

### 11. PWA / 离线
- 缺 manifest.json、install prompt、offline fallback

### 12. 数据导出 / 导入
- 进度只在 localStorage
- ✅ 导出 JSON / 导入（多设备同步前置）

### 13. i18n 框架
- 硬编码中文
- 留 `data-i18n` + dict 框架位

### 14. 错误上报
- 已有全局错误边界 ✅
- 缺用户上报入口

---

## 📦 P5 · 工程化（长期）

### 15. 测试覆盖
- 0 测试
- ✅ vitest + jsdom
- ✅ 路由、TDEE、localStorage 容错

### 16. CI/CD
- 手动 commit + push
- ✅ GitHub Actions：lint → test → build → deploy

### 17. 设计系统化
- CSS 变量散落
- ✅ 建 `DESIGN.md` 单一真源
- ✅ 语义命名 token：`color.bg.primary`、`color.text.secondary`

---

## 📊 优先级总览

| 等级 | 数量 | 主题 |
|------|------|------|
| 🚨 P0 | 1 | 白天模式对比度 |
| 🔥 P1 | 3 | 性能、架构、类型 |
| 🛠 P2 | 4 | a11y、移动端、搜索、SEO |
| 📚 P3 | 2 | 内容、可读性 |
| 🎯 P4 | 4 | PWA、导出、i18n、监控 |
| 📦 P5 | 3 | 测试、CI、设计系统 |

---

## ✅ 建议执行顺序

**第 1 轮（P0，~2 小时）**：修白天模式对比度
**第 2 轮（P1.1+P1.2，~1 天）**：架构拆包 + 性能
**第 3 轮（P2.1+P2.3，~半天）**：a11y + 搜索
**第 4 轮**：按你优先级选

---

## ❓ 请你确认

1. 清单是否完整？有无遗漏痛点？
2. P0 修复方案选 A1 / A2 / A3？推荐 **A2**
3. 执行节奏：先 P0 → 逐个推，还是 P1 一次性做完？
4. 重构是否要兼容现有 localStorage 数据（XP/关卡/已读记录）？
5. 要不要先建 `DESIGN.md` 统一 token 再改造？
