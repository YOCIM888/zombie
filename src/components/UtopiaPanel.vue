<script setup>
import { computed, reactive, ref } from 'vue'
import {
  FISH_PROCESSING,
  GUILDS,
  KRAKEN_BLADE_CRAFT,
  MAYOR_CYCLE_DAYS,
  MAYOR_LEADERS,
  RESTAURANT_DISHES,
  SERVICE_CENTER_EXPRESS_DAWN,
  SERVICE_PERMITS,
  TAVERN_COCKTAILS,
  TALENTS,
  TALENT_EFFECT_LABELS,
  TRADE_LISTING_LIMIT,
  UTOPIA_TRAININGS,
  WORLD_BOSSES,
  countItem,
  getItem,
  identityRank,
  mayorForDay,
  talentEffects,
  talentTitle,
  tradeFairValue,
  tradeSaleChance,
} from '../data'
import { formatCritDamage, formatPercent } from '../game/format'
import { battle, resetBattle, startMayorSpar, startWorldBossBattle } from '../game/battle'
import {
  activeGuild,
  activeGuildId,
  applyServicePermit,
  begUtopia,
  buyGuildContributionItem,
  buyGuildShopItem,
  claimGuildCommission,
  collectTradeIncome,
  craftKrakenBlade,
  currentPhase,
  delistTradeItem,
  drinkTavernCocktail,
  eatRestaurantDish,
  game,
  guildCommissionState,
  guildContribution,
  guildContributionPurchased,
  guildRequirementState,
  hasServicePermit,
  isTalentActive,
  joinGuild,
  leaveGuild,
  listTradeItem,
  meetActingMayor,
  notify,
  processMutantFish,
  redLightPayForFreedom,
  redLightSellBody,
  utopiaTrain,
  utopiaTrainingLeft,
  utopiaTrainingLimit,
} from '../game/store'
import MapMenuList from './MapMenuList.vue'
import ModalShell from './ModalShell.vue'
import BattleView from './BattleView.vue'
import StatusHud from './StatusHud.vue'

const emit = defineEmits(['close'])

const view = ref('menu')
const feed = ref('')
const placeholder = ref(null)
const trainingKind = ref('')
const hallGuildId = ref('')

const activeTraining = computed(() =>
  UTOPIA_TRAININGS.find((item) => item.kind === trainingKind.value) ?? null,
)
const activeTrainingLevel = computed(() =>
  activeTraining.value ? Number(game.talents[activeTraining.value.kind]) || 0 : 0,
)
const activeTrainingTitle = computed(() => {
  if (!activeTraining.value) return ''
  const level = activeTrainingLevel.value
  return level ? talentTitle(activeTraining.value.kind, level) : '尚未入门'
})
const activeTrainingEffects = computed(() => {
  if (!activeTraining.value || !activeTrainingLevel.value) return {}
  return talentEffects(activeTraining.value.kind, activeTrainingLevel.value)
})
const activeTrainingDef = computed(() =>
  activeTraining.value ? TALENTS[activeTraining.value.kind] : null,
)
const activeTrainingProgress = computed(() =>
  activeTraining.value ? Number(game.training[activeTraining.value.kind]) || 0 : 0,
)

const guild = computed(() => activeGuild())
const hasGuild = computed(() => Boolean(activeGuildId()))

const guildCards = computed(() =>
  GUILDS.map((item) => ({
    ...item,
    badgeImage: getItem(item.badgeId)?.image ?? '',
    state: guildRequirementState(item.id),
  })),
)

const GUILD_HALLS = computed(() =>
  GUILDS.map((item) => {
    const owned = activeGuildId() === item.id
    return {
      id: `hall-${item.id}`,
      name: `${item.name}大厅`,
      desc: '日常委托、公会商店与贡献兑换。',
      tag: owned ? `贡献 ${guildContribution(item.id)}` : `需${item.name}徽章`,
      disabled: !owned,
      hallGuildId: item.id,
    }
  }),
)

const hallGuild = computed(
  () => GUILDS.find((item) => item.id === hallGuildId.value) ?? null,
)
const hallCommission = computed(() =>
  hallGuildId.value ? guildCommissionState(hallGuildId.value) : null,
)
const hallContributionValue = computed(() =>
  hallGuildId.value ? guildContribution(hallGuildId.value) : 0,
)
const hallShop = computed(() =>
  (hallGuild.value?.shop ?? []).map((good) => ({
    ...good,
    def: getItem(good.id),
  })),
)
const hallContributionShop = computed(() =>
  (hallGuild.value?.contributionShop ?? []).map((good) => ({
    ...good,
    def: getItem(good.id),
    purchased: guildContributionPurchased(good.id),
  })),
)

const tavernMenu = computed(() =>
  TAVERN_COCKTAILS.map((item) => ({
    ...item,
    affordable: game.coins >= item.coins && game.dawnCoins >= item.dawnCoins,
  })),
)

const restaurantMenu = computed(() =>
  RESTAURANT_DISHES.map((item) => ({
    ...item,
    affordable: game.coins >= item.coins && game.dawnCoins >= item.dawnCoins,
  })),
)

const tradeLicenseBonus = computed(() => (hasServicePermit('trade-license') ? 0.05 : 0))

const tradeListings = computed(() =>
  (Array.isArray(game.flags.tradeListings) ? game.flags.tradeListings : []).map((listing) => {
    const def = getItem(listing.itemId)
    const nextDays = Math.max(1, game.day - (Number(listing.listedDay) || game.day) + 1)
    return {
      ...listing,
      def,
      chance: tradeSaleChance(def, listing.price, nextDays, tradeLicenseBonus.value),
    }
  }),
)

const tradeIncome = computed(() => Math.max(0, Number(game.flags.tradeIncome) || 0))
const tradeReport = computed(() => game.flags.tradeReport ?? null)
const tradeFull = computed(() => tradeListings.value.length >= TRADE_LISTING_LIMIT)
const tradeBagWeapons = computed(() => {
  const list = []
  game.inventory.forEach((entry, index) => {
    if (!entry) return
    const def = getItem(entry.id)
    if (def?.category !== 'melee' && def?.category !== 'ranged') return
    list.push({ entry, index, def, fair: tradeFairValue(def) })
  })
  return list
})

const priceDrafts = reactive({})

const servicePermitsView = computed(() =>
  SERVICE_PERMITS.map((permit) => {
    const purchased = hasServicePermit(permit.id)
    let available = !purchased
    let status = purchased ? '已办结' : ''
    if (permit.id === 'badge-reissue') {
      const lastGuild = GUILDS.find((item) => item.id === game.flags.lastGuildId)
      const hasBadge = Boolean(activeGuildId())
      available = !hasBadge && Boolean(lastGuild)
      if (hasBadge) status = '身上已有公会徽章'
      else if (lastGuild) status = `上次加入：${lastGuild.name}`
      else status = '档案里没有公会记录'
    }
    return { ...permit, purchased, available, status }
  }),
)

