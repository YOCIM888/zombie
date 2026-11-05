// 天赋数据：近战、远程、斗兽拳头三条成长线
export const TALENTS = {
  melee: {
    key: 'melee',
    label: '近战天赋',
    primary: 'combo',
    stat: '近战连击率',
    maxLevel: 3,
    titles: ['拼杀高手', '拼杀大师', '拼杀宗师'],
    effects: [{ combo: 0.05 }, { combo: 0.1 }, { combo: 0.15 }],
  },
  ranged: {
    key: 'ranged',
    label: '远程天赋',
    primary: 'crit',
    stat: '远程暴击率',
    maxLevel: 3,
    titles: ['潜力射手', '精确射手', '神枪射手'],
    effects: [{ crit: 0.05 }, { crit: 0.1 }, { crit: 0.15 }],
  },
  arena: {
    key: 'arena',
    label: '拳头天赋',
    primary: 'combo',
    stat: '拳头连击率',
    maxLevel: 4,
    titles: ['角斗高手', '角斗大师', '角斗宗师', '角斗之王'],
    effects: [
      { combo: 0.3, damage: 5 },
      { combo: 0.4, damage: 10 },
      { combo: 0.5, damage: 15 },
      { combo: 0.6, damage: 20 },
    ],
  },
  corridor: {
    key: 'corridor',
    label: '闪避天赋',
    primary: 'dodge',
    stat: '远程闪避率',
    maxLevel: 4,
    titles: ['落叶身法', '迅捷身法', '疾风身法', '鬼影身法'],
    effects: [{ dodge: 0.05 }, { dodge: 0.1 }, { dodge: 0.15 }, { dodge: 0.2 }],
  },
  draw: {
    key: 'draw',
    label: '拔刀斩天赋',
    primary: 'cutChance',
    stat: '切割概率',
    maxLevel: 4,
    titles: ['拔刀高手', '拔刀大师', '拔刀宗师', '拔刀战神'],
    effects: [
      { cutChance: 0.1 },
      { cutChance: 0.15 },
      { cutChance: 0.2 },
      { cutChance: 0.25 },
    ],
  },
  sword: {
    key: 'sword',
    label: '致命一击天赋',
    primary: 'executeChance',
    stat: '秒杀概率',
    maxLevel: 4,
    titles: ['剑道高手', '剑道大师', '剑道宗师', '剑道王者'],
    effects: [
      { executeChance: 0.008 },
      { executeChance: 0.012 },
      { executeChance: 0.02 },
      { executeChance: 0.03 },
    ],
  },
  sniper: {
    key: 'sniper',
    label: '贯穿天赋',
    primary: 'pierceChance',
    stat: '贯穿概率',
    maxLevel: 4,
    titles: ['狙击高手', '狙击大师', '狙击宗师', '狙击王者'],
    effects: [
      { pierceChance: 0.05 },
      { pierceChance: 0.1 },
      { pierceChance: 0.15 },
      { pierceChance: 0.2 },
    ],
  },
  block: {
    key: 'block',
    label: '格挡天赋',
    primary: 'blockReduction',
    stat: '格挡减伤',
    maxLevel: 4,
    titles: ['格挡高手', '格挡大师', '格挡宗师', '格挡战神'],
    effects: [
      { blockChance: 0.5, blockReduction: 0.2 },
      { blockChance: 0.5, blockReduction: 0.3 },
      { blockChance: 0.5, blockReduction: 0.4 },
      { blockChance: 0.5, blockReduction: 0.5 },
    ],
  },
  pistol: {
    key: 'pistol',
    label: '手枪天赋',
    primary: 'crit',
    stat: '手枪暴击率',
    maxLevel: 4,
    titles: ['手枪高手', '手枪大师', '手枪宗师', '手枪战神'],
    effects: [
      { crit: 0.05, critDamage: 0.3 },
      { crit: 0.1, critDamage: 0.5 },
      { crit: 0.15, critDamage: 0.8 },
      { crit: 0.2, critDamage: 1 },
    ],
  },
  spray: {
    key: 'spray',
    label: '泼射天赋',
    primary: 'sprayChance',
    stat: '泼射概率',
    maxLevel: 4,
    titles: ['泼射高手', '泼射大师', '泼射宗师', '泼射战神'],
    effects: [
      { sprayChance: 0.1 },
      { sprayChance: 0.15 },
      { sprayChance: 0.2 },
      { sprayChance: 0.25 },
    ],
  },
}

export const TALENT_ACTIVE_LIMIT = 2

