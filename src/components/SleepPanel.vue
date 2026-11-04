<script setup>
import { computed } from 'vue'
import { REST_OPTIONS } from '../data'
import { game, sleepRest } from '../game/store'
import ModalShell from './ModalShell.vue'

const emit = defineEmits(['close'])

const STAT_LABELS = {
  hp: '生命',
  hunger: '饱食',
  thirst: '口渴',
  sanity: '理智',
  stamina: '体力',
}

const options = [REST_OPTIONS.nap, REST_OPTIONS.sleep]
const clock = computed(() => `第 ${game.day} 天 · 安全屋`)
const hasFairyGem = computed(() =>
  game.inventory.some((entry) => entry?.id === 'fairy-gem'),
)

function effects(option) {
  return Object.entries(option.effects)
    .filter(([, value]) => !hasFairyGem.value || value > 0)
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
      精灵宝石生效：小憩与睡觉不再扣除饱食和口渴。
    </p>
    <div class="rests">
      <article v-for="option in options" :key="option.id" class="rest">
        <header class="rest__head">
          <h3 class="rest__name">{{ option.name }}</h3>
          <span class="rest__turns">跳过 {{ option.turns }} 回合</span>
        </header>
        <p class="rest__desc">{{ option.desc }}</p>
        <ul class="rest__effects">
          <li v-for="effect in effects(option)" :key="effect.label">
            <span>{{ effect.label }}</span>
            <b :class="{ 'is-down': !effect.positive }">{{ effect.text }}</b>
          </li>
        </ul>
        <button type="button" class="btn btn--primary rest__btn" @click="rest(option.id)">
          {{ option.name }}
        </button>
      </article>
    </div>

    <template #footer>
      <span>跳过的回合不结算普通衰减；睡觉只能在安全屋进行。</span>
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
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
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
