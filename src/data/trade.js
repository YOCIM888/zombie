// 自由贸易：品质决定买方需求，定价决定成交概率
export const TRADE_LISTING_LIMIT = 10

/** 各品质的基准价：普通货便宜，限定货有收藏价 */
export const TRADE_TIER_BASE = {
  普通: 14,
  稀有: 30,
  精良: 52,
  史诗: 88,
  传说: 140,
  神话: 220,
  限定: 300,
}

/** 各品质的每日基础需求：越稀有，愿意接手的人越少 */
const TRADE_TIER_DEMAND = {
  普通: 0.92,
  稀有: 0.82,
  精良: 0.68,
  史诗: 0.52,
  传说: 0.36,
  神话: 0.24,
  限定: 0.16,
}

/** 参考价：品质基准 + 攻击 / 耐久 / 连击 / 闪避的加权 */
export function tradeFairValue(def) {
  const weapon = def?.weapon
  if (!weapon) return 0
  const base = TRADE_TIER_BASE[def.tier] ?? 20
  const attack = Number(weapon.attack) || 0
  const durability = Number(weapon.durability) || 0
  const combo = Number(weapon.combo) || 0
  const dodge = Number(weapon.dodge) || 0
  return Math.max(1, Math.round(base + attack * 0.35 + durability * 0.04 + combo * 20 + dodge * 20))
}

/**
 * 次日成交概率
 * - 定价不超过参考价一半：必被拿走
 * - 定价达到参考价两倍：无人问津，会一直挂着
 * - 中间区间按品质需求递减，挂得越久曝光略增
 */
export function tradeSaleChance(def, price, daysListed = 1, bonus = 0) {
  const fair = tradeFairValue(def)
  const value = Number(price)
  if (fair <= 0 || !Number.isFinite(value) || value <= 0) return 0

  const ratio = value / fair
  if (ratio >= 2) return 0
  if (ratio <= 0.5) return 1

  const demand = TRADE_TIER_DEMAND[def.tier] ?? 0.5
  const progress = (ratio - 0.5) / 1.5
  const base = demand * Math.pow(1 - progress, 1.15)
  const exposure = Math.min(0.18, Math.max(0, daysListed - 1) * 0.04)
  return Math.min(0.95, base + exposure + bonus)
}
