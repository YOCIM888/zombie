<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  AIRSHIP,
  AIRSHIP_MAP,
  AIRSHIP_SHOP_GOODS,
  AIRSHIP_SHOPS,
  AIRSHIP_STOCKS,
  HELICOPTER,
  formatMoney,
  roundToCents,
  stockProfitRounded,
  stockTradeFee,
  TALENTS,
  QUEST_OWNERS,
  commissionForDay,
  countItem,
  identityRank,
  npcById,
  questLine,
  talentBonus,
  talentTitle,
  treasureForDay,
  getItem,
  zombieById,
} from '../data'
import {
  airshipBanquet,
  airshipChoreCommission,
  airshipGasolinePrice,
  airshipPartyCommission,
  airshipSpeech,
  buyAirshipGasoline,
  buyAirshipStock,
  buyAirshipTreasure,
  buyFlightGood,
  cooldownLeft,
  currentPhase,
  game,
  notify,
  practiceLeft,
  practiceMeleeDummy,
  practiceRangedTarget,
  questStatus,
  sellAirshipStock,
  submitAirshipGasoline,
  syncStockMarket,
} from '../game/store'
import {
  battle,
  continueAirshipCoup,
  resetBattle,
  startAirshipCargoBattle,
  startAirshipCommissionBattle,
  startAirshipCoupBattle,
} from '../game/battle'
import BattleView from './BattleView.vue'
import ModalShell from './ModalShell.vue'
import NpcIntro from './NpcIntro.vue'
import QuestLinePanel from './QuestLinePanel.vue'
import StatusHud from './StatusHud.vue'

const emit = defineEmits(['close'])
const view = ref('menu')
const feed = ref('')
const sellQty = ref(1)
const buyQty = ref(1)
const stockId = ref(AIRSHIP_STOCKS[0].id)
const stockBuyQty = ref(1)
const stockSellQty = ref(1)

const map = AIRSHIP_MAP
const shopIds = ['bar', 'restaurant', 'medical', 'melee', 'guns']
const nobleIds = ['moran', 'schika', 'nubi']

const hallLeft = computed(() => cooldownLeft(AIRSHIP.hall.cooldownKey, AIRSHIP.hall.cooldownDays))
const speechLeft = computed(() =>
  cooldownLeft(AIRSHIP.speech.cooldownKey, AIRSHIP.speech.cooldownDays),
)
const currentRank = computed(() => identityRank(game.identity))
const canEnterHall = computed(() => currentRank.value >= AIRSHIP.hall.rank)
const canCoup = computed(
  () =>
    currentRank.value >= AIRSHIP.coup.rank &&
    game.reputation >= AIRSHIP.coup.reputation &&
    !battle.active,
)
const coupDone = computed(() => Boolean(game.flags.airshipCoupDone))
const coupStep = computed(() => Number(game.flags.airshipCoupStep) || 0)
const coupPending = computed(
  () =>
    !coupDone.value &&
    coupStep.value > 0 &&
    coupStep.value < AIRSHIP.coup.enemyIds.length,
)
const coupOpponents = computed(() =>
  AIRSHIP.coup.enemyIds.map((id, index) => {
    let state = '待战'
    if (coupDone.value) state = '已击败'
    else if (index < coupStep.value) state = '已击败'
    else if (index === coupStep.value && coupStep.value > 0) state = '下一位'
    return { id, name: npcById(id)?.name ?? id, state }
  }),
)

function practiceInfo(kind) {
  const talent = TALENTS[kind]
  const level = game.talents[kind]
  const full = level >= TALENTS[kind].maxLevel
  const progress = full ? 100 : Math.max(0, Math.min(99, Number(game.training[kind]) || 0))
  return {
    level,
    full,
    title: talentTitle(kind, level) || '暂无天赋',
    stat: talent.stat,
    bonus: level ? `+${Math.round(talentBonus(kind, level) * 100)}%` : '—',
    progress,
    left: practiceLeft(kind),
  }
}

const meleeTalent = computed(() => practiceInfo('melee'))
const rangedTalent = computed(() => practiceInfo('ranged'))

const meleeWeapon = computed(() => {
  const equipped = game.equipment.melee
  if (!equipped) return null
  const def = getItem(equipped.id)
  const max = def?.weapon?.durability
  const current = Number.isFinite(equipped.durability) ? equipped.durability : max
  return {
    name: def?.name ?? '近战武器',
    current: Number.isFinite(current) ? current : '—',
    max: Number.isFinite(max) ? max : '—',
  }
})

const rangedWeapon = computed(() => {
  const equipped = game.equipment.ranged
  if (!equipped) return null
  const def = getItem(equipped.id)
  const current = Number.isFinite(equipped.cleanliness) ? equipped.cleanliness : 100
  return { name: def?.name ?? '远程武器', current }
})

const canPracticeMelee = computed(
  () =>
    !game.dead &&
    !meleeTalent.value.full &&
    meleeTalent.value.left > 0 &&
    Boolean(meleeWeapon.value) &&
    Number.isFinite(meleeWeapon.value.current) &&
    meleeWeapon.value.current >= AIRSHIP.practice.cost,
)

const canPracticeRanged = computed(
  () =>
    !game.dead &&
    !rangedTalent.value.full &&
    rangedTalent.value.left > 0 &&
    Boolean(rangedWeapon.value) &&
    rangedWeapon.value.current >= AIRSHIP.practice.cost,
)

