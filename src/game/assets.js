import imageAssets from 'virtual:asset-manifest'
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
