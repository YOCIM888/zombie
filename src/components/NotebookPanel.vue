<script setup>
import { computed } from 'vue'
import {
  AIRSHIP,
  AIRSHIP_STOCKS,
  COMPANIONS,
  DOCTOR,
  GARDEN,
  ORCHARD,
  PALACE_COOLDOWN,
  STRANGE_BARBECUE,
  identityRank,
} from '../data'
import {
  cooldownLeft,
  game,
  isNpcDead,
  practiceLeft,
} from '../game/store'
import ModalShell from './ModalShell.vue'
import StatusHud from './StatusHud.vue'

defineEmits(['close'])

const NEED_KNIGHT = () => identityRank(game.identity) < 1

function practiceRowState(kind) {
  if ((game.talents[kind] ?? 0) >= AIRSHIP.practice.maxLevel) {
    return { label: '天赋已满级', tone: 'done', left: '剩余 0 次' }
  }
  const left = practiceLeft(kind)
  if (left <= 0) {
    return { label: '今日次数已用完', tone: 'cooling', left: '剩余 0 次' }
  }
  return { label: `今日剩余 ${left} 次`, tone: 'ready', left: `剩余 ${left} 次` }
}

function treasureRowState() {
  const sold = Number(game.flags.airshipTreasureBoughtDay) === game.day
  return sold
    ? { label: '今日已售罄', tone: 'cooling', left: '剩余 0 次' }
    : { label: '今日可购买', tone: 'ready', left: '剩余 1 次' }
}

const GROUPS = [
  {
    title: '安全屋 · 伙伴',
    rows: [
      {
        name: '嫣然的收获',
        key: COMPANIONS.yanran.harvestKey,
        days: COMPANIONS.yanran.cooldownDays,
        locked: () => !game.flags.yanranRescued,
        lockText: '嫣然尚未加入',
      },
      {
        name: '露露的罐头',
        key: COMPANIONS.lulu.harvestKey,
        days: COMPANIONS.lulu.cooldownDays,
        locked: () => !game.flags.luluRescued,
        lockText: '露露尚未获救',
      },
    ],
  },
  {
    title: '曙光阵地',
    rows: [
      { name: '领取救济', key: 'dawn-relief', days: PALACE_COOLDOWN.daily },
      {
        name: '苏涵 · 每日配餐',
        key: 'dawn-meal',
        days: PALACE_COOLDOWN.daily,
        locked: () => isNpcDead('nutritionist'),
        lockText: '苏涵已经不在了',
      },
      {
        name: '莉莉 · 药剂调配',
        key: 'dawn-brew',
        days: PALACE_COOLDOWN.daily,
        locked: () => isNpcDead('mechanic'),
        lockText: '莉莉已经不在了',
      },
      {
        name: '薇尔 · 雇佣兵训练',
        key: 'dawn-training',
        days: PALACE_COOLDOWN.daily,
        locked: () => isNpcDead('mercenary'),
        lockText: '薇尔已经不在了',
      },
      {
        name: '苗苗 · 照看实验田',
        key: 'field-tend',
        days: PALACE_COOLDOWN.daily,
        locked: () => isNpcDead('agronomist'),
        lockText: '苗苗已经不在了',
      },
    ],
  },
  {
    title: '末日都城',
    rows: [
      { name: '底层打工', key: 'labor', days: PALACE_COOLDOWN.daily },
      {
        name: '王宫舞会',
        key: 'dance',
        days: PALACE_COOLDOWN.daily,
        locked: NEED_KNIGHT,
        lockText: '需要骑士身份',
      },
      {
        name: '王宫宴会',
        key: 'banquet',
        days: PALACE_COOLDOWN.daily,
        locked: NEED_KNIGHT,
        lockText: '需要骑士身份',
      },
      {
        name: '王宫客房',
        key: 'room',
        days: PALACE_COOLDOWN.daily,
        locked: NEED_KNIGHT,
        lockText: '需要骑士身份',
      },
      {
        name: '王宫治疗',
        key: 'treatment',
        days: PALACE_COOLDOWN.daily,
        locked: NEED_KNIGHT,
        lockText: '需要骑士身份',
      },
      {
        name: '领取俸禄',
        key: 'salary',
        days: PALACE_COOLDOWN.daily,
        locked: NEED_KNIGHT,
        lockText: '需要骑士身份',
      },
      {
        name: '宫廷会议',
        key: 'council',
        days: PALACE_COOLDOWN.weekly,
        locked: NEED_KNIGHT,
        lockText: '需要骑士身份',
      },
      {
        name: '御花园',
        key: 'garden',
        days: PALACE_COOLDOWN.weekly,
        locked: () => identityRank(game.identity) < GARDEN.rank,
        lockText: '需要储君身份',
      },
    ],
  },
  {
    title: '野外地图',
    rows: [
      { name: '废弃村庄 · 果园采摘', key: ORCHARD.cooldownKey, days: ORCHARD.cooldownDays },
      {
        name: '露营山区 · 奇怪烧烤',
        key: STRANGE_BARBECUE.cooldownKey,
        days: STRANGE_BARBECUE.cooldownDays,
      },
      {
        name: 'X研究所 · 能源井',
        key: DOCTOR.energyCooldownKey,
        days: DOCTOR.energyCooldownDays,
        locked: () => !(game.flags.doctorTradeDone && game.flags.doctorQuest1Done),
        lockText: '尚未接通能源井',
        done: () => Boolean(game.flags.doctorQuest2Done),
      },
    ],
  },
  {
    title: '末日飞行船',
    rows: [
      {
        name: '招待会所',
        key: AIRSHIP.hall.cooldownKey,
        days: AIRSHIP.hall.cooldownDays,
        locked: () => identityRank(game.identity) < AIRSHIP.hall.rank,
        lockText: '需要伯爵身份',
      },
      {
        name: '高台演讲',
        key: AIRSHIP.speech.cooldownKey,
        days: AIRSHIP.speech.cooldownDays,
      },
      {
        name: '木桩练习',
        cycle: '每天两次',
        customState: () => practiceRowState('melee'),
      },
      {
        name: '打靶练习',
        cycle: '每天两次',
        customState: () => practiceRowState('ranged'),
      },
      {
        name: '居民委托 · 战斗',
        key: AIRSHIP.commission.battle.cooldownKey,
        days: AIRSHIP.commission.battle.cooldownDays,
      },
      {
        name: '居民委托 · 派对',
        key: AIRSHIP.commission.party.cooldownKey,
        days: AIRSHIP.commission.party.cooldownDays,
      },
      {
        name: '居民委托 · 杂物',
        key: AIRSHIP.commission.chore.cooldownKey,
        days: AIRSHIP.commission.chore.cooldownDays,
      },
      {
        name: '珍宝商店',
        cycle: '每天一件',
        customState: treasureRowState,
      },
    ],
  },
]

