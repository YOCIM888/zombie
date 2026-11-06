<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
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

/* ===== 拖动窗口 ===== */

const POS_KEY = 'xingshi.devConsole.pos.v1'
const MARGIN = 8
const rootEl = ref(null)
const dragHead = ref(null)
const pos = ref(null)
const dragging = ref(false)
const drag = { pointerId: null, offsetX: 0, offsetY: 0 }

const rootStyle = computed(() =>
  pos.value
    ? { left: `${pos.value.x}px`, top: `${pos.value.y}px`, right: 'auto', bottom: 'auto' }
    : {},
)

/** 边界约束：整个窗口留在视口内 8px 安全边距，至少标题栏可见且能拖回 */
function clampPos(x, y) {
  if (!rootEl.value) return { x, y }
  const rect = rootEl.value.getBoundingClientRect()
  const maxX = Math.max(MARGIN, window.innerWidth - rect.width - MARGIN)
  const maxY = Math.max(MARGIN, window.innerHeight - rect.height - MARGIN)
  return {
    x: Math.min(Math.max(x, MARGIN), maxX),
    y: Math.min(Math.max(y, MARGIN), maxY),
  }
}

function readSavedPos() {
  try {
    const raw = window.localStorage.getItem(POS_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!Number.isFinite(data?.x) || !Number.isFinite(data?.y)) return null
    return { x: data.x, y: data.y }
  } catch {
    return null
  }
}

function savePos(value) {
  try {
    window.localStorage.setItem(
      POS_KEY,
      JSON.stringify({ x: Math.round(value.x), y: Math.round(value.y) }),
    )
  } catch {}
}

function reclamp() {
  if (!pos.value) return
  const next = clampPos(pos.value.x, pos.value.y)
  if (next.x !== pos.value.x || next.y !== pos.value.y) {
    pos.value = next
    savePos(next)
  }
}

function onHeadPointerDown(event) {
  if (dragging.value) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (event.target instanceof Element && event.target.closest('button')) return
  const rect = rootEl.value?.getBoundingClientRect()
  if (!rect) return

  // 首次拖动把 right / bottom 定位换成显式 left / top，位置不跳变
  pos.value = { x: rect.left, y: rect.top }
  drag.pointerId = event.pointerId
  drag.offsetX = event.clientX - rect.left
  drag.offsetY = event.clientY - rect.top
  dragging.value = true
  try {
    dragHead.value?.setPointerCapture(event.pointerId)
  } catch {}

  window.addEventListener('pointermove', onDragMove, { passive: false })
  window.addEventListener('pointerup', onDragEnd)
  window.addEventListener('pointercancel', onDragEnd)
  event.preventDefault()
}

function onDragMove(event) {
  if (!dragging.value || event.pointerId !== drag.pointerId) return
  if (event.cancelable) event.preventDefault()
  const next = clampPos(event.clientX - drag.offsetX, event.clientY - drag.offsetY)
  if (next.x !== pos.value.x || next.y !== pos.value.y) pos.value = next
}

function onDragEnd(event) {
  if (event.pointerId !== drag.pointerId) return
  dragging.value = false
  drag.pointerId = null
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
  if (pos.value) savePos(pos.value)
}

onMounted(async () => {
  window.addEventListener('resize', reclamp)
  window.addEventListener('orientationchange', reclamp)

  const saved = readSavedPos()
  if (saved) {
    await nextTick()
    pos.value = clampPos(saved.x, saved.y)
    savePos(pos.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', reclamp)
  window.removeEventListener('orientationchange', reclamp)
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
})
</script>

<template>
  <aside
    ref="rootEl"
    class="dev"
    :class="{ 'dev--dragging': dragging }"
    :style="rootStyle"
  >
    <header ref="dragHead" class="dev__head" @pointerdown="onHeadPointerDown">
      <span class="dev__dot" />
      <span class="dev__title">开发者控制台</span>
      <span class="dev__status">{{ status }}</span>
      <button
        type="button"
        class="dev__close"
        aria-label="关闭控制台"
        @pointerdown.stop
        @click="close"
      >
        ✕
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
  overflow: hidden;
  border: 1px solid var(--line-strong);
  background: linear-gradient(180deg, rgba(17, 19, 20, 0.96), rgba(10, 12, 13, 0.97));
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  font-family: var(--font-mono);
}

.dev::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 46px;
  height: 2px;
  background: var(--rust);
}

.dev__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 10px 14px;
  border-bottom: 1px solid var(--line);
  background: rgba(193, 74, 50, 0.06);
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.dev--dragging,
.dev--dragging * {
  cursor: grabbing !important;
  user-select: none;
  -webkit-user-select: none;
}

.dev__dot {
  width: 6px;
  height: 6px;
  flex: none;
  background: var(--rust);
}

.dev__title {
  font-family: var(--font-title);
  font-size: 14px;
  letter-spacing: 0.16em;
  color: var(--text);
}

.dev__status {
  margin-left: auto;
  font-size: 9px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.dev__close {
  flex: none;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  font-size: 12px;
  line-height: 1;
  color: var(--text-dim);
  cursor: pointer;
  transition: 0.2s;
}

.dev__close:hover {
  border-color: var(--rust);
  color: var(--rust-soft);
}

.dev__log {
  flex: 1;
  min-height: 150px;
  overflow-y: auto;
  padding: 11px 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  scrollbar-width: thin;
  scrollbar-color: rgba(214, 208, 191, 0.22) transparent;
}

.dev__log::-webkit-scrollbar {
  width: 6px;
}

.dev__log::-webkit-scrollbar-thumb {
  background: rgba(214, 208, 191, 0.22);
}

.dev__log::-webkit-scrollbar-track {
  background: transparent;
}

.dev__line {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.7;
  letter-spacing: 0.02em;
  color: var(--text-dim);
  white-space: pre-wrap;
  word-break: break-word;
}

.dev__line--cmd {
  margin-top: 3px;
  padding-left: 8px;
  border-left: 2px solid rgba(193, 74, 50, 0.55);
  color: var(--text);
}

.dev__line--ok {
  color: var(--bone);
}

.dev__line--warn {
  color: var(--rust-soft);
}

.dev__form {
  flex: none;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border-top: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.3);
}

.dev__prompt {
  font-size: 11px;
  color: var(--rust-soft);
}

.dev__input {
  flex: 1;
  min-width: 0;
  height: 30px;
  padding: 0 9px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text);
  background: rgba(8, 9, 10, 0.9);
  border: 1px solid var(--line);
  outline: none;
  transition: border-color 0.2s;
}

.dev__input::placeholder {
  color: var(--text-mute);
}

.dev__input:focus {
  border-color: var(--rust);
}

.dev__run {
  height: 30px;
  padding: 0 12px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #f0e3d2;
  border: 1px solid rgba(193, 74, 50, 0.7);
  background: rgba(193, 74, 50, 0.18);
  cursor: pointer;
  transition: 0.2s;
}

.dev__run:hover {
  background: rgba(193, 74, 50, 0.32);
}

.dev__foot {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-top: 1px solid var(--line);
  font-size: 9px;
  color: var(--text-mute);
}

.dev__quick {
  height: 24px;
  padding: 0 8px;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-dim);
  border: 1px solid var(--line);
  cursor: pointer;
  transition: 0.2s;
}

.dev__quick:hover {
  color: var(--text);
  border-color: var(--rust);
}

@media (max-width: 560px) {
  .dev {
    right: 8px;
    bottom: 8px;
    width: calc(100vw - 16px);
  }
}
</style>
