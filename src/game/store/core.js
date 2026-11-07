import { computed, reactive, watch } from 'vue'
import {
  BACKPACK_SIZE,
  CLEANLINESS_MAX,
  ENTRY_COST,
  exploreLootPool,
  GUILD_BY_ID,
  HARBOR_MUTINY,
  AIRSHIP,
  AIRSHIP_STOCKS,
  TALENTS,
  TALENT_ACTIVE_LIMIT,
  STOCK_PRICE_MAX,
  STOCK_PRICE_MIN,
  TRADE_LISTING_LIMIT,
  formatMoney,
  rollStockPrices,
  roundToCents,
  stockProfitRounded,
  stockTradeFee,
  LOAN_TERM_DAYS,
  MERMAID,
  PHASES,
  REST_OPTIONS,
  ROCKET,
  TURN_COST,
  addItem,
  createEmptyBackpack,
  createInitialBackpack,
  dawnItemId,
  dawnRank,
  normalizeDawnIdentityName,
  fieldMapById,
  getItem,
  identityItemId,
  identityRank,
  loanTierByRank,
  pickRandomMedicine,
  tradeSaleChance,
} from '../../data'
import { ACHIEVEMENTS, DEFAULT_CHARACTER_NAME, DEFAULT_STATS, MAPS, STAT_DEFS, STAT_ENDINGS } from '../config'
import { startMusic } from '../music'
import { preloadAssets } from '../assets'
import {
  addPlaytime,
  flushGlobalStats,
  getSlot,
  globalStats,
  previewSlotWrite,
  unlockAchievement,
  writeSlot,
} from '../save'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const CHARACTER_NAME_MAX = 16

/** 名字去掉首尾空白并限制长度；空名字回落到默认名 */
export function normalizeCharacterName(value, fallback = '') {
  const text = String(value ?? '').trim().slice(0, CHARACTER_NAME_MAX)
  return text || fallback
}

export const STAT_LABELS = Object.fromEntries(STAT_DEFS.map((stat) => [stat.key, stat.label]))

/** 当前持有公会徽章的公会；没有则返回 null */
export function activeGuildId() {
  for (const entry of game.inventory) {
    if (!entry) continue
    const def = getItem(entry.id)
    if (def?.category === 'guild') return def.guildId ?? null
  }
  return null
}

export function activeGuild() {
  return GUILD_BY_ID[activeGuildId()] ?? null
}

/** 单项属性的上限：骑士公会 + 骑士剑会把生命上限提高到 120 */
export function statCap(key) {
  if (
    key === 'hp' &&
    activeGuildId() === 'knight' &&
    game.equipment.melee?.id === 'knight-sword'
  ) {
    return 100 + (GUILD_BY_ID.knight?.maxHpBonus ?? 20)
  }
  return 100
}

export const clampStat = (value, key = '') =>
  Math.max(0, Math.min(statCap(key), Math.round(value)))

/** 失去生命上限增益时，把当前生命压回新上限 */
export function syncHpCap() {
  const cap = statCap('hp')
  if ((game.stats.hp ?? 0) > cap) game.stats.hp = cap
}

export const game = reactive({
  screen: 'menu',
  loading: false,
  progress: 0,
  slotIndex: null,
  character: DEFAULT_CHARACTER_NAME,
  stats: { ...DEFAULT_STATS },
  inventory: createEmptyBackpack(),
  equipment: { melee: null, ranged: null },
  coins: 0,
  dawnCoins: 0,
  identity: null,
  maxIdentity: null,
  dawnIdentity: null,
  maxDawnIdentity: null,
  zombieKills: 0,
  loan: null,
  day: 1,
  phase: 0,
  location: null,
  cooldowns: {},
  dead: false,
  deathReason: '',
  ending: '',
  quests: {},
  flags: {},
  finale: '',
  reputation: 0,
  talents: {
    melee: 0,
    ranged: 0,
    arena: 0,
    corridor: 0,
    draw: 0,
    sword: 0,
    sniper: 0,
    block: 0,
    pistol: 0,
    spray: 0,
    assault: 0,
    blunt: 0,
    assassinate: 0,
    slash: 0,
    sweep: 0,
    polearm: 0,
    insight: 0,
    bulldozer: 0,
    harvest: 0,
  },
  training: {
    melee: 0,
    ranged: 0,
    arena: 0,
    corridor: 0,
    draw: 0,
    sword: 0,
    sniper: 0,
    block: 0,
    pistol: 0,
    spray: 0,
    assault: 0,
    blunt: 0,
    assassinate: 0,
    slash: 0,
    sweep: 0,
    polearm: 0,
    insight: 0,
    bulldozer: 0,
    harvest: 0,
  },
  activeTalents: [],
  market: null,
  playtimeBase: 0,
  sessionSeconds: 0,
  toast: '',
})

// 货币统一按分归一化，避免小数余额在整币加减时累积浮点误差
watch(
  () => game.coins,
  (value) => {
    const next = Math.max(0, roundToCents(value))
    if (!Object.is(next, value)) game.coins = next
  },
  { flush: 'sync' },
)
watch(
  () => game.dawnCoins,
  (value) => {
    const next = Math.max(0, roundToCents(value))
    if (!Object.is(next, value)) game.dawnCoins = next
  },
  { flush: 'sync' },
)

/** 开发者控制台状态：只在当前页面会话内生效，不写入存档 */
export const devState = reactive({
  oneHitKill: false,
  lockStats: false,
  lockOxygen: false,
})

/** 自由贸易售出通知：只在当前页面会话内生效，不写入存档 */
export const tradeNotice = reactive({
  day: 0,
  total: 0,
  sales: [],
})

export function dismissTradeNotice() {
  tradeNotice.sales = []
  tradeNotice.total = 0
  tradeNotice.day = 0
}

export const currentPlaytime = computed(() => game.playtimeBase + game.sessionSeconds)
export const currentPhase = computed(() => PHASES[game.phase] ?? PHASES[0])

let toastTimer = 0

export function notify(text, duration = 2400) {
  game.toast = text
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    game.toast = ''
  }, duration)
}

const ACHIEVEMENT_NAMES = Object.fromEntries(ACHIEVEMENTS.map((item) => [item.id, item.name]))

