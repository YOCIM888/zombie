import {
  CLEANLINESS_MAX,
  CLEANLINESS_PER_SHOT,
  GUILD_BY_ID,
  PHASES,
  REPAIR_PERCENT_PER_COIN,
  TIME_GEM,
  getItem,
  organizeInventory,
  repairCoinCost,
  repairPriceForTier,
} from '../../data'
import { battle } from '../battle'
import { STAT_LABELS, activeGuild, clampStat, syncHpCap, game, notify, checkStatDeaths, syncIdentities, advanceTurns, cooldownLeft, useCooldown, enterMap, leaveMap } from './core.js'
import { dawnReady } from './dawn.js'
import { palaceReady } from './palace.js'

/* ===== 背包操作 ===== */

/** 背包整理入口：纯排序逻辑在 data/inventory.js */
export function organizeBackpack() {
  if (game.dead) return false
  organizeInventory(game.inventory)
  notify('背包已整理')
  return true
}

/** 时间宝石剩余冷却天数：0 表示现在可用 */
export function timeGemCooldownLeft() {
  return cooldownLeft('time-gem', TIME_GEM.cooldownDays)
}

export function useItem(slotIndex) {
  const entry = game.inventory[slotIndex]
  if (!entry) return
  const def = getItem(entry.id)

  // 开发者宝石：战斗中禁止使用；使用后传送到郊区卖场并正常推进 1 回合，宝石不消失
  if (def?.special === 'developer-gem') {
    if (battle.active) {
      notify('战斗中无法使用开发者宝石，请先结束这场战斗。', 3200)
      return
    }
    if (game.dead) return
    if (game.location && game.location !== 'suburb-market') leaveMap()
    if (!enterMap('suburb-market', { freeEntry: true })) {
      notify('开发者宝石未能开启传送门。', 3200)
      return
    }
    advanceTurns(1)
    if (!game.dead) {
      notify('开发者宝石开启捷径 · 已传送至「郊区卖场」 · 消耗 1 回合', 3200)
    }
    return
  }

  // 天使宝石：每天免费使用 4 次，全属性恢复 20%，使用后不消失
  if (def?.special === 'angel-gem') {
    const state = game.flags.angelGem
    const uses = state?.day === game.day ? Number(state.uses) || 0 : 0
    if (uses >= 4) {
      notify('天使宝石今天已经用过 4 次了，明天再来。')
      return
    }
    const changes = []
    for (const [key, delta] of Object.entries(def.effects ?? {})) {
      game.stats[key] = clampStat((game.stats[key] ?? 0) + delta, key)
      changes.push(`${STAT_LABELS[key] ?? key} ${delta > 0 ? '+' : ''}${delta}`)
    }
    checkStatDeaths()
    game.flags.angelGem = { day: game.day, uses: uses + 1 }
    notify(`天使宝石展开光翼 · ${changes.join('，')}（今日 ${uses + 1} / 4）`, 3200)
    return
  }

  // 时间宝石：快进 3 天且不结算属性消耗，冷却 3 天。
  // 冷却从「落点当天」开始计算，避免快进的天数直接吃掉冷却。
  if (def?.special === 'time-gem') {
    const left = timeGemCooldownLeft()
    if (left > 0) {
      notify(`时间宝石仍在冷却，剩余 ${left} 天。`)
      return
    }
    advanceTurns(TIME_GEM.advanceDays * PHASES.length, { decay: false })
    useCooldown('time-gem', TIME_GEM.cooldownDays)
    if (!game.dead) {
      notify(
        `时间宝石转动 · 快进 ${TIME_GEM.advanceDays} 天，当前第 ${game.day} 天 · 冷却 ${TIME_GEM.cooldownDays} 天。`,
        3200,
      )
    }
    return
  }

  if (!def?.effects) {
    notify(`${def?.name ?? '该物品'}暂时无法使用`)
    return
  }

  const guild = activeGuild()
  const priest = guild?.id === 'priest' ? guild : null
  const suppressNegative = Boolean(priest?.noNegEffectMedicineIds?.includes(entry.id))
  const changes = []
  for (const [key, delta] of Object.entries(def.effects)) {
    const applied = suppressNegative && delta < 0 ? 0 : delta
    if (applied === 0) continue
    game.stats[key] = clampStat((game.stats[key] ?? 0) + applied, key)
    changes.push(`${STAT_LABELS[key] ?? key} ${applied > 0 ? '+' : ''}${applied}`)
  }
  // 牧师公会：指定治疗药品额外掷一次 20 点生命恢复
  if (
    priest?.healMedicineIds?.includes(entry.id) &&
    Math.random() < (priest.healBonusChance ?? 0)
  ) {
    const bonus = Number(priest.healBonusHp) || 20
    const before = Number(game.stats.hp) || 0
    game.stats.hp = clampStat(before + bonus, 'hp')
    const gained = game.stats.hp - before
    if (gained > 0) changes.push(`生命 +${gained}（牧师公会）`)
  }
  checkStatDeaths()

  entry.qty -= 1
  if (entry.qty <= 0) game.inventory[slotIndex] = null

  notify(`使用 ${def.name} ×1 · ${changes.join('，')}`)
}

