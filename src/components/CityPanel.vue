<script setup>
import { computed, ref } from 'vue'
import {
  ARENA,
  BANKER,
  GARDEN,
  IDENTITY_LEVELS,
  KNIGHT_COST,
  LABOR_TIERS,
  LOAN_TERM_DAYS,
  PALACE_COOLDOWN,
  PALACE_COUNCILS,
  PALACE_DANCES,
  PALACE_BANQUETS,
  PALACE_ROOMS,
  PALACE_SALARY,
  PALACE_SHOP,
  QUEST_OWNERS,
  REPAIR_PERCENT_PER_COIN,
  SHOP_GOODS,
  TALENTS,
  TALENT_EFFECT_LABELS,
  TREATMENT_TIERS,
  floorToCents,
  formatMoney,
  identityInfo,
  identityRank,
  getItem,
  loanTierByRank,
  loanTierFor,
  mapBackground,
  npcById,
  repairCoinCost,
  repairPriceForTier,
  talentEffects,
  talentTitle,
} from '../data'
import { MAPS } from '../game/config'
import {
  applyLoanGrace,
  arenaFight,
  arenaLeft,
  attendCouncil,
  becomeKnight,
  borrowCoins,
  buyGood,
  buyPalaceGood,
  canEnterPalace,
  claimSalary,
  cooldownLeft,
  currentPhase,
  deliverQueenLetter,
  exchangeCurrency,
  exchangeRateInfo,
  exploreCity,
  game,
  isNpcDead,
  isQuestDone,
  joinCity,
  laborCity,
  notify,
  palaceBanquet,
  palaceDance,
  palaceGuestRoom,
  questLineLocked,
  repairMeleeCity,
  repayLoan,
  restoreIdentity,
  stealPalace,
  treatInfection,
  gardenActivity,
} from '../game/store'
import { battle, resetBattle, startBankerCombat } from '../game/battle'
import { hasStackedModal, useShortcutLayer } from '../game/keyboard'
import AssassinationCard from './AssassinationCard.vue'
import BattleView from './BattleView.vue'
import InventoryPanel from './InventoryPanel.vue'
import MapMenuList from './MapMenuList.vue'
import ModalShell from './ModalShell.vue'
import NpcIntro from './NpcIntro.vue'
import QuestLinePanel from './QuestLinePanel.vue'
import StatusHud from './StatusHud.vue'

const emit = defineEmits(['close'])

const MENU = [
  { id: 'explore', no: '01', name: '在此探索', desc: '花 1 回合搜刮废墟，可能找到食物或饮品。' },
  { id: 'palace', no: '02', name: '进入王宫', desc: '骑士以上身份可直接进入王宫深处；身份不足会被守卫拦下。' },
  { id: 'bank', no: '03', name: '都城银行', desc: '按身份额度借贷，或按两地最高身份的购买力兑换货币。' },
  { id: 'identity', no: '04', name: '身份办理', desc: `投靠都城、补办身份牌，或花 ${KNIGHT_COST} 末日币成为骑士。` },
  { id: 'labor', no: '05', name: '进行劳动', desc: '八档身份活计，每天一份，身份越高越轻、越赚。' },
  { id: 'market', no: '06', name: '贫民集市', desc: '所有普通近战武器与基础补给，明码标价。' },
]

const PALACE_MENU = [
  { id: 'steal', no: '01', name: '进行偷窃', desc: '1 回合，每天一次。10% 得 3 币，20% 得 2 币，30% 得 1 币，20% 空手，20% 被扇一巴掌（生命 -5）。' },
  { id: 'dance', no: '02', name: '宫廷舞会', desc: '1 回合，每日一次。三档舞会共用次数，理智 +30 / +50 / +80。' },
  { id: 'banquet', no: '03', name: '宫廷宴会', desc: '1 回合，每日一次。三档宴会共用次数，饱食 / 口渴 +30 / +50 / +80。' },
  { id: 'room', no: '04', name: '宫廷客房', desc: '2 回合，每日一次。三档客房共用次数，体力 +30 / +50 / +80。' },
  { id: 'cure', no: '05', name: '感染治疗', desc: '1 回合，每日一次。按身份解锁六档治疗。' },
  { id: 'salary', no: '06', name: '领取俸禄', desc: '1 回合，每日一次。按身份领取末日币。' },
  { id: 'council', no: '07', name: '参加会议', desc: '1 回合，七天一次。七档会议按身份开放，高爵位可参加低爵位会议。' },
  { id: 'garden', no: '08', name: '宫廷花园', desc: '仅储君可进入。四项活动各自计算次数：散步与下午茶每日一次，神秘药剂五天一次，神迹祈祷七天一次。' },
  { id: 'queen', no: '09', name: '皇后米娅', desc: '她只肯见哥哥信得过的人，手里还得有那封信。' },
  { id: 'king', no: '10', name: '国王艾伦', desc: '骑士以上，他才会开口；他要的东西一件比一件难。' },
  { id: 'arena', no: '11', name: '斗兽擂台', desc: '赤手空拳上场，每天两次，提升拳头天赋。' },
  { id: 'shop', no: '12', name: '贵族商店', desc: '王宫限定武器与饮食，全部用末日币结算。' },
]

const map = MAPS.find((item) => item.id === 'ruined-city')
const view = ref('menu')
const feed = ref('城门在身后合拢，铁链拖过地面。你站在都城的阴影里。')
/** 都城地图内直接打开背包：面板叠加而不卸载地图，关闭后保留当前选项与滚动位置 */
const bagOpen = ref(false)
/** TAB 打开背包页，T 直达天赋页 */
const bagView = ref('bag')
const loanAmount = ref(1)
const palaceView = ref('menu')
const tradeCoins = ref(1)
const tradeDawn = ref(1)

