<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  CLEANLINESS_MAX,
  DAWN_IDENTITY_LEVELS,
  DAWN_JOIN_KILLS,
  DAWN_MARKET,
  DAWN_NPCS,
  DAWN_PROMOTIONS,
  DAWN_RECYCLE_PRICES,
  DAWN_SERVICE,
  QUEST_OWNERS,
  REPAIR_PERCENT_PER_COIN,
  ROTTEN_SEED,
  dawnInfo,
  getItem,
  repairCoinCost,
} from '../data'
import { MAPS } from '../game/config'
import {
  claimDawnRelief,
  cooldownLeft,
  countFruits,
  currentPhase,
  game,
  buyDawnGood,
  joinDawn,
  lilyBrewMedicine,
  mercenaryTraining,
  notify,
  nutritionistMeal,
  plantRottenSeed,
  promoteDawnIdentity,
  questStatus,
  recycleRangedWeapon,
  recycleWeapon,
  repairRangedDawn,
  restoreDawnIdentity,
  revealFieldSecret,
  sproutRottenSeed,
  tendExperimentField,
  weaponRecyclables,
} from '../game/store'
import { battle, resetBattle, startDawnCombat, startLeaderCombat } from '../game/battle'
import BattleView from './BattleView.vue'
import ModalShell from './ModalShell.vue'
import QuestLinePanel from './QuestLinePanel.vue'

const MENU = [
  { id: 'fight', no: '01', name: '清理丧尸', desc: '消耗 1 回合（有衰减），进入手动回合制战斗。' },
  { id: 'relief', no: '02', name: '领取救济', desc: '每天一次，随机领到一个水果，不消耗回合。' },
  { id: 'contact', no: '03', name: '联系管事', desc: '徽章补办、加入曙光，或申请晋升。' },
  ...DAWN_NPCS.map((npc) => ({ ...npc, placeholder: !npc.implemented })),
  { id: 'market', no: '09', name: '曙光市场', desc: '普通远程武器、绷带与罐头，明码标价。' },
  { id: 'salvage', no: '10', name: '物资回收', desc: '背包里的多余武器按品质结算曙光币。' },
]

const map = MAPS.find((item) => item.id === 'dawn-post')
const emit = defineEmits(['close'])
const view = ref('menu')
const selected = ref(null)
const feed = ref('哨塔的探照灯扫过来，有人朝你抬了抬下巴，算是放行。')

const identity = computed(() => dawnInfo(game.dawnIdentity))
const reliefLeft = computed(() => cooldownLeft('dawn-relief', 1))
const joinLeft = computed(() => Math.max(0, DAWN_JOIN_KILLS - game.zombieKills))
const placeholder = computed(() => selected.value)
const promotion = computed(
  () => DAWN_PROMOTIONS.find((item) => item.from === game.dawnIdentity) ?? null,
)
const promotionText = computed(() => {
  if (!game.dawnIdentity) return '尚未加入曙光，先联系管事登记名册。'
  if (!promotion.value) {
    return game.dawnIdentity === '指挥'
      ? '副首只能由首领羿阳亲自授予。'
      : '你已经是曙光「副首」，没有更高的位置。'
  }
  const left = Math.max(0, promotion.value.kills - game.zombieKills)
  return `累计击杀 ${promotion.value.kills} 只可晋升${promotion.value.to}（当前 ${game.zombieKills}${left > 0 ? ` · 还差 ${left}` : ' · 已达标'}）`
})
const canAssassinate = computed(() => questStatus('king-6') === 'active')
const leaderIntro = computed(() => QUEST_OWNERS.yiyang.intro)
const mealLeft = computed(() => cooldownLeft('dawn-meal', 1))
const brewLeft = computed(() => cooldownLeft('dawn-brew', 1))
const trainingLeft = computed(() => cooldownLeft('dawn-training', 1))
const tendLeft = computed(() => cooldownLeft('field-tend', 1))
const fieldProgress = computed(() => Number(game.flags.fieldProgress) || 0)
const fieldReady = computed(() => fieldProgress.value >= DAWN_SERVICE.fieldSecretAt)
const seedFound = computed(() => Boolean(game.flags.rottenSeedFound))
const seedSprouted = computed(() => Boolean(game.flags.rottenSeedSprouted))
const seedPlanted = computed(() => Boolean(game.flags.rottenSeedPlanted))
const fruitCount = computed(() => countFruits())
const rangedRepair = computed(() => {
  const equipped = game.equipment.ranged
  if (!equipped) return { name: '', current: 0, cost: 0, state: 'empty' }
  const def = getItem(equipped.id)
  const current = Number.isFinite(equipped.cleanliness) ? equipped.cleanliness : CLEANLINESS_MAX
  const cost = repairCoinCost(current, CLEANLINESS_MAX)
  return { name: def?.name ?? '远程武器', current, cost, state: cost > 0 ? 'dirty' : 'clean' }
})
const recyclables = computed(() =>
  game.inventory
    .map((entry, index) => {
      const def = entry ? getItem(entry.id) : null
      if (!def || def.category !== 'ranged') return null
      return { index, def, price: DAWN_RECYCLE_PRICES[def.tier] ?? 0 }
    })
    .filter(Boolean),
)
const salvageList = computed(() => weaponRecyclables())

