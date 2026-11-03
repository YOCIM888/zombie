// 曙光阵地：身份、救济、市场与行尸战斗参数
import { ITEMS } from './items'
import { exploreLootPool } from './city'
import {
  DAWN_BOND_PRICE,
  DAWN_MARKET_PRICES,
  DAWN_RECYCLE_RANGES,
  DAWN_SERVICE_PRICES,
} from './markets'
import { NPCS } from './npcs'

/** 曙光身份：队员 < 队长 < 指挥 < 副首 */
export const DAWN_IDENTITY_LEVELS = [
  { name: '队员', rank: 0, itemId: 'badge-dawn-member', image: '/image/身份徽章/曙光队员徽章.webp' },
  { name: '队长', rank: 1, itemId: 'badge-dawn-captain', image: '/image/身份徽章/曙光队长徽章.webp' },
  { name: '指挥', rank: 2, itemId: 'badge-dawn-command', image: '/image/身份徽章/曙光指挥徽章.webp' },
  { name: '副首', rank: 3, itemId: 'badge-dawn-deputy', image: '/image/身份徽章/曙光副首徽章.webp' },
]

export function dawnInfo(name) {
  return DAWN_IDENTITY_LEVELS.find((level) => level.name === name) ?? null
}

export function dawnRank(name) {
  return dawnInfo(name)?.rank ?? -1
}

/** 某曙光等级对应的徽章物品 id */
export function dawnItemId(name) {
  return dawnInfo(name)?.itemId ?? null
}

/** 加入曙光需要的击杀数 */
export const DAWN_JOIN_KILLS = 5

/**
 * 曙光市场：全部用曙光币结算，价格统一在 data/markets.js
 * 远程武器只上架普通级，价格按攻击与闪避综合折算
 */
export const DAWN_MARKET = [
  { id: 'bandage', itemId: 'bandage', name: '绷带', price: DAWN_MARKET_PRICES.bandage, note: '生命 +30' },
  { id: 'tourniquet', itemId: 'tourniquet', name: '止血带', price: DAWN_MARKET_PRICES.tourniquet, note: '生命 +20' },
  { id: 'canned-meat', itemId: 'canned-meat', name: '肉罐头', price: DAWN_MARKET_PRICES['canned-meat'], note: '饱食 +30' },
  { id: 'canned-fish', itemId: 'canned-fish', name: '鱼罐头', price: DAWN_MARKET_PRICES['canned-fish'], note: '饱食 +30' },
  {
    id: 'hunting-bow',
    itemId: 'hunting-bow',
    name: '猎弓',
    price: DAWN_MARKET_PRICES['hunting-bow'],
    note: '20 攻击 · 14% 暴击 · 35% 暴伤 · 22% 闪避 · 远程武器',
  },
  {
    id: 'glock',
    itemId: 'glock',
    name: 'Glock',
    price: DAWN_MARKET_PRICES.glock,
    note: '20 攻击 · 10% 暴击 · 28% 暴伤 · 16% 闪避 · 远程武器',
  },
  {
    id: 'pm',
    itemId: 'pm',
    name: 'PM',
    price: DAWN_MARKET_PRICES.pm,
    note: '20 攻击 · 8% 暴击 · 28% 暴伤 · 18% 闪避 · 远程武器',
  },
  {
    id: 'usp',
    itemId: 'usp',
    name: 'USP',
    price: DAWN_MARKET_PRICES.usp,
    note: '21 攻击 · 12% 暴击 · 30% 暴伤 · 18% 闪避 · 远程武器',
  },
  {
    id: 'cz75',
    itemId: 'cz75',
    name: 'CZ75',
    price: DAWN_MARKET_PRICES.cz75,
    note: '22 攻击 · 12% 暴击 · 30% 暴伤 · 18% 闪避 · 远程武器',
  },
  {
    id: 'luger-08',
    itemId: 'luger-08',
    name: 'Luger 08',
    price: DAWN_MARKET_PRICES['luger-08'],
    note: '24 攻击 · 14% 暴击 · 32% 暴伤 · 17% 闪避 · 远程武器',
  },
  {
    id: 'm1911',
    name: 'M1911',
    price: DAWN_MARKET_PRICES.m1911,
    note: '26 攻击 · 11% 暴击 · 35% 暴伤 · 15% 闪避 · 远程武器',
  },
]

/** 羁绊商店统一价在 data/markets.js */