const mayor = computed(() => mayorForDay(game.day))
const mayorCycle = computed(() => Math.floor((game.day - 1) / MAYOR_CYCLE_DAYS) + 1)
const mayorVisited = computed(() => Number(game.flags.mayorVisitDay) === game.day)
const mayorIsMember = computed(() => Boolean(mayor.value) && activeGuildId() === mayor.value.guildId)
const mayorRotation = computed(() =>
  MAYOR_LEADERS.map((leader) => ({
    ...leader,
    active: leader.id === mayor.value?.id,
  })),
)
const mayorOptions = computed(() => {
  if (!mayor.value) return []
  const visited = mayorVisited.value
  const isMember = mayorIsMember.value
  return [
    {
      id: 'public',
      label: '常规选项',
      ...mayor.value.public,
      available: !visited,
      locked: false,
      lockText: '',
      actionText: visited ? '今日已拜访' : '前往面谈 · 1 回合',
    },
    {
      id: 'member',
      label: '成员选项',
      ...mayor.value.member,
      available: !visited && isMember,
      locked: !isMember,
      lockText: isMember ? '' : `仅限${mayor.value.guildName}成员`,
      actionText: visited ? '今日已拜访' : isMember ? '私下会谈 · 1 回合' : '仅限本公会成员',
    },
    {
      id: 'spar',
      label: '切磋',
      name: `与${mayor.value.name}切磋`,
      desc: '在市政厅空地上打一场。双方都会在最后一击前收手，胜者不取性命。',
      effectText: '切磋胜利：声望 +2 · 失败不会死亡',
      available: !visited && Number(game.stats.hp) > 1,
      locked: Number(game.stats.hp) <= 1,
      lockText: Number(game.stats.hp) <= 1 ? '生命只剩 1 点，先去处理伤口' : '',
      actionText: visited
        ? '今日已拜访'
        : Number(game.stats.hp) > 1
          ? '进行切磋 · 1 回合'
          : '需要更多生命',
    },
  ]
})

const worldBossMenu = computed(() =>
  WORLD_BOSSES.map((boss) => {
    const defeated = Boolean(game.flags.worldBossDefeated?.[boss.id])
    const saved = Number(game.flags.worldBossHp?.[boss.id])
    const remaining = Number.isFinite(saved) && saved > 0 ? saved : boss.hp
    return {
      id: `world-boss-${boss.id}`,
      name: boss.name,
      desc: `世界BOSS · 生命 ${boss.hp} · 击败掉落${getItem(boss.gemId)?.name ?? '宝石'}`,
      tag: defeated ? '已击杀' : `剩余 ${remaining}`,
      disabled: defeated,
      bossId: boss.id,
    }
  }),
)

const mutantFishCount = computed(() => countItem(game.inventory, FISH_PROCESSING.inputId))
const safeFishCount = computed(() => countItem(game.inventory, FISH_PROCESSING.outputId))
const dragonScaleCount = computed(() => countItem(game.inventory, KRAKEN_BLADE_CRAFT.scaleId))
const fishInputDef = computed(() => getItem(FISH_PROCESSING.inputId))
const fishOutputDef = computed(() => getItem(FISH_PROCESSING.outputId))
const krakenBladeDef = computed(() => getItem(KRAKEN_BLADE_CRAFT.itemId))
const canProcessFish = computed(
  () =>
    mutantFishCount.value > 0 &&
    game.coins >= FISH_PROCESSING.coins &&
    game.dawnCoins >= FISH_PROCESSING.dawnCoins,
)
const canCraftKraken = computed(
  () => dragonScaleCount.value >= KRAKEN_BLADE_CRAFT.scales,
)

const VENUES = [
  {
    id: 'red-light',
    name: '红灯街区',
    desc: '霓虹与帘幕后的交易。持有任意公会徽章才能进入。',
  },
  {
    id: 'free-trade',
    name: '自由贸易',
    desc: '托管近战与远程武器，自定义定价。持有任意公会徽章才能进入。',
  },
  {
    id: 'free-tavern',
    name: '自由酒馆',
    desc: '双币调酒，现买现喝。持有任意公会徽章才能进入。',
  },
  {
    id: 'free-restaurant',
    name: '自由餐馆',
    desc: '双币点餐，现买现吃。持有任意公会徽章才能进入。',
  },
]

const MENU = computed(() => [
  {
    id: 'beg',
    name: '沿街乞讨',
    desc: '花 1 回合向路人伸手，可能得到货币、饮品、食物或水果。',
    tag: '1 回合',
  },
  {
    id: 'guilds',
    name: '公会报名',
    desc: '加入或退出六个公会，徽章持有期间获得对应增益。',
    tag: guild.value ? guild.value.name : '可报名',
  },
  ...UTOPIA_TRAININGS.map((training) => ({
    id: `train-${training.kind}`,
    name: training.name,
    desc: training.desc,
    tag: `今日 ${utopiaTrainingLeft(training.kind)} 次`,
    trainingKind: training.kind,
  })),
  ...GUILD_HALLS.value,
  ...VENUES.map((item) => ({
    ...item,
    tag: hasGuild.value ? '已解锁' : '需任意公会徽章',
    disabled: !hasGuild.value,
  })),
  {
    id: 'service-center',
    name: '办事中心',
    desc: '证照办理、加急窗口与公会徽章补办。',
    tag: '可办理',
  },
  {
    id: 'acting-mayor',
    name: '代理城主',
    desc: '六位公会会长轮流坐镇，每天换一个人。',
    tag: mayor.value ? `今日 · ${mayor.value.name}` : '轮值中',
  },
  {
    id: 'process-fish',
    name: '处理鱼肉',
    desc: '消耗双币，把 1 份变异鱼肉变成无害化鱼肉。',
    tag: `鱼肉 ${mutantFishCount.value}`,
  },
  {
    id: 'craft-kraken',
    name: '沧龙之刃',
    desc: '消耗 50 片沧龙鳞片，铸造限定近战武器。',
    tag: `鳞片 ${dragonScaleCount.value} / ${KRAKEN_BLADE_CRAFT.scales}`,
  },
  ...worldBossMenu.value,
])

