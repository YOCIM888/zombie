<script setup>
import { computed } from 'vue'
import { BACKGROUND_IMAGE } from '../game/config'
import { allImageAssets } from '../game/assets'
import { game } from '../game/store'

const percent = computed(() => Math.round(game.progress * 100))

const totalAssets = computed(() => allImageAssets.length + 1)
const loadedAssets = computed(() => Math.min(totalAssets.value, Math.round(game.progress * totalAssets.value)))

const phase = computed(() => {
  const value = game.progress
  if (value < 0.12) return '正在唤醒幸存者'
  if (value < 0.42) return '清点背包与物资'
  if (value < 0.7) return '加固门窗与防线'
  if (value < 0.94) return '检查最后一发子弹'
  return '准备完毕，推开那扇门'
})

const bgStyle = computed(() => ({
  backgroundImage: `url("${encodeURI(BACKGROUND_IMAGE)}")`,
}))
</script>

<template>
  <div class="loading">
    <div class="loading__bg" :style="bgStyle" />
    <div class="loading__veil" />

    <div class="loading__inner">
      <p class="loading__kicker">XINGSHI · SURVIVAL LOG</p>

      <div class="loading__row">
        <span class="loading__percent">{{ percent }}<em>%</em></span>
        <span class="loading__phase">{{ phase }}</span>
      </div>

      <div class="loading__track">
        <div class="loading__fill" :style="{ width: percent + '%' }" />
        <div class="loading__ticks" />
      </div>

      <div class="loading__foot">
        <span>物资清单 {{ loadedAssets }} / {{ totalAssets }}</span>
        <span class="loading__warn">请勿离开</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  background: #060707;
  animation: loading-in 0.3s ease both;
}

.loading__bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center 35%;
  filter: grayscale(1) brightness(0.28) blur(6px);
  transform: scale(1.06);
  animation: slow-zoom 12s ease-out both;
}

.loading__veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 50%, rgba(8, 9, 10, 0.55), rgba(6, 7, 7, 0.97) 72%),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 4px);
}

.loading__inner {
  position: relative;
  z-index: 2;
  width: min(560px, 82vw);
  animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.loading__kicker {
  margin: 0 0 18px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.42em;
  color: var(--text-mute);
}

.loading__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.loading__percent {
  font-family: var(--font-mono);
  font-size: clamp(40px, 6vw, 58px);
  line-height: 1;
  color: var(--bone);
  letter-spacing: 0.02em;
  text-shadow: 0 0 40px rgba(205, 185, 141, 0.2);
}

.loading__percent em {
  font-style: normal;
  font-size: 16px;
  margin-left: 4px;
  color: var(--text-mute);
}

.loading__phase {
  font-family: var(--font-title);
  font-size: 13px;
  letter-spacing: 0.2em;
  color: var(--text-dim);
  text-align: right;
}

.loading__track {
  position: relative;
  height: 3px;
  background: rgba(214, 208, 191, 0.12);
  overflow: hidden;
}

.loading__fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(193, 74, 50, 0.9), rgba(226, 106, 76, 0.7));
  box-shadow: 0 0 16px rgba(193, 74, 50, 0.55);
  transition: width 0.24s ease-out;
}

.loading__ticks {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0 9%,
    rgba(6, 7, 7, 0.9) 9% 9.3%,
    transparent 9.3% 10%
  );
  pointer-events: none;
}

.loading__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--text-mute);
}

.loading__warn {
  color: var(--rust-soft);
  animation: blink 1.8s steps(2, end) infinite;
}

@keyframes slow-zoom {
  from {
    transform: scale(1.12);
  }
  to {
    transform: scale(1.02);
  }
}

@keyframes blink {
  50% {
    opacity: 0.25;
  }
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
}

@keyframes loading-in {
  from {
    opacity: 0;
  }
}
</style>
