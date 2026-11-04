import { computed, reactive, watch } from 'vue'
import { ACHIEVEMENTS, DEFAULT_CHARACTER_NAME, DEFAULT_STATS, MAPS, STAT_DEFS, STAT_ENDINGS } from './config'
import { preloadAssets } from './assets'
import { startMusic } from './music'
import {
  BACKPACK_MAX_SIZE,
  BACKPACK_SIZE,
  BANKER,
  CLEANLINESS_MAX,
  CLEANLINESS_PER_SHOT,
  COMPANIONS,
  DAWN_JOIN_KILLS,
  DAWN_BOND_SHOP,
  DAWN_MARKET,
  DAWN_PROMOTIONS,
  DAWN_RELIEF_TIERS,
  DAWN_SALARY,
  DAWN_SERVICE,
  DEV_SHOP,
  DOCTOR,
  ENTRY_COST,
  EXCHANGE_BASKET_PRICE,
  FISH_PROCESSING,
  KRAKEN_BLADE_CRAFT,
  exchangeRateFromIncome,
  expandPriceAtSize,
  floorToCents,
  GARAGE,
  GARDEN,
  GUILD_BY_ID,
  GUILD_COMMISSION_REWARD,
  HARBOR_MUTINY,
  GIANT_PUPPET,
  HELICOPTER,
  AIRSHIP,
  AIRSHIP_SHOP_GOODS,
  AIRSHIP_STOCKS,
  ARENA,
  CORRIDOR,
  TALENTS,
  TALENT_ACTIVE_LIMIT,
  TALENT_EFFECT_LABELS,
  UTOPIA_TRAINING_BY_KIND,
  STOCK_PRICE_MAX,
  STOCK_PRICE_MIN,
  TAVERN_COCKTAILS,
  TRADE_LISTING_LIMIT,
  commissionForDay,
  dawnInfo,
  formatMoney,
  oilPriceForDay,
  recyclePriceForDay,
  rollStockPrices,
  roundToCents,
  stockProfitRounded,
  stockTradeFee,
  ITEMS,
  KNIGHT_COST,
  LABOR_TIERS,
  LOAN_TERM_DAYS,
  LULU,
  MA_SAN,
  MAFEI,
  MERMAID,
  ORCHARD,
  PALACE_COOLDOWN,
  PALACE_COUNCILS,
  PALACE_DANCES,
  PALACE_BANQUETS,
  PALACE_ROOMS,
  PALACE_SALARY,
  PALACE_SHOP,
  PHASES,
  REPAIR_PERCENT_PER_COIN,
  REST_OPTIONS,
  RESTAURANT_DISHES,
  ROCKET,
  ROTTEN_SEED,
  SHOP_GOODS,
  SERVICE_CENTER_EXPRESS_DAWN,
  SERVICE_PERMITS,
  STRANGE_BARBECUE,
  TREATMENT_TIERS,
  TURN_COST,
  YANRAN,
  addItem,
  canStoreItems,
  countItem,
  createEmptyBackpack,
  createInitialBackpack,
  dawnItemId,
  dawnRank,
  fieldMapById,
  getItem,
  identityItemId,
  identityRank,
  isCannedItem,
  isFruitItem,
  isSpiritItem,
  loanInterest,
  loanTierByRank,
  loanTierFor,
  mayorForDay,
  NPCS,
  npcById,
  organizeInventory,
  pickCityLoot,
  pickCompanionLoot,
  pickDawnFruit,
  pickDawnMeal,
  pickFieldLoot,
  pickMeleeByTier,
  pickRandomMedicine,
  pickZombie,
  questById,
  questLine,
  removeItem,
  repairCoinCost,
  repairPriceForTier,
  talentBonus,
  talentEffects,
  talentTitle,
  tradeSaleChance,
  treasureForDay,
} from '../data'
import {
  addPlaytime,
  flushGlobalStats,
  getSlot,
  globalStats,
  unlockAchievement,
  writeSlot,
} from './save'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const CHARACTER_NAME_MAX = 16

/** 名字去掉首尾空白并限制长度；空名字回落到默认名 */
export function normalizeCharacterName(value, fallback = '') {
  const text = String(value ?? '').trim().slice(0, CHARACTER_NAME_MAX)
  return text || fallback
}

const STAT_LABELS = Object.fromEntries(STAT_DEFS.map((stat) => [stat.key, stat.label]))

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