onMounted(resetBattle)

function go(item) {
  if (item.placeholder) {
    selected.value = item
    view.value = 'placeholder'
    return
  }
  if (item.id === 'fight') resetBattle()
  view.value = item.id
}

function backToMenu() {
  if (battle.active) {
    notify('战斗还没结束：先逃跑，或者把它打倒')
    return
  }
  if (battle.finished) resetBattle()
  view.value = 'menu'
}

function run(action) {
  const line = action()
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (line) feed.value = line
}

function fight() {
  const line = startDawnCombat()
  if (line) feed.value = line
}

function assassinate() {
  const line = startLeaderCombat()
  if (line) feed.value = line
}

function battleDone() {
  resetBattle()
  feed.value = '你回到了哨塔下，把身上的灰拍了拍。'
  view.value = 'menu'
}

function leaderDone() {
  resetBattle()
  feed.value = game.flags.dawnLeaderKilled
    ? '哨塔顶层安静下来。你把他留在了那把椅子上。'
    : '你退回了楼梯口，门在身后重新合上。'
  view.value = 'leader'
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
    title="曙光阵地"
    :sub="`${map.difficulty} · 第 ${game.day} 天 · ${currentPhase}`"
    wide
    @close="closePanel"
  >
    <div class="status">
      <span class="status__item">曙光币 <b>{{ game.dawnCoins }}</b></span>
      <span class="status__item">身份 <b>{{ game.dawnIdentity ?? '无' }}</b></span>
      <span class="status__item">历史最高 <b>{{ game.maxDawnIdentity ?? '无' }}</b></span>
      <span class="status__item">击杀 <b>{{ game.zombieKills }} / {{ DAWN_JOIN_KILLS }}</b></span>
      <span class="status__item">感染 <b>{{ game.stats.infection }}</b></span>
      <span class="status__risk">{{ map.difficulty }}</span>
    </div>

    <section v-if="view === 'menu'" class="menu">
      <article v-for="item in MENU" :key="item.id" class="card" @click="go(item)">
        <span class="card__no">{{ item.no }}</span>
        <div class="card__main">
          <h3 class="card__name">{{ item.name }}</h3>
          <p class="card__desc">{{ item.desc }}</p>
        </div>
        <span class="card__arrow">→</span>
      </article>
    </section>

    <section v-else-if="view === 'fight'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">清理丧尸</h3>
        <button v-if="!battle.active" type="button" class="link" @click="backToMenu">
          ← 返回选项
        </button>
      </header>

      <template v-if="battle.active || battle.finished">
        <BattleView @done="battleDone" />
      </template>

      <template v-else>
        <p class="pane__desc">
          哨塔外的街道上游荡着普通行尸。清理它们能换来曙光币，也能让阵地往外多推一条街。
        </p>
        <div class="chips">
          <span>消耗 1 回合（有衰减）</span>
          <span>普通行尸 · 生命 100</span>
          <span>攻击 10</span>
          <span>每次命中 · 感染 +1%</span>
          <span>胜利 +1 曙光币 · 掉落食物或饮品</span>
        </div>
        <p class="pane__note">战斗为手动回合制：近战攻击、远程攻击、打开背包、逃跑。</p>
        <button type="button" class="btn btn--primary pane__action" @click="fight">
          清理丧尸 · 1 回合
        </button>
      </template>
    </section>

    <section v-else-if="view === 'relief'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">领取救济</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <p class="pane__desc">物资箱里堆着附近农场送来的水果。每人每天一份，管事会盯着你的手。</p>
      <div class="chips">
        <span>每天一次</span>
        <span>随机水果 ×1</span>
        <span>不消耗回合</span>
        <span>{{ reliefLeft > 0 ? `冷却 ${reliefLeft} 天` : '今日可领' }}</span>
      </div>
      <button type="button" class="btn btn--primary pane__action" @click="run(claimDawnRelief)">
        领取救济
      </button>
    </section>

    <section v-else-if="view === 'contact'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">联系管事</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>

      <div class="identity">
        <div class="identity__badge">
          <img v-if="identity" :src="identity.image" :alt="identity.name" />
          <span v-else>无</span>
        </div>
        <div class="identity__info">
          <h4>{{ game.dawnIdentity ?? '尚无曙光身份' }}</h4>
          <p>历史最高身份：{{ game.maxDawnIdentity ?? '无' }}</p>
        </div>
      </div>

      <div class="rows">
        <article class="row">
          <div>
            <h4 class="row__name">徽章补办</h4>
            <p class="row__desc">
              徽章遗失后，可领取历史最高曙光身份的身份牌。当前：{{ game.dawnIdentity ?? '无' }}
            </p>
          </div>
          <button type="button" class="btn" @click="run(restoreDawnIdentity)">补办</button>
        </article>

        <article class="row">
          <div>
            <h4 class="row__name">加入曙光</h4>
            <p class="row__desc">
              需要累计击杀 {{ DAWN_JOIN_KILLS }} 只行尸。当前 {{ game.zombieKills }} /
              {{ DAWN_JOIN_KILLS }}{{ joinLeft > 0 ? ` · 还差 ${joinLeft} 只` : ' · 已达到要求' }}
            </p>
          </div>
          <button type="button" class="btn" @click="run(joinDawn)">加入</button>
        </article>

        <article class="row">
          <div>
            <h4 class="row__name">我要晋升</h4>
            <p class="row__desc">{{ promotionText }}</p>
          </div>
          <button
            type="button"
            class="btn"
            :disabled="!promotion"
            @click="run(promoteDawnIdentity)"
          >
            申请晋升
          </button>
        </article>
      </div>

      <div class="ladder">
        <span
          v-for="level in DAWN_IDENTITY_LEVELS"
          :key="level.name"
          class="ladder__step"
          :class="{
            'is-current': level.name === game.dawnIdentity,
            'is-owned': level.rank < dawnInfo(game.dawnIdentity)?.rank,
          }"
        >
          {{ level.name }}
        </span>
      </div>
    </section>

    <section v-else-if="view === 'market'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">曙光市场</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <p class="pane__desc">摊位就在哨塔下面，所有标价都用曙光币结算。</p>

      <div class="goods">
        <article v-for="good in DAWN_MARKET" :key="good.id" class="good">
          <img class="good__img" :src="getItem(good.itemId)?.image" :alt="good.name" />
          <div class="good__main">
            <h4 class="good__name">{{ good.name }}</h4>
            <p class="good__note">{{ good.note }}</p>
          </div>
          <div class="good__buy">
            <span>{{ good.price }} 曙光币</span>
            <button type="button" class="btn" @click="run(() => buyDawnGood(good.id))">
              购买
            </button>
          </div>
        </article>
      </div>

      <div class="rows">
        <article class="row">
          <div>
            <h4 class="row__name">远程武器保养</h4>
            <p class="row__desc">
              曙光阵地只保养远程武器。每 1 曙光币擦回 {{ REPAIR_PERCENT_PER_COIN }}%
              清洁度，按缺口一次保养完。
            </p>
            <p v-if="rangedRepair.state === 'empty'" class="row__hint">你还没有装备远程武器。</p>
            <p v-else-if="rangedRepair.state === 'clean'" class="row__hint">
              「{{ rangedRepair.name }}」清洁度已满。
            </p>
            <p v-else class="row__hint">
              「{{ rangedRepair.name }}」清洁度 {{ rangedRepair.current }} / {{ CLEANLINESS_MAX }} ·
              保养需 {{ rangedRepair.cost }} 曙光币
            </p>
          </div>
          <button type="button" class="btn" @click="run(repairRangedDawn)">
            保养 · {{ rangedRepair.cost || 0 }} 曙光币
          </button>
        </article>
      </div>
    </section>

    <section v-else-if="view === 'salvage'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">物资回收</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <p class="pane__desc">
        背包里的多余武器都可以交上来，按品质结算曙光币。装备中的武器不收。
      </p>
      <div class="chips">
        <span>普通 1</span>
        <span>稀有 3</span>
        <span>精良 5</span>
        <span>史诗 7</span>
        <span>传说 9</span>
        <span>神话 12</span>
      </div>

      <div v-if="salvageList.length" class="goods">
        <article v-for="entry in salvageList" :key="entry.index" class="good">
          <img class="good__img" :src="entry.def.image" :alt="entry.def.name" />
          <div class="good__main">
            <h4 class="good__name">{{ entry.def.name }}</h4>
            <p class="good__note">
              {{ entry.def.tier }} · {{ entry.def.category === 'melee' ? '近战武器' : '远程武器' }}
            </p>
          </div>
          <div class="good__buy">
            <span>{{ entry.price }} 曙光币</span>
            <button
              type="button"
              class="btn"
              @click="run(() => recycleWeapon(entry.index))"
            >
              回收
            </button>
          </div>
        </article>
      </div>
      <p v-else class="pane__note">背包里没有可回收的多余武器。</p>
    </section>

    <section v-else-if="view === 'leader'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">首领·羿阳</h3>
        <button v-if="!battle.active" type="button" class="link" @click="backToMenu">
          ← 返回选项
        </button>
      </header>

      <template v-if="battle.active || battle.finished">
        <BattleView @done="leaderDone" />
      </template>

      <template v-else-if="game.flags.dawnLeaderKilled">
        <p class="pane__desc">
          哨塔顶层只剩一把空椅子。桌上摊着附近街区的地图，名册翻到一半，笔还搁在页边。
        </p>
      </template>

      <template v-else>
        <p class="pane__desc">{{ leaderIntro }}</p>

        <QuestLinePanel owner="yiyang" @feedback="feed = $event" />

        <div class="assassinate">
          <h4 class="assassinate__title">刺杀</h4>
          <p class="assassinate__desc">
            哨塔顶层的门没有锁。他背对着你，手按在刀柄上，地图压着半个街区。
          </p>
          <p v-if="!canAssassinate" class="pane__note">
            你还没有接到要杀他的命令。等他交代完手上的事，再来想别的。
          </p>
          <button
            v-else
            type="button"
            class="btn btn--primary pane__action"
            @click="assassinate"
          >
            动手
          </button>
        </div>
      </template>
    </section>

    <section v-else-if="view === 'nutritionist'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">营养师·苏涵</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <p class="pane__desc">{{ QUEST_OWNERS.nutritionist.intro }}</p>

      <div class="service">
        <h4 class="service__title">每日配餐</h4>
        <p class="service__desc">
          苏涵会在配餐台上留一份热食。食物和饮品随机，酒不算在配餐里。
        </p>
        <div class="chips">
          <span>{{ DAWN_SERVICE.meal.price }} 曙光币</span>
          <span>随机食物 / 饮品 ×1</span>
          <span>每天一次</span>
          <span>{{ mealLeft > 0 ? `冷却 ${mealLeft} 天` : '今日可领' }}</span>
        </div>
        <button
          type="button"
          class="btn btn--primary pane__action"
          @click="run(nutritionistMeal)"
        >
          换一份配餐 · {{ DAWN_SERVICE.meal.price }} 曙光币
        </button>
      </div>

      <QuestLinePanel owner="nutritionist" @feedback="feed = $event" />
    </section>

    <section v-else-if="view === 'mechanic'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">机械师·莉莉</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <p class="pane__desc">{{ QUEST_OWNERS.mechanic.intro }}</p>

      <div class="service">
        <h4 class="service__title">药剂调配</h4>
        <p class="service__desc">
          莉莉会熬一支清除感染的药剂。当前感染：{{ game.stats.infection }}。
        </p>
        <div class="chips">
          <span>{{ DAWN_SERVICE.brew.price }} 曙光币</span>
          <span>感染 -{{ DAWN_SERVICE.brew.infection }}</span>
          <span>每天一次</span>
          <span>{{ brewLeft > 0 ? `冷却 ${brewLeft} 天` : '今日可调配' }}</span>
        </div>
        <button
          type="button"
          class="btn btn--primary pane__action"
          @click="run(lilyBrewMedicine)"
        >
          调配药剂 · {{ DAWN_SERVICE.brew.price }} 曙光币
        </button>
      </div>

      <div class="service">
        <h4 class="service__title">远程武器回收</h4>
        <p class="service__desc">
          背包里的远程武器可以拆成零件，按品质结算曙光币。装备中的武器不收。
        </p>
        <div v-if="recyclables.length" class="goods">
          <article v-for="entry in recyclables" :key="entry.index" class="good">
            <img class="good__img" :src="entry.def.image" :alt="entry.def.name" />
            <div class="good__main">
              <h4 class="good__name">{{ entry.def.name }}</h4>
              <p class="good__note">{{ entry.def.tier }} · 回收价 {{ entry.price }} 曙光币</p>
            </div>
            <div class="good__buy">
              <span>{{ entry.price }} 曙光币</span>
              <button
                type="button"
                class="btn"
                @click="run(() => recycleRangedWeapon(entry.index))"
              >
                拆解
              </button>
            </div>
          </article>
        </div>
        <p v-else class="pane__note">背包里没有可回收的远程武器。</p>
      </div>

      <QuestLinePanel owner="mechanic" @feedback="feed = $event" />
    </section>

    <section v-else-if="view === 'mercenary'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">雇佣兵·薇尔</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <p class="pane__desc">{{ QUEST_OWNERS.mercenary.intro }}</p>

      <div class="service">
        <h4 class="service__title">训练</h4>
        <p class="service__desc">薇尔会带你练一轮。消耗 1 回合，体力与理智回升。</p>
        <div class="chips">
          <span>{{ DAWN_SERVICE.training.price }} 曙光币</span>
          <span>体力 +{{ DAWN_SERVICE.training.stamina }}</span>
          <span>理智 +{{ DAWN_SERVICE.training.sanity }}</span>
          <span>消耗 1 回合</span>
          <span>{{ trainingLeft > 0 ? `冷却 ${trainingLeft} 天` : '今日可训练' }}</span>
        </div>
        <button
          type="button"
          class="btn btn--primary pane__action"
          @click="run(mercenaryTraining)"
        >
          跟她练一轮 · {{ DAWN_SERVICE.training.price }} 曙光币
        </button>
      </div>

      <QuestLinePanel owner="mercenary" @feedback="feed = $event" />
    </section>

    <section v-else-if="view === 'agronomist'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">农学家·苗苗</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <p class="pane__desc">{{ QUEST_OWNERS.agronomist.intro }}</p>

      <div class="service">
        <h4 class="service__title">照看实验田</h4>
        <p class="service__desc">
          翻开土、浇两桶水。田里会结出随机水果，进度攒满后她会告诉你一个秘密。
        </p>
        <div class="chips">
          <span>消耗 {{ DAWN_SERVICE.tend.turns }} 回合</span>
          <span>随机水果 ×1</span>
          <span>每天一次</span>
          <span>田地进度 {{ fieldProgress }} / {{ DAWN_SERVICE.fieldSecretAt }}</span>
          <span>{{ tendLeft > 0 ? `冷却 ${tendLeft} 天` : '今日可照看' }}</span>
        </div>
        <button
          type="button"
          class="btn btn--primary pane__action"
          @click="run(tendExperimentField)"
        >
          照看实验田 · {{ DAWN_SERVICE.tend.turns }} 回合
        </button>
      </div>

      <div v-if="seedFound" class="service service--seed">
        <h4 class="service__title">腐烂的种子</h4>
        <template v-if="seedPlanted">
          <p class="service__desc">
            果苗已经扎下根了。苗苗每天收工前都要去看一眼，回来时鞋底全是湿泥。
          </p>
        </template>
        <template v-else-if="seedSprouted">
          <p class="service__desc">
            芽是顶出来了，但根还太浅。她说要把周围一圈土养住，得再凑
            {{ ROTTEN_SEED.plantFruits }} 份水果。
          </p>
          <div class="chips">
            <span>水果 {{ fruitCount }} / {{ ROTTEN_SEED.plantFruits }}</span>
            <span>消耗 {{ ROTTEN_SEED.plantTurns }} 回合</span>
            <span>会触发结局</span>
          </div>
          <button
            type="button"
            class="btn btn--primary pane__action"
            :disabled="fruitCount < ROTTEN_SEED.plantFruits"
            @click="run(plantRottenSeed)"
          >
            移栽果苗 · {{ ROTTEN_SEED.plantTurns }} 回合
          </button>
        </template>
        <template v-else>
          <p class="service__desc">
            你把那枚烂透的种子放到她手心。她捏着看了很久，说：还能救，拿
            {{ ROTTEN_SEED.sproutFruits }} 份水果来，我给它育苗。
          </p>
          <div class="chips">
            <span>水果 {{ fruitCount }} / {{ ROTTEN_SEED.sproutFruits }}</span>
            <span>消耗 {{ ROTTEN_SEED.sproutTurns }} 回合</span>
            <span>需要腐烂种子</span>
          </div>
          <button
            type="button"
            class="btn btn--primary pane__action"
            :disabled="fruitCount < ROTTEN_SEED.sproutFruits"
            @click="run(sproutRottenSeed)"
          >
            交给她育苗 · {{ ROTTEN_SEED.sproutTurns }} 回合
          </button>
        </template>
      </div>

      <div v-if="fieldReady" class="service service--secret">
        <h4 class="service__title">她有个秘密</h4>
        <p class="service__desc">
          {{
            game.flags.fieldSecret
              ? '苗苗把日记本收进抽屉，钥匙挂在脖子上。她说，那块地现在也有人替她记着了。'
              : '田已经长到第五垄。苗苗把手上的泥擦干净，说想带你看一样东西。'
          }}
        </p>
        <button
          v-if="!game.flags.fieldSecret"
          type="button"
          class="btn btn--primary pane__action"
          @click="run(revealFieldSecret)"
        >
          听她说
        </button>
      </div>

      <QuestLinePanel owner="agronomist" @feedback="feed = $event" />
    </section>

    <section v-else class="pane">
      <header class="pane__head">
        <h3 class="pane__title">{{ placeholder?.name }}</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <div class="placeholder">
        <span class="eyebrow">占位 · {{ placeholder?.name }}</span>
        <p>
          {{ placeholder?.desc }}这里还没有内容，会在后续版本接入。
        </p>
      </div>
    </section>

    <template #footer>
      <span class="feed">{{ feed }}</span>
      <div class="foot-btns">
        <button
          v-if="view !== 'menu' && !battle.active"
          type="button"
          class="btn"
          @click="backToMenu"
        >
          返回选项
        </button>
        <button type="button" class="btn" @click="closePanel">离开曙光</button>
      </div>
    </template>
  </ModalShell>
