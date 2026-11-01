<script setup>
import { computed } from 'vue'
import { countItem, getItem, questLine } from '../data'
import {
  acceptQuest,
  claimQuest,
  game,
  questKillProgress,
  questLockReason,
  questStatus,
} from '../game/store'

const props = defineProps({
  owner: { type: String, required: true },
})

const emit = defineEmits(['feedback'])

const quests = computed(() => questLine(props.owner))

function stateOf(quest) {
  return questStatus(quest.id)
}

function stateLabel(quest) {
  return {
    done: '已完成',
    active: '进行中',
    available: '可接取',
    locked: '未解锁',
  }[stateOf(quest)]
}

function itemName(itemId) {
  return getItem(itemId)?.name ?? itemId
}

function have(itemId) {
  return countItem(game.inventory, itemId)
}

function killText(quest) {
  const progress = questKillProgress(quest.id)
  if (!progress) return ''
  const state = stateOf(quest)
  if (state === 'active') return `${progress.current} / ${progress.target}`
  if (state === 'done') return `${progress.target} / ${progress.target}`
  return `0 / ${progress.target}`
}

function rewardText(quest) {
  const reward = quest.reward ?? {}
  const parts = []
  if (reward.identity) parts.push(`「${reward.identity}」身份牌`)
  if (reward.dawnIdentity) parts.push(`曙光「${reward.dawnIdentity}」徽章`)
  if (reward.coins) parts.push(`${reward.coins} 末日币`)
  if (reward.dawnCoins) parts.push(`${reward.dawnCoins} 曙光币`)
  for (const item of reward.items ?? []) {
    parts.push(`${itemName(item.id)} ×${item.qty ?? 1}`)
  }
  if (reward.finale) parts.push(`结局「${reward.finale}」`)
  return parts.join(' · ')
}

function lockReason(quest) {
  return stateOf(quest) === 'locked' ? questLockReason(quest.id) : ''
}

function buttonText(quest) {
  return {
    done: '已完成',
    active: '提交并领取',
    available: '接取任务',
    locked: '未解锁',
  }[stateOf(quest)]
}

function buttonDisabled(quest) {
  const state = stateOf(quest)
  return state === 'done' || state === 'locked'
}

function act(quest) {
  const state = stateOf(quest)
  if (state === 'available') {
    emit('feedback', acceptQuest(quest.id))
  } else if (state === 'active') {
    emit('feedback', claimQuest(quest.id))
  }
}
</script>

<template>
  <div class="quests">
    <article
      v-for="quest in quests"
      :key="quest.id"
      class="quest"
      :class="`is-${stateOf(quest)}`"
    >
      <header class="quest__head">
        <span class="quest__no">{{ quest.no }}</span>
        <div class="quest__main">
          <h4 class="quest__name">{{ quest.name }}</h4>
          <p class="quest__desc">{{ quest.desc }}</p>
        </div>
        <span class="quest__state">{{ stateLabel(quest) }}</span>
      </header>

      <div v-if="quest.require?.items" class="quest__req">
        <div
          v-for="need in quest.require.items"
          :key="need.id"
          class="quest__line"
          :class="{ 'is-lack': have(need.id) < need.qty }"
        >
          <span>{{ itemName(need.id) }}</span>
          <b>{{ have(need.id) }} / {{ need.qty }}</b>
        </div>
      </div>

      <div v-if="quest.require?.kills" class="quest__req">
        <div class="quest__line" :class="{ 'is-lack': stateOf(quest) === 'active' && questKillProgress(quest.id).current < quest.require.kills }">
          <span>击杀行尸</span>
          <b>{{ killText(quest) }}</b>
        </div>
      </div>

      <div v-if="quest.require?.boss" class="quest__req">
        <div class="quest__line" :class="{ 'is-lack': !game.flags.dawnLeaderKilled }">
          <span>击败首领·羿阳</span>
          <b>{{ game.flags.dawnLeaderKilled ? '已击败' : '未击败' }}</b>
        </div>
      </div>

      <p class="quest__reward">奖励：{{ rewardText(quest) }}</p>
      <p v-if="quest.hint" class="quest__hint">{{ quest.hint }}</p>
      <p v-if="lockReason(quest)" class="quest__locked">{{ lockReason(quest) }}</p>

      <button
        type="button"
        class="btn quest__btn"
        :class="{ 'btn--primary': stateOf(quest) !== 'done' }"
        :disabled="buttonDisabled(quest)"
        @click="act(quest)"
      >
        {{ buttonText(quest) }}
      </button>
    </article>
  </div>
</template>

<style scoped>
.quests {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.quest {
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-left: 2px solid var(--line-strong);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
  transition: border-color 0.2s;
}

.quest.is-active {
  border-left-color: var(--rust);
}

.quest.is-done {
  opacity: 0.62;
}

.quest__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.quest__no {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-mute);
  padding-top: 3px;
}

.quest__main {
  flex: 1;
  min-width: 0;
}

.quest__name {
  margin: 0;
  font-family: var(--font-title);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text);
}

.quest__desc {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.8;
  color: var(--text-dim);
}

.quest__state {
  flex: none;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.1em;
  color: var(--text-mute);
  border: 1px solid var(--line);
  padding: 2px 7px;
}

.quest.is-active .quest__state {
  color: var(--rust-soft);
  border-color: rgba(193, 74, 50, 0.5);
}

.quest.is-done .quest__state {
  color: var(--sick);
  border-color: rgba(124, 152, 64, 0.4);
}

.quest__req {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.24);
}

.quest__line {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--text-dim);
}

.quest__line b {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--bone);
}

.quest__line.is-lack b {
  color: #c8473a;
}

.quest__reward {
  margin: 10px 0 0;
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.quest__hint {
  margin: 6px 0 0;
  font-size: 10px;
  line-height: 1.7;
  color: var(--text-mute);
}

.quest__locked {
  margin: 6px 0 0;
  font-size: 10.5px;
  line-height: 1.7;
  color: var(--rust-soft);
}

.quest__btn {
  height: 30px;
  margin-top: 12px;
  padding: 0 14px;
  font-size: 11px;
}
</style>
