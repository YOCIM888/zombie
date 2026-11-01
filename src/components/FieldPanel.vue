<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  DEV_SHOP,
  DOCTOR,
  GARAGE,
  GIANT_PUPPET,
  LULU,
  MA_SAN,
  MERMAID,
  ORCHARD,
  ROCKET,
  ROTTEN_SEED,
  STRANGE_BARBECUE,
  YANRAN,
  ZOMBIE_ABILITY_LABELS,
  countItem,
  fieldMapById,
  getItem,
  lootCategoryText,
  rarityText,
  zombiePool,
} from '../data'
import {
  acceptMaSanInvite,
  advanceTurns,
  approachYanran,
  cooldownLeft,
  collectGenerator,
  countAntiInfection,
  countCans,
  countDoctorBadges,
  countFruits,
  countGasoline,
  countSpirits,
  currentPhase,
  deliverMaSanBeer,
  deliverMaSanFruit,
  deliverMaSanSpirit,
  doctorSupplyCounts,
  doctorTrade,
  eatStrangeBarbecue,
  elopeGarage,
  exploreField,
  extractEnergy,
  expandBackpack,
  feedLulu,
  game,
  launchRocket,
  mermaidCurrent as readMermaidCurrent,
  mermaidStage as readMermaidStage,
  notify,
  openGarageDoor,
  pickOrchard,
  rescueYanran,
  searchGarageKey,
  stealGarageGasoline,
  submitEnergy,
  submitGenerator,
  submitMermaidDrink,
  submitSupplies,
  takeDevGift,
  takeRottenSeed,
  yanranDaysLeft,
} from '../game/store'
import { battle, resetBattle, startFieldCombat } from '../game/battle'
import BattleView from './BattleView.vue'
import ModalShell from './ModalShell.vue'

const emit = defineEmits(['close'])
const feed = ref('')

const map = computed(() => fieldMapById(game.location))
const zombies = computed(() => zombiePool(map.value?.zombiePool))
const encounterPercent = computed(() => Math.round((map.value?.encounterRate ?? 0) * 100))
const lootText = computed(() => lootCategoryText(map.value?.lootTable))
const rarityLabel = computed(() => rarityText(map.value?.rarityWeights))

const isVillage = computed(() => map.value?.id === ORCHARD.mapId)
const isCamp = computed(() => map.value?.id === STRANGE_BARBECUE.mapId)
const isMarket = computed(() => map.value?.id === MERMAID.mapId)
const isCore = computed(() => map.value?.id === YANRAN.mapId || map.value?.id === GARAGE.mapId)
const isHospital = computed(() => map.value?.id === LULU.mapId)
const isLab = computed(() => map.value?.id === DOCTOR.mapId)
const isSpaceport = computed(() => map.value?.id === ROCKET.mapId)
const orchardLeft = computed(() => cooldownLeft(ORCHARD.cooldownKey, ORCHARD.cooldownDays))
const barbecueLeft = computed(() =>
  cooldownLeft(STRANGE_BARBECUE.cooldownKey, STRANGE_BARBECUE.cooldownDays),
)
const seedFound = computed(() => Boolean(game.flags.rottenSeedFound))
const seedSprouted = computed(() => Boolean(game.flags.rottenSeedSprouted))
const seedPlanted = computed(() => Boolean(game.flags.rottenSeedPlanted))
const hasSeed = computed(() => countItem(game.inventory, ROTTEN_SEED.itemId) > 0)
const ateStrangeMeat = computed(() => Boolean(game.flags.ateStrangeMeat))
const maSanStage = computed(() => Number(game.flags.maSanStage) || 0)
const maSanKilled = computed(() => Boolean(game.flags.maSanKilled))
const beerCount = computed(() => countItem(game.inventory, MA_SAN.beerId))
const fruitCount = computed(() => countFruits())
const spiritCount = computed(() => countSpirits())

const maSanLine = computed(() => {
  if (maSanKilled.value) return MA_SAN.killedLine
  if (!ateStrangeMeat.value) return MA_SAN.lockedLine
  if (maSanStage.value === 0) return MA_SAN.askBeerLine
  if (maSanStage.value === 1) return MA_SAN.askFruitLine
  if (maSanStage.value === 2) return MA_SAN.askSpiritLine
  return MA_SAN.inviteLine
})