</template>

<style scoped>
.status {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.28);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.status b {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--bone);
}

.status__risk {
  margin-left: auto;
  color: var(--sick);
  border: 1px solid rgba(124, 152, 64, 0.45);
  padding: 2px 8px;
  font-size: 10px;
  letter-spacing: 0.12em;
}

.menu {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
  cursor: pointer;
  transition: 0.22s;
}

.card:hover {
  border-color: rgba(193, 74, 50, 0.55);
  background: rgba(193, 74, 50, 0.07);
}

.card__no {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-mute);
  padding-top: 3px;
}

.card__name {
  margin: 0;
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--text);
}

.card__desc {
  margin: 6px 0 0;
  font-size: 10.5px;
  line-height: 1.7;
  color: var(--text-mute);
}

.card__arrow {
  margin-left: auto;
  color: var(--text-mute);
}

.pane {
  margin-top: 14px;
  padding: 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.02);
}

.pane__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.pane__title {
  margin: 0;
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--text);
}

.link {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
  cursor: pointer;
}

.link:hover {
  color: var(--bone);
}

.pane__desc {
  margin: 14px 0 0;
  font-size: 11.5px;
  line-height: 1.85;
  letter-spacing: 0.03em;
  color: var(--text-dim);
}

.pane__note {
  margin: 12px 0 0;
  font-size: 10.5px;
  color: var(--text-mute);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 14px;
}

