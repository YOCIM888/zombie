<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  CLEANLINESS_MAX,
  CORRIDOR,
  DAWN_IDENTITY_LEVELS,
  DAWN_JOIN_KILLS,
  DAWN_BOND_SHOP,
  DAWN_MARKET,
  DAWN_NPCS,
  DAWN_PROMOTIONS,
  DAWN_RECYCLE_RANGES,
  DAWN_RELIEF_TIERS,
  DAWN_SALARY,
  DAWN_SERVICE,
  QUEST_OWNERS,
  REPAIR_PERCENT_PER_COIN,
  ROTTEN_SEED,
  TALENTS,
  TALENT_EFFECT_LABELS,
  UTOPIA_TRAINING_BY_KIND,
  dawnInfo,
  countItem,
  getItem,
  npcById,
  mapBackground,
  repairCoinCost,
  repairPriceForTier,
  recyclePriceForDay,
  dawnRecyclePrices,
  talentEffects,
  talentTitle,
} from '../data'
import { MAPS } from '../game/config'
import {
  claimDawnRelief,
  claimDawnSalary,
  cooldownLeft,
  corridorFight,
  corridorLeft,
  countFruits,
  currentPhase,
  game,
  buyDawnBond,
  buyDawnGood,
  isNpcDead,
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
  utopiaTrain,
  utopiaTrainingLeft,
  utopiaTrainingLimit,
  weaponRecyclables,
} from '../game/store'
import { battle, resetBattle, startDawnCombat, startLeaderCombat } from '../game/battle'
import AssassinationCard from './AssassinationCard.vue'
import BattleView from './BattleView.vue'
import MapMenuList from './MapMenuList.vue'
import ModalShell from './ModalShell.vue'
import NpcIntro from './NpcIntro.vue'
import QuestLinePanel from './QuestLinePanel.vue'
import StatusHud from './StatusHud.vue'

const MENU = [
  { id: 'fight', no: '01', name: '清理丧尸', desc: '消耗 1 回合（有衰减），进入手动回合制战斗。' },
  { id: 'relief', no: '02', name: '领取救济', desc: '每天一次，五档按曙光身份开放：普通 / 基础 / 进阶 / 高级 / 特级。' },
  { id: 'contact', no: '03', name: '联系管事', desc: '徽章补办、加入曙光，或申请晋升。' },
  { id: 'salary', no: '04', name: '每日工资', desc: '按曙光身份发放，每天一次：队员 2、队长 5、指挥 8、副首 10 曙光币。' },
  ...DAWN_NPCS.map((npc) => ({ ...npc, placeholder: !npc.implemented })),
  { id: 'market', no: '10', name: '曙光市场', desc: '普通远程武器、绷带与罐头，明码标价。' },
  { id: 'bond', no: '11', name: '羁绊商店', desc: '提交四种纪念徽章之一，各换一件限定武器。' },
  { id: 'salvage', no: '12', name: '物资回收', desc: '背包里的多余武器按品质结算曙光币，回收价每日浮动。' },
  { id: 'corridor', no: '13', name: '行尸走廊', desc: '赤手空拳穿过走廊，每天两次，提升远程闪避天赋。' },
  { id: 'slash', no: '14', name: '武艺切磋', desc: '装备任意近战武器切磋：1 回合、10 耐久，每天两次，提升挥砍天赋。' },
]

const map = MAPS.find((item) => item.id === 'dawn-post')
const emit = defineEmits(['close'])
const view = ref('menu')
const selected = ref(null)
const feed = ref('哨塔的探照灯扫过来，有人朝你抬了抬下巴，算是放行。')
const pendingRecycle = ref(null)

const identity = computed(() => dawnInfo(game.dawnIdentity))
const dawnRank = computed(() => identity.value?.rank ?? -1)
const reliefLeft = computed(() => cooldownLeft('dawn-relief', 1))
const salaryLeft = computed(() => cooldownLeft('dawn-salary', 1))
const salary = computed(
  () =>
    DAWN_SALARY.find((item) => item.rank === (identity.value?.rank ?? -1)) ?? null,
)
const joinLeft = computed(() => Math.max(0, DAWN_JOIN_KILLS - game.zombieKills))

