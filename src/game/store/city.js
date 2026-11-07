import {
  BANKER,
  DAWN_SALARY,
  EXCHANGE_BASKET_PRICE,
  exchangeRateFromIncome,
  floorToCents,
  formatMoney,
  roundToCents,
  KNIGHT_COST,
  LABOR_TIERS,
  LOAN_TERM_DAYS,
  PALACE_COOLDOWN,
  PALACE_SALARY,
  SHOP_GOODS,
  addItem,
  dawnRank,
  fieldMapById,
  getItem,
  identityRank,
  loanInterest,
  loanTierByRank,
  loanTierFor,
  pickCityLoot,
  pickFieldLoot,
  pickZombie,
} from '../../data'
import { game, checkAchievements, adjustStats, grantIdentity, useCooldown, advanceTurns } from './core.js'

/* ===== 末日都城 ===== */

function gainItem(itemId, qty = 1) {
  const def = getItem(itemId)
  const leftover = addItem(game.inventory, itemId, qty)
  if (leftover > 0) return `背包已满，${def?.name ?? '物品'}留在了地上`
  return `获得 ${def?.name ?? itemId} ×${qty}`
}

export function exploreCity() {
  if (game.dead || game.location !== 'ruined-city') return ''

  advanceTurns(1)
  if (game.dead) return ''

  const itemId = pickCityLoot()
  if (!itemId) return '你搜遍了这条街，什么也没有找到。'

  const def = getItem(itemId)
  const lead = def?.category === 'drink' ? '你在倒塌的便利店下找到一瓶饮品' : '你在废墟里翻出一份食物'
  return `${lead}：${gainItem(itemId)}`
}

const FIELD_LOOT_LEADS = {
  food: '你在弃置的灶台边找到一份食物',
  drink: '你在倒下的冷柜旁找到一瓶饮品',
  fruit: '你从还没枯死的枝头摘下',
  medicine: '你在落满灰的药柜里翻出',
  melee: '你在遗落的装备袋里抽出一把近战武器',
  ranged: '你在枪柜的夹层里找到一把远程武器',
}

/**
 * 野外探索：消耗 1 回合，按地图遭遇率触发丧尸，否则按掉落表搜到物资
 * 返回 { mapId, line, zombie?, loot? }，由野外面板决定是否进入战斗
 */
export function exploreField(mapId) {
  if (game.dead || game.location !== mapId) return null
  const map = fieldMapById(mapId)
  if (!map) return null

  advanceTurns(1)
  if (game.dead) return null

  if (Math.random() < map.encounterRate) {
    const zombie = pickZombie(map.zombiePool)
    return {
      mapId,
      zombie,
      line: `你在「${map.name}」深处撞见了${zombie.name}。`,
    }
  }

  const loot = pickFieldLoot(mapId)
  if (!loot) return { mapId, line: '你翻遍了这一带，什么也没有找到。' }

  const def = getItem(loot.itemId)
  const lead = FIELD_LOOT_LEADS[def?.category] ?? '你在废墟里找到'
  if (addItem(game.inventory, loot.itemId, 1) > 0) {
    return { mapId, line: `背包已满，${def?.name ?? '物资'}留在了地上`, loot }
  }

  game.flags.scavengeCount = (Number(game.flags.scavengeCount) || 0) + 1
  checkAchievements()
  return { mapId, line: `${lead}：获得 ${def?.name ?? loot.itemId} ×1`, loot }
}

export function laborCity(tierId = 'common') {
  if (game.dead || game.location !== 'ruined-city') return ''

  const tier = LABOR_TIERS.find((item) => item.id === tierId)
  if (!tier) return ''
  if (identityRank(game.identity) < tier.rank) {
    return `「${tier.name}」需要「${tier.identity}」身份。`
  }
  if (!useCooldown('labor', PALACE_COOLDOWN.daily)) return '今天已经做过一份工，明天再来。'

  advanceTurns(tier.turns)
  if (game.dead) return ''

  adjustStats(tier.effects)
  game.coins += tier.coins
  const cost = tier.costText ? `${tier.costText}，` : ''
  return `${tier.name}结束：${cost}末日币 +${tier.coins}。`
}

