// 末日飞行船：隐藏地图、直升机入口、招待会所、高台政变、练习与高价商店
import { ITEMS } from './items'
import { ceilToCents, floorToCents, roundToCents } from './money'
import { ZOMBIE_TYPES } from './zombies'

/** 隐藏地图：只能通过荒废警局的老旧直升机前往 */
export const AIRSHIP_MAP = {
  id: 'doomsday-airship',
  name: '末日飞行船',
  level: 'LV. 12',
  difficulty: '绝对禁区',
  risk: 5,
  desc: '一艘停在云层之上的巨型飞行船。甲板上灯火通明，贵族们端着酒杯，像脚下的废墟与他们无关。',
  note: '隐藏区域 · 需修复荒废警局的老旧直升机后前往',
  open: true,
  hidden: true,
}

/** 荒废警局的老旧直升机 */
export const HELICOPTER = {
  mapId: 'abandoned-police',
  name: '老旧直升机',
  gasolineId: 'gasoline',
  repairGasoline: 20,
  travelGasoline: 1,
  repairedFlag: 'helicopterRepaired',
  desc: '警局天台停着一架蒙尘的老式直升机。旋翼还能转，油箱却是空的。',
  repairLine:
    '你把二十桶汽油倒进油箱，又换了两根油管。旋翼试着转了两圈，居然真的着了。',
  repairedLine: '直升机已经修好了。旋翼下压着的风，随时可以把你送上云层。',
  notRepairedLine: '直升机还没有修好，旋翼转不起来。',
  travelLine: '直升机的旋翼撕开灰云。你越过一片又一片废墟，落在一艘悬在半空的飞行船上。',
  noGasolineLine: '汽油不够。',
}

