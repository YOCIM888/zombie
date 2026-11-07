import { reactive } from 'vue'
import { SAVE_SLOT_COUNT } from './config'

const SLOT_KEY = 'xingshi.slots.v1'
const GLOBAL_KEY = 'xingshi.global.v1'
const SETTINGS_KEY = 'xingshi.settings.v1'

/** 导出文件的轻量版本标记：只用于判断「当前游戏能否读取这份文件」 */
export const SAVE_BUNDLE_VERSION = 1

/**
 * 浏览器 localStorage 的常见配额是 5 MB。Chromium / Firefox 以 UTF-16 字符计量，
 * 约 5 × 1024 × 1024 = 5,242,880 个字符（换算成字节约 10 MB）。
 * 这里统一按字符统计占用，再用「每字符 2 字节」估算实际字节数。
 */
export const STORAGE_QUOTA_CHARS = 5 * 1024 * 1024
export const STORAGE_QUOTA_MB = 5
export const STORAGE_BYTES_PER_CHAR = 2
export const STORAGE_WARN_RATIO = 0.8
export const STORAGE_DANGER_RATIO = 0.95

/** 存档界面里展示的中文标签；其余键（构筑计算器、开发者面板等）归入「其他数据」 */
const KEY_LABELS = {
  [SLOT_KEY]: '存档槽位',
  [GLOBAL_KEY]: '全局统计',
  [SETTINGS_KEY]: '设置',
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

/**
 * 统计整站 localStorage 的实际占用（所有键，不只存档）。
 * 计量口径：键名 + 值的字符数；UTF-16 下每字符约 2 字节。
 */
export function storageUsage() {
  const items = []
  let chars = 0
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key == null) continue
      const value = localStorage.getItem(key) ?? ''
      const size = key.length + value.length
      chars += size
      items.push({ key, label: KEY_LABELS[key] ?? key, chars: size })
    }
  } catch {
    /* localStorage 不可用（隐私模式等）时按 0 处理 */
  }
  const charsOf = (key) => items.find((item) => item.key === key)?.chars ?? 0
  return {
    items,
    chars,
    bytes: chars * STORAGE_BYTES_PER_CHAR,
    quotaChars: STORAGE_QUOTA_CHARS,
    quotaBytes: STORAGE_QUOTA_CHARS * STORAGE_BYTES_PER_CHAR,
    quotaMb: STORAGE_QUOTA_MB,
    /** 按 5 MB 字符配额折算的已用 MB，用于「x MB / 5 MB」展示 */
    usedMb: chars / (1024 * 1024),
    ratio: STORAGE_QUOTA_CHARS > 0 ? chars / STORAGE_QUOTA_CHARS : 0,
    slotChars: charsOf(SLOT_KEY),
    globalChars: charsOf(GLOBAL_KEY),
    settingsChars: charsOf(SETTINGS_KEY),
  }
}

/** 字节数转中文可读大小 */
export function formatStorageSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

/** 响应式占用快照：写入、删除、导入后调用 refreshStorageUsage() 刷新 */
export const storageState = reactive({
  usage: storageUsage(),
})

export function refreshStorageUsage() {
  storageState.usage = storageUsage()
  return storageState.usage
}

const storedSlots = readJSON(SLOT_KEY, [])
const slotSource = Array.isArray(storedSlots)
  ? storedSlots
  : Array.isArray(storedSlots?.list)
    ? storedSlots.list
    : []
const storedGlobal = readJSON(GLOBAL_KEY, {})
const storedSettings = readJSON(SETTINGS_KEY, {})

let playtimeBuffer = 0
let lastPlaytimeFlush = Date.now()

/**
 * 旧版只有 3 个槽位，但键名 xingshi.slots.v1 与「按索引排列的数组」结构没有变化，
 * 因此这里按 10 个位置读取：0..2 命中老数据，3..9 补 null，天然兼容，无需迁移键名。
 */
export const saveSlots = reactive({
  list: Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => slotSource?.[i] ?? null),
})

export const globalStats = reactive({
  totalPlaytime: Number(storedGlobal.totalPlaytime) || 0,
  achievements: Array.isArray(storedGlobal.achievements) ? storedGlobal.achievements : [],
  deathEndings: Array.isArray(storedGlobal.deathEndings) ? storedGlobal.deathEndings : [],
})

export const settings = reactive({
  volume: Number.isFinite(storedSettings.volume) ? storedSettings.volume : 0.7,
  sfxVolume: Number.isFinite(storedSettings.sfxVolume) ? storedSettings.sfxVolume : 0.7,
  muted: Boolean(storedSettings.muted),
  track: typeof storedSettings.track === 'string' ? storedSettings.track : 'background',
  survivalHints: storedSettings.survivalHints !== false,
})