const clampStat = (value, key = '') =>
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
  'dawn-officer': () => dawnRank(game.dawnIdentity) >= 1,
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
  'dawn-command': () => dawnRank(game.maxDawnIdentity) >= 2,
  'dawn-deputy': () => dawnRank(game.maxDawnIdentity) >= 3,
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
  game.maxDawnIdentity = slot.maxDawnIdentity ?? slot.dawnIdentity ?? null
  game.zombieKills = Number(slot.zombieKills) || 0
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

  // 旧存档只有身份字段、没有徽章物品：读档时补一枚对应的徽章
  const hasBadge = game.inventory.some((entry) => entry && getItem(entry.id)?.category === 'identity')
  if (!hasBadge) {
    if (slot.identity) addItem(game.inventory, identityItemId(slot.identity), 1)
    if (slot.dawnIdentity) addItem(game.inventory, dawnItemId(slot.dawnIdentity), 1)
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
    writeSlot(slotIndex, makeSavePayload())
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
  if (index === null || index === undefined) return
  writeSlot(index, makeSavePayload())
  flushGlobalStats()
  notify(`进度已保存至存档 ${String(index + 1).padStart(2, '0')}`)
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

function adjustStats(changes) {
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

/** 诗人公会保护的四项归零属性 */
const POET_PROTECTED_STATS = new Set(['hunger', 'thirst', 'sanity', 'stamina'])

/** 属性触发结局：饱食/口渴/理智/体力归零、感染满 100、生命归零 */
function checkStatDeaths() {
  if (game.dead) return
  const poet = activeGuildId() === 'poet'
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
  game.flags.poetLastDrain = turnKey
  game.stats.hp = clampStat((game.stats.hp ?? 0) - 25, 'hp')
  if (game.stats.hp <= 0) {
    die('诗人公会的庇护终于耗尽。你没被饥渴和疲惫带走，但身体先一步停摆了。', '伤重不治')
    return
  }
  notify('诗人公会的意志撑住了你：生命 -25。', 3000)
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

function checkLoanDue() {
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

function die(reason, ending = '') {
  if (game.dead) return
  game.dead = true
  game.deathReason = reason
  game.ending = ending
  if (ending === '恶魔' && unlockAchievement('death-list')) {
    notify('成就解锁 · 死亡名单')
  }
}

/** 深海氧气耗尽：溺水死亡结局 */
export function drownPlayer() {
  die('氧气耗尽。你向海面挣扎，四肢却越来越沉，最后连光都看不见了。', '溺水')
}

/** 身份以背包里的身份牌为准：两个阵营各取等级最高的一枚 */
function syncIdentities() {
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

/** 授予身份：清掉背包里同阵营的旧身份牌，放入新的徽章 */
function grantFactionIdentity(faction, name) {
  const itemId = faction === 'dawn' ? dawnItemId(name) : identityItemId(name)
  if (!itemId) return false

  for (let index = 0; index < game.inventory.length; index += 1) {
    const entry = game.inventory[index]
    if (!entry) continue
    const def = getItem(entry.id)
    if (def?.category !== 'identity') continue
    const badgeFaction = def.faction === 'dawn' ? 'dawn' : 'city'
    if (badgeFaction === faction) game.inventory[index] = null
  }

  const leftover = addItem(game.inventory, itemId, 1)
  syncIdentities()
  if (leftover > 0) return false
  return true
}

function grantIdentity(name) {
  return grantFactionIdentity('city', name)
}

function grantDawnIdentity(name) {
  return grantFactionIdentity('dawn', name)
}

/* ===== 王宫冷却 ===== */

/** 距离下次可用还有几天，0 表示现在就能用 */
export function cooldownLeft(key, days) {
  const last = game.cooldowns?.[key]
  if (last === undefined) return 0
  return Math.max(0, days - (game.day - last))
}

function useCooldown(key, days) {
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

export function sleepRest(kind) {
  const option = REST_OPTIONS[kind]
  if (!option || game.dead) return
  if (game.location) {
    notify('只有在安全屋才能睡觉')
    return
  }

  advanceTurns(option.turns, { decay: false })
  if (game.dead) return

  const fairyGem = game.inventory.some((entry) => entry?.id === 'fairy-gem')
  const effects = fairyGem
    ? Object.fromEntries(Object.entries(option.effects).filter(([, value]) => value > 0))
    : option.effects
  adjustStats(effects)
  const summary = Object.entries(effects)
    .map(([key, value]) => `${STAT_LABELS[key] ?? key} ${value > 0 ? '+' : ''}${value}`)
    .join('，')
  const note = fairyGem ? ' · 精灵宝石抵掉了负面消耗' : ''
  notify(`${option.name} · 跳过 ${option.turns} 回合 · ${summary}${note}`, 3200)
}

/* ===== 地图 ===== */

export function enterMap(mapId) {
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

  adjustStats(ENTRY_COST)
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
        : `进入「${map.name}」 · 口渴 / 饱食 / 体力 -5`,
      3200,
    )
  } else {
    notify(`进入「${map.name}」 · 口渴 / 饱食 / 体力 -5`)
  }
  return true
}

export function leaveMap() {
  game.location = null
}

/* ===== 乌托邦训练 ===== */

function utopiaTrainingDayState() {
  const state = game.flags.utopiaTraining
  if (!state || state.day !== game.day) return { day: game.day }
  return { ...state }
}

/** 今日该训练的剩余次数 */
export function utopiaTrainingLeft(kind) {
  if (!UTOPIA_TRAINING_BY_KIND[kind]) return 0
  const state = utopiaTrainingDayState()
  return Math.max(0, utopiaTrainingLimit() - (Number(state[kind]) || 0))
}

/** 每日训练次数：办理训练许可后从 2 次提高到 3 次 */
export function utopiaTrainingLimit() {
  return hasServicePermit('training-permit') ? 3 : 2
}

function utopiaTrainingGuard(kind) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '训练场在乌托邦城。'
  const training = UTOPIA_TRAINING_BY_KIND[kind]
  if (!training) return '没有这个训练。'
  if ((game.talents[kind] || 0) >= TALENTS[kind].maxLevel) {
    return '这项天赋已经满级。'
  }
  if (utopiaTrainingLeft(kind) <= 0) {
    return `今天这项训练已经做满 ${utopiaTrainingLimit()} 次了。`
  }

  if (training.weaponSlot === 'melee') {
    const equipped = game.equipment.melee
    if (!equipped || !training.weaponIds.includes(equipped.id)) {
      return `需要装备：${training.weaponText}`
    }
    const def = getItem(equipped.id)
    const max = def?.weapon?.durability
    const current = Number.isFinite(equipped.durability) ? equipped.durability : max
    if (!Number.isFinite(max) || current < 10) {
      return '武器耐久不足 10，先去保养。'
    }
  } else {
    const equipped = game.equipment.ranged
    if (!equipped || !training.weaponIds.includes(equipped.id)) {
      return `需要装备：${training.weaponText}`
    }
    const current = Number.isFinite(equipped.cleanliness)
      ? equipped.cleanliness
      : CLEANLINESS_MAX
    if (current < 10) return '武器清洁度不足 10，先去保养。'
  }
  return ''
}

/** 乌托邦六种专项训练：1 回合、10 消耗、每天 2 次（训练许可后 3 次）、每次 5-10 进度 */
export function utopiaTrain(kind) {
  const blocked = utopiaTrainingGuard(kind)
  if (blocked) return blocked

  const training = UTOPIA_TRAINING_BY_KIND[kind]
  const actionDay = game.day
  const actionState = utopiaTrainingDayState()
  advanceTurns(1)
  if (game.dead) return ''

  const notes = []
  if (training.weaponSlot === 'melee') {
    const equipped = game.equipment.melee
    const def = getItem(equipped.id)
    const max = def?.weapon?.durability
    const current = Number.isFinite(equipped.durability) ? equipped.durability : max
    equipped.durability = Math.max(0, current - 10)
    notes.push(`训练消耗 ${def?.name ?? '近战武器'} 耐久 10。`)
    if (equipped.durability <= 0) {
      game.equipment.melee = null
      syncHpCap()
      notes.push(`${def?.name ?? '武器'}在训练中断裂了。`)
      if (typeof window !== 'undefined') notify(`${def?.name ?? '武器'}已经断裂`, 3000)
    }
  } else {
    const equipped = game.equipment.ranged
    const def = getItem(equipped.id)
    const current = Number.isFinite(equipped.cleanliness)
      ? equipped.cleanliness
      : CLEANLINESS_MAX
    equipped.cleanliness = Math.max(0, current - 10)
    notes.push(`训练消耗 ${def?.name ?? '远程武器'} 清洁度 10。`)
    if (equipped.cleanliness <= 0) {
      notes.push(`${def?.name ?? '远程武器'}的清洁度归零，需要保养。`)
      if (typeof window !== 'undefined') notify(`${def?.name ?? '远程武器'}需要保养`, 3000)
    }
  }

  const gain = 5 + Math.floor(Math.random() * 6)
  let level = game.talents[kind] || 0
  let progress = (game.training[kind] || 0) + gain
  while (level < TALENTS[kind].maxLevel && progress >= 100) {
    level += 1
    progress -= 100
  }
  if (level >= TALENTS[kind].maxLevel) progress = 0

  const before = game.talents[kind] || 0
  game.talents[kind] = level
  game.training[kind] = progress
  if (level > before) {
    const title = talentTitle(kind, level)
    notes.push(`天赋提升 · ${title}`)
    autoEnableTalent(kind)
    if (!isTalentActive(kind)) {
      notes.push(`启用位已满 ${TALENT_ACTIVE_LIMIT} 个，新天赋尚未启用，请到天赋面板调整。`)
    }
    if (typeof window !== 'undefined') notify(`天赋提升 · ${title}`, 3400)
  }

  const next = { ...actionState, day: actionDay }
  next[kind] = (Number(actionState[kind]) || 0) + 1
  game.flags.utopiaTraining = next
  const progressText = level >= TALENTS[kind].maxLevel ? '已满级' : `${progress}%`
  notes.unshift(`${training.name}完成。熟练度 +${gain}，当前 ${progressText}。`)
  notes.push(`今日剩余训练次数：${utopiaTrainingLeft(kind)}`)
  return notes.join('\n')
}


/** 沿街乞讨：1 回合，五档各 20%；盗贼公会奖励翻倍 */
export function begUtopia() {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '沿街乞讨在乌托邦城。'

  advanceTurns(1)
  if (game.dead) return ''

  recordGuildBeg()

  const guild = activeGuild()
  const multiplier = guild?.beggingMultiplier ?? 1
  const roll = Math.random()

  if (roll < 0.2) {
    game.coins += 1 * multiplier
    return `一个路人丢下 ${1 * multiplier} 枚末日币，没有看你第二眼。`
  }
  if (roll < 0.4) {
    game.dawnCoins += 1 * multiplier
    return `有人把 ${1 * multiplier} 枚曙光币塞进你手里，像在打发一条野狗。`
  }

  const category = roll < 0.6 ? 'drink' : roll < 0.8 ? 'food' : 'fruit'
  const pool = Object.values(ITEMS).filter((item) => {
    if (item.limited || item.special) return false
    if (category === 'fruit') return Boolean(item.fruit)
    if (category === 'food') return item.category === 'food' && !item.fruit
    return item.category === category
  })
  if (!pool.length) return '今天没有人愿意施舍。'

  const item = pool[Math.floor(Math.random() * pool.length)]
  const qty = 1 * multiplier
  const leftover = addItem(game.inventory, item.id, qty)
  const added = qty - leftover
  if (added <= 0) return `有人递来 ${item.name}，但你的背包已经塞满了。`
  return `有人递来 ${item.name} ×${added}${leftover > 0 ? '（背包已满）' : ''}。`
}

/* ===== 乌托邦 · 红灯街区 ===== */

const RED_LIGHT_GOODS = new Set(['food', 'drink', 'medicine'])

/** 从背包随机拿走一份食物 / 饮品 / 药品；没有可偷的东西时返回 null */
function stealRedLightGoods() {
  const candidates = []
  game.inventory.forEach((entry, index) => {
    if (!entry) return
    if (!RED_LIGHT_GOODS.has(getItem(entry.id)?.category)) return
    candidates.push({ index, entry })
  })
  if (!candidates.length) return null

  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  const def = getItem(pick.entry.id)
  const qty = pick.entry.qty ?? 1
  if (qty > 1) pick.entry.qty = qty - 1
  else game.inventory[pick.index] = null
  return { name: def?.name ?? pick.entry.id, qty: 1 }
}

/** 治安官罚款：付得起就扣款，付不起就清零货币并劳动改造；持械备案罚款减半 */
function redLightFine(coins, dawnCoins) {
  const permit = hasServicePermit('weapon-permit')
  const fineCoins = permit ? Math.max(1, Math.ceil(coins / 2)) : coins
  const fineDawn = permit ? Math.max(1, Math.ceil(dawnCoins / 2)) : dawnCoins
  if (game.coins >= fineCoins && game.dawnCoins >= fineDawn) {
    game.coins -= fineCoins
    game.dawnCoins -= fineDawn
    const note = permit ? '（持械备案减半）' : ''
    return `治安官的靴子踩在你背上：罚款 ${fineCoins} 末日币 + ${fineDawn} 曙光币${note}。`
  }
  game.coins = 0
  game.dawnCoins = 0
  adjustStats({ stamina: -30 })
  if (game.dead) return ''
  return '你付不起罚款，治安官把你拖去劳动改造：货币清零，体力 -30。'
}

/** 红灯街区 · 献身自由：1 回合（正常衰减），需任意公会徽章 */
export function redLightSellBody() {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '红灯街区在乌托邦城。'
  if (!activeGuildId()) return '需要任意公会徽章才能进入红灯街区。'

  advanceTurns(1)
  if (game.dead) return ''

  const roll = Math.random()
  if (roll < 0.4) return redLightFine(4, 4)
  if (roll < 0.7) {
    game.coins += 3
    game.dawnCoins += 3
    return '这是见不得光的事情。你躲在暗处数钱，像一只阴暗的老鼠：末日币 +3，曙光币 +3。'
  }
  if (roll < 0.9) return '对方并未支付报酬。你上当了。'

  const stolen = stealRedLightGoods()
  if (!stolen) return '完事了，但是你穷得叮当响，TA 懒得偷你。'
  return `你的东西被偷走了：${stolen.name} ×${stolen.qty}。`
}

/** 红灯街区 · 追求自由：先付 3 末日币 + 3 曙光币，1 回合（正常衰减） */
export function redLightPayForFreedom() {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '红灯街区在乌托邦城。'
  if (!activeGuildId()) return '需要任意公会徽章才能进入红灯街区。'
  if (game.coins < 3 || game.dawnCoins < 3) {
    return '走进那条巷子需要 3 末日币 + 3 曙光币。'
  }

  game.coins -= 3
  game.dawnCoins -= 3
  advanceTurns(1)
  if (game.dead) return ''

  const roll = Math.random()
  if (roll < 0.4) return redLightFine(3, 3)
  if (roll < 0.7) {
    adjustStats({ sanity: -20, stamina: -20 })
    if (game.dead) return ''
    return '完事后你感到一阵空虚：理智 -20，体力 -20。'
  }
  if (roll < 0.9) {
    const weapon = pickMeleeByTier('普通')
    if (!weapon) return 'TA 落下了一件东西，但你没能捡起来。'
    const leftover = addItem(game.inventory, weapon.id, 1)
    return leftover > 0
      ? `TA 落下了一把${weapon.name}，但你的背包已经满了。`
      : `TA 落下了一件东西：${weapon.name}（${weapon.tier}）。`
  }

  adjustStats({ infection: 90 })
  if (game.dead) return ''
  return '你感染了疾病：感染 +90%。'
}

/** 乌托邦 · 自由酒馆：双币购买，当场喝完，不进入背包、不消耗回合 */
export function drinkTavernCocktail(cocktailId) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '自由酒馆在乌托邦城。'
  if (!activeGuildId()) return '需要任意公会徽章才能进入自由酒馆。'

  const cocktail = TAVERN_COCKTAILS.find((item) => item.id === cocktailId)
  if (!cocktail) return ''
  if (game.coins < cocktail.coins || game.dawnCoins < cocktail.dawnCoins) {
    return `${cocktail.name} 需要 ${cocktail.coins} 末日币 + ${cocktail.dawnCoins} 曙光币。`
  }

  game.coins -= cocktail.coins
  game.dawnCoins -= cocktail.dawnCoins
  adjustStats(cocktail.effects)
  if (game.dead) return ''
  return `${cocktail.name}见底：${cocktail.effectText}。`
}

/** 乌托邦 · 自由餐馆：双币购买，当场吃完，不进入背包、不消耗回合 */
export function eatRestaurantDish(dishId) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '自由餐馆在乌托邦城。'
  if (!activeGuildId()) return '需要任意公会徽章才能进入自由餐馆。'

  const dish = RESTAURANT_DISHES.find((item) => item.id === dishId)
  if (!dish) return ''
  if (game.coins < dish.coins || game.dawnCoins < dish.dawnCoins) {
    return `${dish.name} 需要 ${dish.coins} 末日币 + ${dish.dawnCoins} 曙光币。`
  }

  game.coins -= dish.coins
  game.dawnCoins -= dish.dawnCoins
  adjustStats(dish.effects)
  if (game.dead) return ''
  return `${dish.name}吃完了：${dish.effectText}。`
}

/* ===== 乌托邦 · 代理城主 ===== */

/** 拜访当值会长：常规选项人人可选，成员选项只对本公会开放；每天一次、1 回合 */
export function meetActingMayor(option = 'public') {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '代理城主办公室在乌托邦城。'

  const mayor = mayorForDay(game.day)
  if (!mayor) return ''
  if (Number(game.flags.mayorVisitDay) === game.day) {
    return '今天已经拜访过代理城主了，明天换人再来。'
  }

  const memberOnly = option === 'member'
  if (memberOnly && activeGuildId() !== mayor.guildId) {
    return `你身上没有「${mayor.guildName}」的徽章，${mayor.name}不会私下见你。`
  }

  const request = memberOnly ? mayor.member : mayor.public
  if (!request) return ''

  if (request.serviceIds?.length) {
    const equipped = request.service === 'clean-ranged' ? game.equipment.ranged : game.equipment.melee
    if (!equipped || !request.serviceIds.includes(equipped.id)) {
      const allowed = request.serviceIds.map((id) => getItem(id)?.name ?? id).join('、')
      return `${mayor.name}摇了摇头：${request.serviceLabel ?? '会长只修'}${allowed}。`
    }
  }

  const actionDay = game.day
  advanceTurns(1)
  if (game.dead) return ''

  game.flags.mayorVisitDay = actionDay
  game.flags.mayorLastOption = option

  const notes = [request.text]
  if (request.effects) adjustStats(request.effects)
  if (request.coins) game.coins += request.coins
  if (request.dawnCoins) game.dawnCoins += request.dawnCoins
  if (request.reputation) game.reputation += request.reputation
  if (request.contribution) addGuildContribution(mayor.guildId, request.contribution)

  if (request.service === 'clean-ranged') {
    const equipped = game.equipment.ranged
    equipped.cleanliness = CLEANLINESS_MAX
    notes.push(`你的远程武器清洁度已恢复到 ${CLEANLINESS_MAX}。`)
  } else if (request.service === 'repair-melee') {
    const equipped = game.equipment.melee
    const max = getItem(equipped.id)?.weapon?.durability
    equipped.durability = max
    notes.push(`你的近战武器耐久已恢复到 ${max}。`)
  }

  return notes.filter(Boolean).join(' ')
}

/* ===== 乌托邦 · 自由贸易 ===== */

function tradeListingsArray() {
  if (!Array.isArray(game.flags.tradeListings)) game.flags.tradeListings = []
  return game.flags.tradeListings
}

/** 跨天结算托管摊位：按品质与定价掷出成交，剩余继续挂着 */
function processTradeSales() {
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

/* ===== 乌托邦 · 办事中心 ===== */

export function hasServicePermit(permitId) {
  return Boolean(game.flags.servicePermits?.[permitId])
}

function grantServicePermit(permitId) {
  game.flags.servicePermits = {
    ...(game.flags.servicePermits ?? {}),
    [permitId]: true,
  }
}

/** 办理证照 / 补办业务：取号消耗 1 回合，加急额外付曙光币但不消耗回合 */
export function applyServicePermit(permitId, express = false) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '办事中心在乌托邦城。'

  const permit = SERVICE_PERMITS.find((item) => item.id === permitId)
  if (!permit) return ''
  if (permit.once && hasServicePermit(permitId)) {
    return `「${permit.name}」已经办过了。`
  }

  let badgeId = null
  if (permitId === 'badge-reissue') {
    if (activeGuildId()) return '你身上已经有公会徽章，不需要补办。'
    const lastGuildId = game.flags.lastGuildId
    const lastGuild = GUILD_BY_ID[lastGuildId]
    if (!lastGuild) return '档案里没有你的公会记录，无法补办。'
    badgeId = lastGuild.badgeId
    if (!canFitInventory(badgeId)) return '背包已满，先腾出一格再来补办。'
  }

  const expressCost = express ? SERVICE_CENTER_EXPRESS_DAWN : 0
  if (game.coins < permit.coins) {
    return `末日币不足，办理「${permit.name}」需要 ${permit.coins}。`
  }
  if (game.dawnCoins < permit.dawnCoins + expressCost) {
    return express
      ? `曙光币不足，办理「${permit.name}」并加急需要 ${permit.dawnCoins + expressCost}。`
      : `曙光币不足，办理「${permit.name}」需要 ${permit.dawnCoins}。`
  }

  if (!express) {
    advanceTurns(1)
    if (game.dead) return ''
  }

  game.coins -= permit.coins
  game.dawnCoins -= permit.dawnCoins + expressCost

  if (badgeId) {
    addItem(game.inventory, badgeId, 1)
    const name = getItem(badgeId)?.name ?? '公会徽章'
    const suffix = express ? '（加急，未消耗回合）' : ''
    return `${name}补办完成，钢印还没干透${suffix}。`
  }

  grantServicePermit(permitId)
  const suffix = express ? `（加急 +${expressCost} 曙光币，未消耗回合）` : ''
  return `「${permit.name}」办结，钢印落在纸上：${permit.effectText}${suffix}`
}

/* ===== 乌托邦 · 鱼肉处理与沧龙之刃 ===== */

/** 消耗双币，把一份变异鱼肉处理成无害化鱼肉 */
export function processMutantFish() {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '鱼肉处理在乌托邦城。'

  const have = countItem(game.inventory, FISH_PROCESSING.inputId)
  if (have <= 0) return '背包里没有变异鱼肉。'
  if (game.coins < FISH_PROCESSING.coins || game.dawnCoins < FISH_PROCESSING.dawnCoins) {
    return `处理一份变异鱼肉需要 ${FISH_PROCESSING.coins} 末日币 + ${FISH_PROCESSING.dawnCoins} 曙光币。`
  }

  const copy = game.inventory.map((entry) => (entry ? { ...entry } : null))
  removeItem(copy, FISH_PROCESSING.inputId, 1)
  if (addItem(copy, FISH_PROCESSING.outputId, 1) > 0) {
    return '背包已满，先腾出一格再来处理。'
  }

  game.coins -= FISH_PROCESSING.coins
  game.dawnCoins -= FISH_PROCESSING.dawnCoins
  removeItem(game.inventory, FISH_PROCESSING.inputId, 1)
  addItem(game.inventory, FISH_PROCESSING.outputId, 1)
  const output = getItem(FISH_PROCESSING.outputId)
  return `变异鱼肉处理完成：获得 ${output?.name ?? '无害化鱼肉'} ×1。`
}

/** 消耗 50 片沧龙鳞片铸造沧龙之刃 */
export function craftKrakenBlade() {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '锻造台在乌托邦城。'

  const scales = countItem(game.inventory, KRAKEN_BLADE_CRAFT.scaleId)
  if (scales < KRAKEN_BLADE_CRAFT.scales) {
    return `沧龙鳞片不足：需要 ${KRAKEN_BLADE_CRAFT.scales} 片，当前 ${scales} 片。`
  }

  const copy = game.inventory.map((entry) => (entry ? { ...entry } : null))
  removeItem(copy, KRAKEN_BLADE_CRAFT.scaleId, KRAKEN_BLADE_CRAFT.scales)
  if (addItem(copy, KRAKEN_BLADE_CRAFT.itemId, 1) > 0) {
    return '背包已满，先腾出一格再来铸造。'
  }

  removeItem(game.inventory, KRAKEN_BLADE_CRAFT.scaleId, KRAKEN_BLADE_CRAFT.scales)
  addItem(game.inventory, KRAKEN_BLADE_CRAFT.itemId, 1)
  const blade = getItem(KRAKEN_BLADE_CRAFT.itemId)
  return `沧龙之刃铸成：${blade?.name ?? '沧龙之刃'} 已放入背包。`
}

/** 某公会的加入条件明细，供乌托邦界面显示 */
export function guildRequirementState(guildId) {
  const guild = GUILD_BY_ID[guildId]
  if (!guild) return null
  const active = activeGuild()
  const requirements = guild.requirement ?? {}
  const items = (requirements.items ?? []).map((need) => ({
    id: need.id,
    name: getItem(need.id)?.name ?? need.id,
    qty: need.qty ?? 1,
    have: countItem(game.inventory, need.id),
  }))

  const kills = requirements.kills ?? 0
  const thefts = requirements.thefts ?? 0
  const minIdentity = requirements.minIdentity ?? null
  const itemsOk = items.every((need) => need.have >= need.qty)
  const killsOk = game.zombieKills >= kills
  const theftsOk = (Number(game.flags.cityTheftCount) || 0) >= thefts
  const identityOk =
    !minIdentity || identityRank(game.identity) >= identityRank(minIdentity)

  let reason = ''
  if (active) reason = `你已经是「${active.name}」成员，先退出当前公会。`
  else if (!itemsOk) reason = '提交物品不足。'
  else if (!killsOk) reason = `还需要累计击杀 ${kills} 只丧尸（当前 ${game.zombieKills}）。`
  else if (!theftsOk) {
    reason = `还需要在都城盗窃 ${thefts} 次（当前 ${Number(game.flags.cityTheftCount) || 0} 次）。`
  } else if (!identityOk) reason = `需要「${minIdentity}」及以上身份。`

  return {
    guild,
    active,
    items,
    kills,
    killsHave: game.zombieKills,
    thefts,
    theftsHave: Number(game.flags.cityTheftCount) || 0,
    minIdentity,
    canJoin: !active && itemsOk && killsOk && theftsOk && identityOk,
    reason,
  }
}

/** 加入公会：消耗报名物品，放入对应公会徽章 */
export function joinGuild(guildId) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '公会报名在乌托邦城。'
  const state = guildRequirementState(guildId)
  if (!state) return '没有这个公会。'
  if (state.active) return state.reason
  if (!state.canJoin) return state.reason

  const guild = state.guild
  const copy = game.inventory.map((entry) => (entry ? { ...entry } : null))
  for (const need of state.items) removeItem(copy, need.id, need.qty)
  if (addItem(copy, guild.badgeId, 1) > 0) {
    return '背包已满，腾出一格再来报名。'
  }

  for (const need of state.items) removeItem(game.inventory, need.id, need.qty)
  addItem(game.inventory, guild.badgeId, 1)
  game.flags.lastGuildId = guildId
  return `你通过了「${guild.name}」的报名。公会徽章已经放进背包。`
}

/** 退出当前公会：回收徽章，之后重新加入需要重做报名条件 */
export function leaveGuild() {
  const guild = activeGuild()
  if (!guild) return '你还没有加入任何公会。'
  if (removeItem(game.inventory, guild.badgeId, 1) > 0) {
    return '公会徽章不在背包里，退出失败。'
  }
  game.flags.lastGuildId = guild.id
  syncHpCap()
  return `你退出了「${guild.name}」，公会徽章已被回收。再次加入需要重新完成报名条件。`
}

/* ===== 公会日常委托 · 商店 · 贡献兑换 ===== */

/** 某公会的公会贡献值 */
export function guildContribution(guildId) {
  return Math.max(0, Number(game.flags.guildContribution?.[guildId]) || 0)
}

function addGuildContribution(guildId, amount) {
  const map = { ...(game.flags.guildContribution ?? {}) }
  map[guildId] = (Number(map[guildId]) || 0) + amount
  game.flags.guildContribution = map
}

/** 单个公会的委托进度：领取后清零，未领取时跨天累计 */
function guildProgressFor(guildId) {
  const state = game.flags.guildProgress
  const entry = state && typeof state === 'object' ? state[guildId] : null
  return {
    kills: Number(entry?.kills) || 0,
    thefts: Number(entry?.thefts) || 0,
    begs: Number(entry?.begs) || 0,
    lastClaimDay: Number(entry?.lastClaimDay) || 0,
  }
}

function saveGuildProgress(guildId, entry) {
  const map = { ...(game.flags.guildProgress ?? {}) }
  map[guildId] = { ...entry }
  game.flags.guildProgress = map
}

function bumpGuildProgress(guildId, key, amount = 1) {
  const entry = guildProgressFor(guildId)
  entry[key] = (Number(entry[key]) || 0) + amount
  saveGuildProgress(guildId, entry)
}

/** 战斗击杀记录：只有当前公会委托认可的武器才会计数 */
export function recordGuildKill(weaponId) {
  const guild = activeGuild()
  if (!guild || !weaponId) return
  const weapons = guild.commission?.weaponIds
  if (!Array.isArray(weapons) || !weapons.includes(weaponId)) return
  bumpGuildProgress(guild.id, 'kills')
}