/** 飞行船规则与文案 */
export const AIRSHIP = {
  mapId: AIRSHIP_MAP.id,
  name: AIRSHIP_MAP.name,
  intro: '舷梯放下的一刻，空气里有皮革、酒和雪茄的味道。这里的贵族不关心丧尸，只关心谁还站着。',
  hall: {
    rank: 4,
    rankName: '伯爵',
    cooldownKey: 'airship-hall',
    cooldownDays: 1,
    turns: 4,
    effects: { hp: 60, stamina: 60, sanity: 60, hunger: 60, thirst: 60 },
    desc: '水晶灯下摆着长桌，侍者替你拉开椅子。四个小时里，你只需要做一个体面的客人。',
    doneLine: '你在招待会所度过了一段体面的时光。',
    blockedRankLine: '侍者礼貌地拦住你：至少要有伯爵爵位，才能进入招待会所。',
    cooldownLine: '招待会所的侍者今天已经为你拉开过椅子了，明天再来。',
  },
  speech: {
    cooldownKey: 'airship-speech',
    cooldownDays: 1,
    turns: 2,
    reputation: 1,
    desc: '高台围着一圈沉默的贵族。你站上去，风把衣角吹得猎猎作响。',
    doneLine: '你在高台上完成了一次演讲。贵族们没有鼓掌，但看你的眼神变了。',
    cooldownLine: '今天的高台已经有人站过了，明天轮到你再来一次。',
  },
  practice: {
    turns: 1,
    cost: 10,
    dailyLimit: 2,
    progressMin: 5,
    progressMax: 10,
    maxLevel: 3,
    levelSize: 100,
    flag: 'airshipPractice',
    melee: {
      title: '木桩练习',
      desc: '甲板尽头立着一排包铁的木桩，桩面上全是旧刀痕。',
      needWeapon: '木桩练习必须先装备一把近战武器。',
      tooWorn: '武器的耐久不足 10，先去保养再来。',
      doneLine: '你对着木桩练了一阵。刀口卷了一点，手感却清楚了不少。',
      maxedLine: '近战天赋已经练到顶了，再打木桩也不会更长进。',
    },
    ranged: {
      title: '打靶练习',
      desc: '船尾拖着一排靶标，风很大，子弹在甲板上滚出很远。',
      needWeapon: '打靶练习必须先装备一把远程武器。',
      tooWorn: '远程武器的清洁度不足 10，先保养再来。',
      doneLine: '你对着靶标打空了一个弹匣。枪身脏了，准星却稳了一些。',
      maxedLine: '远程天赋已经练到顶了，再打靶也不会更长进。',
    },
    dailyLine: '今天已经练满两次了，贵族们也要休息。',
    brokenLine: '{name}在练习中彻底损坏了。',
    dirtyLine: '{name}的清洁度归零，需要保养后才能继续开火。',
  },
  commission: {
    title: '居民委托',
    desc: '甲板下层贴着一块软木板，钉着今天的委托单。纸边被风吹得发响。',
    battle: {
      title: '战斗委托',
      cooldownKey: 'airship-commission-battle',
      cooldownDays: 1,
      turns: 1,
      reputation: 2,
      desc: '居民区又进了东西。委托人只要求你把它清掉，别的什么都不问。',
      cooldownLine: '今天的战斗委托已经有人接了。',
      doneLine: '你擦掉武器上的污渍。委托人远远地点了下头。',
    },
    party: {
      title: '派对委托',
      cooldownKey: 'airship-commission-party',
      cooldownDays: 1,
      turns: 1,
      reputation: 1,
      desc: '今晚甲板上有派对，组织者缺一瓶酒。酒精度数越高，他们越高兴。',
      cooldownLine: '今天的派对委托已经完成了。',
      missingLine: '你还没有这瓶酒。',
      doneLine: '你把酒放上长桌。有人替你倒了半杯。',
    },
    chore: {
      title: '杂物委托',
      cooldownKey: 'airship-commission-chore',
      cooldownDays: 1,
      turns: 1,
      reputation: 1,
      staminaMin: 10,
      staminaMax: 25,
      desc: '搬箱子、修护栏、清理甲板缝里的旧血。没人愿意干的活，总会轮到你。',
      warningLine: '建议体力高于 25 再接下这份活；体力归零会触发「过劳」结局。',
      cooldownLine: '今天的杂物委托已经做完了。',
      doneLine: '你把手上的灰拍掉。活不算体面，但管事的记了你的名字。',
    },
  },
  oil: {
    title: '储油仓库',
    desc: '仓库里码着一排铁皮油桶，空气里全是汽油味。这里只认末日币，不认人情。',
    sellRate: 1,
    buyMin: 1,
    buyMax: 3,
  },
  nobles: {
    moran: {
      name: '公爵·漠然',
      line: '云上秩序',
      afterCoup: '漠然坐在高台下方，酒杯放在手边，没有再抬眼看你。这艘船已经换了主人。',
    },
    schika: {
      name: '伯爵·席卡',
      line: '永不散席',
      afterCoup: '席卡仍旧站在长桌边，只是不再开口邀你入席。他学会了先看你的脸色。',
    },
    nubi: {
      name: '伯爵·努比',
      line: '云上机务',
      afterCoup: '努比把机务册合上，向你行了一个很浅的礼。引擎还归他管，命令已经归你。',
    },
  },
  cargo: {
    title: '货舱异响',
    enemyName: '货舱里的铁甲尸',
    enemyDescription: '它不知什么时候爬进了船底，身上焊着的铁皮卡在货架之间，撞得钢板一下一下地响。',
    intro: '货舱底下传来有节奏的撞击声。努比把一盏手提灯递给你，示意你下去看看。',
    clearedLine: '铁甲尸倒在货舱底部，撞钢板的声音终于停了。',
    clearedNote: '你爬回机务舱。努比听完，只说了一句：「至少它没把船底凿穿。」',
    alreadyLine: '货舱已经清理过了。',
    lockedLine: '努比还没把这件差事交给你。',
  },
  coup: {
    rank: 6,
    rankName: '公爵',
    reputation: 60,
    enemyIds: ['schika', 'nubi', 'moran'],
    finale: '飞行船主宰',
    desc: '高台之下坐着整艘船的贵族。你要么讲完，要么把他们全部掀下去。',
    rankLine: '高台守卫按住了你的肩：至少要有公爵爵位，才能提政变。',
    reputationLine: '贵族们嗤笑出声：声望还不到 60，谁会跟你走？',
    activeLine: '政变已经开始，先解决眼前的人。',
    doneLine: '这艘飞行船上，已经没人敢再对你举杯了。',
    startLine: '你站上高台，把话说完。席卡第一个站了起来。',
    fleeLine: '你从高台边沿翻了下去。政变失败，声望清零，但至少还活着。',
    defeatedLine: '你倒在高台上。贵族们只是把酒杯换了个位置。',
  },
  menu: [
    { id: 'moran', name: '公爵·漠然', note: '任务线 · 云上秩序' },
    { id: 'schika', name: '伯爵·席卡', note: '任务线 · 永不散席' },
    { id: 'nubi', name: '伯爵·努比', note: '任务线 · 云上机务' },
    { id: 'hall', name: '招待会所', note: '伯爵以上 · 每天一次 · 跳过 4 回合' },
    { id: 'platform', name: '前往高台', note: '演讲积声望 · 公爵可政变' },
    { id: 'dummy', name: '木桩练习', note: '近战熟练度 · 每天两次' },
    { id: 'range', name: '打靶练习', note: '远程熟练度 · 每天两次' },
    { id: 'bar', name: '飞行酒吧', note: '全部饮品 · 3-8 末日币' },
    { id: 'restaurant', name: '飞行餐厅', note: '全部食物与水果 · 3-8 末日币' },
    { id: 'medical', name: '医药中心', note: '除万能灵药外的全部药品 · 5-10 末日币' },
    { id: 'melee', name: '兵器市场', note: '稀有与精良近战 · 50-100 末日币' },
    { id: 'guns', name: '枪械中心', note: '稀有远程武器 · 60-120 末日币' },
    { id: 'treasure', name: '珍宝商店', note: '每日一件史诗近战 · 90-200 末日币' },
    { id: 'commission', name: '居民委托', note: '战斗 / 派对 / 杂物 · 每天各一次' },
    { id: 'investment', name: '投资中心', note: '六支股票 · 每日涨跌 · 1% 手续费' },
    { id: 'oil', name: '储油仓库', note: '汽油买卖 · 每日浮动价' },
  ],
}

