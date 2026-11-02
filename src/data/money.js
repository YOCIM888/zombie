// 货币精度：统一保留最多两位小数，避免浮点误差累积
export function roundToCents(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 0
  const sign = amount < 0 ? -1 : 1
  return sign * Math.round((Math.abs(amount) + 1e-9) * 100) / 100
}

/** 向下截断到分（用于盈利） */
export function floorToCents(value) {
  const amount = Number(value) || 0
  return Math.floor(amount * 100 + 1e-8) / 100
}

/** 向上进位到分（用于手续费与亏损） */
export function ceilToCents(value) {
  const amount = Number(value) || 0
  return Math.ceil(amount * 100 - 1e-8) / 100
}

/** 10 -> "10"；10.5 -> "10.5"；10.55 -> "10.55" */
export function formatMoney(value) {
  const amount = roundToCents(value)
  if (Object.is(amount, -0)) return '0'
  return amount.toFixed(2).replace(/\.?0+$/, '')
}