/** 六种属性死亡：跨周目累计种类，用于「死神来了」 */
const ATTRIBUTE_DEATHS = ['饥荒', '缺水', '自缢', '过劳', '尸变', '伤重不治']

/** 按死亡结局直接解锁的成就：checkAchievements 在死亡后会提前返回，必须在此处理 */
const DEATH_ENDING_ACHIEVEMENTS = {
  恶魔: 'death-list',
  溺水: 'swim-champion',
  食人魔: 'become-barbecue',
  高利贷: 'negative-second-gen',
}

const HIGH_TIER_NAMES = ['传说', '神话']

/** 背包或已装备武器中是否拥有高品阶武器 */
function ownsHighTierWeapon() {
  const defs = [
    ...game.inventory.filter(Boolean).map((entry) => getItem(entry.id)),
    game.equipment.melee ? getItem(game.equipment.melee.id) : null,
    game.equipment.ranged ? getItem(game.equipment.ranged.id) : null,
  ]
  return defs.some((def) => HIGH_TIER_NAMES.includes(def?.tier))
}

/** 专项训练完成计数：用于成就统计，随存档 flags 保存 */
export function recordTraining() {
  game.flags.trainingTotal = (Number(game.flags.trainingTotal) || 0) + 1
}

/** 可自动判定的成就条件：读取当前存档状态即可 */
const ACHIEVEMENT_CHECKS = {
  'first-night': () => game.day >= 2,
  'scavenger': () => (Number(game.flags.scavengeCount) || 0) >= 10,
  'survivor-7': () => game.day >= 7,
  'survivor-30': () => game.day >= 30,
  'first-blood': () => game.zombieKills >= 1,
  hunter: () => game.zombieKills >= 10,
  butcher: () => game.zombieKills >= 50,
  'dawn-sworn': () => Boolean(game.dawnIdentity),
  'dawn-officer': () => dawnRank(game.maxDawnIdentity) >= dawnRank('队长'),
  savings: () => game.coins >= 50,
  'dawn-savings': () => game.dawnCoins >= 100,
  mermaid: () => (Number(game.flags.mermaidStage) || 0) >= MERMAID.stages.length,
  yanran: () => Boolean(game.flags.yanranRescued),
  lulu: () => Boolean(game.flags.luluRescued),
  barbecue: () => Boolean(game.flags.ateStrangeMeat),
  doctor: () => Boolean(game.flags.doctorTradeDone),
  garage: () => Boolean(game.flags.garageDeparted),
  rocket: () =>
    [ROCKET.finaleAll, ROCKET.finaleSolo, ROCKET.finaleSend].includes(game.finale),
  'loan-paid': () => Boolean(game.flags.loanRepaid),
  'survivor-60': () => game.day >= 60,
  'slayer-100': () => game.zombieKills >= 100,
  'field-explorer': () =>
    Array.isArray(game.flags.visitedMaps) && game.flags.visitedMaps.length >= 1,
  'field-veteran': () =>
    Array.isArray(game.flags.visitedMaps) && game.flags.visitedMaps.length >= 5,
  'fully-armed': () => Boolean(game.equipment.melee && game.equipment.ranged),
  legendary: () => ownsHighTierWeapon(),
  'city-knight': () => identityRank(game.maxIdentity) >= 1,
  'city-heir': () => identityRank(game.maxIdentity) >= 7,
  'dawn-command': () => dawnRank(game.maxDawnIdentity) >= dawnRank('指挥'),
  'dawn-deputy': () => dawnRank(game.maxDawnIdentity) >= dawnRank('总督'),
  'coin-tycoon': () => game.coins >= 200,
  'dawn-wealth': () => game.dawnCoins >= 300,
  'ma-san': () => Boolean(game.flags.maSanKilled),
  'no-cheat': () => Boolean(game.flags.devDuelWon),
  'coup-victory': () => Boolean(game.flags.airshipCoupDone),
  'seed-life': () => Boolean(game.flags.rottenSeedPlanted),
  'doctor-badges': () => Boolean(game.flags.doctorQuest3Done),
  'rocket-crew': () => game.finale === ROCKET.finaleAll,
  'rocket-solo': () => game.finale === ROCKET.finaleSolo,
  'rocket-send': () => game.finale === ROCKET.finaleSend,
  'playtime-1h': () => globalStats.totalPlaytime >= 3600,
  'playtime-10h': () => globalStats.totalPlaytime >= 36000,
  'first-dodge': () => (Number(game.flags.playerDodgeCount) || 0) >= 1,
  'first-talent': () => Object.values(game.talents).some((level) => level > 0),
  'first-spray': () => (Number(game.flags.sprayProcCount) || 0) >= 1,
  'magic-10': () => (Number(game.flags.magicPeak) || 0) >= 10,
  'insight-full': () => (Number(game.flags.insightPeak) || 0) >= 5,
  'first-sweep': () => (Number(game.flags.sweepHitCount) || 0) >= 1,
  'execution-3': () => (Number(game.flags.executeCount) || 0) >= 3,
  'first-break': () => (Number(game.flags.weaponBrokenCount) || 0) >= 1,
  'training-30': () => (Number(game.flags.trainingTotal) || 0) >= 30,
  'talents-12': () =>
    Object.values(game.talents).filter((level) => level > 0).length >= 12,
  'talent-master': () =>
    Object.values(TALENTS).some((talent) => (game.talents[talent.key] || 0) >= talent.maxLevel),
  'mutiny-fame': () => game.finale === '油轮沉没',
  'family-and-love': () => game.finale === '爱恨情仇',
  'straw-hat': () => game.finale === '远洋航行',
  'war-new-order': () => Boolean(game.flags.warPrepNewOrder),
  'war-without-zombies': () => Boolean(game.flags.warPrepTerminal),
}

let achievementGuard = false

/** 检查并解锁所有满足条件的成就；解锁时提示一次 */
export function checkAchievements() {
  if (achievementGuard || game.dead || game.screen !== 'game') return
  achievementGuard = true
  try {
    for (const [id, test] of Object.entries(ACHIEVEMENT_CHECKS)) {
      if (!test()) continue
      if (!unlockAchievement(id)) continue
      if (typeof window !== 'undefined') {
        notify(`成就解锁 · ${ACHIEVEMENT_NAMES[id] ?? id}`)
      }
    }
  } finally {
    achievementGuard = false
  }
}

