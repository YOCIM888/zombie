// 丧尸图鉴：16 种类型、技能与各地图的分布池
// 数值参考一代，并按二代 100 点生命 / 手动回合制的节奏重新缩放

function zombie(id, name, hp, attack, infection, dodge, abilities, description) {
  return {
    id,
    name,
    hp,
    attack,
    infection,
    dodge,
    abilities,
    description,
    image: `/image/丧尸立绘/${name}.webp`,
  }
}

export const ZOMBIE_TYPES = [
  zombie('wanderer', '普通游荡丧尸', 100, 12, 1, 0.05, ['infect'],
    '它曾经也是某个人。现在只剩下向前走的本能。'),
  zombie('rotten', '腐烂腐尸', 80, 18, 1, 0, ['infect'],
    '皮肉几乎挂不住骨头，靠近时能闻到熟透的腐味。'),
  zombie('crawler', '爬行尸', 55, 9, 1, 0.18, ['infect', 'trip'],
    '两条腿已经废了，它用指甲抠着地面，速度却并不慢。'),
  zombie('runner', '疾行丧尸', 75, 20, 1, 0.3, ['infect', 'screech'],
    '关节反向折着，跑起来像一具被线拽住的木偶。'),
  zombie('bloated', '肥胖臃肿尸', 220, 15, 1, 0, ['infect', 'selfDestruct'],
    '身体涨得像一只装满水的袋子，每走一步都在晃。'),
  zombie('bomber', '爆裂尸', 100, 14, 0, 0, ['explosive'],
    '腹部鼓出一层青黑色的血管，碰一下就会炸开。'),
  zombie('military', '军警丧尸', 150, 26, 1, 0.08, ['infect', 'corrode'],
    '残破的制服上还挂着编号，手指扣在早已空掉的枪套上。'),
  zombie('mother', '群居尸母', 140, 12, 0, 0, ['summon'],
    '它蹲在尸堆中央，喉咙里不断发出呼唤同类的声音。'),
  zombie('armored', '铁甲尸', 260, 18, 1, 0, ['armor', 'infect'],
    '身上焊着铁皮与护具，刀砍上去只会溅出一串火星。'),
  zombie('frost', '冰霜尸', 130, 20, 0, 0.08, ['freeze'],
    '皮肤覆着一层白霜，呼出的气在空气里凝成细碎的冰。'),
  zombie('ripper', '撕裂狂暴尸', 180, 36, 0, 0.05, ['blind', 'corrode'],
    '两条手臂的皮肉被撕开，露出不断抓挠的指骨。'),
  zombie('acid', '酸液喷射尸', 210, 20, 0, 0.05, ['acid'],
    '嘴角不断滴下淡绿色的液体，地面被蚀出一串小坑。'),
  zombie('jumper', '跳跃尸', 90, 28, 1, 0.3, ['leap', 'infect'],
    '它蜷在阴影里，膝盖弯得反常，随时会弹到你面前。'),
  zombie('tank', '巨型坦克尸', 300, 30, 0, 0, ['selfDestruct'],
    '体型大得堵住整条走廊，每一步都让地板发出呻吟。'),
  zombie('ghost', '幽灵潜行尸', 75, 24, 0, 0.45, ['cloak'],
    '它总在视野边缘，等你眨眼时，原地只剩一团灰影。'),
  zombie('impaler', '穿刺尸', 170, 32, 0, 0.1, ['impale', 'corrode'],
    '胸腔里伸出几根骨刺，尖端还挂着旧布条。'),
]

/** 曙光阵地每日清理的基础行尸：单独成种，不进入地图分布池 */
export const DAWN_ZOMBIE = zombie(
  'dawn-wanderer',
  '普通行尸',
  100,
  10,
  2,
  0,
  ['infect'],
  '它曾经也是某个人。现在只剩下向前走的本能。',
)

export const ZOMBIE_BY_ID = Object.fromEntries(
  [...ZOMBIE_TYPES, DAWN_ZOMBIE].map((item) => [item.id, item]),
)

/** 地图威胁对应的丧尸池 */
export const ZOMBIE_POOLS = {
  low: ['wanderer', 'rotten', 'crawler'],
  midLow: ['wanderer', 'rotten', 'crawler', 'bloated', 'runner', 'bomber'],
  mid: ['runner', 'bloated', 'bomber', 'military', 'mother', 'armored', 'frost'],
  high: ['military', 'mother', 'ripper', 'acid', 'armored', 'frost', 'jumper'],
  extreme: ['ripper', 'acid', 'tank', 'ghost', 'jumper', 'impaler'],
  hell: [
    'tank',
    'ghost',
    'impaler',
    'ripper',
    'acid',
    'jumper',
    'armored',
    'frost',
    'military',
    'mother',
  ],
  harbor: [
    'crawler',
    'bloated',
    'military',
    'armored',
    'jumper',
    'acid',
    'ghost',
    'ripper',
  ],
  nest: [
    'bloated',
    'mother',
    'acid',
    'ripper',
    'frost',
    'impaler',
    'ghost',
    'armored',
  ],
}

export const ZOMBIE_ABILITY_LABELS = {
  infect: '感染',
  trip: '绊倒',
  screech: '尖啸',
  selfDestruct: '死亡自爆',
  explosive: '死亡爆裂',
  corrode: '腐蚀武器',
  summon: '召唤同类',
  armor: '硬甲减伤',
  freeze: '冻缓',
  blind: '致盲',
  acid: '酸液',
  leap: '跳跃反扑',
  cloak: '潜行偷袭',
  impale: '穿刺',
}

export function zombieById(id) {
  return ZOMBIE_BY_ID[id] ?? null
}

export function zombiePool(poolKey) {
  return (ZOMBIE_POOLS[poolKey] ?? []).map(zombieById).filter(Boolean)
}

/** 从地图池里随机抽一只丧尸 */
export function pickZombie(poolKey) {
  const pool = (ZOMBIE_POOLS[poolKey] ?? []).map(zombieById).filter(Boolean)
  if (!pool.length) return zombieById('wanderer')
  return pool[Math.floor(Math.random() * pool.length)]
}
