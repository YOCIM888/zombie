<script setup>
import { useShortcutLayer } from '../game/keyboard'
import { closeKillDoll, continueKillDoll, killDoll } from '../game/killDoll'
import ModalShell from './ModalShell.vue'

function requestClose() {
  if (killDoll.running) return
  closeKillDoll()
}

// 弹窗未显示时必须放行，否则会吞掉全局 ESC / TAB
useShortcutLayer({
  escape() {
    if (!killDoll.visible) return false
    requestClose()
    return true
  },
  toggleBag() {
    if (!killDoll.visible) return false
    requestClose()
    return true
  },
})

const logTail = () => killDoll.log.slice(-6)
</script>

<template>
  <ModalShell
    v-if="killDoll.visible"
    title="杀戮玩偶"
    :sub="
      killDoll.running
        ? `第 ${killDoll.round} 轮 · 正在清理与赴宴`
        : `第 ${killDoll.round} 轮 · ${killDoll.finished ? '本轮已结束' : '前置条件检查'}`
    "
    @close="requestClose"
  >
    <div class="doll">
      <div class="doll__art">
        <img src="/image/任务道具/杀戮玩偶.webp" alt="杀戮玩偶" />
      </div>
      <div class="doll__main">
        <p class="eyebrow">当前进度</p>
        <h3 class="doll__step">
          {{ killDoll.step || (killDoll.running ? '准备中…' : '等待开始') }}
        </h3>
        <p class="doll__note">
          <template v-if="killDoll.running">玩偶正在按顺序行动，战斗与状态都走正式入口。</template>
          <template v-else-if="killDoll.error">本轮已经中止，原因见下方。</template>
          <template v-else-if="killDoll.finished">一轮流程已经走完，可以继续下一轮或结束。</template>
          <template v-else>检查通过后会从「外出探索」开始执行。</template>
        </p>
        <div v-if="killDoll.running" class="doll__pulse" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>

    <div v-if="killDoll.error" class="doll__block doll__block--error">
      <strong>中止原因</strong>
      <p v-for="(line, index) in killDoll.error.split('\n')" :key="`error-${index}`">
        {{ line }}
      </p>
    </div>

    <div v-if="killDoll.summary" class="doll__block">
      <strong>本轮结算</strong>
      <p v-for="(line, index) in killDoll.summary.split('\n')" :key="`summary-${index}`">
        {{ line }}
      </p>
    </div>

    <div v-if="killDoll.log.length" class="doll__block doll__block--log">
      <strong>执行记录 · 最近 {{ logTail().length }} / 共 {{ killDoll.log.length }} 步</strong>
      <ol>
        <li v-for="(line, index) in logTail()" :key="`log-${killDoll.log.length - 6 + index}`">
          {{ line }}
        </li>
      </ol>
    </div>

    <template #footer>
      <span class="doll__hint">
        {{
          killDoll.running
            ? '执行过程中无法关闭，请等这一轮走完。'
            : killDoll.canContinue
              ? '继续战斗时会重新检查全部前置条件（包括武器耐久与感染值）。'
              : '关闭后可从背包再次使用杀戮玩偶。'
        }}
      </span>
      <div class="doll__actions">
        <template v-if="killDoll.running">
          <button type="button" class="btn" disabled>正在执行…</button>
        </template>
        <template v-else-if="killDoll.canContinue">
          <button type="button" class="btn" @click="continueKillDoll">继续战斗</button>
          <button type="button" class="btn btn--primary" @click="requestClose">结束战斗</button>
        </template>
        <template v-else>
          <button type="button" class="btn btn--primary" @click="requestClose">关闭</button>
        </template>
      </div>
    </template>
  </ModalShell>
</template>

<style scoped>
.doll {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  align-items: center;
  gap: 18px;
}

.doll__art {
  border: 1px solid var(--line-strong);
  background: rgba(0, 0, 0, 0.45);
}

.doll__art img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.doll__step {
  margin: 6px 0 8px;
  font-family: var(--font-title);
  font-size: 22px;
  letter-spacing: 0.06em;
}

.doll__note {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-dim);
}

.doll__pulse {
  display: flex;
  gap: 6px;
  margin-top: 12px;
}

.doll__pulse span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--bone);
  animation: doll-pulse 1.1s ease-in-out infinite;
}

.doll__pulse span:nth-child(2) {
  animation-delay: 0.18s;
}

.doll__pulse span:nth-child(3) {
  animation-delay: 0.36s;
}

@keyframes doll-pulse {
  0%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

.doll__block {
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.28);
  font-size: 13px;
  line-height: 1.75;
}

.doll__block strong {
  display: block;
  margin-bottom: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.24em;
  color: var(--text-mute);
}

.doll__block p {
  margin: 0;
  color: var(--text);
  white-space: pre-wrap;
}

.doll__block--error {
  border-color: rgba(193, 74, 50, 0.55);
  background: rgba(193, 74, 50, 0.12);
}

.doll__block--error p {
  color: var(--rust-soft);
}

.doll__block--log {
  max-height: 190px;
  overflow-y: auto;
}

.doll__block--log ol {
  margin: 0;
  padding-left: 20px;
  color: var(--text-dim);
}

.doll__block--log li {
  margin: 2px 0;
}

.doll__actions {
  display: flex;
  gap: 10px;
}

.doll__hint {
  min-width: 0;
}

@media (max-width: 560px) {
  .doll {
    grid-template-columns: 84px minmax(0, 1fr);
    gap: 12px;
  }
}
</style>