export const DAWN_BOND_SHOP = [
  {
    id: 'bond-blood-raven',
    itemId: 'blood-raven',
    name: '爆能手枪-血鸦',
    badgeId: 'badge-nutritionist',
    badgeName: '营养师徽章',
    price: DAWN_BOND_PRICE,
    note: '60 攻击 · 88% 暴击 · 2 暴伤 · 15% 闪避',
  },
  {
    id: 'bond-meteor-shotgun',
    itemId: 'meteor-shotgun',
    name: '机械霰弹-陨星',
    badgeId: 'badge-mechanic',
    badgeName: '机械师徽章',
    price: DAWN_BOND_PRICE,
    note: '75 攻击 · 20% 暴击 · 1.2 暴伤 · 55% 闪避',
  },
  {
    id: 'bond-daylight-sniper',
    itemId: 'daylight-sniper',
    name: '流光狙击-白昼',
    badgeId: 'badge-mercenary',
    badgeName: '雇佣兵徽章',
    price: DAWN_BOND_PRICE,
    note: '120 攻击 · 72% 暴击 · 1.5 暴伤 · 5% 闪避',
  },
  {
    id: 'bond-frost-greatsword',
    itemId: 'frost-greatsword',
    name: '寒霜大剑-冰晶',
    badgeId: 'badge-farming-master',
    badgeName: '农业大师徽章',
    price: DAWN_BOND_PRICE,
    note: '88 攻击 · 30% 暴击 · 2.22 暴伤 · 30% 连击 · 288 耐久',
  },
]

/** 目前只有一种行尸：普通行尸 */
export const DAWN_ZOMBIE = {
  name: '普通行尸',
  hp: 100,
  attack: 10,
  infection: 1,
  description: '它曾经也是某个人。现在只剩下向前走的本能。',
}

/** 逃跑成功率 */
export const DAWN_FLEE_CHANCE = 0.5

/** 四名常驻人物的每日服务 */
export const DAWN_SERVICE = {
  meal: { price: DAWN_SERVICE_PRICES.meal },
  brew: { price: DAWN_SERVICE_PRICES.brew, infection: 20 },
  training: { price: DAWN_SERVICE_PRICES.training, stamina: 20, sanity: 10 },
  tend: { turns: 2 },
  fieldSecretAt: 5,
}

/** 行尸走廊：赤手空拳穿越走廊，提升远程闪避天赋 */
export const CORRIDOR = {
  title: '行尸走廊',
  talentKey: 'corridor',
  turns: 1,
  hpCost: 30,
  infectionCost: 30,
  dailyLimit: 2,
  progressMin: 5,
  progressMax: 10,
  levelSize: 100,
  flag: 'corridorPractice',
  desc: '阵地最外侧有一条被封死的走廊，里面挤满了被铁链拴住的行尸。想练身法，就得空着手从它们中间穿过去。',
  needEmptyLine: '你必须卸下近战与远程武器，赤手空拳才能进入走廊。',
  dailyLine: '今天的走廊已经走了两趟，哨兵不再给你开门。',
  maxedLine: '远程闪避天赋已经练到顶点，走廊里再也挤不出新东西给你。',
  doneLine: '你贴着墙根从行尸之间穿了出来，掌心全是冷汗。',
}

/** 物资回收：品质档位与每日浮动区间统一在 data/markets.js */

const RECYCLE_TIERS = Object.keys(DAWN_RECYCLE_RANGES)

function recycleSeed(day, index) {
  let seed = Math.imul((Number(day) || 0) + 1, 0x9e3779b1)
  seed = Math.imul(seed + index + 1, 0x85ebca77)
  seed = Math.imul(seed ^ (seed >>> 13), 0x27d4eb2f)
  seed ^= seed >>> 16
  return (seed >>> 0) / 4294967296
}

/** 某品质在当日的回收价：同一天内固定，跨天重新浮动 */
export function recyclePriceForDay(tier, day) {
  const range = DAWN_RECYCLE_RANGES[tier]
  if (!range) return 0
  const [min, max] = range
  const index = RECYCLE_TIERS.indexOf(tier)
  return min + Math.floor(recycleSeed(day, index) * (max - min + 1))
}

/** 当日全部品质档位的回收价 */
export function dawnRecyclePrices(day) {
  return Object.fromEntries(
    RECYCLE_TIERS.map((tier) => [tier, recyclePriceForDay(tier, day)]),
  )
}