const identity = computed(() => identityInfo(game.identity))
const loanDaysLeft = computed(() => (game.loan ? game.loan.dueDay - game.day : 0))
const loanOverdueDays = computed(() => (game.loan ? Math.max(0, game.day - game.loan.dueDay) : 0))
const loanTier = computed(() => loanTierFor(game.identity))
const loanTierOfBorrow = computed(() => (game.loan ? loanTierByRank(game.loan.rank) : null))
const currentRank = computed(() => identityRank(game.identity))
const palaceTitle = computed(
  () => PALACE_MENU.find((item) => item.id === palaceView.value)?.name ?? '都城王宫',
)
const salaryAmount = computed(() => PALACE_SALARY[game.identity] ?? 0)

const arenaLevel = computed(() => Number(game.talents.arena) || 0)
const arenaMaxLevel = computed(() => TALENTS.arena.maxLevel)
const arenaFull = computed(() => arenaLevel.value >= arenaMaxLevel.value)
const arenaProgress = computed(() =>
  arenaFull.value ? 100 : Math.max(0, Math.min(99, Number(game.training.arena) || 0)),
)
const arenaRemaining = computed(() => arenaLeft())
const arenaWeaponsEquipped = computed(() =>
  Boolean(game.equipment.melee || game.equipment.ranged),
)
const arenaWeaponText = computed(() => {
  const parts = []
  if (game.equipment.melee) {
    parts.push(`近战：${getItem(game.equipment.melee.id)?.name ?? '已装备'}`)
  }
  if (game.equipment.ranged) {
    parts.push(`远程：${getItem(game.equipment.ranged.id)?.name ?? '已装备'}`)
  }
  return parts.join(' · ')
})
const arenaTitleName = computed(() => talentTitle('arena', arenaLevel.value) || '暂无天赋')
const arenaEffectsText = computed(() => {
  const effects = talentEffects('arena', arenaLevel.value)
  const entries = Object.entries(effects)
  if (!entries.length) return '—'
  return entries
    .map(([key, value]) => {
      const label = TALENT_EFFECT_LABELS[key] ?? key
      return `${label} +${key === 'damage' ? value : Math.round(value * 100) + '%'}`
    })
    .join(' · ')
})
const arenaCanFight = computed(
  () =>
    !game.dead &&
    !arenaWeaponsEquipped.value &&
    !arenaFull.value &&
    arenaRemaining.value > 0,
)
const arenaActionLabel = computed(() => {
  if (arenaFull.value) return '拳头天赋已满级'
  if (arenaWeaponsEquipped.value) return '请先卸下所有武器'
  if (arenaRemaining.value <= 0) return '今日擂台次数已用完'
  return '上擂台 · 1 回合'
})
const meleeRepair = computed(() => {
  const equipped = game.equipment.melee
  if (!equipped) return { name: '', current: 0, max: 0, cost: 0, state: 'empty' }
  const def = getItem(equipped.id)
  const max = def?.weapon?.durability
  if (!Number.isFinite(max)) return { name: def?.name ?? '', current: 0, max: 0, cost: 0, state: 'free' }
  const current = Number.isFinite(equipped.durability) ? equipped.durability : max
  const tier = def?.tier ?? '普通'
  const cost = repairCoinCost(current, max, tier)
  return {
    name: def?.name ?? '近战武器',
    current,
    max,
    cost,
    tier,
    unitPrice: repairPriceForTier(tier),
    state: cost > 0 ? 'worn' : 'full',
  }
})
const kingGate = computed(() => questLineLocked('king'))
const queenGate = computed(() => questLineLocked('queen'))
const kingDead = computed(() => isNpcDead('king'))
const queenDead = computed(() => isNpcDead('queen'))
const bankerBattle = computed(() => battle.kind === 'banker')
const debtState = computed(() => {
  if (!game.loan) return { label: '无贷款', hint: BANKER.noLoanLine, can: false }
  if (game.loan.interestWaived) return { label: '利息已免', hint: BANKER.waivedLine, can: false }
  return {
    label: '可化债',
    hint: `当前利息 ${game.loan.interest} 币 · 本金 ${game.loan.principal} 币 · 到期日第 ${game.loan.dueDay} 天`,
    can: true,
  }
})
const rateInfo = computed(() => exchangeRateInfo())
const reverseRate = computed(() => (rateInfo.value.rate > 0 ? 1 / rateInfo.value.rate : 0))
const previewCoins = computed(() => {
  const rate = rateInfo.value.rate
  if (!(rate > 0)) return 0
  return floorToCents(Math.max(0, Number(tradeCoins.value) || 0) / rate)
})
const previewDawn = computed(() =>
  floorToCents(Math.max(0, Number(tradeDawn.value) || 0) * rateInfo.value.rate),
)
const queenCanDeliver = computed(
  () =>
    !queenDead.value &&
    game.flags.queenLetter &&
    isQuestDone('yiyang-5') &&
    !game.flags.queenLetterDelivered,
)

function daily(key) {
  return cooldownLeft(key, PALACE_COOLDOWN.daily)
}

function weekly(key) {
  return cooldownLeft(key, PALACE_COOLDOWN.weekly)
}

function rateText(tier) {
  return `${Math.round(tier.rate * 100)}%`
}

/** 汇率固定显示两位小数 */
function formatRate(value) {
  return Number(value || 0).toFixed(2)
}

/** 贷款剩余天数文案：到期当天不再显示「剩 0 天」 */
function loanRemainText(short = false) {
  if (loanOverdueDays.value > 0) {
    return short ? `逾期 ${loanOverdueDays.value} 天` : `已逾期 ${loanOverdueDays.value} 天`
  }
  if (loanDaysLeft.value <= 0) {
    return short ? '今日到期' : '今日到期（最后还款日）'
  }
  return short ? `剩 ${loanDaysLeft.value} 天` : `${loanDaysLeft.value} 天`
}