/** 盗贼委托：都城盗窃计数 */
export function recordGuildTheft() {
  if (activeGuildId() !== 'rogue') return
  bumpGuildProgress('rogue', 'thefts')
}

/** 盗贼委托：沿街乞讨计数 */
export function recordGuildBeg() {
  if (activeGuildId() !== 'rogue') return
  bumpGuildProgress('rogue', 'begs')
}

/** 统计背包内符合条件的物品总数 */
function countInventoryWhere(test) {
  let total = 0
  for (const entry of game.inventory) {
    if (!entry) continue
    if (test(getItem(entry.id), entry)) total += entry.qty ?? 1
  }
  return total
}

/** 从背包里消耗符合条件的物品；返回是否足量扣完 */
function consumeInventoryWhere(test, amount) {
  let left = amount
  for (let index = 0; index < game.inventory.length && left > 0; index += 1) {
    const entry = game.inventory[index]
    if (!entry) continue
    const def = getItem(entry.id)
    if (!test(def, entry)) continue
    const take = Math.min(left, entry.qty ?? 1)
    entry.qty -= take
    left -= take
    if (entry.qty <= 0) game.inventory[index] = null
  }
  return left === 0
}

/** 当前公会日常委托的进度与领取状态 */
export function guildCommissionState(guildId) {
  const guild = GUILD_BY_ID[guildId]
  const commission = guild?.commission
  if (!guild || !commission) return null

  const progress = guildProgressFor(guildId)
  let lines = []
  if (commission.type === 'kill') {
    const need = commission.count ?? 2
    lines = [
      {
        label: '指定武器击杀',
        have: Math.min(progress.kills, need),
        need,
        ok: progress.kills >= need,
      },
    ]
  } else if (commission.type === 'rogue') {
    const theftNeed = commission.thefts ?? 2
    const begNeed = commission.begs ?? 2
    lines = [
      {
        label: '都城盗窃',
        have: Math.min(progress.thefts, theftNeed),
        need: theftNeed,
        ok: progress.thefts >= theftNeed,
      },
      {
        label: '沿街乞讨',
        have: Math.min(progress.begs, begNeed),
        need: begNeed,
        ok: progress.begs >= begNeed,
      },
    ]
  } else if (commission.type === 'medicine') {
    const need = commission.count ?? 5
    const have = countInventoryWhere((def) => def?.category === 'medicine')
    lines = [{ label: '背包内药品', have: Math.min(have, need), need, ok: have >= need }]
  } else if (commission.type === 'wine') {
    const need = commission.count ?? 3
    const ids = commission.items ?? []
    const have = countInventoryWhere((def) => def && ids.includes(def.id))
    lines = [{ label: '指定酒类', have: Math.min(have, need), need, ok: have >= need }]
  }

  const claimedToday = progress.lastClaimDay === game.day
  let reason = ''
  if (claimedToday) reason = '今天已经领取过这份委托奖励。'
  else if (!lines.every((line) => line.ok)) reason = '委托进度还没完成。'

  return {
    guild,
    lines,
    claimedToday,
    canClaim: !claimedToday && lines.every((line) => line.ok),
    reason,
    rewardText: `${GUILD_COMMISSION_REWARD.coins} 末日币 + ${GUILD_COMMISSION_REWARD.dawnCoins} 曙光币 + ${GUILD_COMMISSION_REWARD.contribution} 公会贡献`,
  }
}

/** 交付公会日常委托：一天一次，提交类委托会消耗物品 */
export function claimGuildCommission(guildId) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '公会委托只能在乌托邦城的公会大厅交付。'
  const guild = GUILD_BY_ID[guildId]
  if (!guild?.commission) return '没有这个公会委托。'
  if (activeGuildId() !== guildId) return `你不在「${guild.name}」，无法领取这里的委托。`

  const state = guildCommissionState(guildId)
  if (!state) return ''
  if (!state.canClaim) return state.reason

  if (guild.commission.type === 'medicine') {
    consumeInventoryWhere((def) => def?.category === 'medicine', guild.commission.count ?? 5)
  } else if (guild.commission.type === 'wine') {
    const ids = guild.commission.items ?? []
    consumeInventoryWhere((def) => def && ids.includes(def.id), guild.commission.count ?? 3)
  }

  game.coins += GUILD_COMMISSION_REWARD.coins
  game.dawnCoins += GUILD_COMMISSION_REWARD.dawnCoins
  addGuildContribution(guildId, GUILD_COMMISSION_REWARD.contribution)

  const progress = guildProgressFor(guildId)
  progress.kills = 0
  progress.thefts = 0
  progress.begs = 0
  progress.lastClaimDay = game.day
  saveGuildProgress(guildId, progress)

  return `委托完成：${guild.name}收下了你的交付。获得 ${state.rewardText}。`
}

/** 背包能否放下一件物品（按堆叠规则模拟一次） */
function canFitInventory(itemId, qty = 1) {
  const copy = game.inventory.map((entry) => (entry ? { ...entry } : null))
  return addItem(copy, itemId, qty) === 0
}

/** 公会商店购买：需要当前佩戴该公会徽章 */
export function buyGuildShopItem(guildId, itemId) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '公会商店只在乌托邦城营业。'
  const guild = GUILD_BY_ID[guildId]
  if (!guild) return '没有这个公会。'
  if (activeGuildId() !== guildId) return `需要「${guild.name}」徽章才能在这里购买。`
  const good = guild.shop?.find((entry) => entry.id === itemId)
  if (!good) return '这家公会不卖这件东西。'
  if (game.coins < good.coins) return `末日币不足：需要 ${good.coins}，当前 ${game.coins}。`
  if (game.dawnCoins < good.dawnCoins) {
    return `曙光币不足：需要 ${good.dawnCoins}，当前 ${game.dawnCoins}。`
  }
  if (!canFitInventory(itemId)) return '背包已满，先腾出一格。'

  game.coins -= good.coins
  game.dawnCoins -= good.dawnCoins
  addItem(game.inventory, itemId, 1)
  return `购买 ${getItem(itemId)?.name ?? itemId} ×1，花费 ${good.coins} 末日币 + ${good.dawnCoins} 曙光币。`
}

/** 贡献商店物品是否已经兑换过 */
export function guildContributionPurchased(itemId) {
  return Boolean(game.flags.guildPurchases?.[itemId])
}

/** 贡献商店兑换：贡献值与双货币复合支付 */
export function buyGuildContributionItem(guildId, itemId) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '贡献商店只在乌托邦城营业。'
  const guild = GUILD_BY_ID[guildId]
  if (!guild) return '没有这个公会。'
  if (activeGuildId() !== guildId) return `需要「${guild.name}」徽章才能在这里兑换。`
  const good = guild.contributionShop?.find((entry) => entry.id === itemId)
  if (!good) return '这家公会没有这件兑换物。'
  if (good.once && guildContributionPurchased(itemId)) {
    return '这件兑换物每位成员只能兑换一次。'
  }
  const contribution = guildContribution(guildId)
  if (contribution < good.contribution) {
    return `公会贡献不足：需要 ${good.contribution}，当前 ${contribution}。`
  }
  if (game.coins < good.coins) return `末日币不足：需要 ${good.coins}，当前 ${game.coins}。`
  if (game.dawnCoins < good.dawnCoins) {
    return `曙光币不足：需要 ${good.dawnCoins}，当前 ${game.dawnCoins}。`
  }
  if (!canFitInventory(itemId)) return '背包已满，先腾出一格。'

  const map = { ...(game.flags.guildContribution ?? {}) }
  map[guildId] = contribution - good.contribution
  game.flags.guildContribution = map
  game.coins -= good.coins
  game.dawnCoins -= good.dawnCoins

  if (good.once) {
    const purchases = { ...(game.flags.guildPurchases ?? {}) }
    purchases[itemId] = true
    game.flags.guildPurchases = purchases
  }

  addItem(game.inventory, itemId, 1)
  return `兑换 ${getItem(itemId)?.name ?? itemId} ×1，消耗 ${good.contribution} 公会贡献 + ${good.coins} 末日币 + ${good.dawnCoins} 曙光币。`
}


/* ===== 末日都城 ===== */

function gainItem(itemId, qty = 1) {
  const def = getItem(itemId)
  const leftover = addItem(game.inventory, itemId, qty)
  if (leftover > 0) return `背包已满，${def?.name ?? '物品'}留在了地上`
  return `获得 ${def?.name ?? itemId} ×${qty}`
}

export function exploreCity() {
  if (game.dead || game.location !== 'ruined-city') return ''

  advanceTurns(1)
  if (game.dead) return ''

  const itemId = pickCityLoot()
  if (!itemId) return '你搜遍了这条街，什么也没有找到。'

  const def = getItem(itemId)
  const lead = def?.category === 'drink' ? '你在倒塌的便利店下找到一瓶饮品' : '你在废墟里翻出一份食物'
  return `${lead}：${gainItem(itemId)}`
}

const FIELD_LOOT_LEADS = {
  food: '你在弃置的灶台边找到一份食物',
  drink: '你在倒下的冷柜旁找到一瓶饮品',
  fruit: '你从还没枯死的枝头摘下',
  medicine: '你在落满灰的药柜里翻出',
  melee: '你在遗落的装备袋里抽出一把近战武器',
  ranged: '你在枪柜的夹层里找到一把远程武器',
}

/**
 * 野外探索：消耗 1 回合，按地图遭遇率触发丧尸，否则按掉落表搜到物资
 * 返回 { mapId, line, zombie?, loot? }，由野外面板决定是否进入战斗
 */
export function exploreField(mapId) {
  if (game.dead || game.location !== mapId) return null
  const map = fieldMapById(mapId)
  if (!map) return null

  advanceTurns(1)
  if (game.dead) return null

  if (Math.random() < map.encounterRate) {
    const zombie = pickZombie(map.zombiePool)
    return {
      mapId,
      zombie,
      line: `你在「${map.name}」深处撞见了${zombie.name}。`,
    }
  }

  const loot = pickFieldLoot(mapId)
  if (!loot) return { mapId, line: '你翻遍了这一带，什么也没有找到。' }

  const def = getItem(loot.itemId)
  const lead = FIELD_LOOT_LEADS[def?.category] ?? '你在废墟里找到'
  if (addItem(game.inventory, loot.itemId, 1) > 0) {
    return { mapId, line: `背包已满，${def?.name ?? '物资'}留在了地上`, loot }
  }

  game.flags.scavengeCount = (Number(game.flags.scavengeCount) || 0) + 1
  checkAchievements()
  return { mapId, line: `${lead}：获得 ${def?.name ?? loot.itemId} ×1`, loot }
}

/* ===== 废弃村庄 · 露营山区 专属互动 ===== */

/** 背包内任意水果总数 */
function fruitTotal() {
  return game.inventory.reduce((sum, entry) => {
    if (!entry) return sum
    return isFruitItem(entry.id) ? sum + (entry.qty ?? 1) : sum
  }, 0)
}

export function countFruits() {
  return fruitTotal()
}

/** 按背包顺序消耗任意水果；返回实际消耗的数量 */
function consumeFruits(qty) {
  let remaining = qty
  for (let index = 0; index < game.inventory.length && remaining > 0; index += 1) {
    const entry = game.inventory[index]
    if (!entry || !isFruitItem(entry.id)) continue
    const have = entry.qty ?? 1
    const take = Math.min(have, remaining)
    remaining -= take
    if (have - take <= 0) game.inventory[index] = null
    else entry.qty = have - take
  }
  return qty - remaining
}

/** 背包内阿三认的烈酒总数 */
function spiritTotal() {
  return game.inventory.reduce((sum, entry) => {
    if (!entry) return sum
    return isSpiritItem(entry.id) ? sum + (entry.qty ?? 1) : sum
  }, 0)
}

export function countSpirits() {
  return spiritTotal()
}

function consumeSpirits(qty) {
  let remaining = qty
  for (let index = 0; index < game.inventory.length && remaining > 0; index += 1) {
    const entry = game.inventory[index]
    if (!entry || !isSpiritItem(entry.id)) continue
    const have = entry.qty ?? 1
    const take = Math.min(have, remaining)
    remaining -= take
    if (have - take <= 0) game.inventory[index] = null
    else entry.qty = have - take
  }
  return qty - remaining
}

/** 废弃村庄：果园采摘，随机 1 种水果 ×9，冷却 5 天 */
export function pickOrchard() {
  if (game.dead) return ''
  if (game.location !== ORCHARD.mapId) return '果园只在废弃村庄。'

  const left = cooldownLeft(ORCHARD.cooldownKey, ORCHARD.cooldownDays)
  if (left > 0) return `这片果园刚摘过，还要等 ${left} 天。`

  const actionDay = game.day
  advanceTurns(ORCHARD.turns)
  if (game.dead) return ''

  const itemId = pickDawnFruit()
  if (!itemId) return '枝头上已经空了。'
  const def = getItem(itemId)
  const leftover = addItem(game.inventory, itemId, ORCHARD.quantity)
  const added = ORCHARD.quantity - leftover
  if (added <= 0) return '背包已满，你连一个果子都装不下。'

  game.cooldowns[ORCHARD.cooldownKey] = actionDay
  return leftover > 0
    ? `你摘到 ${def?.name ?? '水果'} ×${added}，剩下的 ${leftover} 个装不下了。`
    : `你在果树上摘到 ${def?.name ?? '水果'} ×${ORCHARD.quantity}。`
}

/** 废弃村庄：从果箱底下翻出腐烂种子 */
export function takeRottenSeed() {
  if (game.dead) return ''
  if (game.location !== ORCHARD.mapId) return '腐烂种子埋在废弃村庄的果箱底下。'
  if (game.flags.rottenSeedPlanted) return '田里的果苗已经长起来了，不需要再找种子。'
  if (game.flags.rottenSeedSprouted) return '种子已经在苗苗的田里了。'
  if (countItem(game.inventory, ROTTEN_SEED.itemId) > 0) return '那枚腐烂种子已经在背包里。'

  advanceTurns(1)
  if (game.dead) return ''
  if (addItem(game.inventory, ROTTEN_SEED.itemId, 1) > 0) {
    return '背包已满，你腾不出手把它带走。'
  }
  game.flags.rottenSeedFound = true
  return '你在塌掉的果箱底下翻到一枚腐烂种子。它裂开的口子里，冒出一点白。'
}

/** 曙光阵地：把种子交给苗苗育苗，消耗 3 份任意水果 */
export function sproutRottenSeed() {
  if (game.dead) return ''
  if (game.location !== 'dawn-post') return '育苗要找曙光阵地的苗苗。'
  if (game.flags.rottenSeedPlanted) return '果苗已经移栽进田里了。'
  if (!game.flags.rottenSeedFound) return '你还没有找到那枚腐烂种子。'
  if (game.flags.rottenSeedSprouted) return '种子已经在她手里育着，该去补果苗了。'
  if (countItem(game.inventory, ROTTEN_SEED.itemId) < 1) return '种子不在背包里。'
  if (fruitTotal() < ROTTEN_SEED.sproutFruits) {
    return `育苗至少需要 ${ROTTEN_SEED.sproutFruits} 份水果。`
  }

  removeItem(game.inventory, ROTTEN_SEED.itemId, 1)
  consumeFruits(ROTTEN_SEED.sproutFruits)
  advanceTurns(ROTTEN_SEED.sproutTurns)
  if (game.dead) return ''

  game.flags.rottenSeedSprouted = true
  return '苗苗把种子埋进湿土里，说：过两天你再来，它要么活，要么烂透。'
}

/** 曙光阵地：补齐 9 份水果后移栽，触发结局「生机」 */
export function plantRottenSeed() {
  if (game.dead) return ''
  if (game.location !== 'dawn-post') return '移栽得在曙光阵地苗苗的田里。'
  if (game.flags.rottenSeedPlanted) return '果苗已经长在田里了。'
  if (!game.flags.rottenSeedSprouted) return '先让苗苗把种子育出苗来。'
  if (fruitTotal() < ROTTEN_SEED.plantFruits) {
    return `移栽需要 ${ROTTEN_SEED.plantFruits} 份水果，让她把苗周围的土养住。`
  }

  consumeFruits(ROTTEN_SEED.plantFruits)
  advanceTurns(ROTTEN_SEED.plantTurns)
  if (game.dead) return ''

  game.flags.rottenSeedPlanted = true
  game.finale = ROTTEN_SEED.finale
  if (typeof window !== 'undefined') notify(`结局达成 · ${ROTTEN_SEED.finale}`)
  return ''
}

/** 露营山区：奇怪烧烤，每日一次 */
export function eatStrangeBarbecue() {
  if (game.dead) return ''
  if (game.location !== STRANGE_BARBECUE.mapId) return '烧烤摊只在露营山区。'

  const left = cooldownLeft(STRANGE_BARBECUE.cooldownKey, STRANGE_BARBECUE.cooldownDays)
  if (left > 0) return '今天这炉已经吃过了，阿三在收摊。'

  const actionDay = game.day
  advanceTurns(STRANGE_BARBECUE.turns)
  if (game.dead) return ''

  adjustStats(STRANGE_BARBECUE.effects)
  if (game.dead) return ''

  game.cooldowns[STRANGE_BARBECUE.cooldownKey] = actionDay
  game.flags.ateStrangeMeat = true
  return '肉有点酸，但你还是咽了下去。胃里暖起来，伤口却在发烫。'
}