function select(item) {
  if (!item || item.disabled) return
  if (item.id === 'beg') {
    feed.value = begUtopia()
    return
  }
  if (item.id === 'guilds') {
    view.value = 'guilds'
    return
  }
  if (item.id === 'red-light') {
    view.value = 'red-light'
    return
  }
  if (item.id === 'free-tavern') {
    view.value = 'tavern'
    return
  }
  if (item.id === 'free-restaurant') {
    view.value = 'restaurant'
    return
  }
  if (item.id === 'free-trade') {
    view.value = 'trade'
    return
  }
  if (item.id === 'service-center') {
    view.value = 'service'
    return
  }
  if (item.id === 'acting-mayor') {
    view.value = 'mayor'
    return
  }
  if (item.id === 'process-fish') {
    view.value = 'fish'
    return
  }
  if (item.id === 'craft-kraken') {
    view.value = 'kraken'
    return
  }
  if (item.bossId) {
    feed.value = startWorldBossBattle(item.bossId)
    return
  }
  if (item.trainingKind) {
    trainingKind.value = item.trainingKind
    view.value = 'training'
    return
  }
  if (item.hallGuildId) {
    hallGuildId.value = item.hallGuildId
    view.value = 'hall'
    return
  }
  if (item.title) {
    placeholder.value = { title: item.title, note: item.note, desc: item.desc }
    view.value = 'placeholder'
    return
  }
  view.value = item.id
}

function train() {
  feed.value = utopiaTrain(trainingKind.value)
}

function claimCommission() {
  feed.value = claimGuildCommission(hallGuildId.value)
}

function buyShop(itemId) {
  feed.value = buyGuildShopItem(hallGuildId.value, itemId)
}

function buyContribution(itemId) {
  feed.value = buyGuildContributionItem(hallGuildId.value, itemId)
}

function sellBody() {
  feed.value = redLightSellBody()
}

function payForFreedom() {
  feed.value = redLightPayForFreedom()
}

function drinkCocktail(cocktailId) {
  feed.value = drinkTavernCocktail(cocktailId)
}

function eatDish(dishId) {
  feed.value = eatRestaurantDish(dishId)
}

function chanceText(chance) {
  if (chance >= 1) return '必售'
  if (chance <= 0) return '无人问津'
  return `${Math.round(chance * 100)}%`
}

function draftPrice(item) {
  const draft = priceDrafts[item.index]
  return draft === undefined || draft === '' ? item.fair : draft
}

function setDraft(index, event) {
  priceDrafts[index] = event.target.value
}

function draftChance(item) {
  return tradeSaleChance(item.def, Number(draftPrice(item)), 1, tradeLicenseBonus.value)
}

function listItem(item) {
  feed.value = listTradeItem(item.index, draftPrice(item))
  if (!game.inventory[item.index]) delete priceDrafts[item.index]
}

function unlist(listingId) {
  feed.value = delistTradeItem(listingId)
}

function collectIncome() {
  feed.value = collectTradeIncome()
}

function applyPermit(permitId, express) {
  feed.value = applyServicePermit(permitId, express)
}

function visitMayor(option) {
  if (option === 'spar') {
    feed.value = startMayorSpar()
    return
  }
  feed.value = meetActingMayor(option)
}

function processFish() {
  feed.value = processMutantFish()
}

function craftBlade() {
  feed.value = craftKrakenBlade()
}

function utopiaBattleDone() {
  const summary = battle.summary
  const wasSpar = battle.kind === 'spar'
  resetBattle()
  feed.value = summary || '战斗结束。'
  view.value = wasSpar ? 'mayor' : 'menu'
}

function closeUtopia() {
  if (battle.active) {
    notify('战斗还没结束，先打完或者逃跑。')
    return
  }
  if (battle.finished) resetBattle()
  emit('close')
}

/** 持械备案后治安官罚款减半 */
function fineValue(base) {
  return hasServicePermit('weapon-permit') ? Math.max(1, Math.ceil(base / 2)) : base
}

/** 商店物品一行属性：武器显示数值，其余显示说明 */
function shopStatText(def) {
  if (!def) return ''
  if (def.weapon) {
    const parts = [
      `攻击 ${def.weapon.attack}`,
      `暴击 ${formatPercent(def.weapon.crit)}`,
      `暴伤 ${formatCritDamage(def.weapon.critDamage)}`,
    ]
    if (def.weapon.combo != null) parts.push(`连击 ${formatPercent(def.weapon.combo)}`)
    if (def.weapon.dodge != null) parts.push(`闪避 ${formatPercent(def.weapon.dodge)}`)
    if (def.weapon.durability != null) parts.push(`耐久 ${def.weapon.durability}`)
    return parts.join(' · ')
  }
  return def.description
}

/** 天赋效果文案：暴击伤害按绝对值显示，其余按百分比 */
function talentEffectText(effects) {
  const entries = Object.entries(effects ?? {})
  if (!entries.length) return '—'
  return entries
    .map(([key, value]) => {
      const label = TALENT_EFFECT_LABELS[key] ?? key
      if (key === 'critDamage' || key === 'damage') return `${label} +${value}`
      const percent = Number((value * 100).toFixed(2))
      return `${label} +${percent}%`
    })
    .join(' · ')
}

function join(id) {
  feed.value = joinGuild(id)
}

function quit() {
  feed.value = leaveGuild()
}

function back() {
  view.value = 'menu'
  placeholder.value = null
}
</script>