function cloneInventory(source) {
  if (!Array.isArray(source)) return createEmptyBackpack()
  const size = Math.max(source.length, BACKPACK_SIZE)
  const inventory = createEmptyBackpack(size)
  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index]
    inventory[index] = entry ? { ...entry } : null
  }
  return inventory
}

function cloneEquipment(source) {
  return {
    melee: source?.melee ? { ...source.melee } : null,
    ranged: source?.ranged
      ? {
          ...source.ranged,
          cleanliness: Number.isFinite(source.ranged.cleanliness)
            ? source.ranged.cleanliness
            : CLEANLINESS_MAX,
        }
      : null,
  }
}

function cloneLoan(source) {
  if (!source) return null
  const loan = { ...source }
  // 旧存档没有这些字段：按平民贷款处理
  if (!Number.isFinite(loan.rank)) loan.rank = 0
  // 旧版到期日多算了一天，统一改为「第 10 天为最后还款日」
  if (!Number.isFinite(loan.termDays)) {
    loan.termDays = LOAN_TERM_DAYS
    if (Number.isFinite(loan.dueDay)) loan.dueDay -= 1
  }
  if (!Number.isFinite(loan.interest)) {
    loan.interest = Math.max(1, (Number(loan.due) || 0) - (Number(loan.principal) || 0))
  }
  if (!Number.isFinite(loan.graceDays)) loan.graceDays = loanTierByRank(loan.rank).graceDays
  if (typeof loan.graceUsed !== 'boolean') loan.graceUsed = false
  if (typeof loan.confiscated !== 'boolean') loan.confiscated = false
  if (typeof loan.defaulted !== 'boolean') loan.defaulted = false
  if (typeof loan.interestWaived !== 'boolean') loan.interestWaived = false
  return loan
}

function cloneQuests(source) {
  const result = {}
  if (!source || typeof source !== 'object') return result
  for (const [id, state] of Object.entries(source)) {
    if (state && typeof state === 'object') result[id] = { ...state }
  }
  return result
}

/** 旧版本把 M1911 误写成 m911，读档时统一迁移 */
function migrateLegacyItemIds() {
  for (const entry of game.inventory) {
    if (entry?.id === 'm911') entry.id = 'm1911'
  }
  for (const slot of ['melee', 'ranged']) {
    if (game.equipment[slot]?.id === 'm911') game.equipment[slot].id = 'm1911'
  }
}

function makeSavePayload() {
  return {
    version: 8,
    name: game.character,
    stats: { ...game.stats },
    inventory: game.inventory.map((entry) => (entry ? { ...entry } : null)),
    equipment: cloneEquipment(game.equipment),
    coins: game.coins,
    dawnCoins: game.dawnCoins,
    identity: game.identity,
    maxIdentity: game.maxIdentity,
    dawnIdentity: game.dawnIdentity,
    maxDawnIdentity: game.maxDawnIdentity,
    zombieKills: game.zombieKills,
    loan: cloneLoan(game.loan),
    day: game.day,
    phase: game.phase,
    cooldowns: { ...game.cooldowns },
    quests: cloneQuests(game.quests),
    flags: { ...game.flags },
    reputation: game.reputation,
    talents: { ...game.talents },
    training: { ...game.training },
    activeTalents: [...game.activeTalents],
    market: cloneStockMarket(game.market),
    playtime: currentPlaytime.value,
    savedAt: Date.now(),
  }
}

function applySlot(slot) {
  game.character = slot.name || DEFAULT_CHARACTER_NAME
  game.stats = { ...DEFAULT_STATS, ...slot.stats }
  game.inventory =
    Array.isArray(slot.inventory) && slot.inventory.length
      ? cloneInventory(slot.inventory)
      : createInitialBackpack()
  game.equipment = cloneEquipment(slot.equipment)
  game.coins = Math.max(0, roundToCents(Number(slot.coins) || 0))
  game.dawnCoins = Math.max(0, roundToCents(Number(slot.dawnCoins) || 0))
  game.maxIdentity = slot.maxIdentity ?? slot.identity ?? null
  // 旧存档身份名先迁移到新徽章体系（如旧「副首」并入总督），再按背包徽章重算
  const savedDawn = normalizeDawnIdentityName(slot.dawnIdentity)
  const savedMaxDawn = normalizeDawnIdentityName(slot.maxDawnIdentity) ?? savedDawn
  game.dawnIdentity = savedDawn
  game.maxDawnIdentity = savedMaxDawn
  game.zombieKills = Number(slot.zombieKills) || 0
  // 旧存档没有全局击杀统计：用当前存档累计值做下限，避免已有击杀被清零
  if (game.zombieKills > globalStats.totalKills) globalStats.totalKills = game.zombieKills
  game.loan = cloneLoan(slot.loan)
  game.day = slot.day || 1
  game.phase = Number.isFinite(slot.phase) ? slot.phase % PHASES.length : 0
  game.cooldowns = slot.cooldowns ? { ...slot.cooldowns } : {}
  game.quests = cloneQuests(slot.quests)
  game.flags = slot.flags && typeof slot.flags === 'object' ? { ...slot.flags } : {}
  game.reputation = Math.max(0, Number(slot.reputation) || 0)
  game.talents = Object.fromEntries(
    Object.values(TALENTS).map((talent) => [
      talent.key,
      Math.max(
        0,
        Math.min(talent.maxLevel, Math.round(Number(slot.talents?.[talent.key]) || 0)),
      ),
    ]),
  )
  game.training = Object.fromEntries(
    Object.keys(TALENTS).map((key) => [
      key,
      Math.max(0, Math.min(99, Math.round(Number(slot.training?.[key]) || 0))),
    ]),
  )

  const learnedTalents = Object.values(TALENTS)
    .filter((talent) => (game.talents[talent.key] || 0) > 0)
    .map((talent) => talent.key)
  if (Array.isArray(slot.activeTalents)) {
    game.activeTalents = [
      ...new Set(slot.activeTalents.filter((key) => learnedTalents.includes(key))),
    ].slice(0, TALENT_ACTIVE_LIMIT)
  } else {
    game.activeTalents = learnedTalents.slice(0, TALENT_ACTIVE_LIMIT)
  }
  game.market = normalizeStockMarket(slot.market) ?? createStockMarket(game.day)
  game.location = null
  game.dead = false
  game.deathReason = ''
  game.ending = ''
  game.finale = ''
  game.playtimeBase = slot.playtime || 0
  game.sessionSeconds = 0

  migrateLegacyItemIds()

  // 旧存档只有身份字段、没有徽章物品：按阵营分别补一枚对应的徽章
  const hasCityBadge = game.inventory.some((entry) => {
    const def = entry ? getItem(entry.id) : null
    return def?.category === 'identity' && def.faction !== 'dawn'
  })
  const hasDawnBadge = game.inventory.some((entry) => {
    const def = entry ? getItem(entry.id) : null
    return def?.category === 'identity' && def.faction === 'dawn'
  })
  if (!hasCityBadge && slot.identity) {
    addItem(game.inventory, identityItemId(slot.identity), 1)
  }
  if (!hasDawnBadge) {
    const dawnBadgeName = savedDawn ?? savedMaxDawn
    if (dawnBadgeName) addItem(game.inventory, dawnItemId(dawnBadgeName), 1)
  }
  syncIdentities()
  syncHpCap()
  checkStatDeaths()
  checkLoanDue()
}

