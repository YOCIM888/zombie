import {
  CLEANLINESS_MAX,
  HELICOPTER,
  AIRSHIP,
  AIRSHIP_SHOP_GOODS,
  TALENTS,
  TALENT_ACTIVE_LIMIT,
  commissionForDay,
  formatMoney,
  oilPriceForDay,
  oilSellPriceForDay,
  roundToCents,
  addItem,
  canStoreItems,
  countItem,
  getItem,
  identityRank,
  removeItem,
  talentBonus,
  talentTitle,
  treasureForDay,
} from '../../data'
import { STAT_LABELS, game, notify, recordTraining, applyStatChanges, cooldownLeft, advanceTurns } from './core.js'
import { autoEnableTalent, isTalentActive } from './talents.js'

/* ===== 荒废警局 · 老旧直升机 ===== */

function helicopterReady() {
  return !game.dead && game.location === HELICOPTER.mapId
}

export function helicopterGasoline() {
  return countItem(game.inventory, HELICOPTER.gasolineId)
}

/** 修复直升机：消耗 20 汽油，不消耗回合 */
export function repairHelicopter() {
  if (game.dead) return ''
  if (game.location !== HELICOPTER.mapId) return '直升机停在荒废警局的天台。'
  if (game.flags[HELICOPTER.repairedFlag]) return HELICOPTER.repairedLine

  const have = helicopterGasoline()
  if (have < HELICOPTER.repairGasoline) {
    return `${HELICOPTER.noGasolineLine}修复需要 ${HELICOPTER.repairGasoline} 桶汽油（当前 ${have} 桶）。`
  }

  removeItem(game.inventory, HELICOPTER.gasolineId, HELICOPTER.repairGasoline)
  game.flags[HELICOPTER.repairedFlag] = true
  if (typeof window !== 'undefined') notify('直升机修复完成', 3200)
  return HELICOPTER.repairLine
}

/** 乘直升机前往飞行船：消耗 1 汽油，不额外消耗回合与属性 */
export function flyToAirship() {
  if (!helicopterReady()) return '直升机停在荒废警局的天台。'
  if (!game.flags[HELICOPTER.repairedFlag]) return HELICOPTER.notRepairedLine

  // 油轮沉没后 365 天内禁入飞行船：起算日为沉没当天，与其他港口封禁同一写法
  const portBanUntil = Number(game.flags.portBanUntilDay) || 0
  if (portBanUntil > game.day) {
    return '油轮沉没后你的名声臭了：暂时无法进入「末日飞行船」。'
  }

  const have = helicopterGasoline()
  if (have < HELICOPTER.travelGasoline) {
    return `${HELICOPTER.noGasolineLine}前往末日飞行船需要 ${HELICOPTER.travelGasoline} 桶汽油（当前 ${have} 桶）。`
  }

  removeItem(game.inventory, HELICOPTER.gasolineId, HELICOPTER.travelGasoline)
  game.location = AIRSHIP.mapId
  const visited = Array.isArray(game.flags.visitedMaps) ? game.flags.visitedMaps : []
  if (!visited.includes(AIRSHIP.mapId)) visited.push(AIRSHIP.mapId)
  game.flags.visitedMaps = visited
  if (typeof window !== 'undefined') notify('抵达 · 末日飞行船', 3200)
  return HELICOPTER.travelLine
}

/* ===== 末日飞行船 ===== */

function airshipReady() {
  return !game.dead && game.location === AIRSHIP.mapId
}

