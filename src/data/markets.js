// 全游戏定价总表：所有商店、服务、活动与动态价格规则都在这里
// 改价只需要改这个文件；其余模块只引用这里的常量，不再保留价格数字

/* ===== 武器定价 ===== */

/** 近战每回合期望伤害：攻击 × (1 + 暴击 × (暴伤 - 1)) / (1 - 连击) */
function meleeDpa(weapon) {
  const attack = Number(weapon?.attack) || 0
  const crit = Number(weapon?.crit) || 0
  const critDamage = Number(weapon?.critDamage) || 1
  const combo = Number(weapon?.combo) || 0
  return (attack * (1 + crit * (critDamage - 1))) / (1 - combo)
}

/** 近战定价：DPA + 耐久/20，取整；coefficient 用于整体调价 */
export function meleePrice(weapon, coefficient = 1) {
  const durability = Number(weapon?.durability) || 0
  return Math.round((meleeDpa(weapon) + durability / 20) * coefficient)
}

/** 远程每回合期望伤害：攻击 × (1 + 暴击 × (暴伤 - 1)) */
function rangedDpa(weapon) {
  const attack = Number(weapon?.attack) || 0
  const crit = Number(weapon?.crit) || 0
  const critDamage = Number(weapon?.critDamage) || 1
  return attack * (1 + crit * (critDamage - 1))
}

/** 远程定价：DPA + 闪避 × 20，取整；coefficient 用于整体调价 */
export function rangedPrice(weapon, coefficient = 1) {
  const dodge = Number(weapon?.dodge) || 0
  return Math.round((rangedDpa(weapon) + dodge * 20) * coefficient)
}

/* ===== 末日都城 ===== */

/** 都城集市：基础补给（按物品 id 定价，末日币） */
export const CITY_MARKET_PRICES = {
  'mineral-water': 1,
  'compressed-biscuit': 1,
}

/** 撬棍：私奔线道具，固定剧情价（末日币） */
export const CROWBAR_PRICE = 50

/** 身份办理：骑士身份（末日币） */
export const KNIGHT_COST = 20

/** 王宫贵族商店：限定武器与饮食，按物品 id 定价（末日币） */
export const PALACE_SHOP_PRICES = {
  'royal-lance': 288,
  'royal-scepter': 188,
  'royal-mix': 10,
  'royal-dessert': 10,
}

/** 王宫付费活动：普通 / 中档 / 高档（末日币，0 表示免费） */
export const PALACE_ACTIVITY_PRICES = {
  dance: { common: 0, elite: 5, star: 8 },
  banquet: { common: 0, elite: 5, star: 8 },
  room: { common: 0, elite: 5, star: 8 },
}

/* ===== 曙光阵地 ===== */

/** 曙光市场：补给按物品 id 定价（曙光币）；远程武器按 rangedPrice 计算 */
export const DAWN_MARKET_PRICES = {
  bandage: 1,
  painkiller: 1,
  'canned-meat': 1,
  'canned-fish': 1,
}

/* ===== 货币兑换 ===== */

/** 购买力基准：两地标准口粮都按 2 币/份计 */
export const EXCHANGE_BASKET_PRICE = 2

/** 汇率：1 曙光币 = ? 末日币，按两地每日购买力之比计算 */
export function exchangeRateFromIncome(cityIncome, dawnIncome) {
  const city = Math.max(0, Number(cityIncome) || 0)
  const dawn = Math.max(0, Number(dawnIncome) || 0)
  return dawn > 0 ? city / dawn : 0
}

/** 羁绊商店统一价：额外提交对应纪念徽章（曙光币） */
export const DAWN_BOND_PRICE = 365

/** 常驻人物服务：配餐 / 调配药剂 / 训练（曙光币，照看实验田免费） */
export const DAWN_SERVICE_PRICES = {
  meal: 1,
  brew: 1,
  training: 1,
}

