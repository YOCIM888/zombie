<script setup>
import { computed } from 'vue'
import { ACHIEVEMENTS } from '../game/config'
import { globalStats } from '../game/save'
import ModalShell from './ModalShell.vue'

const unlockedCount = computed(() => globalStats.achievements.length)
const totalCount = ACHIEVEMENTS.length
const percent = computed(() => Math.round((unlockedCount.value / totalCount) * 100))

function isUnlocked(id) {
  return globalStats.achievements.includes(id)
}
</script>

<template>
  <ModalShell title="我的成就" sub="还没有被大火烧掉的勋章" @close="$emit('close')">
    <div class="summary">
      <div>
        <span class="eyebrow">已达成</span>
        <p class="summary__value">
          {{ unlockedCount }}<em>/{{ totalCount }}</em>
        </p>
      </div>
      <div class="summary__bar">
        <div class="summary__track">
          <div class="summary__fill" :style="{ width: percent + '%' }" />
        </div>
        <span class="summary__hint">完成度 {{ percent }}%</span>
      </div>
    </div>

    <div class="list">
      <article
        v-for="(item, index) in ACHIEVEMENTS"
        :key="item.id"
        class="ach"
        :class="{ 'ach--unlocked': isUnlocked(item.id) }"
      >
        <div class="ach__index">{{ String(index + 1).padStart(2, '0') }}</div>
        <div class="ach__body">
          <h3 class="ach__name">{{ item.name }}</h3>
          <p class="ach__desc">{{ item.desc }}</p>
        </div>
        <span class="ach__state">{{ isUnlocked(item.id) ? '已达成' : '未达成' }}</span>
      </article>
    </div>

    <template #footer>
      <span>成就与存档位无关，所有记录共享同一份成就档案。</span>
      <span class="mode">ACHIEVEMENTS</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.summary {
  display: flex;
  align-items: flex-end;
  gap: 28px;
  padding: 4px 0 20px;
}

.summary__value {
  margin: 6px 0 0;
  font-family: var(--font-mono);
  font-size: 34px;
  color: var(--bone);
}

.summary__value em {
  font-style: normal;
  font-size: 15px;
  color: var(--text-mute);
}

.summary__bar {
  flex: 1;
  padding-bottom: 6px;
}

.summary__track {
  height: 3px;
  background: rgba(214, 208, 191, 0.12);
}

.summary__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--rust), rgba(193, 74, 50, 0.35));
  transition: width 0.5s ease;
}

.summary__hint {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  letter-spacing: 0.16em;
  color: var(--text-mute);
  font-family: var(--font-mono);
}

.list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ach {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  opacity: 0.6;
  position: relative;
}

.ach--unlocked {
  opacity: 1;
  border-color: rgba(205, 185, 141, 0.35);
  background: rgba(205, 185, 141, 0.05);
}

.ach--unlocked::after {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--rust);
}

.ach__index {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-mute);
  padding-top: 3px;
}

.ach__body {
  flex: 1;
}

.ach__name {
  margin: 0;
  font-family: var(--font-title);
  font-size: 16px;
  letter-spacing: 0.12em;
  color: var(--text);
}

.ach--unlocked .ach__name {
  color: var(--bone);
}

.ach__desc {
  margin: 6px 0 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--text-mute);
  letter-spacing: 0.03em;
}

.ach__state {
  flex: none;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--text-mute);
  border: 1px solid var(--line);
  padding: 2px 6px;
}

.ach--unlocked .ach__state {
  color: var(--rust-soft);
  border-color: rgba(193, 74, 50, 0.5);
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}

@media (max-width: 640px) {
  .list {
    grid-template-columns: 1fr;
  }

  .summary {
    gap: 16px;
  }
}
</style>