/**
 * 进入游戏：先播放音乐，再预加载全部静态资源，加载完才切换到游戏画面
 */
export async function enterGame(slotIndex, { isNew = false, name = '' } = {}) {
  if (game.loading) return

  startMusic()
  game.loading = true
  game.progress = 0

  try {
    await Promise.all([
      preloadAssets((ratio) => {
        game.progress = ratio
      }),
      delay(1200),
    ])
  } finally {
    game.progress = 1
  }

  dismissTradeNotice()

  if (isNew) {
    game.character = normalizeCharacterName(name, DEFAULT_CHARACTER_NAME)
    game.stats = { ...DEFAULT_STATS }
    game.inventory = createInitialBackpack()
    game.equipment = { melee: null, ranged: null }
    game.coins = 0
    game.dawnCoins = 0
    game.identity = null
    game.maxIdentity = null
    game.dawnIdentity = null
    game.maxDawnIdentity = null
    game.zombieKills = 0
    game.loan = null
    game.day = 1
    game.phase = 0
    game.location = null
    game.cooldowns = {}
    game.dead = false
    game.deathReason = ''
    game.ending = ''
    game.quests = {}
    game.flags = {}
    game.finale = ''
    game.reputation = 0
    game.talents = {
      melee: 0,
      ranged: 0,
      arena: 0,
      corridor: 0,
      draw: 0,
      sword: 0,
      sniper: 0,
      block: 0,
      pistol: 0,
      spray: 0,
      assault: 0,
      slash: 0,
    }
    game.training = {
      melee: 0,
      ranged: 0,
      arena: 0,
      corridor: 0,
      draw: 0,
      sword: 0,
      sniper: 0,
      block: 0,
      pistol: 0,
      spray: 0,
      assault: 0,
      slash: 0,
    }
    game.activeTalents = []
    game.market = createStockMarket(1)
    game.playtimeBase = 0
    game.sessionSeconds = 0
  } else {
    applySlot(getSlot(slotIndex))
  }

  game.slotIndex = slotIndex
  game.screen = 'game'
  game.loading = false
  checkAchievements()

  if (isNew) {
    const result = writeSlot(slotIndex, makeSavePayload())
    if (!result.ok) notify(result.message, 4200)
    window.setTimeout(() => {
      if (unlockAchievement('awake')) notify('成就解锁 · 第零天')
    }, 1400)
  }
}

/** 修改幸存者名字：随时可用，存档时写入 */
export function renameCharacter(value) {
  if (game.dead) return ''
  const name = normalizeCharacterName(value)
  if (!name) return '名字不能为空。'
  if (name === game.character) return '档案上的名字没有变化。'
  game.character = name
  return `幸存者档案已更新：${name}。`
}

export function saveToSlot(index) {
  if (index === null || index === undefined) return { ok: false }
  const payload = makeSavePayload()
  // 写入前先估算占用：超限时给出明确提示，不触碰已有存档
  const preview = previewSlotWrite(index, payload)
  if (!preview.ok) {
    notify(preview.message, 4200)
    return { ok: false, message: preview.message }
  }
  const result = writeSlot(index, payload)
  if (!result.ok) {
    notify(result.message, 4200)
    return result
  }
  flushGlobalStats()
  notify(`进度已保存至存档 ${String(index + 1).padStart(2, '0')}`)
  return { ok: true }
}

export function loadFromSlot(index) {
  const slot = getSlot(index)
  if (!slot) {
    notify('该存档位为空')
    return
  }
  applySlot(slot)
  game.slotIndex = index
  notify(`已读取存档 ${String(index + 1).padStart(2, '0')}`)
}

export function leaveToMenu() {
  flushGlobalStats()
  game.screen = 'menu'
  game.slotIndex = null
  game.location = null
  game.dead = false
  game.deathReason = ''
  game.ending = ''
  game.finale = ''
  game.sessionSeconds = 0
  game.playtimeBase = 0
}

/** 游戏内每秒调用一次 */
export function tickPlaytime() {
  if (game.screen !== 'game') return
  game.sessionSeconds += 1
  addPlaytime(1)
  checkAchievements()
}

/* ===== 时间与状态 ===== */

export function adjustStats(changes) {
  for (const [key, delta] of Object.entries(changes)) {
    let value = delta
    if (devState.lockStats) {
      // 生命/饱食/口渴/理智/体力不再下降；感染不再上升
      value = key === 'infection' ? Math.min(0, delta) : Math.max(0, delta)
    }
    game.stats[key] = clampStat((game.stats[key] ?? 0) + value, key)
  }
  checkStatDeaths()
}

/** 战斗等外部模块使用：统一走属性结算与结局判定 */
export function applyStatChanges(changes) {
  adjustStats(changes)
}

/** 诗人公会保护的归零/满值属性：四项归零与感染值满 */
const POET_PROTECTED_STATS = new Set(['hunger', 'thirst', 'sanity', 'stamina', 'infection'])