<template>
  <ModalShell
    title="乌托邦城"
    :sub="`相对安全 · 第 ${game.day} 天 · ${currentPhase}`"
    wide
    @close="closeUtopia"
  >
    <template #hud>
      <StatusHud />
    </template>

    <template v-if="battle.active || battle.finished">
      <BattleView @done="utopiaBattleDone" />
    </template>

    <template v-else-if="view === 'menu'">
      <p class="utopia-intro">
        高墙内的街道干净得不像末日。这里没有人问你怎么活下来的，只问你能拿出什么。
      </p>
      <MapMenuList :items="MENU" @select="select" />
    </template>

    <template v-else-if="view === 'guilds'">
      <div class="bar">
        <button type="button" class="btn" @click="back">← 返回选项</button>
        <span class="guild-current">
          当前公会：{{ guild?.name ?? '无' }}
        </span>
        <button v-if="guild" type="button" class="btn btn--discard" @click="quit">
          退出公会
        </button>
      </div>

      <p class="utopia-intro">
        同一时间只能加入一个公会。公会徽章落在背包里，丢弃或退出都会失去公会身份。
      </p>

      <div class="guild-grid">
        <article
          v-for="card in guildCards"
          :key="card.id"
          class="guild-card"
          :class="{ 'is-active': guild?.id === card.id }"
        >
          <header class="guild-card__head">
            <img v-if="card.badgeImage" :src="card.badgeImage" :alt="card.name" />
            <div>
              <span class="eyebrow">{{ guild?.id === card.id ? '当前公会' : '可报名' }}</span>
              <h3>{{ card.name }}</h3>
            </div>
          </header>

          <p class="guild-card__req">加入条件：{{ card.requirementText }}</p>

          <div class="guild-card__checks">
            <span
              v-for="need in card.state.items"
              :key="need.id"
              :class="{ 'is-ok': need.have >= need.qty }"
            >
              {{ need.name }} {{ need.have }} / {{ need.qty }}
            </span>
            <span v-if="card.state.kills" :class="{ 'is-ok': card.state.killsHave >= card.state.kills }">
              累计击杀 {{ card.state.killsHave }} / {{ card.state.kills }}
            </span>
            <span v-if="card.state.thefts" :class="{ 'is-ok': card.state.theftsHave >= card.state.thefts }">
              都城盗窃 {{ card.state.theftsHave }} / {{ card.state.thefts }}
            </span>
            <span v-if="card.state.minIdentity" :class="{ 'is-ok': identityRank(game.identity) >= identityRank(card.state.minIdentity) }">
              身份 {{ game.identity ?? '无' }} / {{ card.state.minIdentity }}
            </span>
          </div>

          <p class="guild-card__buff">徽章增益：{{ card.buffText }}</p>

          <button
            type="button"
            class="btn btn--primary"
            :disabled="!card.state.canJoin"
            @click="join(card.id)"
          >
            {{ guild?.id === card.id ? '已加入' : '报名加入' }}
          </button>
          <p
            v-if="!card.state.canJoin && guild?.id !== card.id"
            class="guild-card__reason"
          >
            {{ card.state.reason }}
          </p>
        </article>
      </div>
    </template>

    <template v-else-if="view === 'training'">
      <div class="bar">
        <button type="button" class="btn" @click="back">← 返回选项</button>
        <span class="guild-current">今日剩余 {{ utopiaTrainingLeft(trainingKind) }} / {{ utopiaTrainingLimit() }} 次</span>
      </div>

      <h3 class="placeholder__title">{{ activeTraining?.name }}</h3>
      <p class="utopia-intro">{{ activeTraining?.desc }}</p>

      <div class="training-meta">
        <span>装备要求：{{ activeTraining?.weaponText }}</span>
        <span>
          每次消耗：
          {{ activeTraining?.costType === 'durability' ? '耐久度' : '清洁度' }} 10
        </span>
        <span>每次获得 5–10 熟练度</span>
        <span>每天最多 {{ utopiaTrainingLimit() }} 次</span>
      </div>

      <section class="training-current">
        <div>
          <span class="eyebrow">{{ activeTrainingDef?.label }}</span>
          <h4>{{ activeTrainingTitle }}</h4>
        </div>
        <div class="training-current__stats">
          <span>等级 {{ activeTrainingLevel }} / {{ activeTrainingDef?.maxLevel }}</span>
          <span>
            熟练度
            {{ activeTrainingLevel >= (activeTrainingDef?.maxLevel ?? 0)
              ? '已满级'
              : `${activeTrainingProgress}%` }}
          </span>
        </div>
        <p>当前效果：{{ talentEffectText(activeTrainingEffects) }}</p>
        <p v-if="!isTalentActive(trainingKind)" class="training-current__warn">
          天赋尚未启用，请到背包的天赋页调整启用位。
        </p>
      </section>

      <button
        type="button"
        class="btn btn--primary"
        :disabled="
          activeTrainingLevel >= (activeTrainingDef?.maxLevel ?? 0) ||
          utopiaTrainingLeft(trainingKind) <= 0
        "
        @click="train"
      >
        训练 · 1 回合
      </button>
    </template>

    <template v-else-if="view === 'hall'">
      <div class="bar">
        <button type="button" class="btn" @click="back">← 返回选项</button>
        <span class="guild-current">公会贡献 {{ hallContributionValue }}</span>
      </div>

      <h3 class="placeholder__title">{{ hallGuild?.name }}大厅</h3>
      <p class="utopia-intro">
        出示徽章后，公会才会把委托、货架和贡献兑换向你打开。
      </p>

      <section class="hall-block">
        <div class="hall-block__head">
          <span class="eyebrow">日常委托 · 一天一次</span>
          <h4>{{ hallGuild?.commission?.text }}</h4>
        </div>
        <p class="hall-reward">奖励：{{ hallCommission?.rewardText }}</p>
        <div class="hall-progress">
          <span
            v-for="line in hallCommission?.lines"
            :key="line.label"
            :class="{ 'is-ok': line.ok }"
          >
            {{ line.label }} {{ line.have }} / {{ line.need }}
          </span>
        </div>
        <div class="hall-action">
          <button
            type="button"
            class="btn btn--primary"
            :disabled="!hallCommission?.canClaim"
            @click="claimCommission"
          >
            {{ hallCommission?.claimedToday ? '今日已领取' : '交付委托' }}
          </button>
          <span v-if="hallCommission?.reason" class="hall-note">
            {{ hallCommission?.reason }}
          </span>
        </div>
      </section>

      <section class="hall-block">
        <div class="hall-block__head">
          <span class="eyebrow">公会商店</span>
          <h4>成员价 · 末日币 + 曙光币复合购买</h4>
        </div>
        <div class="shop-grid">
          <article v-for="good in hallShop" :key="good.id" class="shop-card">
            <img v-if="good.def?.image" :src="good.def.image" :alt="good.def.name" />
            <div class="shop-card__main">
              <span class="eyebrow">{{ good.def?.tier ?? '补给' }}</span>
              <h5>{{ good.def?.name ?? good.id }}</h5>
              <p>{{ shopStatText(good.def) }}</p>
              <span class="shop-price">
                {{ good.coins }} 末日币 + {{ good.dawnCoins }} 曙光币
              </span>
            </div>
            <button type="button" class="btn" @click="buyShop(good.id)">购买</button>
          </article>
        </div>
      </section>

      <section class="hall-block">
        <div class="hall-block__head">
          <span class="eyebrow">贡献商店</span>
          <h4>限定兑换 · 每件只能兑换一次</h4>
        </div>
        <div class="shop-grid">
          <article
            v-for="good in hallContributionShop"
            :key="good.id"
            class="shop-card"
            :class="{ 'is-bought': good.purchased }"
          >
            <img v-if="good.def?.image" :src="good.def.image" :alt="good.def.name" />
            <div class="shop-card__main">
              <span class="eyebrow">{{ good.def?.tier ?? '限定' }}</span>
              <h5>{{ good.def?.name ?? good.id }}</h5>
              <p>{{ shopStatText(good.def) }}</p>
              <span class="shop-price">
                {{ good.contribution }} 贡献 + {{ good.coins }} 末日币 +
                {{ good.dawnCoins }} 曙光币
              </span>
            </div>
            <button
              type="button"
              class="btn"
              :disabled="good.purchased"
              @click="buyContribution(good.id)"
            >
              {{ good.purchased ? '已兑换' : '兑换' }}
            </button>
          </article>
        </div>
      </section>
    </template>

    <template v-else-if="view === 'red-light'">
      <div class="bar">
        <button type="button" class="btn" @click="back">← 返回选项</button>
        <span class="guild-current">1 回合 / 次 · 正常衰减</span>
      </div>

      <h3 class="placeholder__title">红灯街区</h3>
      <p class="utopia-intro">
        粉色霓虹在墙上滴下一层油光。帘幕后的人不问名字，只看你拿得出什么。两种选择都会消耗 1 回合，属性照常衰减。
      </p>
      <p v-if="hasServicePermit('weapon-permit')" class="utopia-intro">
        持械备案生效：治安官罚款减半。
      </p>

      <div class="red-grid">
        <article class="red-card">
          <span class="eyebrow">献身自由</span>
          <h4>不付钱，用身体换一夜收入</h4>
          <ul class="red-odds">
            <li><b>40%</b> 被治安官抓住：罚款 {{ fineValue(4) }} 末日币 + {{ fineValue(4) }} 曙光币；付不起则货币清零，并被拉去劳动改造，体力 −30</li>
            <li><b>30%</b> 见不得光的收入：末日币 +3，曙光币 +3</li>
            <li><b>20%</b> 对方并未支付报酬，你上当了</li>
            <li><b>10%</b> 随机失去一份食物 / 饮品 / 药品；没有可偷的东西就什么也不会失去</li>
          </ul>
          <button type="button" class="btn btn--primary" @click="sellBody">
            献身自由 · 1 回合
          </button>
        </article>

        <article class="red-card">
          <span class="eyebrow">追求自由</span>
          <h4>先付 3 末日币 + 3 曙光币，挑一个合眼的人</h4>
          <ul class="red-odds">
            <li><b>40%</b> 被治安官抓住：罚款 {{ fineValue(3) }} 末日币 + {{ fineValue(3) }} 曙光币；付不起则货币清零，并被拉去劳动改造，体力 −30</li>
            <li><b>30%</b> 完事后感到空虚：理智 −20，体力 −20</li>
            <li><b>20%</b> TA 落下一件东西：随机普通近战武器</li>
            <li><b>10%</b> 你感染了疾病：感染 +90%</li>
          </ul>
          <button type="button" class="btn btn--primary" @click="payForFreedom">
            追求自由 · 1 回合
          </button>
          <p class="red-card__note">上手前先扣 3 末日币 + 3 曙光币，罚款另算。</p>
        </article>
      </div>
    </template>

    <template v-else-if="view === 'tavern'">
      <div class="bar">
        <button type="button" class="btn" @click="back">← 返回选项</button>
        <span class="guild-current">现买现喝 · 不占背包 · 不消耗回合</span>
      </div>

      <h3 class="placeholder__title">自由酒馆</h3>
      <p class="utopia-intro">
        吧台后的调酒师不问你要去哪。这里的酒只收末日币和曙光币，喝完把杯子推回去就行，不会有人问你要不要打包。
      </p>

      <div class="tavern-grid">
        <article v-for="drink in tavernMenu" :key="drink.id" class="tavern-card">
          <img :src="drink.image" :alt="drink.name" />
          <div class="tavern-card__main">
            <h4>{{ drink.name }}</h4>
            <p>{{ drink.description }}</p>
            <span class="tavern-effect">{{ drink.effectText }}</span>
            <span class="shop-price">
              {{ drink.coins }} 末日币 + {{ drink.dawnCoins }} 曙光币
            </span>
          </div>
          <button
            type="button"
            class="btn"
            :disabled="!drink.affordable"
            @click="drinkCocktail(drink.id)"
          >
            {{ drink.affordable ? '喝一杯' : '货币不足' }}
          </button>
        </article>
      </div>
    </template>

    <template v-else-if="view === 'restaurant'">
      <div class="bar">
        <button type="button" class="btn" @click="back">← 返回选项</button>
        <span class="guild-current">现买现吃 · 不占背包 · 不消耗回合</span>
      </div>

      <h3 class="placeholder__title">自由餐馆</h3>
      <p class="utopia-intro">
        后厨的灯一直亮着，菜单写在墙上，价格用两种颜色标。点完就端上来，吃完盘子会被收走，不会让你带走。
      </p>

      <div class="tavern-grid">
        <article v-for="dish in restaurantMenu" :key="dish.id" class="tavern-card">
          <img :src="dish.image" :alt="dish.name" />
          <div class="tavern-card__main">
            <h4>{{ dish.name }}</h4>
            <p>{{ dish.description }}</p>
            <span
              class="tavern-effect"
              :class="{ 'is-danger': (dish.effects.infection ?? 0) > 0 }"
            >
              {{ dish.effectText }}
            </span>
            <span class="shop-price">
              {{ dish.coins }} 末日币 + {{ dish.dawnCoins }} 曙光币
            </span>
          </div>
          <button
            type="button"
            class="btn"
            :disabled="!dish.affordable"
            @click="eatDish(dish.id)"
          >
            {{ dish.affordable ? '吃' : '货币不足' }}
          </button>
        </article>
      </div>
    </template>

    <template v-else-if="view === 'fish'">
      <div class="bar">
        <button type="button" class="btn" @click="back">← 返回选项</button>
        <span class="guild-current">双币加工 · 不消耗回合</span>
      </div>

      <h3 class="placeholder__title">处理鱼肉</h3>
      <p class="utopia-intro">
        后厨的人戴着厚手套，把发蓝的鱼肉按在案板上。窗口先收双币，他才肯动刀。
      </p>

      <div class="craft-flow">
        <article class="craft-item">
          <img v-if="fishInputDef?.image" :src="fishInputDef.image" :alt="fishInputDef.name" />
          <span class="eyebrow">原料</span>
          <h4>{{ fishInputDef?.name ?? '变异鱼肉' }} ×{{ mutantFishCount }}</h4>
          <p>{{ fishInputDef?.description }}</p>
          <span class="permit-effect">
            消耗 1 份 · {{ FISH_PROCESSING.coins }} 末日币 +
            {{ FISH_PROCESSING.dawnCoins }} 曙光币
          </span>
        </article>

        <span class="craft-arrow">→</span>

        <article class="craft-item">
          <img v-if="fishOutputDef?.image" :src="fishOutputDef.image" :alt="fishOutputDef.name" />
          <span class="eyebrow">成品</span>
          <h4>{{ fishOutputDef?.name ?? '无害化鱼肉' }} ×{{ safeFishCount }}</h4>
          <p>饱食 +30 · 口渴 +30 · 体力 +50</p>
          <span class="permit-effect">处理后可正常食用，不再感染</span>
        </article>
      </div>

      <div class="hall-action">
        <button
          type="button"
          class="btn btn--primary"
          :disabled="!canProcessFish"
          @click="processFish"
        >
          处理 1 份
        </button>
        <span v-if="mutantFishCount <= 0" class="hall-note">
          背包里没有变异鱼肉。
        </span>
        <span
          v-else-if="game.coins < FISH_PROCESSING.coins || game.dawnCoins < FISH_PROCESSING.dawnCoins"
          class="hall-note"
        >
          双币不足，需要 {{ FISH_PROCESSING.coins }} 末日币 +
          {{ FISH_PROCESSING.dawnCoins }} 曙光币。
        </span>
      </div>
    </template>

    <template v-else-if="view === 'kraken'">
      <div class="bar">
        <button type="button" class="btn" @click="back">← 返回选项</button>
        <span class="guild-current">
          鳞片 {{ dragonScaleCount }} / {{ KRAKEN_BLADE_CRAFT.scales }}
        </span>
      </div>

      <h3 class="placeholder__title">沧龙之刃</h3>
      <p class="utopia-intro">
        锻造台上压着一张图纸，边角注着一行小字：五十片鳞，一次成型。
      </p>

      <section class="mayor-profile">
        <img
          v-if="krakenBladeDef?.image"
          :src="krakenBladeDef.image"
          :alt="krakenBladeDef.name"
        />
        <div>
          <span class="eyebrow">限定 · 近战武器</span>
          <h4>{{ krakenBladeDef?.name ?? '沧龙之刃' }}</h4>
          <p>{{ shopStatText(krakenBladeDef) }}</p>
          <p class="permit-effect">期望伤害 335–350（含暴击与连击）</p>
        </div>
      </section>

      <section class="hall-block">
        <div class="hall-block__head">
          <span class="eyebrow">铸造材料</span>
          <h4>沧龙鳞片 ×{{ KRAKEN_BLADE_CRAFT.scales }}</h4>
        </div>
        <p class="hall-note">
          当前持有 {{ dragonScaleCount }} 片。深海里的冥渊沧龙会掉落鳞片。
        </p>
        <div class="hall-action">
          <button
            type="button"
            class="btn btn--primary"
            :disabled="!canCraftKraken"
            @click="craftBlade"
          >
            {{ canCraftKraken ? '铸造沧龙之刃' : '鳞片不足' }}
          </button>
          <span v-if="!canCraftKraken" class="hall-note">
            还差 {{ KRAKEN_BLADE_CRAFT.scales - dragonScaleCount }} 片。
          </span>
        </div>
      </section>
    </template>

    <template v-else-if="view === 'trade'">
      <div class="bar">
        <button type="button" class="btn" @click="back">← 返回选项</button>
        <span class="guild-current">
          摊位 {{ tradeListings.length }} / {{ TRADE_LISTING_LIMIT }}
        </span>
        <button
          v-if="tradeIncome > 0"
          type="button"
          class="btn btn--primary"
          @click="collectIncome"
        >
          领取 {{ tradeIncome }} 末日币
        </button>
      </div>

      <h3 class="placeholder__title">自由贸易</h3>
      <p class="utopia-intro">
        把背包里的近战和远程武器交给摊位托管，价格由你定。第二天开始结算：低价会被立刻拿走，高价则可能一直挂着，等人回心转意。
      </p>

      <div class="trade-rules">
        <span>定价 ≤ 参考价一半：次日必售</span>
        <span>定价 ≥ 参考价两倍：无人问津</span>
        <span>品质越高，愿意接手的人越少</span>
        <span>挂得越久，曝光略增</span>
        <span v-if="hasServicePermit('trade-license')">执照备案：成交概率 +5%</span>
        <span v-else>到办事中心办理执照可再 +5%</span>
      </div>

      <section v-if="tradeReport" class="hall-block">
        <div class="hall-block__head">
          <span class="eyebrow">第 {{ tradeReport.day }} 天结算</span>
          <h4>
            {{ tradeReport.sales?.length
              ? `售出 ${tradeReport.sales.length} 件`
              : '昨晚无人问价' }}
          </h4>
        </div>
        <div v-if="tradeReport.sales?.length" class="trade-report">
          <span v-for="(sale, index) in tradeReport.sales" :key="index">
            {{ sale.name }} · {{ sale.price }} 末日币
          </span>
        </div>
        <p class="hall-note">
          还有 {{ tradeReport.remaining ?? 0 }} 件继续挂着。
          <template v-if="tradeIncome > 0">
            待领取收入 {{ tradeIncome }} 末日币。
          </template>
        </p>
      </section>

      <section class="hall-block">
        <div class="hall-block__head">
          <span class="eyebrow">我的摊位</span>
          <h4>{{ tradeListings.length ? `${tradeListings.length} 件托管中` : '摊位空着' }}</h4>
        </div>
        <p v-if="!tradeListings.length" class="hall-note">
          从下面挑一件武器上架，跨天后自动结算。
        </p>
        <div v-else class="trade-grid">
          <article v-for="listing in tradeListings" :key="listing.id" class="trade-card">
            <img v-if="listing.def?.image" :src="listing.def.image" :alt="listing.def.name" />
            <div class="trade-card__main">
              <span class="eyebrow">
                {{ listing.def?.tier ?? '武器' }} · 第 {{ listing.listedDay }} 天上架
              </span>
              <h5>{{ listing.def?.name ?? listing.itemId }}</h5>
              <p>{{ shopStatText(listing.def) }}</p>
              <span class="shop-price">{{ listing.price }} 末日币</span>
              <span class="trade-chance">次日成交 {{ chanceText(listing.chance) }}</span>
            </div>
            <button type="button" class="btn" @click="unlist(listing.id)">下架</button>
          </article>
        </div>
      </section>

      <section class="hall-block">
        <div class="hall-block__head">
          <span class="eyebrow">可上架武器</span>
          <h4>
            {{ tradeBagWeapons.length
              ? '背包里的近战与远程'
              : '背包里没有可上架的武器' }}
          </h4>
        </div>
        <p v-if="tradeFull" class="hall-note">摊位已满，先下架一件才能继续上架。</p>
        <div v-if="tradeBagWeapons.length" class="trade-grid">
          <article v-for="item in tradeBagWeapons" :key="item.index" class="trade-card">
            <img v-if="item.def?.image" :src="item.def.image" :alt="item.def.name" />
            <div class="trade-card__main">
              <span class="eyebrow">{{ item.def?.tier ?? '武器' }}</span>
              <h5>{{ item.def?.name ?? item.entry.id }}</h5>
              <p>{{ shopStatText(item.def) }}</p>
              <span class="trade-chance">
                参考价 {{ item.fair }} 末日币 ·
                次日 {{ chanceText(draftChance(item)) }}
              </span>
            </div>
            <div class="trade-form">
              <input
                class="trade-input"
                type="number"
                min="1"
                step="1"
                :value="draftPrice(item)"
                :aria-label="`${item.def?.name ?? '武器'}的定价`"
                @input="setDraft(item.index, $event)"
              />
              <button
                type="button"
                class="btn"
                :disabled="tradeFull"
                @click="listItem(item)"
              >
                {{ tradeFull ? '已满' : '上架' }}
              </button>
            </div>
          </article>
        </div>
      </section>
    </template>

    <template v-else-if="view === 'service'">
      <div class="bar">
        <button type="button" class="btn" @click="back">← 返回选项</button>
        <span class="guild-current">取号办理 · 1 回合 / 笔</span>
      </div>

      <h3 class="placeholder__title">办事中心</h3>
      <p class="utopia-intro">
        四个窗口，玻璃上贴着泛黄的办事指南。证照一次办结、永久有效；不想排队，就走最右边的加急窗口。
      </p>

      <div class="trade-rules">
        <span>普通窗口：取号后消耗 1 回合</span>
        <span>加急窗口：额外 {{ SERVICE_CENTER_EXPRESS_DAWN }} 曙光币，当场办结</span>
        <span>证照永久有效</span>
      </div>

      <div class="permit-grid">
        <article
          v-for="permit in servicePermitsView"
          :key="permit.id"
          class="permit-card"
          :class="{ 'is-done': permit.purchased }"
        >
          <header class="permit-card__head">
            <span class="eyebrow">{{ permit.kind }}</span>
            <h4>{{ permit.name }}</h4>
          </header>
          <p class="permit-desc">{{ permit.desc }}</p>
          <span class="permit-effect">{{ permit.effectText }}</span>
          <span class="shop-price">
            {{ permit.coins }} 末日币 + {{ permit.dawnCoins }} 曙光币
          </span>
          <p v-if="permit.status" class="hall-note">{{ permit.status }}</p>
          <div class="permit-actions">
            <button
              type="button"
              class="btn"
              :disabled="!permit.available"
              @click="applyPermit(permit.id, false)"
            >
              {{ permit.purchased ? '已办结' : '取号 · 1 回合' }}
            </button>
            <button
              type="button"
              class="btn"
              :disabled="!permit.available"
              @click="applyPermit(permit.id, true)"
            >
              加急 · +{{ SERVICE_CENTER_EXPRESS_DAWN }} 曙光币
            </button>
          </div>
        </article>
      </div>
    </template>

    <template v-else-if="view === 'mayor'">
      <div class="bar">
        <button type="button" class="btn" @click="back">← 返回选项</button>
        <span class="guild-current">
          {{ mayorVisited ? '今日已拜访' : '每天一次 · 1 回合' }}
        </span>
      </div>

      <h3 class="placeholder__title">代理城主</h3>
      <p class="utopia-intro">
        六位公会会长按天轮值，每六天一轮。今天是第 {{ mayorCycle }} 轮，坐在城主办公室里的{{ mayor.name }}。
      </p>

      <section class="mayor-profile">
        <img :src="mayor.seal" :alt="mayor.name" />
        <div>
          <span class="eyebrow">{{ mayor.guildName }} · {{ mayor.title }}</span>
          <h4>{{ mayor.name }}</h4>
          <p>{{ mayor.desc }}</p>
        </div>
      </section>

      <div class="mayor-rotation">
        <article
          v-for="leader in mayorRotation"
          :key="leader.id"
          class="mayor-rotation__item"
          :class="{ 'is-active': leader.active }"
        >
          <img :src="leader.seal" :alt="leader.name" />
          <span>{{ leader.name }}</span>
          <small>{{ leader.guildName }}</small>
        </article>
      </div>

      <div class="mayor-options">
        <article
          v-for="option in mayorOptions"
          :key="option.id"
          class="mayor-option"
          :class="{ 'is-locked': option.locked, 'is-done': mayorVisited }"
        >
          <div class="mayor-option__main">
            <span class="eyebrow">{{ option.label }}</span>
            <h4>{{ option.name }}</h4>
            <p>{{ option.desc }}</p>
            <span class="permit-effect">{{ option.effectText }}</span>
            <p v-if="option.lockText" class="hall-note">{{ option.lockText }}</p>
          </div>
          <button
            type="button"
            class="btn"
            :disabled="!option.available"
            @click="visitMayor(option.id)"
          >
            {{ option.actionText }}
          </button>
        </article>
      </div>
    </template>

    <template v-else>
      <div class="bar">
        <button type="button" class="btn" @click="back">← 返回选项</button>
      </div>
      <h3 class="placeholder__title">{{ placeholder?.title }}</h3>
      <p class="utopia-intro">{{ placeholder?.desc }}</p>
      <p class="utopia-placeholder">{{ placeholder?.note }}</p>
    </template>

    <template #footer>
      <span>{{ feed || '乌托邦城里没有免费的午餐，但每一份施舍都有人记账。' }}</span>
      <span class="mode">UTOPIA</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.utopia-intro {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.9;
  letter-spacing: 0.03em;
  color: var(--text-dim);
}

.bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.guild-current {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.05em;
  color: var(--bone);
}

.btn--discard {
  border-color: rgba(193, 74, 50, 0.7);
  color: var(--rust-soft);
}

.guild-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.guild-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.022);
}

.guild-card.is-active {
  border-color: rgba(205, 185, 141, 0.45);
  background: rgba(205, 185, 141, 0.06);
}

.guild-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.guild-card__head img {
  width: 46px;
  height: 46px;
  flex: none;
  object-fit: contain;
  border: 1px solid var(--line);
}

.guild-card__head h3 {
  margin: 4px 0 0;
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text);
}

.guild-card__req,
.guild-card__buff {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.75;
  letter-spacing: 0.03em;
  color: var(--text-mute);
}

.guild-card__buff {
  color: var(--rust-soft);
}

.guild-card__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: #c8473a;
}

.guild-card__checks span.is-ok {
  color: var(--sick);
}

.guild-card .btn {
  align-self: flex-start;
  height: 30px;
  padding: 0 12px;
  font-size: 10.5px;
}

.guild-card__reason {
  margin: 0;
  font-size: 9.5px;
  line-height: 1.6;
  color: var(--text-mute);
}

.placeholder__title {
  margin: 0 0 8px;
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--bone);
}

.utopia-placeholder {
  margin: 12px 0 0;
  padding: 18px;
  font-size: 11.5px;
  line-height: 1.8;
  color: var(--text-mute);
  border: 1px dashed var(--line-strong);
  text-align: center;
}

