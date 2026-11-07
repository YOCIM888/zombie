<script setup>
import { computed, ref } from 'vue'
import { MUSIC_TRACKS } from '../game/assets'
import {
  buildSaveBundle,
  formatStorageSize,
  importSaveBundle,
  parseSaveBundle,
  refreshStorageUsage,
  saveBundleFileName,
  settings,
  persistSettings,
} from '../game/save'
import { notify } from '../game/store'
import { updateMusicSettings, startMusic } from '../game/music'
import { previewWeaponSfx } from '../game/sfx'
import ModalShell from './ModalShell.vue'

const volumePercent = computed(() => Math.round(settings.volume * 100))
const sfxVolumePercent = computed(() => Math.round(settings.sfxVolume * 100))
const currentTrack = computed(
  () => MUSIC_TRACKS.find((track) => track.id === settings.track) ?? MUSIC_TRACKS[0],
)

/* ---------------- 存档导出 / 导入 ---------------- */
const fileInput = ref(null)
const exportInfo = ref('')
const pendingImport = ref(null)
const pendingFile = ref(null)

function exportSaves() {
  const fileName = saveBundleFileName()
  const text = JSON.stringify(buildSaveBundle(), null, 2)
  try {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    exportInfo.value = `${fileName} · ${formatStorageSize(blob.size)}`
    notify('存档文件已导出，可以复制到其他设备备份', 3000)
  } catch {
    notify('导出失败：浏览器没有允许下载文件。', 3600)
  }
}

function chooseImportFile() {
  fileInput.value?.click()
}

function onFileChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (file.size > 8 * 1024 * 1024) {
    notify('文件超过 8 MB，不像是本游戏的存档文件。', 3600)
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const parsed = parseSaveBundle(String(reader.result || ''))
    if (!parsed.ok) {
      notify(parsed.message, 4400)
      return
    }
    pendingFile.value = { name: file.name, size: file.size }
    pendingImport.value = parsed
  }
  reader.onerror = () => notify('读取文件失败，请重试。', 3600)
  reader.readAsText(file, 'utf-8')
}

function cancelImport() {
  pendingImport.value = null
  pendingFile.value = null
}

function confirmImport() {
  const parsed = pendingImport.value
  const file = pendingFile.value
  pendingImport.value = null
  pendingFile.value = null
  if (!parsed) return
  const result = importSaveBundle(parsed.bundle)
  if (!result.ok) {
    notify(result.message, 4600)
    return
  }
  // 导入的设置立即生效，避免音乐/提示沿用旧值
  updateMusicSettings()
  if (!settings.muted) startMusic()
  refreshStorageUsage()
  notify(`${result.message}${file ? `（来源 ${file.name}）` : ''}`, 3400)
}

function chooseTrack(id) {
  if (settings.track === id) return
  settings.track = id
  updateMusicSettings()
  if (!settings.muted) startMusic()
}

function toggleMute() {
  settings.muted = !settings.muted
  updateMusicSettings()
  if (!settings.muted) startMusic()
}

function onVolumeInput(event) {
  settings.volume = Number(event.target.value) / 100
  if (settings.volume > 0 && settings.muted) settings.muted = false
  updateMusicSettings()
}

function resetVolume() {
  settings.volume = 0.7
  settings.muted = false
  persistSettings()
  updateMusicSettings()
}

function toggleSurvivalHints() {
  settings.survivalHints = !settings.survivalHints
  persistSettings()
}

// 音效音量：拖动即时保存并试听，试听节流避免每次 input 都炸响
let lastPreviewAt = 0
function onSfxVolumeInput(event) {
  settings.sfxVolume = Number(event.target.value) / 100
  persistSettings()
  const now = performance.now()
  if (now - lastPreviewAt < 140) return
  lastPreviewAt = now
  previewWeaponSfx()
}

function onSfxVolumeChange() {
  lastPreviewAt = 0
  previewWeaponSfx()
}

function resetSfxVolume() {
  settings.sfxVolume = 0.7
  persistSettings()
  previewWeaponSfx()
}
</script>

