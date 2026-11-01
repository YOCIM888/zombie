<script setup>
import { computed } from 'vue'
import { formatDuration, formatSavedAt } from '../game/format'

const props = defineProps({
  slot: { type: Object, default: null },
  index: { type: Number, required: true },
  active: { type: Boolean, default: false },
})

const indexLabel = computed(() => String(props.index + 1).padStart(2, '0'))
</script>

<template>
  <article class="slot" :class="{ 'slot--empty': !slot, 'slot--active': active }">
    <div class="slot__no">{{ indexLabel }}</div>
    <div class="slot__body">
      <template v-if="slot">
        <div class="slot__title">
          {{ slot.name }}
          <span v-if="active" class="slot__badge">当前</span>
        </div>
        <div class="slot__meta">
          第 {{ slot.day }} 天 · 回合 {{ slot.turn }} · 生命 {{ slot.stats?.hp ?? '—' }}/100
        </div>
        <div class="slot__meta">
          游玩 {{ formatDuration(slot.playtime, { withSeconds: false }) }} ·
          {{ formatSavedAt(slot.savedAt) }}
        </div>
      </template>
      <template v-else>
        <div class="slot__title slot__title--empty">空存档位</div>
        <div class="slot__meta">尚未记录任何生存数据</div>
      </template>
    </div>
    <div class="slot__actions">
      <slot />
    </div>
  </article>
</template>

<style scoped>
.slot {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.015);
  transition: 0.2s;
}

.slot + .slot {
  margin-top: 10px;
}

.slot:hover {
  border-color: var(--line-strong);
  background: rgba(255, 255, 255, 0.035);
}

.slot--active {
  border-color: rgba(193, 74, 50, 0.5);
  background: rgba(193, 74, 50, 0.07);
}

.slot--empty {
  opacity: 0.66;
}

.slot__no {
  width: 34px;
  flex: none;
  font-family: var(--font-mono);
  font-size: 18px;
  color: var(--text-mute);
  border-right: 1px solid var(--line);
  padding-right: 14px;
}

.slot__body {
  flex: 1;
  min-width: 0;
}

.slot__title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-title);
  font-size: 17px;
  letter-spacing: 0.1em;
  color: var(--text);
}

.slot__title--empty {
  color: var(--text-mute);
  font-size: 15px;
}

.slot__badge {
  font-family: var(--font-body);
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--rust-soft);
  border: 1px solid rgba(193, 74, 50, 0.5);
  padding: 1px 6px;
}

.slot__meta {
  margin-top: 5px;
  font-size: 11.5px;
  letter-spacing: 0.04em;
  color: var(--text-dim);
  font-family: var(--font-mono);
}

.slot__actions {
  display: flex;
  gap: 8px;
  flex: none;
}

.slot__actions :deep(.btn) {
  height: 32px;
  padding: 0 14px;
  font-size: 12px;
}

@media (max-width: 620px) {
  .slot {
    flex-wrap: wrap;
    gap: 12px;
  }

  .slot__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