/** 物资回收：各品质的每日浮动区间（曙光币）；限定武器固定象征价 1 */
export const DAWN_RECYCLE_RANGES = {
  普通: [1, 3],
  稀有: [4, 7],
  精良: [8, 12],
  史诗: [13, 20],
  传说: [21, 30],
  神话: [31, 50],
  限定: [1, 1],
}

/* ===== 末日飞行船 ===== */

/** 饮品 / 食物：base + 效果绝对值和 ÷ divisor，限制在 min–max（末日币） */
export const AIRSHIP_DRINK_FOOD_PRICING = {
  base: 3,
  divisor: 10,
  min: 3,
  max: 15,
}

/** 药品：base + 效果绝对值和 ÷ divisor，限制在 min–max（末日币） */
export const AIRSHIP_MEDICINE_PRICING = {
  base: 5,
  divisor: 15,
  min: 5,
  max: 15,
}

/** 稀有 / 精良近战：base + 攻击 + 暴伤 × critDamageFactor，限制在 min–max（末日币） */
export const AIRSHIP_MELEE_PRICING = {
  base: 40,
  critDamageFactor: 8,
  min: 50,
  max: 100,
}

/** 稀有远程：base + 攻击 × attackFactor，限制在 min–max（末日币） */
export const AIRSHIP_RANGED_PRICING = {
  base: 45,
  attackFactor: 1.3,
  min: 60,
  max: 120,
}

/** 珍宝商店：base + 当日哈希 % spread（末日币） */
export const AIRSHIP_TREASURE_PRICING = {
  base: 90,
  spread: 111,
}

/** 储油仓库：每日买入 / 卖出价区间（末日币，精确到分） */
export const AIRSHIP_OIL_PRICING = {
  buyMin: 0.75,
  buyMax: 3.99,
  sellMin: 0.25,
  sellMax: 2.25,
}

/** 投资中心：六支股票的基础价（末日币） */
export const STOCK_BASE_PRICES = {
  'alan-arms': 110,
  'mia-logistics': 80,
  'moran-commerce': 150,
  'capital-construction': 60,
  'doomsday-entertainment': 35,
  'food-emergency': 25,
}

/** 股票缺失基础价时的兜底价（末日币） */
export const STOCK_BASE_FALLBACK_PRICE = 100

/** 股票价格下限与上限（末日币） */
export const STOCK_PRICE_MIN = 0.01
export const STOCK_PRICE_MAX = 300

/** 股票买卖手续费：成交额的 feeRate，最低 feeMin（末日币） */
export const STOCK_FEE_RATE = 0.01
export const STOCK_FEE_MIN = 0.1

/** 股票每日涨跌区间（百分比） */
export const STOCK_DAY_MOVE = { min: 5, max: 15 }

/* ===== 郊区卖场 · 游戏开发者 ===== */

/** 背包扩容：按当前容量分段计价，每次 +10 格；两种货币等额收取 */
export const DEV_SHOP_EXPAND_TIERS = [
  { from: 20, to: 50, coins: 5, dawnCoins: 5 },
  { from: 50, to: 100, coins: 10, dawnCoins: 10 },
  { from: 100, to: 150, coins: 15, dawnCoins: 15 },
  { from: 150, to: 200, coins: 20, dawnCoins: 20 },
]

/** 指定容量下的单次扩容价；已到上限返回 null */
export function expandPriceAtSize(size) {
  const current = Math.max(0, Math.round(Number(size) || 0))
  return DEV_SHOP_EXPAND_TIERS.find((tier) => current >= tier.from && current < tier.to) ?? null
}

/* ===== 武器保养 ===== */

/** 每 1 币修复的最大耐久 / 清洁度百分比 */
export const REPAIR_PERCENT_PER_COIN = 20

/** 武器保养单价：每修复 20% 缺口所需的货币，按品质定价 */
export const REPAIR_PRICE_BY_TIER = {
  普通: 1,
  稀有: 2,
  精良: 3,
  史诗: 4,
  传说: 5,
  神话: 8,
  限定: 8,
}

/** 未登记的品质按普通价收费 */
export const REPAIR_PRICE_FALLBACK = REPAIR_PRICE_BY_TIER['普通']
