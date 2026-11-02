import { settings } from './save'

const SFX_ROOT = '/audio/武器音效/'

/** 音效素材：按武器类型映射到 public/audio/武器音效 中的文件 */
const SFX_FILES = {
  blade: '刀类&武士刀.mp3',
  longsword: '长剑&大剑.mp3',
  blunt: '钝器.mp3',
  soft: '软兵器.mp3',
  genericMelee: '通用近战音效.mp3',
  pistol: '手枪枪声.mp3',
  smg: '冲锋枪声.mp3',
  rifle: '步枪枪声.mp3',
  sniper: '狙击枪声.mp3',
  shotgun: '霰弹枪声.mp3',
}

export const WEAPON_SFX_SOURCES = Object.values(SFX_FILES).map((file) => SFX_ROOT + file)

const idsFor = (ids) => Object.fromEntries(ids.map((id) => [id, true]))

const MELEE_SFX = {
  blade: idsFor([
    'kitchen-knife', 'dagger', 'fruit-knife', 'karambit-classic', 'cleaver',
    'sickle', 'snake-sword', 'scimitar', 'kukri', 'huan-shou-dao',
    'mountain-chopper', 'triangular-bayonet', 'short-katana', 'knuckle-blade',
    'spring-knife-monochrome', 'butterfly-silver', 'katana-dusk',
    'karambit-ghost', 'spring-knife-aurora', 'butterfly-gold', 'katana-raikiri',
  ]),
  longsword: idsFor([
    'knight-sword', 'tang-dao', 'noble-shortsword', 'keel-blade',
    'crusader-cross-sword', 'scarlet-greatsword', 'longsword-rose-dark',
    'longsword-frost', 'longsword-silver-rose',
  ]),
  blunt: idsFor([
    'baseball-bat', 'pipe-wrench', 'baton', 'frying-pan', 'claw-hammer',
    'entrenching-tool', 'crowbar', 'hand-axe', 'fire-axe', 'chainsaw',
  ]),
  soft: idsFor(['nunchaku']),
}

const RANGED_SFX = {
  pistol: idsFor(['cz75', 'glock', 'm1911', 'usp', 'fn57', 'gp100', 'desert-eagle']),
  smg: idsFor(['mac10', 'mp5', 'uzi', 'ump45', 'victor']),
  rifle: idsFor(['m4a1', 'ar15', 'akm', 'mini14', 'aug', 'scar']),
  sniper: idsFor(['m700', 'mosin', 't3x', 'awm']),
  shotgun: idsFor(['m870', 'aa12']),
  soft: idsFor(['hunting-bow', 'compound-bow', 'crossbow']),
}

const MELEE_FALLBACK = 'genericMelee'
const RANGED_FALLBACK = 'pistol'

function sfxKeyFor(def) {
  if (!def) return MELEE_FALLBACK
  if (def.category === 'melee') {
    return Object.keys(MELEE_SFX).find((key) => MELEE_SFX[key][def.id]) ?? MELEE_FALLBACK
  }
  if (def.category === 'ranged') {
    return Object.keys(RANGED_SFX).find((key) => RANGED_SFX[key][def.id]) ?? RANGED_FALLBACK
  }
  return null
}

const cache = new Map()

function getAudio(src) {
  let audio = cache.get(src)
  if (!audio) {
    audio = new Audio(src)
    audio.preload = 'auto'
    cache.set(src, audio)
  }
  return audio
}

/** 播放当前武器对应的攻击音效；未装备武器时使用通用近战音效 */
export function playWeaponSfx(def) {
  if (typeof Audio === 'undefined' || settings.muted || settings.volume <= 0) return
  const key = sfxKeyFor(def)
  if (!key) return

  try {
    const audio = getAudio(SFX_ROOT + SFX_FILES[key])
    audio.currentTime = 0
    audio.volume = Math.min(1, settings.volume)
    const played = audio.play()
    if (played) played.catch(() => {})
  } catch {
    /* 浏览器禁止播放或素材缺失时静默跳过 */
  }
}