export function joinCity() {
  if (game.dead) return ''
  if (game.identity) return `你已经是「${game.identity}」，不必再投靠。`
  if (!grantIdentity('平民')) return '背包已满，收不下都城平民徽章。'
  return '你向都城衙门投了名册，领到一枚「都城平民徽章」。'
}

export function restoreIdentity() {
  if (game.dead) return ''
  if (game.identity) return `身份牌还在你身上（${game.identity}），无需补办。`
  if (!game.maxIdentity) return '没有可补办的身份记录。'
  if (!grantIdentity(game.maxIdentity)) return '背包已满，补办的身份牌无处安放。'
  return `已补办历史最高身份「${game.maxIdentity}」的身份牌。`
}

export function becomeKnight() {
  if (game.dead) return ''
  if (!game.identity) return '需要先办理平民身份。'
  if (identityRank(game.identity) >= identityRank('骑士')) {
    return `你已经是「${game.identity}」，无需再办理骑士。`
  }
  if (game.coins < KNIGHT_COST) return `末日币不足，办理骑士需要 ${KNIGHT_COST} 末日币。`
  game.coins -= KNIGHT_COST
  if (!grantIdentity('骑士')) {
    game.coins += KNIGHT_COST
    return '背包已满，都城骑士徽章无处安放。'
  }
  return `缴纳 ${KNIGHT_COST} 末日币，你成为了「骑士」。`
}

export function canEnterPalace() {
  return identityRank(game.identity) >= identityRank('骑士')
}

export function borrowCoins(amount) {
  if (game.dead) return ''
  if (!game.identity) return '至少需要平民身份才能借贷。'

  const tier = loanTierFor(game.identity)
  if (!tier) return '当前身份无法在都城银行借贷。'
  if (game.loan) {
    return `上一笔贷款还没结清（欠 ${game.loan.due} 末日币），银行不肯再借。`
  }

  const value = Math.floor(Number(amount))
  if (!Number.isFinite(value) || value < tier.min || value > tier.max) {
    return `以「${game.identity}」身份，借款额度为 ${tier.min}-${tier.max} 末日币。`
  }

  const interest = loanInterest(value, tier.rate)
  game.coins += value
  game.loan = {
    principal: value,
    interest,
    rate: tier.rate,
    due: value + interest,
    identity: game.identity,
    rank: tier.rank,
    termDays: LOAN_TERM_DAYS,
    startDay: game.day,
    // 借款当天算第 1 天：第 10 天是最后还款日，第 11 天起逾期
    dueDay: game.day + LOAN_TERM_DAYS - 1,
    graceDays: tier.graceDays,
    graceUsed: false,
    confiscated: false,
    defaulted: false,
    interestWaived: false,
  }
  return `借入 ${value} 末日币：利息 ${interest}，${LOAN_TERM_DAYS} 天内需还 ${value + interest}（第 ${game.loan.dueDay} 天为最后还款日）。`
}

/** 申请宽限：每笔贷款只能申请一次，逾期后不再受理 */
export function applyLoanGrace() {
  if (game.dead) return ''
  if (!game.loan) return '你并没有欠款。'

  const days = game.loan.graceDays ?? loanTierByRank(game.loan.rank).graceDays
  if (!days) return `「${loanTierByRank(game.loan.rank).identity}」的贷款没有宽限期。`
  if (game.loan.graceUsed) return '这笔贷款已经申请过宽限，不能再拖。'
  if (game.day > game.loan.dueDay) return '贷款已经逾期，宽限申请不会被受理。'

  game.loan.dueDay += days
  game.loan.graceUsed = true
  return `银行同意宽限 ${days} 天：到期日顺延至第 ${game.loan.dueDay} 天。`
}

export function repayLoan() {
  if (game.dead) return ''
  if (!game.loan) return '你并没有欠款。'
  if (game.coins < game.loan.due) {
    return `末日币不足，需要 ${game.loan.due} 才能结清。`
  }
  const paid = game.loan.due
  game.coins -= paid
  game.loan = null
  game.flags.loanRepaid = true
  checkAchievements()
  return `已还清 ${paid} 末日币，贷款结清。`
}