/** 投资中心的六支股票 */
export const AIRSHIP_STOCKS = [
  {
    id: 'alan-arms',
    name: '艾伦武装',
    sector: '军工',
    basePrice: 110,
    desc: '王宫卫队与军械订单。国王的战争机器，涨跌都带着火药味。',
  },
  {
    id: 'mia-logistics',
    name: '米娅后勤',
    sector: '后勤',
    basePrice: 80,
    desc: '皇后掌管的补给与医药线路。走得慢，但很少断货。',
  },
  {
    id: 'moran-commerce',
    name: '漠然商业',
    sector: '商业',
    basePrice: 150,
    desc: '飞行船贵族的生意：酒、丝绸与云上关税。',
  },
  {
    id: 'capital-construction',
    name: '都城建设',
    sector: '基建',
    basePrice: 60,
    desc: '城墙、避难所与重建合同，全看下一份政令落在哪里。',
  },
  {
    id: 'doomsday-entertainment',
    name: '末日娱乐',
    sector: '娱乐',
    basePrice: 35,
    desc: '赌场、酒馆与巡演。行情比甲板上的人心还快。',
  },
  {
    id: 'food-emergency',
    name: '食品应急',
    sector: '食品',
    basePrice: 25,
    desc: '罐头与净水储备。灾年里最硬的通货，也是最慢的生意。',
  },
]

export const STOCK_PRICE_MIN = 0.01
export const STOCK_PRICE_MAX = 300
export const STOCK_FEE_RATE = 0.01
export const STOCK_FEE_MIN = 1

function normalizeStockPrice(value, fallback) {
  const amount = value === null || value === undefined || value === '' ? NaN : Number(value)
  const price = Number.isFinite(amount) ? amount : Number(fallback) || STOCK_PRICE_MIN
  return Math.max(
    STOCK_PRICE_MIN,
    Math.min(STOCK_PRICE_MAX, roundToCents(price)),
  )
}

/** 交易手续费：成交额的 1%，向上取整到分，最低 1 币 */
export function stockTradeFee(amount) {
  return Math.max(
    STOCK_FEE_MIN,
    ceilToCents((Number(amount) || 0) * STOCK_FEE_RATE),
  )
}

/** 盈亏取整：盈利截断到分，亏损向上补到分 */
export function stockProfitRounded(value) {
  const amount = Number(value) || 0
  return amount >= 0 ? floorToCents(amount) : -ceilToCents(-amount)
}