const shopKey = computed(() => (shopIds.includes(view.value) ? view.value : ''))
const shopInfo = computed(() => AIRSHIP_SHOPS[shopKey.value] ?? null)
const shopGoods = computed(() => AIRSHIP_SHOP_GOODS[shopKey.value] ?? [])

const treasure = computed(() => treasureForDay(game.day))
const treasureSold = computed(() => Number(game.flags.airshipTreasureBoughtDay) === game.day)

const commission = computed(() => commissionForDay(game.day))
const wineDef = computed(() => getItem(commission.value.wineId))
const wineCount = computed(() => countItem(game.inventory, commission.value.wineId))
const battleLeft = computed(() =>
  cooldownLeft(AIRSHIP.commission.battle.cooldownKey, AIRSHIP.commission.battle.cooldownDays),
)
const partyLeft = computed(() =>
  cooldownLeft(AIRSHIP.commission.party.cooldownKey, AIRSHIP.commission.party.cooldownDays),
)
const choreLeft = computed(() =>
  cooldownLeft(AIRSHIP.commission.chore.cooldownKey, AIRSHIP.commission.chore.cooldownDays),
)

const gasolineCount = computed(() => countItem(game.inventory, HELICOPTER.gasolineId))
const oilPrice = computed(() => airshipGasolinePrice())
const sellCount = computed(() => Math.max(0, Math.floor(Number(sellQty.value) || 0)))
const buyCount = computed(() => Math.max(0, Math.floor(Number(buyQty.value) || 0)))
const sellTotal = computed(() => sellCount.value * AIRSHIP.oil.sellRate)
const buyTotal = computed(() => buyCount.value * oilPrice.value)

const stockRows = computed(() => {
  const market = game.market
  return AIRSHIP_STOCKS.map((stock) => {
    const price = market?.prices?.[stock.id] ?? stock.basePrice
    const prev = market?.prev?.[stock.id] ?? price
    const change = prev > 0 ? ((price - prev) / prev) * 100 : 0
    const holding = market?.holdings?.[stock.id] ?? { shares: 0, cost: 0 }
    return { ...stock, price, prev, change, holding }
  })
})
const selectedStock = computed(
  () => stockRows.value.find((stock) => stock.id === stockId.value) ?? stockRows.value[0],
)
const selectedHolding = computed(() => selectedStock.value?.holding ?? { shares: 0, cost: 0 })
const stockBuyCount = computed(() => Math.max(0, Math.floor(Number(stockBuyQty.value) || 0)))
const stockSellCount = computed(() => Math.max(0, Math.floor(Number(stockSellQty.value) || 0)))
const stockBuyGross = computed(() =>
  roundToCents(stockBuyCount.value * (selectedStock.value?.price ?? 0)),
)
const stockSellGross = computed(() =>
  roundToCents(stockSellCount.value * (selectedStock.value?.price ?? 0)),
)
const stockBuyFee = computed(() =>
  stockBuyCount.value > 0 ? stockTradeFee(stockBuyGross.value) : 0,
)
const stockSellFee = computed(() =>
  stockSellCount.value > 0 ? stockTradeFee(stockSellGross.value) : 0,
)
const stockBuyTotal = computed(() => roundToCents(stockBuyGross.value + stockBuyFee.value))
const stockSellNet = computed(() => roundToCents(stockSellGross.value - stockSellFee.value))
const stockMarketValue = computed(() =>
  roundToCents((selectedStock.value?.price ?? 0) * selectedHolding.value.shares),
)
const stockAvgCostText = computed(() =>
  selectedHolding.value.shares > 0
    ? formatMoney(selectedHolding.value.cost / selectedHolding.value.shares)
    : '—',
)
const stockUnrealized = computed(() =>
  stockProfitRounded(stockMarketValue.value - selectedHolding.value.cost),
)
const stockRealized = computed(() => stockProfitRounded(game.market?.realized ?? 0))
const stockPortfolioValue = computed(() =>
  stockRows.value.reduce((sum, stock) => sum + stock.price * stock.holding.shares, 0),
)

const activeBattle = computed(
  () =>
    (battle.active || battle.finished) &&
    ['airship-coup', 'airship-commission', 'airship-cargo'].includes(battle.kind),
)

const activeNoble = computed(() => (nobleIds.includes(view.value) ? view.value : ''))
const nobleInfo = computed(() =>
  activeNoble.value ? AIRSHIP.nobles[activeNoble.value] : null,
)
const nobleIntro = computed(() =>
  activeNoble.value ? QUEST_OWNERS[activeNoble.value]?.intro ?? '' : '',
)
const nobleTotal = computed(() =>
  activeNoble.value ? questLine(activeNoble.value).length : 0,
)
const nobleDone = computed(() =>
  activeNoble.value
    ? questLine(activeNoble.value).filter((quest) => questStatus(quest.id) === 'done').length
    : 0,
)
const cargoQuestActive = computed(
  () => questStatus('nubi-2') === 'active' && !game.flags.airshipCargoCleared,
)
const cargoEnemy = computed(() => zombieById('armored'))

onMounted(() => {
  if (
    battle.finished &&
    !['airship-coup', 'airship-commission', 'airship-cargo'].includes(battle.kind)
  ) {
    resetBattle()
  }
  syncStockMarket()
})

function run(action) {
  const line = action()
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (line) feed.value = line
}