/* ===== 都城银行 · 行长钱三爷 ===== */

/** 化债成功：免掉全部利息，只还本金，到期日再宽限 30 天 */
export function waiveLoanInterest() {
  if (!game.loan) return BANKER.noLoanLine
  if (game.loan.interestWaived) return BANKER.waivedLine

  const waived = Math.max(0, Number(game.loan.interest) || 0)
  game.loan.interest = 0
  game.loan.due = game.loan.principal
  game.loan.dueDay = Math.max(game.loan.dueDay, game.day) + BANKER.graceDays
  game.loan.interestWaived = true
  return `行长免去了 ${waived} 币利息：现在只还本金 ${game.loan.principal} 币，到期日顺延至第 ${game.loan.dueDay} 天。`
}

/** 兑换汇率：按两地历史最高身份的日收入购买力计算；从未加入的阵营按最低身份保底（平民 / 见习） */
export function exchangeRateInfo() {
  const cityIdentity = game.maxIdentity ?? game.identity ?? '平民'
  const dawnIdentity = game.maxDawnIdentity ?? game.dawnIdentity ?? '见习'
  const labor = LABOR_TIERS.find((tier) => tier.identity === cityIdentity)?.coins ?? 0
  const cityIncome = labor + (PALACE_SALARY[cityIdentity] ?? 0)
  const dawnIncome =
    DAWN_SALARY.find((tier) => tier.rank === dawnRank(dawnIdentity))?.coins ?? 0
  const rate = exchangeRateFromIncome(cityIncome, dawnIncome)

  return {
    cityIdentity,
    dawnIdentity,
    cityIncome,
    dawnIncome,
    cityPower: cityIncome / EXCHANGE_BASKET_PRICE,
    dawnPower: dawnIncome / EXCHANGE_BASKET_PRICE,
    cityFallback: !game.maxIdentity && !game.identity,
    dawnFallback: !game.maxDawnIdentity && !game.dawnIdentity,
    rate,
  }
}

/** 货币兑换：按购买力汇率双向结算，金额精确到 0.01 */
export function exchangeCurrency(direction, amount) {
  if (game.dead) return ''
  const { rate } = exchangeRateInfo()
  if (!Number.isFinite(rate) || rate <= 0) return '当前身份无法计算汇率。'

  const value = roundToCents(Math.max(0, Number(amount) || 0))
  if (value < 0.01) return '兑换金额至少 0.01 枚。'

  if (direction === 'dawn') {
    const gain = floorToCents(value * rate)
    if (game.dawnCoins < value) {
      return `曙光币不足：兑换需要 ${formatMoney(value)} 枚。`
    }
    if (gain <= 0) return '金额太小，换不到 0.01 末日币。'
    game.dawnCoins = roundToCents(game.dawnCoins - value)
    game.coins = roundToCents(game.coins + gain)
    return `用 ${formatMoney(value)} 曙光币换到 ${formatMoney(gain)} 末日币（1 曙光币 = ${formatMoney(rate)} 末日币）。`
  }

  const gain = floorToCents(value / rate)
  if (game.coins < value) return `末日币不足：兑换需要 ${formatMoney(value)} 枚。`
  if (gain <= 0) return '金额太小，换不到 0.01 曙光币。'
  game.coins = roundToCents(game.coins - value)
  game.dawnCoins = roundToCents(game.dawnCoins + gain)
  return `用 ${formatMoney(value)} 末日币换到 ${formatMoney(gain)} 曙光币（1 末日币 = ${formatMoney(1 / rate)} 曙光币）。`
}

export function buyGood(goodId) {
  if (game.dead) return ''
  const good = SHOP_GOODS.find((item) => item.id === goodId)
  if (!good) return ''
  if (game.coins < good.price) return `末日币不足，${good.name} 需要 ${good.price}。`
  if (addItem(game.inventory, good.itemId, 1) > 0) return '背包已满，无法购买。'

  game.coins -= good.price
  return `购买 ${good.name} ×1，花费 ${good.price} 末日币。`
}
