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
}

export const TALENT_ACTIVE_LIMIT = 2

export const TALENT_EFFECT_LABELS = {
  combo: '连击率',
  crit: '暴击率',
  damage: '伤害',
  dodge: '远程闪避率',
}

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
