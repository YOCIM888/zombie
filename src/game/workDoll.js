import { reactive } from 'vue'
import {
  DAWN_RELIEF_TIERS,
  PALACE_SALARY,
  dawnInfo,
  dawnRank,
  formatMoney,
  getItem,
  identityRank,
} from '../data'
import { battle } from './battle'
import { game, enterMap, leaveMap, cooldownLeft, notify, statCap } from './store/core.js'
import { canEnterPalace, exploreCity, restoreIdentity } from './store/city.js'
import {
  attendCouncil,
  bestAvailableCouncil,
  claimSalary,
  palaceBanquet,
  palaceDance,
  palaceGuestRoom,
  stealPalace,
} from './store/palace.js'
import { claimDawnRelief, claimDawnSalary, restoreDawnIdentity } from './store/dawn.js'
import { discardItem } from './store/inventory.js'

/** 前置条件要求的空余背包格数 */
const REQUIRED_FREE_SLOTS = 5
/** 状态门槛：高于该比例才允许开始 */
const STAT_THRESHOLD = 0.2
/** 每步之间的停顿，给玩家留出可见的进度反馈时间 */
const DEFAULT_STEP_DELAY = 320

const VITALS = [
  { key: 'hp', label: '生命' },
  { key: 'hunger', label: '饱食' },
  { key: 'thirst', label: '口渴' },
  { key: 'sanity', label: '理智' },
  { key: 'stamina', label: '体力' },
]

/** 工作玩偶的可见状态：逻辑与 UI 都只读这里，避免把进度散落到面板里 */
export const workDoll = reactive({
  visible: false,
  running: false,
  finished: false,
  canContinue: false,
  round: 0,
  /** 'A' = 参加会议不可用；'B' = 可参加并已参加会议 */
  branch: '',
  step: '',
  error: '',
  summary: '',
  log: [],
})