function menuTag(item) {
  if (item.disabled) return '占位'
  if (coupDone.value && nobleIds.includes(item.id)) return '已臣服'
  return '可用'
}

function openMenuItem(item) {
  if (item.disabled) return
  if (item.id === 'hall') {
    view.value = 'hall'
  } else if (item.id === 'platform') {
    view.value = 'platform'
  } else if (item.id === 'dummy') {
    view.value = 'dummy'
  } else if (item.id === 'range') {
    view.value = 'range'
  } else if (shopIds.includes(item.id) || item.id === 'treasure') {
    view.value = item.id
  } else if (item.id === 'commission' || item.id === 'oil' || item.id === 'investment') {
    if (item.id === 'investment') syncStockMarket()
    view.value = item.id
  } else if (nobleIds.includes(item.id)) {
    view.value = item.id
  }
}

function backToMenu() {
  view.value = 'menu'
}

function buyGood(good) {
  feed.value = buyFlightGood(shopKey.value, good.id)
}

function buyTreasure() {
  feed.value = buyAirshipTreasure()
}

function submitGas() {
  feed.value = submitAirshipGasoline(sellQty.value)
}

function buyGas() {
  feed.value = buyAirshipGasoline(buyQty.value)
}

function profitText(value) {
  const amount = stockProfitRounded(value)
  return amount > 0 ? `+${formatMoney(amount)}` : formatMoney(amount)
}

function changeText(value) {
  return `${value > 0 ? '+' : ''}${Number(value).toFixed(1)}%`
}

function selectStock(id) {
  stockId.value = id
  stockBuyQty.value = 1
  stockSellQty.value = 1
}

function buyStockNow() {
  feed.value = buyAirshipStock(stockId.value, stockBuyQty.value)
}

function sellStockNow() {
  feed.value = sellAirshipStock(stockId.value, stockSellQty.value)
}

function startCoup() {
  if (battle.active)return
  const line = startAirshipCoupBattle()
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (line) feed.value = line
}

function resumeCoup() {
  if (!continueAirshipCoup()) return
  view.value = 'platform'
}

function battleDone() {
  if (battle.kind === 'airship-cargo') {
    const summary = battle.summary
    resetBattle()
    view.value = 'nubi'
    feed.value = summary || AIRSHIP.cargo.clearedLine
    return
  }

  if (battle.kind === 'airship-commission') {
    const summary = battle.summary
    resetBattle()
    view.value = 'commission'
    feed.value = summary || '委托结束了。'
    return
  }

  const next = battle.coupNext
  const summary = battle.summary
  if (next && continueAirshipCoup()) {
    feed.value = summary || '下一位对手已经站了上来。'
    return
  }
  resetBattle()
  feed.value = summary || (game.flags.airshipCoupDone ? AIRSHIP.coup.doneLine : '')
}

function closePanel() {
  if (battle.active) {
    notify('战斗中无法离开：先逃跑，或者把它打倒')
    return
  }
  if (battle.finished) resetBattle()
  emit('close')
}
</script>