function bondBadgeCount(good) {
  return countItem(game.inventory, good.badgeId)
}
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
const nutritionistDead = computed(() => isNpcDead('nutritionist'))
const mechanicDead = computed(() => isNpcDead('mechanic'))
const mercenaryDead = computed(() => isNpcDead('mercenary'))
const agronomistDead = computed(() => isNpcDead('agronomist'))
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
  const tier = def?.tier ?? '普通'
  const cost = repairCoinCost(current, CLEANLINESS_MAX, tier)
  return {
    name: def?.name ?? '远程武器',
    current,
    cost,
    tier,
    unitPrice: repairPriceForTier(tier),
    state: cost > 0 ? 'dirty' : 'clean',
  }
})
const corridorLevel = computed(() => Number(game.talents.corridor) || 0)
const corridorMaxLevel = computed(() => TALENTS.corridor.maxLevel)
const corridorFull = computed(() => corridorLevel.value >= corridorMaxLevel.value)
const corridorProgress = computed(() =>
  corridorFull.value ? 100 : Math.max(0, Math.min(99, Number(game.training.corridor) || 0)),
)
const corridorRemaining = computed(() => corridorLeft())
const corridorWeaponsEquipped = computed(() =>
  Boolean(game.equipment.melee || game.equipment.ranged),
)
const corridorWeaponText = computed(() => {
  const parts = []
  if (game.equipment.melee) {
    parts.push(`近战：${getItem(game.equipment.melee.id)?.name ?? '已装备'}`)
  }
  if (game.equipment.ranged) {
    parts.push(`远程：${getItem(game.equipment.ranged.id)?.name ?? '已装备'}`)
  }
  return parts.join(' · ')
})
const corridorTitleName = computed(
  () => talentTitle('corridor', corridorLevel.value) || '暂无天赋',
)
const corridorEffectsText = computed(() => {
  const effects = talentEffects('corridor', corridorLevel.value)
  const entries = Object.entries(effects)
  if (!entries.length) return '—'
  return entries
    .map(([key, value]) => {
      const label = TALENT_EFFECT_LABELS[key] ?? key
      return `${label} +${key === 'damage' ? value : Math.round(value * 100) + '%'}`
    })
    .join(' · ')
})
const corridorCanFight = computed(
  () =>
    !game.dead &&
    !corridorWeaponsEquipped.value &&
    !corridorFull.value &&
    corridorRemaining.value > 0,
)
const corridorActionLabel = computed(() => {
  if (corridorFull.value) return '远程闪避天赋已满级'
  if (corridorWeaponsEquipped.value) return '请先卸下所有武器'
  if (corridorRemaining.value <= 0) return '今日走廊次数已用完'
  return '进入行尸走廊 · 1 回合'
})

const slashTraining = UTOPIA_TRAINING_BY_KIND.slash
const slashLevel = computed(() => Number(game.talents.slash) || 0)
const slashMaxLevel = TALENTS.slash.maxLevel
const slashFull = computed(() => slashLevel.value >= slashMaxLevel)
const slashProgress = computed(() =>
  slashFull.value ? 100 : Math.max(0, Math.min(99, Number(game.training.slash) || 0)),
)
const slashRemaining = computed(() => utopiaTrainingLeft('slash'))
const slashMelee = computed(() => game.equipment.melee)
const slashMeleeName = computed(() => {
  const entry = game.equipment.melee
  if (!entry) return '未装备'
  return getItem(entry.id)?.name ?? entry.id
})
const slashMeleeDurability = computed(() => {
  const entry = game.equipment.melee
  const def = entry ? getItem(entry.id) : null
  return { now: entry?.durability ?? 0, max: def?.weapon?.durability ?? 0 }
})
const slashTitleName = computed(() => talentTitle('slash', slashLevel.value) || '暂无天赋')
const slashEffectsText = computed(() => {
  const entries = Object.entries(talentEffects('slash', slashLevel.value))
  if (!entries.length) return '—'
  return entries
    .map(([key, value]) => `近战武器${TALENT_EFFECT_LABELS[key] ?? key} +${value}`)
    .join(' · ')
})
const slashCanTrain = computed(
  () =>
    !game.dead &&
    Boolean(slashMelee.value) &&
    !slashFull.value &&
    slashRemaining.value > 0,
)
const slashActionLabel = computed(() => {
  if (slashFull.value) return '挥砍天赋已满级'
  if (!slashMelee.value) return '请先装备近战武器'
  if (slashRemaining.value <= 0) return '今日切磋次数已用完'
  return '切磋一次 · 1 回合 · 耐久 10'
})

