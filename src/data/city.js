// 末日都城：身份、借贷、集市、王宫与掉落

import { ITEMS } from './items'

export const IDENTITY_LEVELS = [
  { name: '平民', rank: 0, itemId: 'badge-common', image: '/image/身份徽章/平民徽章.webp' },
  { name: '骑士', rank: 1, itemId: 'badge-knight', image: '/image/身份徽章/骑士徽章.webp' },
  { name: '男爵', rank: 2, itemId: 'badge-baron', image: '/image/身份徽章/男爵徽章.webp' },
  { name: '子爵', rank: 3, itemId: 'badge-viscount', image: '/image/身份徽章/子爵徽章.webp' },
  { name: '伯爵', rank: 4, itemId: 'badge-earl', image: '/image/身份徽章/伯爵徽章.webp' },
  { name: '侯爵', rank: 5, itemId: 'badge-marquis', image: '/image/身份徽章/侯爵徽章.webp' },
  { name: '公爵', rank: 6, itemId: 'badge-duke', image: '/image/身份徽章/公爵徽章.webp' },
  { name: '储君', rank: 7, itemId: 'badge-heir', image: '/image/身份徽章/储君徽章.webp' },
]

export function identityInfo(name) {
  return IDENTITY_LEVELS.find((level) => level.name === name) ?? null
}

export function identityRank(name) {
  return identityInfo(name)?.rank ?? -1
}

/** 某等级身份对应的徽章物品 id */
export function identityItemId(name) {
  return identityInfo(name)?.itemId ?? null
}

export const KNIGHT_COST = 30

/** 都城的活计：身份越高，活越轻、报酬越多；每天只能做一份 */
export const LABOR_TIERS = [
  {
    id: 'common',
    name: '苦役',
    identity: '平民',
    rank: 0,
    turns: 4,
    coins: 1,
    effects: { sanity: -20 },
    costText: '理智 -20',
    desc: '在苦役营搬石料。监工只数石头，不数人。',
  },
  {
    id: 'knight',
    name: '搬运',
    identity: '骑士',
    rank: 1,
    turns: 4,
    coins: 2,
    effects: { stamina: -15 },
    costText: '体力 -15',
    desc: '替码头搬运封存的物资，工头盯着每一个人的手。',
  },
  {
    id: 'baron',
    name: '抄写',
    identity: '男爵',
    rank: 2,
    turns: 3,
    coins: 3,
    effects: { sanity: -10 },
    costText: '理智 -10',
    desc: '在书记处誊写名册，墨水和灰尘一样呛人。',
  },
  {
    id: 'viscount',
    name: '物资核查',
    identity: '子爵',
    rank: 3,
    turns: 3,
    coins: 4,
    effects: { stamina: -8 },
    costText: '体力 -8',
    desc: '核对仓库账目。错一笔，就得自己补上。',
  },
  {
    id: 'earl',
    name: '巡防',
    identity: '伯爵',
    rank: 4,
    turns: 2,
    coins: 5,
    effects: { stamina: -5 },
    costText: '体力 -5',
    desc: '带队沿城墙走一圈，风里全是铁锈味。',
  },
  {
    id: 'marquis',
    name: '值守',
    identity: '侯爵',
    rank: 5,
    turns: 2,
    coins: 6,
    effects: { sanity: -5 },
    costText: '理智 -5',
    desc: '在议事厅外守夜。没有人敢在你面前多说话。',
  },
  {
    id: 'duke',
    name: '代批',
    identity: '公爵',
    rank: 6,
    turns: 1,
    coins: 8,
    effects: {},
    costText: '',
    desc: '替公爵代批几份无关紧要的公文。',
  },
  {
    id: 'heir',
    name: '巡视',
    identity: '储君',
    rank: 7,
    turns: 1,
    coins: 10,
    effects: {},
    costText: '',
    desc: '以储君之名巡视内廷，所有人都要低头。',
  },
]

/** 贷款期限（天）：借款当天算第 1 天，第 10 天为最后还款日，次日逾期 */
export const LOAN_TERM_DAYS = 10

/**
 * 借贷按身份阶梯开放
 * rate = 利息比例；graceDays = 可申请一次的宽限天数
 * confiscate = 逾期没收背包全部食物 / 饮品 / 药品（仅一次）
 * deathOnDefault = 逾期直接死亡
 */
