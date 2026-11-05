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

export function statName(key) {
  return (
    {
      combo: '连击',
      crit: '暴击',
      critDamage: '爆伤',
      damage: '伤害',
      dodge: '闪避',
      cutChance: '切割率',
      executeChance: '秒杀率',
      pierceChance: '贯穿率',
      blockChance: '格挡率',
      blockReduction: '格挡减伤',
      sprayChance: '泼射率',
      boneChance: '碎骨率',
      backstabChance: '背刺率',
    }[key] || key
  )
}

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
]

export const statUnit = (key) => (PERCENT_KEYS.includes(key) ? '%' : '')

/** 天赋效果数值：百分比属性 0.05 -> 5%，平加伤害（damage）按原值显示 */
export const statValue = (key, value) =>
  key === 'damage'
    ? String(Math.round(value * 10) / 10)
    : `${Math.round(value * 1000) / 10}${statUnit(key)}`
