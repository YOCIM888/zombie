<script setup>
import { computed } from 'vue'
import { mafeiQuestForTarget, npcById } from '../data'
import { battle, resetBattle, startAssassination } from '../game/battle'
import { isNpcDead, questStatus } from '../game/store'
import BattleView from './BattleView.vue'

const props = defineProps({
  npcId: { type: String, required: true },
})

const emit = defineEmits(['feedback'])

const npc = computed(() => npcById(props.npcId))
const quest = computed(() => mafeiQuestForTarget(props.npcId))
const status = computed(() => (quest.value ? questStatus(quest.value.id) : 'locked'))
const dead = computed(() => isNpcDead(props.npcId))
const visible = computed(
  () => Boolean(quest.value) && (status.value === 'active' || status.value === 'done' || dead.value),
)
const inBattle = computed(
  () => battle.kind === 'assassination' && battle.npcId === props.npcId,
)

function start() {
  const line = startAssassination(props.npcId)
  if (line) emit('feedback', line)
}

function done() {
  const wasAssassination = battle.kind === 'assassination' && battle.npcId === props.npcId
  const summary = battle.summary
  resetBattle()
  if (wasAssassination) emit('feedback', summary)
}
</script>

<template>
  <article v-if="visible && npc" class="assassin">
    <header class="assassin__head">
      <h4 class="assassin__title">马斐的委托 · {{ quest.no }}</h4>
      <span class="assassin__tag">{{ dead ? '已完成' : status === 'active' ? '进行中' : '未接取' }}</span>
    </header>

    <p class="assassin__desc">
      <q>{{ quest.desc }}</q>
    </p>

    <div class="assassin__stats">
      <span>生命 {{ npc.hp }}</span>
      <span>攻击 {{ npc.attack }}</span>
      <span v-if="npc.dodge">闪避 {{ Math.round(npc.dodge * 100) }}%</span>
      <span v-if="npc.infection">感染 +{{ npc.infection }}</span>
      <span v-if="!dead">目标：{{ npc.name }}</span>
    </div>

    <p v-if="dead" class="assassin__hint">
      {{ npc.deathLine }} 回山地军营找马斐复命。
    </p>

    <button
      v-if="!dead && status === 'active' && !inBattle"
      type="button"
      class="btn assassin__btn"
      @click="start"
    >
      动手 · 1 回合
    </button>

    <BattleView v-if="inBattle" @done="done" />
  </article>
</template>

<style scoped>
.assassin {
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(193, 74, 50, 0.32);
  border-left: 2px solid var(--rust);
  background: linear-gradient(180deg, rgba(193, 74, 50, 0.06), rgba(0, 0, 0, 0.18));
}

.assassin__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.assassin__title {
  margin: 0;
  font-family: var(--font-title);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--rust-soft);
}

.assassin__tag {
  flex: none;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.1em;
  color: var(--text-mute);
}

.assassin__desc {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.8;
  color: var(--text-dim);
}

.assassin__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-mute);
}

.assassin__hint {
  margin: 8px 0 0;
  font-size: 10.5px;
  line-height: 1.7;
  color: var(--text-dim);
}

.assassin__btn {
  height: 32px;
  margin-top: 10px;
  padding: 0 16px;
  font-size: 11px;
  border-color: rgba(193, 74, 50, 0.55);
  color: var(--rust-soft);
}
</style>
