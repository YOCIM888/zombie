// 野外地图：威胁度、遭遇率、掉落类别与武器品质权重
import { ITEMS } from './items'
import { NPCS } from './npcs'

const CATEGORY_LABELS = {
  food: '食物',
  drink: '饮品',
  fruit: '水果',
  medicine: '药品',
  melee: '近战武器',
  ranged: '远程武器',
}

const FOOD_POOL = Object.values(ITEMS).filter((item) => item.category === 'food' && !item.fruit && !item.limited && !item.special)
const FRUIT_POOL = Object.values(ITEMS).filter((item) => item.fruit && !item.limited)
const DRINK_POOL = Object.values(ITEMS).filter((item) => item.category === 'drink' && !item.limited)
const MEDICINE_POOL = Object.values(ITEMS).filter((item) => item.category === 'medicine' && !item.limited)
const MELEE_POOL = Object.values(ITEMS).filter((item) => item.category === 'melee' && !item.limited)
const RANGED_POOL = Object.values(ITEMS).filter((item) => item.category === 'ranged' && !item.limited)

const ITEM_POOLS = {
  food: FOOD_POOL,
  drink: DRINK_POOL,
  fruit: FRUIT_POOL,
  medicine: MEDICINE_POOL,
  melee: MELEE_POOL,
  ranged: RANGED_POOL,
}

/** 丧尸击杀后的基础掉落概率 */
export const ZOMBIE_LOOT_DROP_RATE = 0.55

function map(
  id,
  name,
  level,
  difficulty,
  risk,
  desc,
  encounterRate,
  zombiePool,
  lootTable,
  zombieLoot,
  rarityWeights,
  lootNote,
) {
  return {
    id,
    name,
    level,
    difficulty,
    risk,
    desc,
    note: '可进入 · 探索、遭遇、物资',
    open: true,
    field: true,
    encounterRate,
    zombiePool,
    lootTable,
    zombieLoot,
    rarityWeights,
    lootNote,
  }
}