function quotaMessage(usage) {
  return (
    `浏览器本地存储空间不足（当前已用约 ${(usage.ratio * 100).toFixed(0)}%，` +
    `约 ${(usage.chars / (1024 * 1024)).toFixed(2)} MB / 5 MB）。本次写入没有生效，` +
    '已有存档保持不变。请先删除不需要的存档，或清理浏览器中本站的数据后重试。'
  )
}

/** 写入失败时回滚内存状态并返回可展示的提示，避免静默失败 */
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    refreshStorageUsage()
    return { ok: true }
  } catch {
    const usage = storageUsage()
    return { ok: false, reason: 'quota', usage, message: quotaMessage(usage) }
  }
}

function persistSlots() {
  return writeJSON(SLOT_KEY, saveSlots.list)
}

function persistGlobal() {
  return writeJSON(GLOBAL_KEY, {
    totalPlaytime: globalStats.totalPlaytime,
    achievements: globalStats.achievements,
    deathEndings: globalStats.deathEndings,
  })
}

export function persistSettings() {
  return writeJSON(SETTINGS_KEY, {
    volume: settings.volume,
    sfxVolume: settings.sfxVolume,
    muted: settings.muted,
    track: settings.track,
    survivalHints: settings.survivalHints,
  })
}

/**
 * 写入前预检：按「其余键占用 + 新的槽位数组」估算写入后的总字符数。
 * 超过配额时返回明确提示，调用方先弹提示、不写入。
 */
export function previewSlotWrite(index, payload) {
  const usage = storageUsage()
  const currentSlotsChars = usage.items.find((item) => item.key === SLOT_KEY)?.chars ?? 0
  const nextList = saveSlots.list.map((slot, i) => (i === index ? payload : slot))
  const nextSlotsChars = SLOT_KEY.length + JSON.stringify(nextList).length
  const projectedChars = usage.chars - currentSlotsChars + nextSlotsChars
  const ok = projectedChars <= STORAGE_QUOTA_CHARS
  return {
    ok,
    usage,
    projectedChars,
    projectedBytes: projectedChars * STORAGE_BYTES_PER_CHAR,
    ratio: projectedChars / STORAGE_QUOTA_CHARS,
    message: ok
      ? ''
      : `本地存储空间不足：写入后预计占用 ${(projectedChars / (1024 * 1024)).toFixed(
          2,
        )} MB / 5 MB（UTF-16 约 ${formatStorageSize(
          projectedChars * STORAGE_BYTES_PER_CHAR,
        )}）。本次写入不会生效，已有存档保持不变；请先删除不需要的存档再保存。`,
  }
}

export function writeSlot(index, payload) {
  const previous = saveSlots.list[index]
  saveSlots.list[index] = payload
  const result = persistSlots()
  if (!result.ok) saveSlots.list[index] = previous
  return result
}

/** 删除槽位；返回 ok=false 时内存与磁盘都保持删除前的状态 */
export function clearSlot(index) {
  if (!saveSlots.list[index]) return { ok: true, empty: true }
  const previous = saveSlots.list[index]
  saveSlots.list[index] = null
  const result = persistSlots()
  if (!result.ok) saveSlots.list[index] = previous
  return result
}

export function getSlot(index) {
  return saveSlots.list[index] ?? null
}

export function addPlaytime(seconds) {
  globalStats.totalPlaytime += seconds
  playtimeBuffer += seconds
  const now = Date.now()
  if (now - lastPlaytimeFlush > 8000) {
    lastPlaytimeFlush = now
    persistGlobal()
  }
}

/** 离开游戏、保存存档时调用，立即落盘 */
export function flushGlobalStats() {
  playtimeBuffer = 0
  lastPlaytimeFlush = Date.now()
  persistGlobal()
}

export function hasAchievement(id) {
  return globalStats.achievements.includes(id)
}

export function unlockAchievement(id) {
  if (hasAchievement(id)) return false
  globalStats.achievements.push(id)
  persistGlobal()
  return true
}

/* ---------------- 导出 / 导入 ---------------- */

/** 导出内容：10 个存档槽位（含当前进度快照）、全局统计、设置；不含浏览器里的其他键 */
export function buildSaveBundle() {
  return {
    format: 'xingshi-save',
    bundleVersion: SAVE_BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    slots: saveSlots.list.map((slot) => clone(slot)),
    global: {
      totalPlaytime: globalStats.totalPlaytime,
      achievements: clone(globalStats.achievements),
      deathEndings: clone(globalStats.deathEndings),
    },
    settings: {
      volume: settings.volume,
      sfxVolume: settings.sfxVolume,
      muted: settings.muted,
      track: settings.track,
      survivalHints: settings.survivalHints,
    },
  }
}