/** 属性触发结局：饱食/口渴/理智/体力归零、感染满 100、生命归零 */
export function checkStatDeaths() {
  if (game.dead) return
  const poetGuild = activeGuild()
  const poet = poetGuild?.id === 'poet'
  let poetZero = false

  for (const rule of STAT_ENDINGS) {
    const value = game.stats[rule.key] ?? 0
    const triggered = rule.at >= 100 ? value >= rule.at : value <= rule.at
    if (!triggered) continue
    if (poet && POET_PROTECTED_STATS.has(rule.key)) {
      poetZero = true
      continue
    }
    die(rule.reason, rule.ending)
    return
  }

  if (!poetZero) return

  const turnKey = `${game.day}-${game.phase}`
  if (game.flags.poetLastDrain === turnKey) return
  const drain = Number(poetGuild?.zeroStatDrain) || 20
  game.flags.poetLastDrain = turnKey
  game.stats.hp = clampStat((game.stats.hp ?? 0) - drain, 'hp')
  if (game.stats.hp <= 0) {
    die('诗人公会的庇护终于耗尽。你没被饥渴和疲惫带走，但身体先一步停摆了。', '伤重不治')
    return
  }
  notify(`诗人公会的意志撑住了你：生命 -${drain}。`, 3000)
}

/** 收走背包里全部食物 / 饮品 / 药品，返回被收走的件数 */
function confiscateGoods() {
  const categories = new Set(['food', 'drink', 'medicine'])
  let seized = 0
  for (let index = 0; index < game.inventory.length; index += 1) {
    const entry = game.inventory[index]
    if (!entry) continue
    const def = getItem(entry.id)
    if (!categories.has(def?.category)) continue
    seized += entry.qty ?? 1
    game.inventory[index] = null
  }
  return seized
}

export function checkLoanDue() {
  if (!game.loan || game.dead) return
  if (game.loan.defaulted) return
  if (game.day <= game.loan.dueDay) return

  const tier = loanTierByRank(game.loan.rank)
  if (tier.deathOnDefault) {
    die(
      `借贷逾期：${game.loan.due} 末日币未还。第 ${game.loan.dueDay + 1} 天，放贷的人把你拖进了后巷。`,
      '高利贷',
    )
    return
  }

  game.loan.defaulted = true
  if (tier.confiscate && !game.loan.confiscated) {
    const seized = confiscateGoods()
    game.loan.confiscated = true
    notify(
      `借贷逾期：放贷人收走了你背包里的全部食物、饮品与药品（共 ${seized} 件）。欠款 ${game.loan.due} 末日币仍未结清，未还清前不能再借。`,
      3600,
    )
    return
  }

  notify(
    `借贷逾期：欠款 ${game.loan.due} 末日币尚未结清。未还清前，银行不会再借给你。`,
    3200,
  )
}

export function die(reason, ending = '') {
  if (game.dead) return
  game.dead = true
  game.deathReason = reason
  game.ending = ending
  // 「恶魔」在 FINALES 里有完整结局文案，补上 finale 让浮层优先展示；
  // 其余死亡结局没有对应文案，仍走死亡卡片。
  if (ending === '恶魔') game.finale = '恶魔'

  const direct = DEATH_ENDING_ACHIEVEMENTS[ending]
  if (direct && unlockAchievement(direct)) {
    notify(`成就解锁 · ${ACHIEVEMENT_NAMES[direct] ?? direct}`)
  }
  if (ATTRIBUTE_DEATHS.includes(ending)) {
    if (!globalStats.deathEndings.includes(ending)) globalStats.deathEndings.push(ending)
    const seen = globalStats.deathEndings.filter((name) => ATTRIBUTE_DEATHS.includes(name)).length
    if (seen >= ATTRIBUTE_DEATHS.length && unlockAchievement('death-reaper')) {
      notify('成就解锁 · 死神来了')
    }
  }
}

/** 深海氧气耗尽：溺水死亡结局 */
export function drownPlayer() {
  die('氧气耗尽。你向海面挣扎，四肢却越来越沉，最后连光都看不见了。', '溺水')
}

/** 丧尸击杀计数：存档内计数用于任务进度；全局计数用于曙光晋升（跨周目） */
export function recordZombieKill() {
  game.zombieKills += 1
  globalStats.totalKills = Math.max(0, Number(globalStats.totalKills) || 0) + 1
}

/** 身份以背包里的身份牌为准：两个阵营各取等级最高的一枚 */
export function syncIdentities() {
  let bestCity = null
  let bestDawn = null
  for (const entry of game.inventory) {
    if (!entry) continue
    const def = getItem(entry.id)
    if (def?.category !== 'identity') continue
    if (def.faction === 'dawn') {
      if (dawnRank(def.identityLevel) > dawnRank(bestDawn)) bestDawn = def.identityLevel
    } else if (identityRank(def.identityLevel) > identityRank(bestCity)) {
      bestCity = def.identityLevel
    }
  }

  game.identity = bestCity
  game.dawnIdentity = bestDawn
  if (bestCity && identityRank(bestCity) > identityRank(game.maxIdentity)) game.maxIdentity = bestCity
  if (bestDawn && dawnRank(bestDawn) > dawnRank(game.maxDawnIdentity)) {
    game.maxDawnIdentity = bestDawn
  }
}

/** 授予身份：清掉背包里同阵营的旧身份牌，放入新的徽章；放不下时恢复旧徽章，避免身份丢失 */
function grantFactionIdentity(faction, name) {
  const itemId = faction === 'dawn' ? dawnItemId(name) : identityItemId(name)
  if (!itemId) return false

  const cleared = []
  for (let index = 0; index < game.inventory.length; index += 1) {
    const entry = game.inventory[index]
    if (!entry) continue
    const def = getItem(entry.id)
    if (def?.category !== 'identity') continue
    const badgeFaction = def.faction === 'dawn' ? 'dawn' : 'city'
    if (badgeFaction === faction) {
      cleared.push({ index, entry })
      game.inventory[index] = null
    }
  }

  const leftover = addItem(game.inventory, itemId, 1)
  if (leftover > 0) {
    for (const { index, entry } of cleared) game.inventory[index] = entry
    syncIdentities()
    return false
  }
  syncIdentities()
  return true
}

export function grantIdentity(name) {
  return grantFactionIdentity('city', name)
}

