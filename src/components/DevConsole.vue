<script setup>
import { computed, nextTick, ref } from 'vue'
import { battle } from '../game/battle'
import { devState, game, notify, runDevCommand } from '../game/store'

const emit = defineEmits(['close'])
const input = ref('')
const inputEl = ref(null)
const logEl = ref(null)
const lines = ref([
  '开发者控制台已连接。',
  '输入 /help 查看可用指令。',
])
const history = ref([])
let historyIndex = -1

const status = computed(() => {
  const kill = devState.oneHitKill ? 'ON' : 'OFF'
  const lock = devState.lockStats ? 'LOCK' : 'FREE'
  return `一击必杀 ${kill} · 状态 ${lock}`
})

async function submit() {
  const value = input.value.trim()
  if (!value) return

  lines.value.push(`> ${value}`)
  if (/^\/tp(?:\s|$)/i.test(value) && battle.active) {
    lines.value.push('战斗中无法传送，请先结束战斗。')
  } else {
    const result = runDevCommand(value)
    if (result) {
      lines.value.push(...String(result).split('\n'))
    }
  }
  if (lines.value.length > 80) lines.value = lines.value.slice(-80)

  history.value.push(value)
  historyIndex = -1
  input.value = ''

  await nextTick()
  if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
  inputEl.value?.focus()
}

function recall(step) {
  if (!history.value.length) return
  const last = history.value.length - 1
  historyIndex = Math.min(last, Math.max(0, historyIndex + step))
  input.value = history.value[last - historyIndex] ?? ''
}

function giveAll() {
  const result = runDevCommand('/get 万能灵药 10')
  lines.value.push('> /get 万能灵药 10')
  if (result) lines.value.push(result)
}

function close() {
  notify(`开发者控制台已关闭 · 背包 ${game.inventory.length} 格`)
  emit('close')
}
</script>

<template>
  <aside class="dev">
    <header class="dev__head">
      <span class="dev__dot" />
      <span class="dev__title">开发者控制台</span>
      <span class="dev__status">{{ status }}</span>
      <button type="button" class="dev__close" aria-label="关闭控制台" @click="close">
        ×
      </button>
    </header>

    <div ref="logEl" class="dev__log">
      <p
        v-for="(line, index) in lines"
        :key="index"
        class="dev__line"
        :class="{
          'dev__line--cmd': line.startsWith('>'),
          'dev__line--ok':
            line.startsWith('获得') ||
            line.startsWith('一击') ||
            line.startsWith('状态条') ||
            line.startsWith('已传送') ||
            line.startsWith('所有天赋'),
          'dev__line--warn': line.startsWith('未知') || line.startsWith('用法') || line.startsWith('没有'),
        }"
      >
        {{ line }}
      </p>
    </div>

    <form class="dev__form" @submit.prevent="submit">
      <span class="dev__prompt">$</span>
      <input
        ref="inputEl"
        v-model="input"
        class="dev__input"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="/help"
        @keydown.up.prevent="recall(1)"
        @keydown.down.prevent="recall(-1)"
      />
      <button type="submit" class="dev__run">执行</button>
    </form>

    <footer class="dev__foot">
      <button type="button" class="dev__quick" @click="giveAll">灵药 ×10</button>
      <span>仅本次会话有效，不写入存档。</span>
    </footer>
  </aside>
</template>

<style scoped>
.dev {
  position: fixed;
  right: clamp(12px, 2.4vw, 34px);
  bottom: clamp(12px, 2.4vw, 34px);
  z-index: 80;
  width: min(420px, calc(100vw - 24px));
  max-height: min(460px, calc(100vh - 24px));
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(124, 152, 64, 0.55);
  background: linear-gradient(180deg, rgba(12, 15, 11, 0.98), rgba(6, 8, 6, 0.98));
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.75);
  font-family: var(--font-mono);
}

.dev__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-bottom: 1px solid rgba(124, 152, 64, 0.35);
  background: rgba(124, 152, 64, 0.08);
}

.dev__dot {
  width: 6px;
  height: 6px;
  flex: none;
  background: var(--sick);
  box-shadow: 0 0 8px rgba(124, 152, 64, 0.8);
}

.dev__title {
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--bone);
}

.dev__status {
  margin-left: auto;
  font-size: 9px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.dev__close {
  flex: none;
  padding: 0 2px;
  font-size: 15px;
  line-height: 1;
  color: var(--text-mute);
  cursor: pointer;
}

.dev__close:hover {
  color: var(--rust-soft);
}

.dev__log {
  flex: 1;
  min-height: 150px;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.dev__line {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.65;
  letter-spacing: 0.02em;
  color: var(--text-dim);
  white-space: pre-wrap;
  word-break: break-word;
}

.dev__line--cmd {
  color: var(--bone);
  margin-top: 3px;
}

.dev__line--ok {
  color: var(--sick);
}

.dev__line--warn {
  color: var(--rust-soft);
}

.dev__form {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border-top: 1px solid rgba(124, 152, 64, 0.3);
  background: rgba(0, 0, 0, 0.35);
}

.dev__prompt {
  font-size: 11px;
  color: var(--sick);
}

.dev__input {
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--bone);
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(124, 152, 64, 0.4);
  outline: none;
}

.dev__input:focus {
  border-color: rgba(124, 152, 64, 0.8);
}

.dev__run {
  height: 28px;
  padding: 0 10px;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: var(--bone);
  border: 1px solid rgba(124, 152, 64, 0.5);
  background: rgba(124, 152, 64, 0.14);
  cursor: pointer;
}

.dev__run:hover {
  background: rgba(124, 152, 64, 0.26);
}

.dev__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-top: 1px solid rgba(124, 152, 64, 0.22);
  font-size: 9px;
  color: var(--text-mute);
}

.dev__quick {
  height: 22px;
  padding: 0 7px;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-dim);
  border: 1px solid var(--line);
  cursor: pointer;
}

.dev__quick:hover {
  color: var(--bone);
  border-color: rgba(124, 152, 64, 0.5);
}

@media (max-width: 560px) {
  .dev {
    right: 8px;
    bottom: 8px;
    width: calc(100vw - 16px);
  }
}
</style>
