# Round 140 记账 — index.html L7/L16/L22 三处 meta description 营销文案脱节修复

## 改动

`index.html` 三处社交分享/SEO meta 文案 — 6 大模块 → 7 大模块（含 personal），追平 `TRAIN_MODULES.length = 7`：

1. **L7 `<meta name="description">`**：「6 大模块（技术·体能·心理·营养·比赛·教练）」 → 「7 大模块（技术·体能·心理·营养·比赛·教练·个人）」
2. **L16 `<meta property="og:description">`**（Open Graph / Facebook 抓取用）：「6 大模块」 → 「7 大模块」
3. **L22 `<meta name="twitter:description">`**（Twitter Card 抓取用）：「6 大模块」 → 「7 大模块」

**为什么这是真问题**：

`TRAIN_MODULES` 数组实测 7 条 id（`badminton-tech` / `strength` / `psychology` / `nutrition` / `competition` / `coach` / `personal`），其中：

- `sModules` DOM 元素（首页 hero 第 1 个 stat-box）由 `$('sModules').textContent = TRAIN_MODULES.length`（app.js L2453）动态输出 **7**
- `$('heroSub').textContent = \`${TRAIN_MODULES.length}大训练模块 · …\``（app.js L2456）动态输出 **7大训练模块**
- `moduleSection` 渲染（app.js L2541）= 1 教练系统 card + `TRAIN_MODULES.filter(m=>m.id!=='coach').map(...)` = 1 + 6 = **7 张卡片**
- `index.html` L34 splash chip + L107 section 注释（round134 修过）= **7**
- `app.js` L87 注释（round134 修过）= **7**

但 **3 处 meta 标签静态文案未同步**：
- `<meta name="description">` L7 — 从初版（v3.0.0 80a09f8）起写「6 大模块」，跨越 coach 模块入 v3.5.0（ec0f8c1）、personal 模块入 v3.14.0（37c5477）两次模块数变更均未刷新
- `<meta property="og:description">` L16 — Open Graph 协议，Facebook / 微信 / 微博抓取分享卡片时显示
- `<meta name="twitter:description">` L22 — Twitter Card 协议，X / Twitter 抓取时显示

**结果**：当用户把 `https://s66899.github.io/lamb/` 分享到微信/微博/Twitter/Facebook 时，分享卡片仍会显示「6 大模块（…教练）」—— 而首屏 splash chip 已经显示「7大模块」、动态 hero 已经显示「7」。三方口径不一致，**对外营销文案与实际功能脱节**，SEO 摘要也写少了一个模块（缺「personal / 个人专项」）。

**为什么不修其它三处**（app.js L2121 `Math.min(1, visited / 6)`）：那是 sidebar 用户可见模块数（filter 排除 coach）= 6，分母 6 与 sidebar 可见项数对齐正确；如果改成 7 会让 6 个全访问还差 14% 才能 100%，与现有用户进度数据脱钩。本轮仅修静态营销文案，不动行为参数。

**为什么不 bump APP_VERSION**：纯文案脱节修复，3 行字面修改，对功能/数据/兼容性零影响，按「round139 记账」同型处理 —— 不触发 `_bump_version.js`。下一次内容实质改进或 API 变更再 bump。

## 校验

- `grep -nE "[五六七89]大模块" index.html` → 只剩 L34 「7大模块」splash chip ✓
- `grep -rnE "[五六]大模块|[567]大训练" --include="*.html" --include="*.js"` → 全仓零「6大模块/6大训练」残留 ✓（README L330/L332 changelog 历史快照保留 v3.15.x「五大模块」是历史正确性）
- 5 维度 APP_VERSION 一致性体检：未动版本埋点，PASS（app.js APP_VERSION='v3.22.63' + index.html ?v=v3.22.63 + VERSION 头注释 + README L231 + books/README L11 = 5/5 一致）
- `node --check app.js` ✅（未动 JS）
- `node --check manifest_data.js` ✅（未动）
- `python -m json.tool manifest.json > /dev/null` ✅（未动）
- ex-lib broken id 扫描（`_scan_exlib_refs.py`）：**未触发**（本轮未引用任何 ex-lib，仅文案修改），上轮 round139 已 PASS（0 broken / 1336 合法 id）

## 落地

- commit `4a07c29`：fix(meta): index.html L7/L16/L22 三处 meta description 营销文案 — 「6 大模块」→「7 大模块」（技术·体能·心理·营养·比赛·教练·个人）追平 TRAIN_MODULES.length=7
- push `book`：6ff4f9d..4a07c29 ✅（GitHub Pages 自动部署）
- 改动行数：3 insertions(+) / 3 deletions(-) = 净 0 行
- 净业务代码改动：**0 行**
- ex-lib id 改动：**0 处**
- APP_VERSION 改动：**未 bump**（保持 v3.22.63，下轮再 bump）

## 留给下轮的下一项候选

1. **NSCA-CPT ch09（损伤预防）双层结构补全**：ch09 与 ch10 同型 ch10 已 321 行且 59 处 ex-lib；ch09 行数未在本轮查（待下轮 round141 优先跑 `wc -l books/nsca-cpt/ch09*.md` 比对；如 < 250 行则触发补全）
2. **羽毛球康复书 ch04 踝章「第一层 / 第二层」双层结构补强**：ch04 235 行、14 处 ex-lib 引用（仅 13 unique），是 6 大损伤章里 ex-lib 密度最低（除 ch05 17 处）；可考虑给踝章补 4-5 条弹力带 / 平衡训练 / 离心训练 ex-lib 引用
3. **其它书的 README 章节目录校对**：上次只在羽毛球康复 §做；NSCA-CPT / 工程力学 / 心理学等书的根 README 章节目录是否与实际 chXX 标题一致（待 round141 优先 grep 比对）
4. **round134 同型补扫**：还有没有「splash chip / section 注释 / 注释 / meta / sitemap」等其它静态「X大模块」营销文案残留（已全仓 grep 过，0 残留，可归档）