/** 导出文件名带日期时间，方便区分多份备份 */
export function saveBundleFileName(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return (
    `xingshi-save-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.json`
  )
}

function normalizeBundleSlots(raw) {
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => {
    const slot = raw?.[i]
    return slot && typeof slot === 'object' && !Array.isArray(slot) ? slot : null
  })
}

/**
 * 解析导入文件。
 * - 缺少 bundleVersion 视为旧格式（0），按当前结构尽量读取；
 * - 高于当前支持版本时拒绝，避免把新字段写坏；
 * - 只校验外层结构，单个槽位内部仍由 applySlot 做默认值兜底。
 */
export function parseSaveBundle(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, message: '这个文件不是有效的 JSON，无法导入。' }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, message: '存档文件的格式无法识别，请选择本游戏导出的 .json 文件。' }
  }
  const hasSlots = Array.isArray(data.slots) || Array.isArray(data.slots?.list)
  if (data.format !== 'xingshi-save' && !hasSlots) {
    return { ok: false, message: '这不是《行尸》的存档文件，无法导入。' }
  }
  if (!hasSlots) {
    return { ok: false, message: '存档文件缺少槽位数据，无法导入。' }
  }

  const version = Number.isFinite(Number(data.bundleVersion)) ? Number(data.bundleVersion) : 0
  if (version > SAVE_BUNDLE_VERSION) {
    return {
      ok: false,
      message:
        `存档文件版本 ${version} 高于当前游戏支持的版本 ${SAVE_BUNDLE_VERSION}，` +
        '请更新游戏后再导入，本地数据没有被改动。',
    }
  }

  const rawSlots = Array.isArray(data.slots) ? data.slots : data.slots.list
  const global = data.global && typeof data.global === 'object' ? data.global : {}
  const savedSettings =
    data.settings && typeof data.settings === 'object' ? data.settings : {}

  return {
    ok: true,
    version,
    older: version < SAVE_BUNDLE_VERSION,
    bundle: {
      slots: normalizeBundleSlots(rawSlots),
      global: {
        totalPlaytime: Math.max(0, Number(global.totalPlaytime) || 0),
        achievements: Array.isArray(global.achievements) ? clone(global.achievements) : [],
        deathEndings: Array.isArray(global.deathEndings) ? clone(global.deathEndings) : [],
      },
      settings: {
        volume: Number.isFinite(savedSettings.volume) ? savedSettings.volume : 0.7,
        sfxVolume: Number.isFinite(savedSettings.sfxVolume) ? savedSettings.sfxVolume : 0.7,
        muted: Boolean(savedSettings.muted),
        track:
          typeof savedSettings.track === 'string' ? savedSettings.track : 'background',
        survivalHints: savedSettings.survivalHints !== false,
      },
    },
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
  }
}

/**
 * 覆盖写入导入内容。
 * 三个键依次写；任一失败就把内存与磁盘都恢复到导入前的快照。
 */
export function importSaveBundle(bundle) {
  const previous = {
    slots: saveSlots.list.map((slot) => clone(slot)),
    totalPlaytime: globalStats.totalPlaytime,
    achievements: clone(globalStats.achievements),
    deathEndings: clone(globalStats.deathEndings),
    settings: {
      volume: settings.volume,
      sfxVolume: settings.sfxVolume,
      muted: settings.muted,
      track: settings.track,
      survivalHints: settings.survivalHints,
    },
  }

  saveSlots.list = normalizeBundleSlots(bundle.slots)
  globalStats.totalPlaytime = bundle.global.totalPlaytime
  globalStats.achievements = clone(bundle.global.achievements)
  globalStats.deathEndings = clone(bundle.global.deathEndings)
  Object.assign(settings, bundle.settings)

  const results = [persistSlots(), persistGlobal(), persistSettings()]
  const failed = results.find((result) => !result.ok)
  if (failed) {
    saveSlots.list = previous.slots
    globalStats.totalPlaytime = previous.totalPlaytime
    globalStats.achievements = previous.achievements
    globalStats.deathEndings = previous.deathEndings
    Object.assign(settings, previous.settings)
    persistSlots()
    persistGlobal()
    persistSettings()
    refreshStorageUsage()
    return { ok: false, message: `导入失败：${failed.message} 已保留原有存档。` }
  }

  refreshStorageUsage()
  const occupied = saveSlots.list.filter(Boolean).length
  return { ok: true, message: `已导入存档：${occupied} 个槽位已恢复，全局统计与设置同步更新。` }
}