const mermaidStage = computed(() => readMermaidStage())
const mermaidCurrent = computed(() => readMermaidCurrent())
const mermaidStageCount = computed(() => MERMAID.stages.length)
const mermaidDone = computed(() => mermaidStage.value >= mermaidStageCount.value)
const mermaidCurrentName = computed(() => {
  const stage = mermaidCurrent.value
  return stage ? getItem(stage.itemId)?.name ?? stage.itemId : ''
})
const mermaidNeedCount = computed(() => mermaidCurrent.value?.count ?? 0)
const mermaidOwned = computed(() =>
  mermaidCurrent.value ? countItem(game.inventory, mermaidCurrent.value.itemId) : 0,
)
const mermaidRewardName = computed(
  () => getItem(MERMAID.rewardItemId)?.name ?? MERMAID.rewardItemId,
)
const mermaidHint = computed(() => {
  const index = mermaidStage.value
  if (index <= 0) return ''
  return MERMAID.lines[index - 1] ?? ''
})

const devConfirm = ref(false)
const devGiftTaken = computed(() => Boolean(game.flags.devGiftTaken))
const bagSize = computed(() => game.inventory.length)
const bagFull = computed(() => bagSize.value >= DEV_SHOP.expandLimit)
const canExpand = computed(
  () =>
    !bagFull.value &&
    game.coins >= DEV_SHOP.expandCost &&
    game.dawnCoins >= DEV_SHOP.expandCost,
)

const yanranSeen = computed(() => Boolean(game.flags.yanranSeen))
const yanranRescued = computed(() => Boolean(game.flags.yanranRescued))
const yanranKilled = computed(() => Boolean(game.flags.yanranKilled))
const yanranLost = computed(() => Boolean(game.flags.yanranLost))
const yanranDays = computed(() => yanranDaysLeft() ?? 0)
// 截止日当天仍可营救：只有超过 deadline 才视为变异
const yanranOverdue = computed(
  () => yanranSeen.value && game.day > Number(game.flags.yanranDeadline),
)
const yanranMutated = computed(
  () =>
    !yanranRescued.value &&
    !yanranKilled.value &&
    (yanranLost.value || yanranOverdue.value),
)
const serumCount = computed(() => countAntiInfection())

const garageUnlocked = computed(() => Boolean(game.flags.yanranRescued))
const garageOpened = computed(() => Boolean(game.flags.garageOpened))
const garageKeyFound = computed(
  () => Boolean(game.flags.garageKeyFound) || countItem(game.inventory, GARAGE.carKeyId) > 0,
)
const garageDeparted = computed(() => Boolean(game.flags.garageDeparted))
const gasolineCount = computed(() => countGasoline())
const hasCrowbar = computed(() => game.equipment.melee?.id === GARAGE.crowbarId)

const luluRescued = computed(() => Boolean(game.flags.luluRescued))
const cans = computed(() => countCans())

const doctorTradeDone = computed(() => Boolean(game.flags.doctorTradeDone))
const doctorQuest1Done = computed(() => Boolean(game.flags.doctorQuest1Done))
const doctorQuest2Done = computed(() => Boolean(game.flags.doctorQuest2Done))
const doctorBadges = computed(() => countDoctorBadges())
const doctorReady = computed(() => doctorBadges.value >= DOCTOR.badges.length)
const generatorOwned = computed(() => countItem(game.inventory, DOCTOR.generatorId) > 0)
const energyCount = computed(() => countItem(game.inventory, DOCTOR.energyId))
const energyLeft = computed(() =>
  cooldownLeft(DOCTOR.energyCooldownKey, DOCTOR.energyCooldownDays),
)
const supplies = computed(() => doctorSupplyCounts())
const suppliesReady = computed(
  () =>
    supplies.value.medicine >= DOCTOR.supply.medicine &&
    supplies.value.food >= DOCTOR.supply.food &&
    supplies.value.drink >= DOCTOR.supply.drink,
)
const doctorTag = computed(() => {
  if (doctorReady.value) return '火箭就绪'
  if (doctorQuest2Done.value) return '任务③物资'
  if (doctorQuest1Done.value) return `任务②能源 ${energyCount.value}/${DOCTOR.energyCount}`
  if (doctorTradeDone.value) return '任务①发电机'
  return '未交易'
})

const puppetDefeated = computed(() => Boolean(game.flags.giantPuppetDefeated))
const generatorPending = computed(() => Boolean(game.flags.generatorPending))
const rocketBadges = computed(() => doctorBadges.value)
const rocketCompanionsReady = computed(() => {
  return ROCKET.companionFlags.every((flag) => Boolean(game.flags[flag]))
})
const rocketTag = computed(() => {
  if (!puppetDefeated.value) return '傀儡堵门'
  if (rocketBadges.value < ROCKET.badgeIds.length) return '维修中'
  return '已就绪'
})

