<script setup>
import ModalShell from './ModalShell.vue'

const props = defineProps({
  index: { type: Number, default: null },
  /** 是否为当前正在进行的存档（仅游戏内面板会出现） */
  current: { type: Boolean, default: false },
  /** game：游戏内查看存档；menu：主菜单读取存档 */
  scene: { type: String, default: 'game' },
})

defineEmits(['close', 'confirm'])
</script>

<template>
  <Teleport to="body">
    <ModalShell
      v-if="props.index !== null"
      title="删除这份存档？"
      :sub="`存档 ${String(props.index + 1).padStart(2, '0')} · 不可恢复`"
      @close="$emit('close')"
    >
      <p class="delete-warn">
        删除后这份记录会从本机永久移除，无法找回，也不能撤销。其他存档位不受影响。
      </p>
      <p v-if="props.scene === 'menu'" class="delete-warn delete-warn--soft">
        当前没有正在进行的本局游戏，删除只影响本机存档文件；如有导出的备份文件，仍可重新导入恢复。
      </p>
      <p v-else-if="props.current" class="delete-warn delete-warn--soft">
        这是你当前正在进行的存档：删除后本局仍可继续，但只要离开并保存，就会重新写入这个槽位。
      </p>
      <template #footer>
        <span>删除前请确认不再需要这份进度</span>
        <div class="delete-actions">
          <button type="button" class="btn" @click="$emit('close')">取消</button>
          <button type="button" class="btn btn--primary" @click="$emit('confirm')">
            确认删除
          </button>
        </div>
      </template>
    </ModalShell>
  </Teleport>
</template>

<style scoped>
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
</style>
