// 页面通用工具：DOM、格式化、品质色与折线图

export const $ = (selector) => document.querySelector(selector)
export const $$ = (selector) => [...document.querySelectorAll(selector)]

export const el = (tag, className, html) => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (html != null) node.innerHTML = html
  return node
}

export const TIERC = {
  普通: 'var(--t0)',
  稀有: 'var(--t1)',
  精良: 'var(--t2)',
  史诗: 'var(--t3)',
  传说: 'var(--t4)',
  神话: 'var(--t5)',
  限定: 'var(--t6)',
}

export const tierTag = (tier) =>
  `<span class="tier" style="background:${TIERC[tier] || '#999'}">${tier}</span>`

export const esc = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const num = (value) =>
  value == null || Number.isNaN(value) ? '—' : (Math.round(value * 10) / 10).toLocaleString('en-US')

/** 天赋效果字段的中文名：18 条天赋的全部 effect key 都必须在这里有映射 */
const STAT_LABELS = {
  combo: '连击率',
  crit: '暴击率',
  critDamage: '暴击伤害',
  damage: '伤害',
  dodge: '远程闪避率',
  cutChance: '切割概率',
  executeChance: '秒杀概率',
  pierceChance: '贯穿概率',
  blockChance: '格挡概率',
  blockReduction: '格挡减伤',
  sprayChance: '泼射概率',
  boneChance: '碎骨概率',
  backstabChance: '背刺概率',
  sweepDamage: '非连击伤害',
  critMult: '暴击伤害倍率',
  critDurability: '暴击耐久消耗',
  insightCrit: '洞察每层爆伤',
  dodgeSegments: '闪避追加段',
}

/** 百分比属性：0.05 显示为 5% */
const PERCENT_KEYS = [
  'combo',
  'crit',
  'critDamage',
  'dodge',
  'cutChance',
  'executeChance',
  'pierceChance',
  'blockChance',
  'blockReduction',
  'sprayChance',
  'boneChance',
  'backstabChance',
  'sweepDamage',
  'insightCrit',
  'dodgeSegments',
]

/** 平加数值：直接显示原值，不加百分号 */
const FLAT_KEYS = ['damage', 'critDurability']

const warnUnknown = (key) =>
  console.warn(`[FactinoTools] 天赋效果字段「${key}」缺少中文映射，已回退为「未命名效果」，请补 STAT_LABELS。`)

export function statName(key) {
  const label = STAT_LABELS[key]
  if (label) return label
  warnUnknown(key)
  return '未命名效果'
}

export const statUnit = (key) => (PERCENT_KEYS.includes(key) ? '%' : '')

const percentText = (value) => `${Math.round((Number(value) || 0) * 1000) / 10}%`

/** 天赋效果数值：百分比 0.05 -> 5%，平加数值原样，倍率 ×2，数组逐段转百分比 */
export const statValue = (key, value) => {
  if (Array.isArray(value)) {
    return PERCENT_KEYS.includes(key)
      ? value.map(percentText).join(' / ')
      : value.join(' / ')
  }
  if (FLAT_KEYS.includes(key)) return String(Math.round((Number(value) || 0) * 10) / 10)
  if (key === 'critMult') return `×${Math.round((Number(value) || 0) * 100) / 100}`
  if (PERCENT_KEYS.includes(key)) return percentText(value)
  return String(value)
}