<template>
  <ModalShell
    :title="map.name"
    :sub="`${map.level} · ${map.difficulty} · 第 ${game.day} 天 · ${currentPhase}`"
    wide
    @close="closePanel"
  >
    <template #hud>
      <StatusHud />
    </template>

    <section v-if="activeBattle" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">
          {{
            battle.kind === 'airship-coup'
              ? '高台政变'
              : battle.kind === 'airship-cargo'
                ? '货舱异响'
                : '居民委托'
          }}
        </h3>
        <span v-if="battle.kind === 'airship-coup'" class="tag">
          第 {{ battle.coupStage + 1 }} / {{ AIRSHIP.coup.enemyIds.length }} 场
        </span>
      </header>
      <BattleView @done="battleDone" />
    </section>

    <section v-else class="pane">
      <p class="pane__desc">{{ map.desc }} {{ AIRSHIP.intro }}</p>

      <div v-if="view !== 'menu'" class="bar">
        <button type="button" class="btn back" @click="backToMenu">← 返回甲板</button>
      </div>

      <div v-if="view === 'menu'" class="extras">
        <button
          v-for="item in AIRSHIP.menu"
          :key="item.id"
          type="button"
          class="extra menu-item"
          :class="{ 'menu-item--locked': item.disabled }"
          :disabled="item.disabled"
          @click="openMenuItem(item)"
        >
          <span class="menu-item__head">
            <span class="extra__title">{{ item.name }}</span>
            <span class="extra__tag">{{ menuTag(item) }}</span>
          </span>
          <span class="menu-item__note">{{ item.note }}</span>
        </button>
      </div>

      <div v-else-if="activeNoble" class="extras">
        <article class="extra extra--wide">
          <header class="extra__head">
            <h4 class="extra__title">{{ nobleInfo.name }}</h4>
            <span class="extra__tag">
              {{ coupDone ? '已臣服' : `任务 ${nobleDone} / ${nobleTotal}` }}
            </span>
          </header>
          <NpcIntro :npc-id="activeNoble">
            <p class="extra__desc">{{ coupDone ? nobleInfo.afterCoup : nobleIntro }}</p>
          </NpcIntro>
          <div class="chips">
            <span>任务线 · {{ nobleInfo.line }}</span>
            <span>奖励：声望 / 末日币 / 稀有装备</span>
            <span v-if="activeNoble === 'schika' && currentRank < 1">需要骑士身份</span>
            <span v-if="activeNoble === 'moran' && currentRank < 4">需要伯爵身份</span>
          </div>

          <div
            v-if="!coupDone && activeNoble === 'nubi' && cargoQuestActive"
            class="cargo"
          >
            <header class="extra__head">
              <h5 class="extra__title">{{ AIRSHIP.cargo.title }}</h5>
              <span class="extra__tag">任务二 · 进行中</span>
            </header>
            <p class="extra__desc">{{ AIRSHIP.cargo.intro }}</p>
            <div class="chips">
              <span>{{ AIRSHIP.cargo.enemyName }}</span>
              <span v-if="cargoEnemy">生命 {{ cargoEnemy.hp }} · 攻击 {{ cargoEnemy.attack }}</span>
              <span>消耗 1 回合</span>
              <span>击败后回来提交任务</span>
            </div>
            <button
              type="button"
              class="btn btn--primary extra__action"
              :disabled="game.dead || battle.active"
              @click="run(startAirshipCargoBattle)"
            >
              下到货舱 · 迎战
            </button>
          </div>

          <QuestLinePanel
            v-if="!coupDone"
            :owner="activeNoble"
            @feedback="feed = $event"
          />
        </article>
      </div>

      <div v-else-if="view === 'hall'" class="extras">
        <article class="extra extra--wide">
          <header class="extra__head">
            <h4 class="extra__title">招待会所</h4>
            <span class="extra__tag">
              {{ hallLeft > 0 ? `冷却 ${hallLeft} 天` : canEnterHall ? '可入席' : '爵位不足' }}
            </span>
          </header>
          <p class="extra__desc">{{ AIRSHIP.hall.desc }}</p>
          <div class="chips">
            <span>至少 {{ AIRSHIP.hall.rankName }}爵位</span>
            <span>每天一次</span>
            <span>跳过 {{ AIRSHIP.hall.turns }} 回合</span>
            <span>无衰减</span>
            <span v-for="(value, key) in AIRSHIP.hall.effects" :key="key">
              {{ key === 'hp' ? '生命' : key === 'stamina' ? '体力' : key === 'sanity' ? '理智' : key === 'hunger' ? '饱食' : '口渴' }}
              +{{ value }}
            </span>
          </div>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="game.dead || !canEnterHall || hallLeft > 0"
            @click="run(airshipBanquet)"
          >
            {{
              !canEnterHall
                ? `至少需要${AIRSHIP.hall.rankName}爵位`
                : hallLeft > 0
                  ? `还要等 ${hallLeft} 天`
                  : `入席 · 跳过 ${AIRSHIP.hall.turns} 回合`
            }}
          </button>
        </article>
      </div>

      <div v-else-if="view === 'platform'" class="extras">
        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">演讲</h4>
            <span class="extra__tag">{{ speechLeft > 0 ? '今日已演讲' : '每天一次' }}</span>
          </header>
          <p class="extra__desc">{{ AIRSHIP.speech.desc }}</p>
          <div class="chips">
            <span>消耗 {{ AIRSHIP.speech.turns }} 回合</span>
            <span>回合正常衰减</span>
            <span>声望 +{{ AIRSHIP.speech.reputation }}</span>
            <span>当前声望 {{ game.reputation }}</span>
          </div>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="game.dead || speechLeft > 0"
            @click="run(airshipSpeech)"
          >
            {{ speechLeft > 0 ? `还要等 ${speechLeft} 天` : '登台演讲 · 2 回合' }}
          </button>
        </article>

        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">政变</h4>
            <span class="extra__tag">
              {{ coupDone ? '已夺船' : coupStep > 0 ? `已击败 ${coupStep} 位` : '未开始' }}
            </span>
          </header>
          <p class="extra__desc">{{ AIRSHIP.coup.desc }}</p>
          <div class="chips">
            <span>至少{{ AIRSHIP.coup.rankName }}爵位</span>
            <span>声望 {{ game.reputation }} / {{ AIRSHIP.coup.reputation }}</span>
            <span>连续 {{ AIRSHIP.coup.enemyIds.length }} 场 · 中途不回复</span>
          </div>
          <div class="chips">
            <span v-for="enemy in coupOpponents" :key="enemy.id">
              {{ enemy.name }} · {{ enemy.state }}
            </span>
          </div>
          <button
            v-if="!coupDone && coupPending && !battle.active"
            type="button"
            class="btn btn--primary extra__action"
            @click="resumeCoup"
          >
            继续政变 · 迎战 {{ coupOpponents[coupStep]?.name }}
          </button>
          <button
            v-else
            type="button"
            class="btn btn--primary extra__action"
            :disabled="game.dead || coupDone || !canCoup"
            @click="startCoup"
          >
            {{
              coupDone
                ? '政变已经结束'
                : currentRank < AIRSHIP.coup.rank
                  ? `至少需要${AIRSHIP.coup.rankName}爵位`
                  : game.reputation < AIRSHIP.coup.reputation
                    ? `声望还差 ${AIRSHIP.coup.reputation - game.reputation}`
                    : '发动政变 · 1 回合'
            }}
          </button>
        </article>
      </div>

      <div v-else-if="view === 'dummy'" class="extras">
        <article class="extra extra--wide">
          <header class="extra__head">
            <h4 class="extra__title">木桩练习</h4>
            <span class="extra__tag">{{ meleeTalent.full ? '已满级' : `今日剩余 ${meleeTalent.left} 次` }}</span>
          </header>
          <p class="extra__desc">{{ AIRSHIP.practice.melee.desc }}</p>
          <div class="talent">
            <div class="talent__head">
              <span class="talent__title">
                {{ meleeTalent.title }}
                <em>Lv.{{ meleeTalent.level }}</em>
              </span>
              <span class="talent__bonus">{{ meleeTalent.stat }} {{ meleeTalent.bonus }}</span>
            </div>
            <div class="track">
              <div class="track__fill" :style="{ width: meleeTalent.progress + '%' }" />
            </div>
            <span class="talent__progress">
              {{ meleeTalent.full ? '熟练度已满' : `熟练度 ${meleeTalent.progress} / 100` }}
            </span>
          </div>
          <div class="chips">
            <span>消耗 {{ AIRSHIP.practice.turns }} 回合</span>
            <span>耐久 -{{ AIRSHIP.practice.cost }}</span>
            <span>熟练度 +{{ AIRSHIP.practice.progressMin }}-{{ AIRSHIP.practice.progressMax }}</span>
            <span>每天 {{ AIRSHIP.practice.dailyLimit }} 次</span>
            <span v-if="meleeWeapon">
              {{ meleeWeapon.name }} · 耐久 {{ meleeWeapon.current }} / {{ meleeWeapon.max }}
            </span>
            <span v-else>未装备近战武器</span>
          </div>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="!canPracticeMelee"
            @click="run(practiceMeleeDummy)"
          >
            {{
              meleeTalent.full
                ? '近战天赋已满级'
                : !meleeWeapon
                  ? '请先装备近战武器'
                  : meleeTalent.left <= 0
                    ? '今日次数已用完'
                    : Number(meleeWeapon.current) < AIRSHIP.practice.cost
                      ? '耐久不足 10'
                      : '打桩 · 1 回合'
            }}
          </button>
        </article>
      </div>

      <div v-else-if="view === 'range'" class="extras">
        <article class="extra extra--wide">
          <header class="extra__head">
            <h4 class="extra__title">打靶练习</h4>
            <span class="extra__tag">{{ rangedTalent.full ? '已满级' : `今日剩余 ${rangedTalent.left} 次` }}</span>
          </header>
          <p class="extra__desc">{{ AIRSHIP.practice.ranged.desc }}</p>
          <div class="talent">
            <div class="talent__head">
              <span class="talent__title">
                {{ rangedTalent.title }}
                <em>Lv.{{ rangedTalent.level }}</em>
              </span>
              <span class="talent__bonus">{{ rangedTalent.stat }} {{ rangedTalent.bonus }}</span>
            </div>
            <div class="track">
              <div class="track__fill" :style="{ width: rangedTalent.progress + '%' }" />
            </div>
            <span class="talent__progress">
              {{ rangedTalent.full ? '熟练度已满' : `熟练度 ${rangedTalent.progress} / 100` }}
            </span>
          </div>
          <div class="chips">
            <span>消耗 {{ AIRSHIP.practice.turns }} 回合</span>
            <span>清洁度 -{{ AIRSHIP.practice.cost }}</span>
            <span>熟练度 +{{ AIRSHIP.practice.progressMin }}-{{ AIRSHIP.practice.progressMax }}</span>
            <span>每天 {{ AIRSHIP.practice.dailyLimit }} 次</span>
            <span v-if="rangedWeapon">
              {{ rangedWeapon.name }} · 清洁度 {{ rangedWeapon.current }} / 100
            </span>
            <span v-else>未装备远程武器</span>
          </div>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="!canPracticeRanged"
            @click="run(practiceRangedTarget)"
          >
            {{
              rangedTalent.full
                ? '远程天赋已满级'
                : !rangedWeapon
                  ? '请先装备远程武器'
                  : rangedTalent.left <= 0
                    ? '今日次数已用完'
                    : rangedWeapon.current < AIRSHIP.practice.cost
                      ? '清洁度不足 10'
                      : '打靶 · 1 回合'
            }}
          </button>
        </article>
      </div>

      <div v-else-if="view === 'commission'" class="extras">
        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">战斗委托</h4>
            <span class="extra__tag">{{ battleLeft > 0 ? '今日已接取' : '每日一次' }}</span>
          </header>
          <p class="extra__desc">{{ AIRSHIP.commission.battle.desc }}</p>
          <div class="chips">
            <span>今日目标：{{ commission.zombie.name }}</span>
            <span>生命 {{ commission.zombie.hp }}</span>
            <span>攻击 {{ commission.zombie.attack }}</span>
            <span>消耗 1 回合 · 无衰减</span>
            <span>声望 +{{ AIRSHIP.commission.battle.reputation }}</span>
          </div>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="game.dead || battleLeft > 0 || battle.active"
            @click="run(startAirshipCommissionBattle)"
          >
            {{ battleLeft > 0 ? '今日已接取' : '接受战斗委托 · 1 回合' }}
          </button>
        </article>

        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">派对委托</h4>
            <span class="extra__tag">{{ partyLeft > 0 ? '今日已完成' : '每日一次' }}</span>
          </header>
          <p class="extra__desc">{{ AIRSHIP.commission.party.desc }}</p>
          <div class="chips">
            <span>今日需要：{{ wineDef?.name ?? '酒' }} ×1</span>
            <span>背包持有 {{ wineCount }}</span>
            <span>消耗 1 回合 · 无衰减</span>
            <span>声望 +{{ AIRSHIP.commission.party.reputation }}</span>
          </div>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="game.dead || partyLeft > 0 || wineCount < 1"
            @click="run(airshipPartyCommission)"
          >
            {{
              partyLeft > 0
                ? `还要等 ${partyLeft} 天`
                : wineCount < 1
                  ? `缺少 ${wineDef?.name ?? '酒'}`
                  : `上交 ${wineDef?.name ?? '酒'} · 声望 +1`
            }}
          </button>
        </article>

        <article class="extra extra--wide">
          <header class="extra__head">
            <h4 class="extra__title">杂物委托</h4>
            <span class="extra__tag">{{ choreLeft > 0 ? '今日已完成' : '每日一次' }}</span>
          </header>
          <p class="extra__desc">{{ AIRSHIP.commission.chore.desc }}</p>
          <div class="chips">
            <span>今日体力消耗 -{{ commission.stamina }}</span>
            <span>消耗 1 回合 · 无衰减</span>
            <span>声望 +{{ AIRSHIP.commission.chore.reputation }}</span>
          </div>
          <p class="extra__warn">{{ AIRSHIP.commission.chore.warningLine }}</p>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="game.dead || choreLeft > 0"
            @click="run(airshipChoreCommission)"
          >
            {{
              choreLeft > 0
                ? `还要等 ${choreLeft} 天`
                : `干杂活 · 体力 -${commission.stamina}`
            }}
          </button>
        </article>
      </div>

      <div v-else-if="view === 'oil'" class="extras">
        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">提交汽油</h4>
            <span class="extra__tag">1 桶 = 1 末日币</span>
          </header>
          <p class="extra__desc">{{ AIRSHIP.oil.desc }}</p>
          <div class="chips">
            <span>持有汽油 {{ gasolineCount }} 桶</span>
            <span>末日币 {{ formatMoney(game.coins) }}</span>
          </div>
          <div class="deal">
            <span class="deal__label">提交数量</span>
            <input
              id="gas-sell-qty"
              v-model.number="sellQty"
              class="deal__input"
              type="number"
              min="1"
              step="1"
              :max="gasolineCount"
            />
            <span class="deal__hint">可获得 {{ sellTotal }} 末日币</span>
          </div>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="game.dead || sellCount <= 0 || sellCount > gasolineCount"
            @click="submitGas"
          >
            提交 {{ sellCount }} 桶 · +{{ sellTotal }} 末日币
          </button>
        </article>

        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">购买汽油</h4>
            <span class="extra__tag">今日单价 {{ oilPrice }} 末日币</span>
          </header>
          <p class="extra__desc">
            价格每天浮动。铁皮桶按桶卖，不赊账，也不讲价。
          </p>
          <div class="chips">
            <span>末日币 {{ formatMoney(game.coins) }}</span>
            <span>单价 {{ oilPrice }} 末日币 / 桶</span>
            <span>每日价格刷新</span>
          </div>
          <div class="deal">
            <span class="deal__label">购买数量</span>
            <input
              id="gas-buy-qty"
              v-model.number="buyQty"
              class="deal__input"
              type="number"
              min="1"
              step="1"
            />
            <span class="deal__hint">
              合计 {{ formatMoney(buyTotal) }} 末日币<template v-if="game.coins < buyTotal">
                · 还差 {{ formatMoney(buyTotal - game.coins) }}</template>
            </span>
          </div>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="game.dead || buyCount <= 0 || game.coins < buyTotal"
            @click="buyGas"
          >
            {{ buyCount <= 0 ? '请输入数量' : `购买 ${buyCount} 桶 · ${buyTotal} 末日币` }}
          </button>
        </article>
      </div>

      <div v-else-if="view === 'investment'" class="market">
        <header class="market__head">
          <h3 class="pane__title">投资中心 · 云上行情终端</h3>
          <span class="tag">第 {{ game.day }} 天 · 末日币 {{ formatMoney(game.coins) }}</span>
        </header>
        <p class="pane__desc">
          六支股票每日刷新，价格 0.01-300 末日币，最多两位小数。买入卖出各收 1% 手续费，最低 0.1 币。
        </p>

        <div class="market__grid">
          <div class="market__list">
            <button
              v-for="row in stockRows"
              :key="row.id"
              type="button"
              class="stock"
              :class="{ 'stock--active': stockId === row.id }"
              @click="selectStock(row.id)"
            >
              <span class="stock__main">
                <b class="stock__name">{{ row.name }}</b>
                <em class="stock__sector">{{ row.sector }}</em>
              </span>
              <span class="stock__price">{{ formatMoney(row.price) }}</span>
              <span
                class="stock__change"
                :class="{ 'is-up': row.change > 0, 'is-down': row.change < 0 }"
              >
                {{ row.change > 0 ? '▲' : row.change < 0 ? '▼' : '—' }}
                {{ changeText(row.change) }}
              </span>
              <span class="stock__hold">{{ row.holding.shares }} 股</span>
            </button>
          </div>

          <section class="market__detail">
            <header class="market__detail-head">
              <div>
                <h4 class="good__name">
                  {{ selectedStock.name }}
                  <span class="good__tier">{{ selectedStock.sector }}</span>
                </h4>
                <p class="good__note">{{ selectedStock.desc }}</p>
              </div>
              <span class="market__price">{{ formatMoney(selectedStock.price) }} 币</span>
            </header>

            <div class="chips">
              <span>昨日 {{ formatMoney(selectedStock.prev) }}</span>
              <span
                :class="{
                  'is-up': selectedStock.change > 0,
                  'is-down': selectedStock.change < 0,
                }"
              >
                今日 {{ changeText(selectedStock.change) }}
              </span>
              <span>持有 {{ selectedHolding.shares }} 股</span>
              <span>成本均价 {{ stockAvgCostText }}</span>
              <span>持仓市值 {{ formatMoney(stockMarketValue) }}</span>
              <span>浮动盈亏 {{ profitText(stockUnrealized) }}</span>
            </div>

            <div class="deal">
              <span class="deal__label">买入数量</span>
              <input
                id="stock-buy-qty"
                v-model.number="stockBuyQty"
                class="deal__input"
                type="number"
                min="1"
                step="1"
              />
              <span class="deal__hint">
                {{ stockBuyCount }} 股 · {{ formatMoney(stockBuyGross) }} + 手续费
                {{ formatMoney(stockBuyFee) }} = {{ formatMoney(stockBuyTotal) }}
              </span>
            </div>
            <button
              type="button"
              class="btn btn--primary extra__action"
              :disabled="game.dead || stockBuyCount <= 0 || game.coins < stockBuyTotal"
              @click="buyStockNow"
            >
              买入 · {{ formatMoney(stockBuyTotal) }} 末日币
            </button>

            <div class="deal">
              <span class="deal__label">卖出数量</span>
              <input
                id="stock-sell-qty"
                v-model.number="stockSellQty"
                class="deal__input"
                type="number"
                min="1"
                step="1"
                :max="selectedHolding.shares"
              />
              <span class="deal__hint">
                {{ stockSellCount }} 股 · {{ formatMoney(stockSellGross) }} - 手续费
                {{ formatMoney(stockSellFee) }} = {{ formatMoney(stockSellNet) }}
              </span>
            </div>
            <button
              type="button"
              class="btn extra__action"
              :disabled="
                game.dead ||
                stockSellCount <= 0 ||
                selectedHolding.shares < stockSellCount ||
                stockSellNet < 0
              "
              @click="sellStockNow"
            >
              {{
                stockSellNet < 0
                  ? '价格过低，无法卖出'
                  : `卖出 · 到账 ${formatMoney(stockSellNet)} 末日币`
              }}
            </button>

            <p class="extra__desc">
              盈亏按分取整：盈利截断，亏损向上补齐；同一天价格不变，跨天刷新。
            </p>
          </section>
        </div>

        <footer class="market__foot">
          <span>总持仓市值 <b>{{ formatMoney(stockPortfolioValue) }}</b> 末日币</span>
          <span>已实现盈亏 <b>{{ profitText(stockRealized) }}</b></span>
        </footer>
      </div>

      <div v-else-if="shopInfo" class="shop">
        <header class="shop__head">
          <h3 class="pane__title">{{ shopInfo.name }}</h3>
          <span class="tag">末日币结算 · 物价偏高</span>
        </header>
        <p class="pane__desc">{{ shopInfo.desc }}</p>
        <div class="goods">
          <article v-for="good in shopGoods" :key="good.id" class="good">
            <img class="good__img" :src="getItem(good.itemId)?.image" :alt="good.name" />
            <div class="good__main">
              <h4 class="good__name">
                {{ good.name }}
                <span v-if="good.tier" class="good__tier">{{ good.tier }}</span>
              </h4>
              <p class="good__note">{{ good.note }}</p>
            </div>
            <div class="good__buy">
              <span class="good__price">{{ good.price }} 末日币</span>
              <button
                type="button"
                class="btn"
                :disabled="game.dead || game.coins < good.price"
                @click="buyGood(good)"
              >
                {{ game.coins < good.price ? '币不足' : '购买' }}
              </button>
            </div>
          </article>
        </div>
      </div>

      <div v-else-if="view === 'treasure'" class="extras">
        <article class="extra extra--wide">
          <header class="extra__head">
            <h4 class="extra__title">珍宝商店</h4>
            <span class="extra__tag">{{ treasureSold ? '今日售罄' : '每日一件' }}</span>
          </header>
          <p class="extra__desc">{{ AIRSHIP_SHOPS.treasure.desc }}</p>
          <div v-if="treasure" class="treasure">
            <img class="good__img" :src="getItem(treasure.itemId)?.image" :alt="treasure.name" />
            <div class="treasure__main">
              <h4 class="good__name">
                {{ treasure.name }}
                <span class="good__tier">{{ treasure.tier }}</span>
              </h4>
              <p class="good__note">{{ treasure.note }}</p>
            </div>
            <span class="good__price">{{ treasure.price }} 末日币</span>
          </div>
          <p v-else class="extra__desc">今天托盘里没有货。</p>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="game.dead || treasureSold || !treasure || game.coins < treasure.price"
            @click="buyTreasure"
          >
            {{
              treasureSold
                ? '今天的珍宝已经售出'
                : !treasure
                  ? '今日无货'
                  : game.coins < treasure.price
                    ? `还差 ${formatMoney(treasure.price - game.coins)} 末日币`
                    : `买下今日珍宝 · ${treasure.price} 末日币`
            }}
          </button>
        </article>
      </div>
    </section>

    <template #footer>
      <span>{{ feed || '甲板上的贵族只认身份、声望与末日币。' }}</span>
      <span class="mode">AIRSHIP</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.pane {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 14px;
}