.training-meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.18);
  font-family: var(--font-mono);
  font-size: 9.5px;
  line-height: 1.7;
  letter-spacing: 0.03em;
  color: var(--text-mute);
}

.training-current {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(205, 185, 141, 0.3);
  background: rgba(205, 185, 141, 0.05);
}

.training-current h4 {
  margin: 4px 0 0;
  font-family: var(--font-title);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--bone);
}

.training-current p {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.75;
  color: var(--text-dim);
}

.training-current__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--text-mute);
}

.training-current__warn {
  color: var(--rust-soft);
}

.hall-block {
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.022);
}

.hall-block__head h4 {
  margin: 5px 0 0;
  font-family: var(--font-title);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--bone);
}

.hall-reward {
  margin: 8px 0 0;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.03em;
  color: var(--rust-soft);
}

.hall-progress {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: #c8473a;
}

.hall-progress span.is-ok {
  color: var(--sick);
}

.hall-action {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.hall-action .btn {
  height: 30px;
  padding: 0 14px;
  font-size: 10.5px;
}

.hall-note {
  font-size: 9.5px;
  color: var(--text-mute);
}

.shop-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.shop-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.18);
}

.shop-card.is-bought {
  opacity: 0.55;
}

.shop-card img {
  width: 52px;
  height: 52px;
  flex: none;
  object-fit: contain;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.25);
}