onMounted(() => {
  if (battle.finished) resetBattle()
})

function abilityLabel(key) {
  return ZOMBIE_ABILITY_LABELS[key] ?? key
}

function explore() {
  const result = exploreField(game.location)
  if (!result) return

  feed.value = result.line
  if (!result.zombie) return

  if (startFieldCombat(result.zombie, game.location)) {
    feed.value = result.line
  }
}

function run(action) {
  const line = action()
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (line) feed.value = line
}

function claimDevGift() {
  devConfirm.value = false
  run(takeDevGift)
}

function fightMaSan() {
  if (game.dead || battle.active) return
  advanceTurns(1)
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (startFieldCombat(MA_SAN.enemy, game.location, 'npc')) {
    feed.value = '阿三抄起砧板边的 AKM。你抢先扑了上去。'
  }
}

function fightYanran() {
  if (game.dead || battle.active) return
  advanceTurns(1)
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (startFieldCombat(YANRAN.enemy, game.location, 'yanran')) {
    feed.value = '她抬起眼，喉咙里只剩不像人的气音。你握紧了武器。'
  }
}

function fightPuppet() {
  if (game.dead || battle.active) return
  advanceTurns(1)
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (startFieldCombat(GIANT_PUPPET.enemy, game.location, 'puppet')) {
    feed.value = GIANT_PUPPET.intro
  }
}