/** 招待会所：伯爵以上、每天一次，无衰减跳过 4 回合并恢复五项属性 */
export function airshipBanquet() {
  if (!airshipReady()) return '招待会所在末日飞行船上。'
  const hall = AIRSHIP.hall
  if (identityRank(game.identity) < hall.rank) return hall.blockedRankLine
  if (cooldownLeft(hall.cooldownKey, hall.cooldownDays) > 0) return hall.cooldownLine

  const actionDay = game.day
  advanceTurns(hall.turns, { decay: false })
  if (game.dead) return ''

  applyStatChanges(hall.effects)
  game.flags.airshipBanquetUsed = true
  game.cooldowns[hall.cooldownKey] = actionDay
  const summary = Object.entries(hall.effects)
    .map(([key, value]) => `${STAT_LABELS[key] ?? key} +${value}`)
    .join('，')
  if (typeof window !== 'undefined') notify(`招待会所 · ${summary}`, 3400)
  return `${hall.doneLine}\n\n跳过 ${hall.turns} 回合（无衰减）· ${summary}`
}

/** 高台演讲：每天一次，消耗 2 回合，声望 +1 */
export function airshipSpeech() {
  if (!airshipReady()) return '高台在末日飞行船上。'
  const speech = AIRSHIP.speech
  if (cooldownLeft(speech.cooldownKey, speech.cooldownDays) > 0) return speech.cooldownLine

  const actionDay = game.day
  advanceTurns(speech.turns)
  if (game.dead) return ''

  game.reputation += speech.reputation
  game.flags.airshipSpoke = true
  game.cooldowns[speech.cooldownKey] = actionDay
  if (typeof window !== 'undefined') notify(`声望 +${speech.reputation} · 当前 ${game.reputation}`, 3200)
  return `${speech.doneLine}（声望 +${speech.reputation}，当前 ${game.reputation}）`
}

/** 今日练习记录：跨天自动归零 */
function practiceDayState() {
  const state = game.flags[AIRSHIP.practice.flag]
  if (!state || state.day !== game.day) return { day: game.day, melee: 0, ranged: 0 }
  return {
    day: game.day,
    melee: Number(state.melee) || 0,
    ranged: Number(state.ranged) || 0,
  }
}

/** 今日剩余的练习次数 */
export function practiceLeft(kind) {
  const practice = AIRSHIP.practice
  const state = practiceDayState()
  return Math.max(0, practice.dailyLimit - (Number(state[kind]) || 0))
}

function practiceGuard(kind) {
  if (!airshipReady()) return '练习场在末日飞行船上。'
  const practice = AIRSHIP.practice
  const detail = practice[kind]
  if (game.talents[kind] >= TALENTS[kind].maxLevel) return detail.maxedLine
  if (practiceLeft(kind) <= 0) return practice.dailyLine

  if (kind === 'melee') {
    const equipped = game.equipment.melee
    if (!equipped) return detail.needWeapon
    const def = getItem(equipped.id)
    const max = def?.weapon?.durability
    const current = Number.isFinite(equipped.durability) ? equipped.durability : max
    if (!Number.isFinite(max) || current < practice.cost) return detail.tooWorn
  } else {
    const equipped = game.equipment.ranged
    if (!equipped) return detail.needWeapon
    const current = Number.isFinite(equipped.cleanliness) ? equipped.cleanliness : CLEANLINESS_MAX
    if (current < practice.cost) return detail.tooWorn
  }
  return ''
}