export const TALENT_EFFECT_LABELS = {
  combo: '连击率',
  crit: '暴击率',
  damage: '伤害',
  dodge: '远程闪避率',
  cutChance: '切割概率',
  executeChance: '秒杀概率',
  pierceChance: '贯穿概率',
  blockChance: '格挡概率',
  blockReduction: '格挡减伤',
  critDamage: '暴击伤害',
  sprayChance: '泼射概率',
}

/** 乌托邦六种训练：对应天赋、可选武器、消耗与每日次数 */
export const UTOPIA_TRAININGS = [
  {
    kind: 'draw',
    name: '拔刀训练',
    weaponSlot: 'melee',
    costType: 'durability',
    weaponIds: ['short-katana', 'katana-dusk', 'katana-raikiri'],
    weaponText: '武士刀-短 / 武士刀-黄昏 / 武士刀-雷切',
    desc: '反复练拔刀、收刀与第一刀的落点。',
  },
  {
    kind: 'sword',
    name: '剑术训练',
    weaponSlot: 'melee',
    costType: 'durability',
    weaponIds: [
      'noble-shortsword',
      'keel-blade',
      'crusader-cross-sword',
      'longsword-rose-dark',
      'longsword-frost',
      'longsword-silver-rose',
    ],
    weaponText: '贵族短剑 / 龙骨剑 / 十字剑-圣战 / 长剑-暗夜玫瑰 / 长剑-寒芒 / 长剑-银色玫瑰',
    desc: '练的是距离、节奏和那一瞬间的致命空门。',
  },
  {
    kind: 'sniper',
    name: '狙击训练',
    weaponSlot: 'ranged',
    costType: 'cleanliness',
    weaponIds: ['m700', 'svd', 't3x', 'awm', 'm82a1', 'daylight-sniper'],
    weaponText: 'M700 / SVD / T3X / AWM / M82A1 / 流光狙击-白昼',
    desc: '呼吸、准星与扳机，一遍遍压到同一条线上。',
  },
  {
    kind: 'block',
    name: '格挡训练',
    weaponSlot: 'melee',
    costType: 'durability',
    weaponIds: ['frying-pan', 'scarlet-greatsword', 'frost-greatsword'],
    weaponText: '平底锅 / 猩红巨剑 / 寒霜大剑-冰晶',
    desc: '把兵器横在身前，学会在冲击到来时卸掉力道。',
  },
  {
    kind: 'pistol',
    name: '手枪训练',
    weaponSlot: 'ranged',
    costType: 'cleanliness',
    weaponIds: [
      'glock',
      'pm',
      'usp',
      'cz75',
      'luger-08',
      'm1911',
      'fn57',
      'gp100',
      'desert-eagle',
      'blood-raven',
    ],
    weaponText: 'Glock / PM / USP / CZ75 / 鲁格08 / M1911 / FN57 / GP100 / 沙漠之鹰 / 爆能手枪-血鸦',
    desc: '拔枪、指向、击发，把手枪变成手臂的延伸。',
  },
  {
    kind: 'spray',
    name: '泼射训练',
    weaponSlot: 'ranged',
    costType: 'cleanliness',
    weaponIds: ['mac10', 'uzi', 'mp5', 'ump45', 'victor'],
    weaponText: 'MAC10 / UZI / MP5 / UMP45 / Victor',
    desc: '压住枪口，把一梭子子弹泼成一片火线。',
  },
]

export const UTOPIA_TRAINING_BY_KIND = Object.fromEntries(
  UTOPIA_TRAININGS.map((training) => [training.kind, training]),
)

/** 某等级的天赋效果；0 级或超界时返回空对象 */
export function talentEffects(kind, level) {
  const talent = TALENTS[kind]
  if (!talent || level <= 0) return {}
  const index = Math.max(0, Math.min(talent.maxLevel, Math.round(level)) - 1)
  return talent.effects[index] ?? {}
}

/** 某等级的主属性加成数值；0 级为 0 */
export function talentBonus(kind, level) {
  const talent = TALENTS[kind]
  if (!talent) return 0
  return Number(talentEffects(kind, level)[talent.primary]) || 0
}

/** 某等级的天赋称号；0 级返回空字符串 */
export function talentTitle(kind, level) {
  const talent = TALENTS[kind]
  if (!talent || level <= 0) return ''
  return talent.titles[Math.min(talent.titles.length, Math.round(level)) - 1] ?? ''
}

export function talentMaxLevel(kind) {
  return TALENTS[kind]?.maxLevel ?? 0
}
