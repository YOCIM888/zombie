<script setup>
import { computed, onMounted } from 'vue'
import {
  STORAGE_DANGER_RATIO,
  STORAGE_WARN_RATIO,
  formatStorageSize,
  refreshStorageUsage,
  saveSlots,
  storageState,
} from '../game/save'

onMounted(refreshStorageUsage)

const usage = computed(() => storageState.usage)
const usagePercent = computed(() => Math.min(100, Math.round(usage.value.ratio * 1000) / 10))
const usageSizeLabel = computed(() =>
  usage.value.usedMb < 0.1 ? formatStorageSize(usage.value.bytes) : `${usage.value.usedMb.toFixed(2)} MB`,
)
const usagePercentLabel = computed(() => {
  const percent = usage.value.ratio * 100
  if (percent > 0 && percent < 0.1) return '<0.1%'
  return `${Math.round(percent * 10) / 10}%`
})
const usageLevel = computed(() => {
  if (usage.value.ratio >= STORAGE_DANGER_RATIO) return 'danger'
  if (usage.value.ratio >= STORAGE_WARN_RATIO) return 'warn'
  return 'ok'
})
const otherChars = computed(() =>
  Math.max(
    0,
    usage.value.chars - usage.value.slotChars - usage.value.globalChars - usage.value.settingsChars,
  ),
)
const occupiedCount = computed(() => saveSlots.list.filter(Boolean).length)
const usageHint = computed(() => {
  if (usageLevel.value === 'danger') return '占用已超过 95%，新的存档可能写入失败，请先删除旧存档'
  if (usageLevel.value === 'warn') return '占用已超过 80%，建议删除不再需要的存档'
  return '按 UTF-16 每字符 2 字节估算'
})
</script>

<template>
  <section class="storage" :class="`storage--${usageLevel}`">
    <div class="storage__head">
      <strong>本地存储</strong>
      <span>{{ usageSizeLabel }} / {{ usage.quotaMb }} MB · {{ usagePercentLabel }}</span>
    </div>
    <div class="storage__bar" aria-hidden="true">
      <i :style="{ width: `${usagePercent}%` }" />
    </div>
    <div class="storage__meta">
      <span>
        存档 {{ formatStorageSize(usage.slotChars * 2) }}（{{ occupiedCount }} / 10 槽） ·
        全局统计 {{ formatStorageSize(usage.globalChars * 2) }} ·
        设置 {{ formatStorageSize(usage.settingsChars * 2) }} ·
        其他 {{ formatStorageSize(otherChars * 2) }}
      </span>
      <span class="storage__hint">{{ usageHint }}</span>
    </div>
  </section>
</template>

<style scoped>
.storage {
  padding: 12px 14px;
  border: 1px solid var(--line);
  background: rgba(8, 10, 11, 0.55);
  backdrop-filter: blur(4px) saturate(0.9);
}

.storage--warn {
  border-color: rgba(201, 162, 39, 0.55);
}

.storage--danger {
  border-color: rgba(193, 74, 50, 0.65);
  background: rgba(193, 74, 50, 0.1);
}

.storage__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--text-dim);
}

.storage__head strong {
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: var(--text);
}

.storage--warn .storage__head span {
  color: #c9a227;
}

.storage--danger .storage__head span {
  color: var(--rust-soft);
}

.storage__bar {
  height: 4px;
  margin-top: 9px;
  background: rgba(214, 208, 191, 0.14);
}

.storage__bar i {
  display: block;
  height: 100%;
  min-width: 2px;
  background: var(--bone);
  transition: width 0.25s ease;
}

.storage--warn .storage__bar i {
  background: #c9a227;
}

.storage--danger .storage__bar i {
  background: var(--rust);
}

.storage__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px 16px;
  margin-top: 9px;
  font-size: 10.5px;
  line-height: 1.5;
  letter-spacing: 0.03em;
  color: var(--text-mute);
}

.storage--warn .storage__hint {
  color: #c9a227;
}

.storage--danger .storage__hint {
  color: var(--rust-soft);
}
</style>
