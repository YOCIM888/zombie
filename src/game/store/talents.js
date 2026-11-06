import {
  ARENA,
  CORRIDOR,
  TALENTS,
  TALENT_ACTIVE_LIMIT,
  TALENT_EFFECT_LABELS,
  talentEffects,
  talentTitle,
} from '../../data'
import { game, notify, recordTraining, applyStatChanges, advanceTurns } from './core.js'

/* ===== 天赋启用 ===== */

export function autoEnableTalent(kind) {
  const talent = TALENTS[kind]
  if (!talent || (game.talents[kind] || 0) <= 0) return false
  if (!Array.isArray(game.activeTalents)) game.activeTalents = []
  if (game.activeTalents.includes(kind)) return false
  if (game.activeTalents.length >= TALENT_ACTIVE_LIMIT) return false
  game.activeTalents.push(kind)
  return true
}

/** 当前是否启用且已获得某条天赋 */
export function isTalentActive(kind) {
  return (
    (game.talents[kind] || 0) > 0 &&
    Array.isArray(game.activeTalents) &&
    game.activeTalents.includes(kind)
  )
}

/** 启用/停用天赋；最多同时启用 TALENT_ACTIVE_LIMIT 个 */
export function toggleTalentActive(kind) {
  const talent = TALENTS[kind]
  if (!talent) return ''
  if ((game.talents[kind] || 0) <= 0) return '尚未获得这个天赋'
  if (!Array.isArray(game.activeTalents)) game.activeTalents = []

  const name = talentTitle(kind, game.talents[kind]) || talent.label
  const index = game.activeTalents.indexOf(kind)
  if (index >= 0) {
    game.activeTalents.splice(index, 1)
    return `已停用「${name}」`
  }
  if (game.activeTalents.length >= TALENT_ACTIVE_LIMIT) {
    return `最多同时启用 ${TALENT_ACTIVE_LIMIT} 个天赋，请先停用一个`
  }
  game.activeTalents.push(kind)
  return `已启用「${name}」`
}

/* ===== 王宫 · 斗兽擂台 ===== */

function arenaDayState() {
  const state = game.flags[ARENA.flag]
  if (!state || state.day !== game.day) return { day: game.day, count: 0 }
  return { day: game.day, count: Math.max(0, Number(state.count) || 0) }
}

/** 今日剩余的斗兽擂台次数 */
export function arenaLeft() {
  return Math.max(0, ARENA.dailyLimit - arenaDayState().count)
}

function arenaGuard() {
  if (game.dead) return ''
  if (game.location !== 'ruined-city') return '斗兽擂台在王宫深处。'
  if (game.equipment.melee || game.equipment.ranged) return ARENA.needEmptyLine
  if ((game.talents.arena || 0) >= TALENTS.arena.maxLevel) return ARENA.maxedLine
  if (arenaLeft() <= 0) return ARENA.dailyLine
  return ''
}

/** 上斗兽擂台：空手、1 回合、生命与理智各 -30，随机提升拳头熟练度 */
export function arenaFight() {
  const blocked = arenaGuard()
  if (blocked) return blocked

  const actionDay = game.day
  const actionState = arenaDayState()
  advanceTurns(ARENA.turns)
  if (game.dead) return ''

  applyStatChanges({ hp: -ARENA.hpCost, sanity: -ARENA.sanityCost })
  if (game.dead) return ''

  const gain =
    ARENA.progressMin +
    Math.floor(Math.random() * (ARENA.progressMax - ARENA.progressMin + 1))
  let level = game.talents.arena
  let progress = game.training.arena + gain
  while (level < TALENTS.arena.maxLevel && progress >= ARENA.levelSize) {
    level += 1
    progress -= ARENA.levelSize
  }
  if (level >= TALENTS.arena.maxLevel) progress = 0

  const before = game.talents.arena
  game.talents.arena = level
  game.training.arena = progress
  recordTraining()

  game.flags[ARENA.flag] = {
    day: actionDay,
    count: actionState.count + 1,
  }

  const notes = [
    `${ARENA.doneLine}熟练度 +${gain}，当前 ${
      level >= TALENTS.arena.maxLevel ? '已满级' : `${progress}%`
    }。`,
  ]

  if (level > before) {
    const title = talentTitle('arena', level)
    const effects = talentEffects('arena', level)
    const effectText = Object.entries(effects)
      .map(([key, value]) => {
        const label = TALENT_EFFECT_LABELS[key] ?? key
        return `${label} +${key === 'damage' ? value : Math.round(value * 100) + '%'}`
      })
      .join(' · ')
    notes.push(`天赋提升 · ${title}（${effectText}）`)
    autoEnableTalent('arena')
    if (!isTalentActive('arena')) {
      notes.push(`启用位已满 ${TALENT_ACTIVE_LIMIT} 个，新天赋尚未启用，请到天赋面板调整。`)
    }
    if (typeof window !== 'undefined') notify(`天赋提升 · ${title}`, 3400)
  }

  const left = arenaLeft()
  if (left <= 0) notes.push('今天的擂台次数已用完。')
  return notes.join('\n')
}