/** 不同身份的逾期后果说明 */
function loanWarning(tier) {
  if (!tier) return '没有身份时银行不会放贷。'
  if (tier.deathOnDefault) return '逾期未还：会有严重严重影响。'
  if (tier.confiscate) {
    return '逾期未还：抵押一部分生存物资，欠款保留；未还清前不可再借。'
  }
  return '逾期未还：欠款保留；未还清前不可再借。'
}

function run(action) {
  const line = action()
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (line) feed.value = line
}

function startDebtFight() {
  const line = startBankerCombat()
  if (line) feed.value = line
}

function bankerDone() {
  const summary = battle.summary
  resetBattle()
  if (summary) feed.value = summary
}

function exchangeCoins() {
  run(() => exchangeCurrency('coin', tradeCoins.value))
}

function exchangeDawn() {
  run(() => exchangeCurrency('dawn', tradeDawn.value))
}

function deliverLetter() {
  const line = deliverQueenLetter()
  if (line) feed.value = line
}

function tryPalace() {
  if (!canEnterPalace()) {
    const line = '守卫拦住你：至少需要「骑士」身份才能进入都城王宫。'
    feed.value = line
    notify(line)
    return
  }
  palaceView.value = 'menu'
  view.value = 'palace'
}

function battleBusy() {
  if (!battle.active) return false
  feed.value = '战斗还没结束：先逃跑，或者把它打倒'
  return true
}

function backFromPalace() {
  if (battleBusy()) return
  if (palaceView.value === 'menu') view.value = 'menu'
  else palaceView.value = 'menu'
}

/** 底部返回：在王宫子选项里先回王宫菜单，在王宫菜单里才回都城菜单 */
function footerBack() {
  if (view.value === 'palace') {
    backFromPalace()
    return
  }
  go('menu')
}

function go(next) {
  if (battleBusy()) return
  if (battle.finished) resetBattle()
  if (next === 'palace') {
    tryPalace()
    return
  }
  view.value = next
}

function closePanel() {
  if (battle.active) {
    feed.value = '战斗中无法离开：先逃跑，或者把它打倒'
    return
  }
  if (battle.finished) resetBattle()
  emit('close')
}

/** 桌面快捷键：TAB 背包、T 天赋页、ESC 逐级返回（子选项 → 都城菜单 → 离开地图） */
useShortcutLayer({
  toggleBag() {
    if (battle.active || battle.finished) return false
    bagView.value = 'bag'
    bagOpen.value = !bagOpen.value
    return true
  },
  openTalent() {
    if (battle.active || battle.finished) return true
    bagView.value = 'talent'
    bagOpen.value = true
    return true
  },
  escape() {
    if (battle.active) return true
    if (hasStackedModal()) return false
    if (view.value !== 'menu') {
      footerBack()
      return true
    }
    return false
  },
})
</script>