export function discardItem(slotIndex) {
  const entry = game.inventory[slotIndex]
  if (!entry) return
  const def = getItem(entry.id)

  // 开发者宝石是开局唯一馈赠，丢弃后无法恢复，直接拒绝
  if (def?.special === 'developer-gem') {
    notify('开发者宝石是开局馈赠，无法丢弃。')
    return
  }

  const isBadge = def?.category === 'identity'

  if (entry.qty > 1) entry.qty -= 1
  else game.inventory[slotIndex] = null

  if (isBadge) {
    syncIdentities()
    const still = def.faction === 'dawn' ? game.dawnIdentity : game.identity
    const factionName = def.faction === 'dawn' ? '曙光' : '都城'
    notify(
      still
        ? `已丢弃 ${def.name} · 当前身份「${still}」`
        : `已丢弃 ${def.name} · 你失去了${factionName}身份`,
      3000,
    )
    return
  }

  if (def?.category === 'guild') {
    game.flags.lastGuildId = def.guildId
    syncHpCap()
    notify(`已丢弃 ${def.name} · 你放弃了「${GUILD_BY_ID[def.guildId]?.name ?? '公会'}」身份`, 3000)
    return
  }

  notify(`已丢弃 ${def?.name ?? '物品'} ×1`)
}

export function equipMelee(slotIndex) {
  const entry = game.inventory[slotIndex]
  if (!entry) return
  const def = getItem(entry.id)

  if (!def?.weapon || def.category !== 'melee') {
    notify('这件物品不能装备到近战位')
    return
  }

  const previous = game.equipment.melee
  game.inventory[slotIndex] = previous
    ? { id: previous.id, qty: 1, durability: previous.durability }
    : null

  game.equipment.melee = {
    id: entry.id,
    durability: entry.durability ?? def.weapon.durability,
  }

  syncHpCap()
  notify(`已装备 ${def.name}`)
}

export function unequipMelee() {
  const current = game.equipment.melee
  if (!current) return

  const emptyIndex = game.inventory.findIndex((entry) => entry === null)
  if (emptyIndex === -1) {
    notify('背包已满，无法卸下武器')
    return
  }

  const def = getItem(current.id)
  game.inventory[emptyIndex] = {
    id: current.id,
    qty: 1,
    durability: current.durability,
  }
  game.equipment.melee = null

  syncHpCap()
  notify(`已卸下 ${def?.name ?? '武器'} · 赤手空拳`)
}

export function equipRanged(slotIndex) {
  const entry = game.inventory[slotIndex]
  if (!entry) return
  const def = getItem(entry.id)

  if (!def?.weapon || def.category !== 'ranged') {
    notify('这件物品不能装备到远程位')
    return
  }

  const previous = game.equipment.ranged
  game.inventory[slotIndex] = previous
    ? {
        id: previous.id,
        qty: 1,
        cleanliness: Number.isFinite(previous.cleanliness)
          ? previous.cleanliness
          : CLEANLINESS_MAX,
      }
    : null

  game.equipment.ranged = {
    id: entry.id,
    cleanliness: Number.isFinite(entry.cleanliness) ? entry.cleanliness : CLEANLINESS_MAX,
  }

  notify(`已装备 ${def.name}`)
}

export function unequipRanged() {
  const current = game.equipment.ranged
  if (!current) return

  const emptyIndex = game.inventory.findIndex((entry) => entry === null)
  if (emptyIndex === -1) {
    notify('背包已满，无法卸下远程武器')
    return
  }

  const def = getItem(current.id)
  game.inventory[emptyIndex] = {
    id: current.id,
    qty: 1,
    cleanliness: current.cleanliness,
  }
  game.equipment.ranged = null

  notify(`已卸下 ${def?.name ?? '远程武器'}`)
}

/**
 * 远程武器开火：每开一枪扣清洁度，归零后无法开火
 * 返回 { current, empty, name }
 */
