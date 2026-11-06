<script setup>
import { computed, ref } from 'vue'
import {
  AIRSHIP,
  AIRSHIP_STOCKS,
  COMPANIONS,
  DOCTOR,
  GARDEN,
  ORCHARD,
  PALACE_COOLDOWN,
  SERVICE_PERMITS,
  STRANGE_BARBECUE,
  TALENTS,
  TRADE_LISTING_LIMIT,
  UTOPIA_TRAININGS,
  WORLD_BOSSES,
  WORLD_BOSS_HP,
  formatMoney,
  identityRank,
  mayorForDay,
  panelBackground,
} from '../data'
import {
  activeGuild,
  arenaLeft,
  cooldownLeft,
  corridorLeft,
  game,
  guildCommissionState,
  hasServicePermit,
  isNpcDead,
  practiceLeft,
  utopiaTrainingLeft,
  utopiaTrainingLimit,
} from '../game/store'
import ModalShell from './ModalShell.vue'
import StatusHud from './StatusHud.vue'

defineEmits(['close'])

const NEED_KNIGHT = () => identityRank(game.identity) < 1

function practiceRowState(kind) {
  if ((game.talents[kind] ?? 0) >= TALENTS[kind].maxLevel) {
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

function corridorRowState() {
  const left = corridorLeft()
  if ((game.talents.corridor ?? 0) >= TALENTS.corridor.maxLevel) {
    return { label: '天赋已满级', tone: 'done', left: '剩余 0 次' }
  }
  if (game.equipment.melee || game.equipment.ranged) {
    return { label: '需卸下所有武器', tone: 'locked', left: `剩余 ${left} 次` }
  }
  if (left <= 0) {
    return { label: '今日次数已用完', tone: 'cooling', left: '剩余 0 次' }
  }
  return { label: `今日剩余 ${left} 次`, tone: 'ready', left: `剩余 ${left} 次` }
}

function arenaRowState() {
  const left = arenaLeft()
  if ((game.talents.arena ?? 0) >= TALENTS.arena.maxLevel) {
    return { label: '天赋已满级', tone: 'done', left: '剩余 0 次' }
  }
  if (game.equipment.melee || game.equipment.ranged) {
    return { label: '需卸下所有武器', tone: 'locked', left: `剩余 ${left} 次` }
  }
  if (left <= 0) {
    return { label: '今日次数已用完', tone: 'cooling', left: '剩余 0 次' }
  }
  return { label: `今日剩余 ${left} 次`, tone: 'ready', left: `剩余 ${left} 次` }
}

function mayorRowState() {
  const mayor = mayorForDay(game.day)
  const visited = Number(game.flags.mayorVisitDay) === game.day
  return visited
    ? { label: `今日已拜访 · ${mayor?.name ?? ''}`, tone: 'cooling', left: '剩余 0 次' }
    : { label: `今日可拜访 · ${mayor?.name ?? ''}`, tone: 'ready', left: '剩余 1 次' }
}

function guildRowState() {
  const guild = activeGuild()
  if (!guild) return { label: '未加入公会', tone: 'locked', left: '剩余 0 次' }
  const state = guildCommissionState(guild.id)
  if (!state) return { label: '本公会暂无委托', tone: 'done', left: '剩余 0 次' }
  if (state.claimedToday) return { label: '今日已交付', tone: 'done', left: '剩余 0 次' }
  if (state.canClaim) return { label: '委托可交付', tone: 'ready', left: '剩余 1 次' }
  return { label: '委托进行中', tone: 'cooling', left: '剩余 1 次' }
}

function permitRowState() {
  const oncePermits = SERVICE_PERMITS.filter((permit) => permit.once)
  const done = oncePermits.filter((permit) => hasServicePermit(permit.id)).length
  const left = oncePermits.length - done
  if (left <= 0) return { label: '全部办结', tone: 'done', left: '剩余 0 项' }
  return { label: `已办 ${done}/${oncePermits.length} 项证照`, tone: 'ready', left: `剩余 ${left} 项` }
}

function tradeSlotRowState() {
  const listings = Array.isArray(game.flags.tradeListings) ? game.flags.tradeListings.length : 0
  const left = Math.max(0, TRADE_LISTING_LIMIT - listings)
  return listings >= TRADE_LISTING_LIMIT
    ? { label: `摊位已满 ${listings}/${TRADE_LISTING_LIMIT}`, tone: 'cooling', left: '剩余 0 个' }
    : { label: `已上架 ${listings}/${TRADE_LISTING_LIMIT}`, tone: 'ready', left: `剩余 ${left} 个` }
}

function tradeIncomeRowState() {
  const income = Math.max(0, Number(game.flags.tradeIncome) || 0)
  return income > 0
    ? { label: `待领 ${formatMoney(income)} 末日币`, tone: 'ready', left: '剩余 1 次' }
    : { label: '暂无待领收入', tone: 'done', left: '剩余 0 次' }
}

function trainingRowState(kind) {
  if ((game.talents[kind] ?? 0) >= TALENTS[kind].maxLevel) {
    return { label: '天赋已满级', tone: 'done', left: '剩余 0 次' }
  }
  const left = utopiaTrainingLeft(kind)
  if (left <= 0) return { label: '今日次数已用完', tone: 'cooling', left: '剩余 0 次' }
  return { label: `今日剩余 ${left} 次`, tone: 'ready', left: `剩余 ${left} 次` }
}

function bossRowState(boss) {
  if (game.flags.worldBossDefeated?.[boss.id]) {
    return { label: '已击杀', tone: 'done', left: '100%' }
  }
  const saved = Number(game.flags.worldBossHp?.[boss.id])
  const hp = Number.isFinite(saved) && saved > 0 ? Math.min(WORLD_BOSS_HP, saved) : WORLD_BOSS_HP
  const ratio = hp / WORLD_BOSS_HP
  return {
    label: `剩余 ${hp} / ${WORLD_BOSS_HP}`,
    tone: hp < WORLD_BOSS_HP ? 'cooling' : 'ready',
    left: `${(ratio * 100).toFixed(1)}%`,
  }
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
      {
        name: '行尸走廊',
        cycle: '每天两次',
        customState: corridorRowState,
      },
    ],
  },
  {
    title: '末日都城',
    rows: [
      { name: '底层打工', key: 'labor', days: PALACE_COOLDOWN.daily },
      {
        name: '王宫 · 进行偷窃',
        key: 'steal',
        days: PALACE_COOLDOWN.daily,
        locked: NEED_KNIGHT,
        lockText: '需要骑士身份',
      },
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
        name: '花园 · 散步',
        key: 'garden-walk',
        days: PALACE_COOLDOWN.daily,
        locked: () => identityRank(game.identity) < GARDEN.rank,
        lockText: '需要储君身份',
      },
      {
        name: '花园 · 下午茶',
        key: 'garden-tea',
        days: PALACE_COOLDOWN.daily,
        locked: () => identityRank(game.identity) < GARDEN.rank,
        lockText: '需要储君身份',
      },
      {
        name: '花园 · 神秘药剂',
        key: 'garden-potion',
        days: 5,
        locked: () => identityRank(game.identity) < GARDEN.rank,
        lockText: '需要储君身份',
      },
      {
        name: '花园 · 神迹祈祷',
        key: 'garden-prayer',
        days: PALACE_COOLDOWN.weekly,
        locked: () => identityRank(game.identity) < GARDEN.rank,
        lockText: '需要储君身份',
      },
      {
        name: '王宫 · 斗兽擂台',
        cycle: '每天两次',
        customState: arenaRowState,
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
  {
    title: '乌托邦城',
    rows: [
      {
        name: '代理城主 · 拜访会长',
        cycle: '每天一次',
        customState: mayorRowState,
      },
      {
        name: '公会日常委托',
        cycle: '每天一次',
        customState: guildRowState,
      },
      {
        name: '办事中心 · 证照办理',
        cycle: '一次性',
        customState: permitRowState,
      },
      {
        name: '自由贸易 · 摊位',
        cycle: '随时可上架',
        customState: tradeSlotRowState,
      },
      {
        name: '自由贸易 · 待领收入',
        cycle: '隔天结算',
        customState: tradeIncomeRowState,
      },
      ...UTOPIA_TRAININGS.map((training) => ({
        name: training.name,
        cycle: () => `每天 ${utopiaTrainingLimit(training.kind)} 次`,
        customState: () => trainingRowState(training.kind),
      })),
    ],
  },
  {
    title: '世界BOSS',
    rows: WORLD_BOSSES.map((boss) => ({
      name: boss.name,
      cycle: '无冷却',
      customState: () => bossRowState(boss),
    })),
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

const statusFilter = ref('all')
const groupFilter = ref('all')

const STATUS_FILTERS = [
  { id: 'all', name: '全部' },
  { id: 'ready', name: '可进行' },
  { id: 'cooling', name: '冷却中' },
  { id: 'locked', name: '未解锁' },
  { id: 'done', name: '已完成' },
]

const allGroups = computed(() =>
  GROUPS.filter((group) => !group.visible || group.visible()).map((group) => ({
    title: group.title,
    rows: group.rows.map((row) => ({
      name: row.name,
      cycle: typeof row.cycle === 'function' ? row.cycle() : (row.cycle ?? cycleText(row.days)),
      state: rowState(row),
    })),
  })),
)

const groupOptions = computed(() => [
  { id: 'all', name: '全部区域' },
  ...allGroups.value.map((group) => ({ id: group.title, name: group.title })),
])

const statusCounts = computed(() => {
  const counts = { all: 0, ready: 0, cooling: 0, locked: 0, done: 0 }
  for (const group of allGroups.value) {
    for (const row of group.rows) {
      counts.all += 1
      if (counts[row.state.tone] !== undefined) counts[row.state.tone] += 1
    }
  }
  return counts
})

const groups = computed(() =>
  allGroups.value
    .filter((group) => groupFilter.value === 'all' || group.title === groupFilter.value)
    .map((group) => ({
      ...group,
      rows: group.rows.filter(
        (row) => statusFilter.value === 'all' || row.state.tone === statusFilter.value,
      ),
    }))
    .filter((group) => group.rows.length > 0),
)

const visibleCount = computed(() =>
  groups.value.reduce((sum, group) => sum + group.rows.length, 0),
)

const showStocks = computed(
  () =>
    statusFilter.value === 'all' &&
    (groupFilter.value === 'all' || groupFilter.value === '末日飞行船'),
)

function resetFilters() {
  statusFilter.value = 'all'
  groupFilter.value = 'all'
}

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
    :bg="panelBackground('notebook')"
    bg-tone="deep"
    @close="$emit('close')"
  >
    <template #hud>
      <StatusHud />
    </template>

    <div class="filters">
      <div class="filters__row">
        <span class="filters__label">状态</span>
        <button
          v-for="item in STATUS_FILTERS"
          :key="item.id"
          type="button"
          class="chip"
          :class="{ 'chip--active': statusFilter === item.id }"
          @click="statusFilter = item.id"
        >
          {{ item.name }}<i>{{ statusCounts[item.id] }}</i>
        </button>
      </div>
      <div class="filters__row">
        <span class="filters__label">区域</span>
        <button
          v-for="item in groupOptions"
          :key="item.id"
          type="button"
          class="chip"
          :class="{ 'chip--active': groupFilter === item.id }"
          @click="groupFilter = item.id"
        >
          {{ item.name }}
        </button>
      </div>
      <p class="filters__summary">
        <span>显示 {{ visibleCount }} / {{ statusCounts.all }} 条</span>
        <button
          v-if="statusFilter !== 'all' || groupFilter !== 'all'"
          type="button"
          class="filters__reset"
          @click="resetFilters"
        >
          清除筛选
        </button>
      </p>
    </div>

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

      <section v-if="showStocks" class="book__group">
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

      <p v-if="!groups.length && !showStocks" class="book__empty">没有符合条件的条目。</p>
    </div>

    <template #footer>
      <span>冷却按自然日结算：每 8 个回合为一天，完成后需等周期结束才能再次进行。</span>
      <span class="mode">NOTEBOOK</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px dashed var(--line);
}

.filters__row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filters__label {
  min-width: 34px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--rust-soft);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text-mute);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.chip:hover {
  color: var(--bone);
  border-color: var(--rust-soft);
}

.chip--active {
  color: var(--bone);
  border-color: var(--rust-soft);
  background: color-mix(in srgb, var(--rust) 14%, transparent);
}

.chip i {
  font-style: normal;
  font-size: 9px;
  opacity: 0.6;
}

.filters__summary {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
}

.filters__reset {
  padding: 0;
  border: 0;
  background: none;
  color: var(--rust-soft);
  font-family: inherit;
  font-size: 9.5px;
  letter-spacing: 0.08em;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.book {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 12px 14px 14px;
  border: 1px solid var(--line);
  background: rgba(8, 10, 11, 0.42);
}

.book__empty {
  margin: 0;
  padding: 18px 2px;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
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