.pane__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pane__title {
  margin: 0;
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--text);
}

.pane__desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.9;
  letter-spacing: 0.04em;
  color: var(--text-dim);
}

.tag {
  flex: none;
  padding: 2px 7px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--rust-soft);
  border: 1px solid rgba(193, 74, 50, 0.4);
}

.bar {
  display: flex;
  justify-content: flex-start;
}

.back {
  height: 28px;
  padding: 0 12px;
  font-size: 10.5px;
}

.extras {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: var(--line);
}

.extra {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #0d0f10;
}

.extra--wide {
  grid-column: 1 / -1;
}

.extra__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.extra__title {
  margin: 0;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--text);
}

.extra__tag {
  flex: none;
  padding: 2px 7px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--rust-soft);
  border: 1px solid rgba(193, 74, 50, 0.4);
}

.extra__desc {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.75;
  color: var(--text-mute);
}

.extra__warn {
  margin: 0;
  padding: 7px 9px;
  font-size: 10px;
  line-height: 1.7;
  color: var(--rust-soft);
  border: 1px solid rgba(193, 74, 50, 0.4);
  background: rgba(193, 74, 50, 0.08);
}

.extra__action {
  align-self: flex-start;
  height: 30px;
  padding: 0 13px;
  font-size: 11px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.chips span {
  padding: 4px 9px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.2);
}

