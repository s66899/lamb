# Round 167 — feat(hypertrophy-lab): 新增「💪 增肌实验室」SPA 最小骨架

## 本轮干什么

**起点**：用户请求一个独立的「增肌实验室」SPA，4 大闭环（智能训练方案 / 营养方案 / 穿戴设备 API / AI 动态调整）+ 5 项交付清单（前后端代码 / 联合登录 / UI 稿 / 算法文档 / 200 食物库）。

**范围澄清**（用户已确认的 3 选）：
- 范围对齐：选 **独立 SPA「增肌实验室」**
- 现有工具基线：选 **采纳扫描结果**（fitness-assessment + nutrition + nsca-cpt ch04 作为现有基线）
- 本轮范围：选 **前端最小骨架**

按用户已确认的「不重复大改动」偏好，本轮交付**只做整合层**，不与现有 3 本书内容重复。

## 本轮交付

### 1. 4 周肌肥大线性周期模板
- `FIT_TEMPLATES.hypertrophy`：RIR 2-3 控制 + 每周 +2.5% 负荷 + 第 4 周减载
- 4 天/周 × 4 周（周一/三/五/六）
- 15 个 ex-lib id 全部已对照库内合法（0038/0085/0161/1490/0276/0025/0026/0864/0098/0032/0039/0040/0054/5202/1604）

### 2. 智能训练方案生成
- `submitHypertrophyPlan`：5 项参数（训练年限 / 每周天数 / 伤病史多选 / 1RM 选填）→ 自动推荐 hypertrophy 模板
- 复用 `renderFitnessPlan()` 显示 ex-lib GIF 链接（点击看动作演示）
- 膝/腰伤痛检测 → 警告先咨询物理治疗师 + 跳到 `badminton-recovery/ch03-knee.md` / `ch06-back.md`
- 新手 4 天/周 → 警告先做 2 周 3 天适应期

### 3. 营养方案计算
- `computeNutritionPlan`：BMR（Mifflin-St Jeor）+ TDEE × 活动系数
- 增肌盈余公式：`surplus = weeklyDelta × 7700 ÷ 7`，clamp [100, 600]
- 蛋白质 1.8 g/kg（Helms 2014 meta）+ 脂肪 0.8 g/kg + 余下碳水
- `buildSampleMeals`：4 餐分配示意（早 25 / 午 35 / 晚 30 / 加餐 10）
- **未做**：200 种食物库 + 每日饮食日志（路线图）

### 4. 疲劳自检 1-10 调整
- `applyFatigueAdjustment`：绿/黄/橙/红 4 档
- 1-3 绿（按计划）
- 4-6 黄（维持 + 加 1 次主动恢复）
- 7-8 橙（组数 ×0.7，次数 −2）
- 9-10 红（替换为辅助动作，组数 ×0.6）
- **这是用户请求的「穿戴设备未绑定时降级为手动 1-10 分调整」降级路径**

### 5. LocalStorage 持久化
- 单一 key `bk_hypertrophy_v1` 存 plan / nutrition / fatigue 三块
- 与 `fitness-assessment` ch01 同隐私策略：**纯本地，不上传服务器**

### 6. 入口集成
- TOOLS 数组加 `{icon:'💪',title:'增肌实验室',desc:'训练·营养·疲劳 全链路',action:'openHypertrophyLab()',color:'var(--red)'}`
- `renderToolItems()` 侧边栏加「💪 增肌实验室」子项

### 7. 4 埋点同步
- `APP_VERSION` v3.22.64 → **v3.22.65**
- `index.html` 三处 `?v=` 全部 v3.22.65
- `VERSION` 文件头注释 + 新增 v3.22.65 changelog 条目（30 → 31 条）
- `books/README.md` L11 数据源版本同步

## 显式不在本轮（后续路线图，已在面板 §4 明示）

- 穿戴设备 API（Apple HealthKit / 华为 / Oppo / Vivo / Webhook）
- 每日饮食日志 + 200 种食物库 + 模糊搜索
- AI 自动触发调整（连续 3 天睡眠 <6h → 自动替换下周大重量日）
- 用户账户体系（联合登录 + 数据库 + GDPR/PIPL 加密）
- Figma UI/UX 设计稿
- 训练-营养-疲劳 三合一看板（Chart.js 趋势图）

## 校验

- `node --check app.js` OK
- `python -m json.tool manifest.json` / `ex-lib.json` OK
- 4 个新功能函数 + 1 个新模板 + 1 个 LS key，单元测过：
  - `computeNutritionPlan`：男 75kg 178cm 28y 中度 → BMR 1728 / TDEE 2678 / surplus 275 / goal 2953 / P-C-F 135-468-60g ✓
  - 边界：weeklyDelta=0.5 → surplus 550 ✓；weeklyDelta=0 → 默认 0.25 (degrade to 275)；female 60kg → BMR 1320 ✓
  - `applyFatigueAdjustment`：1→绿 / 4→黄 / 7→橙 / 9→红 ✓
- 全项目 ex-lib sweep：inline 621 / unique 140 / broken 0（与 round166 不变）
- 15 个 hypertrophy 模板新引用 id 全部合法
- 4 埋点 100% 一致（app.js / index.html ×3 / VERSION / books/README.md 均 v3.22.65）
- 4 files / **+431 / -7**（一个 feature commit）

## Commit & Push

- `30bcc41` feat(hypertrophy-lab): 新增「💪 增肌实验室」SPA 最小骨架
- push 成功：`f9bae95..30bcc41 book -> book`
- ahead 0 干净

## 留给下一轮的下一项

1. 🥇 **增肌实验室 §2 营养 tab：补 unit toggle** — 当前 weight/height/age 是默认硬编码 70/175/25，缺「填入上次值」或「读 fitness-assessment 9 字段面板数据」（fitness-assessment ch01 已存 RHR/HRV/VO₂max/步数/睡眠/体重/体脂/深蹲 1RM/RPE）→ 跨模块数据复用
2. 🥈 **4 个核心参数面板的移动端响应式** — 本轮 SPA 用 details/summary 在窄屏上可能拥挤（健身房手机为主），下轮需 review CSS / 缩 input 宽度
3. 🥉 **hydration 复用**：openCalculators() 已有 calcWater()，本轮未在增肌实验室加 link 入口，下轮可加
4. **manual fatigue 持久化的 trend**：当前只存「最近一次」，缺「近 4 周趋势」，下轮可加简易 sparkline（无需 Chart.js）

## 备注

- 本轮是 round167，与用户增肌实验室请求一一对应
- 不重复大改动原则兑现：未改 nutrition/fitness-assessment/nsca-cpt 任一现有内容
- 4 埋点 vs round166 一致性：v3.22.64 → v3.22.65，标准 bump 流程
- 全项目 ex-lib 引用全 0 broken，9 个新引用 id 全部合法