export const FIELD_MAPS = [
  map(
    'abandoned-village',
    '废弃村庄',
    'LV. 03',
    '低度威胁',
    2,
    '枯黄的田埂围着几间塌了半边的农舍，院里的果树还挂着没人摘的果子。',
    0.16,
    'low',
    { fruit: 40, melee: 35, food: 10, medicine: 5, drink: 10 },
    { fruit: 20, food: 30, drink: 20, medicine: 15, melee: 15 },
    { 普通: 66, 稀有: 34 },
    '水果为主，近战武器只出普通 / 稀有',
  ),
  map(
    'mountain-camp',
    '露营山区',
    'LV. 04',
    '低度威胁',
    2,
    '山路尽头散着一片撕破的帐篷，篝火只剩一圈黑灰，空气里是湿木头和霉味。',
    0.12,
    'low',
    { food: 30, fruit: 25, drink: 20, medicine: 10, melee: 15 },
    { food: 30, drink: 30, fruit: 15, medicine: 15, melee: 10 },
    { 普通: 65, 稀有: 35 },
    '食物、饮品与水果均衡，武器品质普通 / 稀有',
  ),
  map(
    'suburb-market',
    '郊区卖场',
    'LV. 05',
    '中度威胁',
    3,
    '仓储货架倒了一排，推车横在过道中央，收银台后面还留着半截没吃完的午饭。',
    0.24,
    'midLow',
    { food: 25, drink: 25, fruit: 10, medicine: 15, melee: 15, ranged: 10 },
    { food: 30, drink: 30, medicine: 15, melee: 15, ranged: 10 },
    { 普通: 55, 稀有: 35, 精良: 10 },
    '生活物资齐全，偶尔出精良武器',
  ),
  map(
    'core-district',
    '核心商圈',
    'LV. 06',
    '中度威胁',
    3,
    '玻璃幕墙碎成一片，商场中庭的回声里混着脚步声，柜台后偶尔闪过一截灰白的手。',
    0.3,
    'mid',
    { food: 15, drink: 15, medicine: 10, fruit: 10, melee: 20, ranged: 30 },
    { food: 20, drink: 20, medicine: 15, melee: 20, ranged: 25 },
    { 普通: 40, 稀有: 30, 精良: 20, 史诗: 10 },
    '武器掉落占比高，可出史诗',
  ),
  map(
    'public-hospital',
    '公立医院',
    'LV. 07',
    '高度威胁',
    4,
    '走廊里的应急灯还亮着，病床横在门口，消毒水味压不住更深处的腐臭。',
    0.38,
    'high',
    { medicine: 55, food: 15, drink: 15, fruit: 10, melee: 5 },
    { medicine: 50, food: 15, drink: 15, melee: 10, ranged: 10 },
    { 普通: 30, 稀有: 30, 精良: 25, 史诗: 15 },
    '药品绝对主场，武器品质偏高',
  ),
  map(
    'abandoned-police',
    '荒废警局',
    'LV. 08',
    '高度威胁',
    4,
    '铁门半开着，证物室的封条断在地上，枪柜被撬开，地上散着几枚空弹壳。',
    0.42,
    'high',
    { ranged: 35, melee: 30, medicine: 15, food: 10, drink: 10 },
    { ranged: 35, melee: 30, medicine: 15, food: 10, drink: 10 },
    { 普通: 25, 稀有: 30, 精良: 25, 史诗: 17, 传说: 3 },
    '远程与近战武器双高，极小概率传说',
  ),
  map(
    'mountain-barracks',
    '山地军营',
    'LV. 09',
    '高度威胁',
    4,
    '铁丝网塌了一段，岗亭里没有人，弹药箱被拖到操场中央，盖子敞着。',
    0.46,
    'high',
    { ranged: 40, medicine: 20, food: 20, melee: 10, drink: 10 },
    { ranged: 40, medicine: 20, food: 20, melee: 10, drink: 10 },
    { 普通: 20, 稀有: 25, 精良: 28, 史诗: 22, 传说: 5 },
    '远程武器为主，精良 / 史诗占比高',
  ),
  map(
    'x-lab',
    'X研究所',
    'LV. 10',
    '绝对禁区',
    5,
    '应急灯忽明忽暗，实验舱的玻璃上全是抓痕，培养槽里还泡着不该活着的东西。',
    0.54,
    'extreme',
    { medicine: 30, ranged: 30, melee: 20, fruit: 10, drink: 5, food: 5 },
    { medicine: 30, ranged: 30, melee: 20, food: 10, drink: 10 },
    { 普通: 10, 稀有: 21, 精良: 35, 史诗: 25, 传说: 8, 神话: 1 },
    '药品与武器混合，可出神话',
  ),
  map(
    'spaceport',
    '航天基地',
    'LV. 11',
    '绝对禁区',
    5,
    '发射塔还立着，箭体上的编号被风沙磨淡，控制室的门后传来指甲刮擦声。',
    0.6,
    'hell',
    { ranged: 35, medicine: 25, melee: 25, food: 5, drink: 5, fruit: 5 },
    { ranged: 35, medicine: 25, melee: 25, food: 10, drink: 5 },
    { 普通: 5, 稀有: 15, 精良: 30, 史诗: 35, 传说: 12, 神话: 3 },
    '全图最高品质，神话武器占比最高',
  ),
  map(
    'long-beach-harbor',
    '长滩海港',
    'LV. 12',
    '绝对禁区',
    5,
    '防波堤断成几截，搁浅的货轮倾在浅滩上，集装箱门半开，里面传出海水也盖不住的声音。',
    0.68,
    'harbor',
    { food: 20, drink: 20, medicine: 10, ranged: 25, melee: 15, fruit: 10 },
    { food: 20, drink: 25, medicine: 15, ranged: 20, melee: 15, fruit: 5 },
    { 普通: 5, 稀有: 15, 精良: 30, 史诗: 30, 传说: 15, 神话: 5 },
    '海货与饮品充足，远程武器占比高，可出神话',
  ),
  map(
    'biochemical-nest',
    '生化巢穴',
    'LV. 13',
    '绝对禁区',
    5,
    '地下实验室的闸门早已失效，培养槽一列列裂开，地面覆着一层缓慢起伏的菌毯。',
    0.75,
    'nest',
    { medicine: 35, ranged: 25, melee: 20, food: 5, drink: 5, fruit: 10 },
    { medicine: 40, ranged: 25, melee: 15, food: 10, drink: 10 },
    { 稀有: 15, 精良: 28, 史诗: 32, 传说: 17, 神话: 8 },
    '药品与高品阶武器集中，神话概率最高，感染风险极高',
  ),
]

