/** 秒 -> 「2 小时 13 分」/「13 分 05 秒」 */
export function formatDuration(totalSeconds, { withSeconds = true } = {}) {
  const sec = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(sec / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const seconds = sec % 60

  if (hours > 0) {
    return `${hours} 小时 ${String(minutes).padStart(2, '0')} 分${withSeconds ? ` ${String(seconds).padStart(2, '0')} 秒` : ''}`
  }
  if (minutes > 0) {
    return `${minutes} 分${withSeconds ? ` ${String(seconds).padStart(2, '0')} 秒` : ''}`
  }
  return `${seconds} 秒`
}

/** 时间戳 -> 2026/11/01 21:04 */
export function formatSavedAt(timestamp) {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 0.05 -> 5% */
export function formatPercent(value) {
  return `${Math.round((value ?? 0) * 100)}%`
}

/** 暴伤：1.15 -> 1.15×；0 -> 0% */
export function formatCritDamage(value) {
  return value >= 1 ? `${value}×` : formatPercent(value)
}

/** 基础百分比 + 天赋加成：0.1 + 0.1 -> 10%（+10%） */
export function formatPercentWithBonus(base, bonus) {
  const extra = Math.max(0, Number(bonus) || 0)
  return extra > 0 ? `${formatPercent(base)}（+${formatPercent(extra)}）` : formatPercent(base)
}

/** 基础数值 + 天赋加成：10 + 5 -> 10（+5） */
export function formatValueWithBonus(base, bonus) {
  const baseValue = Math.max(0, Math.round(Number(base) || 0))
  const extra = Math.max(0, Math.round(Number(bonus) || 0))
  return extra > 0 ? `${baseValue}（+${extra}）` : `${baseValue}`
}
