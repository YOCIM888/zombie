import { MUSIC_TRACKS } from './assets'
import { persistSettings, settings } from './save'

let player = null
let loadedTrackId = ''

function resolveTrack(id) {
  return MUSIC_TRACKS.find((track) => track.id === id) ?? MUSIC_TRACKS[0]
}

function ensurePlayer() {
  const track = resolveTrack(settings.track)
  if (!player) {
    player = new Audio(track.src)
    player.loop = true
    player.preload = 'auto'
    loadedTrackId = track.id
  } else if (loadedTrackId !== track.id) {
    const wasPlaying = !player.paused
    loadedTrackId = track.id
    player.src = track.src
    if (wasPlaying) {
      const played = player.play()
      if (played) played.catch(() => {})
    }
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