.shop-card__main {
  flex: 1;
  min-width: 0;
}

.shop-card__main h5 {
  margin: 3px 0 4px;
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text);
}

.shop-card__main p {
  margin: 0;
  font-size: 9.5px;
  line-height: 1.65;
  color: var(--text-mute);
}

.shop-price {
  display: inline-block;
  margin-top: 5px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.03em;
  color: var(--bone);
}

.shop-card .btn {
  flex: none;
  height: 28px;
  padding: 0 10px;
  font-size: 10px;
}

.red-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.red-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.022);
}

.red-card h4 {
  margin: 0;
  font-family: var(--font-title);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--bone);
}

.red-odds {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 10.5px;
  line-height: 1.75;
  letter-spacing: 0.02em;
  color: var(--text-dim);
}

.red-odds li {
  display: flex;
  gap: 8px;
}

.red-odds b {
  flex: none;
  min-width: 34px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  color: var(--rust-soft);
}

.red-card .btn {
  margin-top: auto;
  height: 32px;
  padding: 0 14px;
  font-size: 10.5px;
}

.red-card__note {
  margin: 0;
  font-size: 9.5px;
  line-height: 1.6;
  color: var(--text-mute);
}

.tavern-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.tavern-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.18);
}

.tavern-card img {
  width: 64px;
  height: 64px;
  flex: none;
  object-fit: contain;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.25);
}

