<script setup>
import { computed } from 'vue'
import { REST_OPTIONS, restBackground } from '../data'
import { fairyRestLeft, game, sleepRest } from '../game/store'
import ModalShell from './ModalShell.vue'

const emit = defineEmits(['close'])

const STAT_LABELS = {
  hp: '生命',
  hunger: '饱食',
  thirst: '口渴',
  sanity: '理智',
  stamina: '体力',
}

const options = [REST_OPTIONS.nap, REST_OPTIONS.sleep, REST_OPTIONS.tea, REST_OPTIONS.bed]
const clock = computed(() => `第 ${game.day} 天 · 安全屋`)
const hasFairyGem = computed(() =>
  game.inventory.some((entry) => entry?.id === 'fairy-gem'),
)

function locked(option) {
  return Boolean(option.gemOnly) && !hasFairyGem.value
}

function exhausted(option) {
  return Boolean(option.dailyLimit) && fairyRestLeft(option.id) <= 0
}

function usable(option) {
  return !locked(option) && !exhausted(option)
}

function effects(option) {
  return Object.entries(option.effects)
    .map(([key, value]) => ({
      label: STAT_LABELS[key] ?? key,
      text: `${value > 0 ? '+' : ''}${value}%`,
      positive: value > 0,
    }))
}

function rest(kind) {
  sleepRest(kind)
  emit('close')
}
</script>

<template>
  <ModalShell title="睡觉" :sub="clock" @close="$emit('close')">
    <p v-if="hasFairyGem" class="rest-note">
      精灵宝石生效：精灵茶会与大精灵床已解锁，宝石不会被消耗。
    </p>
    <p v-else class="rest-note">
      持有「精灵宝石」可解锁精灵茶会与大精灵床；宝石只作为持有条件，不会消耗。
    </p>
    <div class="rests">
      <article
        v-for="option in options"
        :key="option.id"
        class="rest"
        :class="{
          'rest--gem': option.gemOnly,
          'rest--locked': locked(option),
          'rest--done': exhausted(option),
        }"
      >
        <img
          v-if="restBackground(option.id)"
          class="rest__bg"
          :src="restBackground(option.id)"
          alt=""
          decoding="async"
          draggable="false"
        />
        <div v-if="restBackground(option.id)" class="rest__veil" aria-hidden="true" />
        <header class="rest__head">
          <h3 class="rest__name">{{ option.name }}</h3>
          <span class="rest__turns">
            跳过 {{ option.turns }} 回合<template v-if="option.dailyLimit"> · 每日 {{ option.dailyLimit }} 次</template>
          </span>
        </header>
        <p class="rest__desc">{{ option.desc }}</p>
        <p v-if="locked(option)" class="rest__lock">
          持有精灵宝石后解锁（不消耗宝石）
        </p>
        <p v-else-if="option.dailyLimit" class="rest__left">
          今日剩余 {{ fairyRestLeft(option.id) }} / {{ option.dailyLimit }} 次
        </p>
        <ul class="rest__effects">
          <li v-for="effect in effects(option)" :key="effect.label">
            <span>{{ effect.label }}</span>
            <b :class="{ 'is-down': !effect.positive }">{{ effect.text }}</b>
          </li>
        </ul>
        <button
          type="button"
          class="btn btn--primary rest__btn"
          :disabled="!usable(option)"
          @click="rest(option.id)"
        >
          {{ locked(option) ? '未解锁' : exhausted(option) ? '今日已完成' : option.name }}
        </button>
      </article>
    </div>

    <template #footer>
      <span>休息只推进时间，不结算回合衰减；睡觉只能在安全屋进行。</span>
      <span class="mode">REST</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.rest-note {
  margin: 0 0 12px;
  padding: 8px 12px;
  border-left: 2px solid rgba(205, 185, 141, 0.5);
  background: rgba(205, 185, 141, 0.06);
  font-size: 10.5px;
  line-height: 1.7;
  letter-spacing: 0.03em;
  color: var(--rust-soft);
}

.rests {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.rest {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(17, 19, 20, 0.9), rgba(10, 12, 13, 0.94));
  transition: border-color 0.2s;
}

/* 卡片背景：铺满、等比裁切；与地图卡片一致的压暗口径 */
.rest__bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  filter: saturate(0.72) brightness(0.66);
  pointer-events: none;
  user-select: none;
}

/* 顶部文字密集，顶端比地图卡片略深；底部按钮区接近实底 */
.rest__veil {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(8, 9, 10, 0.58) 0%,
    rgba(8, 9, 10, 0.8) 52%,
    rgba(8, 9, 10, 0.94) 100%
  );
}

.rest > :not(.rest__bg):not(.rest__veil) {
  position: relative;
  z-index: 2;
}

.rest--gem {
  border-color: rgba(205, 185, 141, 0.28);
}

/* 未解锁：背景降饱和压暗，文字单独变淡，避免整卡透明导致背景发灰 */
.rest--locked .rest__bg {
  filter: saturate(0.38) brightness(0.5);
}

.rest--locked .rest__veil {
  background: linear-gradient(
    180deg,
    rgba(8, 9, 10, 0.68) 0%,
    rgba(8, 9, 10, 0.85) 52%,
    rgba(8, 9, 10, 0.96) 100%
  );
}

.rest--locked .rest__head,
.rest--locked .rest__desc,
.rest--locked .rest__lock,
.rest--locked .rest__effects {
  opacity: 0.62;
}

.rest--locked.rest--gem {
  border-color: rgba(205, 185, 141, 0.16);
}

/* 今日次数用尽：背景略压暗，保留可读性与非交互感 */
.rest--done .rest__bg {
  filter: saturate(0.5) brightness(0.56);
}

.rest--done .rest__left {
  color: var(--rust-soft);
}

.rest:not(.rest--locked):not(.rest--done):hover {
  border-color: rgba(193, 74, 50, 0.5);
}

.rest:not(.rest--locked):not(.rest--done):hover .rest__veil {
  background: linear-gradient(
    180deg,
    rgba(8, 9, 10, 0.54) 0%,
    rgba(8, 9, 10, 0.77) 52%,
    rgba(8, 9, 10, 0.93) 100%
  );
}

.rest__lock,
.rest__left {
  margin: 0;
  font-size: 10.5px;
  letter-spacing: 0.05em;
  line-height: 1.6;
}

.rest__lock {
  color: var(--rust-soft);
}

.rest__left {
  color: var(--bone);
}

.rest__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.rest__name {
  margin: 0;
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--text);
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.72);
}

.rest__desc,
.rest__turns {
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.72);
}

.rest__turns {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--rust-soft);
}

.rest__desc {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.8;
  letter-spacing: 0.03em;
  color: var(--text-dim);
}

.rest__effects {
  margin: 0;
  padding: 10px 12px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(0, 0, 0, 0.22);
  border-left: 2px solid var(--line-strong);
}

.rest__effects li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.rest__effects b {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--sick);
}

.rest__effects b.is-down {
  color: var(--rust-soft);
}

.rest__btn {
  margin-top: auto;
  height: 34px;
  font-size: 12px;
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}

@media (max-width: 640px) {
  .rests {
    grid-template-columns: 1fr;
  }
}
</style>