.menu-item {
  align-items: flex-start;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.menu-item:hover:not(:disabled) {
  background: #121516;
}

.menu-item--locked {
  cursor: not-allowed;
  opacity: 0.5;
}

.menu-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.menu-item__note {
  font-size: 10.5px;
  line-height: 1.65;
  letter-spacing: 0.03em;
  color: var(--text-mute);
}

.talent {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.24);
}

.talent__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.talent__title {
  font-size: 11.5px;
  letter-spacing: 0.08em;
  color: var(--text);
}

.talent__title em {
  margin-left: 6px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-style: normal;
  color: var(--text-mute);
}

.talent__bonus {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--rust-soft);
}

.track {
  height: 4px;
  background: rgba(214, 208, 191, 0.12);
  overflow: hidden;
}

.track__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--rust), var(--rust-soft));
  transition: width 0.4s ease;
}

.talent__progress {
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--text-mute);
}

.cargo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
  padding: 12px;
  border: 1px dashed var(--line-strong);
  background: rgba(0, 0, 0, 0.18);
}

.deal {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.24);
}

.deal__label {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.deal__input {
  width: 92px;
  height: 28px;
  padding: 0 8px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--line-strong);
  outline: none;
}

.deal__input:focus {
  border-color: rgba(193, 74, 50, 0.6);
}