<template>
  <ModalShell
    title="末日都城"
    :sub="`${map.difficulty} · 第 ${game.day} 天 · ${currentPhase}`"
    wide
    nav
    :bg="mapBackground(game.location)"
    @close="closePanel"
  >
    <template #hud>
      <StatusHud />
    </template>

    <MapMenuList v-if="view === 'menu'" :items="MENU" @select="go($event.id)" />

    <section v-else-if="view === 'explore'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">在此探索</h3>
        <button type="button" class="link" @click="go('menu')">← 返回选项</button>
      </header>
      <p class="pane__desc">沿着断墙与废弃店铺翻找。有人在这里找到过整箱的罐头，也有人只带回一身尘土。</p>
      <div class="chips">
        <span>消耗 1 回合</span>
        <span>33% 食物</span>
        <span>33% 饮品</span>
        <span>34% 什么也没有</span>
      </div>
      <button type="button" class="btn btn--primary pane__action" @click="run(exploreCity)">
        探索 · 1 回合
      </button>
    </section>

    <section v-else-if="view === 'palace'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">{{ palaceTitle }}</h3>
        <button type="button" class="link" @click="backFromPalace">
          ← {{ palaceView === 'menu' ? '返回选项' : '返回王宫' }}
        </button>
      </header>

      <template v-if="palaceView === 'menu'">
        <p class="pane__desc">进入王宫本身不消耗回合。以下事务多数每天只能进行一次。</p>
        <MapMenuList :items="PALACE_MENU" @select="palaceView = $event.id" />
      </template>

      <template v-else-if="palaceView === 'steal'">
        <p class="pane__desc">银器、钱袋和供品堆在无人看守的角落。守卫每隔一会儿会巡一次。</p>
        <div class="chips">
          <span>消耗 1 回合（有衰减）</span>
          <span>每天一次</span>
          <span>10% 得 3 末日币</span>
          <span>20% 得 2 末日币</span>
          <span>30% 得 1 末日币</span>
          <span>20% 什么也没偷到</span>
          <span>20% 被发现 · 生命 -5</span>
          <span>{{ daily('steal') > 0 ? `冷却 ${daily('steal')} 天` : '今日可用' }}</span>
        </div>
        <button type="button" class="btn btn--primary pane__action" @click="run(stealPalace)">
          进行偷窃 · 1 回合
        </button>
      </template>

      <template v-else-if="palaceView === 'dance'">
        <p class="pane__desc">
          乐声从大厅里传出来。三档舞会共用同一天的入场次数，只要胸前的徽章够格，就没有人会拦你。
        </p>
        <p class="cure__note">
          {{
            daily('dance') > 0
              ? `今日舞会已结束，${daily('dance')} 天后可再次入场`
              : '今日尚未入场'
          }}
        </p>
        <div class="rows">
          <article v-for="dance in PALACE_DANCES" :key="dance.id" class="row">
            <div>
              <h4 class="row__name">{{ dance.name }}</h4>
              <p class="row__desc">{{ dance.desc }}</p>
              <p class="row__meta">
                <span>{{ dance.price > 0 ? `${dance.price} 末日币` : '免费' }}</span>
                <span>理智 +{{ dance.sanity }}</span>
                <span>1 回合 · 无衰减</span>
                <span>骑士以上</span>
              </p>
            </div>
            <button
              type="button"
              class="btn"
              :disabled="daily('dance') > 0 || game.coins < dance.price"
              @click="run(() => palaceDance(dance.id))"
            >
              {{
                daily('dance') > 0
                  ? `${daily('dance')} 天后`
                  : game.coins < dance.price
                    ? '币不足'
                    : '入场'
              }}
            </button>
          </article>
        </div>
      </template>

      <template v-else-if="palaceView === 'banquet'">
        <p class="pane__desc">
          长桌上永远有食物和酒。三档宴会共用同一天的次数，没人会在意一个沉默的食客。
        </p>
        <p class="cure__note">
          {{
            daily('banquet') > 0
              ? `今日宴会已结束，${daily('banquet')} 天后可再次入场`
              : '今日尚未入场'
          }}
        </p>
        <div class="rows">
          <article v-for="banquet in PALACE_BANQUETS" :key="banquet.id" class="row">
            <div>
              <h4 class="row__name">{{ banquet.name }}</h4>
              <p class="row__desc">{{ banquet.desc }}</p>
              <p class="row__meta">
                <span>{{ banquet.price > 0 ? `${banquet.price} 末日币` : '免费' }}</span>
                <span>饱食 +{{ banquet.hunger }}</span>
                <span>口渴 +{{ banquet.thirst }}</span>
                <span>1 回合 · 无衰减</span>
              </p>
            </div>
            <button
              type="button"
              class="btn"
              :disabled="daily('banquet') > 0 || game.coins < banquet.price"
              @click="run(() => palaceBanquet(banquet.id))"
            >
              {{
                daily('banquet') > 0
                  ? `${daily('banquet')} 天后`
                  : game.coins < banquet.price
                    ? '币不足'
                    : '入席'
              }}
            </button>
          </article>
        </div>
      </template>

      <template v-else-if="palaceView === 'room'">
        <p class="pane__desc">
          客房里的被褥是干净的。三档客房共用同一天的入住次数，躺下之后，连墙外的动静都听不见了。
        </p>
        <p class="cure__note">
          {{
            daily('room') > 0
              ? `今日客房已入住，${daily('room')} 天后可再次入住`
              : '今日尚未入住'
          }}
        </p>
        <div class="rows">
          <article v-for="room in PALACE_ROOMS" :key="room.id" class="row">
            <div>
              <h4 class="row__name">{{ room.name }}</h4>
              <p class="row__desc">{{ room.desc }}</p>
              <p class="row__meta">
                <span>{{ room.price > 0 ? `${room.price} 末日币` : '免费' }}</span>
                <span>体力 +{{ room.stamina }}</span>
                <span>2 回合 · 无衰减</span>
              </p>
            </div>
            <button
              type="button"
              class="btn"
              :disabled="daily('room') > 0 || game.coins < room.price"
              @click="run(() => palaceGuestRoom(room.id))"
            >
              {{
                daily('room') > 0
                  ? `${daily('room')} 天后`
                  : game.coins < room.price
                    ? '币不足'
                    : '入住'
              }}
            </button>
          </article>
        </div>
      </template>

      <template v-else-if="palaceView === 'cure'">
        <p class="pane__desc">医师的诊室在长廊尽头。身份越高，能用的手段越彻底。</p>
        <p class="cure__note">
          {{ daily('treatment') > 0 ? `今日已就诊，${daily('treatment')} 天后可再次接受治疗` : '今日尚未就诊' }}
        </p>
        <div class="rows">
          <article v-for="tier in TREATMENT_TIERS" :key="tier.id" class="row">
            <div>
              <h4 class="row__name">{{ tier.name }}</h4>
              <p class="row__desc">至少「{{ tier.minIdentity }}」 · 感染 -{{ tier.reduce }}</p>
            </div>
            <button type="button" class="btn" @click="run(() => treatInfection(tier.id))">
              治疗
            </button>
          </article>
        </div>
      </template>

      <template v-else-if="palaceView === 'salary'">
        <p class="pane__desc">书记官按身份登记发放。在这座都城里，一天就算一个月。</p>
        <div class="salary">
          <div
            v-for="(amount, name) in PALACE_SALARY"
            :key="name"
            class="salary__row"
            :class="{ 'is-current': name === game.identity }"
          >
            <span>{{ name }}</span>
            <b>{{ amount }} 末日币</b>
          </div>
        </div>
        <p class="cure__note">
          {{ daily('salary') > 0 ? `今日已领取，${daily('salary')} 天后可再次领取` : `当前可领 ${salaryAmount} 末日币` }}
        </p>
        <button type="button" class="btn btn--primary pane__action" @click="run(claimSalary)">
          领取俸禄
        </button>
      </template>

      <template v-else-if="palaceView === 'council'">
        <p class="pane__desc">
          七种会议共用同一个七日会期：参加其中一场，就要等下一个会期。身份越高能进的厅越深，高爵位也可以坐回低爵位的桌边。
        </p>
        <p class="cure__note">
          {{
            weekly('council') > 0
              ? `距离下次会期还有 ${weekly('council')} 天`
              : '今天可以参加一场会议'
          }}
        </p>
        <div class="rows">
          <article v-for="council in PALACE_COUNCILS" :key="council.id" class="row">
            <div>
              <h4 class="row__name">{{ council.name }}</h4>
              <p class="row__desc">{{ council.desc }}</p>
              <p class="row__meta">
                <span>需「{{ council.identity }}」</span>
                <span>{{ council.turns }} 回合</span>
                <span>末日币 +{{ council.coins }}</span>
                <span>随机{{ council.weaponTier }}近战 ×1</span>
              </p>
            </div>
            <button
              type="button"
              class="btn"
              :disabled="currentRank < council.rank || weekly('council') > 0"
              @click="run(() => attendCouncil(council.id))"
            >
              {{
                currentRank < council.rank
                  ? `需 ${council.identity}`
                  : weekly('council') > 0
                    ? `${weekly('council')} 天后`
                    : '出席'
              }}
            </button>
          </article>
        </div>
      </template>

      <template v-else-if="palaceView === 'garden'">
        <p class="pane__desc">
          石阶尽头的花园只对储君开放。四项活动各自计算次数，互不影响。
        </p>
        <p class="cure__note">
          {{
            currentRank >= GARDEN.rank
              ? '今天可以进入花园'
              : '守卫没有让你进去：花园只对储君开放'
          }}
        </p>
        <div class="rows">
          <article v-for="activity in GARDEN.activities" :key="activity.id" class="row">
            <div>
              <h4 class="row__name">{{ activity.name }}</h4>
              <p class="row__desc">{{ activity.desc }}</p>
              <p class="row__meta">
                <span>仅「{{ GARDEN.identity }}」</span>
                <span>{{ activity.turns }} 回合 · 无衰减</span>
                <span>{{ activity.days }} 天一次</span>
                <span>{{ activity.reward }}</span>
              </p>
            </div>
            <button
              type="button"
              class="btn"
              :disabled="
                currentRank < GARDEN.rank ||
                cooldownLeft(activity.cooldownKey, activity.days) > 0
              "
              @click="run(() => gardenActivity(activity.id))"
            >
              {{
                currentRank < GARDEN.rank
                  ? '需 储君'
                  : cooldownLeft(activity.cooldownKey, activity.days) > 0
                    ? `${cooldownLeft(activity.cooldownKey, activity.days)} 天后`
                    : '前往'
              }}
            </button>
          </article>
        </div>
      </template>

      <template v-else-if="palaceView === 'king'">
        <p v-if="kingDead" class="pane__desc">{{ npcById('king').deathLine }}</p>
        <p v-else-if="kingGate" class="pane__desc">{{ kingGate }}</p>
        <template v-else>
          <NpcIntro npc-id="king">
            <p class="pane__desc">{{ QUEST_OWNERS.king.intro }}</p>
          </NpcIntro>
          <QuestLinePanel owner="king" @feedback="feed = $event" />
        </template>
        <AssassinationCard npc-id="king" @feedback="feed = $event" />
      </template>

      <template v-else-if="palaceView === 'queen'">
        <template v-if="queenCanDeliver">
          <NpcIntro npc-id="queen">
            <p class="pane__desc">
              皇后米娅的目光落在你手里那封信上。信封上的蜡印已经磨损，字迹却是她认得的。
            </p>
          </NpcIntro>
          <button type="button" class="btn btn--primary pane__action" @click="deliverLetter">
            把信交给她
          </button>
        </template>
        <p v-else-if="queenGate" class="pane__desc">{{ queenGate }}</p>
        <template v-else>
          <NpcIntro npc-id="queen">
            <p class="pane__desc">{{ QUEST_OWNERS.queen.intro }}</p>
          </NpcIntro>
          <p v-if="game.flags.dawnLeaderKilled" class="cure__note">
            羿阳已经不在了。皇后没有再提新的事，但你手上已经接下的，她仍会认。
          </p>
          <QuestLinePanel owner="queen" @feedback="feed = $event" />
        </template>
        <AssassinationCard npc-id="queen" @feedback="feed = $event" />
      </template>

      <template v-else-if="palaceView === 'arena'">
        <p class="pane__desc">{{ ARENA.desc }}</p>
        <div class="chips">
          <span>必须空手 · 不装备近战/远程武器</span>
          <span>消耗 {{ ARENA.turns }} 回合（有衰减）</span>
          <span>生命 -{{ ARENA.hpCost }}</span>
          <span>理智 -{{ ARENA.sanityCost }}</span>
          <span>每天 {{ ARENA.dailyLimit }} 次</span>
          <span>今日剩余 {{ arenaRemaining }} 次</span>
        </div>
        <div class="chips">
          <span>拳头天赋 {{ arenaTitleName }} · Lv.{{ arenaLevel }}/{{ arenaMaxLevel }}</span>
          <span>熟练度 {{ arenaProgress }} / 100</span>
          <span>当前加成 {{ arenaEffectsText }}</span>
        </div>
        <div class="arena__track">
          <div class="arena__track-fill" :style="{ width: arenaProgress + '%' }" />
        </div>
        <p class="arena__warn">
          {{
            arenaFull
              ? '拳头天赋已经练到顶点。'
              : '生命或理智不足 30 时上台可能直接死亡。'
          }}
        </p>
        <p v-if="arenaWeaponsEquipped" class="arena__warn">
          {{ arenaWeaponText }} · 必须全部卸下
        </p>
        <button
          type="button"
          class="btn btn--primary pane__action"
          :disabled="!arenaCanFight"
          @click="run(arenaFight)"
        >
          {{ arenaActionLabel }}
        </button>
      </template>

      <template v-else-if="palaceView === 'shop'">
        <p class="pane__desc">
          柜台上只摆着四样东西，每一件都罩在玻璃里。价格牌是手写的，墨迹很新。
        </p>
        <div class="goods">
          <article v-for="good in PALACE_SHOP" :key="good.id" class="good">
            <img class="good__img" :src="getItem(good.itemId)?.image" :alt="good.name" />
            <div class="good__main">
              <h4 class="good__name">
                {{ good.name }}
                <span class="good__tier">{{ good.tier }}</span>
              </h4>
              <p class="good__note">{{ good.note }}</p>
            </div>
            <div class="good__buy">
              <span>{{ good.price }} 币</span>
              <button type="button" class="btn" @click="run(() => buyPalaceGood(good.id))">
                购买
              </button>
            </div>
          </article>
        </div>
      </template>

    </section>

    <section v-else-if="view === 'bank'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">都城银行</h3>
        <button type="button" class="link" @click="go('menu')">← 返回选项</button>
      </header>

      <div class="loan">
        <template v-if="game.loan">
          <div class="loan__line">
            <span>借款身份</span><b>{{ game.loan.identity ?? '平民' }}</b>
          </div>
          <div class="loan__line">
            <span>借款</span><b>{{ game.loan.principal }} 末日币</b>
          </div>
          <div class="loan__line">
            <span>利息（{{ rateText(loanTierOfBorrow) }} · 最低 1 币）</span>
            <b>{{ game.loan.interest }} 末日币</b>
          </div>
          <div class="loan__line">
            <span>应还</span><b>{{ game.loan.due }} 末日币</b>
          </div>
          <div class="loan__line">
            <span>到期日</span><b>第 {{ game.loan.dueDay }} 天</b>
          </div>
          <div class="loan__line">
            <span>剩余</span>
            <b>{{ loanRemainText() }}</b>
          </div>
          <div v-if="game.loan.graceDays > 0" class="loan__line">
            <span>宽限</span>
            <b>{{ game.loan.graceUsed ? '已申请' : `可申请 ${game.loan.graceDays} 天` }}</b>
          </div>

          <div class="loan__actions">
            <button type="button" class="btn btn--primary" @click="run(repayLoan)">
              还款 {{ game.loan.due }} 币
            </button>
            <button
              v-if="loanTierOfBorrow.graceDays > 0 && !game.loan.graceUsed"
              type="button"
              class="btn"
              :disabled="loanOverdueDays > 0"
              @click="run(applyLoanGrace)"
            >
              申请宽限 · {{ game.loan.graceDays }} 天
            </button>
          </div>
        </template>

        <template v-else>
          <template v-if="loanTier">
            <p class="pane__desc">
              以「{{ game.identity }}」身份，可借 {{ loanTier.min }}-{{ loanTier.max }} 枚末日币；
              利息 {{ rateText(loanTier) }}（不足 1 币按 1 币算），期限 {{ LOAN_TERM_DAYS }} 天（借款当天算第
              1 天，第 {{ game.day + LOAN_TERM_DAYS - 1 }} 天为最后还款日，次日逾期）{{
                loanTier.graceDays
                  ? `，可申请宽限 ${loanTier.graceDays} 天`
                  : '，不可宽限'
              }}。
            </p>
            <div class="loan__form">
              <label for="loan-amount">借款金额</label>
              <input
                id="loan-amount"
                v-model.number="loanAmount"
                type="number"
                :min="loanTier.min"
                :max="loanTier.max"
              />
              <span>末日币</span>
              <button type="button" class="btn btn--primary" @click="run(() => borrowCoins(loanAmount))">
                借贷
              </button>
            </div>
            <p class="cure__note">利息按本金 × {{ rateText(loanTier) }} 计算，四舍五入，最低 1 币。</p>
          </template>
          <p v-else class="pane__desc">至少需要平民身份，银行才会考虑你的借贷申请。</p>
        </template>

        <p class="loan__warn">
          {{ loanWarning(game.loan ? loanTierOfBorrow : loanTier) }}
          <br />
          每笔贷款结清前，银行不会再借出第二笔。
        </p>
      </div>

      <section class="deal">
        <header class="deal__head">
          <h4 class="deal__title">货币兑换</h4>
          <span class="deal__tag">1 曙光币 = {{ formatRate(rateInfo.rate) }} 末日币</span>
        </header>
        <p class="deal__desc">
          汇率按你在两个阵营的历史最高身份计算：身份越高，日收入购买力越强，换汇也越值钱。
        </p>
        <div class="deal__stats">
          <span>都城 · {{ rateInfo.cityIdentity }} · {{ rateInfo.cityIncome }} 末日币/日</span>
          <span>曙光 · {{ rateInfo.dawnIdentity }} · {{ rateInfo.dawnIncome }} 曙光币/日</span>
          <span>口粮购买力 {{ formatMoney(rateInfo.cityPower) }} : {{ formatMoney(rateInfo.dawnPower) }} 份/日（2 币/份）</span>
        </div>
        <p class="deal__hint">
          1 曙光币 = {{ formatRate(rateInfo.rate) }} 末日币 · 1 末日币 ≈ {{ formatRate(reverseRate) }} 曙光币
          <br />
          持有：末日币 {{ formatMoney(game.coins) }} · 曙光币 {{ formatMoney(game.dawnCoins) }}
          <br v-if="rateInfo.cityFallback || rateInfo.dawnFallback" />
          <span v-if="rateInfo.cityFallback || rateInfo.dawnFallback">
            未加入的阵营按最低身份（平民 / 无身份）保底计算。
          </span>
        </p>

        <div class="trade">
          <label for="trade-coins">末日币 → 曙光币</label>
          <input id="trade-coins" v-model.number="tradeCoins" type="number" min="0.01" step="0.01" />
          <span class="trade__preview">可得 {{ formatMoney(previewCoins) }} 曙光币</span>
          <button type="button" class="btn" @click="exchangeCoins">兑换</button>
        </div>
        <div class="trade">
          <label for="trade-dawn">曙光币 → 末日币</label>
          <input id="trade-dawn" v-model.number="tradeDawn" type="number" min="0.01" step="0.01" />
          <span class="trade__preview">可得 {{ formatMoney(previewDawn) }} 末日币</span>
          <button type="button" class="btn" @click="exchangeDawn">兑换</button>
        </div>
        <p class="deal__hint">金额精确到 0.01，结果向下取整；汇率按日收入购买力实时变化。</p>
      </section>

      <article class="banker-card">
        <div class="banker-card__main">
          <h4>行长钱三爷</h4>
          <p>柜台后真正的行长。欠他的钱，只能亲自谈化债。</p>
        </div>
        <button type="button" class="btn" @click="go('banker')">见他</button>
      </article>
    </section>

    <section v-else-if="view === 'banker'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">行长钱三爷</h3>
        <button type="button" class="link" @click="go('bank')">← 返回银行</button>
      </header>

      <NpcIntro npc-id="banker">
        <p class="pane__desc">{{ BANKER.intro }}</p>
        <p class="cure__note">{{ BANKER.debtHint }}</p>
      </NpcIntro>

      <section class="deal">
        <header class="deal__head">
          <h4 class="deal__title">关于化债</h4>
          <span class="deal__tag">{{ debtState.label }}</span>
        </header>
        <p class="deal__desc">
          进入战斗：行长生命 250、攻击 30，但血量锁在 1 点，打不死。把他打到 1
          点血，他会免掉这笔贷款的全部利息，只收本金，并把到期日再宽限 30 天。
        </p>
        <div class="deal__stats">
          <span>生命 250</span>
          <span>攻击 30</span>
          <span>锁血 1</span>
          <span>消耗 1 回合</span>
        </div>
        <p class="deal__hint">{{ debtState.hint }}</p>
        <button
          v-if="!bankerBattle"
          type="button"
          class="btn btn--primary deal__btn"
          :disabled="!debtState.can || battle.active"
          @click="startDebtFight"
        >
          逼他认账 · 1 回合
        </button>
        <BattleView v-if="bankerBattle" @done="bankerDone" />
      </section>

    </section>

    <section v-else-if="view === 'identity'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">身份办理</h3>
        <button type="button" class="link" @click="go('menu')">← 返回选项</button>
      </header>

      <div class="identity">
        <div class="identity__badge">
          <img v-if="identity" :src="identity.image" :alt="identity.name" />
          <span v-else>无</span>
        </div>
        <div class="identity__info">
          <h4>{{ game.identity ?? '尚无身份' }}</h4>
          <p>历史最高身份：{{ game.maxIdentity ?? '无' }}</p>
        </div>
      </div>

      <div class="rows">
        <article class="row">
          <div>
            <h4 class="row__name">投靠都城</h4>
            <p class="row__desc">向都城衙门登记名册，换取一枚平民徽章。</p>
          </div>
          <button type="button" class="btn" @click="run(joinCity)">投靠</button>
        </article>
        <article class="row">
          <div>
            <h4 class="row__name">补办身份</h4>
            <p class="row__desc">身份徽章遗失时，可领取历史最高身份的身份牌。</p>
          </div>
          <button type="button" class="btn" @click="run(restoreIdentity)">补办</button>
        </article>
        <article class="row">
          <div>
            <h4 class="row__name">成为骑士</h4>
            <p class="row__desc">需要 30 末日币，并已拥有平民身份。</p>
          </div>
          <button type="button" class="btn" @click="run(becomeKnight)">办理</button>
        </article>
      </div>

      <div class="ladder">
        <span
          v-for="level in IDENTITY_LEVELS"
          :key="level.name"
          class="ladder__step"
          :class="{
            'is-current': level.name === game.identity,
            'is-owned': level.rank < currentRank,
          }"
        >
          {{ level.name }}
        </span>
      </div>
    </section>

    <section v-else-if="view === 'labor'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">进行劳动</h3>
        <button type="button" class="link" @click="go('menu')">← 返回选项</button>
      </header>
      <p class="pane__desc">
        都城的活计按身份分配：身份越高，耗的回合越少，拿的末日币越多。每天只能做一份工。
      </p>
      <p class="cure__note">
        {{
          daily('labor') > 0
            ? `今天已经劳动过，${daily('labor')} 天后可以再做一份`
            : '今天还没有劳动'
        }}
      </p>
      <div class="rows">
        <article v-for="tier in LABOR_TIERS" :key="tier.id" class="row">
          <div>
            <h4 class="row__name">{{ tier.name }}</h4>
            <p class="row__desc">{{ tier.desc }}</p>
            <p class="row__meta">
              <span>需「{{ tier.identity }}」</span>
              <span>{{ tier.turns }} 回合</span>
              <span>末日币 +{{ tier.coins }}</span>
              <span v-if="tier.costText">{{ tier.costText }}</span>
            </p>
          </div>
          <button
            type="button"
            class="btn"
            :disabled="currentRank < tier.rank || daily('labor') > 0"
            @click="run(() => laborCity(tier.id))"
          >
            {{
              currentRank < tier.rank
                ? `需 ${tier.identity}`
                : daily('labor') > 0
                  ? `${daily('labor')} 天后`
                  : '开始'
            }}
          </button>
        </article>
      </div>
    </section>

    <section v-else-if="view === 'market'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">贫民集市</h3>
        <button type="button" class="link" @click="go('menu')">← 返回选项</button>
      </header>
      <p class="pane__desc">摊位挤在断墙下，摊主们盯着每一个靠近的人。所有标价都用末日币结算。</p>

      <div class="goods">
        <article v-for="good in SHOP_GOODS" :key="good.id" class="good">
          <img class="good__img" :src="getItem(good.itemId)?.image" :alt="good.name" />
          <div class="good__main">
            <h4 class="good__name">{{ good.name }}</h4>
            <p class="good__note">{{ good.note }}</p>
          </div>
          <div class="good__buy">
            <span>{{ good.price }} 币</span>
            <button type="button" class="btn" @click="run(() => buyGood(good.id))">购买</button>
          </div>
        </article>
      </div>

      <div class="rows">
        <article class="row">
          <div>
            <h4 class="row__name">近战武器保养</h4>
            <p class="row__desc">
              末日城堡的铁匠只接近战活。保养费按品质计价（每 {{ REPAIR_PERCENT_PER_COIN }}%
              缺口 1～10 币），按缺口一次修满。
            </p>
            <p v-if="meleeRepair.state === 'empty'" class="row__hint">你还没有装备近战武器。</p>
            <p v-else-if="meleeRepair.state === 'free'" class="row__hint">
              「{{ meleeRepair.name }}」不需要保养。
            </p>
            <p v-else-if="meleeRepair.state === 'full'" class="row__hint">
              「{{ meleeRepair.name }}」耐久已满（{{ meleeRepair.max }} / {{ meleeRepair.max }}）。
            </p>
            <p v-else class="row__hint">
              「{{ meleeRepair.name }}」耐久 {{ meleeRepair.current }} / {{ meleeRepair.max }} ·
              {{ meleeRepair.tier }}品质每 {{ REPAIR_PERCENT_PER_COIN }}% 缺口 {{ meleeRepair.unitPrice }} 币 ·
              修复需 {{ meleeRepair.cost }} 币
            </p>
          </div>
          <button type="button" class="btn" @click="run(repairMeleeCity)">
            保养 · {{ meleeRepair.cost || 0 }} 币
          </button>
        </article>
      </div>
    </section>

    <template #footer>
      <span class="feed">{{ feed }}</span>
      <div class="foot-btns">
        <button v-if="view !== 'menu'" type="button" class="btn" @click="footerBack">
          返回选项
        </button>
        <button
          type="button"
          class="btn"
          :disabled="battle.active || battle.finished"
          @click="bagOpen = true"
        >
          背包
        </button>
        <button type="button" class="btn" @click="closePanel">离开都城</button>
      </div>
    </template>

    <Teleport to="body">
      <InventoryPanel v-if="bagOpen" :initial-view="bagView" @close="bagOpen = false" />
    </Teleport>
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

