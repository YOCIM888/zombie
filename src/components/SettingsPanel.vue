<script setup>
import { computed } from 'vue'
import { settings, persistSettings } from '../game/save'
import { updateMusicSettings, startMusic } from '../game/music'
import ModalShell from './ModalShell.vue'

const volumePercent = computed(() => Math.round(settings.volume * 100))

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
</script>

<template>
  <ModalShell title="设置" sub="声音相关的偏好会保存在本地" @close="$emit('close')">
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
    </section>

    <template #footer>
      <span>更多设置项（画面、语言、快捷键）将在后续版本补充。</span>
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
</style>