function battleDone() {
  const wasMaSan = battle.kind === 'npc'
  const wasYanran = battle.kind === 'yanran'
  const wasPuppet = battle.kind === 'puppet'
  const yanranKilled = Boolean(game.flags.yanranKilled)
  const puppetKilled = Boolean(game.flags.giantPuppetDefeated)
  resetBattle()
  if (wasMaSan && game.flags.maSanKilled) {
    feed.value = '烧烤摊安静下来。你在砧板旁站了一会儿，把 AKM 收进背包。'
    return
  }
  if (wasYanran) {
    feed.value = yanranKilled
      ? YANRAN.killedLine
      : '你退出了商场深处，身后那声嘶吼没有追上来。'
    return
  }
  if (wasPuppet) {
    feed.value = puppetKilled
      ? GIANT_PUPPET.victoryLine
      : GIANT_PUPPET.fleeLine
    return
  }
  feed.value = '你收起武器，继续沿着这片区域搜寻。'
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
    v-if="map"
    :title="map.name"
    :sub="`${map.level} · ${map.difficulty} · 第 ${game.day} 天 · ${currentPhase}`"
    wide
    @close="closePanel"
  >
    <div class="status">
      <span class="status__item">生命 <b>{{ game.stats.hp }}</b></span>
      <span class="status__item">感染 <b>{{ game.stats.infection }}</b></span>
      <span class="status__item">末日币 <b>{{ game.coins }}</b></span>
      <span class="status__item">曙光币 <b>{{ game.dawnCoins }}</b></span>
      <span class="status__item">击杀 <b>{{ game.zombieKills }}</b></span>
      <span class="status__risk">{{ map.difficulty }}</span>
    </div>

    <section v-if="battle.active || battle.finished" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">遭遇战</h3>
      </header>
      <BattleView @done="battleDone" />
    </section>

    <section v-else class="pane">
      <p class="pane__desc">{{ map.desc }}</p>

      <div class="chips">
        <span>遭遇率 {{ encounterPercent }}%</span>
        <span>探索掉落：{{ lootText }}</span>
        <span>武器品质：{{ rarityLabel }}</span>
        <span>{{ map.lootNote }}</span>
      </div>

      <div v-if="isVillage" class="extras">
        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">果园采摘</h4>
            <span class="extra__tag">
              {{ orchardLeft > 0 ? `冷却 ${orchardLeft} 天` : '可采摘' }}
            </span>
          </header>
          <p class="extra__desc">
            果树还挂着没人摘的果子。一次能装满九只口袋，但同一片果园要缓上几天。
          </p>
          <div class="chips">
            <span>随机水果 ×{{ ORCHARD.quantity }}</span>
            <span>消耗 {{ ORCHARD.turns }} 回合</span>
            <span>冷却 {{ ORCHARD.cooldownDays }} 天</span>
          </div>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="orchardLeft > 0"
            @click="run(pickOrchard)"
          >
            {{ orchardLeft > 0 ? `还要等 ${orchardLeft} 天` : '采摘 · 1 回合' }}
          </button>
        </article>

        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">腐烂种子</h4>
            <span class="extra__tag">
              {{
                seedPlanted
                  ? '已完成'
                  : seedSprouted
                    ? '育苗中'
                    : seedFound
                      ? '已拾取'
                      : '未发现'
              }}
            </span>
          </header>
          <p class="extra__desc">
            <template v-if="seedPlanted">
              田里的果苗已经长起来了。苗苗说，等第一批果子熟，她会留一篮给你。
            </template>
            <template v-else-if="seedSprouted">
              果苗在苗苗手里。回果园再摘 {{ ROTTEN_SEED.plantFruits }} 份水果，然后去曙光阵地移栽。
            </template>
            <template v-else-if="seedFound && hasSeed">
              那枚腐烂种子在背包里。去曙光阵地找苗苗，她要 {{ ROTTEN_SEED.sproutFruits }} 份水果育苗。
            </template>
            <template v-else-if="seedFound">
              种子不在背包里。果箱还没翻完，可以再找一次。
            </template>
            <template v-else>
              塌掉的果箱底下压着什么东西，凑近能闻到一股烂透的甜味。
            </template>
          </p>
          <div v-if="!seedPlanted && !seedSprouted && !hasSeed" class="chips">
            <span>消耗 1 回合</span>
            <span>隐藏剧情</span>
          </div>
          <button
            v-if="!seedPlanted && !seedSprouted && !hasSeed"
            type="button"
            class="btn btn--primary extra__action"
            @click="run(takeRottenSeed)"
          >
            翻找果箱 · 1 回合
          </button>
        </article>
      </div>

      <div v-else-if="isCamp" class="extras">
        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">奇怪烧烤</h4>
            <span class="extra__tag">
              {{ barbecueLeft > 0 ? '今日已吃' : '每日一次' }}
            </span>
          </header>
          <p class="extra__desc">
            铁架上串着几块来路不明的肉，油脂滴进火里，腾起一股说不清道不明的香。
          </p>
          <div class="chips">
            <span>饱食 +{{ STRANGE_BARBECUE.effects.hunger }}</span>
            <span>水分 +{{ STRANGE_BARBECUE.effects.thirst }}</span>
            <span>体力 {{ STRANGE_BARBECUE.effects.stamina }}</span>
            <span>感染 +{{ STRANGE_BARBECUE.effects.infection }}</span>
          </div>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="barbecueLeft > 0"
            @click="run(eatStrangeBarbecue)"
          >
            {{ barbecueLeft > 0 ? '今天这炉收摊了' : '吃一串 · 1 回合' }}
          </button>
        </article>

        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">冷面阿三</h4>
            <span class="extra__tag">
              {{
                maSanKilled
                  ? '已击杀'
                  : !ateStrangeMeat
                    ? '未接触'
                    : maSanStage === 3
                      ? '后厨邀请'
                      : `第 ${maSanStage + 1} 段`
              }}
            </span>
          </header>
          <p class="extra__desc">
            {{ MA_SAN.intro }}
            <q>{{ maSanLine }}</q>
          </p>
          <div v-if="ateStrangeMeat && !maSanKilled" class="chips">
            <span v-if="maSanStage === 0">白威啤酒 {{ beerCount }} / {{ MA_SAN.beerCount }}</span>
            <span v-else-if="maSanStage === 1">水果 {{ fruitCount }} / {{ MA_SAN.fruitCount }}</span>
            <span v-else-if="maSanStage === 2">烈酒 {{ spiritCount }} / {{ MA_SAN.spiritCount }}</span>
            <span v-else>接受邀请将结束本局</span>
          </div>
          <button
            v-if="ateStrangeMeat && !maSanKilled && maSanStage === 0"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="beerCount < MA_SAN.beerCount"
            @click="run(deliverMaSanBeer)"
          >
            递上 {{ MA_SAN.beerCount }} 罐白威啤酒
          </button>
          <button
            v-else-if="ateStrangeMeat && !maSanKilled && maSanStage === 1"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="fruitCount < MA_SAN.fruitCount"
            @click="run(deliverMaSanFruit)"
          >
            递上 {{ MA_SAN.fruitCount }} 份水果
          </button>
          <button
            v-else-if="ateStrangeMeat && !maSanKilled && maSanStage === 2"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="spiritCount < MA_SAN.spiritCount"
            @click="run(deliverMaSanSpirit)"
          >
            递上 {{ MA_SAN.spiritCount }} 瓶烈酒
          </button>
          <div
            v-else-if="ateStrangeMeat && !maSanKilled && maSanStage === 3"
            class="extra__actions"
          >
            <button
              type="button"
              class="btn extra__deadly"
              @click="run(acceptMaSanInvite)"
            >
              接受邀请（⚠ 这将改变你的命运）
            </button>
            <button type="button" class="btn extra__action" @click="fightMaSan">
              拒绝，动手
            </button>
          </div>
        </article>
      </div>

      <div v-else-if="isMarket" class="extras">
        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">人鱼公主</h4>
            <span class="extra__tag">
              {{
                mermaidDone
                  ? '已愈合'
                  : mermaidStage === 0
                    ? '未愈合'
                    : `第 ${mermaidStage + 1} / ${mermaidStageCount} 段`
              }}
            </span>
          </header>
          <p class="extra__desc">
            <template v-if="mermaidDone">她只留下一道水痕，和那柄三叉戟。</template>
            <template v-else>
              {{ MERMAID.intro }}
              <q v-if="mermaidHint">{{ mermaidHint }}</q>
            </template>
          </p>
          <div class="chips">
            <template v-if="mermaidDone">
              <span>已获得 {{ mermaidRewardName }}</span>
            </template>
            <template v-else>
              <span>{{ mermaidCurrentName }} {{ mermaidOwned }} / {{ mermaidNeedCount }}</span>
              <span>消耗 {{ MERMAID.turns }} 回合</span>
            </template>
          </div>
          <button
            v-if="!mermaidDone"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="mermaidOwned < mermaidNeedCount"
            @click="run(submitMermaidDrink)"
          >
            提交 {{ mermaidCurrentName }} ×{{ mermaidNeedCount }}
          </button>
        </article>

        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">某开发者</h4>
            <span class="extra__tag">{{ devGiftTaken ? '已领取' : '可领取' }}</span>
          </header>
          <p class="extra__desc">
            他蹲在卖场角落，面前摆着一台亮着屏幕的旧电脑。
            <q>
              「难度太高？我可以帮你一把。不过想清楚——拿了这个，游戏就没什么意思了。只能选一次。」
            </q>
          </p>
          <div class="chips">
            <span>末日币 +{{ DEV_SHOP.giftCoins }}</span>
            <span>曙光币 +{{ DEV_SHOP.giftDawnCoins }}</span>
            <span>万能灵药 ×6</span>
            <span>抗感染针 ×6</span>
            <span>豆类罐头 ×66</span>
            <span>桃子 ×66</span>
            <span>蝴蝶刀-金蝶 ×1</span>
            <span>AKM ×1</span>
          </div>

          <p v-if="devGiftTaken" class="extra__desc">
            他把电脑合上，再没抬头。那份补给已经在你包里了。
          </p>
          <template v-else-if="devConfirm">
            <p class="extra__warn">慎选：这会大幅降低游戏体验，且只能领取一次。</p>
            <div class="extra__actions">
              <button type="button" class="btn extra__deadly" @click="claimDevGift">
                确认领取
              </button>
              <button
                type="button"
                class="btn extra__action"
                @click="devConfirm = false"
              >
                再想想
              </button>
            </div>
          </template>
          <button
            v-else
            type="button"
            class="btn btn--primary extra__action"
            @click="devConfirm = true"
          >
            游戏难度太高 · 领取救济
          </button>

          <div class="dev-expand">
            <header class="extra__head">
              <h4 class="extra__title">我要扩容背包</h4>
              <span class="extra__tag">背包 {{ bagSize }} / {{ DEV_SHOP.expandLimit }} 格</span>
            </header>
            <p class="extra__desc">
              每次加 {{ DEV_SHOP.expandSteps }} 格，收 {{ DEV_SHOP.expandCost }} 末日币 +
              {{ DEV_SHOP.expandCost }} 曙光币。
            </p>
            <button
              type="button"
              class="btn extra__action"
              :disabled="!canExpand"
              @click="run(expandBackpack)"
            >
              {{ bagFull ? '已达容量上限' : `扩容 +${DEV_SHOP.expandSteps} 格` }}
            </button>
          </div>
        </article>
      </div>

      <div v-else-if="isCore" class="extras">
        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">半感染者嫣然</h4>
            <span class="extra__tag">
              {{
                yanranKilled
                  ? '已击杀'
                  : yanranRescued
                    ? '已入队'
                    : yanranMutated
                      ? '已变异'
                      : yanranSeen
                        ? `剩余 ${yanranDays} 天`
                        : '未接触'
              }}
            </span>
          </header>
          <p class="extra__desc">
            <template v-if="yanranRescued">嫣然在安全屋等你。</template>
            <template v-else-if="yanranKilled">{{ YANRAN.killedLine }}</template>
            <template v-else-if="yanranMutated">{{ YANRAN.lostLine }}</template>
            <template v-else>{{ YANRAN.intro }}</template>
          </p>
          <div
            v-if="yanranSeen && !yanranRescued && !yanranMutated && !yanranKilled"
            class="chips"
          >
            <span>抗感染针 {{ serumCount }} / {{ YANRAN.serumCount }}</span>
          </div>
          <div v-if="yanranRescued" class="chips">
            <span>战斗助战：30% 追伤 20</span>
          </div>
          <button
            v-if="!yanranSeen && !yanranRescued && !yanranKilled"
            type="button"
            class="btn btn--primary extra__action"
            @click="run(approachYanran)"
          >
            靠近查看 · 1 回合
          </button>
          <button
            v-else-if="yanranSeen && !yanranRescued && !yanranMutated && !yanranKilled"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="serumCount < YANRAN.serumCount"
            @click="run(rescueYanran)"
          >
            注射 {{ YANRAN.serumCount }} 支 · 1 回合
          </button>
          <button
            v-else-if="yanranMutated && !yanranKilled"
            type="button"
            class="btn extra__deadly"
            @click="fightYanran"
          >
            迎战变异的嫣然 · 1 回合
          </button>
        </article>

        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">地下车库</h4>
            <span class="extra__tag">
              {{
                garageDeparted
                  ? '已出发'
                  : !garageUnlocked
                    ? '未解锁'
                    : !garageOpened
                      ? '门未开'
                      : !garageKeyFound
                        ? '找钥匙'
                        : gasolineCount < GARAGE.gasolineCount
                          ? '凑汽油'
                          : '可以出发'
              }}
            </span>
          </header>
          <p class="extra__desc">
            <template v-if="garageDeparted">{{ GARAGE.departedLine }}</template>
            <template v-else-if="!garageUnlocked">{{ GARAGE.lockedLine }}</template>
            <template v-else>{{ GARAGE.intro }}</template>
          </p>
          <div v-if="garageUnlocked && !garageDeparted" class="chips">
            <span>汽油 {{ gasolineCount }} / {{ GARAGE.gasolineCount }}</span>
            <span v-if="!garageKeyFound">车钥匙 未找到</span>
            <span v-if="!garageOpened && !hasCrowbar">需要装备撬棍</span>
          </div>
          <template v-if="garageUnlocked && !garageDeparted">
            <button
              v-if="!garageOpened"
              type="button"
              class="btn btn--primary extra__action"
              :disabled="!hasCrowbar"
              @click="run(openGarageDoor)"
            >
              撬开卷帘门 · 1 回合
            </button>
            <button
              v-else-if="!garageKeyFound"
              type="button"
              class="btn btn--primary extra__action"
              @click="run(searchGarageKey)"
            >
              翻找车钥匙 · 1 回合
            </button>
            <button
              v-else-if="gasolineCount < GARAGE.gasolineCount"
              type="button"
              class="btn btn--primary extra__action"
              @click="run(stealGarageGasoline)"
            >
              偷取汽油 · 1 回合
            </button>
            <button
              v-else
              type="button"
              class="btn btn--primary extra__action"
              @click="run(elopeGarage)"
            >
              出发 · 私奔
            </button>
          </template>
        </article>
      </div>

      <div v-else-if="isHospital" class="extras">
        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">饥饿丧尸露露</h4>
            <span class="extra__tag">{{ luluRescued ? '已入队' : '未投喂' }}</span>
          </header>
          <p class="extra__desc">
            {{ luluRescued ? LULU.rescuedLine : LULU.intro }}
          </p>
          <div class="chips">
            <span>罐头 {{ cans }} / {{ LULU.cannedCount }}</span>
            <span v-if="!luluRescued">消耗 1 回合</span>
            <span v-else>每场胜利回血 20</span>
          </div>
          <button
            v-if="!luluRescued"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="cans < LULU.cannedCount"
            @click="run(feedLulu)"
          >
            一次放下 {{ LULU.cannedCount }} 个罐头
          </button>
        </article>
      </div>

      <div v-else-if="isLab" class="extras">
        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">陈博士</h4>
            <span class="extra__tag">{{ doctorTag }}</span>
          </header>
          <p class="extra__desc">
            <template v-if="doctorReady">{{ DOCTOR.readyLine }}</template>
            <template v-else-if="!doctorTradeDone">{{ DOCTOR.intro }}</template>
            <template v-else-if="!puppetDefeated">{{ DOCTOR.needPuppetLine }}</template>
            <template v-else-if="!doctorQuest1Done">{{ DOCTOR.quest1Line }}</template>
            <template v-else-if="!doctorQuest2Done">{{ DOCTOR.quest2Line }}</template>
            <template v-else>{{ DOCTOR.quest3Line }}</template>
          </p>

          <div class="chips">
            <template v-if="doctorReady">
              <span v-for="id in DOCTOR.badges" :key="id">{{ getItem(id)?.name }}</span>
            </template>
            <template v-else-if="!doctorTradeDone">
              <span>抗感染针 {{ serumCount }} / {{ DOCTOR.serumCount }}</span>
              <span>奖励：M700</span>
            </template>
            <template v-else-if="!doctorQuest1Done">
              <span>小核能发电机 {{ generatorOwned ? 1 : 0 }} / 1</span>
              <span v-if="generatorPending">遗落在发射中心</span>
            </template>
            <template v-else-if="!doctorQuest2Done">
              <span>纯净能源 {{ energyCount }} / {{ DOCTOR.energyCount }}</span>
              <span>{{ energyLeft > 0 ? `能源井 ${energyLeft} 天后可抽取` : '能源井可抽取' }}</span>
            </template>
            <template v-else>
              <span>医疗 {{ supplies.medicine }} / {{ DOCTOR.supply.medicine }}</span>
              <span>食物 {{ supplies.food }} / {{ DOCTOR.supply.food }}</span>
              <span>饮品 {{ supplies.drink }} / {{ DOCTOR.supply.drink }}</span>
            </template>
          </div>

          <button
            v-if="!doctorTradeDone"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="serumCount < DOCTOR.serumCount"
            @click="run(doctorTrade)"
          >
            交付 {{ DOCTOR.serumCount }} 支抗感染针 · 换 M700
          </button>
          <button
            v-else-if="!doctorQuest1Done && generatorOwned"
            type="button"
            class="btn btn--primary extra__action"
            @click="run(submitGenerator)"
          >
            上交小核能发电机 · 动力徽章
          </button>
          <div v-else-if="!doctorQuest2Done" class="extra__actions">
            <button
              type="button"
              class="btn"
              :disabled="energyLeft > 0"
              @click="run(extractEnergy)"
            >
              {{ energyLeft > 0 ? `能源井 ${energyLeft} 天后可抽取` : '抽取能源 · 1 回合' }}
            </button>
            <button
              type="button"
              class="btn btn--primary"
              :disabled="energyCount < DOCTOR.energyCount"
              @click="run(submitEnergy)"
            >
              上交 {{ DOCTOR.energyCount }} 份纯净能源 · 燃料徽章
            </button>
          </div>
          <button
            v-else-if="!doctorReady"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="!suppliesReady"
            @click="run(submitSupplies)"
          >
            上交生存物资 · 生存徽章
          </button>
        </article>
      </div>

      <div v-else-if="isSpaceport" class="extras">
        <article class="extra">
          <header class="extra__head">
            <h4 class="extra__title">发射中心</h4>
            <span class="extra__tag">{{ rocketTag }}</span>
          </header>
          <p class="extra__desc">
            <template v-if="!puppetDefeated">{{ GIANT_PUPPET.intro }}</template>
            <template v-else-if="rocketBadges < ROCKET.badgeIds.length">
              {{ ROCKET.lockedLine }}
            </template>
            <template v-else>{{ ROCKET.repairedLine }}</template>
          </p>

          <div class="chips">
            <template v-if="!puppetDefeated">
              <span>巨型丧尸傀儡 · 生命 {{ GIANT_PUPPET.enemy.hp }}</span>
              <span>攻击 {{ GIANT_PUPPET.enemy.attack }}</span>
              <span>闪避 {{ Math.round(GIANT_PUPPET.enemy.dodge * 100) }}%</span>
            </template>
            <template v-else>
              <span>发射徽章 {{ rocketBadges }} / {{ ROCKET.badgeIds.length }}</span>
              <span v-for="id in ROCKET.badgeIds" :key="id">
                {{ getItem(id)?.name }}{{ countItem(game.inventory, id) > 0 ? '已持有' : '未持有' }}
              </span>
              <span>嫣然 {{ yanranRescued ? '在队' : '未入队' }}</span>
              <span>露露 {{ luluRescued ? '在队' : '未入队' }}</span>
            </template>
          </div>

          <button
            v-if="!puppetDefeated"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="battle.active"
            @click="fightPuppet"
          >
            迎战巨型傀儡 · 1 回合
          </button>
          <button
            v-else-if="generatorPending"
            type="button"
            class="btn extra__action"
            @click="run(collectGenerator)"
          >
            拾取小核能发电机
          </button>
          <div v-else-if="rocketBadges >= ROCKET.badgeIds.length" class="extra__actions">
            <button
              type="button"
              class="btn btn--primary"
              :disabled="!rocketCompanionsReady"
              @click="run(() => launchRocket('all'))"
            >
              带所有人上火箭
            </button>
            <button type="button" class="btn" @click="run(() => launchRocket('solo'))">
              独自飞走
            </button>
            <button type="button" class="btn" @click="run(() => launchRocket('send'))">
              让他们走
            </button>
            <button type="button" class="btn" @click="run(() => launchRocket('stay'))">
              留下
            </button>
          </div>
        </article>
      </div>

      <div class="zombies">
        <header class="zombies__head">
          <h4 class="zombies__title">出没丧尸</h4>
          <span class="zombies__count">{{ zombies.length }} 种</span>
        </header>
        <article v-for="zombie in zombies" :key="zombie.id" class="zombie">
          <div class="zombie__main">
            <h5 class="zombie__name">{{ zombie.name }}</h5>
            <p class="zombie__desc">{{ zombie.description }}</p>
          </div>
          <div class="zombie__stats">
            <span>生命 {{ zombie.hp }}</span>
            <span>攻击 {{ zombie.attack }}</span>
            <span v-if="zombie.infection > 0">感染 +{{ zombie.infection }}%</span>
            <span v-for="ability in zombie.abilities" :key="ability" class="zombie__ability">
              {{ abilityLabel(ability) }}
            </span>
          </div>
        </article>
      </div>

      <div class="actions">
        <button type="button" class="btn btn--primary" @click="explore">探索 · 1 回合</button>
        <button type="button" class="btn" @click="closePanel">返回安全屋</button>
      </div>
    </section>

    <template #footer>
      <span>{{ feed || '探索会消耗 1 回合（正常衰减）；遭遇丧尸时进入手动回合制战斗。' }}</span>
      <span class="mode">FIELD · {{ map.level }}</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.status__item {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.status__item b {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--bone);
}

.status__risk {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--rust-soft);
  border: 1px solid rgba(193, 74, 50, 0.5);
  padding: 2px 7px;
}

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