export function grantDawnIdentity(name) {
  return grantFactionIdentity('dawn', name)
}

/* ===== 王宫冷却 ===== */

/** 距离下次可用还有几天，0 表示现在就能用 */
export function cooldownLeft(key, days) {
  const last = game.cooldowns?.[key]
  if (last === undefined) return 0
  return Math.max(0, days - (game.day - last))
}

export function useCooldown(key, days) {
  if (cooldownLeft(key, days) > 0) return false
  game.cooldowns[key] = game.day
  return true
}

/**
 * 推进回合：每回合扣 5 点口渴 / 饱食 / 体力、2 点理智；每 8 回合进入新的一天
 * decay = false 时（睡觉/小憩跳过的回合）不结算普通衰减
 */
export function advanceTurns(count, { decay = true } = {}) {
  for (let i = 0; i < count && !game.dead; i += 1) {
    if (decay) adjustStats(TURN_COST)
    game.phase += 1
    if (game.phase >= PHASES.length) {
      game.phase = 0
      game.day += 1
      processTradeSales()
    }
    checkLoanDue()
  }
  if (game.market) ensureStockMarketDay()
  checkAchievements()
}

/** 背包中是否持有精灵宝石（被动道具，不消耗） */
function hasFairyGem() {
  return game.inventory.some((entry) => entry?.id === 'fairy-gem')
}

/** 精灵茶会 / 大精灵床的每日计数：按开始行动的那一天记录，跨天自动归零 */
function fairyRestDayState() {
  const state = game.flags.fairyRest
  if (!state || state.day !== game.day) return { day: game.day, tea: 0, bed: 0 }
  return {
    day: game.day,
    tea: Math.max(0, Number(state.tea) || 0),
    bed: Math.max(0, Number(state.bed) || 0),
  }
}

/** 今日剩余次数；没有每日上限的选项返回 Infinity */
export function fairyRestLeft(kind) {
  const limit = REST_OPTIONS[kind]?.dailyLimit
  if (!limit) return Infinity
  const state = fairyRestDayState()
  return Math.max(0, limit - (state[kind] || 0))
}

/** 随机掉落：饮品复用探索掉落池，药品复用宫廷赠品的随机药品池 */
function pickFairyDrop(category) {
  if (category === 'drink') {
    const pool = exploreLootPool('drink')
    if (!pool.length) return null
    return pool[Math.floor(Math.random() * pool.length)].id
  }
  return pickRandomMedicine()
}

export function sleepRest(kind) {
  const option = REST_OPTIONS[kind]
  if (!option || game.dead) return
  if (game.location) {
    notify('只有在安全屋才能睡觉')
    return
  }
  if (option.gemOnly && !hasFairyGem()) {
    notify('需要持有精灵宝石才能选择这项休息。', 3200)
    return
  }

  // 每日次数按开始行动的那一天结算，跨天自动从 0 重新计数
  const actionDay = game.day
  const actionState = fairyRestDayState()
  if (option.dailyLimit && fairyRestLeft(kind) <= 0) {
    notify(`${option.name}今天已经用满 ${option.dailyLimit} 次了，明天再来。`, 3200)
    return
  }

  advanceTurns(option.turns, { decay: false })
  if (game.dead) return

  adjustStats(option.effects)
  if (game.dead) return

  const summary = Object.entries(option.effects)
    .map(([key, value]) => `${STAT_LABELS[key] ?? key} ${value > 0 ? '+' : ''}${value}`)
    .join('，')
  const notes = []

  if (option.dailyLimit) {
    game.flags.fairyRest = {
      ...actionState,
      day: actionDay,
      [kind]: (actionState[kind] || 0) + 1,
    }
    notes.push(`今日 ${actionState[kind] + 1} / ${option.dailyLimit}`)
  }

  if (option.dropCategory) {
    const dropId = pickFairyDrop(option.dropCategory)
    if (dropId) {
      const def = getItem(dropId)
      const leftover = addItem(game.inventory, dropId, 1)
      if (leftover > 0) notes.push(`背包已满，${def?.name ?? '掉落物'} ×${leftover} 留在了原地`)
      else notes.push(`获得${def?.name ?? '掉落物'} ×1`)
    }
  }

  notify(
    `${option.name} · 跳过 ${option.turns} 回合 · ${summary}${notes.length ? ` · ${notes.join(' · ')}` : ''}`,
    3600,
  )
}

/* ===== 地图 ===== */

/**
 * 进入地图。freeEntry 为 true 时跳过入场消耗，但仍执行全部校验
 * （开放状态 / 解锁天数 / 港口封禁 / hidden / 身份冲突 / 当前区域）。
 */
export function enterMap(mapId, { freeEntry = false } = {}) {
  if (game.dead) return false
  const map = MAPS.find((item) => item.id === mapId)
  if (!map) return false
  if (!map.open) {
    notify(`「${map.name}」尚未开放`)
    return false
  }
  if (map.unlockDay && game.day < map.unlockDay) {
    notify(`「${map.name}」要到第 ${map.unlockDay} 天后才会开放（当前第 ${game.day} 天）`, 3200)
    return false
  }
  const portBanUntil = Number(game.flags.portBanUntilDay) || 0
  if (portBanUntil > game.day && HARBOR_MUTINY.banMapIds.includes(mapId)) {
    notify(
      `油轮沉没后你的名声臭了：还有 ${portBanUntil - game.day} 天无法进入「${map.name}」。`,
      3600,
    )
    return false
  }
  if (map.hidden) {
    notify(`「${map.name}」不在这条路上，得另找入口`, 3200)
    return false
  }
  if (mapId === 'dawn-post' && game.identity) {
    notify(`你带着「${game.identity}」的都城徽章，曙光哨兵不会放你进去`, 3200)
    return false
  }
  if (mapId === 'ruined-city' && game.dawnIdentity) {
    notify(`你带着「${game.dawnIdentity}」的曙光徽章，都城守卫不会放你进去`, 3200)
    return false
  }
  if (game.location === mapId) return true
  if (game.location) {
    notify('请先离开当前区域')
    return false
  }

  if (!freeEntry) adjustStats(ENTRY_COST)
  game.location = mapId
  if (fieldMapById(mapId)) {
    const visited = Array.isArray(game.flags.visitedMaps) ? game.flags.visitedMaps : []
    if (!visited.includes(mapId)) visited.push(mapId)
    game.flags.visitedMaps = visited
  }
  if (mapId === 'dawn-post') {
    const unlocked = unlockAchievement('dawn-seen')
    notify(
      unlocked
        ? `进入「${map.name}」 · 成就解锁 · 望见曙光`
        : freeEntry
          ? `进入「${map.name}」`
          : `进入「${map.name}」 · 口渴 / 饱食 / 体力 -5`,
      3200,
    )
  } else {
    notify(
      freeEntry
        ? `进入「${map.name}」`
        : `进入「${map.name}」 · 口渴 / 饱食 / 体力 -5`,
    )
  }
  return true
}