/** 每日行情：按股票与日期生成 5%-15% 的涨跌，价格限制在 0.01-300 */
export function rollStockPrices(prices, day) {
  const next = {}
  AIRSHIP_STOCKS.forEach((stock, index) => {
    const current = normalizeStockPrice(prices?.[stock.id], stock.basePrice)
    const percent = 5 + (dayHash(day, 50 + index) % 11)
    let up = dayHash(day, 60 + index) % 2 === 0

    // 触底必涨、封顶必跌，保证每天都有变化
    if (current <= STOCK_PRICE_MIN) up = true
    else if (current >= STOCK_PRICE_MAX) up = false

    const raw = current * (1 + (up ? 1 : -1) * percent / 100)
    let price = normalizeStockPrice(raw, current)
    if (price === current) {
      price = normalizeStockPrice(current + (up ? 0.01 : -0.01), current)
    }
    next[stock.id] = price
  })
  return next
}

/** 练习天赋：三级称号与加成，取最高级、不叠加 */
export const PRACTICE_TALENTS = {
  melee: {
    key: 'melee',
    label: '近战天赋',
    stat: '近战连击率',
    titles: ['实力打手', '战斗专家', '圣斗士'],
    bonuses: [0.05, 0.1, 0.15],
  },
  ranged: {
    key: 'ranged',
    label: '远程天赋',
    stat: '远程暴击率',
    titles: ['潜力射手', '精确射手', '神枪手'],
    bonuses: [0.05, 0.1, 0.15],
  },
}

/** 某等级对应的天赋加成；0 级为 0 */
export function talentBonus(kind, level) {
  const talent = PRACTICE_TALENTS[kind]
  if (!talent) return 0
  const index = Math.max(0, Math.min(talent.bonuses.length - 1, Math.round(level) - 1))
  return level > 0 ? talent.bonuses[index] : 0
}

/** 某等级对应的天赋称号；0 级返回空字符串 */
export function talentTitle(kind, level) {
  const talent = PRACTICE_TALENTS[kind]
  if (!talent || level <= 0) return ''
  return talent.titles[Math.min(talent.titles.length, Math.round(level)) - 1] ?? ''
}

const EFFECT_LABELS = {
  hp: '生命',
  hunger: '饱食',
  thirst: '口渴',
  sanity: '理智',
  stamina: '体力',
  infection: '感染',
}

const clampPrice = (min, max, value) => Math.max(min, Math.min(max, Math.round(value)))

function effectSum(item) {
  return Object.values(item.effects ?? {}).reduce((sum, value) => sum + Math.abs(Number(value) || 0), 0)
}

/** 饮品 / 食物：3 + 效果绝对值和 / 10，封顶 8 */
function drinkOrFoodPrice(item) {
  return clampPrice(3, 8, 3 + effectSum(item) / 10)
}

/** 药品：5 + 效果绝对值和 / 15，封顶 10 */
function medicinePrice(item) {
  return clampPrice(5, 10, 5 + effectSum(item) / 15)
}

/** 稀有 / 精良近战：40 + 攻击 + 暴伤折算，封顶 100 */
function meleePrice(item) {
  const w = item.weapon ?? {}
  return clampPrice(50, 100, 40 + (w.attack ?? 0) + (w.critDamage ?? 0) * 8)
}

/** 稀有远程：45 + 攻击 × 1.3，封顶 120 */
function rangedPrice(item) {
  const w = item.weapon ?? {}
  return clampPrice(60, 120, 45 + (w.attack ?? 0) * 1.3)
}

/** 商品说明：武器展示战斗面板，消耗品展示效果 */
export function flightGoodNote(item) {
  if (!item) return ''
  if (item.category === 'melee' || item.category === 'ranged') {
    const w = item.weapon ?? {}
    const crit = Math.round((w.crit ?? 0) * 100)
    const combo = Math.round((w.combo ?? 0) * 100)
    if (item.category === 'ranged') {
      return `${w.attack} 攻击 · ${crit}% 暴击 · ${w.critDamage} 暴伤 · ${Math.round(
        (w.dodge ?? 0) * 100,
      )}% 闪避 · 清洁度 100`
    }
    return `${w.attack} 攻击 · ${crit}% 暴击 · ${w.critDamage} 暴伤 · ${combo}% 连击 · ${w.durability} 耐久`
  }
  const effects = Object.entries(item.effects ?? {})
  if (!effects.length) return item.description ?? ''
  return effects
    .map(([key, value]) => `${EFFECT_LABELS[key] ?? key} ${value > 0 ? '+' : ''}${value}`)
    .join(' · ')
}

