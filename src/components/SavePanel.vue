<script setup>
import { computed, onMounted, ref } from 'vue'
import { panelBackground } from '../data'
import {
  STORAGE_DANGER_RATIO,
  STORAGE_WARN_RATIO,
  clearSlot,
  formatStorageSize,
  refreshStorageUsage,
  saveSlots,
  storageState,
} from '../game/save'
import { currentPlaytime, game, loadFromSlot, notify, saveToSlot } from '../game/store'
import { formatDuration } from '../game/format'
import ModalShell from './ModalShell.vue'
import SlotRow from './SlotRow.vue'

const emit = defineEmits(['close'])
const pending = ref(null)
const pendingDelete = ref(null)

onMounted(() => {
  refreshStorageUsage()
})

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

function saveTo(index) {
  const occupied = Boolean(saveSlots.list[index])
  if (occupied && pending.value !== index) {
    pending.value = index
    notify('该存档位已有记录，再次点击将覆盖')
    return
  }
  pending.value = null
  saveToSlot(index)
  refreshStorageUsage()
}

function loadFrom(index) {
  if (!saveSlots.list[index]) {
    notify('该存档位为空')
    return
  }
  loadFromSlot(index)
  emit('close')
}

function askDelete(index) {
  if (!saveSlots.list[index]) return
  pendingDelete.value = index
}

function cancelDelete() {
  pendingDelete.value = null
}

function confirmDelete() {
  const index = pendingDelete.value
  pendingDelete.value = null
  if (index == null) return
  const result = clearSlot(index)
  refreshStorageUsage()
  const label = String(index + 1).padStart(2, '0')
  notify(result.ok ? `已删除存档 ${label}，该记录无法恢复` : result.message, result.ok ? 2400 : 4200)
}

function labelFor(index) {
  if (!saveSlots.list[index]) return '保存至此'
  return pending.value === index ? '确认覆盖' : '覆盖保存'
}
</script>

<template>
  <ModalShell
    title="查看存档"
    sub="本局进度 · 手动保存，随时读取"
    :bg="panelBackground('save')"
    bg-tone="soft"
    @close="emit('close')"
  >
    <template #hud>
      <section class="storage" :class="`storage--${usageLevel}`">
        <div class="storage__head">
          <strong>本地存储</strong>
          <span>
            {{ usageSizeLabel }} / {{ usage.quotaMb }} MB · {{ usagePercentLabel }}
          </span>
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

    <div class="slots">
      <SlotRow
        v-for="(slot, index) in saveSlots.list"
        :key="index"
        :slot="slot"
        :index="index"
        :active="game.slotIndex === index"
      >
        <button type="button" class="btn" @click="loadFrom(index)" :disabled="!slot">
          读取
        </button>
        <button
          type="button"
          class="btn"
          :class="{ 'btn--primary': !slot || pending === index }"
          @click="saveTo(index)"
        >
          {{ labelFor(index) }}
        </button>
        <button
          type="button"
          class="btn btn--danger"
          :disabled="!slot"
          @click="askDelete(index)"
        >
          删除
        </button>
      </SlotRow>
    </div>

    <template #footer>
      <span>本次游玩 {{ formatDuration(currentPlaytime) }} · 保存会写入当前属性与回合</span>
      <span class="mode">SAVE / LOAD</span>
    </template>

    <Teleport to="body">
      <ModalShell
        v-if="pendingDelete !== null"
        title="删除这份存档？"
        :sub="`存档 ${String(pendingDelete + 1).padStart(2, '0')} · 不可恢复`"
        @close="cancelDelete"
      >
        <p class="delete-warn">
          删除后这份记录会从本机永久移除，无法找回，也不能撤销。其他存档位不受影响。
        </p>
        <p v-if="pendingDelete === game.slotIndex" class="delete-warn delete-warn--soft">
          这是你当前正在进行的存档：删除后本局仍可继续，但只要离开并保存，就会重新写入这个槽位。
        </p>
        <template #footer>
          <span>删除前请确认不再需要这份进度</span>
          <div class="delete-actions">
            <button type="button" class="btn" @click="cancelDelete">取消</button>
            <button type="button" class="btn btn--primary" @click="confirmDelete">确认删除</button>
          </div>
        </template>
      </ModalShell>
    </Teleport>
  </ModalShell>
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

.slots {
  padding-top: 14px;
}

/* 存档位原本是近乎透明的行，压上一层浅底避免背景图干扰槽位信息 */
.slots :deep(.slot) {
  background: rgba(8, 10, 11, 0.55);
  backdrop-filter: blur(4px) saturate(0.9);
}

.slots :deep(.slot:hover) {
  background: rgba(16, 19, 20, 0.68);
}

.slots :deep(.slot--active) {
  background: rgba(193, 74, 50, 0.18);
}

.slots :deep(.slot--empty) {
  background: rgba(8, 10, 11, 0.42);
}

.slots :deep(.btn--danger) {
  color: var(--rust-soft);
  border-color: rgba(193, 74, 50, 0.35);
}

.slots :deep(.btn--danger:hover) {
  color: #f0e3d2;
  border-color: rgba(193, 74, 50, 0.7);
  background: rgba(193, 74, 50, 0.22);
}

.delete-warn {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
  letter-spacing: 0.04em;
  color: var(--text-dim);
}

.delete-warn--soft {
  margin-top: 12px;
  color: var(--text-mute);
}

.delete-actions {
  display: flex;
  gap: 10px;
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}

@media (max-width: 620px) {
  .slots :deep(.slot__actions) {
    gap: 6px;
  }

  .slots :deep(.btn) {
    padding: 0 10px;
    font-size: 11.5px;
  }
}
</style>
