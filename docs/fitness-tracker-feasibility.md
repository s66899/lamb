# 🩺 「体能 / 增肌 / 手环健康」板块 — 技术可行性备忘

> **目的**：评估在当前仓库（`D:\lamb\projects\qingyu`，已部署在 GitHub Pages 静态站 `https://s66899.github.io/lamb/`）的「纯前端 + 静态托管」约束下，能不能做"结合手环或手机健康功能进行评估和检测"的体能板块，以及最低落地路径是什么。
>
> **本备忘不修改任何代码 / manifest / app.js / APP_VERSION**；纯文档，作为下一轮决策依据。
>
> **写作日期**：2026-09-02 · **作者**：🐏 · **对应 APP_VERSION**：v3.22.63

---

## 1. 边界与现状

### 1.1 仓库现状（v3.22.63）

- 9 本书 / 97 章 / ~90 万字，**全部纯静态文本**（HTML / Markdown / JSON / JS）
- 部署：**GitHub Pages 静态托管**（`https://s66899.github.io/lamb/`）
- 入口：`app.js`（~6300 行纯前端 JS） + `manifest.json`（97 章元数据）
- 每本书需在 4 处注册：`manifest.json` + `manifest_data.js` + `app.js` 的 `TOWER_BOOKS` 与 nav 节点 + `books/README.md`
- 当前 **零网络请求**（除 `fetch(RAW + '/manifest.json')` 拉元数据），**零 device API**（无 BLE / 无 HealthKit / 无 Health Connect / 无摄像头 / 无 GPS）

### 1.2 用户需求拆解

"结合手环或者手机健康功能进行对应评估和检测" = 两个子需求：

- **A. 体能 / 增肌相关**：力量训练容量、肌肉量、肌力、心肺（VO₂max）、恢复度、睡眠—这 5 类数据是"评估 / 检测"对象
- **B. 手环 / 手机健康数据源**：华为运动健康 / Apple Health / 小米运动 / Garmin Connect / OPPO / 三星 Health / Fitbit 等穿戴设备自带的 App

两个子需求里，**B 是数据源**，**A 是评估逻辑**。本备忘聚焦"B 能不能拿到、A 怎么落地"。

---

## 2. 数据源可接入性矩阵

| 数据源 | 数据类型 | 在静态前端 + GitHub Pages 下能否直接拿 | 替代路径 | 难度 |
|--------|---------|---------------------------------------|---------|------|
| **Apple Health (iOS)** | HR / 步数 / VO₂max / 睡眠 / 心率变异 / HRR | ❌ 必须用 HealthKit 原生 API（Swift / Obj-C），纯 Web JS **完全不可访问** | 用户从 iPhone "健康" App 截图 → OCR；或用 iOS 快捷指令导出 CSV → 粘贴到 Web 表单 | ⭐⭐⭐ |
| **Health Connect (Android 14+)** | 同上（Google 统一 API） | ⚠️ Chrome 134+ 支持 **Web Health Connect API**（实验），但**仅在 Android Chrome HTTPS 下可用**；GitHub Pages 满足 HTTPS | 需 `<script src="https://hcb.foo.com">` 形式嵌入或 Capacitor 封装 | ⭐⭐⭐⭐ |
| **华为运动健康** | HR / 步数 / 血氧 / 压力 / 睡眠 | ❌ 无 Web API；HarmonyOS 原生 / Android 原生 SDK 可用，Web 端只能用**华为账号 OAuth 拉云端数据**——需注册华为开发者 + 隐私协议 | 用户从 App 截图 → 手动录关键数字（HR、静息 HR、VO₂max 估值） | ⭐⭐⭐⭐⭐ |
| **小米运动 / 小米穿戴** | HR / 步数 / 睡眠 / 血氧 / 运动负荷 | ❌ 无 Web API；小米开放平台有 OAuth 但**未对个人开发者开放健康数据 scope** | 同上手动录入 | ⭐⭐⭐⭐⭐ |
| **Garmin Connect** | 训练负荷 / VO₂max / HRV / 睡眠 / Body Battery | ⚠️ Garmin Connect Developer API 有 OAuth 1.0a，**仅开放训练数据（不算医疗数据）**，个人开发者可申请；需后端代理（CORS + token 持久化）——**GitHub Pages 静态无法藏后端** | 后端代理 = Cloudflare Worker / Vercel Edge / GitHub Actions 定时拉取；前端只读缓存 | ⭐⭐⭐⭐ |
| **Fitbit Web API** | 同 Garmin 类似 | ⚠️ 有官方 Web API，需 OAuth 2.0 + 后端 token 存储；同上需要代理 | 同上 | ⭐⭐⭐⭐ |
| **Oura Ring** | HRV / 睡眠 / 恢复度 | ⚠️ Oura Cloud API v2，OAuth 2.0 + 后端代理 | 同上 | ⭐⭐⭐⭐ |
| **Whoop** | 恢复度 / 训练负荷 | ❌ Whoop API 仅对企业 / 研究合作开放，不对个人开发者 | 手动录 Whoop 日报截图 | ⭐⭐⭐⭐⭐ |
| **Web Bluetooth API** | 直连 BLE 心率带 / 功率计 / 体脂秤 | ⚠️ Chrome / Edge 支持，但**需要 HTTPS + 用户手势**（GitHub Pages ✅），且只能连**已配对 BLE 设备**，无法读手机系统健康 App | 不读系统 App，直接连心率带 / 体脂秤 | ⭐⭐⭐ |
| **手动录入表单** | 用户看着 App / 手环屏幕录数字 | ✅ **零成本，立刻能做** | 就是个 HTML form | ⭐ |