function cycleText(days) {
  return days <= 1 ? '每天一次' : `${days} 天一次`
}

function rowState(row) {
  if (row.customState) return row.customState()
  if (row.done?.()) return { label: '已完成', tone: 'done', left: '剩余 0 次' }
  if (row.locked?.()) return { label: row.lockText ?? '未解锁', tone: 'locked', left: '剩余 0 次' }
  const left = cooldownLeft(row.key, row.days)
  if (left > 0) return { label: `冷却中 · 还剩 ${left} 天`, tone: 'cooling', left: '剩余 0 次' }
  return {
    label: row.days <= 1 ? '今日可进行' : '现在可进行',
    tone: 'ready',
    left: '剩余 1 次',
  }
}

const groups = computed(() =>
  GROUPS.filter((group) => !group.visible || group.visible()).map((group) => ({
    title: group.title,
    rows: group.rows.map((row) => ({
      name: row.name,
      cycle: row.cycle ?? cycleText(row.days),
      state: rowState(row),
    })),
  })),
)

const stockChanges = computed(() => {
  const market = game.market
  return AIRSHIP_STOCKS.map((stock) => {
    const price = market?.prices?.[stock.id] ?? stock.basePrice
    const prev = market?.prev?.[stock.id] ?? price
    const change = prev > 0 ? ((price - prev) / prev) * 100 : 0
    return {
      id: stock.id,
      name: stock.name,
      text: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
      tone: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
    }
  })
})
</script>

<template>
  <ModalShell
    title="备忘录"
    :sub="`第 ${game.day} 天 · 冷却、剩余次数与飞行船行情`"
    wide
    @close="$emit('close')"
  >
    <template #hud>
      <StatusHud />
    </template>

    <div class="book">
      <section v-for="group in groups" :key="group.title" class="book__group">
        <h3 class="book__title">{{ group.title }}</h3>
        <div class="book__rows">
          <article v-for="row in group.rows" :key="row.name" class="entry">
            <div class="entry__main">
              <span class="entry__name">{{ row.name }}</span>
              <span class="entry__cycle">{{ row.cycle }}</span>
            </div>
            <span class="entry__left">{{ row.state.left }}</span>
            <span class="entry__state" :class="`entry__state--${row.state.tone}`">
              {{ row.state.label }}
            </span>
          </article>
        </div>
      </section>

      <section class="book__group">
        <h3 class="book__title">末日飞行船 · 投资行情</h3>
        <div class="book__rows">
          <article v-for="stock in stockChanges" :key="stock.id" class="entry">
            <div class="entry__main">
              <span class="entry__name">{{ stock.name }}</span>
            </div>
            <span class="entry__state" :class="`entry__state--${stock.tone}`">
              当日 {{ stock.text }}
            </span>
          </article>
        </div>
      </section>
    </div>

    <template #footer>
      <span>冷却按自然日结算：每 8 个回合为一天，完成后需等周期结束才能再次进行。</span>
      <span class="mode">NOTEBOOK</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.book {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 4px;
}

.book__title {
  margin: 0 0 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--rust-soft);
}

.book__rows {
  border-top: 1px dashed var(--line);
}

.entry {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 2px;
  border-bottom: 1px dashed var(--line);
}

.entry__main {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.entry__name {
  font-size: 13px;
  letter-spacing: 0.06em;
  color: var(--text);
}

.entry__cycle {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
  opacity: 0.8;
}

.entry__left {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
  white-space: nowrap;
}

.entry__state {
  min-width: 128px;
  text-align: right;
  font-size: 11px;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.entry__state--ready {
  color: var(--bone);
}

.entry__state--cooling {
  color: var(--rust-soft);
}

.entry__state--locked,
.entry__state--done {
  color: var(--text-mute);
}

.entry__state--up {
  color: var(--sick);
}

.entry__state--down {
  color: var(--rust-soft);
}

.entry__state--flat {
  color: var(--text-mute);
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}
</style>