function trainSlash() {
  run(() => utopiaTrain('slash'))
}

const recyclables = computed(() =>
  game.inventory
    .map((entry, index) => {
      const def = entry ? getItem(entry.id) : null
      if (!def || def.category !== 'ranged') return null
      return { index, def, price: recyclePriceForDay(def.tier, game.day) }
    })
    .filter(Boolean),
)
const salvageList = computed(() => weaponRecyclables())
const recyclePrices = computed(() => dawnRecyclePrices(game.day))

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

/** 回收武器：限定品质先弹窗二次确认，其余直接回收 */
function askRecycle(entry, mode) {
  if (entry.def.tier === '限定') {
    pendingRecycle.value = { ...entry, mode }
    return
  }
  runRecycle(entry.index, mode)
}

function runRecycle(index, mode) {
  run(() => (mode === 'ranged' ? recycleRangedWeapon(index) : recycleWeapon(index)))
}

function cancelRecycle() {
  pendingRecycle.value = null
}

function confirmRecycle() {
  const target = pendingRecycle.value
  pendingRecycle.value = null
  if (!target) return
  runRecycle(target.index, target.mode)
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
  const wasAssassination = battle.kind === 'assassination'
  const summary = battle.summary
  resetBattle()
  view.value = 'leader'
  if (wasAssassination) {
    feed.value = summary || '你把他留在了那把椅子上。'
    return
  }
  feed.value = game.flags.dawnLeaderKilled
    ? '哨塔顶层安静下来。你把他留在了那把椅子上。'
    : '你退回了楼梯口，门在身后重新合上。'
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
    :bg="mapBackground(game.location)"
    @close="closePanel"
  >
    <template #hud>
      <StatusHud />
    </template>

    <MapMenuList v-if="view === 'menu'" :items="MENU" @select="go" />

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
      <p class="pane__desc">
        物资箱里堆着附近农场送来的水果，旁边压着一格药品。五档救济按曙光身份开放，共用每天一次，管事会盯着你的手。
      </p>
      <p class="cure__note">
        {{
          reliefLeft > 0
            ? `今日救济已领取，${reliefLeft} 天后可再次领取`
            : '今天还没有领取救济'
        }}
      </p>
      <div class="rows">
        <article v-for="tier in DAWN_RELIEF_TIERS" :key="tier.id" class="row">
          <div>
            <h4 class="row__name">
              {{ tier.name }}
              <span class="row__rank">{{ tier.identity }}</span>
            </h4>
            <p class="row__desc">{{ tier.desc }}</p>
            <p class="row__meta">
              <span>一种随机水果 ×{{ tier.fruitCount }}</span>
              <span v-for="entry in tier.items" :key="entry.itemId">
                {{ getItem(entry.itemId)?.name ?? entry.itemId }} ×{{ entry.qty }}
              </span>
              <span>免费 · 共享每日次数</span>
            </p>
          </div>
          <button
            type="button"
            class="btn"
            :disabled="reliefLeft > 0 || dawnRank < tier.rank"
            @click="run(() => claimDawnRelief(tier.id))"
          >
            {{
              dawnRank < tier.rank
                ? `需${tier.identity}`
                : reliefLeft > 0
                  ? `${reliefLeft} 天后`
                  : '领取'
            }}
          </button>
        </article>
      </div>
    </section>

    <section v-else-if="view === 'salary'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">每日工资</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <p class="pane__desc">
        管事按身份发工资，四档共用每天一次。身份越高，信封越厚。
      </p>
      <div class="chips">
        <span v-for="item in DAWN_SALARY" :key="item.rank">
          {{ item.identity }} · {{ item.coins }} 曙光币
        </span>
      </div>
      <div class="identity">
        <div class="identity__badge">
          <img v-if="identity" :src="identity.image" :alt="identity.name" />
          <span v-else>无</span>
        </div>
        <div class="identity__info">
          <h4>{{ game.dawnIdentity ?? '尚无曙光身份' }}</h4>
          <p>当前档位工资：{{ salary ? `${salary.coins} 曙光币` : '无' }}</p>
        </div>
      </div>
      <p class="cure__note">
        {{
          !salary
            ? '先联系管事加入曙光，才有工资可领。'
            : salaryLeft > 0
              ? `今日工资已领取，${salaryLeft} 天后可再次领取。`
              : '今天的工资还没有领。'
        }}
      </p>
      <button
        type="button"
        class="btn btn--primary pane__action"
        :disabled="!salary || salaryLeft > 0"
        @click="run(claimDawnSalary)"
      >
        {{
          !salary
            ? '需先加入曙光'
            : salaryLeft > 0
              ? `${salaryLeft} 天后可领`
              : `领取 ${salary.coins} 曙光币`
        }}
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
              曙光阵地只保养远程武器。保养费按品质计价（每 {{ REPAIR_PERCENT_PER_COIN }}%
              缺口 1～10 曙光币），按缺口一次保养完。
            </p>
            <p v-if="rangedRepair.state === 'empty'" class="row__hint">你还没有装备远程武器。</p>
            <p v-else-if="rangedRepair.state === 'clean'" class="row__hint">
              「{{ rangedRepair.name }}」清洁度已满。
            </p>
            <p v-else class="row__hint">
              「{{ rangedRepair.name }}」清洁度 {{ rangedRepair.current }} / {{ CLEANLINESS_MAX }} ·
              {{ rangedRepair.tier }}品质每 {{ REPAIR_PERCENT_PER_COIN }}% 缺口 {{ rangedRepair.unitPrice }} 曙光币 ·
              保养需 {{ rangedRepair.cost }} 曙光币
            </p>
          </div>
          <button type="button" class="btn" @click="run(repairRangedDawn)">
            保养 · {{ rangedRepair.cost || 0 }} 曙光币
          </button>
        </article>
      </div>
    </section>

    <section v-else-if="view === 'bond'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">羁绊商店</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <p class="pane__desc">
        柜台后的人不收币，只收信物。四枚纪念徽章各对应一件限定武器，还要补 365
        曙光币——他说这是「把关系走完的价」。
      </p>

      <div class="goods">
        <article v-for="good in DAWN_BOND_SHOP" :key="good.id" class="good">
          <img class="good__img" :src="getItem(good.itemId)?.image" :alt="good.name" />
          <div class="good__main">
            <h4 class="good__name">
              {{ good.name }}
              <span class="good__tier">限定</span>
            </h4>
            <p class="good__note">{{ good.note }}</p>
            <p class="good__req">
              {{ good.badgeName }} ×1
              <span :class="{ 'good__req--ok': bondBadgeCount(good) > 0 }">
                {{ bondBadgeCount(good) > 0 ? `（持有 ${bondBadgeCount(good)}）` : '（未持有）' }}
              </span>
              · {{ good.price }} 曙光币
            </p>
          </div>
          <div class="good__buy">
            <span>{{ good.price }} 曙光币</span>
            <button type="button" class="btn" @click="run(() => buyDawnBond(good.id))">
              兑换
            </button>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="view === 'salvage'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">物资回收</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <p class="pane__desc">
        背包里的多余武器都可以交上来，按品质结算曙光币。回收价每天重新浮动，同一天内固定。
      </p>
      <div class="chips">
        <span v-for="(range, tier) in DAWN_RECYCLE_RANGES" :key="tier">
          {{ tier }} 今日 {{ recyclePrices[tier] }}（{{ range[0] === range[1] ? range[0] : `${range[0]}~${range[1]}` }}）
        </span>
      </div>
      <p class="pane__note">今日回收价 · 第 {{ game.day }} 天</p>

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
              @click="askRecycle(entry, 'salvage')"
            >
              回收
            </button>
          </div>
        </article>
      </div>
      <p v-else class="pane__note">背包里没有可回收的多余武器。</p>
    </section>

    <section v-else-if="view === 'corridor'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">{{ CORRIDOR.title }}</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <p class="pane__desc">{{ CORRIDOR.desc }}</p>
      <div class="chips">
        <span>必须空手 · 不装备近战/远程武器</span>
        <span>消耗 {{ CORRIDOR.turns }} 回合（有衰减）</span>
        <span>生命 -{{ CORRIDOR.hpCost }}</span>
        <span>感染 +{{ CORRIDOR.infectionCost }}</span>
        <span>每天 {{ CORRIDOR.dailyLimit }} 次</span>
        <span>今日剩余 {{ corridorRemaining }} 次</span>
      </div>
      <div class="chips">
        <span>远程闪避天赋 {{ corridorTitleName }} · Lv.{{ corridorLevel }}/{{ corridorMaxLevel }}</span>
        <span>熟练度 {{ corridorProgress }} / 100</span>
        <span>当前加成 {{ corridorEffectsText }}</span>
      </div>
      <div class="corridor__track">
        <div class="corridor__track-fill" :style="{ width: corridorProgress + '%' }" />
      </div>
      <p class="corridor__warn">
        {{
          corridorFull
            ? '远程闪避天赋已经练到顶点。'
            : '感染值加上 30 后达到 100 会触发「尸变」，生命不足 30 也会直接死亡。'
        }}
      </p>
      <p v-if="corridorWeaponsEquipped" class="corridor__warn">
        {{ corridorWeaponText }} · 必须全部卸下
      </p>
      <button
        type="button"
        class="btn btn--primary pane__action"
        :disabled="!corridorCanFight"
        @click="run(corridorFight)"
      >
        {{ corridorActionLabel }}
      </button>
    </section>

    <section v-else-if="view === 'slash'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">武艺切磋</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <p class="pane__desc">{{ slashTraining.desc }}</p>
      <div class="chips">
        <span>必须装备任意近战武器</span>
        <span>消耗 1 回合（有衰减）</span>
        <span>武器耐久 -10</span>
        <span>每天 {{ utopiaTrainingLimit('slash') }} 次</span>
        <span>今日剩余 {{ slashRemaining }} 次</span>
      </div>
      <div class="chips">
        <span>挥砍天赋 {{ slashTitleName }} · Lv.{{ slashLevel }}/{{ slashMaxLevel }}</span>
        <span>熟练度 {{ slashProgress }} / 100</span>
        <span>当前加成 {{ slashEffectsText }}</span>
        <span>当前近战 {{ slashMeleeName }} · 耐久 {{ slashMeleeDurability.now }} / {{ slashMeleeDurability.max }}</span>
      </div>
      <div class="corridor__track">
        <div class="corridor__track-fill" :style="{ width: slashProgress + '%' }" />
      </div>
      <p class="corridor__warn">
        {{
          slashFull
            ? '挥砍天赋已经练到顶点。'
            : '每次切磋随机获得 5–10 点熟练度；耐久不足 10 点时无法训练。'
        }}
      </p>
      <p v-if="!slashMelee" class="corridor__warn">未装备近战武器 · 必须装备任意近战武器才能切磋</p>
      <button
        type="button"
        class="btn btn--primary pane__action"
        :disabled="!slashCanTrain"
        @click="trainSlash"
      >
        {{ slashActionLabel }}
      </button>
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
        <NpcIntro npc-id="yiyang">
          <p class="pane__desc">{{ leaderIntro }}</p>
        </NpcIntro>

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

        <AssassinationCard npc-id="dawn-leader" @feedback="feed = $event" />
      </template>
    </section>

    <section v-else-if="view === 'nutritionist'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">营养师·苏涵</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <NpcIntro npc-id="nutritionist">
        <p class="pane__desc">
          {{ nutritionistDead ? npcById('nutritionist').deathLine : QUEST_OWNERS.nutritionist.intro }}
        </p>
      </NpcIntro>

      <div v-if="!nutritionistDead" class="service">
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

      <QuestLinePanel v-if="!nutritionistDead" owner="nutritionist" @feedback="feed = $event" />
      <AssassinationCard npc-id="nutritionist" @feedback="feed = $event" />
    </section>

    <section v-else-if="view === 'mechanic'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">机械师·莉莉</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <NpcIntro npc-id="mechanic">
        <p class="pane__desc">
          {{ mechanicDead ? npcById('mechanic').deathLine : QUEST_OWNERS.mechanic.intro }}
        </p>
      </NpcIntro>

      <div v-if="!mechanicDead" class="service">
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

      <div v-if="!mechanicDead" class="service">
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
                @click="askRecycle(entry, 'ranged')"
              >
                拆解
              </button>
            </div>
          </article>
        </div>
        <p v-else class="pane__note">背包里没有可回收的远程武器。</p>
      </div>

      <QuestLinePanel v-if="!mechanicDead" owner="mechanic" @feedback="feed = $event" />
      <AssassinationCard npc-id="mechanic" @feedback="feed = $event" />
    </section>

    <section v-else-if="view === 'mercenary'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">雇佣兵·薇尔</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <NpcIntro npc-id="mercenary">
        <p class="pane__desc">
          {{ mercenaryDead ? npcById('mercenary').deathLine : QUEST_OWNERS.mercenary.intro }}
        </p>
      </NpcIntro>

      <div v-if="!mercenaryDead" class="service">
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

      <QuestLinePanel v-if="!mercenaryDead" owner="mercenary" @feedback="feed = $event" />
      <AssassinationCard npc-id="mercenary" @feedback="feed = $event" />
    </section>

    <section v-else-if="view === 'agronomist'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">农学家·苗苗</h3>
        <button type="button" class="link" @click="backToMenu">← 返回选项</button>
      </header>
      <NpcIntro npc-id="agronomist">
        <p class="pane__desc">
          {{ agronomistDead ? npcById('agronomist').deathLine : QUEST_OWNERS.agronomist.intro }}
        </p>
      </NpcIntro>

      <div v-if="!agronomistDead" class="service">
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

      <div v-if="!agronomistDead && seedFound" class="service service--seed">
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

      <div v-if="!agronomistDead && fieldReady" class="service service--secret">
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

      <QuestLinePanel v-if="!agronomistDead" owner="agronomist" @feedback="feed = $event" />
      <AssassinationCard npc-id="agronomist" @feedback="feed = $event" />
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

    <Teleport to="body">
      <ModalShell
        v-if="pendingRecycle"
        title="确认回收限定武器？"
        :sub="`${pendingRecycle.def.name} · ${pendingRecycle.def.tier}`"
        @close="cancelRecycle"
      >
        <div class="chips">
          <span>限定武器 · 回收价固定 {{ pendingRecycle.price }} 曙光币</span>
          <span>{{ pendingRecycle.mode === 'ranged' ? '拆成零件' : '上交回收' }}</span>
        </div>
        <p class="pane__desc">
          回收后「{{ pendingRecycle.def.name }}」会永久离开背包，无法找回，也不能撤销。
        </p>
        <template #footer>
          <span>限定武器只有这一件</span>
          <div class="foot-btns">
            <button type="button" class="btn" @click="cancelRecycle">再想想</button>
            <button type="button" class="btn btn--primary" @click="confirmRecycle">
              确认回收
            </button>
          </div>
        </template>
      </ModalShell>
    </Teleport>

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

.corridor__warn {
  margin: 0;
  padding: 7px 9px;
  font-size: 10px;
  line-height: 1.7;
  letter-spacing: 0.04em;
  color: var(--rust-soft);
  border: 1px solid rgba(193, 74, 50, 0.4);
  background: rgba(193, 74, 50, 0.08);
}

.corridor__track {
  height: 4px;
  background: rgba(214, 208, 191, 0.12);
  overflow: hidden;
}

.corridor__track-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--rust), var(--rust-soft));
  transition: width 0.4s ease;
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
  background: rgba(8, 10, 11, 0.58);
  -webkit-backdrop-filter: blur(6px) saturate(0.92);
  backdrop-filter: blur(6px) saturate(0.92);
  transition: background 0.2s;
}

.row:hover {
  background: rgba(193, 74, 50, 0.12);
}

.row__name {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.1em;
  color: var(--text);
}

.row__rank {
  margin-left: 8px;
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.06em;
  color: var(--bone);
  border: 1px solid var(--line);
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
  background: rgba(8, 10, 11, 0.58);
  -webkit-backdrop-filter: blur(6px) saturate(0.92);
  backdrop-filter: blur(6px) saturate(0.92);
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

.good__tier {
  margin-left: 8px;
  padding: 1px 6px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: #d8b45a;
  border: 1px solid rgba(216, 180, 90, 0.45);
}

.good__req {
  margin: 4px 0 0;
  font-size: 10.5px;
  color: var(--text-mute);
}

.good__req--ok {
  color: #9cbf6a;
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

@media (max-width: 620px) {
  .row {
    flex-wrap: wrap;
  }
}
</style>