/* ===== 曙光 · 行尸走廊 ===== */

function corridorDayState() {
  const state = game.flags[CORRIDOR.flag]
  if (!state || state.day !== game.day) return { day: game.day, count: 0 }
  return { day: game.day, count: Math.max(0, Number(state.count) || 0) }
}

/** 今日剩余的行尸走廊次数 */
export function corridorLeft() {
  return Math.max(0, CORRIDOR.dailyLimit - corridorDayState().count)
}

function corridorGuard() {
  if (game.dead) return ''
  if (game.location !== 'dawn-post') return '行尸走廊在曙光阵地。'
  if (game.equipment.melee || game.equipment.ranged) return CORRIDOR.needEmptyLine
  if ((game.talents.corridor || 0) >= TALENTS.corridor.maxLevel) {
    return CORRIDOR.maxedLine
  }
  if (corridorLeft() <= 0) return CORRIDOR.dailyLine
  return ''
}

/** 穿行行尸走廊：空手、1 回合、生命 -30、感染 +30，随机提升远程闪避熟练度 */
export function corridorFight() {
  const blocked = corridorGuard()
  if (blocked) return blocked

  const actionDay = game.day
  const actionState = corridorDayState()
  advanceTurns(CORRIDOR.turns)
  if (game.dead) return ''

  applyStatChanges({ hp: -CORRIDOR.hpCost, infection: CORRIDOR.infectionCost })
  if (game.dead) return ''

  const gain =
    CORRIDOR.progressMin +
    Math.floor(Math.random() * (CORRIDOR.progressMax - CORRIDOR.progressMin + 1))
  let level = game.talents.corridor
  let progress = game.training.corridor + gain
  while (level < TALENTS.corridor.maxLevel && progress >= CORRIDOR.levelSize) {
    level += 1
    progress -= CORRIDOR.levelSize
  }
  if (level >= TALENTS.corridor.maxLevel) progress = 0

  const before = game.talents.corridor
  game.talents.corridor = level
  game.training.corridor = progress
  recordTraining()

  game.flags[CORRIDOR.flag] = {
    day: actionDay,
    count: actionState.count + 1,
  }

  const notes = [
    `${CORRIDOR.doneLine}熟练度 +${gain}，当前 ${
      level >= TALENTS.corridor.maxLevel ? '已满级' : `${progress}%`
    }。`,
  ]

  if (level > before) {
    const title = talentTitle('corridor', level)
    const effects = talentEffects('corridor', level)
    const effectText = Object.entries(effects)
      .map(([key, value]) => {
        const label = TALENT_EFFECT_LABELS[key] ?? key
        return `${label} +${key === 'damage' ? value : Math.round(value * 100) + '%'}`
      })
      .join(' · ')
    notes.push(`天赋提升 · ${title}（${effectText}）`)
    autoEnableTalent('corridor')
    if (!isTalentActive('corridor')) {
      notes.push(`启用位已满 ${TALENT_ACTIVE_LIMIT} 个，新天赋尚未启用，请到天赋面板调整。`)
    }
    if (typeof window !== 'undefined') notify(`天赋提升 · ${title}`, 3400)
  }

  const left = corridorLeft()
  if (left <= 0) notes.push('今天的走廊次数已用完。')
  return notes.join('\n')
}