class WorkDollAbort extends Error {
  constructor(step, reason) {
    super(reason)
    this.step = step
    this.reason = reason
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function fail(step, reason) {
  throw new WorkDollAbort(step, reason)
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
  if (game.dead) errors.push('角色已经死亡，无法开始打工。')
  if (battle.active) errors.push('战斗还没有结束，先结束战斗再使用工作玩偶。')
  if (game.location) errors.push('请先回到安全屋，再从背包里使用工作玩偶。')

  const badges = badgeEntries()
  if (badges.length) {
    errors.push(
      `背包里还有身份徽章：${badges.map((item) => item.def.name).join('、')}，请先丢弃。`,
    )
  }
  if (identityRank(game.maxIdentity) < identityRank('骑士')) {
    errors.push(`都城历史最高身份为「${game.maxIdentity ?? '无'}」，至少需要「骑士」。`)
  }
  if (dawnRank(game.maxDawnIdentity) < dawnRank('见习')) {
    errors.push(`曙光历史最高身份为「${game.maxDawnIdentity ?? '无'}」，至少需要「见习」。`)
  }
  const slots = freeSlots()
  if (slots < REQUIRED_FREE_SLOTS) {
    errors.push(`背包只剩 ${slots} 个空格，至少需要 ${REQUIRED_FREE_SLOTS} 格。`)
  }
  const low = lowVitals()
  if (low.length) {
    errors.push(`以下状态不高于 20%：${low.join('、')}。`)
  }
  return errors
}

/** 本轮开始时的数值快照，用于结束汇总 */
function snapshot() {
  return {
    day: game.day,
    phase: game.phase,
    coins: game.coins,
    dawnCoins: game.dawnCoins,
    stats: Object.fromEntries(VITALS.map(({ key }) => [key, Number(game.stats[key] ?? 0)])),
  }
}

function formatSnapshot(round, before, branch) {
  const after = snapshot()
  const statText = VITALS.map(
    ({ key, label }) => `${label} ${Math.round(before.stats[key])} → ${Math.round(after.stats[key])}`,
  ).join('，')
  return [
    `第 ${round} 轮结束（分支 ${branch} · ${branch === 'B' ? '参加会议' : '未参加会议'}）。`,
    `天数：第 ${before.day} 天 · 阶段 ${before.phase + 1} → 第 ${after.day} 天 · 阶段 ${after.phase + 1}`,
    `末日币 ${formatMoney(before.coins)} → ${formatMoney(after.coins)}；曙光币 ${before.dawnCoins} → ${after.dawnCoins}`,
    statText,
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
  workDoll.step = label
  workDoll.log.push(label)
  notify(`工作玩偶 · ${label}`, 1600)
  if (delayMs > 0) await wait(delayMs)
  const line = action()
  ensureAlive(label)
  return line
}

/** 严格按顺序执行一轮；任何一步异常都会中止并保留停下的位置 */
async function runChain(delayMs) {
  const before = snapshot()

  const cityBadge = () => badgeEntry('city')
  const dawnBadge = () => badgeEntry('dawn')

  await runStep('外出探索', () => {
    if (game.location) fail('外出探索', '请先回到安全屋。')
    return ''
  }, delayMs)

  await runStep('进入末日都城', () => {
    if (!enterMap('ruined-city')) fail('进入末日都城', game.toast || '无法进入末日都城。')
    return ''
  }, delayMs)

  await runStep('进入身份办理', () => '', delayMs)

  await runStep('补办身份', () => {
    if (!cityBadge() && !game.maxIdentity) fail('补办身份', '没有可补办的身份记录。')
    return requireLine(restoreIdentity(), '已补办', '补办身份')
  }, delayMs)

  await runStep('返回选项', () => '', delayMs)

  // 分支判定与王宫「出席会议」按钮共用 councilLockReason，不另写一份判断
  const council = bestAvailableCouncil()
  const branch = council ? 'B' : 'A'
  workDoll.branch = branch
  await runStep(
    branch === 'B'
      ? `分支 B · 参加会议可用（${council.name}）`
      : '分支 A · 参加会议不可用',
    () => '',
    delayMs,
  )

  await runStep('在此探索', () => '', delayMs)
  const exploreStep = () => {
    if (game.location !== 'ruined-city') fail('探索·1回合', '当前不在末日都城，无法探索。')
    return requireLine(exploreCity(), '', '探索·1回合')
  }
  await runStep('探索·1回合', exploreStep, delayMs)
  if (branch === 'A') await runStep('探索·1回合', exploreStep, delayMs)
  await runStep('返回选项', () => '', delayMs)

  await runStep('进入王宫', () => {
    if (game.flags.warPrepNewOrder) fail('进入王宫', '王宫已经被烧成灰，这里什么也没有了。')
    if (!canEnterPalace()) fail('进入王宫', '守卫拦住你：至少需要「骑士」身份才能进入王宫。')
    return ''
  }, delayMs)

  await runStep('进行偷窃', () => '', delayMs)
  await runStep('进行偷窃·1回合', () => {
    if (game.location !== 'ruined-city') fail('进行偷窃·1回合', '当前不在末日都城。')
    if (cooldownLeft('steal', 1) > 0) fail('进行偷窃·1回合', '今天已经偷过一次，守卫把你盯得更紧了。')
    return requireLine(stealPalace(), '', '进行偷窃·1回合')
  }, delayMs)
  await runStep('返回选项', () => '', delayMs)

  await runStep('进入领取俸禄', () => '', delayMs)
  await runStep('领取俸禄', () => {
    if (!PALACE_SALARY[game.identity]) fail('领取俸禄', '当前身份没有可领取的俸禄。')
    if (cooldownLeft('salary', 1) > 0) fail('领取俸禄', '今天已经领过俸禄，明天再来。')
    return requireLine(claimSalary(), '领取俸禄', '领取俸禄')
  }, delayMs)
  await runStep('返回选项', () => '', delayMs)

  if (branch === 'B') {
    await runStep('进入参加会议', () => '', delayMs)
    await runStep(`自动参加支持的最高档会议（${council.name}）`, () => {
      if (game.location !== 'ruined-city') fail('自动参加支持的最高档会议', '当前不在末日都城。')
      const target = bestAvailableCouncil()
      if (!target) fail('自动参加支持的最高档会议', '当前身份没有可出席的会议，或七日会期还没到。')
      return requireLine(attendCouncil(target.id), '末日币 +', '自动参加支持的最高档会议')
    }, delayMs)
    await runStep('返回选项', () => '', delayMs)
  }

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

  await runStep('外出探索', () => '', delayMs)

  await runStep('进入曙光阵地', () => {
    if (!enterMap('dawn-post')) fail('进入曙光阵地', game.toast || '无法进入曙光阵地。')
    return ''
  }, delayMs)

  await runStep('联系管事', () => '', delayMs)
  await runStep('徽章补办', () => {
    return requireLine(restoreDawnIdentity(), '已补办', '徽章补办')
  }, delayMs)
  await runStep('返回选项', () => '', delayMs)

  await runStep('领取工资', () => '', delayMs)
  await runStep('领取曙光币', () => {
    if (cooldownLeft('dawn-salary', 1) > 0) fail('领取曙光币', '今天的工资已经领过了，明天再来。')
    return requireLine(claimDawnSalary(), '工资：曙光币', '领取曙光币')
  }, delayMs)
  await runStep('返回选项', () => '', delayMs)

  await runStep('领取救助', () => '', delayMs)
  await runStep('自动领取最高档', () => {
    const rank = dawnInfo(game.dawnIdentity)?.rank ?? -1
    const tier = [...DAWN_RELIEF_TIERS]
      .filter((item) => item.rank <= rank)
      .sort((a, b) => b.rank - a.rank)[0]
    if (!tier) fail('自动领取最高档', '当前曙光身份没有可领取的救助档位。')
    if (cooldownLeft('dawn-relief', 1) > 0) fail('自动领取最高档', '今天的救济已经领过了，明天再来。')
    return requireLine(claimDawnRelief(tier.id), '领到', '自动领取最高档')
  }, delayMs)

  await runStep('离开曙光', () => {
    if (game.location !== 'dawn-post') fail('离开曙光', '当前不在曙光阵地。')
    leaveMap()
    if (game.location) fail('离开曙光', '没有成功离开曙光阵地。')
    return ''
  }, delayMs)

  await runStep('打开背包', () => '', delayMs)
  await runStep('自动丢弃曙光阵营身份徽章', () => {
    discardIdentityBadge('dawn', '自动丢弃曙光阵营身份徽章')
    return ''
  }, delayMs)

  workDoll.summary = formatSnapshot(workDoll.round, before, branch)
}

/** 使用工作玩偶：先校验前置条件，再逐回合执行整条链 */
export async function startWorkDoll({ delayMs = DEFAULT_STEP_DELAY } = {}) {
  if (workDoll.running) return

  workDoll.visible = true
  workDoll.running = false
  workDoll.finished = false
  workDoll.canContinue = false
  workDoll.error = ''
  workDoll.summary = ''
  workDoll.step = ''
  workDoll.log = []
  workDoll.round += 1
  workDoll.branch = ''

  const errors = preconditionErrors()
  if (errors.length) {
    workDoll.error = errors.join('\n')
    workDoll.step = '前置条件未满足'
    notify(`工作玩偶：${errors[0]}`, 4200)
    return
  }

  workDoll.running = true
  let step = '开始'
  try {
    await runChain(delayMs)
    workDoll.running = false
    workDoll.finished = true
    workDoll.canContinue = true
    workDoll.step = '打工结束'
    notify('工作玩偶：本轮打工结束', 3200)
  } catch (error) {
    workDoll.running = false
    workDoll.finished = true
    workDoll.canContinue = false
    if (error instanceof WorkDollAbort) {
      step = error.step
      workDoll.step = step
      workDoll.error = `${step}中止：${error.reason}`
    } else {
      workDoll.error = `打工中止：${error?.message ?? '未知错误'}`
    }
    notify(`工作玩偶：${workDoll.error}`, 4600)
  }
}

/** 结束后继续打工：重新走一遍前置条件检查，不沿用上一轮的状态 */
export function continueWorkDoll() {
  if (!workDoll.finished || workDoll.running) return
  startWorkDoll()
}

/** 关闭弹窗；执行中不允许关闭，避免半途状态被误认为已完成 */
export function closeWorkDoll() {
  if (workDoll.running) return
  workDoll.visible = false
}
