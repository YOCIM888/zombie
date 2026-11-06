import { reactive } from 'vue'
import { SAVE_SLOT_COUNT } from './config'

const SLOT_KEY = 'xingshi.slots.v1'
const GLOBAL_KEY = 'xingshi.global.v1'
const SETTINGS_KEY = 'xingshi.settings.v1'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 隐私模式或配额不足时静默失败 */
  }
}

const storedSlots = readJSON(SLOT_KEY, [])
const storedGlobal = readJSON(GLOBAL_KEY, {})
const storedSettings = readJSON(SETTINGS_KEY, {})

let playtimeBuffer = 0
let lastPlaytimeFlush = Date.now()

export const saveSlots = reactive({
  list: Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => storedSlots?.[i] ?? null),
})

export const globalStats = reactive({
  totalPlaytime: Number(storedGlobal.totalPlaytime) || 0,
  achievements: Array.isArray(storedGlobal.achievements) ? storedGlobal.achievements : [],
  deathEndings: Array.isArray(storedGlobal.deathEndings) ? storedGlobal.deathEndings : [],
})

export const settings = reactive({
  volume: Number.isFinite(storedSettings.volume) ? storedSettings.volume : 0.7,
  muted: Boolean(storedSettings.muted),
  track: typeof storedSettings.track === 'string' ? storedSettings.track : 'background',
  survivalHints: storedSettings.survivalHints !== false,
})

function persistSlots() {
  writeJSON(SLOT_KEY, saveSlots.list)
}

function persistGlobal() {
  writeJSON(GLOBAL_KEY, {
    totalPlaytime: globalStats.totalPlaytime,
    achievements: globalStats.achievements,
    deathEndings: globalStats.deathEndings,
  })
}

export function persistSettings() {
  writeJSON(SETTINGS_KEY, {
    volume: settings.volume,
    muted: settings.muted,
    track: settings.track,
    survivalHints: settings.survivalHints,
  })
}

export function writeSlot(index, payload) {
  saveSlots.list[index] = payload
  persistSlots()
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