function maSanStage() {
  return Number(game.flags.maSanStage) || 0
}

function maSanGuard() {
  if (game.dead) return ''
  if (game.location !== MA_SAN.mapId) return '阿三的摊子只在露营山区。'
  if (!game.flags.ateStrangeMeat) return MA_SAN.lockedLine
  if (game.flags.maSanKilled) return MA_SAN.killedLine
  return null
}

/** 冷面阿三·第一段：3 罐白威啤酒 */
export function deliverMaSanBeer() {
  const blocked = maSanGuard()
  if (blocked !== null) return blocked
  if (maSanStage() !== 0) return '他已经收下酒了。'

  const have = countItem(game.inventory, MA_SAN.beerId)
  if (have < MA_SAN.beerCount) return `白威啤酒不够：${have} / ${MA_SAN.beerCount}。`

  removeItem(game.inventory, MA_SAN.beerId, MA_SAN.beerCount)
  game.flags.maSanStage = 1
  return '阿三把三罐白威啤酒塞进围裙口袋，刀口往砧板上一拍。'
}

/** 冷面阿三·第二段：3 份任意水果 */
export function deliverMaSanFruit() {
  const blocked = maSanGuard()
  if (blocked !== null) return blocked
  if (maSanStage() !== 1) return '现在还不是递水果的时候。'

  const have = fruitTotal()
  if (have < MA_SAN.fruitCount) return `水果不够：${have} / ${MA_SAN.fruitCount}。`

  consumeFruits(MA_SAN.fruitCount)
  game.flags.maSanStage = 2
  return '他捏了捏果子，没说好坏，只把果核吐进了火里。'
}

/** 冷面阿三·第三段：5 瓶任意烈酒 */
export function deliverMaSanSpirit() {
  const blocked = maSanGuard()
  if (blocked !== null) return blocked
  if (maSanStage() !== 2) return '他还没打算喝这一轮。'

  const have = spiritTotal()
  if (have < MA_SAN.spiritCount) return `烈酒不够：${have} / ${MA_SAN.spiritCount}。`

  consumeSpirits(MA_SAN.spiritCount)
  game.flags.maSanStage = 3
  return '阿三拧开第五瓶，先给自己倒了半碗。他看你的眼神变了。'
}

/** 冷面阿三·接受邀请：不可继续结局「食人魔」 */
export function acceptMaSanInvite() {
  const blocked = maSanGuard()
  if (blocked !== null) return blocked
  if (maSanStage() !== 3) return '他还没打算让你进后厨。'

  die(MA_SAN.acceptReason, '食人魔')
  return ''
}

/* ===== 山地军营 · 马斐 ===== */

/** NPC 是否已被马斐的委托处决 */
export function isNpcDead(npcId) {
  const npc = npcById(npcId)
  return Boolean(npc && game.flags[npc.deathFlag])
}

/** 背包里的高能炸药数量 */
export function countHighExplosive() {
  return countItem(game.inventory, MAFEI.explosiveItemId)
}

/** 合成高能炸药：完成马斐任务十后解锁，16 回合一块，正常衰减 */
export function craftHighExplosive() {
  if (game.dead) return ''
  if (game.location !== MAFEI.mapId) return '炸药台架在山地军营的营房后面。'
  if (game.flags.mafeiKilled) return MAFEI.killedLine
  if (!isQuestDone('mafei-10')) return '马斐把方子压在枪下面：「先把名单办完。」'

  if (!canStoreItems(game.inventory, [{ id: MAFEI.explosiveItemId, qty: 1 }])) {
    return '背包已满，配好的炸药无处安放。'
  }

  advanceTurns(MAFEI.craftTurns)
  if (game.dead) return ''

  addItem(game.inventory, MAFEI.explosiveItemId, 1)
  return `你按马斐的方子守了 ${MAFEI.craftTurns} 个回合，一块高能炸药压成了型（现有 ${countHighExplosive()} 块）。`
}

/** 航天基地：把高能炸药装进发射架，炸毁火箭 */
export function detonateSpaceport() {
  if (game.dead) return ''
  if (game.location !== ROCKET.mapId) return '发射架在航天基地最深处。'
  if (!isQuestActive('mafei-11')) return '你还没有接到爆破火箭的命令。'
  if (game.flags.spaceportBlown) return '发射架已经塌了，只剩下扭曲的钢架。'
  if (countHighExplosive() < 1) return '你手里没有高能炸药。先回山地军营合成一块。'

  removeItem(game.inventory, MAFEI.explosiveItemId, 1)
  advanceTurns(1)
  if (game.dead) return ''

  game.flags.spaceportBlown = true
  return '你把炸药贴在箭体的承力环上，引线短得来不及跑远。爆炸声过后，发射架上只剩一段歪斜的钢架。'
}

/** 马斐任务十二：接取即被灭口，达成死亡结局「恶魔」 */
export function acceptMafeiFinalQuest() {
  if (game.dead) return ''
  if (game.location !== MAFEI.mapId) return '马斐在山地军营等你。'
  return acceptQuest('mafei-12')
}

/* ===== 郊区卖场 · 人鱼公主 ===== */

export function mermaidStage() {
  return Number(game.flags.mermaidStage) || 0
}

export function mermaidCurrent() {
  return MERMAID.stages[mermaidStage()] ?? null
}

/** 提交当前阶段饮品；第四段完成后发放三叉戟-海歌与结局 */
export function submitMermaidDrink() {
  if (game.dead) return ''
  if (game.location !== MERMAID.mapId) return '人鱼公主在郊区卖场的水族箱边。'
  if (mermaidStage() >= MERMAID.stages.length) return MERMAID.healedLine

  const index = mermaidStage()
  const stage = MERMAID.stages[index]
  const def = getItem(stage.itemId)
  const have = countItem(game.inventory, stage.itemId)
  if (have < stage.count) {
    return `还差 ${stage.count - have} 瓶${def?.name ?? '饮品'}。`
  }

  removeItem(game.inventory, stage.itemId, stage.count)
  advanceTurns(MERMAID.turns)
  if (game.dead) return ''

  game.flags.mermaidStage = index + 1
  if (index + 1 < MERMAID.stages.length) return MERMAID.lines[index]

  const leftover = addItem(game.inventory, MERMAID.rewardItemId, 1)
  if (leftover > 0) {
    game.flags.mermaidStage = index
    return '背包已满，三叉戟-海歌还留在水边。'
  }
  game.finale = MERMAID.finale
  if (typeof window !== 'undefined') notify(`结局达成 · ${MERMAID.finale}`)
  return `${MERMAID.lines[index]}\n\n${MERMAID.rewardLine}`
}

/* ===== 核心商圈 · 半感染者嫣然 ===== */

export function countAntiInfection() {
  return countItem(game.inventory, YANRAN.serumId)
}

/** 已发现时返回剩余天数；未发现返回 null */
export function yanranDaysLeft() {
  if (!game.flags.yanranSeen) return null
  if (game.flags.yanranRescued || game.flags.yanranKilled) return null
  const left = Number(game.flags.yanranDeadline) - game.day
  return Math.max(0, left)
}

/** 第一次靠近：开始 30 天倒计时 */
export function approachYanran() {
  if (game.dead) return ''
  if (game.location !== YANRAN.mapId) return '嫣然在核心商圈的中庭。'
  if (game.flags.yanranRescued) return '嫣然已经在安全屋等你了。'
  if (game.flags.yanranKilled) return YANRAN.killedLine

  if (game.flags.yanranSeen) {
    if (game.day > Number(game.flags.yanranDeadline)) {
      game.flags.yanranLost = true
      return YANRAN.lostLine
    }
    return `你又一次靠近她。距离她彻底变异还有 ${yanranDaysLeft()} 天。`
  }

  advanceTurns(1)
  if (game.dead) return ''

  game.flags.yanranSeen = true
  game.flags.yanranDeadline = game.day + YANRAN.deadlineDays
  return `${YANRAN.intro}\n\n她还有 ${YANRAN.deadlineDays} 天。你数了数身上的抗感染针。`
}

/** 一次性注射 5 支抗感染针 */
export function rescueYanran() {
  if (game.dead) return ''
  if (game.location !== YANRAN.mapId) return '嫣然在核心商圈的中庭。'
  if (game.flags.yanranRescued) return '嫣然已经在安全屋等你了。'
  if (game.flags.yanranKilled) return YANRAN.killedLine
  if (!game.flags.yanranSeen) return '你先得靠近她，才知道她还有没有救。'
  if (game.day > Number(game.flags.yanranDeadline)) {
    game.flags.yanranLost = true
    return YANRAN.lostLine
  }

  const have = countAntiInfection()
  if (have < YANRAN.serumCount) {
    return `抗感染针不够：${have} / ${YANRAN.serumCount}。`
  }

  removeItem(game.inventory, YANRAN.serumId, YANRAN.serumCount)
  advanceTurns(1)
  if (game.dead) return ''

  game.flags.yanranRescued = true
  if (typeof window !== 'undefined') notify('伙伴加入 · 嫣然', 3200)
  return YANRAN.rescuedLine
}

/* ===== 核心商圈 · 地下车库 ===== */

export function countGasoline() {
  return countItem(game.inventory, GARAGE.gasolineId)
}

function garageGuard({ allowDeparted = false } = {}) {
  if (game.dead) return ''
  if (game.location !== GARAGE.mapId) return '地下车库在核心商圈负一层。'
  if (!game.flags[GARAGE.requiresFlag]) return GARAGE.lockedLine
  if (game.flags.garageDeparted && !allowDeparted) return GARAGE.departedLine
  return null
}

/** 第一段：装备撬棍撬开卷帘门 */
export function openGarageDoor() {
  const blocked = garageGuard()
  if (blocked !== null) return blocked
  if (game.flags.garageOpened) return '门已经开了。'

  if (game.equipment.melee?.id !== GARAGE.crowbarId) {
    return '卷帘门纹丝不动，你需要装备一根撬棍。'
  }

  advanceTurns(1)
  if (game.dead) return ''
  game.flags.garageOpened = true
  return '撬棍卡进卷帘门的缝里，你整个人压上去。门后是几排积灰的车位。'
}

/** 第二段：翻找车钥匙 */
export function searchGarageKey() {
  const blocked = garageGuard()
  if (blocked !== null) return blocked
  if (!game.flags.garageOpened) return '得先撬开卷帘门。'
  if (game.flags.garageKeyFound || countItem(game.inventory, GARAGE.carKeyId) > 0) {
    return '车钥匙在你口袋里。'
  }

  advanceTurns(1)
  if (game.dead) return ''

  if (Math.random() >= GARAGE.keyChance) return '你翻遍了几辆车，只摸到一手灰。'
  const leftover = addItem(game.inventory, GARAGE.carKeyId, 1)
  if (leftover > 0) return '车钥匙就在遮阳板后面，可你的背包塞不下。'
  game.flags.garageKeyFound = true
  return '你在第三辆车的遮阳板后面摸到一把车钥匙。'
}

/** 第三段：从油桶里偷取汽油（达成私奔结局后仍可继续偷油） */
export function stealGarageGasoline() {
  const blocked = garageGuard({ allowDeparted: true })
  if (blocked !== null) return blocked
  if (!game.flags.garageOpened) return '得先撬开卷帘门。'

  advanceTurns(2)
  if (game.dead) return ''

  const leftover = addItem(game.inventory, GARAGE.gasolineId, 1)
  if (leftover > 0) return '你从油桶里倒出一桶汽油，可背包已经塞满了。'
  return `你从油桶里倒出 1 桶汽油（当前 ${countGasoline()} / ${GARAGE.gasolineCount}）。`
}

/** 终点：出发私奔，可继续结局「私奔」 */
export function elopeGarage() {
  const blocked = garageGuard()
  if (blocked !== null) return blocked
  if (!game.flags.garageOpened) return '得先撬开卷帘门。'
  if (!game.flags.garageKeyFound) return '还没找到车钥匙。'
  if (countGasoline() < GARAGE.gasolineCount) {
    return `汽油不够：${countGasoline()} / ${GARAGE.gasolineCount}。`
  }

  removeItem(game.inventory, GARAGE.gasolineId, GARAGE.gasolineCount)
  advanceTurns(1)
  if (game.dead) return ''

  game.flags.garageDeparted = true
  game.finale = GARAGE.finale
  if (typeof window !== 'undefined') notify(`结局达成 · ${GARAGE.finale}`)
  return '引擎第一次打火就着了。嫣然坐进副驾，把地图摊在膝盖上。'
}

/* ===== 公立医院 · 饥饿丧尸露露 ===== */

export function countCans() {
  return game.inventory.reduce((sum, entry) => {
    if (!entry) return sum
    return isCannedItem(entry.id) ? sum + (entry.qty ?? 1) : sum
  }, 0)
}

/** 按背包顺序消耗任意罐头；返回实际消耗数量 */
function consumeCans(qty) {
  let remaining = qty
  for (let index = 0; index < game.inventory.length && remaining > 0; index += 1) {
    const entry = game.inventory[index]
    if (!entry || !isCannedItem(entry.id)) continue
    const have = entry.qty ?? 1
    const take = Math.min(have, remaining)
    remaining -= take
    if (have - take <= 0) game.inventory[index] = null
    else entry.qty = have - take
  }
  return qty - remaining
}

/** 一次性放下 30 个任意罐头 */
export function feedLulu() {
  if (game.dead) return ''
  if (game.location !== LULU.mapId) return '露露在公立医院的护士站。'
  if (game.flags.luluRescued) return '露露已经跟着你了。'

  const have = countCans()
  if (have < LULU.cannedCount) {
    return `罐头不够：${have} / ${LULU.cannedCount}。`
  }

  consumeCans(LULU.cannedCount)
  advanceTurns(1)
  if (game.dead) return ''

  game.flags.luluRescued = true
  if (typeof window !== 'undefined') notify('伙伴加入 · 露露', 3200)
  return LULU.rescuedLine
}

/* ===== 伙伴收获 ===== */

function companionGuard(partnerId) {
  if (game.dead) return ''
  if (!game.flags[`${partnerId}Rescued`]) return '她还没有跟着你。'
  return null
}

/** 嫣然每天带回 2 件食物/饮品/水果 */
export function harvestYanran() {
  const blocked = companionGuard('yanran')
  if (blocked !== null) return blocked
  const left = cooldownLeft(COMPANIONS.yanran.harvestKey, COMPANIONS.yanran.cooldownDays)
  if (left > 0) return `嫣然今天已经出去过了，${left} 天后可以再来。`

  const actionDay = game.day
  advanceTurns(1)
  if (game.dead) return ''

  const picks = pickCompanionLoot('yanran')
  const names = []
  let leftoverTotal = 0
  for (const itemId of picks) {
    const leftover = addItem(game.inventory, itemId, 1)
    const def = getItem(itemId)
    if (leftover > 0) leftoverTotal += 1
    else names.push(def?.name ?? itemId)
  }
  if (!names.length) return '嫣然空手回来了。你的背包已经塞不下任何东西。'

  game.cooldowns[COMPANIONS.yanran.harvestKey] = actionDay
  const tail = leftoverTotal > 0 ? ' 有东西没能塞进背包。' : ''
  return `嫣然带回：${names.join('、')}。${tail}`
}

/** 露露每天带回 1 件药品 */
export function harvestLulu() {
  const blocked = companionGuard('lulu')
  if (blocked !== null) return blocked
  const left = cooldownLeft(COMPANIONS.lulu.harvestKey, COMPANIONS.lulu.cooldownDays)
  if (left > 0) return `露露今天已经出去过了，${left} 天后可以再来。`

  const actionDay = game.day
  advanceTurns(1)
  if (game.dead) return ''

  const itemId = pickRandomMedicine()
  const leftover = addItem(game.inventory, itemId, 1)
  const def = getItem(itemId)
  if (leftover > 0) return '露露带回了一件药品，可你的背包塞不下。'

  game.cooldowns[COMPANIONS.lulu.harvestKey] = actionDay
  return `露露带回：${def?.name ?? '药品'}。`
}

/* ===== X研究所 · 陈博士 ===== */

function doctorGuard() {
  if (game.dead) return ''
  if (game.location !== DOCTOR.mapId) return '陈博士在 X研究所的培养区。'
  return null
}

/** 背包里已经攒了几枚发射徽章 */
export function countDoctorBadges() {
  return DOCTOR.badges.reduce(
    (sum, id) => sum + (countItem(game.inventory, id) > 0 ? 1 : 0),
    0,
  )
}

/** 模拟「扣掉一批物品后还能放下新物品」，避免交付后徽章无处安放 */
function fitsAfterRemove(removals, newItemId) {
  const copy = game.inventory.map((entry) => (entry ? { ...entry } : null))
  for (const { category, itemId, qty } of removals) {
    if (category) consumeCategory(copy, category, qty)
    else removeItem(copy, itemId, qty)
  }
  return addItem(copy, newItemId, 1) === 0
}