.cure__note {
  margin: 12px 0 0;
  font-size: 10.5px;
  letter-spacing: 0.05em;
  color: var(--sick);
}

.arena__warn {
  margin: 0;
  padding: 7px 9px;
  font-size: 10px;
  line-height: 1.7;
  letter-spacing: 0.04em;
  color: var(--rust-soft);
  border: 1px solid rgba(193, 74, 50, 0.4);
  background: rgba(193, 74, 50, 0.08);
}

.arena__track {
  height: 4px;
  background: rgba(214, 208, 191, 0.12);
  overflow: hidden;
}

.arena__track-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--rust), var(--rust-soft));
  transition: width 0.4s ease;
}

.salary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

.salary__row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 5px 9px;
  border: 1px solid var(--line);
  font-size: 10.5px;
  color: var(--text-mute);
}

.salary__row b {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--bone);
}

.salary__row.is-current {
  border-color: rgba(193, 74, 50, 0.6);
  background: rgba(193, 74, 50, 0.1);
  color: var(--bone);
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

.row__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 6px 0 0;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.04em;
  color: var(--sick);
}

.row .btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.row .btn {
  height: 30px;
  padding: 0 14px;
  font-size: 11px;
  flex: none;
}

.loan {
  margin-top: 14px;
}

.loan__line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.loan__line b {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--bone);
}