function practiceOnce(kind) {
  const blocked = practiceGuard(kind)
  if (blocked) return blocked

  const practice = AIRSHIP.practice
  const detail = practice[kind]
  const actionDay = game.day
  const actionState = practiceDayState()
  advanceTurns(practice.turns)
  if (game.dead) return ''

  const notes = []
  if (kind === 'melee') {
    const equipped = game.equipment.melee
    const def = getItem(equipped.id)
    const max = def?.weapon?.durability
    const current = Number.isFinite(equipped.durability) ? equipped.durability : max
    equipped.durability = Math.max(0, current - practice.cost)
    if (equipped.durability <= 0) {
      game.equipment.melee = null
      const line = practice.brokenLine.replace('{name}', def?.name ?? '近战武器')
      notes.push(line)
      if (typeof window !== 'undefined') notify(line, 3200)
    }
  } else {
    const equipped = game.equipment.ranged
    const def = getItem(equipped.id)
    const current = Number.isFinite(equipped.cleanliness) ? equipped.cleanliness : CLEANLINESS_MAX
    equipped.cleanliness = Math.max(0, current - practice.cost)
    if (equipped.cleanliness <= 0) {
      const line = practice.dirtyLine.replace('{name}', def?.name ?? '远程武器')
      notes.push(line)
      if (typeof window !== 'undefined') notify(line, 3200)
    }
  }

  const gain =
    practice.progressMin +
    Math.floor(Math.random() * (practice.progressMax - practice.progressMin + 1))
  let level = game.talents[kind]
  let progress = game.training[kind] + gain
  while (level < TALENTS[kind].maxLevel && progress >= practice.levelSize) {
    level += 1
    progress -= practice.levelSize
  }
  if (level >= TALENTS[kind].maxLevel) progress = 0

  const before = game.talents[kind]
  game.talents[kind] = level
  game.training[kind] = progress
  recordTraining()
  if (level > before) {
    const title = talentTitle(kind, level)
    notes.push(`天赋提升 · ${title}（${TALENTS[kind].stat} +${Math.round(talentBonus(kind, level) * 100)}%）`)
    autoEnableTalent(kind)
    if (!isTalentActive(kind)) {
      notes.push(`启用位已满 ${TALENT_ACTIVE_LIMIT} 个，新天赋尚未启用，请到天赋面板调整。`)
    }
    if (typeof window !== 'undefined') notify(`天赋提升 · ${title}`, 3400)
  }

  const next = {
    day: actionDay,
    melee: actionState.melee,
    ranged: actionState.ranged,
  }
  next[kind] += 1
  game.flags[practice.flag] = next

  const progressText = level >= TALENTS[kind].maxLevel ? '已满级' : `${progress}%`
  notes.unshift(`${detail.doneLine}熟练度 +${gain}，当前 ${progressText}。`)
  const left = practiceLeft(kind)
  if (left <= 0) notes.push('今天的练习次数已用完。')
  return notes.join('\n')
}

/** 木桩练习：消耗 1 回合与 10 点近战耐久 */
export function practiceMeleeDummy() {
  return practiceOnce('melee')
}

/** 打靶练习：消耗 1 回合与 10 点远程清洁度 */
export function practiceRangedTarget() {
  return practiceOnce('ranged')
}

/** 飞行船商店：全天用末日币结算 */
export function buyFlightGood(kind, goodId) {
  if (!airshipReady()) return '飞行船商店不在这里。'
  const list = AIRSHIP_SHOP_GOODS[kind]
  const good = Array.isArray(list) ? list.find((item) => item.id === goodId) : null
  if (!good) return ''
  if (game.coins < good.price) return `末日币不足，${good.name} 需要 ${good.price} 枚。`
  if (addItem(game.inventory, good.itemId, 1) > 0) return '背包已满，无法购买。'

  game.coins -= good.price
  return `购买 ${good.name} ×1，花费 ${good.price} 末日币。`
}

/** 珍宝商店：每天确定一件史诗近战（指虎除外），当天只能买一次 */
export function buyAirshipTreasure() {
  if (!airshipReady()) return '珍宝商店不在这里。'
  if (Number(game.flags.airshipTreasureBoughtDay) === game.day) return '今天的珍宝已经卖出去了，明天再来。'

  const treasure = treasureForDay(game.day)
  if (!treasure) return '今天托盘里没有货。'
  if (game.coins < treasure.price) return `末日币不足，${treasure.name} 需要 ${treasure.price} 枚。`
  if (addItem(game.inventory, treasure.itemId, 1) > 0) return '背包已满，无法购买。'

  game.coins -= treasure.price
  game.flags.airshipTreasureBoughtDay = game.day
  return `买下了今日珍宝：${treasure.name}，花费 ${treasure.price} 末日币。`
}

/* ===== 居民委托 ===== */