.deal__hint {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--bone);
}

.market {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.market__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.market__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 14px;
  align-items: start;
}

.market__list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--line);
}

.stock {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 52px 84px 52px;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  text-align: left;
  background: #0d0f10;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.stock:hover {
  background: #121516;
}

.stock--active {
  border-left-color: var(--rust);
  background: rgba(193, 74, 50, 0.08);
}

.stock__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stock__name {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--text);
}

.stock__sector {
  font-family: var(--font-mono);
  font-size: 9px;
  font-style: normal;
  letter-spacing: 0.08em;
  color: var(--text-mute);
}

.stock__price {
  font-family: var(--font-mono);
  font-size: 12px;
  text-align: right;
  color: var(--bone);
}

.stock__change {
  font-family: var(--font-mono);
  font-size: 10px;
  text-align: right;
  color: var(--text-mute);
}

.stock__hold {
  font-family: var(--font-mono);
  font-size: 9.5px;
  text-align: right;
  color: var(--text-mute);
}

.is-up {
  color: var(--sick) !important;
}

.is-down {
  color: var(--rust-soft) !important;
}

.market__detail {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.022);
}

.market__detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.market__price {
  flex: none;
  font-family: var(--font-mono);
  font-size: 15px;
  color: var(--bone);
}

.market__detail .extra__action {
  align-self: flex-start;
}

.market__foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-mute);
}

.market__foot b {
  font-weight: 500;
  color: var(--bone);
}

.shop {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shop__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.goods {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--line);
}

.good,
.treasure {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 12px;
  background: #0d0f10;
}

.good__img {
  width: 46px;
  height: 46px;
  flex: none;
  object-fit: contain;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.25);
}

.good__main,
.treasure__main {
  min-width: 0;
  flex: 1;
}

.good__name {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--text);
}

.good__tier {
  margin-left: 7px;
  padding: 1px 6px;
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--bone);
  border: 1px solid var(--line-strong);
}

.good__note {
  margin: 4px 0 0;
  font-family: var(--font-mono);
  font-size: 9.5px;
  line-height: 1.6;
  color: var(--text-mute);
}

.good__buy {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.good__price {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--bone);
}

.good__buy .btn {
  height: 26px;
  padding: 0 11px;
  font-size: 10px;
}

.treasure {
  border: 1px dashed var(--line-strong);
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}

@media (max-width: 760px) {
  .market__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 680px) {
  .extras {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