.loan__form {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  font-size: 11px;
  color: var(--text-mute);
}

.loan__form label {
  letter-spacing: 0.08em;
}

.loan__form input {
  width: 64px;
  height: 30px;
  padding: 0 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--line-strong);
  outline: none;
}

.loan__form input:focus {
  border-color: rgba(193, 74, 50, 0.6);
}

.loan__form .btn {
  height: 30px;
  padding: 0 16px;
  font-size: 11px;
  margin-left: auto;
}

.loan .btn {
  margin-top: 14px;
  height: 34px;
  font-size: 11.5px;
}

.loan__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.loan__actions .btn {
  margin-top: 0;
}

.loan__actions .btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.loan__warn {
  margin: 16px 0 0;
  padding: 10px 12px;
  border-left: 2px solid var(--rust);
  background: rgba(193, 74, 50, 0.08);
  font-size: 10.5px;
  line-height: 1.7;
  color: var(--rust-soft);
}

.banker-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 16px;
  padding: 12px 14px;
  border: 1px solid rgba(205, 185, 141, 0.28);
  border-left: 2px solid var(--bone);
  background: linear-gradient(180deg, rgba(205, 185, 141, 0.05), rgba(0, 0, 0, 0.18));
}

.banker-card h4 {
  margin: 0;
  font-family: var(--font-title);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--bone);
}

