<script setup>
import { computed, ref } from 'vue'
import { STAT_DEFS } from '../game/config'
import {
  CLEANLINESS_MAX,
  DAWN_FLEE_CHANCE,
  RANGED_BASE,
  UNARMED,
  ZOMBIE_ABILITY_LABELS,
  cleanlinessJamChance,
  cleanlinessMultiplier,
  getItem,
} from '../data'
import { formatPercent } from '../game/format'
import { game } from '../game/store'
import {
  battle,
  fleeBattle,
  meleeAttack,
  rangedAttack,
  useBattleItem,
} from '../game/battle'

const emit = defineEmits(['done'])
const bagOpen = ref(false)

const STAT_LABELS = Object.fromEntries(STAT_DEFS.map((stat) => [stat.key, stat.label]))

const melee = computed(() => {
  const equipped = game.equipment.melee
  const def = equipped ? getItem(equipped.id) : null
  return {
    name: def?.name ?? UNARMED.name,
    weapon: def?.weapon ?? UNARMED.weapon,
  }
})

const ranged = computed(() => {
  const equipped = game.equipment.ranged
  const def = equipped ? getItem(equipped.id) : null
  const cleanliness = equipped
    ? Number.isFinite(equipped.cleanliness)
      ? equipped.cleanliness
      : CLEANLINESS_MAX
    : 0
  return {
    name: def?.name ?? '未装备',
    weapon: def?.weapon ?? RANGED_BASE,
    cleanliness,
    canFire: Boolean(def?.weapon) && cleanliness > 0,
    effectiveAttack: Math.round((def?.weapon.attack ?? 0) * cleanlinessMultiplier(cleanliness)),
    jamChance: cleanlinessJamChance(cleanliness),
  }
})

const usableItems = computed(() =>
  game.inventory
    .map((entry, index) => ({ entry, index, def: entry ? getItem(entry.id) : null }))
    .filter((item) => item.entry && item.def?.effects),
)

const hpPercent = computed(() =>
  battle.zombie.maxHp
    ? Math.max(0, Math.min(100, (battle.zombie.hp / battle.zombie.maxHp) * 100))
    : 0,
)

const resultTitle = computed(
  () =>
    ({
      victory: '战斗结束 · 胜利',
      flee: '你逃掉了',
      dead: '你倒下了',
    })[battle.result] ?? '战斗结束',
)

const abilityLabels = computed(() =>
  (battle.zombie.abilities ?? []).map((key) => ZOMBIE_ABILITY_LABELS[key] ?? key),
)

const finishLabel = computed(() => (battle.kind === 'field' ? '继续探索' : '返回阵地'))

function effectText(def) {
  return Object.entries(def.effects)
    .map(([key, value]) => `${STAT_LABELS[key] ?? key} ${value > 0 ? '+' : ''}${value}`)
    .join(' · ')
}

function useItemInBattle(index) {
  useBattleItem(index)
  bagOpen.value = false
}

function finish() {
  emit('done')
}
</script>

