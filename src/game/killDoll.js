import { reactive } from 'vue'
import { formatMoney, getItem, identityRank } from '../data'
import { battle, meleeAttack, resetBattle, startDawnCombat } from './battle'
import { game, enterMap, leaveMap, cooldownLeft, notify, statCap } from './store/core.js'
import { canEnterPalace, exploreCity, restoreIdentity } from './store/city.js'
import {
  claimSalary,
  palaceBanquet,
  palaceDance,
  palaceGuestRoom,
  stealPalace,
} from './store/palace.js'
import { discardItem } from './store/inventory.js'
import { globalStats } from './save.js'

/** 近战武器的两个硬门槛 */
const MIN_MELEE_DURABILITY = 10
const MIN_MELEE_ATTACK = 25
/** 生命绝对门槛与战斗中的危险比例 */
const MIN_START_HP = 50
const DANGER_HP_RATIO = 0.15
/** 感染门槛：低于该值才能开始 */
const MAX_INFECTION = 50
/** 其他状态门槛：高于该比例 */
const STAT_THRESHOLD = 0.2
/** 前置条件要求的空余背包格数 */
const MIN_FREE_SLOTS = 2
/** 自动战斗的安全上限，避免异常状态造成死循环 */
const MAX_ATTACKS = 40
/** 每步之间的停顿，给玩家留出可见的进度反馈时间 */
const DEFAULT_STEP_DELAY = 320

const VITALS = [
  { key: 'hunger', label: '饱食' },
  { key: 'thirst', label: '口渴' },
  { key: 'sanity', label: '理智' },
  { key: 'stamina', label: '体力' },
]

/** 杀戮玩偶的可见状态：与工作玩偶完全独立，互不读写 */
export const killDoll = reactive({
  visible: false,
  running: false,
  finished: false,
  canContinue: false,
  round: 0,
  step: '',
  error: '',
  summary: '',
  log: [],
})

