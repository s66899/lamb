// ═══════════════════════════════════════════════════════════════════
//  🏸 羽毛球系统训练 · NSCA-CPT 科学评估教学体系
// ═══════════════════════════════════════════════════════════════════

const RAW = 'https://raw.githubusercontent.com/s66899/lamb/book';
let MANIFEST = null;
let currentModule = 'dashboard';
let currentBookId = null;
let currentChapterIdx = -1;
let navStack = []; // 导航栈：追踪用户从哪里来

// ─── 版本 ─────────────────────────────────
const APP_VERSION = 'v3.5.4';
const APP_DATE = '2026-07-05';

// ─── 5大训练模块 ──────────────────────────
const TRAIN_MODULES = [
  { id:'badminton-tech', icon:'🏸', title:'羽毛球技术', color:'var(--blue)',
    desc:'基于NSCA-CSCS运动科学，融合世界顶级教练实战经验的手法·步伐·球路一体化训练体系',
    tags:['握拍','高远球','杀球','网前','步伐','球路','战术'], docs:20,
    books:['badminton'],
    chapters:['基础握拍与准备姿势','正手高远球技术','反手技术体系','网前小球技术','步伐体系','杀球与扣杀','平抽快挡','综合训练','常见错误纠正','比赛心理'] },
  { id:'strength', icon:'💪', title:'体能训练', color:'var(--green)',
    desc:'关节稳定·代谢适应·间歇训练·周期安排 — 科学力量与体能训练体系',
    tags:['肩关节','膝关节','核心力量','代谢','间歇','周期'], docs:18,
    books:['nsca-cpt'],
    chapters:['训练哲学','运动解剖','基础力量','爆发力训练','敏捷性','柔韧性','核心训练','周期化训练','损伤预防','恢复策略'] },
  { id:'psychology', icon:'🧠', title:'心理训练', color:'var(--purple)',
    desc:'注意力·压力适应·自我调节·决策信心 — 从动机心理学到赛场心理韧性',
    tags:['注意力','压力','自我对话','目标','心流','韧性'], docs:15,
    books:['psychology'],
    chapters:['动机理论','目标设定','注意力训练','压力管理','自我效能','心流体验','情绪调节','团队动力','比赛心理','心理韧性'] },
  { id:'nutrition', icon:'🍎', title:'营养恢复', color:'var(--orange)',
    desc:'TDEE计算·营养素分配·训练后恢复时间轴·睡眠优化 — 科学营养恢复体系',
    tags:['蛋白','碳水','脂肪','水合','睡眠','补剂'], docs:12,
    books:[],
    chapters:['🔥 TDEE每日总能耗','🥩 三大营养素分配','💧 确定水合需求','⏰ 训练后恢复时间线','🍽️ 训练前后营养窗口','🥩 蛋白质摄入策略','💧 电解质平衡','💊 运动补剂速查','🔄 周期化营养','⚖️ 体重管理'] },
  { id:'competition', icon:'🏆', title:'比赛策略', color:'var(--red)',
    desc:'对手分析·战术选择·节奏控制·体能分配 — 从准备到复盘完整比赛流程',
    tags:['对手分析','战术库','节奏','体能分配','复盘'], docs:14,
    books:[],
    chapters:['⚔️ 赛前1周倒计时','🎯 赛中关键策略','🧠 比赛心理准备','📊 对手分析框架','🔍 对手技术弱点','🏃 体能分配策略','🎬 实战案例学习','🔄 局间调整','📝 赛后复盘','🎯 长期比赛计划'] },
  { id:'coach', icon:'🎯', title:'教练板块', color:'var(--gold)',
    desc:'AI教练辅助 · 训练计划编排 · 动作分析指导 · 个性化周期规划',
    tags:['AI教练','训练计划','动作分析','周期规划','数据追踪'], docs:12,
    books:['nsca-cpt','badminton'],
    chapters:['训练计划设计原则','周期性训练编排','动作质量评估体系','训练负荷调控','个性化方案制定','技术诊断方法论','比赛录像分析','训练日志与复盘','运动员心理辅导','智能教练工具'] },
];