<template>
  <div class="battle">
    <section class="zombie">
      <header class="zombie__head">
        <div>
          <span class="eyebrow">遭遇</span>
          <h3 class="zombie__name">{{ battle.zombie.name }}</h3>
        </div>
        <span class="zombie__hp">生命 {{ battle.zombie.hp }} / {{ battle.zombie.maxHp }}</span>
      </header>
      <div class="bar">
        <div class="bar__fill" :style="{ width: hpPercent + '%' }" />
      </div>
      <p class="zombie__desc">{{ battle.zombie.description }}</p>
      <div class="meta">
        <span>攻击 {{ battle.zombie.attack }}</span>
        <span v-if="battle.zombie.infection > 0">命中感染 +{{ battle.zombie.infection }}%</span>
        <span v-for="label in abilityLabels" :key="label" class="meta__ability">{{ label }}</span>
        <span>回合 {{ battle.round }}</span>
      </div>
    </section>

    <section class="player">
      <span>生命 <b>{{ game.stats.hp }}</b></span>
      <span>感染 <b>{{ game.stats.infection }}</b></span>
      <span>近战 <b>{{ melee.name }}</b></span>
      <span>连击 <b>{{ formatPercent(melee.weapon.combo) }}</b></span>
      <span>远程 <b>{{ ranged.name }}</b></span>
      <span v-if="game.equipment.ranged">清洁度 <b>{{ ranged.cleanliness }}</b></span>
      <span v-if="ranged.jamChance > 0">卡壳 <b>{{ formatPercent(ranged.jamChance) }}</b></span>
    </section>

    <section class="log">
      <ul class="log__list">
        <li v-for="line in battle.log" :key="line.id">{{ line.text }}</li>
      </ul>
    </section>

    <section v-if="battle.active" class="actions">
      <button type="button" class="btn btn--primary" @click="meleeAttack">
        近战攻击
        <span class="actions__hint">攻击 {{ melee.weapon.attack }}</span>
      </button>
      <button type="button" class="btn" :disabled="!ranged.canFire" @click="rangedAttack">
        远程攻击
        <span class="actions__hint">
          {{
            !game.equipment.ranged
              ? '未装备'
              : ranged.canFire
                ? `攻击 ${ranged.effectiveAttack} · 清洁 ${ranged.cleanliness}`
                : '需保养'
          }}
        </span>
      </button>
      <button type="button" class="btn" @click="bagOpen = !bagOpen">
        打开背包
        <span class="actions__hint">{{ usableItems.length }} 件可用</span>
      </button>
      <button type="button" class="btn" @click="fleeBattle">
        逃跑
        <span class="actions__hint">{{ formatPercent(DAWN_FLEE_CHANCE) }}</span>
      </button>
    </section>

    <section v-if="bagOpen && battle.active" class="bag">
      <header class="bag__head">
        <h4>背包 · 使用物品会消耗一次行动</h4>
        <button type="button" class="link" @click="bagOpen = false">收起</button>
      </header>
      <div v-if="usableItems.length" class="bag__list">
        <article v-for="item in usableItems" :key="item.index" class="bag__item">
          <img v-if="item.def.image" :src="item.def.image" :alt="item.def.name" />
          <div class="bag__main">
            <h5>{{ item.def.name }} ×{{ item.entry.qty }}</h5>
            <p>{{ effectText(item.def) }}</p>
          </div>
          <button type="button" class="btn" @click="useItemInBattle(item.index)">使用</button>
        </article>
      </div>
      <p v-else class="bag__empty">背包里没有可用的食物、饮品或药品。</p>
    </section>

    <section v-if="battle.finished" class="result">
      <span class="eyebrow">{{ resultTitle }}</span>
      <p v-if="battle.summary" class="result__text">{{ battle.summary }}</p>
      <button type="button" class="btn btn--primary" @click="finish">{{ finishLabel }}</button>
    </section>
  </div>
</template>

<style scoped>
.battle {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.zombie {
  padding: 14px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.24);
}

.zombie__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.zombie__name {
  margin: 5px 0 0;
  font-family: var(--font-title);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--text);
}

.zombie__hp {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--bone);
}

.bar {
  height: 4px;
  margin-top: 11px;
  background: rgba(214, 208, 191, 0.12);
  overflow: hidden;
}

.bar__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--rust), var(--rust-soft));
  transition: width 0.4s ease;
}

.zombie__desc {
  margin: 10px 0 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-mute);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
}

.meta span,
.player span {
  padding: 3px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-mute);
  border: 1px solid var(--line);
}

.meta__ability {
  color: var(--rust-soft);
  border-color: rgba(184, 98, 70, 0.45);
}

.player {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.player b {
  color: var(--bone);
  font-weight: 500;
}

.log {
  max-height: 150px;
  overflow: auto;
  padding: 12px 14px;
  border-left: 2px solid var(--line-strong);
  background: rgba(0, 0, 0, 0.22);
}

.log__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.log__list li {
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--text-dim);
}

.actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.actions .btn {
  flex-direction: column;
  gap: 3px;
  height: 54px;
  font-size: 12.5px;
}

.actions__hint {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.bag {
  padding: 12px 14px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.26);
}

.bag__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 9px;
  border-bottom: 1px solid var(--line);
}

.bag__head h4 {
  margin: 0;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.link {
  font-size: 10.5px;
  color: var(--text-mute);
  cursor: pointer;
}

.bag__list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 9px;
  background: var(--line);
}

.bag__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  background: #0d0f10;
}

.bag__item img {
  width: 34px;
  height: 34px;
  flex: none;
  object-fit: contain;
}

.bag__main {
  min-width: 0;
  flex: 1;
}

.bag__main h5 {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--text);
}

.bag__main p {
  margin: 3px 0 0;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--text-mute);
}

.bag__item .btn {
  height: 28px;
  padding: 0 12px;
  font-size: 10.5px;
  flex: none;
}

.bag__empty {
  margin: 9px 0 0;
  font-size: 11px;
  color: var(--text-mute);
}

.result {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  border: 1px dashed var(--line-strong);
}

.result__text {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.8;
  color: var(--text-dim);
}

@media (max-width: 720px) {
  .actions {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