.zombies {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--line);
}

.zombies__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  background: #0d0f10;
}

.zombies__title {
  margin: 0;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.18em;
  color: var(--text-mute);
}

.zombies__count {
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--text-mute);
}

.zombie {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 11px 12px;
  background: #0d0f10;
}

.zombie__main {
  min-width: 0;
}

.zombie__name {
  margin: 0;
  font-size: 12.5px;
  letter-spacing: 0.1em;
  color: var(--text);
}

.zombie__desc {
  margin: 4px 0 0;
  font-size: 10.5px;
  line-height: 1.65;
  color: var(--text-mute);
}

.zombie__stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 5px;
  flex: none;
  max-width: 46%;
}

.zombie__stats span {
  padding: 2px 7px;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-mute);
  border: 1px solid var(--line);
}

.zombie__ability {
  color: var(--rust-soft) !important;
  border-color: rgba(184, 98, 70, 0.45) !important;
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

.extra__desc q {
  display: block;
  margin-top: 6px;
  color: var(--text-dim);
  font-style: normal;
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

.dev-expand {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}

.dev-expand .extra__head {
  margin-bottom: 8px;
}

.dev-expand .extra__desc {
  margin-bottom: 8px;
}

.extra__action {
  align-self: flex-start;
  height: 30px;
  padding: 0 13px;
  font-size: 11px;
}

.extra__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.extra__deadly {
  height: 30px;
  padding: 0 13px;
  font-size: 11px;
  color: var(--rust-soft);
  border-color: rgba(193, 74, 50, 0.6);
}

.extra__deadly:hover {
  background: rgba(193, 74, 50, 0.14);
}

.actions {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

.actions .btn {
  height: 34px;
  padding: 0 16px;
  font-size: 11.5px;
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}

@media (max-width: 680px) {
  .extras {
    grid-template-columns: minmax(0, 1fr);
  }

  .zombie {
    flex-direction: column;
  }

  .zombie__stats {
    max-width: none;
    justify-content: flex-start;
  }
}
</style>
