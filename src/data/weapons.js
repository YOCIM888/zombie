// 默认武器与远程基础面板
// 没有装备近战武器时，角色以「拳头」作战

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
   近战耐久与远程清洁度共用同一套收费：每 1 币修复 20% 最大耐久（不足 1 币按 1 币），
   一次把缺口补满。 */
export const REPAIR_PERCENT_PER_COIN = 20

/** 按缺口计算维修费用：缺 60% 收 3 币，缺 5% 收 1 币；未损耗返回 0 */
export function repairCoinCost(current, max) {
  const maxValue = Number(max)
  const currentValue = Number(current)
  if (!Number.isFinite(maxValue) || maxValue <= 0) return 0
  if (!Number.isFinite(currentValue)) return 0
  if (currentValue >= maxValue) return 0
  const gap = (maxValue - Math.max(0, currentValue)) / maxValue
  return Math.max(1, Math.ceil(gap / (REPAIR_PERCENT_PER_COIN / 100)))
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