function countCategory(inventory, category) {
  return inventory.reduce((sum, entry) => {
    if (!entry) return sum
    return getItem(entry.id)?.category === category ? sum + (entry.qty ?? 1) : sum
  }, 0)
}

/** 按背包顺序消耗某一分类的物品；返回实际消耗数量 */
function consumeCategory(inventory, category, qty) {
  let remaining = qty
  for (let index = 0; index < inventory.length && remaining > 0; index += 1) {
    const entry = inventory[index]
    if (!entry || getItem(entry.id)?.category !== category) continue
    const have = entry.qty ?? 1
    const take = Math.min(have, remaining)
    remaining -= take
    if (have - take <= 0) inventory[index] = null
    else entry.qty = have - take
  }
  return qty - remaining
}

/** 交付 20 支抗感染针，换一把 M700 */
export function doctorTrade() {
  const blocked = doctorGuard()
  if (blocked !== null) return blocked
  if (game.flags.doctorTradeDone) return '陈博士已经把最后一把 M700 交给你了。'

  const have = countAntiInfection()
  if (have < DOCTOR.serumCount) {
    return `抗感染针不够：${have} / ${DOCTOR.serumCount}。`
  }
  if (!fitsAfterRemove([{ itemId: DOCTOR.serumId, qty: DOCTOR.serumCount }], DOCTOR.rewardItemId)) {
    return DOCTOR.fullLine
  }

  removeItem(game.inventory, DOCTOR.serumId, DOCTOR.serumCount)
  advanceTurns(1)
  if (game.dead) return ''

  addItem(game.inventory, DOCTOR.rewardItemId, 1)
  game.flags.doctorTradeDone = true
  return DOCTOR.tradedLine
}

/** 任务①：上交小核能发电机，取得动力徽章 */
export function submitGenerator() {
  const blocked = doctorGuard()
  if (blocked !== null) return blocked
  if (!game.flags.doctorTradeDone) return '先用手里的抗感染针换下那把 M700，陈博士才肯谈下一步。'
  if (game.flags.doctorQuest1Done) return '动力回路已经接好了。'
  if (!game.flags.giantPuppetDefeated) return DOCTOR.needPuppetLine
  if (countItem(game.inventory, DOCTOR.generatorId) < 1) {
    return '发电机还在航天基地发射中心那具傀儡的残骸里。'
  }

  removeItem(game.inventory, DOCTOR.generatorId, 1)
  advanceTurns(1)
  if (game.dead) return ''

  if (addItem(game.inventory, DOCTOR.badges[0], 1) > 0) {
    addItem(game.inventory, DOCTOR.generatorId, 1)
    return DOCTOR.fullLine
  }
  game.flags.doctorQuest1Done = true
  return '陈博士把铭牌拧下来，在背面刻了一个「动」字。「动力这一环，过了。」'
}

/** 任务②：能源井每天抽 1 份纯净能源 */
export function extractEnergy() {
  const blocked = doctorGuard()
  if (blocked !== null) return blocked
  if (!game.flags.doctorTradeDone) return '先用手里的抗感染针换下那把 M700，陈博士才肯谈下一步。'
  if (!game.flags.doctorQuest1Done) return '得先把动力回路接上，能源井才会通电。'
  if (game.flags.doctorQuest2Done) return '能源已经抽够了，井口封了回去。'

  const left = cooldownLeft(DOCTOR.energyCooldownKey, DOCTOR.energyCooldownDays)
  if (left > 0) return `能源井今天已经抽过一份，还要等 ${left} 天。`

  const actionDay = game.day
  advanceTurns(1)
  if (game.dead) return ''

  if (addItem(game.inventory, DOCTOR.energyId, 1) > 0) {
    return '能源井吐出一份纯净能源，可你的背包塞不下。'
  }
  game.cooldowns[DOCTOR.energyCooldownKey] = actionDay
  const have = countItem(game.inventory, DOCTOR.energyId)
  return `能源井抽出 1 份纯净能源（${have} / ${DOCTOR.energyCount}）。${DOCTOR.quest2Line}`
}

/** 任务②：上交 15 份纯净能源，取得燃料徽章 */
export function submitEnergy() {
  const blocked = doctorGuard()
  if (blocked !== null) return blocked
  if (!game.flags.doctorQuest1Done) return '得先把动力回路接上。'
  if (game.flags.doctorQuest2Done) return '燃料舱已经灌满了。'

  const have = countItem(game.inventory, DOCTOR.energyId)
  if (have < DOCTOR.energyCount) {
    return `纯净能源不够：${have} / ${DOCTOR.energyCount}。`
  }
  if (!fitsAfterRemove([{ itemId: DOCTOR.energyId, qty: DOCTOR.energyCount }], DOCTOR.badges[1])) {
    return DOCTOR.fullLine
  }

  removeItem(game.inventory, DOCTOR.energyId, DOCTOR.energyCount)
  advanceTurns(1)
  if (game.dead) return ''

  addItem(game.inventory, DOCTOR.badges[1], 1)
  game.flags.doctorQuest2Done = true
  return '淡蓝色的能源一点点灌进燃料舱。陈博士递来一枚沾着残渍的铜片：「燃料这一环，也过了。」'
}

/** 任务③所需的医疗 / 食物 / 饮品数量 */
export function doctorSupplyCounts() {
  return {
    medicine: countCategory(game.inventory, 'medicine'),
    food: countCategory(game.inventory, 'food'),
    drink: countCategory(game.inventory, 'drink'),
  }
}

/** 任务③：上交医疗 / 食物 / 饮品各 10 份，取得生存徽章 */
export function submitSupplies() {
  const blocked = doctorGuard()
  if (blocked !== null) return blocked
  if (!game.flags.doctorQuest2Done) return '得先把燃料舱灌满，再来谈物资。'
  if (game.flags.doctorQuest3Done) return '物资已经码进舱里了。'

  const counts = doctorSupplyCounts()
  const need = DOCTOR.supply
  if (
    counts.medicine < need.medicine ||
    counts.food < need.food ||
    counts.drink < need.drink
  ) {
    return `物资还差：医疗 ${counts.medicine}/${need.medicine}，食物 ${counts.food}/${need.food}，饮品 ${counts.drink}/${need.drink}。`
  }

  const removals = Object.entries(need).map(([category, qty]) => ({ category, qty }))
  if (!fitsAfterRemove(removals, DOCTOR.badges[2])) return DOCTOR.fullLine

  for (const { category, qty } of removals) consumeCategory(game.inventory, category, qty)
  advanceTurns(1)
  if (game.dead) return ''

  addItem(game.inventory, DOCTOR.badges[2], 1)
  game.flags.doctorQuest3Done = true
  return '医疗、食物、饮品一样样码进舱里。陈博士把一枚用罐头铁皮压成的圆牌放在你手心。「三枚都在了。去航天基地吧，最后一步不在我这里。」'
}

/** 傀儡掉落时背包满的兜底：回发射中心把发电机抱走 */
export function collectGenerator() {
  if (game.dead) return ''
  if (game.location !== GIANT_PUPPET.mapId) return '小核能发电机还在发射中心的残骸里。'
  if (countItem(game.inventory, GIANT_PUPPET.rewardItemId) > 0) return '那台发电机已经在背包里了。'
  if (!game.flags.generatorPending) return '残骸里已经空了。'

  if (addItem(game.inventory, GIANT_PUPPET.rewardItemId, 1) > 0) {
    return '背包已满，你得先腾出一点地方。'
  }
  game.flags.generatorPending = false
  return '你从傀儡胸腔里抱出了那台还在运转的小核能发电机。'
}

/* ===== 航天基地 · 发射中心 ===== */

function rocketGuard() {
  if (game.dead) return ''
  if (game.location !== ROCKET.mapId) return '发射中心在航天基地最深处。'
  if (countDoctorBadges() < ROCKET.badgeIds.length) return ROCKET.lockedLine
  return null
}

/**
 * 火箭四选一：all 带所有人 / solo 独自飞走 / send 让他们走 / stay 留下
 * 前三种直接达成不可继续的好结局，stay 不设结局，可以继续游戏
 */
export function launchRocket(kind) {
  const blocked = rocketGuard()
  if (blocked !== null) return blocked

  if (kind === 'all') {
    const missing = ROCKET.companionFlags.some((flag) => !game.flags[flag])
    if (missing) return '嫣然和露露还没有都在安全屋。火箭上不能少了她们。'
    game.finale = ROCKET.finaleAll
    if (typeof window !== 'undefined') notify(`结局达成 · ${ROCKET.finaleAll}`)
    return '倒计时归零。舱门合上的一瞬间，嫣然和露露都抓住了扶手。火箭穿过云层，把整片废墟甩在脚下。'
  }

  if (kind === 'solo') {
    game.finale = ROCKET.finaleSolo
    if (typeof window !== 'undefined') notify(`结局达成 · ${ROCKET.finaleSolo}`)
    return '你一个人按下发射键。发射台下，嫣然和露露站在原地，直到火光把她们的影子拉得很长。'
  }

  if (kind === 'send') {
    game.finale = ROCKET.finaleSend
    if (typeof window !== 'undefined') notify(`结局达成 · ${ROCKET.finaleSend}`)
    return '陈博士、嫣然和露露走进舱门。你把最后的补给递上去，退后两步，按下了发射键。'
  }

  if (kind === 'stay') {
    return ROCKET.stayedLine
  }

  return ''
}

/* ===== 郊区卖场 · 游戏开发者 ===== */

function devGuard() {
  if (game.dead) return ''
  if (game.location !== DEV_SHOP.mapId) return '游戏开发者只在郊区卖场的角落。'
  return null
}

/** 一次性新手礼包：少量货币与基础物资 */
export function takeDevNoviceGift() {
  const blocked = devGuard()
  if (blocked !== null) return blocked
  if (game.flags.devNoviceGiftTaken) return '新手礼包已经领过了。'
  if (!canStoreItems(game.inventory, DEV_SHOP.noviceItems)) {
    return '背包放不下这份补给，先腾出几格再来。'
  }

  for (const item of DEV_SHOP.noviceItems) {
    addItem(game.inventory, item.id, item.qty)
  }
  game.coins += DEV_SHOP.noviceCoins
  game.dawnCoins += DEV_SHOP.noviceDawnCoins
  game.flags.devNoviceGiftTaken = true
  return `游戏开发者递来一个新手礼包：末日币 +${DEV_SHOP.noviceCoins}，曙光币 +${DEV_SHOP.noviceDawnCoins}，外加万能灵药、抗感染针、罐头、越蔓梅、战术匕首和 Glock。「先活过这几天再说。」`
}

/** 一次性骑士礼包：骑士徽章与白兰地 */
export function takeDevKnightGift() {
  const blocked = devGuard()
  if (blocked !== null) return blocked
  if (game.flags.devKnightGiftTaken) return '骑士礼包已经领过了。'
  const brandy = DEV_SHOP.knightItems.find((item) => item.id !== 'badge-knight')
  if (brandy && !canStoreItems(game.inventory, [brandy])) {
    return '背包放不下这份礼包，先腾出几格再来。'
  }
  if (!grantIdentity('骑士')) return '背包已满，骑士徽章无处安放。'
  if (brandy) addItem(game.inventory, brandy.id, brandy.qty)
  game.flags.devKnightGiftTaken = true
  return `游戏开发者递来一枚骑士徽章和 ${brandy?.qty ?? 0} 瓶白兰地：「别问哪来的。」`
}

/** 一次性治疗礼包：绷带、止痛药与止血带 */
export function takeDevHealingGift() {
  const blocked = devGuard()
  if (blocked !== null) return blocked
  if (game.flags.devHealingGiftTaken) return '治疗礼包已经领过了。'
  if (!canStoreItems(game.inventory, DEV_SHOP.healingItems)) {
    return '背包放不下这份医疗物资，先腾出几格再来。'
  }
  for (const item of DEV_SHOP.healingItems) {
    addItem(game.inventory, item.id, item.qty)
  }
  game.flags.devHealingGiftTaken = true
  return '游戏开发者推来一箱医疗物资：绷带 20、止痛药 20、止血带 20。「这次不用缝。」'
}

/** 一次性糖果礼包：开发者糖果 ×6 */
export function takeDevCandyGift() {
  const blocked = devGuard()
  if (blocked !== null) return blocked
  if (game.flags.devCandyGiftTaken) return '糖果礼包已经领过了。'
  if (!canStoreItems(game.inventory, DEV_SHOP.candyItems)) {
    return '背包放不下这份糖果，先腾出几格再来。'
  }
  for (const item of DEV_SHOP.candyItems) {
    addItem(game.inventory, item.id, item.qty)
  }
  game.flags.devCandyGiftTaken = true
  return '游戏开发者推来一袋糖果：开发者糖果 ×6。「甜的东西，至少不会咬你。」'
}

/** 背包扩容：按当前容量分段收费，每次增加 10 格，上限 200 格 */
export function expandBackpack() {
  const blocked = devGuard()
  if (blocked !== null) return blocked
  if (game.inventory.length >= DEV_SHOP.expandLimit) {
    return `背包已经到 ${DEV_SHOP.expandLimit} 格上限，装不下更多了。`
  }

  const price = expandPriceAtSize(game.inventory.length)
  if (!price) return `背包已经到 ${DEV_SHOP.expandLimit} 格上限，装不下更多了。`

  const cost = price.coins
  const dawnCost = price.dawnCoins
  if (game.coins < cost) return `末日币不足，扩容需要 ${cost} 末日币。`
  if (game.dawnCoins < dawnCost) return `曙光币不足，扩容需要 ${dawnCost} 曙光币。`

  game.coins -= cost
  game.dawnCoins -= dawnCost
  const before = game.inventory.length
  const next = Math.min(before + DEV_SHOP.expandSteps, DEV_SHOP.expandLimit)
  for (let index = before; index < next; index += 1) game.inventory.push(null)
  return `你付了 ${cost} 末日币和 ${dawnCost} 曙光币。背包从 ${before} 格扩到 ${next} 格。`
}

/* ===== 开发者控制台 ===== */

const DEV_HELP = [
  '/help — 查看指令帮助',
  '/day 数字 — 跳转到指定天数（不消耗回合）',
  '/tp 地图名字 — 0 回合传送到指定地图',
  '/get 物品名称 数量 — 获得对应物品',
  '/kill on|off — 开启 / 关闭一击必杀',
  '/lock — 锁定所有状态条，不再恶化',
  '/unlock — 解除状态条锁定',
  '/lock o — 锁定深海氧气，近战不再消耗氧气',
  '/unlock o — 解除深海氧气锁定',
  '/backpack — 背包容量提升至 200 格',
  '/talent max — 所有天赋满级',
  '/talent clear — 所有天赋重置为 0',
  '/Re NPC名字 — 复活指定 NPC（可能影响任务，慎用）',
].join('\n')

/** 按名字或地区简写查找地图 */
function devFindMap(query) {
  const text = String(query ?? '').trim()
  if (!text) return null
  const lower = text.toLowerCase()
  if (['ship', 'airship', '飞行船'].includes(lower)) {
    return MAPS.find((item) => item.id === 'doomsday-airship') ?? null
  }
  return (
    MAPS.find((item) => item.name === text || item.id === lower) ??
    MAPS.find((item) => item.name.includes(text)) ??
    null
  )
}

/** 按名字或 ID 查找 NPC，支持省略「·」前的头衔 */
function devFindNpc(query) {
  const text = String(query ?? '').trim()
  if (!text) return null
  const lower = text.toLowerCase()
  return (
    npcById(text) ??
    Object.values(NPCS).find((item) => item.name === text || item.id === lower) ??
    Object.values(NPCS).find(
      (item) => item.name.includes(text) || item.name.split('·').pop() === text,
    ) ??
    null
  )
}