// ─── 模块内联内容（营养/比赛等无 book 映射的模块） ──
const MODULE_CONTENT = {
  nutrition: [
    // 1. TDEE
    `<div class="reader-module-content">
      <h2>🔥 TDEE 每日总能耗详解</h2>
      <p><strong>TDEE</strong>（Total Daily Energy Expenditure）= 基础代谢（BMR）+ 食物热效应（TEF）+ 活动消耗（PA）+ 运动消耗（EAT）。</p>
      <h3>基础代谢 BMR（Mifflin-St Jeor 公式）</h3>
      <p><strong>男性</strong>：BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 + 5</p>
      <p><strong>女性</strong>：BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 - 161</p>
      <p>示例：70kg / 175cm / 25岁男性 <br>BMR = 10×70 + 6.25×175 - 5×25 + 5 = 700 + 1093.75 - 125 + 5 = 1673.75 kcal</p>
      <h3>活动系数（PA）</h3>
      <table><tr><th>级别</th><th>系数</th><th>描述</th></tr><tr><td>久坐</td><td>1.2</td><td>办公室工作，几乎不运动</td></tr><tr><td>轻度</td><td>1.375</td><td>每周1-3天轻度运动</td></tr><tr><td>中度</td><td>1.55</td><td>每周3-5天中等运动（推荐）</td></tr><tr><td>高度</td><td>1.725</td><td>每周6-7天高强度训练</td></tr><tr><td>极高</td><td>1.9</td><td>专业运动员/体力劳动者</td></tr></table>
      <p><strong>计算</strong>：TDEE = BMR × 活动系数</p>
      <h3>食物热效应 TEF</h3>
      <p>蛋白质 TEF = 20-30%（最高）<br>碳水 TEF = 5-10%<br>脂肪 TEF = 0-3%<br>混合膳食平均 TEF = 总热量 × 10%</p>
      <h3>减脂/增肌热量调整</h3>
      <p><strong>减脂</strong>：TDEE - 300~500 kcal/天（每周减0.3-0.5kg）<br><strong>增肌</strong>：TDEE + 200~400 kcal/天（每周增0.2-0.3kg）<br><strong>维持</strong>：TDEE 不变</p>
      <p class="tip">💡 不要每天称体重。每周固定时间称一次，观察2周趋势再调整热量。快速减重（>1kg/周）会导致肌肉流失。</p>
      <hr><p><em>参考文献：Mifflin MD, et al. A new predictive equation for resting energy expenditure. Am J Clin Nutr. 1990. / NSCA-CPT 营养指南第4章</em></p>
    </div>`,
    // 2. 三大营养素
    `<div class="reader-module-content">
      <h2>🥩 三大营养素分配</h2>
      <p>运动营养的核心是三大宏量营养素的合理分配：蛋白质、碳水化合物、脂肪。</p>
      <h3>蛋白质（Protein）</h3>
      <table><tr><th>目标</th><th>推荐量 (g/kg/天)</th><th>总热量占比</th></tr><tr><td>维持</td><td>1.2 - 1.6</td><td>15-20%</td></tr><tr><td>增肌</td><td>1.6 - 2.0</td><td>20-25%</td></tr><tr><td>减脂</td><td>2.0 - 2.4</td><td>25-30%</td></tr></table>
      <p>蛋白质每次摄入上限约 0.4-0.55g/kg（最佳吸收），例如70kg运动员每餐约需28-38g蛋白。超过部分并不会增加肌肉合成速度，而是氧化供能或转化为脂肪。</p>
      <h3>碳水化合物（Carbohydrate）</h3>
      <table><tr><th>训练强度</th><th>推荐量 (g/kg/天)</th><th>总热量占比</th></tr><tr><td>休息日/低强度</td><td>2 - 3</td><td>40-45%</td></tr><tr><td>中等训练</td><td>3 - 5</td><td>45-55%</td></tr><tr><td>高强度/专业训练</td><td>5 - 7</td><td>55-65%</td></tr></table>
      <p>优先选择低GI碳水（全谷物、燕麦、薯类、豆类），训练后2小时内可用高GI碳水快速补充肌糖原。</p>
      <h3>脂肪（Fat）</h3>
      <p>推荐量：0.8 - 1.0 g/kg/天（占总热量20-25%）<br>低于20%会影响睾酮水平和脂溶性维生素吸收。</p>
      <table><tr><th>类型</th><th>推荐来源</th><th>占比</th></tr><tr><td>单不饱和</td><td>橄榄油、牛油果、坚果</td><td>10-15%</td></tr><tr><td>多不饱和（Omega-3）</td><td>深海鱼、亚麻籽、奇亚籽</td><td>5-10%</td></tr><tr><td>饱和脂肪</td><td>动物脂肪、椰子油</td><td>＜10%</td></tr><tr><td>反式脂肪</td><td>油炸食品、加工食品</td><td>＜1%</td></tr></table>
      <h3>实战比例速查</h3>
      <p><strong>增肌期</strong>：蛋白20% / 碳水55% / 脂肪25%（总TDEE+200~400）<br><strong>减脂期</strong>：蛋白30% / 碳水40% / 脂肪30%（总TDEE-300~500）<br><strong>维持期</strong>：蛋白20% / 碳水50% / 脂肪30%</p>
      <p class="tip">💡 70kg运动员增肌期（TDEE≈2600kcal + 300 = 2900kcal）：蛋白145g（20%）/ 碳水399g（55%）/ 脂肪81g（25%）</p>
      <hr><p><em>参考文献：NSCA-CPT第5版第11章·运动营养 / JISSN 2017, 14:31</em></p>
    </div>`,
    // 3. 水合
    `<div class="reader-module-content">
      <h2>💧 确定水合需求</h2>
      <p>水合状态直接影响运动表现。体重下降2%即可导致力量下降20%、耐力下降30%。</p>
      <h3>每日总水合需求</h3>
      <p><strong>日常基础</strong>：体重(kg) × 33ml<br><strong>训练加量</strong>：训练时长(min) × 12ml<br><strong>高温修正</strong>：环境温度>30°C 加20%</p>
      <p>示例：70kg运动员，训练60分钟，常温 → 70×33 + 60×12 = 2310 + 720 = <strong>3030ml</strong></p>
      <h3>训练中的水合策略</h3>
      <table><tr><th>时间</th><th>建议</th><th>量参考</th></tr><tr><td>训练前2h</td><td>补充500-600ml</td><td>一大瓶水</td></tr><tr><td>训练前15-30min</td><td>补充200-300ml</td><td>一小瓶水</td></tr><tr><td>训练中（每15-20min）</td><td>补充150-250ml</td><td>每15分钟喝几口</td></tr><tr><td>训练后</td><td>补回流失量的125-150%</td><td>称体重差×1.25</td></tr></table>
      <h3>判断水合状态的简易方法</h3>
      <p>① <strong>尿液颜色法</strong>：浅柠檬黄=水合良好，深琥珀色=脱水<br>② <strong>体重法</strong>：训练前后称体重差，每减1kg≈脱水1L<br>③ <strong>口渴感法</strong>：感到口渴时已脱水1-2%，不要等到口渴才补水</p>
      <h3>运动饮料的选择</h3>
      <p>训练<60分钟：白水足够<br>训练60-90分钟：6-8%碳水溶液（500ml水+30g糖+少量盐）<br>训练>90分钟：专业运动饮料+电解质补充</p>
      <p class="tip">💡 自制运动饮料：1L水 + 60g蜂蜜/糖 + 1g盐（约1/4茶匙）+ 少许柠檬汁</p>
      <hr><p><em>参考文献：ACSM Position Stand: Exercise and Fluid Replacement, 2007 / NSCA-CPT 营养学第5章</em></p>
    </div>`,
    // 4. 恢复时间线
    `<div class="reader-module-content">
      <h2>⏰ 训练后恢复时间线</h2>
      <p>训练后的恢复是训练效果的保障。科学恢复时间线根据训练后不同阶段，采取不同的恢复策略。

      <h3>训练后0-30分钟：快速恢复窗口</h3>
      <p><strong>目标</strong>：迅速补充肌糖原、启动肌肉修复<br><strong>碳水</strong>：1.0-1.2g/kg（高GI，如香蕉+运动饮料）<br><strong>蛋白</strong>：0.3-0.4g/kg（乳清蛋白最佳，快速吸收）<br><strong>水合</strong>：补回流失体重的125-150%</p>
      <p>示例：70kg运动员 → 70g碳水 + 25g蛋白 ≈ 一根香蕉+500ml运动饮料+一杯蛋白粉</p>

      <h3>训练后30分钟-2小时：正餐窗口</h3>
      <p><strong>目标</strong>：持续补充营养素、促进组织修复<br><strong>碳水化合物</strong>：1.5-2.0g/kg（中低GI为主）<br><strong>蛋白质</strong>：0.4-0.5g/kg（整蛋白如鸡胸肉、鱼、鸡蛋）<br><strong>脂肪</strong>：少量（不影响消化吸收）<br><strong>蔬菜</strong>：抗氧化物+微量元素</p>

      <h3>训练后2小时-睡前：恢复巩固期</h3>
      <p><strong>目标</strong>：降低皮质醇、促进睡眠质量<br><strong>恢复手段</strong>：泡沫轴10-15分钟（放松筋膜）<br><strong>拉伸</strong>：静态拉伸15-30秒每个肌群<br><strong>冷热交替浴</strong>：冷水1-3分钟 + 温水3-5分钟 × 3轮</p>
      <p><strong>营养补充</strong>：缓释蛋白（酪蛋白20-30g）或睡前酸奶+坚果</p>

      <h3>训练后次日：超量恢复期</h3>
      <p>训练后24-48小时出现超量恢复（Supercompensation）：
      <br>肌糖原合成速率峰值在训练后12-24小时
      <br>肌肉蛋白合成在训练后24-48小时持续升高
      <br>神经系统恢复需24-72小时</p>

      <h3>睡眠：最重要的恢复手段</h3>
      <table><tr><th>睡眠时长</th><th>恢复效果</th><th>生长激素分泌</th></tr><tr><td><6h</td><td>不足</td><td>↓ 70%</td></tr><tr><td>7-8h</td><td>良好</td><td>峰值（深度睡眠）</td></tr><tr><td>>9h</td><td>过剩</td><td>无明显额外收益</td></tr></table>
      <p class='tip'>💡 训练后不恢复=训练没效果。恢复不是偷懒，是训练的一部分。</p>
      <hr><p><em>参考文献：NSCA-CPT第6版·恢复与再生 / ISSN 2018 运动恢复指南</em></p>
    </div>`,
    // 5. 营养窗口
    `<div class="reader-module-content"><h2>🍽️ 训练前后营养窗口</h2>
      <p>训练前后的营养安排直接影响训练质量和恢复效果。不重视营养窗口，训练效果至少打五折。</p>

      <h3>训练前餐（训练前1.5-3小时）</h3>
      <p><strong>目标</strong>：保证训练时能量充足、防止低血糖<br><strong>碳水</strong>：1-2g/kg（中低GI，缓慢释放能量）<br><strong>蛋白</strong>：0.15-0.3g/kg（少量即可）<br><strong>脂肪</strong>：低（<15g，避免消化不良）<br><strong>水</strong>：训练前2小时补充500-600ml</p>
      <p>推荐餐单：</p>
      <ul><li>全麦面包2片 + 花生酱 + 香蕉</li><li>燕麦粥（50g） + 半个苹果 + 少量坚果</li><li>希腊酸奶 + 莓果 + 少量蜂蜜</li></ul>

      <h3>训练中补给（>60分钟训练）</h3>
      <p><strong>碳水</strong>：30-60g/小时（6-8%碳水溶液）<br><strong>水合</strong>：每15-20分钟150-250ml<br><strong>电解质</strong>：训练>90分钟补充钠（300-500mg/L）</p>

      <h3>训练后补餐（训练后30分钟内）</h3>
      <p><strong>目标</strong>：最大化肌糖原再合成、启动肌肉修复<br><strong>碳水</strong>：1.0-1.5g/kg（高GI，尽快补充糖原）<br><strong>蛋白</strong>：0.3-0.5g/kg（乳清蛋白首选）<br><strong>蛋白碳水比</strong>：1:3 到 1:4</p>
      <p>推荐：蛋白粉（25g）+ 运动饮料（500ml）+ 香蕉1根</p>

      <h3>不同训练类型的营养微调</h3>
      <table><tr><th>训练类型</th><th>训练前</th><th>训练后</th></tr><tr><td>力量训练</td><td>正常碳水+高蛋白</td><td>高蛋白+中碳水</td></tr><tr><td>耐力训练</td><td>高碳水（1-2g/kg）</td><td>高碳水+中蛋白</td></tr><tr><td>高强度间歇</td><td>高碳水+充足水合</td><td>高碳水+蛋白+电解质</td></tr><tr><td>技术训练</td><td>中碳水+正常水合</td><td>正常恢复餐即可</td></tr></table>
      <p class='tip'>💡 空腹训练会加速肌肉分解。即使是晨练，也建议吃一根香蕉或半片面包再训练。</p>
      <hr><p><em>参考文献：ACSM Joint Position Statement: Nutrition and Athletic Performance, 2016 / NSCA-CPT 运动营养</em></p>
    </div>`,
    // 6. 蛋白质策略
    `<div class="reader-module-content"><h2>🥩 蛋白质摄入策略</h2>
      <p>蛋白质是肌肉修复和增长的核心原料。合理分配蛋白质摄入比总量更重要。</p>

      <h3>每日总量的误区</h3>
      <p>很多人追求一天吃了多少克蛋白，但80%的人一天摄入的蛋白集中在晚餐一顿，其他餐不达标。肌肉蛋白合成（MPS）每次被激活持续约3-5小时，之后进入不应期。所以分餐比总量更重要。</p>

      <h3>蛋白质分配：4-5餐 × 0.4g/kg</h3>
      <p>理想模式：每餐摄入 0.4-0.55g/kg，间隔 3-5 小时</p>
      <p>70kg运动员参考：</p>
      <ul><li>早餐：28g（3个鸡蛋 + 一杯牛奶）</li><li>加餐：20g（希腊酸奶 200g）</li><li>午餐：35g（鸡胸肉 120g）</li><li>训练后：25g（蛋白粉1勺）</li><li>晚餐：35g（三文鱼 150g）</li><li>总计：约 143g（≈2.0g/kg）</li></ul>

      <h3>蛋白质来源质量排名</h3>
      <table><tr><th>来源</th><th>PDCAAS</th><th>特点</th></tr><tr><td>乳清蛋白</td><td>1.0</td><td>吸收最快，训练后首选</td></tr><tr><td>酪蛋白</td><td>1.0</td><td>缓释6-8h，睡前推荐</td></tr><tr><td>鸡蛋</td><td>1.0</td><td>氨基酸谱完整</td></tr><tr><td>牛肉/鸡胸肉</td><td>0.9-1.0</td><td>整蛋白+微量元素</td></tr><tr><td>鱼</td><td>0.9-1.0</td><td>富含Omega-3</td></tr><tr><td>大豆</td><td>0.9-1.0</td><td>植物蛋白最佳</td></tr><tr><td>大米/豌豆蛋白</td><td>0.7-0.8</td><td>需互补搭配</td></tr></table>

      <h3>亮氨酸触发阈值</h3>
      <p>每餐至少含 2-3g 亮氨酸才能最大化激活 MPS：<br>100g鸡胸肉 ≈ 2.8g亮氨酸<br>3个鸡蛋 ≈ 2.1g亮氨酸<br>1勺蛋白粉 ≈ 2.5g亮氨酸</p>

      <h3>特殊场景</h3>
      <p><strong>减脂期</strong>：蛋白提高到2.0-2.4g/kg，防止肌肉流失<br><strong>素食者</strong>：需要比正常多20-30%蛋白，注意互补（豆类+谷物）<br><strong>老年运动员</strong>：每餐需要更多亮氨酸（3-4g）对抗合成抵抗</p>
      <p class='tip'>💡 蛋白不是越多越好。超过2.4g/kg的额外蛋白不会增加肌肉，反而增加肾脏负担。</p>
      <hr><p><em>参考文献：Schoenfeld BJ, Aragon AA. How much protein can the body use? JISSN 2018 / NSCA-CPT Nutrition</em></p>
    </div>`,
    // 7. 电解质平衡
    `<div class="reader-module-content"><h2>💧 电解质平衡</h2>
      <p>电解质是维持神经传导和肌肉收缩的关键。大量出汗导致的电解质失衡是抽筋和疲劳的主要原因。</p>

      <h3>主要电解质及其功能</h3>
      <table><tr><th>电解质</th><th>功能</th><th>推荐日摄入</th><th>主要来源</th></tr><tr><td>钠 (Na+)</td><td>水平衡、神经信号</td><td>1500-2300mg</td><td>食盐、运动饮料</td></tr><tr><td>钾 (K+)</td><td>肌肉收缩、心悸稳定</td><td>3500-4700mg</td><td>香蕉、土豆、绿叶菜</td></tr><tr><td>钙 (Ca2+)</td><td>骨健康、肌肉收缩</td><td>1000-1300mg</td><td>奶制品、绿叶菜、豆腐</td></tr><tr><td>镁 (Mg2+)</td><td>肌肉放松、能量代谢</td><td>310-420mg</td><td>坚果、豆类、全谷物</td></tr><tr><td>氯 (Cl-)</td><td>胃酸、电解质平衡</td><td>2300-3600mg</td><td>食盐</td></tr></table>

      <h3>运动中电解质流失</h3>
      <p>1小时高强度羽毛球训练平均流失：<br>钠：800-1500mg<br>钾：200-400mg<br>镁：10-30mg</p>

      <h3>电解质补充策略</h3>
      <p><strong>训练<60分钟</strong>：白水足够<br><strong>训练60-90分钟</strong>：运动饮料（含钠300-500mg/L）<br><strong>训练>90分钟或高温环境</strong>：专业电解质粉 + 碳水</p>

      <h3>自制电解质饮料</h3>
      <p>1L水 + 1/4茶匙盐（≈500mg钠）+ 60g蜂蜜/糖 + 柠檬汁少许 + 可选：200mg镁粉</p>

      <h3>抽筋预防</h3>
      <p><strong>训练前</strong>：吃一根香蕉（钾）+ 喝足水<br><strong>训练中</strong>：每30分钟补充电解质<br><strong>训练后</strong>：多吃绿叶蔬菜和坚果<br><strong>长期</strong>：注意镁摄入（70%的人缺镁）</p>
      <p class='tip'>💡 半夜小腿抽筋往往是镁不足。睡前补充200-400mg镁可显著改善。</p>
      <hr><p><em>参考文献：ACSM Position Stand: Exercise and Fluid Replacement / ISSN 电解质指南</em></p>
    </div>`,
    // 8. 运动补剂
    `<div class="reader-module-content"><h2>💊 运动补剂速查</h2>
      <p>补剂是锦上添花，不是雪中送炭。先做好基础营养再考虑补剂。以下基于科学证据分级。</p>

      <h3>A级（强证据支持）</h3>
      <table><tr><th>补剂</th><th>剂量</th><th>效果</th><th>适合人群</th></tr><tr><td>乳清蛋白</td><td>20-40g/次</td><td>肌肉蛋白合成</td><td>所有运动员</td></tr><tr><td>肌酸</td><td>3-5g/天</td><td>力量+爆发力+认知</td><td>力量/爆发力运动</td></tr><tr><td>咖啡因</td><td>3-6mg/kg</td><td>耐力+警觉性</td><td>赛前/大强度训练</td></tr><tr><td>Beta-丙氨酸</td><td>3-6g/天</td><td>延迟肌肉酸胀感</td><td>1-4分钟高强度运动</td></tr><tr><td>碳酸氢钠</td><td>0.3g/kg</td><td>缓冲乳酸</td><td>高强度间歇训练</td></tr></table>

      <h3>B级（中等到弱证据）</h3>
      <p><strong>支链氨基酸（BCAA）</strong>：不如整蛋白有效，但训练中可减少感知疲劳<br><strong>谷氨酰胺</strong>：免疫支持，但正常饮食者无需额外补充<br><strong>HMB</strong>：可能减少肌肉分解，新手和老年人效果更好<br><strong>Omega-3</strong>：抗炎+恢复，2-3g EPA/DHA/天</p>

      <h3>C级（证据不足或不推荐）</h3>
      <p><strong>睾酮促进剂</strong>：无效<br><strong>CLA</strong>：减脂效果微乎其微<br><strong>左旋肉碱</strong>：减脂无效<br><strong>胶原蛋白</strong>：关节健康证据不足，不如吃够蛋白</p>

      <h3>补剂使用原则</h3>
      <p>① 补剂是补充，不是替代<br>② 一次最多用3种<br>③ 选择第三方认证品牌（NSF/Informed Sport）<br>④ 注意咖啡因总量（每天400mg以内安全）<br>⑤ 新手先从蛋白粉+肌酸开始</p>
      <p class='tip'>💡 99%的'专利配方'和'快速见效'都是营销。如果一个补剂吹得太夸张，那它就是夸张的。</p>
      <hr><p><em>参考文献：ISSN Exercise & Sport Nutrition Review / Australian Institute of Sport Supplement Classification</em></p>
    </div>`,
    // 9. 周期化营养
    `<div class="reader-module-content"><h2>🔄 周期化营养</h2>
      <p>周期化营养是指根据训练周期的不同阶段，调整营养策略以匹配训练需求和身体状态。</p>

      <h3>周期划分</h3>
      <table><tr><th>周期</th><th>训练重点</th><th>热量</th><th>蛋白</th><th>碳水</th></tr><tr><td>基础期</td><td>技术积累、力量基础</td><td>维持/微增</td><td>1.6-1.8g/kg</td><td>3-4g/kg</td></tr><tr><td>强度期</td><td>高强度、专项训练</td><td>维持+200</td><td>1.8-2.0g/kg</td><td>4-5g/kg</td></tr><tr><td>比赛期</td><td>减量、赛前准备</td><td>维持</td><td>1.6-1.8g/kg</td><td>5-6g/kg（碳加载）</td></tr><tr><td>恢复期</td><td>主动恢复</td><td>微减</td><td>1.4-1.6g/kg</td><td>2-3g/kg</td></tr></table>

      <h3>训练日 vs 休息日</h3>
      <p><strong>训练日</strong>：碳水高 + 适当高热量，支持训练+恢复<br><strong>休息日</strong>：碳水降低 + 热量微减，促进脂肪代谢敏感化</p>
      <p>一天碳水波动：训练日4-5g/kg → 休息日2-3g/kg（交替式周期化）</p>

      <h3>碳加载周期</h3>
      <p><strong>比赛前5-7天</strong>：<br>第5天：碳水稍减（2-3g/kg）→ 耗尽存量<br>第4天：碳水3-4g/kg<br>第3天：碳水5-6g/kg<br>第2天：碳水6-7g/kg<br>第1天（赛前）：碳水7-8g/kg + 充足水合</p>
      <p>碳加载可增加肌糖原储存20-50%，显著提升耐力表现。</p>
      <p class='tip'>💡 周期化营养不是天天吃一样的东西。聪明的运动员会根据体重、训练强度、周期阶段动态调整。</p>
      <hr><p><em>参考文献：Jeukendrup AE. Periodized Nutrition for Athletes. Sports Med 2017 / NSCA-CSCS 营养周期化</em></p>
    </div>`,
    // 10. 体重管理
    `<div class="reader-module-content"><h2>⚖️ 体重管理</h2>
      <p>运动员的体重管理不是简单的'减肥'，而是在保持/提升运动表现的前提下优化体成分。</p>

      <h3>体成分目标</h3>
      <table><tr><th>性别/项目</th><th>体脂率参考</th><th>BMI参考</th></tr><tr><td>男性羽毛球</td><td>8-15%</td><td>20-24</td></tr><tr><td>女性羽毛球</td><td>15-22%</td><td>18-22</td></tr><tr><td>一般健康男性</td><td>10-20%</td><td>18.5-24</td></tr><tr><td>一般健康女性</td><td>18-28%</td><td>18.5-24</td></tr></table>

      <h3>减脂指南</h3>
      <p><strong>安全速率</strong>：每周减0.3-0.5kg（过多会肌肉流失）<br><strong>热量缺口</strong>：每日TDEE-300~500kcal<br><strong>蛋白提高</strong>：升至2.0-2.4g/kg，保留肌肉<br><strong>碳水时机</strong>：训练日碳水集中在训练前后<br><strong>监控频率</strong>：每周称1次体重 + 每2周测围度</p>

      <h3>增肌指南</h3>
      <p><strong>热量盈余</strong>：每日TDEE+200~400kcal<br><strong>蛋白达标</strong>：1.6-2.0g/kg，分4-5餐<br><strong>碳水保证</strong>：3-5g/kg，保证训练强度<br><strong>耐心</strong>：健康增重每月0.5-1kg</p>

      <h3>平台期突破</h3>
      <p>① 调整热量：减脂期降低100-200kcal/天<br>② 调整训练：改变训练模式/增加负荷<br>③ 检查蛋白：是不是吃够<br>④ 检查睡眠：<7小时影响瘦素<br>⑤ 重新估算TDEE：体重变了，BMR也变了</p>

      <h3>体重管理雷区</h3>
      <p>❌ 每日称体重（体水分波动让你焦虑）<br>❌ 节食（掉代谢，掉肌肉，掉表现）<br>❌ 极低碳水（影响训练质量）<br>❌ 快速减重（>1kg/周几乎必然掉肌肉）<br>❌ 只看体重不看体脂（体重不变但体脂可以降）</p>
      <p class='tip'>💡 体重是数字，表现才是真相。3个月后你跑得更快、跳得更高、杀得更狠，体重的几斤浮动根本不重要。</p>
      <hr><p><em>参考文献：ACSM Guidelines for Exercise Testing and Prescription / NSCA 体成分管理</em></p>
    </div>`,
  ],
    competition: [
    // 1. 赛前1周
    `<div class="reader-module-content">
      <h2>⚔️ 赛前1周倒计时</h2>
      <p>赛前一周的决定性因素不是训练，而是管理。管理好状态、管理好身体、管理好心态。</p>
      <h3>倒计时安排</h3>
      <table><tr><th>天数</th><th>训练</th><th>营养</th><th>恢复</th></tr><tr><td>T-7</td><td>最后一次高强度训练</td><td>正常碳水</td><td>泡沫轴+拉伸</td></tr><tr><td>T-6</td><td>中等强度技术训练</td><td>正常</td><td>正常睡眠</td></tr><tr><td>T-5</td><td>中等强度技术训练</td><td>碳加载开始（3-4g/kg）</td><td>充足水合</td></tr><tr><td>T-4</td><td>低强度有氧+激活</td><td>碳水4-5g/kg</td><td>筋膜放松</td></tr><tr><td>T-3</td><td>比赛模拟（减量65%）</td><td>碳水5-6g/kg</td><td>睡眠充分</td></tr><tr><td>T-2</td><td>完整休息</td><td>碳水持续</td><td>轻运动+拉伸</td></tr><tr><td>T-1</td><td>激活训练（30min）</td><td>碳水6-7g/kg</td><td>早睡</td></tr><tr><td>比赛日</td><td>赛前热身</td><td>赛前餐(3h前)</td><td>上场</td></tr></table>
      <h3>赛前减量原则</h3>
      <p><strong>训练量</strong>：减到平时的40-60%<br><strong>强度</strong>：维持或微增（保持神经激活）<br><strong>频率</strong>：不减（保持肌肉记忆）</p>
      <h3>赛前心理准备清单</h3>
      <p>☐ 准备好比赛装备（球拍穿线、鞋、毛巾、水壶）<br>☐ 规划好交通和到达时间<br>☐ 写一个3句话的比赛计划（关键词触发）<br>☐ 想象成功的画面（积极的内心演练）</p>
      <p class="tip">💡 赛前一周不要尝试任何新东西。新球鞋、新食物、新动作——全部留在训练中验证过。</p>
      <hr><p><em>参考文献：Mujika I, Padilla S. Tapering for Performance. Sports Med 2003 / NSCA 比赛准备指南</em></p>
    </div>`,
    // 2. 赛中关键策略
    `<div class="reader-module-content">
      <h2>🎯 赛中关键策略</h2>
      <p>比赛中的决策质量决定比赛走向。以下策略体系来自世界级教练和运动员的实战经验。</p>
      <h3>开局策略（0-5分）</h3>
      <p><strong>目的</strong>：试探对手、建立节奏<br><strong>发球</strong>：2-3种发球轮换（不要只用一种）<br><strong>接发</strong>：以回中为主，不追求直接得分<br><strong>试探方向</strong>：对手正手位？反手位？网前？后场？<br><strong>关键数字</strong>：前5分至少打3种不同的球路</p>
      <h3>中期策略（5-15分）</h3>
      <p><strong>目的</strong>：消耗对手、扩大优势<br><strong>节奏变化</strong>：快→慢→快的交替<br><strong>线路选择</strong>：重复点+突然变线<br><strong>体能管理</strong>：长短球结合，让对手多跑</p>
      <h3>局末策略（15-21分）</h3>
      <p><strong>领先时</strong>：维持节奏、不冒险变线、耐心等待对手失误<br><strong>落后时</strong>：主动变节奏、增加变化、打不同球路增加不确定性<br><strong>关键分（20平以后）</strong>：用你最稳的球路、不要打你只有50%把握的球</p>
      <h3>局间调整</h3>
      <p>90秒局间休息：<br>0-30秒：擦汗、喝水、慢走<br>30-60秒：分析对手模式（这一局发现了什么）<br>60-90秒：制定下一局战术（1-2个执行点）</p>
      <h3>关键比赛原则</h3>
      <p>① 对手弱的球路多打、强的球路尽量避开<br>② 连续失分≥2分时必须变节奏<br>③ 不要跟对手比"谁更凶"——凶的前提是有把握<br>④ 每一分都是新的开始，不要想上一分</p>
      <p class="tip">💡 比赛的对手不是对面那个人，是你自己。谁先控制住自己的情绪，谁就赢了90%。</p>
      <hr><p><em>参考文献：林丹《直到世界尽头》比赛策略篇 / 李永波教练体系</em></p>
    </div>`,
    // 3. 比赛心理准备
    `<div class="reader-module-content">
      <h2>🧠 比赛心理准备</h2>
      <p>高水平比赛最后都是心理的比拼。技术层面的差距在赛前训练中已经决定，比赛中的胜负取决于心理调节。</p>
      <h3>赛前心理状态分级</h3>
      <table><tr><th>状态</th><th>心率(静息+)</th><th>表现</th></tr><tr><td>低迷</td><td>+0~5 bpm</td><td>反应慢，注意力散漫</td></tr><tr><td>热身最佳区</td><td>+10~20 bpm</td><td>专注、反应快、爆发力足</td></tr><tr><td>过度紧张</td><td>+30~50 bpm</td><td>动作僵硬、失误多、判断力下降</td></tr><tr><td>恐慌</td><td>+50+ bpm</td><td>完全失控</td></tr></table>
      <h3>激活法（进入最佳区）</h3>
      <p><strong>音乐激活</strong>：赛前听熟悉的激昂音乐3-5首<br><strong>动作激活</strong>：重击球、跨步、跳跃等大肌肉动作<br><strong>自我暗示</strong>："我准备好了""这场我能赢"简短有力的话<br><strong>呼吸激活</strong>：4-7-8呼吸法（吸气4秒-屏7秒-呼8秒）×3轮</p>
      <h3>降压法（应对过度紧张）</h3>
      <p><strong>场边冷处理</strong>：不看对手、不看比分、专注于自己的球拍<br><strong>正向自我对话</strong>："这只是训练中的一分"<br><strong>重置仪式</strong>：擦汗、拍球、调整球拍线——形成自己的"重启仪式"<br><strong>身体放松</strong>：抖动双手、深呼吸、摇头放松</p>
      <h3>赛中注意力管理</h3>
      <p>① <strong>聚焦当下</strong>：不追忆上一分，也不预测下一分<br>② <strong>执行计划</strong>：每分前想一个关键词触发动作<br>③ <strong>过程导向</strong>：关注"我要做什么"而非"我要赢"</p>
      <p class="tip">💡 顶级运动员的标志不是不紧张，而是能在紧张中继续执行正确的动作。</p>
      <hr><p><em>参考文献：James E. Loehr《The New Toughness Training for Sports》/ 运动心理学竞赛焦虑研究</em></p>
    </div>`,
    // 4. 对手分析框架
    `<div class="reader-module-content">
      <h2>📊 对手分析框架</h2>
      <p>知己知彼百战百胜。赛前对对手的分析应该系统化，避免临时看两眼就说"知道"。</p>
      <h3>分析维度清单</h3>
      <table><tr><th>维度</th><th>关注点</th><th>记录方法</th></tr><tr><td>技术维度</th><td>正手、反手、网前、杀球、防御</th><th>记录命中率</td></tr><tr><td>战术维度</th><td>常用球路、变化频率、套路</th><th>记录3种最常用套路</td></tr><tr><td>身体维度</th><td>速度、力量、耐力、柔韧</th><th>评估等级1-5</td></tr><tr><td>心理维度</th><td>关键分稳定性、失误后调整</th><th>观察反应</td></tr><tr><td>体能维度</th><td>多拍能力、长局表现</th><th>记录第3局后表现</td></tr></table>
      <h3>赛前情报收集</h3>
      <p>① <strong>录像分析</strong>：找到对手最近3-5场比赛的完整录像<br>② <strong>数据统计</strong>：发球得分率、接发得分率、网前得分率<br>③ <strong>弱点标注</strong>：画出对手"必胜球"和"必败球"<br>④ <strong>历史交锋</strong>：回顾你与对手过去交锋的情况</p>
      <h3>对手档案模板</h3>
      <p>姓名/右手或左手/身高体重/<br>常用发球: 1. 2. 3.<br>强势技术: 1. 2. 3.<br>薄弱环节: 1. 2. 3.<br>心理特征: 1. 2. 3.<br>战术倾向: 进攻型？拉吊型？防守反击型？<br>应对方案: 1. 2. 3.</p>
      <h3>场上即时观察（开局5分）</h3>
      <p>① 对手的移动范围和重心<br>② 击球时的稳定性<br>③ 各种球的实际速度<br>④ 在压力下的选择倾向</p>
      <p class="tip">💡 不要被对手的"名头"吓到。任何对手都有弱点，比赛开始前的分析决定你能否找到它。</p>
      <hr><p><em>参考文献：《Winning Ugly》Brad Gilbert / NSCA 运动情报学</em></p>
    </div>`,
    // 5. 对手技术弱点
    `<div class="reader-module-content">
      <h2>🔍 对手技术弱点识别</h2>
      <p>找到对手的弱点还不够，要懂得持续攻击弱点，让对手无法适应。</p>
      <h3>常见羽毛球弱点模式</h3>
      <table><tr><th>弱点类型</th><th>识别方法</th><th>攻击策略</th></tr><tr><td>反手弱</td><td>对手反手回球质量差</td><td>多打反手位+重复反手</td></tr><tr><td>网前弱</td><td>对手网前挑球高、放网下网</td><td>多放网+勾对角</td></tr><tr><td>过渡球弱</td><td>对手中场球处理粗糙</td><td>多打中场软压</td></tr><tr><td>后退慢</td><td>对手从网前退到后场迟钝</td><td>网前→后场组合球</td></tr><tr><td>前场慢</td><td>对手从后场上网迟钝</td><td>高远球→网前组合</td></tr><tr><td>心理崩</td><td>对手连续失分后失误率飙升</td><td>保持攻势不放松</td></tr></table>
      <h3>弱点的三大特征</h3>
      <p><strong>① 持续性</strong>：不是偶尔失误，而是每次打到那里都差<br><strong>② 不可调整</strong>：对手知道但调整不过来<br><strong>③ 多拍暴露</strong>：越打越长越暴露</p>
      <h3>攻击弱点的实战技巧</h3>
      <p>① <strong>伪装</strong>：从对手强的位置开始，让他以为你打强的方向<br>② <strong>突然</strong>：在他准备好之前突然变线到弱点<br>③ <strong>重复</strong>：同一线路连续3-5次，让对手无法应对<br>④ <strong>加大压力</strong>：球速/角度/落点都最刁</p>
      <h3>对手反扑的应对</h3>
      <p>对手会调整，所以要预留plan B：<br>① 第一次攻击失败 → 改打次弱方向<br>② 对手突然加强弱点 → 改打其他方向<br>③ 对手改变战术 → 重新观察5分再调整</p>
      <p class="tip">💡 真正的强者是"无弱点"的球员。普通球员3-5个弱点，顶尖球员只有1-2个。找到对手的弱点持续攻击是基本功。</p>
      <hr><p><em>参考文献：羽毛球队训练学·对手分析章 / 李矛教练战术分析</em></p>
    </div>`,
    // 6. 体能分配
    `<div class="reader-module-content">
      <h2>🏃 体能分配策略</h2>
      <p>羽毛球三局两胜可以打90分钟以上，没有体能分配意识的人会在第2局末或第3局崩溃。</p>
      <h3>比赛三局体能曲线</h3>
      <table><tr><th>阶段</th><th>体能水平</th><th>策略</th></tr><tr><td>第1局0-10分</td><td>100%</td><td>全力执行既定战术</td></tr><tr><td>第1局10-21分</td><td>85-90%</td><td>建立优势、控制节奏</td></tr><tr><td>第2局0-10分</td><td>75-85%</td><td>稳定心态、稳中求变</td></tr><tr><td>第2局10-21分</td><td>65-75%</td><td>体能决战期，谁撑住谁赢</td></tr><tr><td>第3局决胜</td><td>看恢复情况</td><td>拼意志+拼战术</td></tr></table>
      <h3>局间休息的科学利用</h3>
      <p>90秒局间：<br>0-30秒：补水（150-200ml）+ 慢走<br>30-60秒：呼吸调整（4-7-8呼吸 × 3轮）<br>60-90秒：擦汗、整理装备、心态调整</p>
      <h3>节省体能的实战技巧</h3>
      <p>① <strong>合理回位</strong>：不要每次都全力回中心，预判+站位<br>② <strong>有效击球</strong>：每分都打有目的的球，不浪费体力<br>③ <strong>借力打力</strong>：对手发力时挡/抽，不要对拉<br>④ <strong>节奏控制</strong>：根据体能调整回合速度</p>
      <h3>决胜局体能管理</h3>
      <p>第3局开局前5分：<br>① 优先恢复，不能开局就拼光<br>② 用你最擅长的开局方式<br>③ 不冒险球，稳中求胜<br>④ 关键分11分换边时再做心理和身体重置</p>
      <p class="tip">💡 体能不只是身体，更是心理。第3局输掉的比赛90%是心理先崩，身体还在。</p>
      <hr><p><em>参考文献：林丹体能训练课 / NSCA 羽毛球体能训练</em></p>
    </div>`,
    // 7. 实战案例
    `<div class="reader-module-content">
      <h2>🎬 实战案例学习</h2>
      <p>从真实比赛中提炼规律，比理论更能指导实战。</p>
      <h3>案例1：林丹 vs 李宗伟 2016里约半决赛</h3>
      <p><strong>背景</strong>：李宗伟世界排名第一，林丹第二，前两次交手李宗伟胜。</p>
      <p><strong>关键策略</strong>：<br>① 林丹主动放弃纯进攻模式，采用拉吊+突击<br>② 针对李宗伟正手区空当持续施压<br>③ 节奏控制：林丹故意放慢节奏，让李宗伟"有力无处使"<br>④ 关键分处理：林丹更敢出手（基于多次大赛经验）</p>
      <p><strong>结果</strong>：林丹2-1逆转，第3局关键时刻打出神仙球。</p>
      <p><strong>启示</strong>：顶级对决不是比谁更凶，而是比谁失误更少、关键分更稳。</p>
      <h3>案例2：业余选手反败为胜典型场景</h3>
      <p><strong>背景</strong>：业余比赛，第一局大比分落后（5-15）。</p>
      <p><strong>反败策略</strong>：<br>① 暂停后不再想比分，只打"下一个球"<br>② 主动变节奏：打之前从未用过的球路<br>③ 针对对手已经"放松警惕"的心态突袭<br>④ 减少无谓失误，用稳定回球消耗对手注意力</p>
      <p><strong>结果</strong>：连追10分反超。</p>
      <p><strong>启示</strong>：业余比赛心理因素占比远大于技术。领先的容易松懈，落后方一旦起势，对手很难应对。</p>
      <h3>案例3：双打配合失误典型</h3>
      <p><strong>背景</strong>：业余双打，两名选手争抢同一区域，导致空当。</p>
      <p><strong>问题</strong>：<br>① 分区不明确，前后职责重叠<br>② 沟通仅靠喊叫，节奏不一致<br>③ 一人被压制时另一人不知道补位</p>
      <p><strong>改进</strong>：<br>① 赛前明确"前后"或"左右"站位<br>② 建立简单暗号（如"我的"）<br>③ 形成"谁在前谁主导"的默契</p>
      <p class="tip">💡 比赛经验是最好的教练。多看比赛录像+赛后复盘，比看100篇战术文章都管用。</p>
      <hr><p><em>参考文献：BWF世界羽联官方比赛录像库 / 林丹自传《直到世界尽头》</em></p>
    </div>`,
    // 8. 局间调整
    `<div class="reader-module-content">
      <h2>🔄 局间调整</h2>
      <p>两局之间的90秒比场上每一秒都重要。这是唯一能"重启"的时刻。</p>
      <h3>局间调整的三大任务</h3>
      <p>① <strong>身体调整</strong>（30秒）：补水、降温、肌肉放松<br>② <strong>战术复盘</strong>（30秒）：刚才一局发生了什么？哪些有效哪些无效？<br>③ <strong>心态调整</strong>（30秒）：放下上一局，专注于下一局</p>
      <h3>一局结束后的快速复盘</h3>
      <p>必问3个问题：<br>① 上一局对手的什么球路让我最难受？<br>② 我做的最有效的战术是什么？<br>③ 下一局要保持什么、改变什么？</p>
      <h3>针对不同比分情况的调整</h3>
      <table><tr><th>情况</th><th>调整方向</th></tr><tr><td>领先较多</td><td>维持战术、控制失误、不打冒险球</td></tr><tr><td>落后较多</td><td>主动变化、用未展示过的战术突袭</td></tr><tr><td>比分胶着</td><td>坚持自己的节奏，不要被对手带偏</td></tr><tr><td>第2局失分快</td><td>可能体能/心态问题，简化战术稳住</td></tr></table>
      <h3>教练员局间指导</h3>
      <p>如果带教练比赛：<br>① 教练用最简洁的语言（2-3句话）<br>② 给1-2个具体执行点，不是泛泛建议<br>③ 永远先肯定再提改进<br>④ 注意语气：鼓励 > 指责</p>
      <p class="tip">💡 90秒局间能做的最重要的事不是讨论战术，而是让身体和心理都"重启"。</p>
      <hr><p><em>参考文献：BWF官方教练员培训教材 / 中国羽毛球队训练学</em></p>
    </div>`,
    // 9. 赛后复盘
    `<div class="reader-module-content">
      <h2>📝 赛后复盘</h2>
      <p>比赛结束不是终点，而是下一场比赛的起点。真正的成长发生在赛后复盘中。</p>
      <h3>复盘的黄金时间</h3>
      <p><strong>赛后30分钟内</strong>（情绪记忆最清晰）：<br>① 找一个安静的地方坐下<br>② 把即时感受写下来（不管好坏）<br>③ 评分：身体状态、心理状态、技术发挥各10分</p>
      <p><strong>赛后2小时内</strong>（细节记忆还清晰）：<br>① 重新看比赛录像或回忆关键分<br>② 列出3个做的好的地方和3个需要改进的地方<br>③ 标记关键转折分（比分发生重大变化的几个球）</p>
      <p><strong>赛后24小时内</strong>（认知更客观）：<br>① 和教练/球友讨论<br>② 写完整的复盘报告<br>③ 制定下阶段的训练调整计划</p>
      <h3>复盘模板</h3>
      <p>比赛日期/对手/比分/<br>技术表现（正手/反手/网前/杀球/步伐）：<br>战术执行（开局/中期/局末）：<br>心理状态（开局/中期/关键分）：<br>体能分配（三局体能曲线）：<br>亮点（3个）：<br>改进点（3个）：<br>下阶段训练调整：</p>
      <h3>胜负观</h3>
      <p>① <strong>赢了不飘</strong>：分析对手为什么失误而非自己发挥好<br>② <strong>输了不崩</strong>：找具体问题，下次针对性训练<br>③ <strong>过程导向</strong>：关注执行是否到位，而非比分<br>④ <strong>长期思维</strong>：一场比赛是长期训练的一次检验</p>
      <p class="tip">💡 复盘比训练更重要。一场不复盘的比赛=白打。一场深度复盘的比赛=额外获得10次训练。</p>
      <hr><p><em>参考文献：《复盘+》陈中 / 运动训练学复盘理论 / 羽毛球队教练员培训</em></p>
    </div>`,
    // 10. 长期比赛计划
    `<div class="reader-module-content">
      <h2>🎯 长期比赛计划</h2>
      <p>真正的比赛不只是上场那几小时，而是围绕比赛建立的全年/多年规划。</p>
      <h3>年度比赛计划制定</h3>
      <table><tr><th>阶段</th><th>时间</th><th>任务</th></tr><tr><td>赛季规划期</th><td>12-1月</td><th>确定年度比赛清单+目标</td></tr><tr><td>基础积累期</td><td>2-4月</td><th>体能+基本技术强化</td></tr><tr><td>专项强化期</td><td>5-7月</td><th>针对性战术+模拟比赛</td></tr><tr><td>比赛高峰期</th><td>8-10月</td><th>比赛为主+维持训练</td></tr><tr><td>总结调整期</th><td>11月</td><th>全年复盘+下年规划</td></tr></table>
      <h3>比赛分级管理</h3>
      <p><strong>A级（核心目标）</strong>：年度1-3个最重要的比赛，提前3-6个月规划<br><strong>B级（重要赛事）</strong>：月度1-2个重要比赛，提前1-2个月准备<br><strong>C级（练习赛）</strong>：周度训练性比赛，重在练手</p>
      <h3>每场比赛的角色</h3>
      <p>① <strong>核心目标比赛</strong>：调整到最佳状态，全力争胜<br>② <strong>重要比赛</strong>：比平时训练更投入，争取好成绩<br>③ <strong>练习赛</strong>：尝试新战术、新组合，不看重胜负</p>
      <h3>长期运动员发展</h3>
      <p>① <strong>年度目标</strong>：技术提升点+参赛目标+身体指标<br>② <strong>3年规划</strong>：技术全面性+战术体系+心理成熟<br>③ <strong>5年愿景</strong>：定位（业余高手/半专业/教练员）</p>
      <h3>避免的长期陷阱</h3>
      <p>❌ 频繁参赛无规划（过度疲劳+无法集中准备）<br>❌ 一场比赛决定论（单场胜负不代表真实水平）<br>❌ 训练和比赛割裂（每场比赛都应服务长期目标）<br>❌ 缺乏复盘的连续性（不复盘 = 没有进步）</p>
      <p class="tip">💡 业余选手一年能打10-30场比赛，每场比赛都有价值，前提是你有完整的规划。</p>
      <hr><p><em>参考文献：NSCA 长期训练计划理论 / 运动训练学 周期化训练</em></p>
    </div>`,
  ],
};