export function leaveMap() {
  game.location = null
}

/* ===== 乌托邦 · 自由贸易 ===== */

function tradeListingsArray() {
  if (!Array.isArray(game.flags.tradeListings)) game.flags.tradeListings = []
  return game.flags.tradeListings
}

/** 跨天结算托管摊位：按品质与定价掷出成交，剩余继续挂着 */
export function processTradeSales() {
  const listings = Array.isArray(game.flags.tradeListings) ? game.flags.tradeListings : []
  if (!listings.length) return

  const kept = []
  const sold = []
  for (const listing of listings) {
    const def = getItem(listing?.itemId)
    if (!def?.weapon) continue
    const days = Math.max(1, game.day - (Number(listing.listedDay) || game.day))
    const bonus = hasServicePermit('trade-license') ? 0.05 : 0
    const chance = tradeSaleChance(def, Number(listing.price) || 0, days, bonus)
    if (chance > 0 && Math.random() < chance) {
      const price = Number(listing.price) || 0
      sold.push({ name: def.name, price })
      game.flags.tradeIncome = Math.max(0, Number(game.flags.tradeIncome) || 0) + price
    } else {
      kept.push(listing)
    }
  }

  game.flags.tradeListings = kept
  game.flags.tradeReport = { day: game.day, sales: sold, remaining: kept.length }

  if (!sold.length) return
  const total = sold.reduce((sum, item) => sum + item.price, 0)
  tradeNotice.sales.push(...sold)
  tradeNotice.total += total
  tradeNotice.day = game.day
  notify(`自由贸易 · 售出 ${sold.length} 件，收入 ${total} 末日币待领取。`, 3600)
}

/** 上架背包里的近战 / 远程武器，价格由玩家自定义（末日币） */
export function listTradeItem(slotIndex, price) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '自由贸易在乌托邦城。'
  if (!activeGuildId()) return '需要任意公会徽章才能进入自由贸易。'

  const listings = tradeListingsArray()
  if (listings.length >= TRADE_LISTING_LIMIT) {
    return `摊位最多同时上架 ${TRADE_LISTING_LIMIT} 件，先下架一件。`
  }

  const entry = game.inventory[slotIndex]
  if (!entry) return '背包里没有这件东西。'
  const def = getItem(entry.id)
  if (def?.category !== 'melee' && def?.category !== 'ranged') {
    return '自由贸易只接收近战和远程武器。'
  }

  const value = Math.floor(Number(price))
  if (!Number.isFinite(value) || value < 1) return '定价至少为 1 末日币。'
  if (value > 9999) return '单件定价不能超过 9999 末日币。'

  const seq = (Number(game.flags.tradeSeq) || 0) + 1
  game.flags.tradeSeq = seq
  const listing = {
    id: `trade-${seq}`,
    itemId: entry.id,
    durability: Number.isFinite(entry.durability) ? entry.durability : null,
    cleanliness: Number.isFinite(entry.cleanliness) ? entry.cleanliness : null,
    price: value,
    listedDay: game.day,
  }
  game.flags.tradeListings = [...listings, listing]
  game.inventory[slotIndex] = null

  const chance = tradeSaleChance(
    def,
    value,
    1,
    hasServicePermit('trade-license') ? 0.05 : 0,
  )
  const chanceText = chance >= 1 ? '必被拿走' : `成交概率 ${Math.round(chance * 100)}%`
  return `${def.name}已上架，定价 ${value} 末日币，次日${chanceText}。`
}

/** 下架托管武器，连同当时的耐久 / 清洁度一起放回背包 */
export function delistTradeItem(listingId) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '自由贸易在乌托邦城。'
  if (!activeGuildId()) return '需要任意公会徽章才能进入自由贸易。'

  const listings = tradeListingsArray()
  const listing = listings.find((item) => item.id === listingId)
  if (!listing) return '摊位上没有这件东西。'

  const emptyIndex = game.inventory.findIndex((entry) => !entry)
  if (emptyIndex === -1) return '背包已满，先腾出一格再下架。'

  const def = getItem(listing.itemId)
  const entry = { id: listing.itemId, qty: 1 }
  if (def?.category === 'ranged') {
    entry.cleanliness = Number.isFinite(listing.cleanliness) ? listing.cleanliness : CLEANLINESS_MAX
  } else {
    entry.durability = Number.isFinite(listing.durability)
      ? listing.durability
      : (def?.weapon?.durability ?? null)
  }
  game.inventory[emptyIndex] = entry
  game.flags.tradeListings = listings.filter((item) => item.id !== listingId)
  return `${def?.name ?? '武器'}已下架，回到背包。`
}

/** 领取自由贸易待入账的末日币 */
export function collectTradeIncome() {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '自由贸易的账要在乌托邦城结。'
  if (!activeGuildId()) return '需要任意公会徽章才能进入自由贸易。'

  const amount = Math.max(0, roundToCents(Number(game.flags.tradeIncome) || 0))
  if (amount <= 0) return '没有待领取的收入。'
  game.flags.tradeIncome = 0
  game.coins += amount
  return `自由贸易收入入账：末日币 +${amount}。`
}

/* ===== 投资中心 ===== */

function clampStockPrice(value, fallback) {
  const price = value === null || value === undefined || value === '' ? NaN : Number(value)
  if (!Number.isFinite(price)) return fallback
  return Math.max(
    STOCK_PRICE_MIN,
    Math.min(STOCK_PRICE_MAX, roundToCents(price)),
  )
}

