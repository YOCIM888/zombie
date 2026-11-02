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

/** 都城银行行长：化债战斗与货币互换 */
export const BANKER = {
  npcId: 'banker',
  /** 互换比例：每 exchangeRate 枚可换 1 枚，双向相同 */
  exchangeRate: 2,
  /** 化债后到期日额外宽限的天数 */
  graceDays: 30,
  /** 化债战斗里行长的锁血下限 */
  hpFloor: 1,
  intro:
    '柜台后面那扇门终于开了。行长金钱堡摘下金丝眼镜，把账本摊在桌上，手指按在你那一页。',
  debtLine:
    '金钱堡扶着桌沿坐回椅子，喘着气笑了：「行，利息我不要了。本金，再加三十天。」',
  debtHint:
    '他不打算免掉一个铜板，除非你把他逼到绝路。传闻他在每一场械斗里都只流血到最后一点，然后笑着收手。',
  noLoanLine: '你今天不欠银行的钱，没什么可谈的。',
  waivedLine: '这笔贷款的利息已经免过了，只剩本金要还。',
  fleeLine: '你收住手，退出了银行大厅。行长整理着袖口，账本还摊在桌上。',
  exchangeLine:
    '行长把两摞币推到台面两边：「二换一，两边都是。换多少，你自己填。」',
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
  '骑士': 3,
  '男爵': 5,
  '子爵': 8,
  '伯爵': 10,
  '侯爵': 12,
  '公爵': 15,
  '储君': 18,
}

/** 宫廷舞会的三档：共用同一个每日次数 */
export const PALACE_DANCES = [
  {
    id: 'common',
    name: '普通舞会',
    price: 0,
    sanity: 30,
    desc: '厅角的乐队只奏最熟的曲子，谁都能下场跳一支。',
  },
  {
    id: 'elite',
    name: '名媛舞会',
    price: 5,
    sanity: 50,
    desc: '名媛们围成半圈，手套上的蕾丝比话题更讲究。',
  },
  {
    id: 'star',
    name: '明星舞会',
    price: 8,
    sanity: 80,
    desc: '水晶灯下站着整座都城的焦点，连乐师都屏住了呼吸。',
  },
]

/** 宫廷宴会的三档：共用同一个每日次数 */
export const PALACE_BANQUETS = [
  {
    id: 'common',
    name: '普通宴会',
    price: 0,
    hunger: 30,
    thirst: 30,
    desc: '长桌最末的位置也管饱，只要你不介意和侍者一起站着吃。',
  },
  {
    id: 'elite',
    name: '名人宴会',
    price: 5,
    hunger: 50,
    thirst: 50,
    desc: '名人端着酒杯在厅里走动，侍者替你续了两次汤。',
  },
  {
    id: 'star',
    name: '皇家宴会',
    price: 8,
    hunger: 80,
    thirst: 80,
    desc: '御厨把整条长桌铺满，连酒都是从地窖最深处抬上来的。',
  },
]

/** 宫廷客房的三档：共用同一个每日次数 */
export const PALACE_ROOMS = [
  {
    id: 'common',
    name: '典雅客房',
    price: 0,
    stamina: 30,
    desc: '被褥干净，窗棂上积着薄灰，睡一觉足够恢复精神。',
  },
  {
    id: 'elite',
    name: '华丽客房',
    price: 5,
    stamina: 50,
    desc: '床柱雕着缠枝花纹，枕头软得让人不想起身。',
  },
  {
    id: 'star',
    name: '私享舞会',
    price: 8,
    stamina: 80,
    desc: '整层楼只为你一个人点亮，乐师在门外候着，直到你尽兴。',
  },
]

/** 感染治疗的六档 */
export const TREATMENT_TIERS = [
  { id: 'basic', name: '初级治疗', minRank: 1, minIdentity: '骑士', reduce: 10 },
  { id: 'intermediate', name: '中级治疗', minRank: 2, minIdentity: '男爵', reduce: 20 },
  { id: 'advanced', name: '高级治疗', minRank: 3, minIdentity: '子爵', reduce: 30 },
  { id: 'professional', name: '专业治疗', minRank: 4, minIdentity: '伯爵', reduce: 40 },
  { id: 'premium', name: '特等治疗', minRank: 5, minIdentity: '侯爵', reduce: 50 },
  { id: 'court', name: '宫廷治疗', minRank: 6, minIdentity: '公爵', reduce: 60 },
]

/** 王宫贵族商店：限定品质，不进入任何随机掉落池 */
export const PALACE_SHOP = [
  {
    id: 'royal-lance',
    itemId: 'royal-lance',
    name: '皇家长枪',
    tier: '限定',
    price: 88,
    note: '66 攻击 · 66% 暴击 · 1.66 暴伤 · 16% 闪避',
  },
  {
    id: 'royal-scepter',
    itemId: 'royal-scepter',
    name: '皇家权杖',
    tier: '限定',
    price: 66,
    note: '22 攻击 · 26% 暴击 · 2.66 暴伤 · 66% 连击 · 166 耐久',
  },
  {
    id: 'royal-mix',
    itemId: 'royal-mix',
    name: '皇家特调',
    tier: '限定',
    price: 10,
    note: '口渴 +60 · 理智 +60 · 体力 +60',
  },
  {
    id: 'royal-dessert',
    itemId: 'royal-dessert',
    name: '皇家甜点',
    tier: '限定',
    price: 10,
    note: '饱食 +60 · 生命 +60 · 感染 -60',
  },
]

