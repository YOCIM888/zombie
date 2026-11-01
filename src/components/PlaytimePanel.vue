<script setup>
import { computed } from 'vue'
import { saveSlots, globalStats } from '../game/save'
import { formatDuration, formatSavedAt } from '../game/format'
import ModalShell from './ModalShell.vue'

const total = computed(() => globalStats.totalPlaytime)

const occupiedSlots = computed(() =>
  saveSlots.list
    .map((slot, index) => ({ slot, index }))
    .filter((entry) => entry.slot),
)

const slotMax = computed(() =>
  Math.max(1, ...occupiedSlots.value.map((entry) => entry.slot.playtime || 0)),
)

function percentOf(seconds) {
  return Math.min(100, Math.round((seconds / slotMax.value) * 100))
}
</script>

<template>
  <ModalShell title="查看时长" sub="每一秒，都是你还没有死掉的证据" @close="$emit('close')">
    <section class="total">
      <span class="eyebrow">累计生存时长</span>
      <strong class="total__value">{{ formatDuration(total) }}</strong>
      <span class="total__note">
        共 {{ occupiedSlots.length }} 个存档位留下了记录 · 已解锁
        {{ globalStats.achievements.length }} 项成就
      </span>
    </section>

    <div class="hairline" />

    <section class="list">
      <h3 class="list__title">各存档位 · 已保存时长</h3>

      <p v-if="!occupiedSlots.length" class="empty">还没有任何存档记录，先去「新的开始」吧。</p>

      <div v-for="entry in occupiedSlots" :key="entry.index" class="row">
        <div class="row__head">
          <span class="row__name">
            <em>{{ String(entry.index + 1).padStart(2, '0') }}</em>
            {{ entry.slot.name }}
          </span>
          <span class="row__time">{{ formatDuration(entry.slot.playtime) }}</span>
        </div>
        <div class="row__track">
          <div class="row__fill" :style="{ width: percentOf(entry.slot.playtime) + '%' }" />
        </div>
        <span class="row__meta">
          第 {{ entry.slot.day }} 天 · 回合 {{ entry.slot.turn }} · 最后保存
          {{ formatSavedAt(entry.slot.savedAt) }}
        </span>
      </div>
    </section>

    <template #footer>
      <span>累计时长包含未保存的部分；存档位时长以最后一次保存为准。</span>
      <span class="mode">PLAYTIME</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.total {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 6px 0 20px;
}

.total__value {
  font-family: var(--font-mono);
  font-size: clamp(30px, 4.4vw, 46px);
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--bone);
  text-shadow: 0 0 30px rgba(205, 185, 141, 0.18);
}

.total__note {
  font-size: 12px;
  color: var(--text-mute);
  letter-spacing: 0.06em;
}

.list {
  padding-top: 20px;
}

.list__title {
  margin: 0 0 16px;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.24em;
  color: var(--text-dim);
}

.empty {
  margin: 0;
  padding: 26px 0;
  font-size: 13px;
  color: var(--text-mute);
  letter-spacing: 0.06em;
}

.row {
  padding: 12px 0;
}

.row + .row {
  border-top: 1px dashed var(--line);
}

.row__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.row__name {
  font-family: var(--font-title);
  font-size: 16px;
  letter-spacing: 0.1em;
  color: var(--text);
}

.row__name em {
  margin-right: 10px;
  font-family: var(--font-mono);
  font-style: normal;
  font-size: 12px;
  color: var(--text-mute);
}

.row__time {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--bone);
}

.row__track {
  height: 2px;
  margin: 10px 0 8px;
  background: rgba(214, 208, 191, 0.1);
}

.row__fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(193, 74, 50, 0.85), rgba(193, 74, 50, 0.3));
}

.row__meta {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
  font-family: var(--font-mono);
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}
</style>
