<script setup>
import { computed, ref } from 'vue'
import {
  BANKER,
  GARDEN,
  IDENTITY_LEVELS,
  LABOR_TIERS,
  LOAN_TERM_DAYS,
  PALACE_COOLDOWN,
  PALACE_COUNCILS,
  PALACE_SALARY,
  QUEST_OWNERS,
  REPAIR_PERCENT_PER_COIN,
  SHOP_GOODS,
  TREATMENT_TIERS,
  formatMoney,
  identityInfo,
  identityRank,
  getItem,
  loanTierByRank,
  loanTierFor,
  npcById,
  repairCoinCost,
} from '../data'
import { MAPS } from '../game/config'
import {
  applyLoanGrace,
  attendCouncil,
  becomeKnight,
  borrowCoins,
  bribeGuard,
  buyGood,
  canEnterPalace,
  claimSalary,
  cooldownLeft,
  currentPhase,
  deliverQueenLetter,
  exchangeCurrency,
  exploreCity,
  game,
  isNpcDead,
  isQuestDone,
  joinCity,
  laborCity,
  palaceBanquet,
  palaceDance,
  palaceGuestRoom,
  questLineLocked,
  repairMeleeCity,
  repayLoan,
  restoreIdentity,
  stealPalace,
  treatInfection,
  visitGarden,
} from '../game/store'
import { battle, resetBattle, startBankerCombat } from '../game/battle'
import AssassinationCard from './AssassinationCard.vue'
import BattleView from './BattleView.vue'
import ModalShell from './ModalShell.vue'
import QuestLinePanel from './QuestLinePanel.vue'
import StatusHud from './StatusHud.vue'

const emit = defineEmits(['close'])

const MENU = [
  { id: 'explore', no: '01', name: '在此探索', desc: '花 1 回合搜刮废墟，可能找到食物或饮品。' },
  { id: 'depths', no: '02', name: '都城深处', desc: '投靠都城、出示身份，或贿赂守卫进入王宫。' },
  { id: 'bank', no: '03', name: '都城银行', desc: '按身份额度、利率与宽限借贷；逾期后果各不相同。' },
  { id: 'identity', no: '04', name: '身份办理', desc: '补办身份牌，或花 30 末日币成为骑士。' },
  { id: 'labor', no: '05', name: '进行劳动', desc: '八档身份活计，每天一份，身份越高越轻、越赚。' },
  { id: 'market', no: '06', name: '贫民集市', desc: '所有普通近战武器与基础补给，明码标价。' },
]

const PALACE_MENU = [
  { id: 'steal', no: '01', name: '进行偷窃', desc: '1 回合。20% 得 1 末日币，80% 被发现（生命 -50）。' },
  { id: 'dance', no: '02', name: '宫廷舞会', desc: '1 回合，每日一次。骑士以上，理智 +50。' },
  { id: 'banquet', no: '03', name: '宫廷宴会', desc: '1 回合，每日一次。骑士以上，饱食 / 口渴 +50。' },
  { id: 'room', no: '04', name: '宫廷客房', desc: '2 回合，每日一次。骑士以上，体力 +50。' },
  { id: 'cure', no: '05', name: '感染治疗', desc: '1 回合，每日一次。按身份解锁六档治疗。' },
  { id: 'salary', no: '06', name: '领取俸禄', desc: '1 回合，每日一次。按身份领取末日币。' },
  { id: 'council', no: '07', name: '参加会议', desc: '1 回合，七天一次。五种会议按身份开放。' },
  { id: 'garden', no: '08', name: '宫廷花园', desc: '仅储君可进入。七天一次，药品与食物相赠。' },
  { id: 'queen', no: '09', name: '皇后米娅', desc: '她只肯见哥哥信得过的人，手里还得有那封信。' },
  { id: 'king', no: '10', name: '国王艾伦', desc: '骑士以上，他才会开口；他要的东西一件比一件难。' },
  { id: 'secret', no: '11', name: '秘密房间', desc: '占位区域，后续开放。', placeholder: true },
]

const map = MAPS.find((item) => item.id === 'ruined-city')
const view = ref('menu')
const feed = ref('城门在身后合拢，铁链拖过地面。你站在都城的阴影里。')
const loanAmount = ref(1)
const palaceView = ref('menu')
const tradeCoins = ref(2)
const tradeDawn = ref(2)