const LEVELS = [
  { id:'L0', label:'第零级 · 零基础启蒙', time:'0-1个月', emoji:'🌱',
    desc:'建立正确的神经肌肉控制模式，培养本体感觉和基础运动能力。从零到握拍和基本站位。' },
  { id:'L1', label:'第一级 · 基础建立', time:'1-3个月', emoji:'🌿',
    desc:'固化基础动作模式，建立关节稳定性和基础力量。高远球、网前小球基本动作定型。' },
  { id:'L2', label:'第二级 · 技术入门', time:'3-6个月', emoji:'🌳',
    desc:'掌握基础击球技术，建立步法连贯性和基本战术意识。反手、步伐开始成型。' },
  { id:'L3', label:'第三级 · 技术熟练', time:'6-12个月', emoji:'🔥',
    desc:'实现技术自动化，掌握技术变化和简单战术应用。杀球、网前勾对角等进阶技术。' },
  { id:'L4', label:'第四级 · 技术精进', time:'1-1.5年', emoji:'💫',
    desc:'技术精细化打磨，掌握高级技术和战术应用。平抽快挡、多拍对抗。' },
  { id:'L5', label:'第五级 · 战术应用', time:'1.5-2年', emoji:'👑',
    desc:'建立完整战术体系，提升比赛阅读能力和战术执行。球路组合、节奏变化。' },
  { id:'L6', label:'第六级 · 准专业', time:'2-2.5年', emoji:'🏆',
    desc:'全面发展各项能力，适应专业训练强度和比赛准备。心理韧性、体能分配。' },
  { id:'L7', label:'第七级 · 专业水平', time:'2.5-3年+', emoji:'🐉',
    desc:'达到专业水平，掌握比赛掌控和心理抗压能力。精英级训练体系。' },
];

// ─── 书塔书籍映射（次要入口） ──────────
const TOWER_BOOKS = ['badminton','finance','psychology','engineering-mechanics','nsca-cpt','yin-yang'];

// ═══════════════════════════════════════════════════════════════════
//  🎮 RPG 系统（保持完整）
// ═══════════════════════════════════════════════════════════════════
const RP_KEY = 'lamb_rpg_data';
function getRP() { try { return JSON.parse(localStorage.getItem(RP_KEY)||'{}'); } catch { return {}; } }
function setRP(r) { localStorage.setItem(RP_KEY, JSON.stringify(r)); }
function getDefaultRP() { return { level:1, xp:0, xpToNext:100, achievements:{}, quests:{}, totalRead:0, totalQuizCorrect:0, avatar:'🧙' }; }
function initRP() { let r=getRP(); if(!r.level){r=getDefaultRP();setRP(r);} r.xpToNext=getXpForLevel(r.level); return r; }
function getXpForLevel(lvl) { return Math.floor(50*Math.pow(1.2,lvl-1)); }
function calcLevel(xpTotal) {
  let lvl=1, needed=50;
  while(xpTotal>=needed){xpTotal-=needed;lvl++;needed=Math.floor(50*Math.pow(1.2,lvl-1));}
  return {level:lvl,xp:xpTotal,xpToNext:needed};
}
function addXP(amount,source='📖') {
  let r=getRP();if(!r.level)r=getDefaultRP();
  const oldLvl=r.level;let totalXp=calcTotalXp(r.level,r.xp);totalXp+=amount;
  const ns=calcLevel(totalXp);r.level=ns.level;r.xp=ns.xp;r.xpToNext=ns.xpToNext;setRP(r);
  updateRpgHud();if(ns.level>oldLvl)showLevelUp(oldLvl,ns.level);showXpPopup(amount,source);
}
function calcTotalXp(lvl,xp){let t=xp;for(let i=1;i<lvl;i++)t+=getXpForLevel(i);return t;}
function showXpPopup(amt,src){const e=document.createElement('div');e.className='xp-popup';e.textContent=`+${amt} XP ${src}`;document.getElementById('app').appendChild(e);setTimeout(()=>e.remove(),900);}
function showLevelUp(oldLvl,newLvl){const t=['修行者','探索者','学者','智者','大师','宗师','传说'];const ot=t[Math.min(6,Math.floor(oldLvl/3))],nt=t[Math.min(6,Math.floor(newLvl/3))];const tc=ot!==nt;const o=document.createElement('div');o.className='levelup-overlay';o.innerHTML=`<div class="levelup-box"><div class="lu-icon">🎉</div><div class="lu-title">🎊 ${tc?'称号晋升！':'升级！'}</div><div style="font-size:48px;font-weight:700;color:var(--gold);margin:8px 0">Lv.${oldLvl} → Lv.${newLvl}</div>${tc?`<div style="font-size:14px;color:var(--text2);margin-bottom:8px">${ot} → <strong style="color:var(--green)">${nt}</strong></div>`:''}<div class="lu-sub">✨ ${['继续前行！','智慧增长！','每页都是成长！','坚持不懈！','学识如海！'][Math.min(4,Math.floor(newLvl/4))]}</div><div style="margin:12px 0;font-size:12px;color:var(--text3)">🎁 升级奖励：<span style="color:var(--green)">+${Math.floor(newLvl*100)} XP</span></div><button class="lu-btn" onclick="addXP(${Math.floor(newLvl*100)},'🎊 升级');this.closest('.levelup-overlay').remove()">🎯 领取奖励</button></div>`;document.body.appendChild(o);checkAchievements();}
function updateRpgHud(){const r=initRP(),h=$('rpgHud');if(!h)return;const pct=r.xpToNext>0?Math.min(100,Math.round(r.xp/r.xpToNext*100)):0;h.innerHTML=`<div class="rpg-level" onclick="openStats()"><span class="lvl">Lv.${r.level}</span><span>${r.avatar}</span></div><div class="rpg-xp-bar"><div class="rpg-xp-fill" style="width:${pct}%"></div></div><span class="rpg-xp-text">${r.xp}/${r.xpToNext}</span><div class="rpg-badge achievement" onclick="openAchievements()">🏆 ${Object.values(r.achievements||{}).filter(v=>v).length}</div><div class="rpg-badge quest" onclick="openQuests()">📋 任务</div>`;}

