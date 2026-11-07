<script setup>
import { computed, onMounted, ref } from 'vue'
import { DEFAULT_CHARACTER_NAME } from '../game/config'
import {
  buildSaveBundle,
  clearSlot,
  formatStorageSize,
  importSaveBundle,
  parseSaveBundle,
  refreshStorageUsage,
  saveBundleFileName,
  saveSlots,
  settings,
} from '../game/save'
import { notify, game } from '../game/store'
import { updateMusicSettings, startMusic } from '../game/music'
import ModalShell from './ModalShell.vue'
import SaveStorageBar from './SaveStorageBar.vue'
import SlotDeleteDialog from './SlotDeleteDialog.vue'
import SlotRow from './SlotRow.vue'

const props = defineProps({
  mode: { type: String, required: true }, // 'new' | 'load'
})

const emit = defineEmits(['close', 'start', 'load'])

const pending = ref(null)
const name = ref(DEFAULT_CHARACTER_NAME)
const pendingDelete = ref(null)

/* 存档导出 / 导入：主菜单读取存档是唯一入口 */
const fileInput = ref(null)
const exportInfo = ref('')
const pendingImport = ref(null)
const pendingFile = ref(null)

const isNew = computed(() => props.mode === 'new')
const footerHint = computed(() => {
  if (isNew.value) return '新的开始会立即写入所选存档位，已有记录需二次确认。'
  if (exportInfo.value) return `上次导出：${exportInfo.value}`
  return '读取后，当前未保存的进度将被覆盖 · 导出含 10 槽位、全局统计与设置'
})

onMounted(refreshStorageUsage)

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
  if (index === null) return
  const result = clearSlot(index)
  refreshStorageUsage()
  if (!result.ok) {
    notify(result.message, 3800)
    return
  }
  notify(`已删除存档 ${String(index + 1).padStart(2, '0')}，该记录已从本机移除，无法恢复`)
}

function exportSaves() {
  const fileName = saveBundleFileName()
  const text = JSON.stringify(buildSaveBundle(), null, 2)
  try {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    exportInfo.value = `${fileName} · ${formatStorageSize(blob.size)}`
    notify('存档文件已导出，可以复制到其他设备备份', 3000)
  } catch {
    notify('导出失败：浏览器没有允许下载文件。', 3600)
  }
}

function chooseImportFile() {
  fileInput.value?.click()
}

function onFileChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (file.size > 8 * 1024 * 1024) {
    notify('文件超过 8 MB，不像是本游戏的存档文件。', 3600)
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const parsed = parseSaveBundle(String(reader.result || ''))
    if (!parsed.ok) {
      notify(parsed.message, 4400)
      return
    }
    pendingFile.value = { name: file.name, size: file.size }
    pendingImport.value = parsed
  }
  reader.onerror = () => notify('读取文件失败，请重试。', 3600)
  reader.readAsText(file, 'utf-8')
}

function cancelImport() {
  pendingImport.value = null
  pendingFile.value = null
}

function confirmImport() {
  const parsed = pendingImport.value
  const file = pendingFile.value
  pendingImport.value = null
  pendingFile.value = null
  if (!parsed) return
  const result = importSaveBundle(parsed.bundle)
  if (!result.ok) {
    notify(result.message, 4600)
    return
  }
  // 导入的设置立即生效，避免音乐/提示沿用旧值
  updateMusicSettings()
  if (!settings.muted) startMusic()
  refreshStorageUsage()
  notify(`${result.message}${file ? `（来源 ${file.name}）` : ''}`, 3400)
}
</script>

<template>
  <ModalShell
    :title="isNew ? '新的开始' : '读取存档'"
    :sub="isNew ? '选择一个存档位，从灰烬里醒来' : '选择一份记录，回到你停下的地方'"
    @close="$emit('close')"
  >
    <template v-if="!isNew" #hud>
      <SaveStorageBar />
    </template>

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

    <div class="slots" :class="{ 'slots--manager': !isNew }">
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
        <button
          v-if="!isNew"
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
      <span>{{ footerHint }}</span>
      <div v-if="!isNew" class="transfer">
        <button type="button" class="btn" @click="exportSaves">导出存档</button>
        <button type="button" class="btn" @click="chooseImportFile">导入存档</button>
        <input
          ref="fileInput"
          class="transfer__file"
          type="file"
          accept=".json,application/json"
          @change="onFileChange"
        />
        <span class="mode">CONTINUE</span>
      </div>
      <span v-else class="mode">NEW GAME</span>
    </template>

    <SlotDeleteDialog
      :index="pendingDelete"
      scene="menu"
      @close="cancelDelete"
      @confirm="confirmDelete"
    />

    <Teleport to="body">
      <ModalShell
        v-if="pendingImport"
        title="导入并覆盖本地存档？"
        :sub="
          pendingFile
            ? `${pendingFile.name} · ${formatStorageSize(pendingFile.size)}`
            : '存档文件'
        "
        @close="cancelImport"
      >
        <p class="transfer-warn">
          导入会覆盖本机现有的 10 个存档槽位、全局统计与设置，覆盖后无法撤销。 本次文件包含
          {{ pendingImport.bundle.slots.filter(Boolean).length }} 个已占用槽位。
        </p>
        <p v-if="pendingImport.older" class="transfer-warn transfer-warn--soft">
          文件版本较旧（v{{ pendingImport.version }}），会按当前结构读取，缺少的字段使用默认值。
        </p>
        <p class="transfer-warn transfer-warn--soft">
          取消不会写入任何数据，本地存档保持原样。
        </p>
        <template #footer>
          <span>确认后立即覆盖并刷新界面</span>
          <div class="transfer transfer--dialog">
            <button type="button" class="btn" @click="cancelImport">取消</button>
            <button type="button" class="btn btn--primary" @click="confirmImport">
              确认覆盖
            </button>
          </div>
        </template>
      </ModalShell>
    </Teleport>
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

.slots--manager {
  padding-top: 14px;
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

.transfer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  flex: none;
}

.transfer .btn {
  height: 30px;
  padding: 0 12px;
  font-size: 10.5px;
}

.transfer__file {
  display: none;
}

.transfer-warn {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
  letter-spacing: 0.04em;
  color: var(--text-dim);
}

.transfer-warn--soft {
  margin-top: 10px;
  color: var(--text-mute);
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
  color: var(--text-mute);
}

@media (max-width: 620px) {
  :deep(.modal-foot) {
    flex-wrap: wrap;
  }

  .transfer {
    justify-content: flex-end;
  }

  .transfer--dialog .btn {
    flex: 1 1 auto;
  }
}
</style>