function buildGoods(items, priceOf) {
  return items
    .filter(Boolean)
    .map((item) => ({
      id: item.id,
      itemId: item.id,
      name: item.name,
      tier: item.tier ?? '',
      price: priceOf(item),
      note: flightGoodNote(item),
    }))
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, 'zh-Hans-CN'))
}

const ALL_ITEMS = Object.values(ITEMS)

/** 飞行船商店：价格普遍高于都城，全部用末日币结算 */
export const AIRSHIP_SHOP_GOODS = {
  bar: buildGoods(
    ALL_ITEMS.filter((item) => item.category === 'drink'),
    drinkOrFoodPrice,
  ),
  restaurant: buildGoods(
    ALL_ITEMS.filter((item) => item.category === 'food'),
    drinkOrFoodPrice,
  ),
  medical: buildGoods(
    ALL_ITEMS.filter((item) => item.category === 'medicine' && item.id !== 'panacea'),
    medicinePrice,
  ),
  melee: buildGoods(
    ALL_ITEMS.filter(
      (item) => item.category === 'melee' && (item.tier === '稀有' || item.tier === '精良'),
    ),
    meleePrice,
  ),
  guns: buildGoods(
    ALL_ITEMS.filter((item) => item.category === 'ranged' && item.tier === '稀有'),
    rangedPrice,
  ),
}

const EPIC_MELEE = ALL_ITEMS.filter((item) => item.category === 'melee' && item.tier === '史诗')

/**
 * 珍宝商店：按天数确定性地刷新一件史诗近战
 * 同一天反复打开价格不变；跨天自动换货
 */
export function treasureForDay(day) {
  if (!EPIC_MELEE.length) return null
  const seed = Math.abs(Math.round(Number(day) || 1))
  let hash = (seed * 9301 + 49297) % 233280
  hash = (hash * 233280 + 9301) % 233280
  const index = Math.floor((hash / 233280) * EPIC_MELEE.length) % EPIC_MELEE.length
  const item = EPIC_MELEE[index]
  return {
    id: `treasure-${seed}`,
    itemId: item.id,
    name: item.name,
    tier: item.tier,
    price: 90 + (hash % 111),
    note: flightGoodNote(item),
  }
}

/** 每天可上交的酒：啤酒与烈酒 */
const COMMISSION_WINES = [
  'corona',
  'white-beer',
  'brandy',
  'vodka',
  'gin',
  'rum',
  'tequila',
  'whiskey',
]

/** 按天与用途生成确定性种子，同一天反复查看结果不变 */
function dayHash(day, salt) {
  const seed = Math.abs(Math.round(Number(day) || 1)) + salt * 7919
  let hash = (seed * 9301 + 49297) % 233280
  hash = (hash * 233280 + 9301) % 233280
  return hash
}

/**
 * 当日居民委托：
 * 战斗目标从全部丧尸中抽取，派对委托随机一瓶酒，杂物委托随机体力消耗 10-25
 */
export function commissionForDay(day) {
  const seed = Math.abs(Math.round(Number(day) || 1))
  return {
    zombie: ZOMBIE_TYPES[dayHash(seed, 1) % ZOMBIE_TYPES.length],
    wineId: COMMISSION_WINES[dayHash(seed, 2) % COMMISSION_WINES.length],
    stamina: 10 + (dayHash(seed, 3) % 16),
  }
}

/** 储油仓库当日收购 / 出售价：购买价 1-3 末日币，按天刷新 */
export function oilPriceForDay(day) {
  return 1 + (dayHash(day, 4) % 3)
}

/** 商店标题与描述 */
export const AIRSHIP_SHOPS = {
  bar: { name: '飞行酒吧', desc: '吧台上摆着从废墟里搜来的所有酒。价格贵得离谱，但这里没人讲价。' },
  restaurant: { name: '飞行餐厅', desc: '银盘里盛着水果和罐头。厨子说食材是今早刚运上来的。' },
  medical: { name: '医药中心', desc: '玻璃柜里码着药品，标签全是新的。万能灵药不在其中。' },
  melee: { name: '兵器市场', desc: '墙上挂满稀有与精良的近战武器，每一把都擦得发亮。' },
  guns: { name: '枪械中心', desc: '柜台上只摆稀有品质的远程武器，保养得比人都干净。' },
  treasure: { name: '珍宝商店', desc: '天鹅绒托盘里每天只放一件史诗近战，卖完就收起来。' },
}