// ─── 进度系统 ──────────────────────────────────
const PK='bk_prog';
function getP(){try{return JSON.parse(localStorage.getItem(PK)||'{}');}catch{return {};}}
function setP(p){localStorage.setItem(PK,JSON.stringify(p));}
function markRead(bid,f){const p=getP();if(!p[bid])p[bid]=[];if(!p[bid].includes(f)){p[bid].push(f);setP(p);const r=getRP();if(!r.level){setRP(getDefaultRP());}r.totalRead=(r.totalRead||0)+1;setRP(r);addXP(10,'📖');checkAchievements();}updateProgress();}
function unmarkRead(bid,f){const p=getP();if(p[bid]){p[bid]=p[bid].filter(x=>x!==f);setP(p);}updateProgress();}
function isRead(bid,f){const p=getP();return p[bid]&&p[bid].includes(f);}
function chProgress(bid){const b=MANIFEST?.books.find(x=>x.id===bid);if(!b||!b.chapters.length)return 0;const p=getP();const d=(p[bid]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;return d/b.chapters.length;}
function totalP(){const total=MANIFEST?MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0):0;if(!total)return 0;let d=0;const p=getP();for(const b of MANIFEST.books)d+=(p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;return d/total;}
function updateProgress(){const tp=totalP();const bar=$('heroBar');if(bar)bar.style.width=(tp*100)+'%';const badge=$('progressBadge');if(badge)badge.textContent=Math.round(tp*100)+'%';updateRpgHud();}

// ─── 成就系统 ──────────────────────────────────
const ACHIEVEMENTS={
  first_read:{icon:'📖',name:'初次阅读',desc:'读完第一章',check:(r)=>r.totalRead>=1},
  reader_10:{icon:'📚',name:'阅读达人',desc:'读完10章',check:(r)=>r.totalRead>=10},
  reader_50:{icon:'📚',name:'知识探险家',desc:'读完50章',check:(r)=>r.totalRead>=50},
  level_5:{icon:'⭐',name:'初出茅庐',desc:'达到5级',check:(r)=>r.level>=5},
  level_10:{icon:'🌟',name:'知识学徒',desc:'达到10级',check:(r)=>r.level>=10},
  level_20:{icon:'💫',name:'知识大师',desc:'达到20级',check:(r)=>r.level>=20},
  quiz_master:{icon:'🧪',name:'测验大师',desc:'答对50道',check:(r)=>r.totalQuizCorrect>=50},
  quiz_guru:{icon:'🎯',name:'测验宗师',desc:'答对200道',check:(r)=>r.totalQuizCorrect>=200},
  full_book:{icon:'🎉',name:'完成一本书',desc:'读完一本书全部章节',check:(r)=>checkAnyBookComplete()},
  all_books:{icon:'👑',name:'六艺精通',desc:'六本书全部完成',check:(r)=>checkAllBooksComplete()},
};
function getTotalChapters(){return MANIFEST?MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0):0;}
function checkAnyBookComplete(){if(!MANIFEST)return false;const p=getP();for(const b of MANIFEST.books){const d=(p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;if(d>=b.chapters.length)return true;}return false;}
function checkAllBooksComplete(){if(!MANIFEST)return false;const p=getP();for(const b of MANIFEST.books){const d=(p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;if(d<b.chapters.length)return false;}return true;}
function checkAchievements(){const r=getRP();if(!r.achievements)r.achievements={};let u=false;for(const[k,ach]of Object.entries(ACHIEVEMENTS)){if(!r.achievements[k]&&ach.check(r)){r.achievements[k]=true;u=true;showAchievementPopup(ach);}}if(u)setRP(r);updateRpgHud();}
function showAchievementPopup(ach){const e=document.createElement('div');e.className='ach-popup';e.innerHTML=`<div class="ach-icon">${ach.icon}</div><div class="ach-name">🏆 ${ach.name}</div><div class="ach-desc">${ach.desc}</div>`;document.body.appendChild(e);setTimeout(()=>{e.style.transition='opacity .4s';e.style.opacity='0';setTimeout(()=>e.remove(),500);},3500);}
function openAchievements(){const r=getRP();if(!r.achievements)r.achievements={};let h='<div class="ach-grid">';for(const[k,ach]of Object.entries(ACHIEVEMENTS)){const u=!!r.achievements[k];h+=`<div class="ach-item ${u?'unlocked':'locked'}"><div class="ai-icon">${ach.icon}</div><div class="ai-name">${ach.name}</div><div class="ai-desc">${u?'✅ '+ach.desc:'🔒 '+ach.desc}</div></div>`;}h+='</div>';showOverlay('panel-achievement','🏆 成就',h);}

// ─── 每日任务 ──────────────────────────────
const $=id=>document.getElementById(id);
const $$=s=>document.querySelectorAll(s);
function getDailyQuests(){return[{id:'daily_read',icon:'📖',name:'每日阅读',desc:'读一章',check:(r)=>true,reward:'+20 XP'},{id:'daily_quiz',icon:'🧪',name:'测验',desc:'答对3题',check:(r)=>(r.totalQuizCorrect||0)>=3}];}
function openQuests(){const r=getRP();if(!r.quests)r.quests={};const qs=getDailyQuests();let h='<div class="quest-list">';for(const q of qs){const done=r.quests[q.id];h+=`<div class="quest-item ${done?'completed':''}"><div class="qi-icon">${q.icon}</div><div class="qi-info"><div class="qi-name">${q.name}</div><div class="qi-desc">${q.desc}</div><div class="qi-reward">🎁 ${q.reward}</div></div>${done?'✅':''}</div>`;}h+='</div>';showOverlay('panel-quest','📋 每日任务',h);}

// ─── Stats ──────────────────────────────
function openStats(){const tp=totalP();const totalCh=MANIFEST?MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0):0;const p=getP();let totalRead=0;for(const b of MANIFEST.books)totalRead+=(p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;const r=initRP();const achCount=Object.values(r.achievements||{}).filter(v=>v).length;const content=`<div class="stats-grid"><div class="stat-card"><div class="sc-num">${totalRead}</div><div class="sc-label">✅ 已通关</div></div><div class="stat-card"><div class="sc-num">${totalCh-totalRead}</div><div class="sc-label">📖 未读</div></div><div class="stat-card"><div class="sc-num">${MANIFEST.books.length}</div><div class="sc-label">📚 书塔</div></div><div class="stat-card"><div class="sc-num">${Math.round(tp*100)}%</div><div class="sc-label">📊 总进度</div></div></div><div style="text-align:center;margin:14px 0"><span style="font-size:36px">${r.avatar}</span><div style="font-size:14px;font-weight:600;margin:4px 0">Lv.${r.level} · 🧪 ${r.xp}/${r.xpToNext} XP</div><div style="font-size:11px;color:var(--text2)">🏆 ${achCount} 成就 · 🧪 ${r.totalQuizCorrect||0} 测验</div></div>`;showOverlay('panel-stats','📊 训练报告',content);}

// ═══════════════════════════════════════════════════════════════════
//  🏠 Dashboard 首页渲染（对标参考站风格）
// ═══════════════════════════════════════════════════════════════════

function renderDashboard() {
  currentModule = 'dashboard';
  showView('dashboard');
  const r = initRP();

  // ── Stats ──
  $('sModules').textContent = TRAIN_MODULES.length;
  $('sDocs').textContent = TRAIN_MODULES.reduce((s,m)=>s+m.docs,0);
  $('sCycle').textContent = '3yr';
  $('heroSub').textContent = `${TRAIN_MODULES.length}大训练模块 · 融合心理学·营养学·比赛策略 · 基于NSCA-CSCS科学体系`;
  // 版本号（首页可见）
  const verEl = document.createElement('div');
  verEl.style.cssText = 'font-size:9px;color:var(--text4);margin-top:4px;cursor:pointer';
  verEl.textContent = `${APP_VERSION} · ${APP_DATE}`;
  verEl.onclick = () => openStats();
  const heroSub = $('heroSub');
  if (heroSub && !document.getElementById('heroVersion')) {
    verEl.id = 'heroVersion';
    heroSub.after(verEl);
  } else {
    const existing = document.getElementById('heroVersion');
    if (existing) existing.textContent = `${APP_VERSION} · ${APP_DATE}`;
  }

  // ── ⚡ 核心原则 ──
  $('principlesSection').innerHTML = `
    <div class="section-divider"><span class="sd-label">⚡ 核心训练原则</span><div class="sd-line"></div></div>
    <div class="principles-table">
      <div class="principle-row header">
        <span class="pr-col1">原则</span>
        <span class="pr-col2">为什么</span>
        <span class="pr-col3">什么不能做</span>
      </div>
      <div class="principle-row">
        <span class="pr-col1"><strong>动作质量 > 训练数量</strong></span>
        <span class="pr-col2">神经肌肉系统记住的是你重复最多的模式，练错的动作重复100次=巩固100次错误</span>
        <span class="pr-col3">不能用"做了多少次"衡量训练效果</span>
      </div>
      <div class="principle-row">
        <span class="pr-col1"><strong>神经肌肉控制 > 力量输出</strong></span>
        <span class="pr-col2">神经系统先学会控制肌肉，肌肉才能发力。顺序不能反</span>
        <span class="pr-col3">不能在动作模式不稳定时加重量</span>
      </div>
      <div class="principle-row">
        <span class="pr-col1"><strong>预防损伤 > 追求表现</strong></span>
        <span class="pr-col2">一次受伤=倒退回起点，恢复时间往往是训练时间的3-10倍</span>
        <span class="pr-col3">不能在疲劳状态下冲击极限</span>
      </div>
      <div class="principle-row">
        <span class="pr-col1"><strong>长期发展 > 短期进步</strong></span>
        <span class="pr-col2">神经系统适应需要4-6周，结缔组织初步适应约8-12周</span>
        <span class="pr-col3">不能每周都加量</span>
      </div>
    </div>
    <div class="principle-footer">这四个原则不是建议，是底线。任何训练安排必须同时满足四条才能执行。</div>`;

  // ── 🏆 训练等级体系 ──
  $('levelSection').innerHTML = LEVELS.map(l => `
    <div class="level-card" onclick="openLevelDetail('${l.id}')">
      <div class="lc-badge">${l.id}</div>
      <div class="lc-emoji">${l.emoji}</div>
      <div class="lc-label">${l.label}</div>
      <div class="lc-time">${l.time}</div>
      <div class="lc-desc">${l.desc}</div>
    </div>`).join('');

  // ── 🎯 教练系统 (仅次于首页) ──
  $('moduleSection').innerHTML = `
    <div class="module-card coach-highlight" onclick="openCoach()" style="border-top:3px solid var(--gold);background:linear-gradient(135deg,var(--bg2),rgba(255,214,10,.04))">
      <div class="mc-icon">🎯</div>
      <div class="mc-title">教练系统 <span style="font-size:9px;background:var(--gold);color:#000;padding:1px 6px;border-radius:8px;margin-left:4px;font-weight:600">RECOMMEND</span></div>
      <div class="mc-desc">AI教练辅助 · 训练计划编排 · 动作分析 · 6专家21轮研讨体系</div>
      <div class="mc-tags">
        <span class="mc-tag" style="border-color:rgba(255,214,10,.3);color:var(--gold)">学员评估</span>
        <span class="mc-tag" style="border-color:rgba(255,214,10,.3);color:var(--gold)">计划设计</span>
        <span class="mc-tag" style="border-color:rgba(255,214,10,.3);color:var(--gold)">课例模板</span>
        <span class="mc-tag" style="border-color:rgba(255,214,10,.3);color:var(--gold)">速查手册</span>
        <span class="mc-tag" style="border-color:rgba(255,214,10,.3);color:var(--gold)">教练系统</span>
      </div>
      <div class="mc-foot"><span>🏆 6专家 · 21轮研讨</span><span class="mc-arrow">进入教练工作台 →</span></div>
    </div>` + TRAIN_MODULES.filter(m=>m.id!=='coach').map(m => {
    const colors = {'var(--blue)':'#4f9aff','var(--green)':'#3dd68c','var(--purple)':'#a855f7','var(--orange)':'#f59e0b','var(--red)':'#f06060'};
    const c = colors[m.color]||'#4f9aff';
    return `<div class="module-card" onclick="openTrainModule('${m.id}')" style="border-top:3px solid ${c}">
      <div class="mc-icon">${m.icon}</div>
      <div class="mc-title">${m.title}</div>
      <div class="mc-desc">${m.desc}</div>
      <div class="mc-tags">${m.tags.map(t=>`<span class="mc-tag" style="border-color:${c}20;color:${c}">${t}</span>`).join('')}</div>
      <div class="mc-foot"><span>📖 ${m.docs} 教学文档</span><span class="mc-arrow">查看详情 →</span></div>
    </div>`;
  }).join('');

  // ── 🛠️ 评估工具 ──
  const TOOLS = [
    {icon:'🩺',title:'功能筛查',desc:'6个测试·10分钟·每月重测',action:'openScreening()',color:'var(--blue)'},
    {icon:'📊',title:'级别定位',desc:'回答问题找到起始级别',action:'openLevelFinder()',color:'var(--purple)'},
    {icon:'✅',title:'状态自查',desc:'绿/黄/红码训练决策',action:'openWeeklyCheck()',color:'var(--green)'},
    {icon:'🔍',title:'训练诊断',desc:'60+症状→原因→方案',action:'openDiagnosis()',color:'var(--orange)'},
    {icon:'🧮',title:'计算工具',desc:'TDEE·水合·训练量计算',action:'openCalculators()',color:'var(--red)'},
  ];
  $('toolsSection').innerHTML = TOOLS.map(t => `
    <div class="tool-card" onclick="${t.action}">
      <div class="tc-icon">${t.icon}</div>
      <div class="tc-title">${t.title}</div>
      <div class="tc-desc">${t.desc}</div>
    </div>`).join('');

  // ── 🧮 快速参考公式 ──
  $('referenceSection').innerHTML = `
    <div class="ref-card">
      <div class="ref-title">🔥 TDEE 每日总能耗</div>
      <div class="ref-formula">BMR = 10×体重(kg) + 6.25×身高(cm) - 5×年龄 + 5 <span style="color:var(--text3);font-size:10px">(男)</span></div>
      <div class="ref-formula">BMR = 10×体重(kg) + 6.25×身高(cm) - 5×年龄 - 161 <span style="color:var(--text3);font-size:10px">(女)</span></div>
      <div class="ref-detail">久坐×1.2 · 轻度×1.375 · 中度×1.55 · 高度×1.725</div>
    </div>
    <div class="ref-card">
      <div class="ref-title">🥩 三大营养素</div>
      <div class="ref-formula"><span style="color:var(--red)">蛋白</span> 维持1.2-1.6 / 增肌1.6-2.0 / 减脂2.0-2.4 g/kg</div>
      <div class="ref-formula"><span style="color:var(--orange)">脂肪</span> 0.8-1.0 g/kg (20-25%)</div>
      <div class="ref-formula"><span style="color:var(--blue)">碳水</span> 休息2-3 / 训练3-5 / 高强度5-7 g/kg</div>
    </div>
    <div class="ref-card">
      <div class="ref-title">💧 水合公式</div>
      <div class="ref-formula">日常 = 体重(kg) × 33ml</div>
      <div class="ref-formula">训练 = 时长(min) × 12ml</div>
      <div class="ref-formula">高温(>30°C) +20%</div>
    </div>
    <div class="ref-card" style="grid-column:1/-1;text-align:center;padding:10px 0;cursor:pointer" onclick="openCalculators()">
      <span style="font-size:12px;color:var(--blue)">📐 打开完整计算工具 →</span>
    </div>`;

  // ── 📚 书塔入口 ──
  renderTowerEntry();
  renderSidebar();
  updateProgress();
}

// ─── 📚 书塔入口（首页底部） ──────────────
function renderTowerEntry() {
  const totalCh = MANIFEST ? MANIFEST.books.reduce((s,b)=>s+b.chapters.length,0) : 0;
  const totalWords = MANIFEST ? MANIFEST.books.reduce((s,b)=>s+(b.totalWords||0),0) : 0;
  const tp = totalP();
  const p = getP(); let done=0; for(const b of MANIFEST.books) done+=(p[b.id]||[]).filter(f=>b.chapters.some(c=>c.file===f)).length;

  $('towerSection').innerHTML = `
    <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px">
      ${MANIFEST ? MANIFEST.books.map(b => {
        const bp = chProgress(b.id);
        return `<div class="tower-book-card" onclick="goToBook('${b.id}')">
          <div style="font-size:28px;margin-bottom:4px">${b.emoji}</div>
          <div style="font-size:11px;font-weight:500">${b.title}</div>
          <div style="font-size:9px;color:var(--text3)">${b.chapters.length}关 · ${Math.round(bp*100)}%</div>
          <div style="height:3px;background:var(--bg4);border-radius:2px;margin-top:4px;overflow:hidden">
            <div style="height:100%;width:${Math.round(bp*100)}%;background:${b.color};border-radius:2px"></div>
          </div>
        </div>`;
      }).join('') : ''}
    </div>
    <div style="text-align:center;margin-top:4px;font-size:10px;color:var(--text3)">
      共${totalCh}关 · ${(totalWords/10000).toFixed(1)}万字 · 已完成${done}关 · 总进度${Math.round(tp*100)}%
    </div>`;
}

// ─── 侧边栏 ──────────────────────────────
function renderSidebar() {
  const list = $('bookList');
  let html = '';
  // ── 顶级导航 ──
  html += '<div class="side-section side-section-links">';
  html += `<div class="side-link ${currentModule==='dashboard'?'active':''}" onclick="goHome()"><span class="sl-icon">🏠</span> 首页</div>`;
  html += `<div class="side-link ${currentModule==='coach'?'active':''}" onclick="openCoach()"><span class="sl-icon">🎯</span> 教练系统</div>`;
  html += '</div>';

  // ── 阅读（折叠）──
  const isReadingActive = currentModule === 'book' || currentBookId;
  html += `<div class="side-section"><div class="side-title collapsible" onclick="toggleSideSection(this)">📚 阅读</div>`;
  html += `<div class="side-collapsible" ${isReadingActive?'':'style="display:none"'}>${renderBookListItems()}</div>`;
  html += '</div>';

  // ── 训练系统（折叠）──
  const isTrainingActive = ['badminton-tech','strength','psychology','nutrition','competition'].includes(currentModule);
  html += `<div class="side-section"><div class="side-title collapsible" onclick="toggleSideSection(this)">💪 训练系统</div>`;
  html += `<div class="side-collapsible" ${isTrainingActive?'':'style="display:none"'}>${renderTrainingItems()}</div>`;
  html += '</div>';

  // ── 工具（折叠）──
  html += `<div class="side-section"><div class="side-title collapsible" onclick="toggleSideSection(this)">🛠️ 工具集</div>`;
  html += `<div class="side-collapsible" style="display:none">${renderToolItems()}</div>`;
  html += '</div>';

  list.innerHTML = html;
}

function renderBookListItems() {
  if (!MANIFEST) return '';
  return MANIFEST.books.filter(b=>TOWER_BOOKS.includes(b.id)).map(b => {
    const p = chProgress(b.id);
    return `<div class="b-item ${currentBookId===b.id?'active':''}" data-bid="${b.id}" onclick="goToBook('${b.id}')">
      <span class="be">${b.emoji}</span><span class="bt">${b.title}</span>
      <span class="bc">${b.chapters.length}</span><span class="bp" style="width:${Math.round(p*100)}%"></span>
    </div>`;
  }).join('');
}

function renderTrainingItems() {
  return TRAIN_MODULES.filter(m=>m.id!=='coach').map(m => {
    return `<div class="side-link sub ${currentModule===m.id?'active':''}" onclick="openTrainModule('${m.id}')"><span class="sl-icon">${m.icon}</span> ${m.title}</div>`;
  }).join('');
}

function renderToolItems() {
  return [
    `<div class="side-link sub" onclick="openScreening()"><span class="sl-icon">🛡️</span> 损伤筛查</div>`,
    `<div class="side-link sub" onclick="openCalculators()"><span class="sl-icon">🧮</span> 计算工具</div>`,
    `<div class="side-link sub" onclick="openDiagnosis()"><span class="sl-icon">🔍</span> 训练诊断</div>`,
    `<div class="side-link sub" onclick="openWeeklyCheck()"><span class="sl-icon">✅</span> 周检查</div>`,
    `<div class="side-link sub" onclick="openLevelFinder()"><span class="sl-icon">📊</span> 级别定位</div>`,
  ].join('');
}

function toggleSideSection(el) {
  const section = el.parentElement.querySelector('.side-collapsible');
  if (section) section.style.display = section.style.display==='none' ? 'block' : 'none';
}

// ─── 训练模块详情 ────────────────────────
function openTrainModule(modId) {
  const mod = TRAIN_MODULES.find(m=>m.id===modId);
  if (!mod) return;
  currentModule = modId;
  showView('book');
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>${mod.icon} ${mod.title}</h1>
    <div class="vm">${mod.desc}</div>`;
  $('bookStats').innerHTML = `
    <div class="bs-item"><span class="bs-num">${mod.chapters.length}</span><span class="bs-label">📖 训练主题</span></div>
    <div class="bs-item"><span class="bs-num">${mod.tags.length}</span><span class="bs-label">🏷️ 核心标签</span></div>
    <div class="bs-item"><span class="bs-num">${mod.docs}</span><span class="bs-label">📚 教学文档</span></div>`;
  $('contentGrid').innerHTML = mod.chapters.map((title, i) => `
    <div class="chapter-card fade-in" onclick="openModuleTopic('${mod.id}',${i})">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${mod.color};opacity:.6"></div>
      <div class="cc-num">${String(i+1).padStart(2,'0')}</div>
      <div class="cc-title">${title}</div>
      <div class="cc-foot"><span>${mod.icon}</span><span style="color:${mod.color}">学习 →</span></div>
    </div>`).join('');
  updateProgress();
}

// ─── 模块主题（跳转到对应书籍章节） ──────
function openModuleTopic(modId, topicIdx) {
  const mod = TRAIN_MODULES.find(m=>m.id===modId);
  if (!mod || !MANIFEST) return;
  // 保存导航状态：从模块进入
  navStack.push({view:'module', moduleId: modId});
  // 优先使用 topics 精确映射（每个主题对应一个 book+ch）
  if (mod.topics && mod.topics[topicIdx]) {
    const topic = mod.topics[topicIdx];
    const book = MANIFEST.books.find(b=>b.id===topic.book);
    if (book && book.chapters[topic.ch]) {
      currentBookId = topic.book;
      currentModule = 'tower';
      openChapter(topic.ch);
      return;
    }
  }
  // 降级：用 mod.books 和 topicIdx 模运算找章节
  if (mod.books && mod.books.length) {
    for (const bid of mod.books) {
      const book = MANIFEST.books.find(b=>b.id===bid);
      if (book && book.chapters.length > 0) {
        const chIdx = Math.min(topicIdx % book.chapters.length, book.chapters.length - 1);
        currentBookId = bid;
        currentModule = 'tower';
        openChapter(chIdx);
        return;
      }
    }
  }
  // 降级：使用内联内容（营养/比赛等无 book 映射的模块）
  if (MODULE_CONTENT[modId] && MODULE_CONTENT[modId][topicIdx]) {
    renderModuleInline(mod, topicIdx);
    return;
  }
  // 无匹配 → 回到模块视图
  navStack.pop();
  openTrainModule(modId);
}

// ─── 渲染模块内联内容 ───
function renderModuleInline(mod, topicIdx) {
  showView('reader');
  const html = MODULE_CONTENT[mod.id][topicIdx];
  const title = mod.chapters[topicIdx].replace(/^[^\w一-龥]+/, '').trim();
  $('readerTitle').textContent = `${mod.icon} ${mod.title} · ${title}`;
  $('chapterPos').textContent = `${topicIdx+1}/${mod.chapters.length}`;
  $('readMarkBtn').textContent = '📌';
  const hasPrev = topicIdx > 0;
  const hasNext = topicIdx < mod.chapters.length - 1;
  $('readerNav').innerHTML = `
    <button class="tb-btn" onclick="renderModuleInline(TRAIN_MODULES.find(m=>m.id==='${mod.id}'), ${topicIdx-1})" ${hasPrev?'':'disabled'}>◀ 上一节</button>
    <button class="tb-btn" onclick="openTrainModule('${mod.id}')">⏏ 返回模块</button>
    <button class="tb-btn" onclick="renderModuleInline(TRAIN_MODULES.find(m=>m.id==='${mod.id}'), ${topicIdx+1})" ${hasNext?'':'disabled'}>下一节 ▶</button>`;
  $('article').innerHTML = html;
  $('content').scrollTo({top:0,behavior:'smooth'});
  updateProgress();
  historyPush('module-inline', {moduleId: mod.id, topicIdx: topicIdx});
}

// ─── 仅渲染模块内容（不重置 navStack） ──
function renderModuleOnly(modId) {
  const mod = TRAIN_MODULES.find(m=>m.id===modId);
  if (!mod) return;
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>${mod.icon} ${mod.title}</h1>
    <div class="vm">${mod.desc}</div>`;
  $('bookStats').innerHTML = `
    <div class="bs-item"><span class="bs-num">${mod.chapters.length}</span><span class="bs-label">📖 训练主题</span></div>
    <div class="bs-item"><span class="bs-num">${mod.tags.length}</span><span class="bs-label">🏷️ 核心标签</span></div>
    <div class="bs-item"><span class="bs-num">${mod.docs}</span><span class="bs-label">📚 教学文档</span></div>`;
  $('contentGrid').innerHTML = mod.chapters.map((title, i) => `
    <div class="chapter-card fade-in" onclick="openModuleTopic('${mod.id}',${i})">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${mod.color};opacity:.6"></div>
      <div class="cc-num">${String(i+1).padStart(2,'0')}</div>
      <div class="cc-title">${title}</div>
      <div class="cc-foot"><span>${mod.icon}</span><span style="color:${mod.color}">学习 →</span></div>
    </div>`).join('');
  updateProgress();
}

// ─── 级别详情 ────────────────────────────
function openLevelDetail(levelId) {
  const lvl = LEVELS.find(l=>l.id===levelId);
  if (!lvl) return;
  showOverlay('panel-sm', `${lvl.emoji} ${lvl.label}`, `
    <div style="text-align:center;padding:8px">
      <div style="font-size:48px;margin-bottom:8px">${lvl.emoji}</div>
      <div style="font-size:16px;font-weight:600;margin-bottom:4px">${lvl.label}</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:10px">⏱ ${lvl.time}</div>
      <div style="font-size:13px;line-height:1.6;color:var(--text2)">${lvl.desc}</div>
      <div style="margin-top:14px;font-size:10px;color:var(--blue)">🔍 使用级别定位器找到你的当前级别</div>
    </div>`);
}

// ─── 工具页面 ────────────────────────────
function openScreening() {
  showView('book');
  currentModule = 'screening';
  navStack.push({view:'dashboard'});
  historyPush('screening', {});
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>🩺 羽毛球专项功能筛查</h1>
    <div class="vm">BSFS v1.0 · 6个测试 · 10分钟完成 · 每月重测</div>`;
  $('bookStats').innerHTML = '';
  $('contentGrid').innerHTML = `
    <div style="grid-column:1/-1;background:var(--bg3);border-radius:var(--radius);padding:16px 18px;margin-bottom:6px">
      <div style="font-size:13px;font-weight:500;margin-bottom:6px">🎯 为什么做功能筛查？</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.6">识别身体薄弱环节，预防运动损伤，制定个性化训练计划。这个筛查专门为羽毛球运动设计，比通用筛查更有效。</div>
    </div>

    <div class="screening-test" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600">1️⃣ 动态平衡测试</span>
        <span style="font-size:9px;color:var(--text3)">Y-Balance</span>
      </div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        单腿站立，双手叉腰，另一腿分别向前/后内/后外三个方向伸展，记录最大距离(cm)，计算：(前方+后内+后外)÷(3×腿长)×100
      </div>
      <div class="score-standard"><span>>90%</span><span>80-90%</span><span>70-80%</span><span>≤70%</span></div>
      <div class="score-desc"><span>3分·步法稳定</span><span>2分·基本稳定</span><span>1分·需加强</span><span>0分·不稳定</span></div>
    </div>

    <div class="screening-test" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600">2️⃣ 单腿跳跃测试</span>
        <span style="font-size:9px;color:var(--text3)">Single-Leg Hop</span>
      </div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        单腿站立向前跳跃，测量跳距(cm)÷腿长，每侧3次取最佳
      </div>
      <div class="score-standard"><span>>1.5</span><span>1.3-1.5</span><span>1.1-1.3</span><span><1.1</span></div>
      <div class="score-desc"><span>3分·起跳有力</span><span>2分·正常</span><span>1分·需加强</span><span>0分·弱</span></div>
    </div>

    <div class="screening-test" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600">3️⃣ 侧向移动测试</span>
        <span style="font-size:9px;color:var(--text3)">Lateral Shuffle</span>
      </div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        双脚并拢站在线旁，侧向跳跃过线再跳回，30秒总次数×2（换算每分钟）
      </div>
      <div class="score-standard"><span>>80次/分钟</span><span>60-80</span><span>40-60</span><span><40</span></div>
      <div class="score-desc"><span>3分·移动快</span><span>2分·正常</span><span>1分·需加强</span><span>0分·慢</span></div>
    </div>

    <div class="screening-test" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600">4️⃣ 肩关节稳定性</span>
        <span style="font-size:9px;color:var(--text3)">Shoulder Stability</span>
      </div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        双手举过头顶保持平衡，另一人轻推手臂，观察稳定性
      </div>
      <div class="score-standard"><span>完全稳定</span><span>轻微晃动</span><span>明显不稳</span></div>
      <div class="score-desc"><span>3分·击球稳定</span><span>2分·基本稳定</span><span>1分·需肩袖强化</span></div>
    </div>

    <div class="screening-test" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600">5️⃣ 核心耐力测试</span>
        <span style="font-size:9px;color:var(--text3)">Side Bridge</span>
      </div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        侧桥姿势保持，身体成直线，双侧都测取较差值
      </div>
      <div class="score-standard"><span>>60秒</span><span>45-60秒</span><span>30-45秒</span><span><30秒</span></div>
      <div class="score-desc"><span>3分·核心稳定</span><span>2分·正常</span><span>1分·需加强</span><span>0分·差</span></div>
    </div>

    <div class="screening-test" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600">6️⃣ 髋关节灵活性</span>
        <span style="font-size:9px;color:var(--text3)">Hip Flexion Test</span>
      </div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        仰卧桌边，一腿抱向胸口，另一腿自然下垂，观察大腿能否接触桌面
      </div>
      <div class="score-standard"><span>正常</span><span>轻度紧张</span><span>明显紧张</span></div>
      <div class="score-desc"><span>3分·步幅大</span><span>2分·正常</span><span>1分·需拉伸</span></div>
    </div>

    <div style="grid-column:1/-1;text-align:center;padding:10px;font-size:10px;color:var(--text3)">
      🛡️ 预防性训练：平衡差→单腿站立 · 肩不稳→弹力带外旋 · 核心差→侧桥 · 髋紧→拉伸
    </div>`;
}

function openCalculators() {
showView("book");
currentModule="calculators";
navStack.push({view:"dashboard"});
historyPush("calculators",{});
document.getElementById("bookHeader").innerHTML='<div class="back" onclick="goBack()">← 返回</div><h1>🧮 训练计算工具</h1><div class="vm">选参数→自动结果</div>';
document.getElementById("bookStats").innerHTML="";
document.getElementById("contentGrid").innerHTML="<div class=\"qw-step\"><div style=\"font-size:16px;font-weight:700;margin-bottom:10px;color:var(--blue)\">🔥 TDEE</div><div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px\"><label>性别<select id=\"tdeeGender\" style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"><option value=male>男</option><option value=female>女</option></select></label><label>体重(kg)<input id=\"tdeeWeight\" type=number value=70 style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label><label>身高(cm)<input id=\"tdeeHeight\" type=number value=175 style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label><label>年龄<input id=\"tdeeAge\" type=number value=25 style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label><label>活动<select id=\"tdeeActivity\" style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"><option value=1.2>久坐</option><option value=1.375>轻度</option><option value=1.55 selected>中度</option><option value=1.725>高度</option><option value=1.9>极高</option></select></label></div><button onclick=\"calcTDEE()\" class=\"qw-btn\" style=\"background:var(--blue);color:#fff;border:none;width:100%\">🔥 计算 TDEE</button><div id=\"tdeeResult\" style=\"margin-top:8px;font-size:12px\"></div></div><div class=\"qw-step\"><div style=\"font-size:16px;font-weight:700;margin-bottom:10px;color:var(--green)\">🥩 营养素</div><div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px\"><label>体重<input id=\"macroWeight\" type=number value=70 style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label><label>目标<select id=\"macroGoal\" style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"><option value=maintain>维持</option><option value=gain>增肌</option><option value=lose>减脂</option></select></label><label>TDEE<input id=\"macroTDEE\" type=number value=2500 style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label></div><button onclick=\"calcMacro()\" class=\"qw-btn\" style=\"background:var(--green);color:#fff;border:none;width:100%\">🥩 计算营养素</button><div id=\"macroResult\" style=\"margin-top:8px;font-size:12px\"></div></div><div class=\"qw-step\"><div style=\"font-size:16px;font-weight:700;margin-bottom:10px;color:var(--blue)\">💧 水合</div><div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px\"><label>体重<input id=\"waterWeight\" type=number value=70 style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label><label>训练(分钟)<input id=\"waterTrain\" type=number value=60 style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"></label><label>温度<select id=\"waterTemp\" style=\"display:block;width:100%;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:12px\"><option value=1>常温</option><option value=1.2>&gt;30°C</option></select></label></div><button onclick=\"calcWater()\" class=\"qw-btn\" style=\"background:var(--blue);color:#fff;border:none;width:100%\">💧 计算水合</button><div id=\"waterResult\" style=\"margin-top:8px;font-size:12px\"></div></div><div class=\"qw-step\"><div style=\"font-size:16px;font-weight:700;margin-bottom:10px;color:var(--gold)\">⏰ 恢复时间线</div><div style=\"display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;color:var(--text2)\"><div style=\"background:var(--surface2);padding:10px;border-radius:var(--radius-sm)\"><strong style=\"color:var(--blue)\">0-30分</strong><br>快速碳水1-1.2g/kg+蛋白0.3-0.4g/kg</div><div style=\"background:var(--surface2);padding:10px;border-radius:var(--radius-sm)\"><strong style=\"color:var(--blue)\">30分-2h</strong><br>正餐(碳水+蛋白+蔬菜)</div><div style=\"background:var(--surface2);padding:10px;border-radius:var(--radius-sm)\"><strong style=\"color:var(--blue)\">2h-睡前</strong><br>泡沫轴10-15分钟</div><div style=\"background:var(--surface2);padding:10px;border-radius:var(--radius-sm)\"><strong style=\"color:var(--gold)\">睡眠7-9h</strong><br>⭐ 组织修复</div></div></div>";
updateProgress();
}function openDiagnosis() {
  showOverlay('panel-sm', '🔍 训练问题诊断', `
    <div class="diag-list">
      <div class="diag-item"><strong style="color:var(--text)">动作标准但没进步</strong><br><span style="color:var(--text2);font-size:11px">→ 检查训练量/恢复/变式</span></div>
      <div class="diag-item"><strong style="color:var(--text)">动作越练越差</strong><br><span style="color:var(--text2);font-size:11px">→ 疲劳累积/加量太快</span></div>
      <div class="diag-item"><strong style="color:var(--text)">训练中某个部位痛</strong><br><span style="color:var(--text2);font-size:11px">→ 刺痛=停 · 酸胀=正常</span></div>
      <div class="diag-item"><strong style="color:var(--text)">能完成但"使不上劲"</strong><br><span style="color:var(--text2);font-size:11px">→ 检查动力链顺序</span></div>
      <div class="diag-item"><strong style="color:var(--text)">体能跟不上技术训练</strong><br><span style="color:var(--text2);font-size:11px">→ 加强基础体能/代谢适应</span></div>
      <div class="diag-item"><strong style="color:var(--text)">比赛时技术变形</strong><br><span style="color:var(--text2);font-size:11px">→ 压力适应训练/模拟比赛</span></div>
    </div>`);
}

function openWeeklyCheck() {
  showOverlay('panel-sm', '✅ 每周状态自检', `
    <div style="margin-bottom:12px;font-size:11px;color:var(--text2);text-align:center">训练前必做，根据状态调整当日训练强度</div>
    <div class="w-check">
      <div class="wc-item wc-green">
        <div class="wc-icon">🟢</div>
        <div><strong>绿码：可正常训练</strong><br><span style="font-size:10px;color:var(--text2)">24-48h恢复 · 精力≥7/10</span></div>
      </div>
      <div class="wc-item wc-yellow">
        <div class="wc-icon">🟡</div>
        <div><strong>黄码：减量50%</strong><br><span style="font-size:10px;color:var(--text2)">48h仍酸痛 · 精力4-6/10</span></div>
      </div>
      <div class="wc-item wc-red">
        <div class="wc-icon">🔴</div>
        <div><strong>红码：休息</strong><br><span style="font-size:10px;color:var(--text2)">精力<4/10 · 有刺痛 · 睡眠<5h</span></div>
      </div>
    </div>`);
}

function openLevelFinder() {
  showOverlay('panel-sm', '📊 级别定位器', `
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px;text-align:center">回答以下问题，找到你的起始训练级别</div>
    <div style="font-size:11px;line-height:2;color:var(--text2)">
      <p>1. 你能连续正手高远球对打几个来回？</p>
      <p style="padding-left:12px">→ 0-3个 = L0 · 3-10个 = L1 · 10+个 = L2+</p>
      <p style="margin-top:6px">2. 你能反手发球/接球吗？</p>
      <p style="padding-left:12px">→ 不会 = L0-1 · 基本会 = L2 · 熟练 = L3+</p>
      <p style="margin-top:6px">3. 你一次能跑多远（步法）？</p>
      <p style="padding-left:12px">→ 半场吃力 = L0-1 · 全场可以 = L2-3 · 覆盖自如 = L4+</p>
      <p style="margin-top:6px">4. 你有战术意识吗？</p>
      <p style="padding-left:12px">→ 没有 = L0-2 · 基本有 = L3-4 · 完整体系 = L5+</p>
    </div>
    <div style="margin-top:12px;text-align:center;font-size:10px;color:var(--text3)">详细评估请参考训练等级体系</div>`);
}

// ─── 🎯 教练板块 ──────────────────────────
function openCoach() {
  showView('book');
  currentModule = 'coach';
  navStack.push({view:'dashboard'});
  historyPush('coach', {});
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>🎯 教练板块</h1>
    <div class="vm">教练工作台 · 学员评估 · 训练设计 · 6专家21轮研讨体系</div>`;
  $('bookStats').innerHTML = `
    <div class="bs-item"><span class="bs-num">6</span><span class="bs-label">📚 教学模块</span></div>
    <div class="bs-item"><span class="bs-num">13</span><span class="bs-label">📖 知识章节</span></div>
    <div class="bs-item"><span class="bs-num">30+</span><span class="bs-label">🧪 测评题目</span></div>
    <div class="bs-item"><span class="bs-num">21</span><span class="bs-label">🔄 研讨轮次</span></div>`;
  $('contentGrid').innerHTML = `
    <!-- 教练系统主入口 -->
    <div class="calc-card" style="background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--gold);border-radius:var(--radius);padding:16px;grid-column:1/-1">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div style="font-size:32px">🏟️</div>
        <div style="flex:1;min-width:200px">
          <div style="font-size:14px;font-weight:600;margin-bottom:2px;color:var(--gold)">羽毛球教练系统 · 教练工作台</div>
          <div style="font-size:10px;color:var(--text2);line-height:1.5">
            6位专家联合21轮研讨出品 · 从零基础到独立执教的系统化教练成长路径<br>
            📊 评估 → 📋 计划 → 📚 学习 → ⚡ 速查 → 🎬 实战
          </div>
        </div>
        <a href="javascript:void(0)" onclick="openCoachInline('coach/index.html','教练工作台')" class="tb-btn" style="font-size:12px;padding:6px 14px;background:var(--gold);color:#000;border:none;font-weight:600">🚀 打开教练工作台</a>
      </div>
    </div>

    <!-- 核心工具卡片 -->
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:28px;margin-bottom:6px">📊</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:4px">学员水平评估</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.5;margin-bottom:8px">
        省队/市队/国家队选材级测评。<br>
        30+题目，6大维度，7级结果。
      </div>
      <a href="javascript:void(0)" onclick="openCoachInline('coach/level-assessment.html','学员水平评估')" class="tb-btn">📋 开始评估 →</a>
    </div>

    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:28px;margin-bottom:6px">📚</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:4px">教练速成指导书</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.5;margin-bottom:8px">
        13章完整体系：教练素养→运动科学→训练方法→体能→营养→康复→心理→课例模板
      </div>
      <a href="javascript:void(0)" onclick="openCoachInline('coach/coach-guide.html','教练速成指导书')" class="tb-btn">📖 开始学习 →</a>
    </div>

    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:28px;margin-bottom:6px">⚡</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:4px">教练速查手册</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.5;margin-bottom:8px">
        7-16岁训练路径总览。<br>
        按年龄给答案：教什么/不教什么/怎么教。
      </div>
      <a href="javascript:void(0)" onclick="openCoachInline('coach/coach-manual-v2.html','教练速查手册')" class="tb-btn">⚡ 快速查阅 →</a>
    </div>

    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:28px;margin-bottom:6px">🧒</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:4px">儿童训练方案</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.5;margin-bottom:8px">
        分龄训练详细方案：<br>
        7-9岁 · 9-11岁 · 11-13岁 · 13-16岁
      </div>
      <a href="javascript:void(0)" onclick="openCoachInline('coach/kids-training-program-part1.html','儿童训练方案')" class="tb-btn">📋 查看方案 →</a>
    </div>

    <!-- 训练计划制定 -->
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">📋 周期性训练计划</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:8px">
        <strong>大周期</strong>（6-12个月 · 赛季规划）<br>
        <strong>中周期</strong>（3-6周 · 专项阶段）<br>
        <strong>小周期</strong>（1周 · 具体执行）
      </div>
      <button onclick="goToBook('nsca-cpt');setTimeout(()=>openChapter(0),200)" class="tb-btn">📖 NSCA-CPT入门</button>
    </div>

    <!-- 训练负荷调控 -->
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">📊 训练负荷调控</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        <strong>RPE</strong> 1-10 · <strong>训练量</strong> 次×组×重<br>
        <strong>恢复窗口</strong> 24-72h
      </div>
      <div style="font-size:9px;color:var(--text3);padding:4px 8px;background:var(--bg3);border-radius:4px">
        💡 每周总增幅不超10% · 4周后减量
      </div>
    </div>

    <!-- 个性化方案 -->
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px;grid-column:span 2">
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">🧑‍🏫 个性化训练方案生成</div>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:10px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <label style="flex:1;min-width:120px">① 级别
            <select id="coachLevel" style="display:block;width:100%;margin-top:2px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:11px">
              ${['L0零基础','L1基础','L2入门','L3熟练','L4精进','L5战术','L6准专业','L7专业'].map((l,i)=>`<option value="${i}">${l}</option>`).join('')}
            </select>
          </label>
          <label style="flex:1;min-width:80px">② 频率
            <select id="coachFreq" style="display:block;width:100%;margin-top:2px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:11px">
              ${[2,3,4,5,6].map(f=>`<option value="${f}"${f===3?' selected':''}>${f}次/周</option>`).join('')}
            </select>
          </label>
          <label style="flex:1;min-width:80px">③ 时长
            <select id="coachTime" style="display:block;width:100%;margin-top:2px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);font-size:11px">
              ${[60,90,120,150].map(t=>`<option value="${t}"${t===90?' selected':''}>${t}分钟</option>`).join('')}
            </select>
          </label>
        </div>
        <button onclick="generateCoachPlan()" style="margin-top:4px;padding:6px 16px;border:none;border-radius:6px;background:var(--blue);color:#fff;font-size:12px;cursor:pointer">🎯 生成训练方案</button>
        <div id="coachResult" style="margin-top:4px"></div>
      </div>
    </div>

    <!-- 教练腰带 · 教练系统融合区 -->
    <div class="calc-card" style="background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--blue);border-radius:var(--radius);padding:16px;grid-column:1/-1">
      <div style="font-size:14px;font-weight:600;margin-bottom:4px;color:var(--blue)">🎯 教练工作台 · 教练系统融合</div>
      <div style="font-size:10px;color:var(--text2);margin-bottom:10px">6专家21轮研讨产出的一体化教练工具，直接在新窗口打开使用</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px">
        <a href="javascript:void(0)" onclick="openCoachInline('coach/index.html','教练工作台')" class="calc-card" style="text-decoration:none;color:var(--text);padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg2)">
          <div style="font-size:22px">🏟️</div>
          <div style="font-size:12px;font-weight:600;margin:4px 0">教练工作台</div>
          <div style="font-size:9px;color:var(--text3)">总入口 · 所有工具跳转</div>
        </a>
        <a href="javascript:void(0)" onclick="openCoachInline('coach/level-assessment.html','学员水平评估')" class="calc-card" style="text-decoration:none;color:var(--text);padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg2)">
          <div style="font-size:22px">📊</div>
          <div style="font-size:12px;font-weight:600;margin:4px 0">学员水平评估</div>
          <div style="font-size:9px;color:var(--text3)">30+题 · 6维度 · 7级结果</div>
        </a>
        <a href="javascript:void(0)" onclick="openCoachInline('coach/coach-guide.html','教练速成指导书')" class="calc-card" style="text-decoration:none;color:var(--text);padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg2)">
          <div style="font-size:22px">📚</div>
          <div style="font-size:12px;font-weight:600;margin:4px 0">教练速成指导书</div>
          <div style="font-size:9px;color:var(--text3)">13章系统体系</div>
        </a>
        <a href="javascript:void(0)" onclick="openCoachInline('coach/coach-manual-v2.html','训练前速查手册')" class="calc-card" style="text-decoration:none;color:var(--text);padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg2)">
          <div style="font-size:22px">⚡</div>
          <div style="font-size:12px;font-weight:600;margin:4px 0">训练前速查手册</div>
          <div style="font-size:9px;color:var(--text3)">7-16岁按龄速查</div>
        </a>
        <a href="javascript:void(0)" onclick="openCoachInline('coach/kids-training-program-part1.html','儿童训练分龄方案')" class="calc-card" style="text-decoration:none;color:var(--text);padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg2)">
          <div style="font-size:22px">🧒</div>
          <div style="font-size:12px;font-weight:600;margin:4px 0">儿童训练分龄方案</div>
          <div style="font-size:9px;color:var(--text3)">7-9·9-11·11-13·13-16</div>
        </a>
        <a href="javascript:void(0)" onclick="openCoachInline('coach/coach-manual-v2.html','课例模板库')" class="calc-card" style="text-decoration:none;color:var(--text);padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg2)">
          <div style="font-size:22px">📋</div>
          <div style="font-size:12px;font-weight:600;margin:4px 0">课例模板库</div>
          <div style="font-size:9px;color:var(--text3)">含课时间接实例</div>
        </a>
      </div>
    </div>

    <!-- 多球训练参数速查 -->
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:14px;font-weight:600;margin-bottom:6px">🥇 多球训练参数速查</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.6;margin-bottom:6px">
        <strong>启蒙期</strong>（6-9岁）：球速·20个/组 · 间隔·休息15s · 重点·动作模式<br>
        <strong>基础期</strong>（9-11岁）：30个/组 · 间隔·休息10s · 重点·重复精度<br>
        <strong>提高期</strong>（11-13岁）：50个/组 · 间隔·休息8s · 重点·变化<br>
        <strong>强化期</strong>（13-16岁）：80个/组 · 间隔·休息5s · 重点·组合技术
      </div>
      <div style="font-size:9px;color:var(--text3);padding:4px 8px;background:var(--bg3);border-radius:4px">💡 年龄越小间休越长，以保证动作质量</div>
    </div>

    <!-- 动作质量记录表 -->
    <div class="calc-card" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
      <div style="font-size:14px;font-weight:600;margin-bottom:6px">📋 动作质量记录模板</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.7">
        <div style="background:var(--bg3);border-radius:6px;padding:8px;margin-bottom:6px">
          <div>📅 训练日期：__________</div>
          <div>⏱ 总时长：____ 分钟</div>
          <div>🎯 主要内容：__________________</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;margin-bottom:6px">
          <div>🥔 高远球：________球/____ 个</div>
          <div>🔥 杀球：______球/____ 个</div>
          <div>🌐 抽球：______球/____ 个</div>
          <div>💧 控球：______球/____ 个</div>
        </div>
        <div>📊 RPE（1-10）：____</div>
        <div>💪 状态：🟢 黄亮 ____ 🔴 差 ____</div>
        <div>📝 备注：________________________</div>
      </div>
    </div>

    <div style="grid-column:1/-1;text-align:center;padding:10px;font-size:10px;color:var(--text3)">
      🎯 教练板块 · NSCA-CPT科学体系 + 6专家21轮研讨体系融合 · v3.5.0
    </div>`;
  updateProgress();
}

// ─── 生成训练方案 ────────────────────────
function generateCoachPlan() {
  const level = parseInt(document.getElementById('coachLevel')?.value);
  const freq = parseInt(document.getElementById('coachFreq')?.value);
  const time = parseInt(document.getElementById('coachTime')?.value);
  if (isNaN(level) || isNaN(freq)) { return; }

  const techniquePct = Math.max(15, 55 - level * 5);
  const strengthPct = Math.max(10, 15 + level * 3);
  const cardioPct = Math.max(10, 15 + level * 2);
  const recovery = 100 - techniquePct - strengthPct - cardioPct;

  const freqAdvice = freq <= 2 ? '低频率建议技术为主，每次90分钟专项训练' :
                     freq <= 3 ? '标准频率技术+体能交替，力量每周2次' :
                     freq <= 4 ? '高频率可采用分化训练：技术/力量/体能循环' :
                     '超高频率注意疲劳管理，建议每4周减量一周';

  const levelNames = ['零基础','基础','入门','熟练','精进','战术','准专业','专业'];

  document.getElementById('coachResult').innerHTML = `
    <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:10px;margin-top:4px;font-size:11px;line-height:1.6">
      <div style="font-weight:600;margin-bottom:4px;color:var(--gold)">🎯 ${levelNames[level] || '自定义'} · 每周${freq}次 · 每次${time}分钟</div>
      <div style="height:3px;background:var(--bg4);border-radius:2px;overflow:hidden;display:flex;margin-bottom:6px">
        <div style="width:${techniquePct}%;background:var(--blue);height:3px" title="技术${techniquePct}%"></div>
        <div style="width:${strengthPct}%;background:var(--green);height:3px" title="力量${strengthPct}%"></div>
        <div style="width:${cardioPct}%;background:var(--orange);height:3px" title="体能${cardioPct}%"></div>
        <div style="width:${recovery}%;background:var(--purple);height:3px" title="恢复${recovery}%"></div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;font-size:9px;color:var(--text2)">
        <span style="color:var(--blue)">● 技术${techniquePct}%</span>
        <span style="color:var(--green)">● 力量${strengthPct}%</span>
        <span style="color:var(--orange)">● 体能${cardioPct}%</span>
        <span style="color:var(--purple)">● 恢复${recovery}%</span>
      </div>
      <div style="margin-top:6px;font-size:10px;color:var(--text2)">${freqAdvice}</div>
      <div style="margin-top:4px;font-size:9px;color:var(--text3)">💡 每4周重新评估调整比例</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════
//  🎯 教练交互式工具（全可点击选择 → 输出方案）
// ═══════════════════════════════════════════════════════════════════

// ─── 训练方案向导（多步点击式） ──────────
function openCoachWizard() {
  showView('book');
  currentModule = 'coach';
  navStack.push({view:'dashboard'});
  historyPush('coach', {});
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>🎯 训练方案向导</h1>
    <div class="vm">三步选择 → 自动生成完整周期训练方案</div>`;
  $('bookStats').innerHTML = '';
  $('contentGrid').innerHTML = `
    <div style="grid-column:1/-1">
      <div id="qwStep1" class="qw-step">
        <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--purple)">步骤 ①：选择训练目标</div>
        <div class="qw-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">
          <button onclick="qwSetGoal(0)" class="qw-btn">🏋️ 增肌塑形</button>
          <button onclick="qwSetGoal(1)" class="qw-btn">⚡ 爆发力提升</button>
          <button onclick="qwSetGoal(2)" class="qw-btn">🏃 耐力提升</button>
          <button onclick="qwSetGoal(3)" class="qw-btn">🤸 综合体能</button>
          <button onclick="qwSetGoal(4)" class="qw-btn">🏸 羽毛球专项</button>
          <button onclick="qwSetGoal(5)" class="qw-btn">🔄 伤病后恢复</button>
        </div>
      </div>

      <div id="qwStep2" class="qw-step" style="display:none">
        <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--purple)">步骤 ②：选择当前级别</div>
        <div class="qw-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px">
          <button onclick="qwSetLevel(0)" class="qw-btn qw-sm">🟢 L0-L1 零基础</button>
          <button onclick="qwSetLevel(1)" class="qw-btn qw-sm">🟡 L2-L3 入门</button>
          <button onclick="qwSetLevel(2)" class="qw-btn qw-sm">🟠 L4-L5 进阶</button>
          <button onclick="qwSetLevel(3)" class="qw-btn qw-sm">🔴 L6-L7 专业</button>
        </div>
      </div>

      <div id="qwStep3" class="qw-step" style="display:none">
        <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--purple)">步骤 ③：选择每周训练频率</div>
        <div class="qw-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;max-width:500px">
          <button onclick="qwSetFreq(2)" class="qw-btn">2次</button>
          <button onclick="qwSetFreq(3)" class="qw-btn">3次</button>
          <button onclick="qwSetFreq(4)" class="qw-btn">4次</button>
          <button onclick="qwSetFreq(5)" class="qw-btn">5次</button>
          <button onclick="qwSetFreq(6)" class="qw-btn">6次</button>
        </div>
      </div>

      <div id="qwResult" style="display:none;animation:iosSlideIn 0.4s var(--ios-spring-smooth)"></div>
    </div>`;
  updateProgress();
}

// Wizard state
let QW = { goal: -1, level: -1, freq: 3 };

function qwSetGoal(g) { QW.goal = g; document.getElementById('qwStep1').style.display='none'; document.getElementById('qwStep2').style.display='block'; }
function qwSetLevel(l) { QW.level = l; document.getElementById('qwStep2').style.display='none'; document.getElementById('qwStep3').style.display='block'; }

const GOALS = ['增肌塑形','爆发力提升','耐力提升','综合体能','羽毛球专项','伤病后恢复'];
const QW_LEVELS = ['L0-L1 零基础','L2-L3 入门','L4-L5 进阶','L6-L7 专业'];

function qwSetFreq(f) {
  QW.freq = f;
  document.getElementById('qwStep3').style.display='none';
  const g = GOALS[QW.goal], l = LEVELS[QW.level];
  // Generate plan based on selections
  const plans = [
    /* 增肌 */   ['3组×8-12次 力量','2组×15-20次 耐力','渐进超载+隔天练','RPE6-8'],
    /* 爆发力 */ ['5组×3-5次 爆发','2组×10次 辅助','Olympic lift+跳箱','RPE7-9'],
    /* 耐力 */   ['3-4组×20+次','动作循环训练','间歇训练每周3次','RPE5-7'],
    /* 综合 */   ['2组各×12次','力量+有氧混合','每周编排不同','RPE6-8'],
    /* 羽毛球 */ ['步法+多球+体能','技术60%+体能40%','每周3-5练','RPE5-8'],
    /* 恢复 */   ['低强度+纠正','激活+拉伸','监控RPE不过6','RPE3-5'],
  ];
  const p = plans[QW.goal] || plans[0];
  
  let planHtml = `<div style="background:var(--surface);border:1px solid var(--blue);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px">
    <div style="font-size:18px;font-weight:700;margin-bottom:4px;color:var(--purple)">🎯 ${g} · ${l} · 每周${f}次</div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:12px">基于NSCA-CPT周期训练理论 · 教练参考方案</div>`;
  
  // Training week structure
  planHtml += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:10px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">核心训练</div>
        <div style="font-size:12px;line-height:1.8">${p[0]}</div>
      </div>
      <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:10px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">辅助训练</div>
        <div style="font-size:12px;line-height:1.8">${p[1]}</div>
      </div>
      <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:10px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">编排建议</div>
        <div style="font-size:12px;line-height:1.8">${p[2]}</div>
      </div>
      <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:10px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">强度监控</div>
        <div style="font-size:12px;line-height:1.8">${p[3]}</div>
      </div>
    </div>`;
  
  // Weekly schedule
  const days = ['周一','周二','周三','周四','周五','周六','周日'];
  const types = ['力量','有氧','休息','技术','体能','比赛模拟','恢复'];
  if (g === '羽毛球专项') types[0]='技术训练'; types[2]='积极性恢复';
  planHtml += `<div style="margin-bottom:12px">
    <div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:6px">📅 本周安排</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">`;
  for (let d = 0; d < 7; d++) {
    const active = d < f;
    const type = active ? types[d % types.length] : '休息';
    const isRest = type === '休息' || type === '恢复';
    planHtml += `<div style="background:${isRest||!active?'var(--surface3)':'var(--blue)'}15;border-radius:var(--radius-sm);padding:8px;text-align:center">
      <div style="font-size:9px;color:var(--text3)">${days[d]}</div>
      <div style="font-size:10px;font-weight:600;color:${isRest||!active?'var(--text3)':'var(--blue)'};margin-top:2px">${isRest?'—':type}</div>
    </div>`;
  }
  planHtml += `</div></div>`;
  
  // Nutrition tip based on goal
  const nutrition = [
    /* 增肌 */   '高蛋白（1.6-2.2g/kg）+ 热量盈余300-500kcal · 训练前后补充快慢蛋白',
    /* 爆发力 */ '肌酸5g/天 + 碳水足量 · 训练前2h高碳低脂',
    /* 耐力 */   '碳水负载 + 充足电解质 · 训练中补充运动饮料',
    /* 综合 */   '均衡膳食 50%碳水30%蛋白20%脂肪',
    /* 羽毛球 */ '中等碳水 + 充分补水 · 赛前3h进食',
    /* 恢复 */   '抗炎饮食 + Omega-3 · 充足蛋白质修复',
  ];
  planHtml += `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-top:12px">
    <div style="font-size:12px;font-weight:600;margin-bottom:4px;color:var(--green)">🍎 饮食建议</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.6">${nutrition[QW.goal]}</div>
  </div>`;
  
  // Case study / note for coaches
  planHtml += `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-top:8px">
    <div style="font-size:12px;font-weight:600;margin-bottom:4px;color:var(--orange)">📋 教练备注</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.6">
      <strong>案例：</strong>${g}项目水平${l}的训练者——<br>
      • 前2周重点建立动作模式，不加负荷<br>
      • 第3-4周渐进加载，每两周调整一次<br>
      • 第4周后安排减量周，防止累积疲劳<br>
      • 每月评估一次，根据进展调整下月计划
    </div>
  </div>`;
  
  planHtml += `</div>`;
  
  document.getElementById('qwResult').innerHTML = planHtml + `
    <div style="text-align:center;margin-top:12px">
      <button onclick="openCoachWizard()" class="tb-btn" style="background:var(--blue);color:#fff;border:none;padding:8px 20px">🔄 重新选择</button>
      <button onclick="goBack()" class="tb-btn" style="margin-left:8px">← 返回教练系统</button>
    </div>`;
  document.getElementById('qwResult').style.display='block';
  document.getElementById('qwResult').scrollIntoView({behavior:'smooth'});
}

// ─── 饮食方案向导 ──────────────────────────
function openDietWizard() {
  showView('book');
  currentModule = 'coach';
  navStack.push({view:'dashboard'});
  historyPush('coach', {});
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>🍎 饮食方案向导</h1>
    <div class="vm">点击选择 → 生成个性化饮食建议</div>`;
  $('bookStats').innerHTML = '';
  $('contentGrid').innerHTML = `
    <div style="grid-column:1/-1">
      <div id="dwStep1" class="qw-step">
        <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--green)">步骤 ①：你的身体类型</div>
        <div class="qw-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:450px">
          <button onclick="dwNext(0)" class="qw-btn">🏋️ 肌肉型</button>
          <button onclick="dwNext(1)" class="qw-btn">🧘 匀称型</button>
          <button onclick="dwNext(2)" class="qw-btn">🦵 纤细型</button>
        </div>
      </div>
      <div id="dwStep2" class="qw-step" style="display:none">
        <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--green)">步骤 ②：你的目标</div>
        <div class="qw-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:450px">
          <button onclick="dwSetGoal(0)" class="qw-btn">💪 增肌</button>
          <button onclick="dwSetGoal(1)" class="qw-btn">🔥 减脂</button>
          <button onclick="dwSetGoal(2)" class="qw-btn">⚖️ 维持</button>
        </div>
      </div>
      <div id="dwResult" style="display:none;animation:iosSlideIn 0.4s var(--ios-spring-smooth)"></div>
    </div>`;
  updateProgress();
}

let DW = { body: -1, goal: -1 };
const BODY_TYPES = ['肌肉型','匀称型','纤细型'];
const DIET_GOALS = ['增肌','减脂','维持'];

function dwNext(b) { DW.body = b; document.getElementById('dwStep1').style.display='none'; document.getElementById('dwStep2').style.display='block'; }
function dwSetGoal(g) {
  DW.goal = g;
  document.getElementById('dwStep2').style.display='none';
  
  const plans = [
    // 增肌 per body type
    [
      '热量盈余350-500kcal · 蛋白质2.0g/kg · 碳水量4-6g/kg<br>• 加餐：训练前香蕉+花生酱，训练后蛋白粉+燕麦<br>• 推荐：鸡胸肉、鸡蛋、牛肉、糙米、红薯、牛油果',
      '热量盈余250-350kcal · 蛋白质1.8g/kg · 碳水3-5g/kg<br>• 注意：你容易长脂肪，蛋白质要均匀分配每餐<br>• 推荐：三文鱼、鸡腿肉、藜麦、豆类、坚果',
      '热量盈余200-300kcal · 蛋白质2.0g/kg · 碳水量5-6g/kg<br>• 加餐频率要高：一日5-6餐<br>• 推荐：瘦牛羊肉、全蛋、全麦、土豆、奶制品',
    ],
    // 减脂 per body type
    [
      '热量缺口300-500kcal · 蛋白质2.2-2.6g/kg · 低碳<br>• 注意降低碳水但不降蛋白<br>• 推荐：鸡胸、蛋白、绿叶菜、鱼、花椰菜',
      '热量缺口300-400kcal · 蛋白质2.0g/kg · 碳水2-4g/kg<br>• 均衡缺脂，避免肌肉流失<br>• 推荐：瘦牛肉、鱼肉、燕麦、西兰花、蓝莓',
      '热量缺口200-300kcal · 蛋白质2.2g/kg · 碳水3-4g/kg<br>• 你最需要保留肌肉量<br>• 推荐：红瘦肉、鸡蛋、藜麦、南瓜、菠菜',
    ],
    // 维持 per body type
    [
      'TDEE±100kcal · 蛋白质1.6-1.8g/kg<br>• 保持现有饮食，重点监控体重<br>• 推荐：多样化饮食，注意蔬果摄入',
      'TDEE水平 · 蛋白质1.6g/kg · 均衡三大营养素<br>• 周中一次自由餐<br>• 推荐：地中海饮食模式',
      'TDEE+100-150kcal · 蛋白质1.8g/kg · 碳水足量<br>• 你代谢高，要多吃才能维持体重<br>• 推荐：全谷物、蛋白质、优质脂肪',
    ],
  ];
  
  const plan = plans[DW.goal][DW.body];
  const body = BODY_TYPES[DW.body];
  const goal = DIET_GOALS[DW.goal];
  const calTip = ['增肌期间推荐每3周调整热量','减脂期间关注体脂率而非体重变化','维持期每月做一次饮食回顾'][DW.goal];
  
  document.getElementById('dwResult').innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--green);border-radius:var(--radius-lg);padding:20px">
      <div style="font-size:18px;font-weight:700;margin-bottom:4px;color:var(--green)">🍎 ${body} · ${goal}饮食方案</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:12px">基于NSCA-CPT营养学 + 运动营养指南</div>
      <div style="font-size:12px;line-height:2;color:var(--text)">${plan}</div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;margin-top:12px">
        <div style="font-size:11px;font-weight:600;color:var(--text2)">💡 教练提示</div>
        <div style="font-size:11px;color:var(--text2);margin-top:4px">${calTip}</div>
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;margin-top:8px">
        <div style="font-size:11px;font-weight:600;color:var(--orange)">📋 案例参考</div>
        <div style="font-size:11px;color:var(--text2);margin-top:4px;line-height:1.6">
          <strong>案例</strong> — ${body}运动员，目标${goal}：<br>
          • 前2周先调整饮食模式，不急减/增热量<br>
          • 第3周开始按计划执行，同时监控训练表现<br>
          • 每2周称重+围度（不要每天称）<br>
          • 4周后评估效果，如有必要调整10%热量<br>
          • ⚠️ 减脂期如果训练表现下降，适当增加碳水
        </div>
      </div>
    </div>
    <div style="text-align:center;margin-top:12px">
      <button onclick="openDietWizard()" class="tb-btn" style="background:var(--green);color:#fff;border:none;padding:8px 20px">🔄 重新选择</button>
      <button onclick="goBack()" class="tb-btn" style="margin-left:8px">← 返回教练系统</button>
    </div>`;
  document.getElementById('dwResult').style.display='block';
  document.getElementById('dwResult').scrollIntoView({behavior:'smooth'});
}

// ─── 症状分析与解决方案 ────────────────────
function openSymptomWizard() {
  showView('book');
  currentModule = 'coach';
  navStack.push({view:'dashboard'});
  historyPush('coach', {});
  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>🔍 症状分析 + 解决方案</h1>
    <div class="vm">点击症状 → 获取分析和教练策略</div>`;
  $('bookStats').innerHTML = '';
  $('contentGrid').innerHTML = `
    <div style="grid-column:1/-1">
      <div style="font-size:18px;font-weight:700;margin-bottom:12px;color:var(--red)">选择常见问题 / 症状</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:16px">
        <button onclick="showSymptomSolution(0)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">🏃 膝盖前方疼痛</button>
        <button onclick="showSymptomSolution(1)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">🤲 肩部弹响/疼痛</button>
        <button onclick="showSymptomSolution(2)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">🦶 脚踝扭伤恢复慢</button>
        <button onclick="showSymptomSolution(3)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">💪 下背酸痛/紧张</button>
        <button onclick="showSymptomSolution(4)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">🖐️ 手腕痛（高球/扣杀）</button>
        <button onclick="showSymptomSolution(5)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">🏃 跟腱炎/足跟痛</button>
        <button onclick="showSymptomSolution(6)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">👋 网球肘/肱骨外上髁炎</button>
        <button onclick="showSymptomSolution(7)" class="qw-btn" style="text-align:left;padding:12px;font-size:12px">🦵 腿后侧拉伤</button>
      </div>
      <div id="symptomResult" style="display:none;animation:iosSlideIn 0.4s var(--ios-spring-smooth)"></div>
    </div>`;
  updateProgress();
}

const SYMPTOMS = [
  { name:'膝盖前方疼痛', cause:'股四头肌紧张+髌腱压力过大，常见于频繁弓箭步/蹲跳训练',
    solution:'① 泡沫轴放松股四头肌+髂胫束 ② 强化臀部（单腿臀桥）③ 减少跳跃类训练2周 ④ 冰敷运动后10分钟',
    coachNote:'案例：15岁男选手起跳扣杀落地屈膝不足，前两周休息做等长训练，第三周恢复50%量，一个月后完全恢复' },
  { name:'肩部弹响/疼痛', cause:'肩袖肌群疲劳+肱骨头前移，常见于过头类动作过多',
    solution:'① 每天做肩袖外旋+YTWL激活 ② 训练前用弹力带做肩部热身 ③ 暂停过头举重/频繁杀球 ④ 避免内旋超过生理范围',
    coachNote:'案例：运动员抱怨杀球时肩痛，检查发现肩袖外旋不足+胸大肌紧张。2周矫正训练（拉伸胸大肌+强化下斜方肌+外旋肌群训练），症状完全消失。' },
  { name:'脚踝扭伤恢复慢', cause:'距腓前韧带损伤+本体感觉下降+腓骨肌群弱化',
    solution:'① RICE原则前48小时 ② 72小时后无负重关节活动 ③ 第5天平衡板训练 ④ 弹力带抗阻外翻训练',
    coachNote:'案例：运动员脚踝反复扭伤5次，强制休息12周+本体感觉训练+跟腱钉，之后2年未再扭伤。' },
  { name:'下背酸痛/紧张', cause:'久坐+髋屈肌紧张+核心弱+腰椎代偿',
    solution:'① 每天猫牛式+儿童式放松 ② 平板支撑+死虫式 ③ 臀桥激活 ④ 暂停直腿硬拉',
    coachNote:'案例：35岁业余选手下背痛2周，专注核心+臀肌+髋灵活性训练2周，症状消失。' },
  { name:'手腕痛（高球/扣杀）', cause:'腕伸肌腱过度使用+握拍过紧+球拍扭力大',
    solution:'① 暂停发力动作 ② 握力球热身+伸腕屈腕 ③ 换轻拍 ④ 握拍60%力度',
    coachNote:'案例：杀球150个/天改80个+增加手腕热身+放松握拍，1周后好转。' },
  { name:'跟腱炎/足跟痛', cause:'跑跳过密+小腿柔韧不足+落地冲击大',
    solution:'① 跟腱离心训练（台阶边缘慢放）3组×15次 ② 停跳1周 ③ 冰敷 ④ 支撑鞋',
    coachNote:'案例：跟腱离心训练+停跳+减量50%→一个月完全无症状。' },
  { name:'网球肘/肱骨外上髁炎', cause:'腕伸肌群起点慢性炎症+反手动作过多',
    solution:'① 暂停发力10-14天 ② 伸腕离心训练 ③ 冰敷3次/天 ④ 护肘',
    coachNote:'案例：改为转体代替小臂发力+离心训练2周→逐步恢复4周→无痛训练。' },
  { name:'腿后侧拉伤', cause:'腘绳肌柔韧不足+股四腘绳不平衡+疲劳',
    solution:'① RICE 48h ② 72h无痛活动 ③ 等长收缩 ④ 北欧腘绳肌训练',
    coachNote:'案例：恢复6周+每周2次北欧腘绳肌训练→半年未复发。' },
];

function showSymptomSolution(idx) {
  const s = SYMPTOMS[idx];
  if (!s) return;
  document.getElementById('symptomResult').innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--red);border-radius:var(--radius-lg);padding:20px;margin-top:8px">
      <div style="font-size:18px;font-weight:700;margin-bottom:4px;color:var(--red)">🔍 ${s.name}</div>
      <div style="margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:2px">📌 原因</div>
        <div style="font-size:12px;color:var(--text);line-height:1.6">${s.cause}</div>
      </div>
      <div style="margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--green)">✅ 解决方案</div>
        <div style="font-size:12px;color:var(--text);line-height:1.8">${s.solution}</div>
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px">
        <div style="font-size:11px;font-weight:600;color:var(--orange)">📋 教练案例</div>
        <div style="font-size:11px;color:var(--text2);margin-top:4px">${s.coachNote}</div>
      </div>
    </div>
    <div style="text-align:center;margin-top:12px">
      <button onclick="openSymptomWizard()" class="tb-btn" style="background:var(--red);color:#fff;border:none">🔄 重新选择</button>
      <button onclick="goBack()" class="tb-btn" style="margin-left:8px">← 返回</button>
    </div>`;
  document.getElementById('symptomResult').style.display='block';
  document.getElementById('symptomResult').scrollIntoView({behavior:'smooth'});
}

// ═══════════════════════════════════════════════════════════════════
//  📚 书塔阅读（次要功能）
// ═══════════════════════════════════════════════════════════════════

function goToBook(bid) {
  currentBookId = bid;
  currentModule = 'tower';
  showView('book');
  const book = MANIFEST.books.find(b=>b.id===bid);
  if (!book) return;
  historyPush('book', {bookId: bid});
  const p = chProgress(bid);
  const readCount = Math.round(p * book.chapters.length);

  $('bookHeader').innerHTML = `<div class="back" onclick="goBack()">← 返回</div>
    <h1>${book.emoji} ${book.title}</h1>
    <div class="vm">${book.desc}</div>`;
  $('bookStats').innerHTML = `
    <div class="bs-item"><span class="bs-num">${book.chapters.length}</span><span class="bs-label">📖 章节</span></div>
    <div class="bs-item"><span class="bs-num">${(book.totalWords/10000).toFixed(1)}</span><span class="bs-label">📝 万字</span></div>
    <div class="bs-item"><span class="bs-num">${readCount}</span><span class="bs-label">✅ 已读/${book.chapters.length}</span></div>
    <div class="bs-item"><span class="bs-num">${Math.round(p*100)}%</span><span class="bs-label">📊 进度</span></div>`;

  $('contentGrid').innerHTML = book.chapters.map((c,i) => {
    const read = isRead(bid,c.file);
    const h2s = (c.h2s||[]).map(h=>h.title).join(' · ');
    return `<div class="chapter-card fade-in ${read?'completed':''}" onclick="openChapter(${i})">
      <div class="cc-num">${String(i+1).padStart(2,'0')}</div>
      <div class="cc-title">${c.title}</div>
      <div class="cc-h2">${h2s||'—'}</div>
      <div class="cc-foot"><span>${(c.words/100).toFixed(0)}百字 · ${c.h2s?.length||0}节</span>${read?'✅':''}</div>
    </div>`;
  }).join('');
  updateProgress();
  renderSidebar();
}

// ─── Reader ────────────────────────────────────
function openChapter(idx) {
  // 记录来源（如果栈顶没有重复 book 条目）
  const top = navStack.length > 0 ? navStack[navStack.length-1] : null;
  if (!top || top.view !== 'book') {
    if (!top || top.view !== 'module') {
      navStack.push({view:'book', bookId:currentBookId});
    }
  }
  currentChapterIdx = idx;
  showView('reader');
  renderChapter();
  historyPush('reader', {bookId: currentBookId, chapterIdx: idx});
}

async function renderChapter() {
  const book = MANIFEST?.books.find(b=>b.id===currentBookId);
  if (!book || !book.chapters[currentChapterIdx]) return;
  const ch = book.chapters[currentChapterIdx];

  $('readerTitle').textContent = `📖 ${String(currentChapterIdx+1).padStart(2,'0')}/${book.chapters.length} · ${ch.title}`;
  $('chapterPos').textContent = `${currentChapterIdx+1}/${book.chapters.length}`;
  $('readMarkBtn').textContent = isRead(currentBookId,ch.file) ? '✅' : '📌';
  $('readerNav').innerHTML = `
    <button class="tb-btn" onclick="prevChapter()" ${currentChapterIdx<=0?'disabled':''}>◀ 上一节</button>
    <button class="tb-btn" onclick="openFullQuiz()">🧪 测验</button>
    <button class="tb-btn" onclick="nextChapter()" ${currentChapterIdx>=book.chapters.length-1?'disabled':''}>下一节 ▶</button>`;
  buildToc(ch);

  $('article').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">⏳ 加载…</div>';
  let md = null;
  const localUrl = `books/${currentBookId}/${ch.file}`;
  // 8秒超时兜底，防止 fetch 卡死
  const fetchWithTimeout = (url, ms=8000) => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      fetch(url).then(r => { clearTimeout(timer); resolve(r); }).catch(() => { clearTimeout(timer); resolve(null); });
    });
  };
  try {
    const r1 = await fetchWithTimeout(localUrl);
    if (r1 && r1.ok) md = await r1.text();
  } catch(e) {}
  if (!md) {
    try {
      const r2 = await fetchWithTimeout(`${RAW}/books/${currentBookId}/${ch.file}`);
      if (r2 && r2.ok) md = await r2.text();
    } catch(e2) {}
  }
  if (md) {
    $('article').innerHTML = mdParse(md) + `<hr style="margin-top:60px;opacity:0.3"><div style="text-align:center;font-size:11px;color:var(--text3);padding:20px 0 10px;border-top:1px solid var(--border);margin-top:30px">📚 知识书塔 · ${APP_VERSION} &nbsp;|&nbsp; ${APP_DATE} &nbsp;|&nbsp; 🐏 by Lamb</div>`;
    makeCollapsible(); setupQuiz(ch); markStreak();
  } else {
    $('article').innerHTML = `<div style="text-align:center;padding:40px;color:var(--red)">❌ 加载失败</div>`;
  }
  $('content').scrollTo({top:0,behavior:'smooth'});
  updateProgress();
}

function buildToc(ch) {
  const list = $('tocList');
  const h2s = ch.h2s || [];
  list.innerHTML = h2s.length ? h2s.map((h,i)=>`<div class="toc-item toc-h2" onclick="scrollToToc(${i})">${h.title}</div>`).join('') : '<div style="font-size:10px;color:var(--text3)">无子章节</div>';
}
function scrollToToc(idx) { const h=$$('article h2'); if(h[idx]) h[idx].scrollIntoView({behavior:'smooth',block:'start'}); }
function toggleTocFn() { $('readerToc').style.display=$('readerToc').style.display==='none'?'block':'none'; }
function toggleFocus() { document.body.classList.toggle('focus-mode',!focusMode); focusMode=!focusMode; }
function increaseFont() { if(fontBase<22){fontBase++;applyFont();} }
function decreaseFont() { if(fontBase>12){fontBase--;applyFont();} }
function applyFont() { document.documentElement.style.setProperty('--font-base',fontBase+'px'); localStorage.setItem('bk_font',fontBase); }
function toggleTheme() { const cur=document.documentElement.getAttribute('data-theme'); document.documentElement.setAttribute('data-theme',cur==='light'?'':'light'); localStorage.setItem('bk_theme',cur==='light'?'':'light'); }
function toggleReadMark() { const ch=getCurChapter(); if(!ch)return; if(isRead(currentBookId,ch.file)) unmarkRead(currentBookId,ch.file); else markRead(currentBookId,ch.file); $('readMarkBtn').textContent=isRead(currentBookId,ch.file)?'✅':'📌'; }
function getCurChapter() { if(!currentBookId||currentChapterIdx<0) return null; const b=MANIFEST?.books.find(x=>x.id===currentBookId); return b?.chapters[currentChapterIdx]||null; }
function prevChapter() { if(currentChapterIdx>0) openChapter(currentChapterIdx-1); }
function nextChapter() { const b=MANIFEST?.books.find(x=>x.id===currentBookId); if(b&currentChapterIdx<b.chapters.length-1) openChapter(currentChapterIdx+1); }
function makeCollapsible() { $$('article h2, article h3').forEach(el=>{el.addEventListener('click',()=>el.classList.toggle('collapsed'));}); }
function markStreak() { const p=getP(); if(!p._streak) p._streak={}; const t=new Date().toISOString().slice(0,10); if(!p._streak[t]){p._streak[t]=true;setP(p);} }

// ─── Quiz ──────────────────────────────────────
let quizItems=[], fontBase=15, focusMode=false, tocBtnState=true, studyQuestions=[], studyIdx=0;
function setupQuiz(ch) { quizItems=[]; const h2s=ch.h2s||[]; if(!h2s.length){$('quizContent').innerHTML='<div style="font-size:10px;color:var(--text3);text-align:center;padding:12px">🤷 无测试点</div>';return;} const n=Math.min(3,h2s.length); const picked=[...h2s].sort(()=>Math.random()-.5).slice(0,n); quizItems=picked.map(h=>({q:`「${h.title}」主要讲什么？`,a:h.title,options:shuffle([h.title,...getRandomH2s(ch,h,3)])})); renderQuizSidebar(); }
function getRandomH2s(ch,exclude,count){const others=(ch.h2s||[]).filter(h=>h.title!==exclude.title);return[...others].sort(()=>Math.random()-.5).slice(0,count).map(h=>h.title);}
function shuffle(arr){return[...arr].sort(()=>Math.random()-.5);}
function renderQuizSidebar(){$('quizContent').innerHTML=quizItems.map((item,qi)=>`<div class="quiz-card" id="qc-${qi}"><div class="qc-q">${item.q}</div>${item.options.map((o,oi)=>`<button class="qc-btn" onclick="checkQuiz(${qi},${oi})" id="qcb-${qi}-${oi}">${String.fromCharCode(65+oi)}. ${o}</button>`).join('')}<div class="qc-result" id="qcr-${qi}"></div></div>`).join('');$('quizSidebar').style.display='block';}
function checkQuiz(qi,oi){const item=quizItems[qi];const correctIdx=item.options.indexOf(item.a);const correct=oi===correctIdx;for(let i=0;i<item.options.length;i++){const btn=$(`qcb-${qi}-${i}`);if(btn){btn.disabled=true;btn.classList.add(i===correctIdx?'correct':i===oi&&!correct?'wrong':'');}}const r=$(`qcr-${qi}`);if(r)r.textContent=correct?'✅ 正确！':`❌ 答案是 ${item.a}`;if(correct){const rp=getRP();rp.totalQuizCorrect=(rp.totalQuizCorrect||0)+1;setRP(rp);addXP(5,'🧪');checkAchievements();}}
function openFullQuiz(){const b=MANIFEST?.books.find(x=>x.id===currentBookId);const ch=b?.chapters[currentChapterIdx];if(!ch)return;const h2s=ch.h2s||[];if(!h2s.length){alert('本章暂无测试点');return;}}
function toggleQuizPanel(){const qs=$('quizSidebar');if(qs)qs.style.display=qs.style.display==='none'?'block':'none';}

// ─── Markdown Parser ─────────────────────────────────
const mdParse = (txt) => {
  if(!txt) return '';
  let s=txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inline=[[/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>'],[/\*\*(.+?)\*\*/g,'<strong>$1</strong>'],[/\*(.+?)\*/g,'<em>$1</em>'],[/__(.+?)__/g,'<strong>$1</strong>'],[/_(.+?)_/g,'<em>$1</em>'],[/~~(.+?)~~/g,'<del>$1</del>'],[/`([^`]+)`/g,'<code>$1</code>']];
  inline.forEach(([re,repl])=>s=s.replace(re,repl));
  s=s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,(_,alt,src)=>'<img src="'+src.replace(/&amp;/g,'&')+'" alt="'+alt+'" class="md-img" loading="lazy">');
  s=s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,t,u)=>'<a href="'+u.replace(/&amp;/g,'&')+'" target="_blank">'+t+'</a>');
  let lines=s.split('\n'),result=[],inTable=false,inCode=false;
  for(let i=0;i<lines.length;i++){let l=lines[i];if(l.startsWith('```')){if(inCode){result.push('</code></pre>');inCode=false;}else{result.push('<pre><code>');inCode=true;}continue;}if(inCode){result.push(l+'\n');continue;}if(/^[-*_]{3,}\s*$/.test(l)){result.push('<hr>');continue;}const hm=l.match(/^(#{1,4})\s+(.+)/);if(hm){result.push('<h'+hm[1].length+'>'+hm[2]+'</h'+hm[1].length+'>');continue;}if(l.startsWith('> ')){result.push('<blockquote><p>'+l.slice(2)+'</p></blockquote>');continue;}if(/^[-*+]\s+/.test(l)){result.push('<li>'+l.replace(/^[-*+]\s+/,'')+'</li>');continue;}if(/^\d+\.\s+/.test(l)){result.push('<li>'+l.replace(/^\d+\.\s+/,'')+'</li>');continue;}if(/^\|/.test(l)){if(!inTable){inTable=true;result.push('<table>');}if(/^\|[\s:-]+\|[\s:-]+/.test(l))continue;const cells=l.split('|').filter((c,j,a)=>j>0||j<a.length-1).map(c=>c.trim());const tag=i===0||!lines[i-1].includes('---')?'th':'td';result.push('<tr>'+cells.map(c=>'<'+tag+'>'+c+'</'+tag+'>').join('')+'</tr>');continue;}else if(inTable&&l.trim()===''){result.push('</table>');inTable=false;}if(l.trim()===''){result.push('');continue;}result.push('<p>'+l+'</p>');}
  if(inTable)result.push('</table>');if(inCode)result.push('</code></pre>');
  let out=result.join('\n');out=out.replace(/((?:<li>.*<\/li>\n?)+)/g,'<ul>$1</ul>');out=out.replace(/<p><img[^>]+><\/p>/g,(m)=>'<div class="img-container">'+m.replace(/^<p>/,'').replace(/<\/p>$/,'')+'</div>');
  return out;
};

// ─── View Switch ──────────────────────────────
const VIEW_MAP = { dashboard:'viewDashboard', book:'viewBook', reader:'viewReader' };
function showView(v) {
  for (const [key, id] of Object.entries(VIEW_MAP)) {
    const el = $(id);
    if (el) el.style.display = key === v ? 'block' : 'none';
  }
  $('content').scrollTo({top:0,behavior:'smooth'});
  // FAB 可见性：首页隐藏 home FAB，非首页显示
  const homeFab = document.getElementById('fabHome');
  if (homeFab) homeFab.classList.toggle('show', v !== 'dashboard');
  // 搜索 FAB 始终可见（只是位置不同）
  const searchFab = document.getElementById('fabSearch');
  if (searchFab) searchFab.classList.toggle('show', v !== 'dashboard');
}

// ─── 返回首页 ───
function goHome() {
  // 关闭所有可能打开的 overlay
  document.querySelectorAll('.overlay').forEach(o => o.remove());
  // 关闭可能的浮层
  document.querySelectorAll('._tmpOverlay').forEach(o => o.remove());
  // 重置状态
  currentBookId = null;
  currentChapterIdx = -1;
  currentModule = 'dashboard';
  const chSection = $('chSection');
  if (chSection) chSection.style.display = 'none';
  // 关闭侧边栏（手机端）
  document.querySelector('.sidebar')?.classList.remove('open');
  // 重置导航
  navStack = [];
  historyReplace('dashboard', {});
  // 显示首页
  showView('dashboard');
  renderDashboard();
  // 滚到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const content = $('content');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
  // 触发一次resize以让 chart 重新计算
  setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
}

// ─── 返回上一页 ───
function goBack() {
  if (navStack.length === 0) { goHome(); return; }
  const prev = navStack.pop();
  if (navStack.length > 0) {
    historyReplace(navStack[navStack.length-1].view, navStack[navStack.length-1]);
  } else {
    historyReplace('dashboard', {});
  }
  switch (prev.view) {
    case 'dashboard': goHome(); break;
    case 'module':
      currentModule = prev.moduleId;
      showView('book');
      $('content').className='content view-page';
      openTrainModule(prev.moduleId);
      break;
    case 'book':
      currentBookId = prev.bookId;
      showView('book');
      goToBook(prev.bookId);
      break;
    default: goHome();
  }
}

function openSearch() {
  const overlay = document.createElement('div');
  overlay.className='overlay';overlay.onclick=function(e){if(e.target===this)this.remove();};
  overlay.innerHTML=`<div class="panel panel-search" onclick="event.stopPropagation()"><div class="panel-hd"><input type="text" id="searchInput" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;color:var(--text);font-size:14px;outline:none" placeholder="🔍 搜索训练内容·知识书塔 · ↵ 搜索" autofocus onkeydown="if(event.key==='Enter')doSearch(this.value)"><button class="h-btn" onclick="this.closest('.overlay').remove()">✕</button></div><div class="panel-bd" id="searchResults"><div class="search-hint">⌨️ 输入 → ↵ 搜索</div></div></div>`;
  document.body.appendChild(overlay);setTimeout(()=>document.getElementById('searchInput')?.focus(),100);
}

const MAX_RESULTS = 30;
const RE_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/** Escape special regex characters in a query string */
function escapeRegex(s) { return s.replace(RE_SPECIAL, '\\$&'); }

/** Search chapter titles and H2 headings (no network needed, fast) */
function searchMetadata(ql, results) {
  for (const book of MANIFEST.books) {
    for (const ch of book.chapters) {
      if (results.length >= MAX_RESULTS) break;
      if (ch.title.toLowerCase().includes(ql) || ch.file.toLowerCase().includes(ql)) {
        results.push({ book, ch, preview: '📑 章节标题匹配', line: 0 });
        continue;
      }
      if (ch.h2s) {
        for (const h of ch.h2s) {
          if (results.length >= MAX_RESULTS) break;
          if (h.title.toLowerCase().includes(ql)) {
            results.push({ book, ch, preview: '📌 ' + h.title, line: 0 });
          }
        }
      }
    }
    if (results.length >= MAX_RESULTS) break;
  }
}

/** Search chapter content (fetches markdown, slower) */
async function searchContent(ql, results, queryOrig) {
  for (const book of MANIFEST.books) {
    for (const ch of book.chapters) {
      if (results.length >= MAX_RESULTS) break;
      if (results.some(r => r.ch === ch)) continue;
      const md = await fetchChapterContent(book.id, ch.file);
      if (!md) continue;
      const lines = md.split('\n');
      for (let i = 0; i < lines.length && results.length < MAX_RESULTS; i++) {
        if (lines[i].toLowerCase().includes(ql) && !lines[i].startsWith('#')) {
          const p = lines[i].length > 100 ? lines[i].slice(0, 100) + '…' : lines[i];
          results.push({ book, ch, preview: p, line: i + 1 });
          break;
        }
      }
    }
    if (results.length >= MAX_RESULTS) break;
  }
}

/** Try to fetch chapter markdown from local then remote */
async function fetchChapterContent(bookId, file) {
  try {
    const localUrl = 'books/' + bookId + '/' + file;
    const r1 = await fetch(localUrl);
    if (r1.ok) return await r1.text();
  } catch (_) { /* ignore */ }
  try {
    const r2 = await fetch(RAW + '/books/' + bookId + '/' + file);
    if (r2.ok) return await r2.text();
  } catch (_) { /* ignore */ }
  return null;
}

/** Render search results into the DOM */
function renderSearchResults(results, queryOrig) {
  if (!results.length) {
    $('searchResults').innerHTML = '<div class="search-hint">😅 未找到匹配内容</div>';
    return;
  }
  const escaped = escapeRegex(queryOrig);
  const re = new RegExp('(' + escaped + ')', 'gi');
  $('searchResults').innerHTML = results.map(r => {
    const highlighted = r.preview.replace(re, '<em>$1</em>');
    return `<div class="sr-item" onclick="this.closest('.overlay').remove();goSearchResult('${r.book.id}','${r.ch.file}')">
      <div class="sr-b">${r.book.emoji} ${r.book.title} · ${r.ch.title}</div>
      <div class="sr-p">${highlighted}</div>
      ${r.line ? '<div class="sr-m">第' + r.line + '行</div>' : ''}
    </div>`;
  }).join('');
}

async function doSearch(query) {
  query = query.trim();
  if (!query) {
    $('searchResults').innerHTML = '<div class="search-hint">⌨️ 输入 → ↵ 搜索</div>';
    return;
  }
  $('searchResults').innerHTML = '<div class="search-hint">⏳ 搜索中…</div>';
  const ql = query.toLowerCase();
  const results = [];

  // Phase 1: fast metadata search (titles, H2s)
  searchMetadata(ql, results);

  // Phase 2: slower content search (fetch markdown) if room remains
  if (results.length < MAX_RESULTS) {
    await searchContent(ql, results, query);
  }

  renderSearchResults(results, query);
}
function goSearchResult(bid,file){goToBook(bid);const b=MANIFEST.books.find(x=>x.id===bid);const idx=b?.chapters.findIndex(c=>c.file===file);if(idx>=0)setTimeout(()=>openChapter(idx),300);}

// ─── Sidebar ──────────────────────────────────
function toggleSidebar(show){if(show===undefined)show=!sidebarOpen;$('sidebar').classList.toggle('closed',!show);sidebarOpen=show;}
let sidebarOpen=true;

// ─── Overlay ──────────────────────────────────
function showOverlay(cls,title,body){const overlay=document.createElement('div');overlay.className='overlay';overlay.id='_tmpOverlay';overlay.onclick=function(e){if(e.target===this)this.remove();};overlay.innerHTML=`<div class="${cls}" onclick="event.stopPropagation()"><div class="panel-hd"><span>${title}</span><button class="h-btn" onclick="this.closest('.overlay').remove()">✕</button></div><div class="panel-bd">${body}</div></div>`;document.body.appendChild(overlay);}

// ─── 教练系统内嵌 iframe 加载 ────────
function openCoachInline(url, title) {
  // 移除已有 overlay
  const existing = document.getElementById('_tmpOverlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'overlay coach-inline-overlay';
  overlay.id = '_tmpOverlay';
  overlay.onclick = function(e) { if (e.target === this) this.remove(); };
  overlay.innerHTML = `<div class="coach-inline-wrap" onclick="event.stopPropagation()">
    <div class="panel-hd coach-inline-hd">
      <span>🎯 ${title}</span>
      <div style="display:flex;gap:6px;align-items:center">
        <a href="${url}" target="_blank" class="h-btn" title="新窗口打开">↗</a>
        <button class="h-btn" onclick="this.closest('.overlay').remove()" title="关闭">✕</button>
      </div>
    </div>
    <iframe src="${url}" class="coach-inline-iframe" referrerpolicy="no-referrer"></iframe>
  </div>`;
  document.body.appendChild(overlay);
}

// ─── Init ───────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const bar = $('splashBar');
  if(!bar)return;
  bar.style.width='25%';await sleep(150);
  MANIFEST = MANIFEST_DATA;
  bar.style.width='60%';await sleep(120);
  const theme=localStorage.getItem('bk_theme');if(theme)document.documentElement.setAttribute('data-theme',theme);
  const savedFont=localStorage.getItem('bk_font');if(savedFont){fontBase=parseInt(savedFont);document.documentElement.style.setProperty('--font-base',fontBase+'px');}
  bar.style.width='90%';await sleep(200);
  initRP();bar.style.width='100%';await sleep(200);
  $('splash').style.display='none';$('app').style.display='block';
  renderDashboard();updateProgress();
  $('content').addEventListener('scroll',()=>{$('fab').classList.toggle('show',$('content').scrollTop>300);});
  if(window.innerWidth<=768)toggleSidebar(false);
  setTimeout(checkAchievements,2000);
});

// ─── History API（浏览器后退键支持） ──
function historyPush(view, state) {
  history.pushState({view, ...state}, '', window.location.pathname);
}
function historyReplace(view, state) {
  history.replaceState({view, ...state}, '', window.location.pathname);
}
window.addEventListener('popstate', (e) => {
  if (!e.state || !e.state.view) { goHome(); return; }
  if (navStack.length === 0 && e.state.view !== 'dashboard') { goHome(); }
});

function calcTDEE(){
var g=(document.getElementById("tdeeGender")||{}).value||"male";
var w=parseFloat((document.getElementById("tdeeWeight")||{}).value)||70;
var h=parseFloat((document.getElementById("tdeeHeight")||{}).value)||175;
var a=parseInt((document.getElementById("tdeeAge")||{}).value)||25;
var act=parseFloat((document.getElementById("tdeeActivity")||{}).value)||1.55;
var bmr=g==="male"?10*w+6.25*h-5*a+5:10*w+6.25*h-5*a-161;
var tdee=Math.round(bmr*act);
var r=document.getElementById("tdeeResult");
if(r) r.innerHTML="BMR:"+Math.round(bmr)+"kcal | TDEE:"+tdee+"kcal/天";
}
function calcMacro(){
var w=parseFloat((document.getElementById("macroWeight")||{}).value)||70;
var g=(document.getElementById("macroGoal")||{}).value||"maintain";
var tdee=parseFloat((document.getElementById("macroTDEE")||{}).value)||2500;
var pMult={maintain:1.7,gain:2,lose:2.2};
var calAdj={maintain:0,gain:350,lose:-400};
var protein=Math.round(pMult[g]*w);
var fat=Math.round(0.8*w);
var cal=tdee+calAdj[g];
var carb=Math.round((cal-protein*4-fat*9)/4);
var r=document.getElementById("macroResult");
if(r) r.innerHTML="蛋白"+protein+"g 脂肪"+fat+"g 碳水"+carb+"g 总计"+cal+"kcal";
}
function calcWater(){
var w=parseFloat((document.getElementById("waterWeight")||{}).value)||70;
var t=parseInt((document.getElementById("waterTrain")||{}).value)||60;
var temp=parseFloat((document.getElementById("waterTemp")||{}).value)||1;
var daily=Math.round(w*33*temp);
var train=Math.round(t*12);
var r=document.getElementById("waterResult");
if(r) r.innerHTML="日常"+daily+"ml + 训练"+train+"ml = "+Math.round((daily+train)/10)/100+"L";
}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function scrollToTop(){$('content').scrollTo({top:0,behavior:'smooth'});}



