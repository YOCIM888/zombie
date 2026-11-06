<script setup>
import { ref } from 'vue'
import { panelBackground } from '../data'
import { saveSlots } from '../game/save'
import { currentPlaytime, game, loadFromSlot, notify, saveToSlot } from '../game/store'
import { formatDuration } from '../game/format'
import ModalShell from './ModalShell.vue'
import SlotRow from './SlotRow.vue'

const emit = defineEmits(['close'])
const pending = ref(null)

function saveTo(index) {
  const occupied = Boolean(saveSlots.list[index])
  if (occupied && pending.value !== index) {
    pending.value = index
    notify('该存档位已有记录，再次点击将覆盖')
    return
  }
  pending.value = null
  saveToSlot(index)
}

function loadFrom(index) {
  if (!saveSlots.list[index]) {
    notify('该存档位为空')
    return
  }
  loadFromSlot(index)
  emit('close')
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
      </SlotRow>
    </div>

    <template #footer>
      <span>本次游玩 {{ formatDuration(currentPlaytime) }} · 保存会写入当前属性与回合</span>
      <span class="mode">SAVE / LOAD</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.slots {
  padding-top: 2px;
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

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}
</style>