/** 执行开发者指令，返回要显示在控制台里的文本 */
export function runDevCommand(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return ''
  const [cmd, ...args] = raw.split(/\s+/)
  const command = cmd.toLowerCase()

  if (command === '/help') return DEV_HELP

  if (command === '/kill') {
    const mode = (args[0] ?? '').toLowerCase()
    if (mode === 'on') {
      devState.oneHitKill = true
      return '一击必杀已开启：你的下一次攻击会直接放倒目标。'
    }
    if (mode === 'off') {
      devState.oneHitKill = false
      return '一击必杀已关闭。'
    }
    return '用法：/kill on 或 /kill off'
  }

  if (command === '/lock') {
    const target = (args[0] ?? '').toLowerCase()
    if (target === 'o' || target === 'oxygen' || target === '氧气') {
      devState.lockOxygen = true
      return '氧气已锁定：深海战斗中近战不再消耗氧气。'
    }
    devState.lockStats = true
    return '状态条已锁定：生命、饱食、口渴、理智、体力不再下降，感染不再上升。'
  }

  if (command === '/unlock') {
    const target = (args[0] ?? '').toLowerCase()
    if (target === 'o' || target === 'oxygen' || target === '氧气') {
      devState.lockOxygen = false
      return '氧气锁定已解除，深海近战恢复每次 20 点消耗。'
    }
    devState.lockStats = false
    return '状态条已解锁，恢复正常衰减。'
  }

  if (command === '/backpack') {
    if (game.inventory.length >= BACKPACK_MAX_SIZE) {
      return `背包已经是 ${BACKPACK_MAX_SIZE} 格上限。`
    }
    const before = game.inventory.length
    for (let index = before; index < BACKPACK_MAX_SIZE; index += 1) {
      game.inventory.push(null)
    }
    return `背包从 ${before} 格提升到 ${BACKPACK_MAX_SIZE} 格。`
  }

  if (command === '/get') {
    const tokens = [...args]
    let qty = 1
    if (tokens.length && /^\d+$/.test(tokens[tokens.length - 1])) {
      qty = Number.parseInt(tokens.pop(), 10)
    }
    const name = tokens.join(' ').trim()
    if (!name) return '用法：/get 物品名称 数量'
    if (!Number.isFinite(qty) || qty <= 0) return '数量必须是正整数。'

    const def =
      Object.values(ITEMS).find((item) => item.name === name) ?? ITEMS[name] ?? null
    if (!def) return `没有找到「${name}」这件物品。`
    const leftover = addItem(game.inventory, def.id, qty)
    return leftover > 0
      ? `背包只放下了 ${qty - leftover} 个「${def.name}」，还有 ${leftover} 个没装下。`
      : `获得 ${def.name} ×${qty}。`
  }

  if (command === '/talent') {
    const mode = (args[0] ?? '').toLowerCase()
    if (mode === 'max') {
      for (const talent of Object.values(TALENTS)) {
        game.talents[talent.key] = talent.maxLevel
        game.training[talent.key] = 0
      }
      const levels = Object.values(TALENTS)
        .map((talent) => `${talent.label} Lv.${talent.maxLevel}`)
        .join(' · ')
      return `所有天赋已满级：${levels}。最多仍只能启用 ${TALENT_ACTIVE_LIMIT} 个。`
    }
    if (mode === 'clear') {
      for (const talent of Object.values(TALENTS)) {
        game.talents[talent.key] = 0
        game.training[talent.key] = 0
      }
      game.activeTalents = []
      return '所有天赋已重置为 0，熟练度与启用列表已清空。'
    }
    return '用法：/talent max 或 /talent clear'
  }

  if (command === '/day') {
    const value = Number.parseInt(args[0], 10)
    if (!Number.isFinite(value) || value < 1) {
      return '用法：/day 数字（最小为第 1 天）'
    }
    if (game.dead) return '你已经死了，无法跳转时间。'

    const before = game.day
    game.day = value
    game.phase = 0
    if (value > before) processTradeSales()
    if (game.market) ensureStockMarketDay()
    checkLoanDue()
    checkAchievements()
    return game.dead
      ? `时间从第 ${before} 天跳到第 ${value} 天，借贷逾期同时结算。`
      : `时间从第 ${before} 天跳转到第 ${value} 天，属性没有产生消耗。`
  }

  if (command === '/tp') {
    const query = args.join(' ').trim()
    if (!query) {
      return `用法：/tp 地图名字（可用：${MAPS.map((item) => item.name).join(' / ')}）`
    }
    const map = devFindMap(query)
    if (!map) {
      return `没有找到「${query}」这张地图。可用：${MAPS.map((item) => item.name).join(' / ')}`
    }
    if (game.dead) return '你已经死了，无法传送。'

    game.location = map.id
    return `已传送至「${map.name}」，消耗 0 回合，未扣除属性。`
  }

  if (command === '/re') {
    const query = args.join(' ').trim()
    if (!query) {
      return `用法：/Re NPC名字（可用：${Object.values(NPCS)
        .map((npc) => npc.name)
        .join(' / ')}）`
    }
    const npc = devFindNpc(query)
    if (!npc) {
      return `没有找到 NPC「${query}」。可用：${Object.values(NPCS)
        .map((item) => item.name)
        .join(' / ')}`
    }
    if (!game.flags[npc.deathFlag]) return `${npc.name} 本来就活着。`
    game.flags[npc.deathFlag] = false
    return `已复活「${npc.name}」。注意：相关任务与剧情标记不会回滚，可能导致任务异常或坏档，请务必先存档。`
  }

  return `未知指令：${cmd}。输入 /help 查看可用指令。`
}

/** 都城劳动：按身份选择活计，每天一次，消耗回合并结算属性损耗 */
export function laborCity(tierId = 'common') {
  if (game.dead || game.location !== 'ruined-city') return ''

  const tier = LABOR_TIERS.find((item) => item.id === tierId)
  if (!tier) return ''
  if (identityRank(game.identity) < tier.rank) {
    return `「${tier.name}」需要「${tier.identity}」身份。`
  }
  if (!useCooldown('labor', PALACE_COOLDOWN.daily)) return '今天已经做过一份工，明天再来。'

  advanceTurns(tier.turns)
  if (game.dead) return ''

  adjustStats(tier.effects)
  game.coins += tier.coins
  const cost = tier.costText ? `${tier.costText}，` : ''
  return `${tier.name}结束：${cost}末日币 +${tier.coins}。`
}

export function joinCity() {
  if (game.dead) return ''
  if (game.identity) return `你已经是「${game.identity}」，不必再投靠。`
  if (!grantIdentity('平民')) return '背包已满，收不下平民徽章。'
  return '你向都城衙门投了名册，领到一枚「平民徽章」。'
}

export function restoreIdentity() {
  if (game.dead) return ''
  if (game.identity) return `身份牌还在你身上（${game.identity}），无需补办。`
  if (!game.maxIdentity) return '没有可补办的身份记录。'
  if (!grantIdentity(game.maxIdentity)) return '背包已满，补办的身份牌无处安放。'
  return `已补办历史最高身份「${game.maxIdentity}」的身份牌。`
}

export function becomeKnight() {
  if (game.dead) return ''
  if (!game.identity) return '需要先办理平民身份。'
  if (identityRank(game.identity) >= identityRank('骑士')) {
    return `你已经是「${game.identity}」，无需再办理骑士。`
  }
  if (game.coins < KNIGHT_COST) return `末日币不足，办理骑士需要 ${KNIGHT_COST} 末日币。`
  game.coins -= KNIGHT_COST
  if (!grantIdentity('骑士')) {
    game.coins += KNIGHT_COST
    return '背包已满，骑士徽章无处安放。'
  }
  return `缴纳 ${KNIGHT_COST} 末日币，你成为了「骑士」。`
}

export function canEnterPalace() {
  return identityRank(game.identity) >= identityRank('骑士')
}

export function borrowCoins(amount) {
  if (game.dead) return ''
  if (!game.identity) return '至少需要平民身份才能借贷。'

  const tier = loanTierFor(game.identity)
  if (!tier) return '当前身份无法在都城银行借贷。'
  if (game.loan) {
    return `上一笔贷款还没结清（欠 ${game.loan.due} 末日币），银行不肯再借。`
  }

  const value = Math.floor(Number(amount))
  if (!Number.isFinite(value) || value < tier.min || value > tier.max) {
    return `以「${game.identity}」身份，借款额度为 ${tier.min}-${tier.max} 末日币。`
  }

  const interest = loanInterest(value, tier.rate)
  game.coins += value
  game.loan = {
    principal: value,
    interest,
    rate: tier.rate,
    due: value + interest,
    identity: game.identity,
    rank: tier.rank,
    termDays: LOAN_TERM_DAYS,
    startDay: game.day,
    // 借款当天算第 1 天：第 10 天是最后还款日，第 11 天起逾期
    dueDay: game.day + LOAN_TERM_DAYS - 1,
    graceDays: tier.graceDays,
    graceUsed: false,
    confiscated: false,
    defaulted: false,
    interestWaived: false,
  }
  return `借入 ${value} 末日币：利息 ${interest}，${LOAN_TERM_DAYS} 天内需还 ${value + interest}（第 ${game.loan.dueDay} 天为最后还款日）。`
}

/** 申请宽限：每笔贷款只能申请一次，逾期后不再受理 */
export function applyLoanGrace() {
  if (game.dead) return ''
  if (!game.loan) return '你并没有欠款。'

  const days = game.loan.graceDays ?? loanTierByRank(game.loan.rank).graceDays
  if (!days) return `「${loanTierByRank(game.loan.rank).identity}」的贷款没有宽限期。`
  if (game.loan.graceUsed) return '这笔贷款已经申请过宽限，不能再拖。'
  if (game.day > game.loan.dueDay) return '贷款已经逾期，宽限申请不会被受理。'

  game.loan.dueDay += days
  game.loan.graceUsed = true
  return `银行同意宽限 ${days} 天：到期日顺延至第 ${game.loan.dueDay} 天。`
}

export function repayLoan() {
  if (game.dead) return ''
  if (!game.loan) return '你并没有欠款。'
  if (game.coins < game.loan.due) {
    return `末日币不足，需要 ${game.loan.due} 才能结清。`
  }
  const paid = game.loan.due
  game.coins -= paid
  game.loan = null
  game.flags.loanRepaid = true
  checkAchievements()
  return `已还清 ${paid} 末日币，贷款结清。`
}

/* ===== 都城银行 · 行长钱三爷 ===== */

/** 化债成功：免掉全部利息，只还本金，到期日再宽限 30 天 */
export function waiveLoanInterest() {
  if (!game.loan) return BANKER.noLoanLine
  if (game.loan.interestWaived) return BANKER.waivedLine

  const waived = Math.max(0, Number(game.loan.interest) || 0)
  game.loan.interest = 0
  game.loan.due = game.loan.principal
  game.loan.dueDay = Math.max(game.loan.dueDay, game.day) + BANKER.graceDays
  game.loan.interestWaived = true
  return `行长免去了 ${waived} 币利息：现在只还本金 ${game.loan.principal} 币，到期日顺延至第 ${game.loan.dueDay} 天。`
}

/** 兑换汇率：按两地历史最高身份的日收入购买力计算，1 曙光币 = ? 末日币 */
export function exchangeRateInfo() {
  const cityIdentity = game.maxIdentity ?? game.identity ?? '平民'
  const dawnIdentity = game.maxDawnIdentity ?? game.dawnIdentity ?? '队员'
  const labor = LABOR_TIERS.find((tier) => tier.identity === cityIdentity)?.coins ?? 0
  const cityIncome = labor + (PALACE_SALARY[cityIdentity] ?? 0)
  const dawnIncome =
    DAWN_SALARY.find((tier) => tier.rank === dawnRank(dawnIdentity))?.coins ?? 0
  const rate = exchangeRateFromIncome(cityIncome, dawnIncome)

  return {
    cityIdentity,
    dawnIdentity,
    cityIncome,
    dawnIncome,
    cityPower: cityIncome / EXCHANGE_BASKET_PRICE,
    dawnPower: dawnIncome / EXCHANGE_BASKET_PRICE,
    cityFallback: !game.maxIdentity && !game.identity,
    dawnFallback: !game.maxDawnIdentity && !game.dawnIdentity,
    rate,
  }
}

/** 货币兑换：按购买力汇率双向结算，金额精确到 0.01 */
export function exchangeCurrency(direction, amount) {
  if (game.dead) return ''
  const { rate } = exchangeRateInfo()
  if (!Number.isFinite(rate) || rate <= 0) return '当前身份无法计算汇率。'

  const value = roundToCents(Math.max(0, Number(amount) || 0))
  if (value < 0.01) return '兑换金额至少 0.01 枚。'

  if (direction === 'dawn') {
    const gain = floorToCents(value * rate)
    if (game.dawnCoins < value) {
      return `曙光币不足：兑换需要 ${formatMoney(value)} 枚。`
    }
    if (gain <= 0) return '金额太小，换不到 0.01 末日币。'
    game.dawnCoins = roundToCents(game.dawnCoins - value)
    game.coins = roundToCents(game.coins + gain)
    return `用 ${formatMoney(value)} 曙光币换到 ${formatMoney(gain)} 末日币（1 曙光币 = ${formatMoney(rate)} 末日币）。`
  }

  const gain = floorToCents(value / rate)
  if (game.coins < value) return `末日币不足：兑换需要 ${formatMoney(value)} 枚。`
  if (gain <= 0) return '金额太小，换不到 0.01 曙光币。'
  game.coins = roundToCents(game.coins - value)
  game.dawnCoins = roundToCents(game.dawnCoins + gain)
  return `用 ${formatMoney(value)} 末日币换到 ${formatMoney(gain)} 曙光币（1 末日币 = ${formatMoney(1 / rate)} 曙光币）。`
}

export function buyGood(goodId) {
  if (game.dead) return ''
  const good = SHOP_GOODS.find((item) => item.id === goodId)
  if (!good) return ''
  if (game.coins < good.price) return `末日币不足，${good.name} 需要 ${good.price}。`
  if (addItem(game.inventory, good.itemId, 1) > 0) return '背包已满，无法购买。'

  game.coins -= good.price
  return `购买 ${good.name} ×1，花费 ${good.price} 末日币。`
}

/* ===== 曙光阵地 ===== */

function dawnReady() {
  return !game.dead && game.location === 'dawn-post'
}

/** 领取救济：五档共用每天一次，按曙光身份等级开放 */
export function claimDawnRelief(tierId = 'basic') {
  if (!dawnReady()) return ''
  const tier = DAWN_RELIEF_TIERS.find((item) => item.id === tierId)
  if (!tier) return ''
  const rank = dawnInfo(game.dawnIdentity)?.rank ?? -1
  if (rank < tier.rank) {
    return `「${tier.name}」需要曙光身份「${tier.identity}」，你现在的身份还不够。`
  }
  if (cooldownLeft('dawn-relief', PALACE_COOLDOWN.daily) > 0) return '今天的救济已经领过了，明天再来。'

  const fruitId = pickDawnFruit()
  if (!fruitId) return '救济处今天没有水果可发。'
  const fruitName = getItem(fruitId)?.name ?? fruitId
  const required = [
    { id: fruitId, qty: tier.fruitCount },
    ...tier.items.map((entry) => ({ id: entry.itemId, qty: entry.qty })),
  ]
  if (!canStoreItems(game.inventory, required)) {
    return `背包空间不足，「${tier.name}」装不下，还不算领走。`
  }

  addItem(game.inventory, fruitId, tier.fruitCount)
  const parts = [`${fruitName} ×${tier.fruitCount}`]
  for (const entry of tier.items) {
    addItem(game.inventory, entry.itemId, entry.qty)
    parts.push(`${getItem(entry.itemId)?.name ?? entry.itemId} ×${entry.qty}`)
  }
  game.cooldowns['dawn-relief'] = game.day
  return `你从物资箱里领到「${tier.name}」：${parts.join('、')}。`
}

/** 每日工资：按当前曙光身份领取，四档共用每天一次 */
export function claimDawnSalary() {
  if (!dawnReady()) return ''
  const identity = dawnInfo(game.dawnIdentity)
  if (!identity) return '先联系管事加入曙光，才有工资可领。'
  const salary = DAWN_SALARY.find((item) => item.rank === identity.rank)
  if (!salary) return ''
  if (!useCooldown('dawn-salary', PALACE_COOLDOWN.daily)) {
    return '今天的工资已经领过了，明天再来。'
  }

  game.dawnCoins += salary.coins
  return `领取「${identity.name}」每日工资：曙光币 +${salary.coins}。`
}

/** 曙光市场：全部用曙光币结算 */
export function buyDawnGood(goodId) {
  if (!dawnReady()) return ''
  const good = DAWN_MARKET.find((item) => item.id === goodId)
  if (!good) return ''
  if (game.dawnCoins < good.price) return `曙光币不足，${good.name} 需要 ${good.price} 枚。`
  if (addItem(game.inventory, good.itemId, 1) > 0) return '背包已满，无法购买。'
  game.dawnCoins -= good.price
  return `购买 ${good.name} ×1，花费 ${good.price} 曙光币。`
}

/** 羁绊商店：提交对应纪念徽章 + 365 曙光币兑换限定武器 */
export function buyDawnBond(goodId) {
  if (!dawnReady()) return ''
  const good = DAWN_BOND_SHOP.find((item) => item.id === goodId)
  if (!good) return ''
  if (countItem(game.inventory, good.badgeId) < 1) {
    return `羁绊商店只认信物：需要「${good.badgeName}」×1 才能兑换 ${good.name}。`
  }
  if (game.dawnCoins < good.price) {
    return `曙光币不足，${good.name} 需要 ${good.price} 枚。`
  }
  if (removeItem(game.inventory, good.badgeId, 1) > 0) {
    return `「${good.badgeName}」扣除失败，背包状态异常。`
  }
  const leftover = addItem(game.inventory, good.itemId, 1)
  if (leftover > 0) {
    addItem(game.inventory, good.badgeId, 1)
    return '背包已满，无法兑换。'
  }
  game.dawnCoins -= good.price
  return `你用「${good.badgeName}」和 ${good.price} 曙光币换到了 ${good.name}。`
}

