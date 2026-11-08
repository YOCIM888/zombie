<script setup>
import { computed } from 'vue'
import { useShortcutLayer } from '../game/keyboard'
import { closeWorkDoll, continueWorkDoll, workDoll } from '../game/workDoll'
import ModalShell from './ModalShell.vue'

const branchTag = computed(() => (workDoll.branch ? ` · 分支 ${workDoll.branch}` : ''))

function requestClose() {
  if (workDoll.running) return
  closeWorkDoll()
}

// 执行中拦截 ESC / TAB：只弹回本窗口，不关闭下面压着的背包
// 弹窗未显示时必须放行，否则会吞掉全局 ESC / TAB
useShortcutLayer({
  escape() {
    if (!workDoll.visible) return false
    requestClose()
    return true
  },
  toggleBag() {
    if (!workDoll.visible) return false
    requestClose()
    return true
  },
})

const logTail = () => workDoll.log.slice(-6)
</script>

<template>
  <ModalShell
    v-if="workDoll.visible"
    title="工作玩偶"
    :sub="
      `第 ${workDoll.round} 轮${branchTag} · ${
        workDoll.running
          ? '正在按顺序干活'
          : workDoll.finished
            ? '本轮已结束'
            : '前置条件检查'
      }`
    "
    @close="requestClose"
  >
    <div class="doll">
      <div class="doll__art">
        <img src="/image/任务道具/工作玩偶.webp" alt="工作玩偶" />
      </div>
      <div class="doll__main">
        <p class="eyebrow">当前进度</p>
        <h3 class="doll__step">
          {{ workDoll.step || (workDoll.running ? '准备中…' : '等待开始') }}
        </h3>
        <p class="doll__note">
          <template v-if="workDoll.running">玩偶正在替你跑腿，每一步都会同步到游戏状态。</template>
          <template v-else-if="workDoll.error">本轮已经中止，原因见下方。</template>
          <template v-else-if="workDoll.finished">一轮完整流程已经走完，可以继续下一轮或结束。</template>
          <template v-else>检查通过后会从「外出探索」开始执行。</template>
        </p>
        <div v-if="workDoll.running" class="doll__pulse" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>

    <div v-if="workDoll.error" class="doll__block doll__block--error">
      <strong>中止原因</strong>
      <p v-for="(line, index) in workDoll.error.split('\n')" :key="`error-${index}`">
        {{ line }}
      </p>
    </div>

    <div v-if="workDoll.summary" class="doll__block">
      <strong>本轮结算</strong>
      <p v-for="(line, index) in workDoll.summary.split('\n')" :key="`summary-${index}`">
        {{ line }}
      </p>
    </div>

    <div v-if="workDoll.log.length" class="doll__block doll__block--log">
      <strong>执行记录 · 最近 {{ logTail().length }} / 共 {{ workDoll.log.length }} 步</strong>
      <ol>
        <li v-for="(line, index) in logTail()" :key="`log-${workDoll.log.length - 6 + index}`">
          {{ line }}
        </li>
      </ol>
    </div>

    <template #footer>
      <span class="doll__hint">
        {{
          workDoll.running
            ? '执行过程中无法关闭，请等这一轮走完。'
            : workDoll.canContinue
              ? '继续打工时会重新检查全部前置条件。'
              : '关闭后可从背包再次使用工作玩偶。'
        }}
      </span>
      <div class="doll__actions">
        <template v-if="workDoll.running">
          <button type="button" class="btn" disabled>正在执行…</button>
        </template>
        <template v-else-if="workDoll.canContinue">
          <button type="button" class="btn" @click="continueWorkDoll">继续打工</button>
          <button type="button" class="btn btn--primary" @click="requestClose">结束打工</button>
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
