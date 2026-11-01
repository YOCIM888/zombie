<script setup>
import { computed, ref } from 'vue'
import { DEFAULT_CHARACTER_NAME } from '../game/config'
import { saveSlots } from '../game/save'
import { notify, game } from '../game/store'
import ModalShell from './ModalShell.vue'
import SlotRow from './SlotRow.vue'

const props = defineProps({
  mode: { type: String, required: true }, // 'new' | 'load'
})

const emit = defineEmits(['close', 'start', 'load'])

const pending = ref(null)
const name = ref(DEFAULT_CHARACTER_NAME)

const isNew = computed(() => props.mode === 'new')

function labelFor(index) {
  const slot = saveSlots.list[index]
  if (isNew.value) {
    if (!slot) return '在此开始'
    return pending.value === index ? '确认覆盖' : '覆盖开始'
  }
  return '读取'
}

function pick(index) {
  const slot = saveSlots.list[index]
  if (isNew.value) {
    if (slot && pending.value !== index) {
      pending.value = index
      notify('该存档位已有记录，再次点击将覆盖')
      return
    }
    emit('start', index, name.value)
    return
  }
  if (!slot) {
    notify('该存档位为空')
    return
  }
  emit('load', index)
}
</script>

<template>
  <ModalShell
    :title="isNew ? '新的开始' : '读取存档'"
    :sub="isNew ? '选择一个存档位，从灰烬里醒来' : '选择一份记录，回到你停下的地方'"
    @close="$emit('close')"
  >
    <label v-if="isNew" class="name" for="survivor-name">
      <span class="name__label">幸存者名字</span>
      <input
        id="survivor-name"
        v-model="name"
        type="text"
        maxlength="16"
        :placeholder="DEFAULT_CHARACTER_NAME"
      />
      <span class="name__hint">默认「{{ DEFAULT_CHARACTER_NAME }}」，进入游戏后也能改</span>
    </label>

    <div class="slots">
      <SlotRow
        v-for="(slot, index) in saveSlots.list"
        :key="index"
        :slot="slot"
        :index="index"
        :active="!isNew && game.slotIndex === index"
      >
        <button
          type="button"
          class="btn"
          :class="{ 'btn--primary': !slot || pending === index }"
          @click="pick(index)"
        >
          {{ labelFor(index) }}
        </button>
      </SlotRow>
    </div>

    <template #footer>
      <span>
        {{
          isNew
            ? '新的开始会立即写入所选存档位，已有记录需二次确认。'
            : '读取后，当前未保存的进度将被覆盖。'
        }}
      </span>
      <span class="mode">{{ isNew ? 'NEW GAME' : 'CONTINUE' }}</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.name {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.25);
  font-size: 11px;
  color: var(--text-mute);
}

.name__label {
  letter-spacing: 0.08em;
  color: var(--text-dim);
}

.name input {
  width: 180px;
  height: 30px;
  padding: 0 9px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--line-strong);
  outline: none;
}

.name input:focus {
  border-color: rgba(193, 74, 50, 0.6);
}

.name__hint {
  font-size: 10px;
  color: var(--text-mute);
}

.slots {
  padding-top: 2px;
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
  color: var(--text-mute);
}
</style>