const identity = computed(() => identityInfo(game.identity))
const loanDaysLeft = computed(() => (game.loan ? game.loan.dueDay - game.day : 0))
const loanOverdueDays = computed(() => (game.loan ? Math.max(0, game.day - game.loan.dueDay) : 0))
const loanTier = computed(() => loanTierFor(game.identity))
const loanTierOfBorrow = computed(() => (game.loan ? loanTierByRank(game.loan.rank) : null))
const currentRank = computed(() => identityRank(game.identity))
const palaceTitle = computed(
  () => PALACE_MENU.find((item) => item.id === palaceView.value)?.name ?? '都城王宫',
)
const palacePlaceholder = computed(
  () => PALACE_MENU.find((item) => item.id === palaceView.value && item.placeholder) ?? null,
)
const salaryAmount = computed(() => PALACE_SALARY[game.identity] ?? 0)
const meleeRepair = computed(() => {
  const equipped = game.equipment.melee
  if (!equipped) return { name: '', current: 0, max: 0, cost: 0, state: 'empty' }
  const def = getItem(equipped.id)
  const max = def?.weapon?.durability
  if (!Number.isFinite(max)) return { name: def?.name ?? '', current: 0, max: 0, cost: 0, state: 'free' }
  const current = Number.isFinite(equipped.durability) ? equipped.durability : max
  const cost = repairCoinCost(current, max)
  return { name: def?.name ?? '近战武器', current, max, cost, state: cost > 0 ? 'worn' : 'full' }
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
const previewCoins = computed(() =>
  Math.floor(Math.max(0, Number(tradeCoins.value) || 0) / BANKER.exchangeRate),
)
const previewDawn = computed(() =>
  Math.floor(Math.max(0, Number(tradeDawn.value) || 0) / BANKER.exchangeRate),
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
  if (tier.deathOnDefault) return '逾期未还：直接死亡（结局「高利贷」）。'
  if (tier.confiscate) {
    return '逾期未还：没收背包内全部食物、饮品与药品（仅一次），欠款保留；未还清前不可再借。'
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
    feed.value = '守卫拦住你：至少需要「骑士」身份才能进入都城王宫。'
    return
  }
  palaceView.value = 'menu'
  view.value = 'palace'
}

function bribe() {
  const before = game.coins
  const line = bribeGuard()
  feed.value = line
  if (before >= 1) {
    palaceView.value = 'menu'
    view.value = 'palace'
  }
}

function battleBusy() {
  if (!battle.active) return false
  feed.value = '战斗还没结束：先逃跑，或者把它打倒'
  return true
}

function backFromPalace() {
  if (battleBusy()) return
  if (palaceView.value === 'menu') view.value = 'depths'
  else palaceView.value = 'menu'
}

function go(next) {
  if (battleBusy()) return
  if (battle.finished) resetBattle()
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
</script>

<template>
  <ModalShell
    title="末日都城"
    :sub="`${map.difficulty} · 第 ${game.day} 天 · ${currentPhase}`"
    wide
    @close="closePanel"
  >
    <template #hud>
      <StatusHud />
    </template>

    <section v-if="view === 'menu'" class="menu">
      <article v-for="item in MENU" :key="item.id" class="card" @click="go(item.id)">
        <span class="card__no">{{ item.no }}</span>
        <div class="card__main">
          <h3 class="card__name">{{ item.name }}</h3>
          <p class="card__desc">{{ item.desc }}</p>
        </div>
        <span class="card__arrow">→</span>
      </article>
    </section>

    <section v-else-if="view === 'explore'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">在此探索</h3>
        <button type="button" class="link" @click="go('menu')">← 返回选项</button>
      </header>
      <p class="pane__desc">沿着断墙与废弃店铺翻找。有人在这里找到过整箱的罐头，也有人只带回一身尘土。</p>
      <div class="chips">
        <span>消耗 1 回合</span>
        <span>25% 食物</span>
        <span>25% 饮品</span>
        <span>50% 什么也没有</span>
      </div>
      <button type="button" class="btn btn--primary pane__action" @click="run(exploreCity)">
        在此探索 · 1 回合
      </button>
    </section>

    <section v-else-if="view === 'depths'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">都城深处</h3>
        <button type="button" class="link" @click="go('menu')">← 返回选项</button>
      </header>

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
            <h4 class="row__name">出示身份</h4>
            <p class="row__desc">
              至少需要骑士身份才能进入都城王宫。当前身份：{{ game.identity ?? '无' }}
            </p>
          </div>
          <button type="button" class="btn" @click="tryPalace">出示身份</button>
        </article>

        <article class="row">
          <div>
            <h4 class="row__name">贿赂守卫</h4>
            <p class="row__desc">花 1 末日币，让守卫当作什么都没看见。</p>
          </div>
          <button type="button" class="btn" @click="bribe">贿赂 · 1 币</button>
        </article>
      </div>
    </section>

    <section v-else-if="view === 'palace'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">{{ palaceTitle }}</h3>
        <button type="button" class="link" @click="backFromPalace">
          ← {{ palaceView === 'menu' ? '返回深处' : '返回王宫' }}
        </button>
      </header>

      <template v-if="palaceView === 'menu'">
        <p class="pane__desc">进入王宫本身不消耗回合。以下事务多数每天只能进行一次。</p>
        <div class="menu menu--palace">
          <article
            v-for="item in PALACE_MENU"
            :key="item.id"
            class="card"
            @click="palaceView = item.id"
          >
            <span class="card__no">{{ item.no }}</span>
            <div class="card__main">
              <h3 class="card__name">{{ item.name }}</h3>
              <p class="card__desc">{{ item.desc }}</p>
            </div>
            <span class="card__arrow">→</span>
          </article>
        </div>
      </template>

      <template v-else-if="palaceView === 'steal'">
        <p class="pane__desc">银器、钱袋和供品堆在无人看守的角落。守卫每隔一会儿会巡一次。</p>
        <div class="chips">
          <span>消耗 1 回合（有衰减）</span>
          <span>20% 得 1 末日币</span>
          <span>80% 被发现 · 生命 -50</span>
        </div>
        <button type="button" class="btn btn--primary pane__action" @click="run(stealPalace)">
          进行偷窃 · 1 回合
        </button>
      </template>

      <template v-else-if="palaceView === 'dance'">
        <p class="pane__desc">乐声从大厅里传出来。只要胸前的徽章够格，没有人会拦你。</p>
        <div class="chips">
          <span>消耗 1 回合 · 无衰减</span>
          <span>骑士以上</span>
          <span>理智 +50</span>
          <span>{{ daily('dance') > 0 ? `冷却 ${daily('dance')} 天` : '今日可用' }}</span>
        </div>
        <button type="button" class="btn btn--primary pane__action" @click="run(palaceDance)">
          参加舞会
        </button>
      </template>

      <template v-else-if="palaceView === 'banquet'">
        <p class="pane__desc">长桌上永远有食物和酒。没人会在意一个沉默的食客。</p>
        <div class="chips">
          <span>消耗 1 回合 · 无衰减</span>
          <span>骑士以上</span>
          <span>饱食 +50 / 口渴 +50</span>
          <span>{{ daily('banquet') > 0 ? `冷却 ${daily('banquet')} 天` : '今日可用' }}</span>
        </div>
        <button type="button" class="btn btn--primary pane__action" @click="run(palaceBanquet)">
          参加宴会
        </button>
      </template>

      <template v-else-if="palaceView === 'room'">
        <p class="pane__desc">客房里的被褥是干净的。躺下之后，连墙外的动静都听不见了。</p>
        <div class="chips">
          <span>消耗 2 回合 · 无衰减</span>
          <span>骑士以上</span>
          <span>体力 +50</span>
          <span>不消耗饱食度</span>
          <span>{{ daily('room') > 0 ? `冷却 ${daily('room')} 天` : '今日可用' }}</span>
        </div>
        <button type="button" class="btn btn--primary pane__action" @click="run(palaceGuestRoom)">
          入住客房 · 2 回合
        </button>
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
          五种会议共用同一个七日会期：参加其中一场，就要等下一个会期。身份越高，坐得越靠前，听得也越多。
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
                <span>理智 +{{ council.sanity }}</span>
                <span v-if="council.medicine">随机药品 ×{{ council.medicine }}</span>
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
          石阶尽头的花园只对储君开放。藤架下摆着当日的药品与封存的食物，石桌上还压着一叠末日币。
        </p>
        <div class="chips">
          <span>仅「{{ GARDEN.identity }}」</span>
          <span>{{ GARDEN.turns }} 回合 · 无衰减</span>
          <span>七天一次</span>
          <span>药品 ×{{ GARDEN.medicines }}</span>
          <span>食物 ×{{ GARDEN.foods }}</span>
          <span>末日币 +{{ GARDEN.coins }}</span>
        </div>
        <p class="cure__note">
          {{
            weekly('garden') > 0
              ? `距离下次开放还有 ${weekly('garden')} 天`
              : currentRank >= GARDEN.rank
                ? '今天可以进入花园'
                : '守卫没有让你进去：花园只对储君开放'
          }}
        </p>
        <button
          type="button"
          class="btn btn--primary pane__action"
          :disabled="currentRank < GARDEN.rank"
          @click="run(visitGarden)"
        >
          进入花园
        </button>
      </template>

      <template v-else-if="palaceView === 'king'">
        <p v-if="kingDead" class="pane__desc">{{ npcById('king').deathLine }}</p>
        <p v-else-if="kingGate" class="pane__desc">{{ kingGate }}</p>
        <template v-else>
          <p class="pane__desc">{{ QUEST_OWNERS.king.intro }}</p>
          <QuestLinePanel owner="king" @feedback="feed = $event" />
        </template>
        <AssassinationCard npc-id="king" @feedback="feed = $event" />
      </template>

      <template v-else-if="palaceView === 'queen'">
        <template v-if="queenCanDeliver">
          <p class="pane__desc">
            皇后米娅的目光落在你手里那封信上。信封上的蜡印已经磨损，字迹却是她认得的。
          </p>
          <button type="button" class="btn btn--primary pane__action" @click="deliverLetter">
            把信交给她
          </button>
        </template>
        <p v-else-if="queenGate" class="pane__desc">{{ queenGate }}</p>
        <template v-else>
          <p class="pane__desc">{{ QUEST_OWNERS.queen.intro }}</p>
          <p v-if="game.flags.dawnLeaderKilled" class="cure__note">
            羿阳已经不在了。皇后没有再提新的事，但你手上已经接下的，她仍会认。
          </p>
          <QuestLinePanel owner="queen" @feedback="feed = $event" />
        </template>
        <AssassinationCard npc-id="queen" @feedback="feed = $event" />
      </template>

      <div v-else class="placeholder">
        <span class="eyebrow">占位 · {{ palacePlaceholder?.name }}</span>
        <p>{{ palacePlaceholder?.desc }}石阶、烛火与长廊都还只是轮廓，这里的内容会在后续版本接入。</p>
      </div>
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

      <article class="banker-card">
        <div class="banker-card__main">
          <h4>子选项 · 行长金钱堡</h4>
          <p>柜台后真正的行长。可以谈化债，也可以互换末日币与曙光币。</p>
        </div>
        <button type="button" class="btn" @click="go('banker')">见他</button>
      </article>
    </section>

    <section v-else-if="view === 'banker'" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">行长金钱堡</h3>
        <button type="button" class="link" @click="go('bank')">← 返回银行</button>
      </header>

      <p class="pane__desc">{{ BANKER.intro }}</p>
      <p class="cure__note">{{ BANKER.debtHint }}</p>

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

      <section class="deal">
        <header class="deal__head">
          <h4 class="deal__title">货币互换</h4>
          <span class="deal__tag">2 : 1</span>
        </header>
        <p class="deal__desc">{{ BANKER.exchangeLine }}</p>
        <p class="deal__hint">
          持有：末日币 {{ formatMoney(game.coins) }} · 曙光币 {{ formatMoney(game.dawnCoins) }}
        </p>

        <div class="trade">
          <label for="trade-coins">末日币 → 曙光币</label>
          <input id="trade-coins" v-model.number="tradeCoins" type="number" min="2" step="1" />
          <span class="trade__preview">可得 {{ previewCoins }} 曙光币</span>
          <button type="button" class="btn" @click="exchangeCoins">互换</button>
        </div>
        <div class="trade">
          <label for="trade-dawn">曙光币 → 末日币</label>
          <input id="trade-dawn" v-model.number="tradeDawn" type="number" min="2" step="1" />
          <span class="trade__preview">可得 {{ previewDawn }} 末日币</span>
          <button type="button" class="btn" @click="exchangeDawn">互换</button>
        </div>
        <p class="deal__hint">每 2 枚换 1 枚；输入奇数时，零头会留在手里。</p>
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
          <button type="button" class="btn" @click="run(becomeKnight)">办理 · 30 币</button>
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
              末日城堡的铁匠只接近战活。每 1 末日币修复 {{ REPAIR_PERCENT_PER_COIN }}%
              最大耐久，按缺口一次修满。
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
        <button v-if="view !== 'menu'" type="button" class="btn" @click="go('menu')">
          返回选项
        </button>
        <button type="button" class="btn" @click="closePanel">离开都城</button>
      </div>
    </template>
  </ModalShell>
</template>

<style scoped>
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

.card__main {
  min-width: 0;
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

.placeholder {
  margin-top: 16px;
  padding: 28px 24px;
  border: 1px dashed var(--line-strong);
  text-align: center;
}

.placeholder p {
  max-width: 460px;
  margin: 12px auto 0;
  font-size: 11.5px;
  line-height: 1.9;
  color: var(--text-mute);
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
