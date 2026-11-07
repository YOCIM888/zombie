import imageAssets from 'virtual:asset-manifest'
import {
  DAWN_IDENTITY_LEVELS,
  IDENTITY_LEVELS,
  ITEM_TIER_ORDER,
  itemEffectTotal,
} from '../data'
import { WEAPON_SFX_SOURCES } from './sfx'

/** 可选背景音乐；id 会写入本地设置 */
export const MUSIC_TRACKS = [
  { id: 'background', name: '余烬晨光', hint: '默认曲目', src: '/audio/Background.mp3' },
  { id: 'backmusic', name: '废墟低语', hint: '备用曲目', src: '/audio/backmusic.mp3' },
]

export const allImageAssets = imageAssets

/** 只加载一次图片，失败也放行，不阻塞进入游戏 */
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(src)
    img.onerror = () => resolve(src)
    img.src = src
  })
}

/**
 * 预加载全部静态资源
 * @param {(ratio: number) => void} onProgress 0 ~ 1
 */
export async function preloadAssets(onProgress, { concurrency = 8 } = {}) {
  const musicSources = MUSIC_TRACKS.map((track) => track.src)
  const audioSources = new Set([...musicSources, ...WEAPON_SFX_SOURCES])
  const tasks = [...imageAssets, ...musicSources, ...WEAPON_SFX_SOURCES]
  const total = tasks.length
  let done = 0
  let cursor = 0

  onProgress?.(0)

  async function worker() {
    while (cursor < tasks.length) {
      const url = tasks[cursor++]
      if (audioSources.has(url)) {
        await fetch(url).catch(() => {})
      } else {
        await loadImage(url)
      }
      done += 1
      onProgress?.(done / total)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()),
  )
  onProgress?.(1)
}

/** 图鉴分类：从图片目录中自动归类，按固定顺序排列 */
const CATEGORY_ORDER = [
  '近战武器',
  '远程武器',
  '食物',
  '饮品',
  '鸡尾酒',
  '餐馆',
  '药品',
  '宝石',
  '身份徽章',
  '公会徽章',
  '公会限定武器',
  '末日都城限定',
  '曙光阵地限定',
  '纪念徽章',
  '任务道具',
  '角色立绘',
  '丧尸立绘',
  '变异海洋生物',
  '世界BOSS',
]

/** 文件夹名与图鉴分类名不一致时的显示映射 */
const CATEGORY_LABELS = {
  '主角与NPC立绘': '角色立绘',
}

export function buildCodexCategories(assets) {
  const groups = new Map()
  for (const path of assets) {
    const [, , category, file] = path.split('/')
    if (!category || category === '背景图' || !file) continue
    const label = CATEGORY_LABELS[category] ?? category
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push({
      name: file.replace(/\.(webp|png|jpg|jpeg|gif|avif)$/i, ''),
      src: path,
    })
  }
  return [...groups.entries()]
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a[0])
      const bi = CATEGORY_ORDER.indexOf(b[0])
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    .map(([name, items]) => ({ name, items }))
}

/* ---------- 图鉴排布（纯展示层，返回副本，不改动 data 中的原数组） ---------- */

const UNKNOWN_TIER_RANK = ITEM_TIER_ORDER.length
const UNKNOWN_IDENTITY_RANK = Number.POSITIVE_INFINITY
const IDENTITY_FACTION_RANK = { city: 0, dawn: 1 }
const CITY_IDENTITY_RANK = new Map(IDENTITY_LEVELS.map((level) => [level.name, level.rank]))
const DAWN_IDENTITY_RANK = new Map(
  DAWN_IDENTITY_LEVELS.map((level) => [level.name, level.rank]),
)

/** 升序比较；Infinity 与 Infinity 视为相等，避免出现 NaN 破坏排序 */
function compareRank(a, b) {
  if (a === b) return 0
  return a < b ? -1 : 1
}

function weaponTierRank(def) {
  const index = ITEM_TIER_ORDER.indexOf(def?.tier ?? '')
  return index === -1 ? UNKNOWN_TIER_RANK : index
}

function weaponAttack(def) {
  const attack = Number(def?.weapon?.attack)
  return Number.isFinite(attack) ? attack : Number.POSITIVE_INFINITY
}

function identityFactionRank(def) {
  return IDENTITY_FACTION_RANK[def?.faction] ?? 2
}

function identityLevelRank(def) {
  if (!def?.identityLevel) return UNKNOWN_IDENTITY_RANK
  const table = def.faction === 'dawn' ? DAWN_IDENTITY_RANK : CITY_IDENTITY_RANK
  return table.get(def.identityLevel) ?? UNKNOWN_IDENTITY_RANK
}

function compareCodexText(a, b) {
  const byName = a.name.localeCompare(b.name, 'zh-Hans-CN')
  if (byName !== 0) return byName
  return a.src.localeCompare(b.src)
}

/**
 * 图鉴分类内的排布规则：
 * - 近战 / 远程武器：品质从低到高（与背包整理方向相反）；同品质按攻击力升序；
 * - 食物 / 饮品：总数值从高到低，总数值与背包整理共用 itemEffectTotal；
 * - 身份徽章：先都城线（平民→…→储君），再曙光线（见习→…→领袖），同级按名称；
 * - 未知品质 / 未知身份 / 缺 effects / 查不到 def 的物品统一落到该分类末尾；
 * - 其他分类保持 manifest 原顺序；全部返回副本，不改动入参数组。
 */
export function sortCodexCategoryItems(categoryName, items) {
  const isWeapon = categoryName === '近战武器' || categoryName === '远程武器'
  const isConsumable = categoryName === '食物' || categoryName === '饮品'
  const isIdentity = categoryName === '身份徽章'
  if (!isWeapon && !isConsumable && !isIdentity) return items

  return items
    .map((item, order) => ({ item, order }))
    .sort((left, right) => {
      const a = left.item
      const b = right.item

      if (isWeapon) {
        const byTier = compareRank(weaponTierRank(a.def), weaponTierRank(b.def))
        if (byTier !== 0) return byTier
        const byAttack = compareRank(weaponAttack(a.def), weaponAttack(b.def))
        if (byAttack !== 0) return byAttack
      } else if (isConsumable) {
        const aHasEffects = Boolean(a.def?.effects)
        const bHasEffects = Boolean(b.def?.effects)
        if (aHasEffects !== bHasEffects) return aHasEffects ? -1 : 1
        if (aHasEffects) {
          const byTotal = itemEffectTotal(b.def) - itemEffectTotal(a.def)
          if (byTotal !== 0) return byTotal
        }
      } else {
        const byFaction = compareRank(identityFactionRank(a.def), identityFactionRank(b.def))
        if (byFaction !== 0) return byFaction
        const byLevel = compareRank(identityLevelRank(a.def), identityLevelRank(b.def))
        if (byLevel !== 0) return byLevel
      }

      return compareCodexText(a, b) || left.order - right.order
    })
    .map(({ item }) => item)
}