/** 按品质抽一把近战武器（排除限定物品） */
export function pickMeleeByTier(tier) {
  const pool = Object.values(ITEMS).filter(
    (item) => item.category === 'melee' && item.tier === tier && !item.limited,
  )
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * 王宫里的七档会议：共用同一个七日会期
 * 身份越高可参加越高的会议；高爵位也能参加低爵位会议
 */
export const PALACE_COUNCILS = [
  {
    id: 'knight',
    name: '圆桌誓会',
    identity: '骑士',
    rank: 1,
    turns: 1,
    coins: 5,
    weaponTier: '普通',
    desc: '骑士们在圆桌边重述誓约。散会时，有人把一把趁手的家伙推到面前。',
  },
  {
    id: 'baron',
    name: '封邑小议',
    identity: '男爵',
    rank: 2,
    turns: 1,
    coins: 10,
    weaponTier: '普通',
    desc: '封地的账目与税赋过一遍小桌，散会时照例有份「路上用的东西」。',
  },
  {
    id: 'viscount',
    name: '子爵议厅',
    identity: '子爵',
    rank: 3,
    turns: 1,
    coins: 15,
    weaponTier: '稀有',
    desc: '军需调配的地图铺满整张议桌，边角上放着一把保养过的兵器。',
  },
  {
    id: 'earl',
    name: '伯爵议庭',
    identity: '伯爵',
    rank: 4,
    turns: 1,
    coins: 20,
    weaponTier: '稀有',
    desc: '伯爵们关起门议事，门外的侍从替你备好了一份体面的谢礼。',
  },
  {
    id: 'marquis',
    name: '侯爵会盟',
    identity: '侯爵',
    rank: 5,
    turns: 1,
    coins: 25,
    weaponTier: '精良',
    desc: '几位侯爵的会盟，谈的是巡防与兵权。桌上的兵器不再只是摆设。',
  },
  {
    id: 'duke',
    name: '公爵议政',
    identity: '公爵',
    rank: 6,
    turns: 1,
    coins: 30,
    weaponTier: '精良',
    desc: '公爵们定下内廷的规矩，散会时赏下的东西也都带着分量。',
  },
  {
    id: 'heir',
    name: '储君廷议',
    identity: '储君',
    rank: 7,
    turns: 1,
    coins: 40,
    weaponTier: '史诗',
    desc: '储君坐主位，一句话就能决定半座城的粮食。退席时，内侍捧来一柄史诗兵器。',
  },
]

/** 宫廷花园：仅储君可用，四项活动各自计算次数 */
export const GARDEN = {
  identity: '储君',
  rank: 7,
  activities: [
    {
      id: 'walk',
      name: '花园散步',
      cooldownKey: 'garden-walk',
      days: 1,
      turns: 1,
      fruitCount: 3,
      reward: '随机单种水果 ×3',
      desc: '藤架下的果子熟了，园丁朝你点点头，示意你随便摘。',
    },
    {
      id: 'tea',
      name: '品下午茶',
      cooldownKey: 'garden-tea',
      days: 1,
      turns: 1,
      items: [
        { itemId: 'royal-mix', qty: 1 },
        { itemId: 'royal-dessert', qty: 1 },
      ],
      reward: '皇家特调 ×1 + 皇家甜点 ×1',
      desc: '石桌上摆着一套银器，皇家特调与甜点都还冒着热气。',
    },
    {
      id: 'potion',
      name: '神秘药剂',
      cooldownKey: 'garden-potion',
      days: 5,
      turns: 1,
      items: [{ itemId: 'panacea', qty: 5 }],
      coins: 10,
      reward: '万能灵药 ×5 · 末日币 +10',
      desc: '内侍从花房深处端来一只封着蜡的箱子，箱子里有轻微的碰撞声。',
    },
    {
      id: 'prayer',
      name: '神迹祈祷',
      cooldownKey: 'garden-prayer',
      days: 7,
      turns: 1,
      fullRestore: true,
      coins: 30,
      reward: '状态补满 · 末日币 +30',
      desc: '花房尽头有一尊无名的石像，跪下去的人都说灵。',
    },
  ],
}

/** 王宫斗兽擂台：赤手空拳提升拳头天赋 */
export const ARENA = {
  title: '斗兽擂台',
  talentKey: 'arena',
  turns: 1,
  hpCost: 30,
  sanityCost: 30,
  dailyLimit: 2,
  progressMin: 5,
  progressMax: 10,
  levelSize: 100,
  flag: 'arenaPractice',
  desc: '王宫最深处的石阶通向一座下沉的擂台。看台上没有灯，只有贵族们压低声音下注。想上场，先把手里的武器全部放下。',
  needEmptyLine: '你必须卸下近战与远程武器，赤手空拳才能上场。',
  dailyLine: '今天的擂台已经打满两场，守卫开始收起赌注。',
  maxedLine: '拳头天赋已经练到顶点，擂台不再接受你的挑战。',
  doneLine: '你从擂台上翻下来，指节还在发烫。',
}

/**
 * 在此探索的分支概率：33% 食物 / 33% 饮品 / 34% 什么也没有
 * 掉落池由物品数据自动生成：食物排除水果（fruit=true），饮品全部可掉落
 */
export const EXPLORE_BRANCH = { food: 33, drink: 33 }

export function exploreLootPool(category) {
  return Object.values(ITEMS).filter(
    (item) => item.category === category && !item.fruit && !item.limited,
  )
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

/** 随机一份药品 id（宫廷会议赠品） */
export function pickRandomMedicine() {
  const pool = Object.values(ITEMS).filter((item) => item.category === 'medicine')
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)].id
}