<template>
  <ModalShell title="设置" sub="偏好会保存在本地" @close="$emit('close')">
    <section class="rows">
      <div class="row">
        <div class="row__info">
          <h3>背景音乐</h3>
          <p>末日都城 · 环境音轨（进入游戏时循环播放）</p>
        </div>
        <button
          type="button"
          class="switch"
          :class="{ 'switch--on': !settings.muted }"
          @click="toggleMute"
        >
          <span />
          {{ settings.muted ? '已关闭' : '已开启' }}
        </button>
      </div>

      <div class="row">
        <div class="row__info">
          <h3>生存提示</h3>
          <p>背包空间、近战耐久或远程清洁度低于 20% 时，在屏幕上方显示可手动关闭的提示条</p>
        </div>
        <button
          type="button"
          class="switch"
          :class="{ 'switch--on': settings.survivalHints }"
          @click="toggleSurvivalHints"
        >
          <span />
          {{ settings.survivalHints ? '已开启' : '已关闭' }}
        </button>
      </div>

      <div class="row row--stack">
        <div class="row__info">
          <h3>音乐曲目</h3>
          <p>当前 {{ currentTrack.name }} · 切换后立即生效</p>
        </div>
        <div class="tracks">
          <button
            v-for="track in MUSIC_TRACKS"
            :key="track.id"
            type="button"
            class="track"
            :class="{ 'track--active': settings.track === track.id }"
            @click="chooseTrack(track.id)"
          >
            <strong>{{ track.name }}</strong>
            <span>{{ track.hint }}</span>
          </button>
        </div>
      </div>

      <div class="row row--stack">
        <div class="row__info">
          <h3>音乐音量</h3>
          <p>当前 {{ volumePercent }}%</p>
        </div>
        <div class="slider">
          <input
            type="range"
            min="0"
            max="100"
            :value="volumePercent"
            @input="onVolumeInput"
            aria-label="音乐音量"
          />
          <button type="button" class="btn" @click="resetVolume">恢复默认</button>
        </div>
      </div>

      <div class="row row--stack">
        <div class="row__info">
          <h3>音效音量</h3>
          <p>当前 {{ sfxVolumePercent }}% · 仅影响武器攻击音效，拖动即时试听</p>
        </div>
        <div class="slider">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            :value="sfxVolumePercent"
            @input="onSfxVolumeInput"
            @change="onSfxVolumeChange"
            aria-label="音效音量"
          />
          <button type="button" class="btn" @click="resetSfxVolume">恢复默认</button>
        </div>
      </div>
      <div class="row row--stack">
        <div class="row__info">
          <h3>存档导出 / 导入</h3>
          <p>
            导出包含 10 个存档槽位、全局统计（总时长 / 成就 / 死亡结局）与设置，文件为 .json，文件名带日期时间。
            导入会先弹出覆盖确认，取消时不会写入任何数据。
          </p>
        </div>
        <div class="io">
          <div class="io__actions">
            <button type="button" class="btn" @click="exportSaves">导出存档文件</button>
            <button type="button" class="btn" @click="chooseImportFile">导入存档文件</button>
            <input
              ref="fileInput"
              class="io__file"
              type="file"
              accept=".json,application/json"
              @change="onFileChange"
            />
          </div>
          <p v-if="exportInfo" class="io__info">上次导出：{{ exportInfo }}</p>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <ModalShell
        v-if="pendingImport"
        title="导入并覆盖本地存档？"
        :sub="pendingFile ? `${pendingFile.name} · ${formatStorageSize(pendingFile.size)}` : '存档文件'"
        @close="cancelImport"
      >
        <p class="io-warn">
          导入会覆盖本机现有的 10 个存档槽位、全局统计与设置，覆盖后无法撤销。
          本次文件包含 {{ pendingImport.bundle.slots.filter(Boolean).length }} 个已占用槽位。
        </p>
        <p v-if="pendingImport.older" class="io-warn io-warn--soft">
          文件版本较旧（v{{ pendingImport.version }}），会按当前结构读取，缺少的字段使用默认值。
        </p>
        <p class="io-warn io-warn--soft">
          取消不会写入任何数据，本地存档保持原样。
        </p>
        <template #footer>
          <span>确认后立即覆盖并刷新界面</span>
          <div class="io__actions">
            <button type="button" class="btn" @click="cancelImport">取消</button>
            <button type="button" class="btn btn--primary" @click="confirmImport">
              确认覆盖
            </button>
          </div>
        </template>
      </ModalShell>
    </Teleport>

    <template #footer>
      <span>设置将会持久化生效</span>
      <span class="mode">SETTINGS</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.rows {
  padding-top: 4px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 18px 0;
  border-bottom: 1px dashed var(--line);
}

.row--stack {
  align-items: flex-start;
  border-bottom: 0;
  flex-direction: column;
}

.row__info h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--text);
}

.row__info p {
  margin: 6px 0 0;
  font-size: 11.5px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--line-strong);
  font-size: 11.5px;
  letter-spacing: 0.1em;
  color: var(--text-mute);
  transition: 0.2s;
}

.switch span {
  width: 24px;
  height: 12px;
  border: 1px solid var(--line-strong);
  position: relative;
  transition: 0.2s;
}

.switch span::after {
  content: "";
  position: absolute;
  top: 1px;
  left: 1px;
  width: 8px;
  height: 8px;
  background: var(--text-mute);
  transition: 0.2s;
}

.switch--on {
  color: var(--bone);
  border-color: rgba(205, 185, 141, 0.4);
}

.switch--on span::after {
  left: 13px;
  background: var(--bone);
}

.slider {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.tracks {
  display: flex;
  gap: 8px;
  width: 100%;
}

.track {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--line-strong);
  text-align: left;
  transition: 0.2s;
}

.track strong {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--text-mute);
}

.track span {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
  opacity: 0.7;
}

.track--active {
  border-color: rgba(205, 185, 141, 0.5);
  background: rgba(205, 185, 141, 0.08);
}

.track--active strong {
  color: var(--bone);
}

input[type="range"] {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 2px;
  background: rgba(214, 208, 191, 0.18);
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: var(--rust);
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 0;
  border-radius: 0;
  background: var(--rust);
  cursor: pointer;
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}

.io {
  width: 100%;
}

.io__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.io__file {
  display: none;
}

.io__info {
  margin: 10px 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  line-height: 1.6;
  letter-spacing: 0.03em;
  color: var(--text-mute);
  word-break: break-all;
}

.io-warn {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
  letter-spacing: 0.04em;
  color: var(--text-dim);
}

.io-warn--soft {
  margin-top: 10px;
  color: var(--text-mute);
}

@media (max-width: 620px) {
  .io__actions .btn {
    flex: 1 1 auto;
    padding: 0 12px;
  }
}
</style>