**核心结论**：在 **GitHub Pages 纯前端** 约束下：

1. **100% 可行**：手动录入 form + 本地 LocalStorage（HR、静息 HR、HRV、步数、睡眠时长、VO₂max 估值、握力、深蹲 1RM 等）
2. **部分可行**：Web Bluetooth 直连 BLE 设备（心率带、体脂秤、功率计）——绕过"系统健康 App"，直接读 BLE 广播
3. **需要后端代理**：Garmin / Fitbit / Oura 的云端 API（CORS + token 持久化）
4. **基本不可行**：Apple HealthKit / 华为 / 小米 / Whoop 的原生 API（在静态站纯前端下零覆盖）

---

## 3. 评估逻辑层（"A 体能 / 增肌评估"）的可行性

跟数据源无关——这部分**纯前端 + 数学公式 + 阈值表**就能做：

| 评估项 | 数据需求 | 公式 / 阈值 | 难度 |
|--------|---------|------------|------|
| **静息心率（resting HR）** | 早晨醒来静息 HR | 60-100 bpm 正常；< 60 优秀（耐力运动员常见）；长期升高 > 10% 提示过度训练或疾病 | ⭐ |
| **HRV（心率变异）** | 早晨 HRV（需支持 HRV 的设备） | 趋势分析：连续 7 天下降 > 20% → 减量；高于个人基线 → 可加量 | ⭐⭐ |
| **VO₂max 估算** | 跑步 / 骑车心率 + 配速；或穿戴设备 App 自带估算 | Uth–Sørensen 公式：`VO₂max ≈ 15 × HRmax / HRrest`；或 12 分钟跑测试 / Rockport 1.5 mi 走测 | ⭐⭐ |
| **握力（手部力量）** | 握力计读数 | 男 > 40 kg / 女 > 25 kg 为基线；左右差 > 10% 提示单侧弱 | ⭐ |
| **深蹲 1RM / 硬拉 1RM** | 杠铃重量 + 次数（≤ 10） | Epley：`1RM = weight × (1 + reps/30)`；Brzycki：`1RM = weight × 36/(37-reps)` | ⭐ |
| **体脂率** | 皮褶钳 / BIA 体脂秤 / DEXA | 男 10-20% / 女 18-28% 健康区间；增肌期可放宽至 12-18% / 20-30% | ⭐ |
| **瘦体重（去脂体重）** | 体重 + 体脂率 | `LBM = weight × (1 - bodyfat)`；增肌期月增 > 0.5 kg LBM 为优 | ⭐ |
| **睡眠时长 / 睡眠效率** | 手环睡眠 App | 7-9 h 为佳；< 6 h 连续 3 天 → 减量；REM 占比 < 15% → 恢复不足 | ⭐ |
| **训练容量（volume load）** | 单次训练 kg × reps × sets 累计 | 周容量环比 ± 10% 内安全；> +20%/周 受伤风险上升 | ⭐ |
| **RPE 主观疲劳度** | 训练末自评 1-10 | 平均 RPE > 8 连续 3 次 → 减量；< 5 可加量 | ⭐ |

**结论**：评估逻辑层 100% 纯前端可做，无需后端。

---

## 4. 三档落地路径（按成本 / 收益排）

### 🥉 第一档（最小） — 纯内容 + 手动录入 UI

**新增内容**：新建 `books/fitness-assessment/` 1-3 章（理论 + 自评表） + 在 app.js 增 1 个 form（HR / 静息 HR / 步数 / 睡眠 / 1RM / 体脂率 6 字段手动录） + LocalStorage 存历史

- **数据源**：用户看着手环 / 手机 App 屏幕录数字
- **APP_VERSION bump**：必须（新增 manifest 项）
- **代码量**：~150-200 行 JS + 1-3 章 markdown
- **可独立 commit**：✅
- **价值**：立刻可用，覆盖"看数字 + 评估"全流程
- **限制**：用户手动录，无自动化

### 🥈 第二档（中） — 加上 BLE 直连 + 后端代理