function createStockMarket(day) {
  const prices = {}
  for (const stock of AIRSHIP_STOCKS) {
    prices[stock.id] = clampStockPrice(stock.basePrice, stock.basePrice)
  }
  return {
    day,
    prices,
    prev: { ...prices },
    holdings: {},
    realized: 0,
    realizedRaw: 0,
  }
}

function normalizeStockMarket(raw) {
  if (!raw || typeof raw !== 'object') return null

  const prices = {}
  const prev = {}
  for (const stock of AIRSHIP_STOCKS) {
    prices[stock.id] = clampStockPrice(raw.prices?.[stock.id], stock.basePrice)
    prev[stock.id] = clampStockPrice(raw.prev?.[stock.id], prices[stock.id])
  }

  const holdings = {}
  for (const stock of AIRSHIP_STOCKS) {
    const holding = raw.holdings?.[stock.id]
    const shares = Math.max(0, Math.floor(Number(holding?.shares) || 0))
    const cost = Math.max(0, Number(holding?.cost) || 0)
    if (shares > 0) holdings[stock.id] = { shares, cost }
  }

  const realized = roundToCents(Number(raw.realized) || 0)
  const realizedRaw = Number.isFinite(Number(raw.realizedRaw))
    ? Number(raw.realizedRaw)
    : realized

  return {
    day: Math.max(0, Math.floor(Number(raw.day) || 0)),
    prices,
    prev,
    holdings,
    realized,
    realizedRaw,
  }
}

function cloneStockMarket(market) {
  if (!market) return null
  const holdings = {}
  for (const [id, holding] of Object.entries(market.holdings ?? {})) {
    holdings[id] = { shares: holding.shares, cost: holding.cost }
  }
  return {
    day: market.day,
    prices: { ...market.prices },
    prev: { ...market.prev },
    holdings,
    realized: market.realized,
    realizedRaw: market.realizedRaw ?? market.realized,
  }
}

/** 推进到当前天的行情；同一天内价格保持不变 */
export function ensureStockMarketDay() {
  if (!game.market) {
    game.market = createStockMarket(game.day)
    return
  }
  if (game.market.day >= game.day) {
    if (game.market.day > game.day) game.market.day = game.day
    return
  }

  let prices = { ...game.market.prices }
  let prev = { ...prices }
  for (let day = game.market.day + 1; day <= game.day; day += 1) {
    prev = { ...prices }
    prices = rollStockPrices(prices, day)
  }
  game.market.prev = prev
  game.market.prices = prices
  game.market.day = game.day
}

/** 打开终端或交易前同步行情 */
export function syncStockMarket() {
  if (game.dead || game.location !== AIRSHIP.mapId) return
  ensureStockMarketDay()
}

/** 买入股票：按当日价成交，手续费 1%（最低 0.1 币） */
export function buyAirshipStock(stockId, quantity) {
  if (game.dead) return ''
  if (game.location !== AIRSHIP.mapId) return '投资中心在末日飞行船上。'
  const stock = AIRSHIP_STOCKS.find((item) => item.id === stockId)
  if (!stock) return ''

  const qty = Math.floor(Number(quantity) || 0)
  if (qty <= 0) return '请输入买入数量。'
  ensureStockMarketDay()

  const price = game.market.prices[stockId]
  const gross = roundToCents(price * qty)
  const fee = stockTradeFee(gross)
  const total = roundToCents(gross + fee)
  if (game.coins < total) {
    return `末日币不足，买入需要 ${formatMoney(total)} 枚（含 ${formatMoney(fee)} 手续费）。`
  }

  const holding = game.market.holdings[stockId] ?? { shares: 0, cost: 0 }
  holding.shares += qty
  holding.cost = roundToCents(holding.cost + total)
  game.market.holdings[stockId] = holding
  game.coins = roundToCents(game.coins - total)
  return `买入 ${stock.name} ${qty} 股，单价 ${formatMoney(price)}，手续费 ${formatMoney(fee)}，共 ${formatMoney(total)} 末日币。`
}

/** 卖出股票：按平均成本结转，按累计盈亏取整，避免多次卖出产生 1 币误差 */
export function sellAirshipStock(stockId, quantity) {
  if (game.dead) return ''
  if (game.location !== AIRSHIP.mapId) return '投资中心在末日飞行船上。'
  const stock = AIRSHIP_STOCKS.find((item) => item.id === stockId)
  if (!stock) return ''

  const qty = Math.floor(Number(quantity) || 0)
  if (qty <= 0) return '请输入卖出数量。'
  ensureStockMarketDay()

  const holding = game.market.holdings[stockId]
  if (!holding || holding.shares < qty) {
    return `持有不足，当前只有 ${holding?.shares ?? 0} 股 ${stock.name}。`
  }

  const price = game.market.prices[stockId]
  const gross = roundToCents(price * qty)
  const fee = stockTradeFee(gross)
  const proceeds = roundToCents(gross - fee)
  if (proceeds < 0) {
    return `当前价格过低，卖出 ${qty} 股所得不足以支付 ${formatMoney(fee)} 手续费。`
  }
  const cost = holding.cost * (qty / holding.shares)
  const rawPnl = proceeds - cost

  const previousRaw = Number.isFinite(Number(game.market.realizedRaw))
    ? Number(game.market.realizedRaw)
    : Number(game.market.realized) || 0
  const previousRounded = Number(game.market.realized) || 0
  const rawTotal = Math.round((previousRaw + rawPnl) * 1e6) / 1e6
  const roundedTotal = stockProfitRounded(rawTotal)
  const realized = roundedTotal - previousRounded

  holding.shares -= qty
  holding.cost -= cost
  if (holding.shares <= 0) {
    holding.shares = 0
    holding.cost = 0
  }
  game.market.holdings[stockId] = holding
  game.coins = roundToCents(game.coins + proceeds)
  game.market.realized = roundedTotal
  game.market.realizedRaw = rawTotal

  const pnlText = realized > 0 ? `+${formatMoney(realized)}` : formatMoney(realized)
  return `卖出 ${stock.name} ${qty} 股，单价 ${formatMoney(price)}，手续费 ${formatMoney(fee)}，到账 ${formatMoney(proceeds)} 末日币。本次盈亏 ${pnlText}。`
}


export function hasServicePermit(permitId) {
  return Boolean(game.flags.servicePermits?.[permitId])
}