class KillDollAbort extends Error {
  constructor(step, reason) {
    super(reason)
    this.step = step
    this.reason = reason
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function fail(step, reason) {
  throw new KillDollAbort(step, reason)
}

function badgeEntries() {
  return game.inventory
    .map((entry, index) => ({ entry, index, def: entry ? getItem(entry.id) : null }))
    .filter((item) => item.def?.category === 'identity')
}

function badgeEntry(faction) {
  return badgeEntries().find((item) => item.def.faction === faction)
}

function freeSlots() {
  return game.inventory.reduce((count, entry) => count + (entry ? 0 : 1), 0)
}

/** 当前近战武器的耐久、攻击与展示名；没有武器时返回 null */
function meleeState() {
  const entry = game.equipment.melee
  const def = entry ? getItem(entry.id) : null
  if (!entry || !def?.weapon) return null
  const max = def.weapon.durability
  const durability = Number.isFinite(max)
    ? Number.isFinite(entry.durability)
      ? entry.durability
      : max
    : Infinity
  return { entry, def, durability, attack: def.weapon.attack ?? 0 }
}

function lowVitals() {
  return VITALS.filter(({ key }) => {
    const cap = statCap(key) || 100
    return Number(game.stats[key] ?? 0) <= cap * STAT_THRESHOLD
  }).map(({ key, label }) => {
    const cap = statCap(key) || 100
    const percent = Math.round((Number(game.stats[key] ?? 0) / cap) * 100)
    return `${label} ${percent}%`
  })
}

/** 返回所有不满足的前置条件，按帮助玩家排查的顺序排列 */
function preconditionErrors() {
  const errors = []
  if (game.dead) errors.push('角色已经死亡，无法开始战斗。')
  if (game.location || battle.active) errors.push('请在安全屋使用。')

  const badges = badgeEntries()
  if (badges.length) {
    errors.push(
      `背包里还有阵营徽章：${badges.map((item) => item.def.name).join('、')}，请先丢弃。`,
    )
  }
  if (identityRank(game.maxIdentity) < identityRank('骑士')) {
    errors.push(`都城历史最高身份为「${game.maxIdentity ?? '无'}」，至少需要「骑士」。`)
  }
  const slots = freeSlots()
  if (slots < MIN_FREE_SLOTS) {
    errors.push(`背包只剩 ${slots} 格，至少需要 ${MIN_FREE_SLOTS} 格空位。`)
  }

  const melee = meleeState()
  if (!melee) {
    errors.push(`当前没有装备近战武器，至少需要攻击力 ${MIN_MELEE_ATTACK}、耐久 ${MIN_MELEE_DURABILITY} 的近战武器。`)
  } else {
    if (melee.durability < MIN_MELEE_DURABILITY) {
      errors.push(
        `近战武器耐久只剩 ${Number.isFinite(melee.durability) ? melee.durability : '无限'}，至少需要 ${MIN_MELEE_DURABILITY}。`,
      )
    }
    if (melee.attack < MIN_MELEE_ATTACK) {
      errors.push(`当前近战武器攻击力为 ${melee.attack}，至少需要 ${MIN_MELEE_ATTACK}。`)
    }
  }

  const hp = Number(game.stats.hp ?? 0)
  if (hp < MIN_START_HP) {
    errors.push(`当前生命 ${Math.round(hp)}，至少需要 ${MIN_START_HP}。`)
  }
  const infection = Number(game.stats.infection ?? 0)
  if (infection >= MAX_INFECTION) {
    errors.push(`当前感染值 ${Math.round(infection)}，要求低于 ${MAX_INFECTION}。`)
  }
  const low = lowVitals()
  if (low.length) {
    errors.push(`以下状态不高于 20%：${low.join('、')}。`)
  }
  return errors
}

/** 本轮开始时的数值快照，用于结束汇总 */
function snapshot() {
  const melee = meleeState()
  return {
    day: game.day,
    phase: game.phase,
    coins: game.coins,
    dawnCoins: game.dawnCoins,
    kills: game.zombieKills,
    totalKills: globalStats.totalKills,
    meleeName: melee?.def.name ?? '无',
    durability: melee?.durability ?? 0,
    stats: {
      hp: Number(game.stats.hp ?? 0),
      infection: Number(game.stats.infection ?? 0),
      hunger: Number(game.stats.hunger ?? 0),
      thirst: Number(game.stats.thirst ?? 0),
      sanity: Number(game.stats.sanity ?? 0),
      stamina: Number(game.stats.stamina ?? 0),
    },
  }
}

function formatSnapshot(round, before) {
  const after = snapshot()
  const durability = (value) => (Number.isFinite(value) ? value : '无限')
  return [
    `第 ${round} 轮结束。`,
    `天数：第 ${before.day} 天 · 阶段 ${before.phase + 1} → 第 ${after.day} 天 · 阶段 ${after.phase + 1}`,
    `末日币 ${formatMoney(before.coins)} → ${formatMoney(after.coins)}；曙光币 ${before.dawnCoins} → ${after.dawnCoins}`,
    `生命 ${Math.round(before.stats.hp)} → ${Math.round(after.stats.hp)}；感染 ${Math.round(before.stats.infection)} → ${Math.round(after.stats.infection)}`,
    `近战武器「${before.meleeName}」耐久 ${durability(before.durability)} → ${durability(after.durability)}`,
    `本轮击杀 ${before.kills} → ${after.kills}；跨周目累计击杀 ${before.totalKills} → ${after.totalKills}`,
    `饱食 ${Math.round(before.stats.hunger)} → ${Math.round(after.stats.hunger)}；口渴 ${Math.round(before.stats.thirst)} → ${Math.round(after.stats.thirst)}；理智 ${Math.round(before.stats.sanity)} → ${Math.round(after.stats.sanity)}；体力 ${Math.round(before.stats.stamina)} → ${Math.round(after.stats.stamina)}`,
  ].join('\n')
}

function ensureAlive(step) {
  if (!game.dead) return
  fail(step, `角色已死亡：${game.ending || game.deathReason || '状态耗尽'}`)
}

function requireLine(line, marker, step) {
  ensureAlive(step)
  if (!line) fail(step, '没有收到预期结果，位置或状态可能已经变化。')
  if (marker && !line.includes(marker)) fail(step, line)
  return line
}

/** 丢徽章必须走正式丢弃入口，让身份字段跟着背包一起更新 */
function discardIdentityBadge(faction, step) {
  const target = badgeEntry(faction)
  if (!target) fail(step, '背包里没有对应的身份徽章，无法丢弃。')
  discardItem(target.index)
  if (badgeEntry(faction)) fail(step, '徽章没有被丢弃成功。')
}

async function runStep(label, action, delayMs) {
  killDoll.step = label
  killDoll.log.push(label)
  notify(`杀戮玩偶 · ${label}`, 1600)
  if (delayMs > 0) await wait(delayMs)
  const line = await action()
  ensureAlive(label)
  return line
}

/** 自动战斗：反复调用正式近战攻击入口，直到行尸倒下 */
async function runBattle(delayMs) {
  const zombie = battle.zombie
  const maxHp = Number(zombie?.maxHp) || 100
  let attacks = 0
  let durabilityUsed = 0

  while (battle.active && !battle.finished) {
    ensureAlive('自动战斗')
    const cap = statCap('hp') || 100
    const hp = Number(game.stats.hp ?? 0)
    if (hp <= cap * DANGER_HP_RATIO) {
      fail(
        '自动战斗',
        `生命只剩 ${Math.round(hp)}，已低于危险线 ${Math.round(cap * DANGER_HP_RATIO)}，自动战斗中止。`,
      )
    }
    if (!game.equipment.melee) {
      fail('自动战斗', '近战武器已经损坏，无法继续攻击。')
    }
    if (attacks >= MAX_ATTACKS) {
      fail('自动战斗', `已连续攻击 ${MAX_ATTACKS} 次仍未击倒行尸，自动战斗中止。`)
    }

    const durabilityBefore = meleeState()?.durability ?? 0
    attacks += 1
    meleeAttack()
    const durabilityAfter = meleeState()?.durability ?? 0
    if (Number.isFinite(durabilityBefore) && Number.isFinite(durabilityAfter)) {
      durabilityUsed += Math.max(0, durabilityBefore - durabilityAfter)
    }

    ensureAlive('自动战斗')
    if (battle.finished) break
    if (!game.equipment.melee) {
      fail('自动战斗', '近战武器在攻击中损坏，无法继续。')
    }

    const hpNow = Math.max(0, Math.round(Number(battle.zombie?.hp ?? 0)))
    killDoll.step = `自动战斗 · 行尸 ${hpNow}/${maxHp} · 生命 ${Math.round(Number(game.stats.hp ?? 0))}`
    if (delayMs > 0) await wait(delayMs)
  }

  if (!battle.finished) {
    fail('自动战斗', `战斗在 ${MAX_ATTACKS} 次攻击内没有结束，已中止。`)
  }
  if (battle.result !== 'victory') {
    fail('自动战斗', battle.summary || '战斗没有取得胜利。')
  }

  killDoll.step = '自动战斗 · 行尸已击倒'
  killDoll.log.push(`自动战斗完成（${attacks} 次近战，消耗耐久 ${durabilityUsed}）`)
  resetBattle()
}

/** 严格按顺序执行一轮；任何一步异常都会中止并保留停下的位置 */
async function runChain(delayMs) {
  const before = snapshot()

  await runStep('外出探索', () => {
    if (game.location) fail('外出探索', '请在安全屋使用。')
    return ''
  }, delayMs)

  await runStep('进入曙光阵地', () => {
    if (!enterMap('dawn-post')) fail('进入曙光阵地', game.toast || '无法进入曙光阵地。')
    return ''
  }, delayMs)

  await runStep('清理丧尸', () => '', delayMs)
  await runStep('清理丧尸·1回合', () => {
    if (game.location !== 'dawn-post') fail('清理丧尸·1回合', '当前不在曙光阵地。')
    startDawnCombat()
    ensureAlive('清理丧尸·1回合')
    if (!battle.active) fail('清理丧尸·1回合', '没有进入战斗，位置或状态可能已经变化。')
    return ''
  }, delayMs)

  await runStep('自动战斗', () => runBattle(delayMs), delayMs)

  await runStep('离开曙光', () => {
    if (game.location !== 'dawn-post') fail('离开曙光', '当前不在曙光阵地。')
    leaveMap()
    if (game.location) fail('离开曙光', '没有成功离开曙光阵地。')
    return ''
  }, delayMs)

  await runStep('外出探索', () => '', delayMs)

  await runStep('进入末日都城', () => {
    if (!enterMap('ruined-city')) fail('进入末日都城', game.toast || '无法进入末日都城。')
    return ''
  }, delayMs)

  await runStep('身份办理', () => '', delayMs)
  await runStep('补办身份', () => {
    if (!badgeEntry('city') && !game.maxIdentity) fail('补办身份', '没有可补办的身份记录。')
    return requireLine(restoreIdentity(), '已补办', '补办身份')
  }, delayMs)
  await runStep('返回选项', () => '', delayMs)

  await runStep('在此探索', () => '', delayMs)
  await runStep('探索·1回合', () => {
    if (game.location !== 'ruined-city') fail('探索·1回合', '当前不在末日都城。')
    return requireLine(exploreCity(), '', '探索·1回合')
  }, delayMs)
  await runStep('返回选项', () => '', delayMs)

  await runStep('进入王宫', () => {
    if (game.flags.warPrepNewOrder) fail('进入王宫', '王宫已经被烧成灰，这里什么也没有了。')
    if (!canEnterPalace()) fail('进入王宫', '守卫拦住你：至少需要「骑士」身份才能进入王宫。')
    return ''
  }, delayMs)

  await runStep('进行盗窃', () => {
    if (game.location !== 'ruined-city') fail('进行盗窃', '当前不在末日都城。')
    if (cooldownLeft('steal', 1) > 0) fail('进行盗窃', '今天已经偷过一次，守卫把你盯得更紧了。')
    return requireLine(stealPalace(), '', '进行盗窃')
  }, delayMs)
  await runStep('返回选项', () => '', delayMs)

  await runStep('宫廷舞会', () => '', delayMs)
  await runStep('普通舞会', () => {
    if (cooldownLeft('dance', 1) > 0) fail('普通舞会', '今天的舞会已经结束，明天再来。')
    return requireLine(palaceDance('common'), '理智 +', '普通舞会')
  }, delayMs)
  await runStep('返回选项', () => '', delayMs)

  await runStep('宫廷宴会', () => '', delayMs)
  await runStep('普通宴会', () => {
    if (cooldownLeft('banquet', 1) > 0) fail('普通宴会', '今天的宴会已经结束，明天再来。')
    return requireLine(palaceBanquet('common'), '饱食 +', '普通宴会')
  }, delayMs)
  await runStep('返回选项', () => '', delayMs)

  await runStep('宫廷客房', () => '', delayMs)
  await runStep('典雅客房', () => {
    if (cooldownLeft('room', 1) > 0) fail('典雅客房', '今天已经住过一次客房，明天再来。')
    return requireLine(palaceGuestRoom('common'), '体力 +', '典雅客房')
  }, delayMs)
  await runStep('返回选项', () => '', delayMs)

  await runStep('领取俸禄', () => {
    if (game.location !== 'ruined-city') fail('领取俸禄', '当前不在末日都城。')
    if (!badgeEntry('city')) fail('领取俸禄', '背包里没有都城身份徽章，无法领取俸禄。')
    if (cooldownLeft('salary', 1) > 0) fail('领取俸禄', '今天已经领过俸禄，明天再来。')
    return requireLine(claimSalary(), '领取俸禄', '领取俸禄')
  }, delayMs)
  await runStep('返回选项', () => '', delayMs)

  await runStep('离开都城', () => {
    if (game.location !== 'ruined-city') fail('离开都城', '当前不在末日都城。')
    leaveMap()
    if (game.location) fail('离开都城', '没有成功离开末日都城。')
    return ''
  }, delayMs)

  await runStep('打开背包', () => '', delayMs)
  await runStep('自动丢弃末日都城阵营身份徽章', () => {
    discardIdentityBadge('city', '自动丢弃末日都城阵营身份徽章')
    return ''
  }, delayMs)

  killDoll.summary = formatSnapshot(killDoll.round, before)
}

/** 使用杀戮玩偶：先校验前置条件，再执行清理与王宫活动 */
export async function startKillDoll({ delayMs = DEFAULT_STEP_DELAY } = {}) {
  if (killDoll.running) return

  killDoll.visible = true
  killDoll.running = false
  killDoll.finished = false
  killDoll.canContinue = false
  killDoll.error = ''
  killDoll.summary = ''
  killDoll.step = ''
  killDoll.log = []
  killDoll.round += 1

  const errors = preconditionErrors()
  if (errors.length) {
    killDoll.error = errors.join('\n')
    killDoll.step = '前置条件未满足'
    notify(`杀戮玩偶：${errors[0]}`, 4200)
    return
  }

  killDoll.running = true
  let step = '开始'
  try {
    await runChain(delayMs)
    killDoll.running = false
    killDoll.finished = true
    killDoll.canContinue = true
    killDoll.step = '战斗结束'
    notify('杀戮玩偶：本轮战斗结束', 3200)
  } catch (error) {
    killDoll.running = false
    killDoll.finished = true
    killDoll.canContinue = false
    if (error instanceof KillDollAbort) {
      step = error.step
      killDoll.step = step
      killDoll.error = `${step}中止：${error.reason}`
    } else {
      killDoll.error = `战斗中止：${error?.message ?? '未知错误'}`
    }
    notify(`杀戮玩偶：${killDoll.error}`, 4600)
  }
}

/** 结束后继续战斗：重新走一遍前置条件检查，不沿用上一轮的状态 */
export function continueKillDoll() {
  if (!killDoll.finished || killDoll.running) return
  startKillDoll()
}

/** 关闭弹窗；执行中不允许关闭，避免半途状态被误认为已完成 */
export function closeKillDoll() {
  if (killDoll.running) return
  killDoll.visible = false
}