/** 补办历史最高的曙光徽章 */
export function restoreDawnIdentity() {
  if (!dawnReady()) return ''
  if (game.dawnIdentity) return `你的曙光身份牌还在（${game.dawnIdentity}），无需补办。`
  if (!game.maxDawnIdentity) return '没有可补办的曙光身份记录。'
  if (!grantDawnIdentity(game.maxDawnIdentity)) return '背包已满，补办的徽章无处安放。'
  return `已补办历史最高曙光身份「${game.maxDawnIdentity}」的徽章。`
}

/** 加入曙光：需要累计击杀 5 只行尸 */
export function joinDawn() {
  if (!dawnReady()) return ''
  if (game.dawnIdentity) return `你已经是曙光「${game.dawnIdentity}」，无需再加入。`
  if (game.zombieKills < DAWN_JOIN_KILLS) {
    return `管事翻了个白眼：实力不足，先杀够 ${DAWN_JOIN_KILLS} 只行尸再来（当前 ${game.zombieKills}）。`
  }
  if (!grantDawnIdentity('队员')) return '背包已满，队员徽章无处安放。'
  return '管事在名册上写下你的名字，你领到一枚「曙光队员徽章」。'
}

/* ===== 曙光常驻人物服务 ===== */

/** 苏涵：每日配餐，2 曙光币换一份随机食物 / 饮品 */
export function nutritionistMeal() {
  if (!dawnReady()) return ''
  if (cooldownLeft('dawn-meal', PALACE_COOLDOWN.daily) > 0) {
    return '苏涵已经把今天的配餐分完了，明天再来。'
  }

  const price = DAWN_SERVICE.meal.price
  if (game.dawnCoins < price) return `曙光币不足，配餐需要 ${price} 枚。`

  const itemId = pickDawnMeal()
  if (!itemId) return '配餐台上空着。'
  const def = getItem(itemId)
  if (addItem(game.inventory, itemId, 1) > 0) {
    return `背包已满，${def?.name ?? '配餐'}没能装下，曙光币没有扣。`
  }

  game.dawnCoins -= price
  game.cooldowns['dawn-meal'] = game.day
  return `苏涵把一份热食推到你面前：获得 ${def?.name ?? itemId} ×1，花费 ${price} 曙光币。`
}

/** 莉莉：每日调配一支药剂，清除 20 点感染 */
export function lilyBrewMedicine() {
  if (!dawnReady()) return ''
  if (cooldownLeft('dawn-brew', PALACE_COOLDOWN.daily) > 0) {
    return '莉莉说今天的药已经熬过一锅了，明天再来。'
  }
  if (game.stats.infection <= 0) return '莉莉看了看你的伤口：没有感染，药白熬了。'

  const price = DAWN_SERVICE.brew.price
  if (game.dawnCoins < price) return `曙光币不足，药剂需要 ${price} 枚。`

  game.dawnCoins -= price
  adjustStats({ infection: -DAWN_SERVICE.brew.infection })
  game.cooldowns['dawn-brew'] = game.day
  return `莉莉把一支药剂推过来：感染 -${DAWN_SERVICE.brew.infection}，花费 ${price} 曙光币。`
}

/** 莉莉：拆解背包里的远程武器，按品质返还曙光币 */
export function recycleRangedWeapon(slotIndex) {
  if (!dawnReady()) return ''
  const entry = game.inventory[slotIndex]
  if (!entry) return '这个格子里没有东西。'
  const def = getItem(entry.id)
  if (!def || def.category !== 'ranged') return '莉莉只收远程武器。'

  const price = recyclePriceForDay(def.tier, game.day)
  game.inventory[slotIndex] = null
  game.dawnCoins += price
  return `莉莉把「${def.name}」拆成零件：曙光币 +${price}。`
}

/** 物资回收：背包里所有多余武器（近战 + 远程），装备中的不算 */
export function weaponRecyclables() {
  return game.inventory
    .map((entry, index) => {
      const def = entry ? getItem(entry.id) : null
      if (!def || def.category !== 'melee' && def.category !== 'ranged') return null
      return { index, def, price: recyclePriceForDay(def.tier, game.day) }
    })
    .filter(Boolean)
}

/** 回收任意一件多余武器，按品质结算曙光币 */
export function recycleWeapon(slotIndex) {
  if (!dawnReady()) return ''
  const entry = game.inventory[slotIndex]
  if (!entry) return '这个格子里没有东西。'
  const def = getItem(entry.id)
  if (!def || (def.category !== 'melee' && def.category !== 'ranged')) {
    return '物资回收只收武器。'
  }

  const price = recyclePriceForDay(def.tier, game.day)
  game.inventory[slotIndex] = null
  game.dawnCoins += price
  return `你把「${def.name}」交了上去：曙光币 +${price}。`
}

/** 薇尔：每日一次训练，消耗 1 回合 */
export function mercenaryTraining() {
  if (!dawnReady()) return ''
  if (cooldownLeft('dawn-training', PALACE_COOLDOWN.daily) > 0) {
    return '薇尔把毛巾丢回架子上：今天练过了，明天再来。'
  }

  const price = DAWN_SERVICE.training.price
  if (game.dawnCoins < price) return `曙光币不足，训练需要 ${price} 枚。`

  const actionDay = game.day
  advanceTurns(1)
  if (game.dead) return ''
  adjustStats({
    stamina: DAWN_SERVICE.training.stamina,
    sanity: DAWN_SERVICE.training.sanity,
  })
  game.dawnCoins -= price
  game.cooldowns['dawn-training'] = actionDay
  return `薇尔陪你练了一轮：体力 +${DAWN_SERVICE.training.stamina}，理智 +${DAWN_SERVICE.training.sanity}，花费 ${price} 曙光币。`
}

/** 苗苗：每日照看一次实验田，消耗 2 回合，累计田地进度 */
export function tendExperimentField() {
  if (!dawnReady()) return ''
  if (cooldownLeft('field-tend', PALACE_COOLDOWN.daily) > 0) {
    return '苗苗说今天的田已经浇过水了，明天再来。'
  }

  const actionDay = game.day
  advanceTurns(DAWN_SERVICE.tend.turns)
  if (game.dead) return ''

  let line = '你帮苗苗翻了一遍土，又浇了两桶水。'
  const itemId = pickDawnFruit()
  if (itemId) {
    const def = getItem(itemId)
    const leftover = addItem(game.inventory, itemId, 1)
    line +=
      leftover > 0
        ? `背包已满，${def?.name ?? '果子'}落在了田埂上。`
        : `苗苗摘了一个${def?.name ?? '水果'}给你。`
  }

  game.cooldowns['field-tend'] = actionDay
  const progress = (Number(game.flags.fieldProgress) || 0) + 1
  game.flags.fieldProgress = progress

  if (progress >= DAWN_SERVICE.fieldSecretAt && !game.flags.fieldSecret) {
    line += `田地进度 ${progress} / ${DAWN_SERVICE.fieldSecretAt}。苗苗盯着那几垄地看了很久，忽然说：「你想不想听一个秘密？」`
  } else {
    line += `田地进度 ${progress} / ${DAWN_SERVICE.fieldSecretAt}。`
  }
  return line
}

/** 苗苗：田地进度满 5 后，听她讲一个秘密，获得农业大师徽章 */
export function revealFieldSecret() {
  if (!dawnReady()) return ''
  if (game.flags.fieldSecret) return '苗苗把日记本合上，锁回了抽屉里。'

  const progress = Number(game.flags.fieldProgress) || 0
  if (progress < DAWN_SERVICE.fieldSecretAt) {
    return `苗苗摇摇头：「田还没长好呢。」（田地进度 ${progress} / ${DAWN_SERVICE.fieldSecretAt}）`
  }

  if (addItem(game.inventory, 'badge-farming-master', 1) > 0) {
    return '背包已满，那枚旧徽章还压在苗苗手里。'
  }
  game.flags.fieldSecret = true
  return '苗苗从日记本里取出一枚褪色的徽章，放在你掌心。\n\n「我娘以前是农技站的。她总说，地不会骗人，你给它多少，它就还你多少。」她把日记本翻到最后一页，上面画着一整片田，「这块地是我替她留的。现在，你也算种过它的人了。」\n\n获得【农业大师徽章】。'
}

/* ===== 都城王宫（进入不消耗回合） ===== */

function palaceReady() {
  return !game.dead && game.location === 'ruined-city'
}

function knightReady() {
  return identityRank(game.identity) >= identityRank('骑士')
}

/** 贵族商店：王宫限定商品，全部用末日币结算 */
export function buyPalaceGood(goodId) {
  if (!palaceReady()) return ''
  if (!knightReady()) return '至少需要「骑士」身份才能进入王宫。'
  const good = PALACE_SHOP.find((item) => item.id === goodId)
  if (!good) return ''
  if (game.coins < good.price) return `末日币不足，${good.name} 需要 ${good.price}。`
  if (addItem(game.inventory, good.itemId, 1) > 0) return '背包已满，无法购买。'

  game.coins -= good.price
  return `购买 ${good.name} ×1，花费 ${good.price} 末日币。`
}

/** 偷窃：1 回合（正常衰减），每天一次，按概率获得末日币或被守卫扇耳光 */
export function stealPalace() {
  if (!palaceReady()) return ''
  if (!knightReady()) return '至少需要「骑士」身份才能进入王宫。'
  if (!useCooldown('steal', PALACE_COOLDOWN.daily)) {
    return '今天已经偷过一次，守卫把你盯得更紧了。'
  }

  advanceTurns(1)
  if (game.dead) return ''

  game.flags.cityTheftCount = (Number(game.flags.cityTheftCount) || 0) + 1
  recordGuildTheft()

  if (activeGuildId() === 'rogue') {
    game.coins += 3
    return '盗贼公会的徽章让守卫移开了视线：末日币 +3。'
  }

  const roll = Math.random() * 100
  if (roll < 10) {
    game.coins += 3
    return '你摸走了一只鼓鼓的钱袋，没人看见：末日币 +3。'
  }
  if (roll < 30) {
    game.coins += 2
    return '你从供桌上抽走两枚硬币，塞进袖口：末日币 +2。'
  }
  if (roll < 60) {
    game.coins += 1
    return '你从银器柜里摸走一枚末日币：末日币 +1。'
  }
  if (roll < 80) {
    return '你把手伸进柜子，只摸到一层灰，什么也没偷到。'
  }

  adjustStats({ hp: -5 })
  return game.dead ? '' : '守卫一巴掌扇在你脸上，把你推出长廊：生命 -5。'
}

/** 宫廷舞会：三档共用每日次数，1 回合，无衰减，骑士以上 */
export function palaceDance(danceId = 'common') {
  if (!palaceReady()) return ''
  if (!knightReady()) return '至少需要「骑士」身份才能参加宫廷舞会。'
  const dance = PALACE_DANCES.find((item) => item.id === danceId)
  if (!dance) return ''
  if (cooldownLeft('dance', PALACE_COOLDOWN.daily) > 0) return '今天的舞会已经结束，明天再来。'
  if (game.coins < dance.price) return `末日币不足，${dance.name} 需要 ${dance.price}。`
  useCooldown('dance', PALACE_COOLDOWN.daily)

  if (dance.price > 0) game.coins -= dance.price
  advanceTurns(1, { decay: false })
  if (game.dead) return ''
  adjustStats({ sanity: dance.sanity })
  const cost = dance.price > 0 ? `，花费 ${dance.price} 末日币` : ''
  return `${dance.name}结束：理智 +${dance.sanity}${cost}。`
}

/** 宫廷宴会：三档共用每日次数，1 回合，无衰减，骑士以上 */
export function palaceBanquet(banquetId = 'common') {
  if (!palaceReady()) return ''
  if (!knightReady()) return '至少需要「骑士」身份才能参加宫廷宴会。'
  const banquet = PALACE_BANQUETS.find((item) => item.id === banquetId)
  if (!banquet) return ''
  if (cooldownLeft('banquet', PALACE_COOLDOWN.daily) > 0) return '今天的宴会已经结束，明天再来。'
  if (game.coins < banquet.price) return `末日币不足，${banquet.name} 需要 ${banquet.price}。`
  useCooldown('banquet', PALACE_COOLDOWN.daily)

  if (banquet.price > 0) game.coins -= banquet.price
  advanceTurns(1, { decay: false })
  if (game.dead) return ''
  adjustStats({ hunger: banquet.hunger, thirst: banquet.thirst })
  const cost = banquet.price > 0 ? `，花费 ${banquet.price} 末日币` : ''
  return `${banquet.name}结束：饱食 +${banquet.hunger}，口渴 +${banquet.thirst}${cost}。`
}

/** 宫廷客房：三档共用每日次数，2 回合，无衰减，骑士以上 */
export function palaceGuestRoom(roomId = 'common') {
  if (!palaceReady()) return ''
  if (!knightReady()) return '至少需要「骑士」身份才能入住宫廷客房。'
  const room = PALACE_ROOMS.find((item) => item.id === roomId)
  if (!room) return ''
  if (cooldownLeft('room', PALACE_COOLDOWN.daily) > 0) return '今天已经住过一次客房，明天再来。'
  if (game.coins < room.price) return `末日币不足，${room.name} 需要 ${room.price}。`
  useCooldown('room', PALACE_COOLDOWN.daily)

  if (room.price > 0) game.coins -= room.price
  advanceTurns(2, { decay: false })
  if (game.dead) return ''
  adjustStats({ stamina: room.stamina })
  const cost = room.price > 0 ? `，花费 ${room.price} 末日币` : ''
  return `${room.name}：体力 +${room.stamina}${cost}。`
}

/** 感染治疗：1 回合，无衰减，每天一次，按身份解锁不同档位 */
export function treatInfection(tierId) {
  if (!palaceReady()) return ''
  const tier = TREATMENT_TIERS.find((item) => item.id === tierId)
  if (!tier) return ''
  if (identityRank(game.identity) < tier.minRank) {
    return `「${tier.name}」至少需要「${tier.minIdentity}」身份。`
  }
  if (!useCooldown('treatment', PALACE_COOLDOWN.daily)) {
    return '今天已经接受过一次治疗，明天再来。'
  }

  advanceTurns(1, { decay: false })
  if (game.dead) return ''
  adjustStats({ infection: -tier.reduce })
  return `接受了${tier.name}：感染 -${tier.reduce}。`
}

/** 领取俸禄：1 回合，无衰减，每天一次，按身份发币 */
export function claimSalary() {
  if (!palaceReady()) return ''
  const amount = PALACE_SALARY[game.identity]
  if (!amount) return '只有骑士及以上身份才能领取俸禄。'
  if (!useCooldown('salary', PALACE_COOLDOWN.daily)) return '今天已经领过俸禄，明天再来。'

  advanceTurns(1, { decay: false })
  if (game.dead) return ''
  game.coins += amount
  return `以「${game.identity}」的身份领取俸禄：末日币 +${amount}。`
}

/** 参加会议：1 回合，无衰减，七种会议共用七日冷却 */
export function attendCouncil(councilId = 'knight') {
  if (!palaceReady()) return ''

  const council = PALACE_COUNCILS.find((item) => item.id === councilId)
  if (!council) return ''
  if (identityRank(game.identity) < council.rank) {
    return `「${council.name}」需要「${council.identity}」身份。`
  }
  if (!useCooldown('council', PALACE_COOLDOWN.weekly)) return '会议七天一次，还没到下一次。'

  advanceTurns(council.turns, { decay: false })
  if (game.dead) return ''

  game.coins += council.coins
  let line = `你参加「${council.name}」直到散会：末日币 +${council.coins}。`

  const weapon = pickMeleeByTier(council.weaponTier)
  if (weapon) {
    const leftover = addItem(game.inventory, weapon.id, 1)
    line +=
      leftover > 0
        ? ` 背包已满，${weapon.name}留在了会议桌上。`
        : ` 会后有人递给你一把${weapon.name}（${weapon.tier}）。`
  }
  return line
}

/** 宫廷花园：仅储君可用，四项活动各自计算次数 */
export function gardenActivity(activityId = 'walk') {
  if (!palaceReady()) return ''
  if (identityRank(game.identity) < GARDEN.rank) {
    return `花园只对「${GARDEN.identity}」开放。守卫没有让你进去。`
  }
  const activity = GARDEN.activities.find((item) => item.id === activityId)
  if (!activity) return ''
  if (!useCooldown(activity.cooldownKey, activity.days)) {
    return `「${activity.name}」${activity.days} 天一次，还没到下一次。`
  }

  advanceTurns(activity.turns, { decay: false })
  if (game.dead) return ''

  const lines = [`「${activity.name}」完成。`]

  if (activity.fullRestore) {
    Object.assign(game.stats, DEFAULT_STATS, { hp: statCap('hp') })
    lines.push('状态全部补满。')
  }
  if (activity.coins) {
    game.coins += activity.coins
    lines.push(`末日币 +${activity.coins}。`)
  }

  if (activity.fruitCount) {
    const fruitId = pickDawnFruit()
    if (fruitId) {
      const def = getItem(fruitId)
      const leftover = addItem(game.inventory, fruitId, activity.fruitCount)
      const added = activity.fruitCount - leftover
      const name = def?.name ?? '水果'
      if (added > 0) lines.push(`获得${name} ×${added}。`)
      if (leftover > 0) lines.push(`背包已满，${name} ×${leftover}留在了藤架下。`)
    }
  }

  for (const entry of activity.items ?? []) {
    const def = getItem(entry.itemId)
    const leftover = addItem(game.inventory, entry.itemId, entry.qty)
    const added = entry.qty - leftover
    const name = def?.name ?? entry.itemId
    if (added > 0) lines.push(`获得${name} ×${added}。`)
    if (leftover > 0) lines.push(`背包已满，${name} ×${leftover}留在了石桌上。`)
  }

  return lines.join(' ')
}