export const FIELD_MAP_BY_ID = Object.fromEntries(FIELD_MAPS.map((item) => [item.id, item]))

/** 长滩海港·巨型邮轮：杀害船长的十轮死斗 */
export const HARBOR_MUTINY = {
  mapId: 'long-beach-harbor',
  crewCount: 9,
  crewName: '船员死士',
  crewImage: '/image/主角与NPC立绘/船员死士.webp',
  crewDescription:
    '船员们把舷梯堵死，手里握着拆下来的消防斧和撬棍。他们已经不打算让船离开。',
  crewHpMin: 150,
  crewHpMax: 200,
  crewAttackMin: 20,
  crewAttackMax: 30,
  captainId: 'alex',
  finale: '油轮沉没',
  banDays: 365,
  banMapIds: ['ruined-city', 'dawn-post', 'utopia-city'],
  startLine: '你拔枪时，舷梯两侧的船员同时站了起来。没有人说话，但每个人都堵住了退路。',
  captainDeathLine:
    '亚历克斯靠在驾驶台上，舱单从指间滑落。船体深处传来第一声闷响——有人已经点燃了炸药。',
}

export function fieldMapById(id) {
  return FIELD_MAP_BY_ID[id] ?? null
}

function pickWeighted(weights) {
  const entries = Object.entries(weights ?? {}).filter(([, weight]) => weight > 0)
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  if (!total) return null
  let roll = Math.random() * total
  for (const [key, weight] of entries) {
    roll -= weight
    if (roll < 0) return key
  }
  return entries[entries.length - 1][0]
}