export const LOAN_TIERS = [
  {
    identity: '平民',
    rank: 0,
    min: 1,
    max: 10,
    rate: 1,
    graceDays: 0,
    confiscate: false,
    deathOnDefault: true,
  },
  {
    identity: '骑士',
    rank: 1,
    min: 1,
    max: 30,
    rate: 0.5,
    graceDays: 2,
    confiscate: true,
    deathOnDefault: false,
  },
  {
    identity: '男爵',
    rank: 2,
    min: 1,
    max: 50,
    rate: 0.4,
    graceDays: 4,
    confiscate: true,
    deathOnDefault: false,
  },
  {
    identity: '子爵',
    rank: 3,
    min: 1,
    max: 80,
    rate: 0.3,
    graceDays: 6,
    confiscate: true,
    deathOnDefault: false,
  },
  {
    identity: '伯爵',
    rank: 4,
    min: 1,
    max: 100,
    rate: 0.2,
    graceDays: 8,
    confiscate: false,
    deathOnDefault: false,
  },
  {
    identity: '侯爵',
    rank: 5,
    min: 1,
    max: 150,
    rate: 0.1,
    graceDays: 10,
    confiscate: false,
    deathOnDefault: false,
  },
  {
    identity: '公爵',
    rank: 6,
    min: 1,
    max: 200,
    rate: 0.05,
    graceDays: 12,
    confiscate: false,
    deathOnDefault: false,
  },
  {
    identity: '储君',
    rank: 7,
    min: 1,
    max: 300,
    rate: 0.01,
    graceDays: 15,
    confiscate: false,
    deathOnDefault: false,
  },
]

export function loanTierFor(identity) {
  return LOAN_TIERS.find((tier) => tier.identity === identity) ?? null
}

/** 旧存档或身份变化时，按借款时记录的身份等级取回贷款规则 */
export function loanTierByRank(rank) {
  return LOAN_TIERS.find((tier) => tier.rank === rank) ?? LOAN_TIERS[0]
}

/** 利息四舍五入，最低 1 币 */
export function loanInterest(principal, rate) {
  return Math.max(1, Math.round(principal * rate))
}

/** 贫民集市里普通近战武器的定价：按攻击、耐久与特效综合折算 */
const COMMON_MELEE_PRICES = {
  'fruit-knife': 6,
  'kitchen-knife': 6,
  'nunchaku': 8,
  'frying-pan': 8,
  'baton': 9,
  'knuckle': 9,
  'claw-hammer': 10,
  'pipe-wrench': 10,
  'karambit-classic': 11,
  'dagger': 15,
  'baseball-bat': 14,
}

function meleeShopNote(item) {
  const w = item.weapon
  const crit = Math.round(w.crit * 100)
  const combo = Math.round((w.combo ?? 0) * 100)
  return `${w.attack} 攻击 · ${crit}% 暴击 · ${w.critDamage} 暴伤 · ${combo}% 连击 · ${w.durability} 耐久`
}

/** 所有普通级近战武器 + 基础补给，全部用末日币结算 */
export const SHOP_GOODS = [
  {
    id: 'water',
    itemId: 'mineral-water',
    name: '矿泉水',
    price: 1,
    note: '恢复 25% 口渴',
  },
  {
    id: 'biscuit',
    itemId: 'compressed-biscuit',
    name: '压缩饼干',
    price: 1,
    note: '恢复 25% 饱食',
  },
  ...Object.values(ITEMS)
    .filter((item) => item.category === 'melee' && item.tier === '普通')
    .map((item) => ({
      id: item.id,
      itemId: item.id,
      name: item.name,
      price: COMMON_MELEE_PRICES[item.id] ?? 6,
      note: meleeShopNote(item),
    }))
    .sort((a, b) => a.price - b.price),
]

/* ===== 都城王宫 ===== */

/** 王宫内的冷却周期（单位：天） */
export const PALACE_COOLDOWN = {
  daily: 1,
  weekly: 7,
}

/** 凭身份领取的俸禄，平民及以下没有 */
export const PALACE_SALARY = {
  '骑士': 2,
  '男爵': 3,
  '子爵': 5,
  '伯爵': 8,
  '侯爵': 12,
  '公爵': 15,
  '储君': 20,
}