/** 派对委托：上交当日指定的酒，声望 +1 */
export function airshipPartyCommission() {
  if (!airshipReady()) return '居民委托在末日飞行船上。'
  const party = AIRSHIP.commission.party
  if (cooldownLeft(party.cooldownKey, party.cooldownDays) > 0) return party.cooldownLine

  const wineId = commissionForDay(game.day).wineId
  const wine = getItem(wineId)
  if (countItem(game.inventory, wineId) < 1) {
    return `${party.missingLine}今天需要 ${wine?.name ?? '酒'} ×1。`
  }

  const actionDay = game.day
  removeItem(game.inventory, wineId, 1)
  advanceTurns(party.turns, { decay: false })
  if (game.dead) return ''

  game.reputation += party.reputation
  game.cooldowns[party.cooldownKey] = actionDay
  return `${party.doneLine}（上交 ${wine?.name ?? '酒'} ×1，声望 +${party.reputation}，当前 ${game.reputation}）`
}

/** 杂物委托：无衰减消耗 1 回合，随机扣 10-25 体力，声望 +1 */
export function airshipChoreCommission() {
  if (!airshipReady()) return '居民委托在末日飞行船上。'
  const chore = AIRSHIP.commission.chore
  if (cooldownLeft(chore.cooldownKey, chore.cooldownDays) > 0) return chore.cooldownLine

  const actionDay = game.day
  const stamina = commissionForDay(game.day).stamina
  advanceTurns(chore.turns, { decay: false })
  if (game.dead) return ''

  applyStatChanges({ stamina: -stamina })
  if (game.dead) return ''

  game.reputation += chore.reputation
  game.cooldowns[chore.cooldownKey] = actionDay
  return `${chore.doneLine}（体力 -${stamina}，声望 +${chore.reputation}，当前 ${game.reputation}）`
}

/* ===== 储油仓库 ===== */

/** 当日购买汽油的单价（0.75-3.99 末日币，按天浮动） */
export function airshipGasolinePrice() {
  return oilPriceForDay(game.day)
}

/** 当日提交汽油的回收单价（0.25-2.25 末日币，按天浮动） */
export function airshipGasolineSellPrice() {
  return oilSellPriceForDay(game.day)
}

/** 提交汽油：按当日回收单价换末日币 */
export function submitAirshipGasoline(quantity) {
  if (!airshipReady()) return '储油仓库在末日飞行船上。'
  const qty = Math.floor(Number(quantity) || 0)
  if (qty <= 0) return '请输入要提交的汽油数量。'

  const have = countItem(game.inventory, HELICOPTER.gasolineId)
  if (have < qty) return `汽油不足，当前只有 ${have} 桶。`

  const price = oilSellPriceForDay(game.day)
  const gained = roundToCents(price * qty)
  removeItem(game.inventory, HELICOPTER.gasolineId, qty)
  game.coins = roundToCents(game.coins + gained)
  return `提交汽油 ${qty} 桶，换得 ${formatMoney(gained)} 末日币（单价 ${formatMoney(price)}）。`
}

/** 购买汽油：按当日单价结算 */
export function buyAirshipGasoline(quantity) {
  if (!airshipReady()) return '储油仓库在末日飞行船上。'
  const qty = Math.floor(Number(quantity) || 0)
  if (qty <= 0) return '请输入要购买的汽油数量。'

  const price = oilPriceForDay(game.day)
  const total = roundToCents(price * qty)
  if (game.coins < total) return `末日币不足，${qty} 桶汽油需要 ${formatMoney(total)} 枚。`
  if (!canStoreItems(game.inventory, [{ id: HELICOPTER.gasolineId, qty }])) {
    return '背包已满，无法购买。'
  }

  addItem(game.inventory, HELICOPTER.gasolineId, qty)
  game.coins = roundToCents(game.coins - total)
  return `购买汽油 ${qty} 桶，花费 ${formatMoney(total)} 末日币（单价 ${formatMoney(price)}）。`
}
