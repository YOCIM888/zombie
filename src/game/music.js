import { MUSIC_SRC } from './assets'
import { persistSettings, settings } from './save'

let player = null

function ensurePlayer() {
  if (!player) {
    player = new Audio(MUSIC_SRC)
    player.loop = true
    player.preload = 'auto'
  }
  return player
}

function syncVolume() {
  const audio = ensurePlayer()
  audio.volume = settings.muted ? 0 : settings.volume
}

/** 必须在用户手势（点击）中调用，浏览器才允许播放 */
export function startMusic() {
  const audio = ensurePlayer()
  syncVolume()
  const played = audio.play()
  if (played) played.catch(() => {})
}

export function updateMusicSettings() {
  syncVolume()
  persistSettings()
}