/** 感染治疗的六档 */
export const TREATMENT_TIERS = [
  { id: 'basic', name: '初级治疗', minRank: 1, minIdentity: '骑士', reduce: 10 },
  { id: 'intermediate', name: '中级治疗', minRank: 2, minIdentity: '男爵', reduce: 20 },
  { id: 'advanced', name: '高级治疗', minRank: 3, minIdentity: '子爵', reduce: 30 },
  { id: 'professional', name: '专业治疗', minRank: 4, minIdentity: '伯爵', reduce: 40 },
  { id: 'premium', name: '特等治疗', minRank: 5, minIdentity: '侯爵', reduce: 50 },
  { id: 'court', name: '宫廷治疗', minRank: 6, minIdentity: '公爵', reduce: 60 },
]

/**
 * 王宫里的五种会议：共用同一个七日会期
 * 身份越高，座次越靠前，议题也越有分量
 */
export const PALACE_COUNCILS = [
  {
    id: 'knight',
    name: '骑士会议',
    identity: '骑士',
    rank: 1,
    turns: 1,
    coins: 2,
    sanity: 10,
    desc: '巡逻队交接与城墙防务。坐在末席也能听清每一句话。',
  },
  {
    id: 'round',
    name: '圆桌会议',
    identity: '男爵',
    rank: 2,
    turns: 1,
    coins: 3,
    sanity: 10,
    desc: '男爵们的封地事务，账目与税赋都要在这张桌上过一遍。',
  },
  {
    id: 'long',
    name: '长桌会议',
    identity: '子爵',
    rank: 3,
    turns: 1,
    coins: 5,
    sanity: 10,
    desc: '子爵一级的军需调配，长桌上铺满了地图。',
  },
  {
    id: 'staff',
    name: '幕僚会议',
    identity: '伯爵',
    rank: 4,
    turns: 1,
    coins: 8,
    sanity: 10,
    desc: '伯爵的幕僚议事。议题更少，分量更重。',
  },
  {
    id: 'court',
    name: '宫廷会议',
    identity: '公爵',
    rank: 6,
    turns: 1,
    coins: 12,
    sanity: 10,
    medicine: 1,
    desc: '公爵与储君的内廷会议，一句话能决定半座城的粮食。',
  },
]

/** 宫廷花园：只有储君能进，七天开放一次 */
export const GARDEN = {
  identity: '储君',
  rank: 7,
  turns: 1,
  coins: 6,
  medicines: 3,
  foods: 2,
}

/**
 * 在此探索的分支概率：25% 食物 / 25% 饮品 / 50% 什么也没有
 * 掉落池由物品数据自动生成：食物排除水果（fruit=true），饮品全部可掉落
 */
export const EXPLORE_BRANCH = { food: 25, drink: 25 }

export function exploreLootPool(category) {
  return Object.values(ITEMS).filter((item) => item.category === category && !item.fruit)
}

/** 抽一次探索结果，返回 itemId（null 表示一无所获） */
export function pickCityLoot() {
  const roll = Math.random() * 100
  let category = null
  if (roll < EXPLORE_BRANCH.food) category = 'food'
  else if (roll < EXPLORE_BRANCH.food + EXPLORE_BRANCH.drink) category = 'drink'
  if (!category) return null

  const pool = exploreLootPool(category)
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)].id
}

/** 从池子里不重复地取 count 个；池子不够时允许重复补足 */
function takeRandom(pool, count) {
  if (!pool.length) return []
  const copy = [...pool]
  const picked = []
  while (picked.length < count) {
    if (!copy.length) copy.push(...pool)
    picked.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  }
  return picked
}

/** 随机一份药品 id（宫廷会议赠品） */
export function pickRandomMedicine() {
  const pool = Object.values(ITEMS).filter((item) => item.category === 'medicine')
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)].id
}

/** 花园赠礼：3 份药品 + 2 份稀有食物（非水果） */
export function pickGardenLoot() {
  const medicines = takeRandom(
    Object.values(ITEMS).filter((item) => item.category === 'medicine'),
    GARDEN.medicines,
  )
  const foods = takeRandom(exploreLootPool('food'), GARDEN.foods)
  return [...medicines, ...foods].map((item) => item.id)
}