export function consumeRangedCleanliness() {
  const equipped = game.equipment.ranged
  if (!equipped) return { current: 0, empty: true, name: '' }

  const def = getItem(equipped.id)
  const guild = activeGuild()
  const extra =
    guild?.cleanlinessExtraCost && guild.weaponIds?.includes(equipped.id)
      ? Number(guild.cleanlinessExtraCost) || 0
      : 0
  const current = Number.isFinite(equipped.cleanliness) ? equipped.cleanliness : CLEANLINESS_MAX
  equipped.cleanliness = Math.max(
    0,
    current - (CLEANLINESS_PER_SHOT + extra),
  )

  if (equipped.cleanliness <= 0 && current > 0) {
    notify(`${def?.name ?? '远程武器'}清洁度归零，需要保养后才能开火`, 3000)
  }

  return { current: equipped.cleanliness, empty: equipped.cleanliness <= 0, name: def?.name ?? '' }
}

/** 都城近战保养：按耐久缺口与品质收费，一次修满 */
function repairEquippedMelee(currency, label) {
  const equipped = game.equipment.melee
  if (!equipped) return '你还没有装备近战武器，保养台前空着。'

  const def = getItem(equipped.id)
  const max = def?.weapon?.durability
  if (!Number.isFinite(max)) return `「${def?.name ?? '拳头'}」不需要保养。`

  const current = Number.isFinite(equipped.durability) ? equipped.durability : max
  if (current >= max) return `「${def?.name ?? '近战武器'}」的刃口还锋利，不需要打磨。`

  const cost = repairCoinCost(current, max, def?.tier)
  if (game[currency] < cost) {
    return `${label}不足，修复「${def?.name ?? '近战武器'}」需要 ${cost} ${label}。`
  }

  game[currency] -= cost
  equipped.durability = max
  return `你重新打磨上油，「${def?.name ?? '近战武器'}」耐久恢复至 ${max}，花费 ${cost} ${label}（${def?.tier ?? '普通'}品质每 ${REPAIR_PERCENT_PER_COIN}% 缺口 ${repairPriceForTier(def?.tier)} 币）。`
}

/** 曙光远程保养：按清洁度缺口与品质收费，一次保养完 */
function repairEquippedRanged(currency, label) {
  const equipped = game.equipment.ranged
  if (!equipped) return '你还没有装备远程武器，保养台前空着。'

  const def = getItem(equipped.id)
  const current = Number.isFinite(equipped.cleanliness) ? equipped.cleanliness : CLEANLINESS_MAX
  if (current >= CLEANLINESS_MAX) {
    return `「${def?.name ?? '远程武器'}」已经很干净，不需要保养。`
  }

  const cost = repairCoinCost(current, CLEANLINESS_MAX, def?.tier)
  if (game[currency] < cost) {
    return `${label}不足，保养「${def?.name ?? '远程武器'}」需要 ${cost} ${label}。`
  }

  game[currency] -= cost
  equipped.cleanliness = CLEANLINESS_MAX
  return `你擦净了「${def?.name ?? '远程武器'}」：清洁度恢复至 ${CLEANLINESS_MAX}，花费 ${cost} ${label}（${def?.tier ?? '普通'}品质每 ${REPAIR_PERCENT_PER_COIN}% 缺口 ${repairPriceForTier(def?.tier)} 币）。`
}

/** 末日城堡集市：只保养近战武器 */
export function repairMeleeCity() {
  if (!palaceReady()) return ''
  return repairEquippedMelee('coins', '末日币')
}

/** 曙光阵地：只保养远程武器 */
export function repairRangedDawn() {
  if (!dawnReady()) return ''
  return repairEquippedRanged('dawnCoins', '曙光币')
}

/**
 * 战斗中使用近战武器：每命中一次扣 1 点耐久，归零后武器报废并卸下
 * 返回 { broken, name }
 */
export function consumeMeleeDurability(cost = null) {
  const equipped = game.equipment.melee
  if (!equipped) return { broken: false, name: '' }

  const def = getItem(equipped.id)
  const max = def?.weapon?.durability
  if (!Number.isFinite(max)) return { broken: false, name: def?.name ?? '' }

  const guild = activeGuild()
  const extra =
    guild?.durabilityExtraCost && guild.weaponIds?.includes(equipped.id)
      ? Number(guild.durabilityExtraCost) || 0
      : 0
  const spend = Number.isFinite(cost) ? Math.max(0, cost) : 1 + extra
  const current = Number.isFinite(equipped.durability) ? equipped.durability : max
  equipped.durability = Math.max(0, current - spend)
  if (equipped.durability > 0) return { broken: false, name: def?.name ?? '' }

  game.equipment.melee = null
  syncHpCap()
  game.flags.weaponBrokenCount = (Number(game.flags.weaponBrokenCount) || 0) + 1
  notify(`${def?.name ?? '武器'}已经彻底损坏`, 3000)
  return { broken: true, name: def?.name ?? '' }
}