**在第一档基础上加**：

- **Web Bluetooth**：直连心率带 / 体脂秤 / 功率计——绕过系统健康 App，**GitHub Pages HTTPS ✅ + 用户手势授权 ✅**，这是最现实的"自动化"路径
- **后端代理**：Cloudflare Worker（免费层 10 万次/天）代理 Garmin / Fitbit / Oura OAuth + 缓存 JSON——前端只读
- **APP_VERSION bump**：必须
- **代码量**：~500-800 行 JS（Web Bluetooth 状态机）+ Cloudflare Worker ~50 行
- **价值**：覆盖 80% 主流手环的自动数据
- **限制**：Apple Health / 华为 / 小米 / Whoop 仍需手动录

### 🥇 第三档（重） — 全栈 + 移动 App 桥

- 把仓库从"纯静态站"升级为「静态站 + Cloudflare Worker 后端 + iOS / Android 原生壳（Capacitor）」——大改动，违背"不引入大架构变更"原则
- 本备忘**不推荐**第三档，留作 v4.0 重构时再考虑

---

## 5. 推荐落地顺序

按"用户立即可感知的价值 / 单次 commit 复杂度"排：

1. **下一轮**：第一档 MVP——新建 `books/fitness-assessment/` 1 章「体能评估总论：手环数字怎么读 + 9 大指标基线表」+ app.js 加 1 个 form（6 字段手动录）+ LocalStorage 历史曲线
2. **下下轮**：第一档深化——加 1 章「VO₂max 估算」+ 加 1 章「1RM 与训练容量」+ form 加握力 / RPE / 训练容量字段
3. **第三轮**：第二档 BLE——Web Bluetooth 心率带直连 + 体脂秤自动记录体重 / 体脂率
4. **第四轮**：第二档后端——Cloudflare Worker 代理 Garmin / Oura OAuth + 定时拉取 + 前端缓存读
5. **第五轮起**：视用户反馈决定要不要上第三档

每一轮都是独立 commit、可独立回滚、不引入大架构变更。

---

## 6. 与现有 9 本书的关系

| 现有书 | 关联章节 | 备注 |
|--------|---------|------|
| `nsca-cpt` | ch08 评估 / 测试 / 处方周期 | 本板块是 ch08 的"数字版延伸" |
| `badminton-recovery` | ch05-elbow / ch07-achilles 等 | 训练容量 + RPE 直接接 ch06 §六（康复训练量） |
| `badminton` | ch12-physical-training | 体能板块可作为 ch12 的"自评模块" |
| `nutrition` | ch03-营养时机 | 体脂率 / LBM 数据反哺营养方案 |
| `psychology` | ch03-动机 / ch09-习惯 | "每天手动录数字"本身就是习惯养成 |

**不需要新建第 10 本书**——本板块作为 4-5 本书的「应用模块」交叉存在比独立成书更合理（与 ch12 物理训练章节类似的"跨章工具"角色）。

---

## 7. 风险与决策点

- **R1**：手动录数字用户会不会嫌麻烦？——可加"快捷数值模板"（一键填近 7 天均值）；或与现有 LocalStorage 训练日志打通
- **R2**：Web Bluetooth 在 iOS Safari 上不支持（仅 macOS Safari 17+）——需要在 form 加文字说明"iOS 用户请手动录或用 Mac"
- **R3**：Cloudflare Worker 免费层 10 万次/天对个人站够不够？——Garmin / Oura 每天 1 次拉取 = 365 次/年，单用户无压力；多用户按 100 用户 = 36500 次/年，仍富余
- **D1**：本备忘**是否要在 manifest.json 注册**？——**不**，备忘非书籍内容，不进 manifest；下轮建书时再注册

---

## 8. 下轮 commit 前的检查清单

- [ ] 决定第一档 MVP 落到 `books/fitness-assessment/` 1 章（**新建第 10 本书**），还是落到 `books/nsca-cpt/` ch08 后插 ch11（**插章**）——前者更显眼但需 4 处注册，后者更轻但破坏章号连续
- [ ] 决定 form 6 字段的**单位制**（公制 kg/cm vs 英制 lb/in）——建议公制默认 + 英制可选
- [ ] 决定 LocalStorage 历史的**可视化**——纯数字列表 vs Chart.js 折线图（多 ~10 KB JS）

---

## 9. 一句话总结

> **本仓库当前栈下，「体能 / 增肌评估」逻辑层 100% 可做，「手环 / 手机健康数据源」仅 ~30% 可直连、其余 ~70% 需手动录或后端代理；推荐下一轮先做「第一档 MVP = 1 章内容 + 6 字段手动录 form + LocalStorage」，单次 commit、可独立回滚、零大架构变更。**

---

*本备忘对应 round 165 决策产物；下轮开始动手前请重新 review §5 推荐顺序 + §8 检查清单。*