.tavern-card__main {
  flex: 1;
  min-width: 0;
}

.tavern-card__main h4 {
  margin: 0 0 3px;
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text);
}

.tavern-card__main p {
  margin: 0;
  font-size: 9.5px;
  line-height: 1.65;
  color: var(--text-mute);
}

.tavern-effect {
  display: block;
  margin-top: 4px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.02em;
  color: var(--sick);
}

.tavern-effect.is-danger {
  color: var(--rust-soft);
}

.tavern-card .btn {
  flex: none;
  height: 28px;
  padding: 0 10px;
  font-size: 10px;
}

.trade-rules {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border: 1px dashed var(--line-strong);
  font-family: var(--font-mono);
  font-size: 9px;
  line-height: 1.7;
  letter-spacing: 0.02em;
  color: var(--text-mute);
}

.trade-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.trade-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.18);
}

.trade-card img {
  width: 54px;
  height: 54px;
  flex: none;
  object-fit: contain;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.25);
}

.trade-card__main {
  flex: 1;
  min-width: 0;
}

.trade-card__main h5 {
  margin: 3px 0 4px;
  font-family: var(--font-title);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text);
}

.trade-card__main p {
  margin: 0;
  font-size: 9.5px;
  line-height: 1.65;
  color: var(--text-mute);
}

.trade-card .btn {
  flex: none;
  height: 28px;
  padding: 0 10px;
  font-size: 10px;
}

.trade-chance {
  display: block;
  margin-top: 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.02em;
  color: var(--sick);
}

.trade-report {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--bone);
}

.trade-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: none;
  width: 88px;
}

.trade-input {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  text-align: right;
  color: var(--bone);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--line-strong);
}

.trade-form .btn {
  height: 28px;
  padding: 0 8px;
  font-size: 10px;
}

.permit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.permit-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.022);
}

.permit-card.is-done {
  opacity: 0.6;
}

.permit-card__head h4 {
  margin: 4px 0 0;
  font-family: var(--font-title);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--bone);
}

.permit-desc {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.75;
  letter-spacing: 0.02em;
  color: var(--text-mute);
}

.permit-effect {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.02em;
  color: var(--rust-soft);
}

.permit-card .shop-price {
  margin-top: 0;
}

.permit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

.permit-actions .btn {
  height: 30px;
  padding: 0 12px;
  font-size: 10px;
}

.craft-flow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 10px;
  align-items: stretch;
  margin-bottom: 12px;
}

.craft-item {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.022);
}

.craft-item img {
  width: 76px;
  height: 76px;
  align-self: center;
  object-fit: contain;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.25);
}

.craft-item h4 {
  margin: 0;
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--bone);
}

.craft-item p {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.75;
  letter-spacing: 0.02em;
  color: var(--text-mute);
}

.craft-arrow {
  align-self: center;
  font-family: var(--font-mono);
  font-size: 20px;
  color: var(--rust-soft);
}

.mayor-profile {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(205, 185, 141, 0.3);
  background: rgba(205, 185, 141, 0.05);
}

.mayor-profile img {
  width: 76px;
  height: 76px;
  flex: none;
  object-fit: contain;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.25);
}

.mayor-profile h4 {
  margin: 4px 0 6px;
  font-family: var(--font-title);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--bone);
}

.mayor-profile p {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.8;
  letter-spacing: 0.03em;
  color: var(--text-mute);
}

.mayor-rotation {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 1px;
  margin-bottom: 12px;
  background: var(--line);
}

.mayor-rotation__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  background: #0d0f10;
  opacity: 0.45;
}

.mayor-rotation__item.is-active {
  opacity: 1;
  background: rgba(205, 185, 141, 0.09);
}

.mayor-rotation__item img {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.mayor-rotation__item span {
  font-family: var(--font-title);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text);
}

.mayor-rotation__item small {
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--text-mute);
}

.mayor-options {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--line);
}

.mayor-option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: #0d0f10;
}

.mayor-option__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mayor-option.is-locked,
.mayor-option.is-done {
  opacity: 0.55;
}

.mayor-option h4 {
  margin: 0;
  font-family: var(--font-title);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--bone);
}

.mayor-option p {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.75;
  letter-spacing: 0.02em;
  color: var(--text-mute);
}

.mayor-option .btn {
  flex: none;
  align-self: center;
  height: 30px;
  padding: 0 12px;
  font-size: 10px;
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}

@media (max-width: 680px) {
  .guild-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .shop-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .red-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .tavern-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .trade-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .permit-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .mayor-rotation {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .mayor-option {
    flex-direction: column;
    align-items: stretch;
  }

  .mayor-option .btn {
    align-self: flex-start;
  }

  .craft-flow {
    grid-template-columns: minmax(0, 1fr);
  }

  .craft-arrow {
    text-align: center;
    transform: rotate(90deg);
  }
}
</style>