.chips span {
  padding: 3px 9px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--bone);
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.2);
}

.pane__action {
  margin-top: 16px;
  height: 36px;
  font-size: 12px;
}

.identity {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.22);
}

.identity__badge {
  width: 62px;
  height: 62px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-strong);
}

.identity__badge img {
  width: 82%;
  height: 82%;
  object-fit: contain;
}

.identity__badge span {
  font-size: 12px;
  color: var(--text-mute);
}

.identity__info h4 {
  margin: 0;
  font-family: var(--font-title);
  font-size: 16px;
  letter-spacing: 0.12em;
  color: var(--text);
}

.identity__info p {
  margin: 5px 0 0;
  font-size: 10.5px;
  color: var(--text-mute);
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 14px;
  background: var(--line);
  border: 1px solid var(--line);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 14px;
  background: #0d0f10;
}

.row__name {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.1em;
  color: var(--text);
}

.row__desc {
  margin: 5px 0 0;
  font-size: 10.5px;
  line-height: 1.7;
  color: var(--text-mute);
}

.row__hint {
  margin: 5px 0 0;
  font-family: var(--font-mono);
  font-size: 9.5px;
  line-height: 1.6;
  color: var(--bone);
}

.row .btn {
  height: 30px;
  padding: 0 14px;
  font-size: 11px;
  flex: none;
}

