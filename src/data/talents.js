// 天赋数据：近战、远程、斗兽拳头三条成长线
import { SICKLE_WEAPON_IDS } from './weapons'

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
  slash: {
    key: 'slash',
    label: '挥砍天赋',
    primary: 'damage',
    stat: '近战武器伤害',
    maxLevel: 3,
    titles: ['挥砍高手', '挥砍大师', '挥砍宗师'],
    effects: [{ damage: 5 }, { damage: 10 }, { damage: 15 }],
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
  ranged: {
    key: 'ranged',
    label: '远程天赋',
    primary: 'crit',
    stat: '远程暴击率',
    maxLevel: 3,
    titles: ['潜力射手', '精确射手', '神枪射手'],
    effects: [{ crit: 0.05 }, { crit: 0.1 }, { crit: 0.15 }],
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
      { pierceChance: 0.1 },
      { pierceChance: 0.2 },
      { pierceChance: 0.3 },
      { pierceChance: 0.4 },
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
      { sprayChance: 0.10 },
      { sprayChance: 0.20 },
      { sprayChance: 0.30 },
      { sprayChance: 0.40 },
    ],
  },
  assault: {
    key: 'assault',
    label: '突击天赋',
    primary: 'crit',
    stat: '步枪暴击率',
    maxLevel: 4,
    titles: ['突击高手', '突击大师', '突击宗师', '突击王者'],
    effects: [
      { crit: 0.05, critDamage: 0.05, damage: 5 },
      { crit: 0.1, critDamage: 0.1, damage: 10 },
      { crit: 0.15, critDamage: 0.15, damage: 15 },
      { crit: 0.2, critDamage: 0.2, damage: 20 },
    ],
  },
  blunt: {
    key: 'blunt',
    label: '碎骨天赋',
    primary: 'boneChance',
    stat: '碎骨概率',
    maxLevel: 4,
    titles: ['破颅高手', '破颅大师', '破颅宗师', '破颅战神'],
    effects: [
      { boneChance: 0.1 },
      { boneChance: 0.15 },
      { boneChance: 0.2 },
      { boneChance: 0.25 },
    ],
  },
  assassinate: {
    key: 'assassinate',
    label: '偷袭天赋',
    primary: 'backstabChance',
    stat: '背刺概率',
    maxLevel: 4,
    titles: ['偷袭高手', '偷袭大师', '偷袭宗师', '偷袭王者'],
    effects: [
      { backstabChance: 0.2 },
      { backstabChance: 0.3 },
      { backstabChance: 0.4 },
      { backstabChance: 0.5 },
    ],
  },
  sweep: {
    key: 'sweep',
    label: '横扫千军',
    primary: 'sweepDamage',
    stat: '非连击伤害',
    maxLevel: 4,
    titles: ['横扫高手', '横扫大师', '横扫宗师', '横扫王者'],
    effects: [
      { sweepDamage: 0.1 },
      { sweepDamage: 0.15 },
      { sweepDamage: 0.2 },
      { sweepDamage: 0.3 },
    ],
  },
  polearm: {
    key: 'polearm',
    label: '单枪匹马',
    primary: 'critMult',
    stat: '暴击伤害倍率',
    maxLevel: 4,
    titles: ['单枪高手', '单枪大师', '单枪宗师', '单枪王者'],
    effects: [
      { critDurability: 5, critMult: 2 },
      { critDurability: 4, critMult: 2 },
      { critDurability: 3, critMult: 2 },
      { critDurability: 2, critMult: 2 },
    ],
  },
  insight: {
    key: 'insight',
    label: '要害洞察',
    primary: 'insightCrit',
    stat: '每层暴击伤害',
    maxLevel: 4,
    maxStacks: 5,
    titles: ['洞察高手', '洞察大师', '洞察宗师', '洞察王者'],
    effects: [
      { insightCrit: 0.1 },
      { insightCrit: 0.2 },
      { insightCrit: 0.3 },
      { insightCrit: 0.4 },
    ],
  },
  bulldozer: {
    key: 'bulldozer',
    label: '推土机',
    primary: 'dodgeSegments',
    stat: '闪避追加段',
    maxLevel: 4,
    titles: ['推土高手', '推土大师', '推土宗师', '推土王者'],
    effects: [
      { dodgeSegments: [0.2, 0.1] },
      { dodgeSegments: [0.3, 0.2, 0.1] },
      // L3 原始文案只给了 40% / 20% / 10% 三个数值，这里按四段递减补全 40% / 30% / 20% / 10%
      { dodgeSegments: [0.4, 0.3, 0.2, 0.1] },
      { dodgeSegments: [0.5, 0.4, 0.3, 0.2, 0.1] },
    ],
  },
  harvest: {
    key: 'harvest',
    label: '收割天赋',
    primary: 'critDamage',
    stat: '镰刀暴击伤害',
    maxLevel: 4,
    titles: ['收割高手', '收割大师', '收割宗师', '收割战神'],
    // 爆伤按现有天赋惯例（手枪 / 突击）取倍率绝对值 +0.1；回血为固定点数
    effects: [
      { critDamage: 0.1, harvestChance: 0.5, harvestHeal: 2 },
      { critDamage: 0.2, harvestChance: 0.5, harvestHeal: 5 },
      { critDamage: 0.3, harvestChance: 0.5, harvestHeal: 8 },
      { critDamage: 0.4, harvestChance: 0.5, harvestHeal: 10 },
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
  boneChance: '碎骨概率',
  backstabChance: '背刺概率',
  sweepDamage: '非连击伤害',
  critMult: '暴击伤害倍率',
  critDurability: '暴击耐久消耗',
  insightCrit: '洞察每层爆伤',
  dodgeSegments: '闪避追加段',
  harvestChance: '收割回血概率',
  harvestHeal: '收割回血',
}

/** 乌托邦专项训练：对应天赋、可选武器、消耗与每日次数 */
export const UTOPIA_TRAININGS = [
  {
    kind: 'draw',
    name: '拔刀训练',
    weaponSlot: 'melee',
    costType: 'durability',
    weaponIds: ['short-katana', 'katana-dusk', 'katana-raikiri', 'tang-dao'],
    weaponText: '武士刀-短 / 武士刀-黄昏 / 武士刀-雷切 / 唐横刀',
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
      'knight-sword',
      'longsword-rose-dark',
      'longsword-frost',
      'longsword-silver-rose',
    ],
    weaponText:
      '贵族短剑 / 龙骨剑 / 十字剑-圣战 / 骑士剑 / 长剑-暗夜玫瑰 / 长剑-寒芒 / 长剑-银色玫瑰',
    desc: '练的是距离、节奏和那一瞬间的致命空门。',
  },
  {
    kind: 'blunt',
    name: '钝击训练',
    weaponSlot: 'melee',
    costType: 'durability',
    weaponIds: [
      'baseball-bat',
      'claw-hammer',
      'pipe-wrench',
      'baton',
      'crowbar',
      'royal-scepter',
      'nunchaku',
      'chainsaw',
    ],
    weaponText: '棒球棍 / 羊角锤 / 管钳 / 警棍 / 撬棍 / 皇家权杖 / 双截棍 / 油锯',
    desc: '抡圆了砸，练的是骨裂声出现的那一瞬间。',
  },
  {
    kind: 'block',
    name: '格挡训练',
    weaponSlot: 'melee',
    costType: 'durability',
    weaponIds: ['frying-pan', 'entrenching-tool', 'scarlet-greatsword', 'frost-greatsword'],
    weaponText: '平底锅 / 工兵铲 / 猩红巨剑 / 寒霜大剑-冰晶',
    desc: '把兵器横在身前，学会在冲击到来时卸掉力道。',
  },
  {
    kind: 'assassinate',
    name: '暗杀训练',
    weaponSlot: 'melee',
    costType: 'durability',
    weaponIds: [
      'fruit-knife',
      'karambit-classic',
      'triangular-bayonet',
      'knuckle-blade',
      'kukri',
      'butterfly-silver',
      'karambit-ghost',
      'spring-knife-aurora',
      'butterfly-gold',
      'kitchen-knife',
      'dagger',
      'spring-knife-monochrome',
    ],
    weaponText:
      '水果刀 / 爪刀-经典 / 三棱军刺 / 信条刀 / 廓尔喀弯刀 / 蝴蝶刀-银蝶 / 爪刀-幽灵 / 弹簧刀-极光 / 蝴蝶刀-金蝶 / 菜刀 / 战术匕首 / 弹簧刀-黑白',
    desc: '贴近、转身、收刀，练的是不惊动任何人的那一刀。',
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
    weaponIds: ['mac10', 'uzi', 'mp5', 'ump45', 'victor', 'mpx'],
    weaponText: 'MAC10 / UZI / MP5 / UMP45 / Victor / MPX',
    desc: '压住枪口，把一梭子子弹泼成一片火线。',
  },
  {
    kind: 'assault',
    name: '假人训练',
    location: 'abandoned-police',
    weaponSlot: 'ranged',
    costType: 'cleanliness',
    weaponIds: ['ar15', 'm4a1', 'akm', 'mini14', 'fal', 'aug', 'scar', 'm14', 'hk416', 'm7', 'royal-lance'],
    weaponText: 'AR15 / M4A1 / AKM / Mini14 / FAL / AUG / SCAR / M14 / HK416 / M7 / 皇家长枪',
    dailyLimit: 2,
    cost: 10,
    progressMin: 5,
    progressMax: 10,
    awayLine: '训练场在荒废警局。',
    desc: '对着树脂假人反复点射，练的是抬枪就中的那口气。',
  },
  {
    kind: 'sniper',
    name: '狙击训练',
    weaponSlot: 'ranged',
    costType: 'cleanliness',
    weaponIds: ['m700', 'svd', 't3x', 'awm', 'm82a1', 'daylight-sniper', 'mosin'],
    weaponText: 'M700 / SVD / T3X / AWM / M82A1 / 流光狙击-白昼 / 莫辛纳甘',
    desc: '呼吸、准星与扳机，一遍遍压到同一条线上。',
  },
  {
    kind: 'sweep',
    name: '横劈训练',
    weaponSlot: 'melee',
    costType: 'durability',
    weaponIds: [
      'snake-sword',
      'scimitar',
      'cleaver',
      'huan-shou-dao',
      'hand-axe',
      'fire-axe',
      'mountain-chopper',
      'might-axe',
      'kraken-blade',
    ],
    weaponText:
      '蛇刀 / 镰刀 / 弯刀 / 大砍刀 / 环首刃 / 手斧 / 消防斧 / 开山刀 / 威能战斧 / 沧龙之刃',
    desc: '只加成每轮第一记横劈（连击判定前的主伤害），连击追加段不吃加成。',
  },
  {
    kind: 'polearm',
    name: '长杆训练',
    weaponSlot: 'melee',
    costType: 'durability',
    weaponIds: ['spear', 'halberd', 'trident'],
    weaponText: '长矛 / 战戟 / 三叉戟-海歌',
    desc: '暴击时若耐久足够，消耗更多耐久换取双倍伤害；耐久不足则按普通伤害结算。',
  },
  {
    kind: 'insight',
    name: '弓弩训练',
    weaponSlot: 'ranged',
    costType: 'cleanliness',
    weaponIds: ['hunting-bow', 'compound-bow', 'crossbow', 'starfall-bow'],
    weaponText: '猎弓 / 复合弓 / 十字弩 / 天星之弓',
    desc: '每次实际开火叠 1 层洞察，最多 5 层；层数跨回合保留，暴击不会清空。',
  },
  {
    kind: 'bulldozer',
    name: '霰弹训练',
    weaponSlot: 'ranged',
    costType: 'cleanliness',
    weaponIds: ['m870', 'henry-lever', 'aa12', 'meteor-shotgun'],
    weaponText: 'M870 / 亨利杠杆 / AA12 / 机械霰弹-陨星',
    desc: '闪避成功时追加多段伤害，每段独立暴击，倍率基于当前武器攻击力。',
  },
  {
    kind: 'slash',
    name: '切磋训练',
    tab: '武艺切磋',
    location: 'dawn-post',
    weaponSlot: 'melee',
    costType: 'durability',
    weaponIds: null,
    weaponText: '任意近战武器',
    dailyLimit: 2,
    awayLine: '切磋场在曙光阵地。',
    desc: '和曙光阵地的守备队员拆招，谁的刀先乱谁就先退。',
  },
  {
    kind: 'harvest',
    name: '清理杂草',
    tab: '清理杂草',
    location: 'abandoned-village',
    weaponSlot: 'melee',
    costType: 'durability',
    // 与时间宝石吸血、盗贼公会共用同一份镰刀白名单
    weaponIds: SICKLE_WEAPON_IDS,
    weaponText: '镰刀 / 镰刀-战意 / 镰刀-恶魔 / 镰刀-晶花',
    dailyLimit: 2,
    cost: 10,
    progressMin: 5,
    progressMax: 10,
    awayLine: '杂草地在废弃村庄。',
    desc: '在废弃村庄的田埂上挥镰除草，顺手练出收割的手感。',
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

const percentText = (value) => `${Math.round((Number(value) || 0) * 1000) / 10}%`

/** 天赋效果的人读摘要；数组与倍率类效果无法用 talentBonus 表达 */
export function talentSummary(kind, level) {
  const effects = talentEffects(kind, level)
  if (!effects || Object.keys(effects).length === 0) return ''
  switch (kind) {
    case 'sweep':
      return `非连击伤害 +${percentText(effects.sweepDamage)}`
    case 'polearm':
      return `暴击伤害 ×${effects.critMult}，暴击时消耗耐久 ${effects.critDurability}`
    case 'insight':
      return `每层暴击伤害 +${percentText(effects.insightCrit)}（最多 ${TALENTS.insight.maxStacks} 层）`
    case 'bulldozer':
      return `闪避成功追加 ${(effects.dodgeSegments || []).map(percentText).join(' / ')}`
    case 'harvest':
      return `暴击伤害 +${effects.critDamage} · ${percentText(effects.harvestChance)} 概率恢复 ${effects.harvestHeal} 点生命`
    default:
      return ''
  }
}
