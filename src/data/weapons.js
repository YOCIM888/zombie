// 默认武器与远程基础面板
// 没有装备近战武器时，角色以「拳头」作战

import { REPAIR_PERCENT_PER_COIN, REPAIR_PRICE_BY_TIER, REPAIR_PRICE_FALLBACK } from './markets'

export const UNARMED = {
  id: 'unarmed',
  name: '拳头',
  category: 'melee',
  image: null,
  description: '赤手空拳。至少你还有两条胳膊。',
  stackable: false,
  maxStack: 1,
  weapon: {
    attack: 10,
    crit: 0.01,
    critDamage: 0,
    combo: 0,
    durability: Infinity,
  },
}

/** 能吃到拳头天赋的武器：空手，或三把指虎（唯一例外） */
export const FIST_TALENT_WEAPON_IDS = ['knuckle', 'knuckle-silver', 'knuckle-gold']

export function isFistTalentWeapon(equipped) {
  return !equipped || FIST_TALENT_WEAPON_IDS.includes(equipped.id)
}

// 远程槽位未装备时的基础数值
export const RANGED_BASE = {
  attack: 0,
  crit: 0,
  critDamage: 0,
  dodge: 0,
  cleanliness: 0,
}

/* ===== 清洁度机制 =====
   远程武器不需要弹药与耐久：每开一枪扣固定清洁度，清洁度越低伤害越低、卡壳概率越高。
   清洁度归零后无法开火，需要到市场做武器保养。 */
export const CLEANLINESS_MAX = 100
export const CLEANLINESS_PER_SHOT = 2
export const CLEANLINESS_LOW = 30
export const CLEANLINESS_JAM_MAX = 0.3

/* ===== 维修机制 =====
   近战耐久与远程清洁度共用同一套收费：每 20% 缺口按品质收一次费，
   一次把缺口补满。费率统一在 data/markets.js。 */

/** 某品质每 20% 缺口的保养单价 */
export function repairPriceForTier(tier) {
  return REPAIR_PRICE_BY_TIER[tier] ?? REPAIR_PRICE_FALLBACK
}

/** 按缺口计算维修费用：普通缺 60% 收 3 币，限定缺 60% 收 30 币；未损耗返回 0 */
export function repairCoinCost(current, max, tier) {
  const maxValue = Number(max)
  const currentValue = Number(current)
  if (!Number.isFinite(maxValue) || maxValue <= 0) return 0
  if (!Number.isFinite(currentValue)) return 0
  if (currentValue >= maxValue) return 0
  const gap = (maxValue - Math.max(0, currentValue)) / maxValue
  const steps = Math.max(1, Math.ceil(gap / (REPAIR_PERCENT_PER_COIN / 100)))
  return steps * repairPriceForTier(tier)
}

/** 清洁度对应的伤害倍率：100% 时 1.0，50% 时 0.75，0% 时 0.5 */
export function cleanlinessMultiplier(value) {
  const ratio = Math.max(0, Math.min(CLEANLINESS_MAX, Number(value) || 0)) / CLEANLINESS_MAX
  return 0.5 + 0.5 * ratio
}

/** 卡壳概率：清洁度低于 30 时开始出现，归零时 30% */
export function cleanlinessJamChance(value) {
  const current = Math.max(0, Math.min(CLEANLINESS_MAX, Number(value) || 0))
  if (current >= CLEANLINESS_LOW) return 0
  return ((CLEANLINESS_LOW - current) / CLEANLINESS_LOW) * CLEANLINESS_JAM_MAX
}