/** 管事处的晋升：累计击杀达标后授予下一级身份 */
export const DAWN_PROMOTIONS = [
  { from: '队员', to: '队长', kills: 50 },
  { from: '队长', to: '指挥', kills: 200 },
]

/** 领取救济：五档共用每天一次，按曙光身份等级开放 */
export const DAWN_RELIEF_TIERS = [
  {
    id: 'plain',
    name: '普通救助',
    identity: '无身份',
    rank: -1,
    fruitCount: 2,
    items: [],
    desc: '还没有身份的人也能领一份，只有两个水果，没人会多问一句。',
  },
  {
    id: 'basic',
    name: '基础救助',
    identity: '队员',
    rank: 0,
    fruitCount: 2,
    items: [{ itemId: 'bandage', qty: 1 }],
    desc: '物资箱里挑出来的最基础的一份，够撑过今天。',
  },
  {
    id: 'advanced',
    name: '进阶救助',
    identity: '队长',
    rank: 1,
    fruitCount: 3,
    items: [{ itemId: 'painkiller', qty: 1 }],
    desc: '多一个水果，加一片止痛药，管事的笔停了一下才签。',
  },
  {
    id: 'high',
    name: '高级救助',
    identity: '指挥',
    rank: 2,
    fruitCount: 4,
    items: [{ itemId: 'painkiller', qty: 2 }],
    desc: '箱子底下的存货被翻了出来，止痛药给了两片。',
  },
  {
    id: 'special',
    name: '特级救助',
    identity: '副首',
    rank: 3,
    fruitCount: 5,
    items: [{ itemId: 'anti-infection-shot', qty: 1 }],
    desc: '只有快撑不住的人才能拿到这一份，里面有一支抗感染针。',
  },
]

/** 每日工资：按当前曙光身份发放，四档共用每天一次 */
export const DAWN_SALARY = [
  { identity: '队员', rank: 0, coins: 2 },
  { identity: '队长', rank: 1, coins: 5 },
  { identity: '指挥', rank: 2, coins: 8 },
  { identity: '副首', rank: 3, coins: 10 },
]

/** 首领·羿阳：人类，不吃感染 */
export const DAWN_LEADER = NPCS.yiyang

/** 阵地人物 */
export const DAWN_NPCS = [
  {
    id: 'nutritionist',
    no: '05',
    name: '营养师-苏涵',
    desc: '配餐台由她守着。每天一份热食，只收曙光币。',
    implemented: true,
  },
  {
    id: 'mechanic',
    no: '06',
    name: '机械师-莉莉',
    desc: '修理台上堆着拆到一半的枪。远程武器可以拆成零件，感染的伤口她也能处理。',
    implemented: true,
  },
  {
    id: 'mercenary',
    no: '07',
    name: '雇佣兵-薇尔',
    desc: '训练场的雇佣兵。她收武器，也愿意带你练一场。',
    implemented: true,
  },
  {
    id: 'agronomist',
    no: '08',
    name: '农学家-苗苗',
    desc: '阵地后方的实验田。每天浇一次水，偶尔能刨出一点收成。',
    implemented: true,
  },
  {
    id: 'leader',
    no: '09',
    name: '首领-羿阳',
    desc: '曙光阵地的首领，皇后米娅的哥哥。任务与刺杀都在他这里。',
    implemented: true,
  },
]

/** 随机获得一个水果（领取救济） */
export function pickDawnFruit() {
  const pool = Object.values(ITEMS).filter((item) => item.fruit)
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)].id
}

/** 酒精饮品不进入配餐池 */
const ALCOHOL_DRINKS = [
  'corona',
  'white-beer',
  'brandy',
  'vodka',
  'gin',
  'rum',
  'tequila',
  'whiskey',
]

/** 苏涵的配餐：全部食物 + 非酒精饮品，排除限定与特殊物品 */
export function pickDawnMeal() {
  const pool = Object.values(ITEMS).filter((item) => {
    if (item.limited || item.special) return false
    if (item.category === 'food') return true
    if (item.category !== 'drink') return false
    return !ALCOHOL_DRINKS.includes(item.id)
  })
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)].id
}

/** 行尸掉落：50% 食物 / 50% 饮品，食物不含水果 */
export function pickDawnLoot() {
  const category = Math.random() < 0.5 ? 'food' : 'drink'
  const pool = exploreLootPool(category)
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)].id
}