/* ===== 背包操作 ===== */

/** 背包整理入口：纯排序逻辑在 data/inventory.js */
export function organizeBackpack() {
  if (game.dead) return false
  organizeInventory(game.inventory)
  notify('背包已整理')
  return true
}

export function useItem(slotIndex) {
  const entry = game.inventory[slotIndex]
  if (!entry) return
  const def = getItem(entry.id)

  // 天使宝石：每天免费使用 3 次，使用后不消失
  if (def?.special === 'angel-gem') {
    const state = game.flags.angelGem
    const uses = state?.day === game.day ? Number(state.uses) || 0 : 0
    if (uses >= 3) {
      notify('天使宝石今天已经用过 3 次了，明天再来。')
      return
    }
    game.stats.hp = clampStat((game.stats.hp ?? 0) + 30, 'hp')
    game.flags.angelGem = { day: game.day, uses: uses + 1 }
    notify(`天使宝石展开光翼 · 生命 +30（今日 ${uses + 1} / 3）`, 3000)
    return
  }

  // 时间宝石：每天一次，快进 3 回合且不结算回合消耗
  if (def?.special === 'time-gem') {
    if (Number(game.flags.timeGemDay) === game.day) {
      notify('时间宝石今天已经转动过了。')
      return
    }
    game.flags.timeGemDay = game.day
    advanceTurns(3, { decay: false })
    notify('时间宝石转动 · 时间快进 3 回合，没有产生回合消耗。', 3200)
    return
  }

  if (!def?.effects) {
    notify(`${def?.name ?? '该物品'}暂时无法使用`)
    return
  }

  const guild = activeGuild()
  const medicineMultiplier =
    guild?.medicineIds?.includes(entry.id) ? (guild.medicineMultiplier ?? 1) : 1
  const changes = []
  for (const [key, delta] of Object.entries(def.effects)) {
    const applied = delta * medicineMultiplier
    game.stats[key] = clampStat((game.stats[key] ?? 0) + applied, key)
    changes.push(`${STAT_LABELS[key] ?? key} ${applied > 0 ? '+' : ''}${applied}`)
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
  const doubled =
    guild?.cleanlinessCostMultiplier &&
    guild.weaponIds?.includes(equipped.id)
      ? guild.cleanlinessCostMultiplier
      : 1
  const current = Number.isFinite(equipped.cleanliness) ? equipped.cleanliness : CLEANLINESS_MAX
  equipped.cleanliness = Math.max(
    0,
    current - CLEANLINESS_PER_SHOT * doubled,
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
export function consumeMeleeDurability() {
  const equipped = game.equipment.melee
  if (!equipped) return { broken: false, name: '' }

  const def = getItem(equipped.id)
  const max = def?.weapon?.durability
  if (!Number.isFinite(max)) return { broken: false, name: def?.name ?? '' }

  const guild = activeGuild()
  const doubled =
    guild?.durabilityCostMultiplier && guild.weaponIds?.includes(equipped.id)
      ? guild.durabilityCostMultiplier
      : 1
  const current = Number.isFinite(equipped.durability) ? equipped.durability : max
  equipped.durability = Math.max(0, current - doubled)
  if (equipped.durability > 0) return { broken: false, name: def?.name ?? '' }

  game.equipment.melee = null
  syncHpCap()
  notify(`${def?.name ?? '武器'}已经彻底损坏`, 3000)
  return { broken: true, name: def?.name ?? '' }
}

/* ===== NPC 任务 ===== */

const DAWN_NPC_OWNERS = ['nutritionist', 'mechanic', 'mercenary', 'agronomist']

function questOwnerReady(owner) {
  if (owner === 'mafei') return !game.dead && game.location === MAFEI.mapId
  if (owner === 'alex') return !game.dead && game.location === 'long-beach-harbor'
  if (['schika', 'nubi', 'moran'].includes(owner)) {
    return !game.dead && game.location === AIRSHIP.mapId
  }
  return owner === 'king' || owner === 'queen' ? palaceReady() : dawnReady()
}

function previousQuest(quest) {
  const line = questLine(quest.owner)
  const index = line.findIndex((item) => item.id === quest.id)
  return index > 0 ? line[index - 1] : null
}

export function isQuestDone(id) {
  return game.quests[id]?.status === 'done'
}

export function isQuestActive(id) {
  return game.quests[id]?.status === 'active'
}

/** 击杀进度：接取时记录基准，只统计接取之后的击杀 */
export function questKillProgress(id) {
  const quest = questById(id)
  const target = quest?.require?.kills
  if (!target) return null
  const baseline = Number(game.quests[id]?.baseline) || 0
  return { current: Math.max(0, game.zombieKills - baseline), target }
}

/** 整条任务线的对话门槛：返回空字符串表示可以对话 */
export function questLineLocked(owner) {
  if (owner === 'king') {
    if (game.flags.kingKilled) return '国王艾伦已经不在了。'
    if (identityRank(game.identity) < identityRank('骑士')) {
      return '国王艾伦没有看你。至少需要「骑士」身份，他才愿意开口。'
    }
    return ''
  }

  if (owner === 'queen') {
    if (game.flags.queenKilled) return '皇后米娅已经不在了。'
    if (identityRank(game.identity) < identityRank('骑士')) {
      return '皇后米娅没有看你。至少需要「骑士」身份，王宫的门才会为你打开。'
    }
    if (!isQuestDone('yiyang-5')) {
      return '皇后米娅没有召见你。她只肯见曙光阵地那位首领信得过的人。'
    }
    if (!game.flags.queenLetterDelivered) {
      return game.flags.queenLetter
        ? '皇后米娅看着你手里的信，没有先开口。'
        : '皇后米娅没有召见你。'
    }
    return ''
  }

  if (owner === 'mafei') {
    return game.flags.mafeiKilled ? '马斐已经不在了。' : ''
  }

  if (owner === 'alex') {
    return game.flags.alexKilled ? '亚历克斯船长已经不在了。' : ''
  }

  if (['schika', 'nubi', 'moran'].includes(owner)) {
    if (game.flags.airshipCoupDone) {
      return '飞行船已经换了主人，这位贵族不再交办任务。'
    }
    if (owner === 'schika' && identityRank(game.identity) < identityRank('骑士')) {
      return '席卡只和有爵位的人说话。至少需要「骑士」身份。'
    }
    if (owner === 'moran' && identityRank(game.identity) < identityRank('伯爵')) {
      return '漠然的觐见厅只对伯爵以上开放。'
    }
    return ''
  }

  if (owner === 'yiyang' && game.flags.dawnLeaderKilled) return '羿阳已经不在了。'

  if (DAWN_NPC_OWNERS.includes(owner)) {
    const npc = npcById(owner)
    if (npc && game.flags[npc.deathFlag]) return `${npc.name}已经不在了。`
    if (!game.dawnIdentity) {
      return '哨塔里的人还不认识你。先联系管事加入曙光。'
    }
  }
  return ''
}

/** 单个任务不能接取的原因 */
export function questLockReason(id) {
  const quest = questById(id)
  if (!quest) return '未知任务。'
  const state = game.quests[id]?.status
  if (state === 'done') return '这个任务已经完成。'
  if (state === 'active') return ''

  const lineGate = questLineLocked(quest.owner)
  if (lineGate) return lineGate

  if (game.flags.dawnLeaderKilled && quest.owner === 'queen') {
    return '羿阳已经不在了，皇后不再交办新的事。'
  }

  const previous = previousQuest(quest)
  if (previous && !isQuestDone(previous.id)) {
    return `需要先完成「${previous.name}」。`
  }

  if (quest.require?.dawnIdentity && dawnRank(game.dawnIdentity) < dawnRank(quest.require.dawnIdentity)) {
    return `需要曙光「${quest.require.dawnIdentity}」身份（当前：${game.dawnIdentity ?? '无'}）。`
  }

  return ''
}

export function questStatus(id) {
  const quest = questById(id)
  if (!quest) return 'locked'
  const state = game.quests[id]?.status
  if (state === 'done') return 'done'
  if (state === 'active') return 'active'
  return questLockReason(id) ? 'locked' : 'available'
}

export function acceptQuest(id) {
  const quest = questById(id)
  if (!quest || !questOwnerReady(quest.owner)) return ''
  const reason = questLockReason(id)
  if (reason) return reason

  if (quest.require?.betrayal) {
    game.quests[id] = { status: 'done' }
    die(MAFEI.betrayalReason, '恶魔')
    return ''
  }

  game.quests[id] = { status: 'active', baseline: game.zombieKills }
  return quest.require?.kills
    ? `已接取「${quest.name}」，从现在开始计算击杀。`
    : `已接取「${quest.name}」。`
}

function questClaimBlocker(quest) {
  const state = game.quests[quest.id]
  if (!state || state.status !== 'active') return '这个任务现在不能提交。'
  if (['schika', 'nubi', 'moran'].includes(quest.owner) && game.flags.airshipCoupDone) {
    return '政变之后，这位贵族不再承认这份委托。'
  }

  for (const item of quest.require?.items ?? []) {
    const have = countItem(game.inventory, item.id)
    if (have < item.qty) {
      const name = getItem(item.id)?.name ?? item.id
      return `「${name}」不够：${have}/${item.qty}。`
    }
  }

  if (quest.require?.kills) {
    const progress = questKillProgress(quest.id)
    if (progress.current < progress.target) {
      return `还差 ${progress.target - progress.current} 只行尸。`
    }
  }

  if (quest.require?.boss === 'dawn-leader' && !game.flags.dawnLeaderKilled) {
    return '羿阳还活着。'
  }

  if (quest.require?.npc) {
    const npc = npcById(quest.require.npc)
    if (npc && !game.flags[npc.deathFlag]) return `${npc.name}还活着。`
  }

  if (quest.require?.flag && !game.flags[quest.require.flag]) {
    return quest.require.label ? `还没有完成「${quest.require.label}」。` : '条件还没有达成。'
  }

  return ''
}

/** 在背包副本上模拟扣除与发放，空间不够时整体拒绝 */
function simulateQuestClaim(quest) {
  const copy = game.inventory.map((entry) => (entry ? { ...entry } : null))
  for (const item of quest.require?.items ?? []) {
    if (removeItem(copy, item.id, item.qty) > 0) return false
  }

  const reward = quest.reward ?? {}

  if (reward.identity) {
    const badgeId = identityItemId(reward.identity)
    for (let index = 0; index < copy.length; index += 1) {
      const entry = copy[index]
      if (!entry) continue
      const def = getItem(entry.id)
      if (def?.category === 'identity' && def.faction !== 'dawn') copy[index] = null
    }
    if (!badgeId || addItem(copy, badgeId, 1) > 0) return false
  }

  if (reward.dawnIdentity) {
    const badgeId = dawnItemId(reward.dawnIdentity)
    for (let index = 0; index < copy.length; index += 1) {
      const entry = copy[index]
      if (!entry) continue
      const def = getItem(entry.id)
      if (def?.category === 'identity' && def.faction === 'dawn') copy[index] = null
    }
    if (!badgeId || addItem(copy, badgeId, 1) > 0) return false
  }

  for (const item of reward.items ?? []) {
    if (addItem(copy, item.id, item.qty ?? 1) > 0) return false
  }

  return true
}

function grantQuestRewards(quest) {
  const reward = quest.reward ?? {}
  if (reward.identity) grantIdentity(reward.identity)
  if (reward.dawnIdentity) grantDawnIdentity(reward.dawnIdentity)
  if (reward.coins) game.coins += reward.coins
  if (reward.dawnCoins) game.dawnCoins += reward.dawnCoins
  if (reward.reputation) game.reputation += reward.reputation
  for (const item of reward.items ?? []) addItem(game.inventory, item.id, item.qty ?? 1)
  if (reward.flag && typeof reward.flag === 'object') Object.assign(game.flags, reward.flag)
  if (reward.finale) game.finale = reward.finale
}

function questRewardText(quest) {
  const reward = quest.reward ?? {}
  const parts = []
  if (reward.identity) parts.push(`「${reward.identity}」身份牌`)
  if (reward.dawnIdentity) parts.push(`曙光「${reward.dawnIdentity}」徽章`)
  if (reward.coins) parts.push(`${reward.coins} 末日币`)
  if (reward.dawnCoins) parts.push(`${reward.dawnCoins} 曙光币`)
  if (reward.reputation) parts.push(`${reward.reputation} 声望`)
  for (const item of reward.items ?? []) {
    parts.push(`${getItem(item.id)?.name ?? item.id} ×${item.qty ?? 1}`)
  }
  if (reward.finale) parts.push(`结局「${reward.finale}」`)
  return parts.join('、')
}

export function claimQuest(id) {
  const quest = questById(id)
  if (!quest || !questOwnerReady(quest.owner)) return ''

  const blocker = questClaimBlocker(quest)
  if (blocker) return blocker
  if (!simulateQuestClaim(quest)) return '背包空间不足，先腾出位置再来领取。'

  for (const item of quest.require?.items ?? []) {
    removeItem(game.inventory, item.id, item.qty)
  }
  grantQuestRewards(quest)
  game.quests[id] = { status: 'done' }

  const rewards = questRewardText(quest)
  const note = quest.reward?.note ? `\n\n${quest.reward.note}` : ''
  return `任务「${quest.name}」完成。获得 ${rewards}。${note}`
}

/** 皇后线前置：把羿阳托付的信交给皇后 */
export function deliverQueenLetter() {
  if (!palaceReady()) return ''
  if (!game.flags.queenLetter) return '你手里没有要交给皇后的信。'
  game.flags.queenLetter = false
  game.flags.queenLetterDelivered = true
  return '皇后米娅接过信，看到信封上的字迹时，手停在了半空。\n\n「这是……哥哥的字。」她的声音很轻，「三年了，他才肯让人送信来。」\n\n她把信折好，按在胸口，没有哭。\n\n「既然是他信得过的人，那你也算我信得过的人。」她抬起头，「替我办几件事。」'
}

/** 管事处的晋升：按累计击杀授予队长 / 指挥 */
export function promoteDawnIdentity() {
  if (!dawnReady()) return ''
  if (!game.dawnIdentity) return '你还没有加入曙光，先去联系管事登记名册。'

  const promotion = DAWN_PROMOTIONS.find((item) => item.from === game.dawnIdentity)
  if (!promotion) {
    return game.dawnIdentity === '指挥'
      ? '管事关上名册：副首只能由首领羿阳亲自授予。'
      : '你已经是曙光「副首」，没有更高的位置。'
  }

  if (game.zombieKills < promotion.kills) {
    return `管事翻了翻名册：晋升${promotion.to}需要累计击杀 ${promotion.kills} 只行尸（当前 ${game.zombieKills}）。`
  }

  if (!grantDawnIdentity(promotion.to)) return '背包已满，晋升徽章无处安放。'
  return `管事在名册上划掉旧名字：你晋升为曙光「${promotion.to}」。`
}

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

/** 当日购买汽油的单价（1-3 末日币） */
export function airshipGasolinePrice() {
  return oilPriceForDay(game.day)
}

/** 提交汽油：1 桶换 1 末日币 */
export function submitAirshipGasoline(quantity) {
  if (!airshipReady()) return '储油仓库在末日飞行船上。'
  const qty = Math.floor(Number(quantity) || 0)
  if (qty <= 0) return '请输入要提交的汽油数量。'

  const have = countItem(game.inventory, HELICOPTER.gasolineId)
  if (have < qty) return `汽油不足，当前只有 ${have} 桶。`

  removeItem(game.inventory, HELICOPTER.gasolineId, qty)
  const gained = qty * AIRSHIP.oil.sellRate
  game.coins += gained
  return `提交汽油 ${qty} 桶，换得 ${gained} 末日币。`
}

/** 购买汽油：按当日单价结算 */
export function buyAirshipGasoline(quantity) {
  if (!airshipReady()) return '储油仓库在末日飞行船上。'
  const qty = Math.floor(Number(quantity) || 0)
  if (qty <= 0) return '请输入要购买的汽油数量。'

  const price = oilPriceForDay(game.day)
  const total = price * qty
  if (game.coins < total) return `末日币不足，${qty} 桶汽油需要 ${total} 枚。`
  if (!canStoreItems(game.inventory, [{ id: HELICOPTER.gasolineId, qty }])) {
    return '背包已满，无法购买。'
  }

  addItem(game.inventory, HELICOPTER.gasolineId, qty)
  game.coins -= total
  return `购买汽油 ${qty} 桶，花费 ${total} 末日币（单价 ${price}）。`
}

/* ===== 天赋启用 ===== */

function autoEnableTalent(kind) {
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
function ensureStockMarketDay() {
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