.ladder {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--line);
}

.ladder__step {
  padding: 3px 8px;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
  border: 1px solid var(--line);
}

.ladder__step.is-owned {
  color: var(--text-dim);
  border-color: var(--line-strong);
}

.ladder__step.is-current {
  color: var(--bone);
  border-color: rgba(193, 74, 50, 0.6);
  background: rgba(193, 74, 50, 0.1);
}

.goods {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.good {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border: 1px solid var(--line);
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

.good__main {
  min-width: 0;
  flex: 1;
}

.good__name {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.1em;
  color: var(--text);
}

.good__note {
  margin: 4px 0 0;
  font-size: 10px;
  line-height: 1.6;
  color: var(--text-mute);
}

.good__buy {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.good__buy span {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--bone);
}

.good__buy .btn {
  height: 28px;
  padding: 0 12px;
  font-size: 10.5px;
}

.placeholder {
  margin-top: 16px;
  padding: 28px 24px;
  border: 1px dashed var(--line-strong);
  text-align: center;
}

.service {
  margin-top: 14px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  background: #0d0f10;
}

.service__title {
  margin: 0;
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--text);
}

.service__desc {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.8;
  color: var(--text-dim);
}

.service--secret {
  border-color: rgba(124, 152, 64, 0.4);
  background: rgba(124, 152, 64, 0.05);
}

.service--secret .service__title {
  color: var(--sick);
}

.assassinate {
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid rgba(193, 74, 50, 0.35);
  background: rgba(193, 74, 50, 0.06);
}

.assassinate__title {
  margin: 0;
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--rust-soft);
}

.assassinate__desc {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.8;
  color: var(--text-dim);
}

.placeholder p {
  max-width: 460px;
  margin: 12px auto 0;
  font-size: 11.5px;
  line-height: 1.9;
  color: var(--text-mute);
}

.feed {
  flex: 1;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-dim);
}

.foot-btns {
  display: flex;
  gap: 8px;
  flex: none;
}

.foot-btns .btn {
  height: 30px;
  padding: 0 12px;
  font-size: 10.5px;
}

@media (max-width: 900px) {
  .menu {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 620px) {
  .menu {
    grid-template-columns: 1fr;
  }

  .row {
    flex-wrap: wrap;
  }
}
</style>