function pickItemFromCategory(category, tier) {
  const pool = ITEM_POOLS[category] ?? []
  if (!pool.length) return null
  if (category === 'melee' || category === 'ranged') {
    const tierPool = pool.filter((item) => item.tier === tier)
    return tierPool[Math.floor(Math.random() * tierPool.length)] ?? pool[Math.floor(Math.random() * pool.length)]
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

/** 从一张权重表里抽一件物品，返回 { itemId, category, tier } */
export function pickLootFromTable(table, rarityWeights) {
  const category = pickWeighted(table)
  if (!category) return null
  const isWeapon = category === 'melee' || category === 'ranged'
  const tier = isWeapon ? pickWeighted(rarityWeights) : null
  const item = pickItemFromCategory(category, tier)
  if (!item) return null
  return { itemId: item.id, category, tier: item.tier ?? null, name: item.name }
}

/** 地图探索掉落：按地图类别权重与品质权重抽取 */
export function pickFieldLoot(mapId) {
  const mapDef = fieldMapById(mapId)
  if (!mapDef) return null
  return pickLootFromTable(mapDef.lootTable, mapDef.rarityWeights)
}

/** 丧尸击杀掉落：55% 概率，按地图的丧尸掉落表抽取 */
export function pickZombieLoot(mapId) {
  if (Math.random() >= ZOMBIE_LOOT_DROP_RATE) return null
  const mapDef = fieldMapById(mapId)
  if (!mapDef) return null
  return pickLootFromTable(mapDef.zombieLoot, mapDef.rarityWeights)
}

export function lootCategoryText(table) {
  const entries = Object.entries(table ?? {})
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
  return entries.map(([key]) => CATEGORY_LABELS[key] ?? key).join(' / ')
}

export function rarityText(weights) {
  return Object.entries(weights ?? {})
    .filter(([, weight]) => weight > 0)
    .map(([tier]) => tier)
    .join(' / ')
}

/* ===== 地图专属互动 ===== */

/** 废弃村庄·果园采摘：随机 1 种水果 ×9，冷却 5 天 */
export const ORCHARD = {
  mapId: 'abandoned-village',
  cooldownKey: 'village-orchard',
  cooldownDays: 5,
  quantity: 9,
  turns: 1,
}

/** 腐烂种子隐藏线：拾种 → 育苗 → 移栽 */
export const ROTTEN_SEED = {
  itemId: 'rotten-seed',
  sproutFruits: 3,
  sproutTurns: 2,
  plantFruits: 9,
  plantTurns: 3,
  finale: '生机',
}

/** 露营山区·奇怪烧烤：每日一次，参考一代服务区餐厅 */
export const STRANGE_BARBECUE = {
  mapId: 'mountain-camp',
  cooldownKey: 'camp-barbecue',
  cooldownDays: 1,
  turns: 1,
  effects: { hunger: 5, thirst: 5, stamina: -5, infection: 10 },
}

/** 露营山区·冷面阿三：三段物资投喂后决定是否接受邀请 */
export const MA_SAN = {
  mapId: 'mountain-camp',
  id: 'ma-san',
  name: '冷面阿三',
  rewardItemId: 'akm',
  beerId: 'white-beer',
  beerCount: 3,
  fruitCount: 3,
  spiritCount: 5,
  spiritIds: ['brandy', 'vodka', 'gin', 'rum', 'tequila', 'whiskey'],
  intro: '烧烤摊后面站着个系围裙的男人，刀口在砧板上一下一下地剁。',
  lockedLine: '他连眼皮都没抬：「先吃一串，再说别的。」',
  askBeerLine: '他朝你脚边努了努嘴：「三罐白威啤酒，冰的。」',
  askFruitLine: '他收下酒，刀口没停：「三份水果，别拿烂的糊弄我。」',
  askSpiritLine: '他吐掉果核：「五瓶烈酒。度数越高越好。」',
  inviteLine: '阿三把刀放下，围裙下摆擦了擦手：「后厨还有一锅好东西。进来尝尝？」',
  killedLine: '砧板上的刀已经卷了刃，烧烤摊不会再开张。',
  acceptReason:
    '阿三把最后一勺汤盛进你碗里，笑着说，这道菜要趁热。\n\n你尝不出肉是什么做的，只觉得眼皮越来越沉。\n\n灶上的火还亮着，铁锅咕嘟咕嘟，像是有什么东西还在动。',
  enemy: NPCS.maSan,
}

/** 背包里的任意水果计数前的判定 */
export function isFruitItem(itemId) {
  return Boolean(ITEMS[itemId]?.fruit)
}

/** 是否为阿三认的烈酒 */
export function isSpiritItem(itemId) {
  return MA_SAN.spiritIds.includes(itemId)
}

/** 山地军营·马斐：连续十二道委托，最后一道是背叛 */
export const MAFEI = {
  mapId: 'mountain-barracks',
  id: 'mafei',
  name: '马斐',
  explosiveItemId: 'high-explosive',
  craftTurns: 16,
  intro:
    '营房门口坐着个擦枪的男人，脚边堆着一排空弹壳。他说话时从不看你的眼睛，只把枪口慢慢抬高一点。',
  killedLine: '马斐的营房空了。擦枪布还搭在椅背上，枪油没干。',
  whisperLine:
    '「你知道他们背着你都干了什么吗？」他的声音压得很低，「我不是要你信我，我是要你自己去看。」',
  craftLine: '「炸药我会配。」他拍了拍脚边的铁盒，「按我的方子，16 个回合出一块。」',
  betrayalReason:
    '马斐把枪轻轻放在桌上，枪口对着你。「名单上最后一个人，」他说，「是你。」\n\n你还没来得及站起来，枪声就在营房里炸开。铁皮屋顶上落下一层薄灰，慢悠悠地飘在你们之间。\n\n他蹲下来，用拇指把你的名字划掉，补写在名单最下面。',
}

/** 郊区卖场·人鱼公主：四种饮品分四段愈合 */
export const MERMAID = {
  mapId: 'suburb-market',
  stages: [
    { itemId: 'mineral-water', count: 8 },
    { itemId: 'milk', count: 10 },
    { itemId: 'functional-drink', count: 20 },
    { itemId: 'electrolyte-water', count: 30 },
  ],
  turns: 1,
  rewardItemId: 'trident',
  finale: '人鱼传说',
  intro: '水族箱的玻璃碎了一角，她蜷在浅水里，鱼尾上的伤口已经发白。',
  healedLine: '她已经不在这里了。水族箱底只留下一点盐霜，和一道被水拖长的痕。',
  lines: [
    '你把矿泉水一瓶瓶拧开，倒进她身下的水槽。她终于抬起头，看了你很久。',
    '牛奶见底的时候，她伤口边缘的颜色淡了一些。她低声说，还差一点。',
    '功能饮料让她撑起了半个身子。她的手指搭在玻璃上，像在数你留下的东西。',
    '最后三十瓶电解质水放下时，她的鱼尾已经能拍起水花。',
  ],
  rewardLine:
    '她从水雾里抬起手，三叉戟-海歌浮出水面，落进你掌心。\n\n「这是我母亲留下的东西。现在它归你了。」',
}

/** 核心商圈·半感染者嫣然：发现后 30 天内交 5 支抗感染针 */
export const YANRAN = {
  mapId: 'core-district',
  deadlineDays: 30,
  serumId: 'anti-infection-shot',
  serumCount: 5,
  enemy: NPCS.yanran,
  intro: '她靠在商场中庭的柱子后面，半张脸埋在围巾里。听见脚步，她抬起了眼。',
  rescuedLine:
    '五支抗感染针推下去，她剧烈地咳了几声，溃烂的地方开始慢慢收口。\n\n「我叫嫣然。」她抓住你的袖子，「你要是不嫌弃，我跟你走。我能帮你找东西。」',
  lostLine: '太迟了。她的眼白已经泛黄，喉咙里只剩下不像人的气音。',
  killedLine: '她终于安静下来。你认不出那张脸了，但还是替她把眼睛合上。',
}

/** 核心商圈·地下车库：撬门 → 车钥匙 → 10 桶汽油 */
export const GARAGE = {
  mapId: 'core-district',
  requiresFlag: 'yanranRescued',
  crowbarId: 'crowbar',
  carKeyId: 'car-key',
  gasolineId: 'gasoline',
  gasolineCount: 10,
  keyChance: 0.45,
  finale: '私奔',
  lockedLine: '卷帘门从里面锁死了。你先得认识一个愿意带你走的人。',
  intro: '商场负一层的卷帘门锈死了一半，门后是几排积灰的车位。',
  departedLine: '你们已经走了。车位空出来一个，卷帘门还半开着。',
}

/** 公立医院·饥饿丧尸露露：一次交 30 个任意罐头 */
export const LULU = {
  mapId: 'public-hospital',
  cannedCount: 30,
  cannedIds: [
    'canned-beans',
    'canned-meat',
    'canned-fish',
    'canned-fruit',
    'pickled-veg-can',
  ],
  intro:
    '护士站后面蹲着一个瘦得脱了形的人影，白大褂上全是干涸的褐色。她没有扑上来，只盯着你背包的方向。',
  rescuedLine:
    '最后一个罐头放下去的时候，她终于不再盯着你的背包了。\n\n她跟着你走出医院，一路没有说话。回到安全屋，她指了指自己：「露露。」',
}

/** 伙伴：每日收获与战斗加成 */
export const COMPANIONS = {
  yanran: {
    id: 'yanran',
    name: '嫣然',
    harvestKey: 'harvest-yanran',
    cooldownDays: 1,
    items: 2,
    assistRate: 0.3,
    assistDamage: 20,
  },
  lulu: {
    id: 'lulu',
    name: '露露',
    harvestKey: 'harvest-lulu',
    cooldownDays: 1,
    items: 1,
    healAfterBattle: 20,
  },
}

/** X研究所·陈博士：血清交易 + 三段火箭维修任务 */
export const DOCTOR = {
  mapId: 'x-lab',
  serumId: 'anti-infection-shot',
  serumCount: 20,
  rewardItemId: 'm700',
  generatorId: 'small-nuclear-generator',
  energyId: 'pure-energy',
  energyCount: 15,
  energyCooldownKey: 'x-lab-energy-well',
  energyCooldownDays: 1,
  supply: { medicine: 10, food: 10, drink: 10 },
  badges: ['power-badge', 'fuel-badge', 'supply-badge'],
  intro:
    '一个戴厚眼镜的中年男人坐在培养槽之间，白大褂下摆烧焦了一角。他听见脚步，先护住了手里的试管。',
  tradedLine:
    '陈博士把血清一支支码进恒温箱，手指一直在抖。「够了，终于够了。」他把一把 M700 推过来，「这是我最后能拿得出的东西。」',
  needPuppetLine: '「发射中心被一具傀儡堵住了。」他说，「先把它清掉，我才能下去接线。」',
  quest1Line:
    '「发电机的核心还能转。」他绕着那台机组走了两圈，「把它的铭牌给我，动力这一环就算过了。」',
  quest2Line:
    '「能源井一天只能抽一份。」他盯着仪表，「十五份，一份都不能少。急不得。」',
  quest3Line:
    '「医疗十份、食物十份、饮品十份。」他把清单塞给你，「谁坐上去都得活下来。」',
  readyLine:
    '「三枚徽章都在了。」陈博士摘下眼镜擦了擦，「火箭随时可以发射。去航天基地吧，最后一步不在我这里。」',
  fullLine: '你的背包塞满了。陈博士没有催你，只把东西先放回了台面。',
}

/** 航天基地·巨型丧尸傀儡：击败后掉落小核能发电机 */
export const GIANT_PUPPET = {
  mapId: 'spaceport',
  rewardItemId: 'small-nuclear-generator',
  intro:
    '发射中心的大门被一具巨大的身影堵住了。它的四肢焊在粗糙的金属框架上，管线里还亮着暗红色的光。',
  victoryLine:
    '傀儡跪下去的时候，金属框架一节节散开。你在它胸腔里找到一台还在运转的小核能发电机。',
  fleeLine: '你退出了发射中心。身后的金属拖地声停在门口，没有追出来。',
  enemy: NPCS.giantPuppet,
}

/** 航天基地·发射中心：三枚徽章修好火箭后的四种选择 */
export const ROCKET = {
  mapId: 'spaceport',
  badgeIds: ['power-badge', 'fuel-badge', 'supply-badge'],
  companionFlags: ['yanranRescued', 'luluRescued'],
  finaleAll: '希望的火种',
  finaleSolo: '飞向太空',
  finaleSend: '留下来吧',
  intro:
    '火箭立在发射架上，箭体被风沙磨得发白。控制室的屏幕还亮着，像一颗没有闭上的眼睛。',
  lockedLine: '火箭的推进系统还是冷的。陈博士说，得先把三枚发射徽章凑齐。',
  repairedLine:
    '所有指示灯都转成了绿色。倒计时装置安静地等在那里，等一个人做最后决定。',
  stayedLine: '你没有按下发射键。发射塔的灯还亮着，火箭明天也还会在这里。',
}

/** 郊区卖场的「游戏开发者」：一次性救济与背包扩容 */
export const DEV_SHOP = {
  mapId: 'suburb-market',
  noviceCoins: 5,
  noviceDawnCoins: 5,
  noviceItems: [
    { id: 'panacea', qty: 5 },
    { id: 'anti-infection-shot', qty: 5 },
    { id: 'canned-beans', qty: 20 },
    { id: 'cranberry', qty: 20 },
    { id: 'dagger', qty: 1 },
    { id: 'glock', qty: 1 },
  ],
  knightItems: [
    { id: 'badge-knight', qty: 1 },
    { id: 'brandy', qty: 10 },
  ],
  healingItems: [
    { id: 'bandage', qty: 10 },
    { id: 'painkiller', qty: 10 },
    { id: 'tourniquet', qty: 10 },
  ],
  candyItems: [
    { id: 'dev-candy', qty: 10 },
  ],
  duel: {
    npcId: 'game-developer',
    rewardItemId: 'crusader-cross-sword',
    doneFlag: 'devDuelWon',
  },
  expandSteps: 10,
  expandLimit: 200,
}

/** 是否为露露认的罐头 */
export function isCannedItem(itemId) {
  return LULU.cannedIds.includes(itemId)
}

/** 伙伴收获：嫣然抽 2 件食物/饮品/水果，露露抽 1 件药品 */
export function pickCompanionLoot(partnerId) {
  const categories = partnerId === 'lulu' ? ['medicine'] : ['food', 'drink', 'fruit']
  const count = partnerId === 'lulu' ? COMPANIONS.lulu.items : COMPANIONS.yanran.items
  const picks = []
  for (let i = 0; i < count; i += 1) {
    const category = categories[Math.floor(Math.random() * categories.length)]
    const pool = ITEM_POOLS[category] ?? []
    if (!pool.length) continue
    picks.push(pool[Math.floor(Math.random() * pool.length)].id)
  }
  return picks
}