.banker-card p {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-dim);
}

.banker-card .btn {
  flex: none;
  height: 32px;
  font-size: 11px;
}

.deal {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.24);
}

.deal__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.deal__title {
  margin: 0;
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--text);
}

.deal__tag {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.1em;
  color: var(--bone);
}

.deal__desc {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.8;
  color: var(--text-dim);
}

.deal__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 10px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-mute);
}

.deal__hint {
  margin: 8px 0 0;
  font-size: 10.5px;
  line-height: 1.7;
  color: var(--text-mute);
}

.deal__btn {
  height: 34px;
  margin-top: 12px;
  font-size: 11.5px;
}

.deal__btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.trade {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  font-size: 11px;
  color: var(--text-mute);
}

.trade label {
  min-width: 112px;
  letter-spacing: 0.06em;
}

.trade input {
  width: 70px;
  height: 30px;
  padding: 0 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--line-strong);
  outline: none;
}

.trade input:focus {
  border-color: rgba(193, 74, 50, 0.6);
}

.trade__preview {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--bone);
}

.trade .btn {
  height: 30px;
  padding: 0 16px;
  font-size: 11px;
  margin-left: auto;
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

.good__tier {
  margin-left: 8px;
  padding: 1px 6px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: #d8b45a;
  border: 1px solid rgba(216, 180, 90, 0.5);
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

.feed {
  flex: 1;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-dim);
}

.foot-btns {
  display: flex;
  align-items: center;
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

  :deep(.modal-foot) {
    flex-wrap: wrap;
  }

  .foot-btns {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
