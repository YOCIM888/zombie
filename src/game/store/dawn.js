import {
  DAWN_JOIN_KILLS,
  DAWN_BOND_SHOP,
  DAWN_MARKET,
  DAWN_RELIEF_TIERS,
  DAWN_SALARY,
  DAWN_SERVICE,
  dawnInfo,
  recyclePriceForDay,
  PALACE_COOLDOWN,
  addItem,
  canStoreItems,
  countItem,
  getItem,
  pickDawnFruit,
  pickDawnMeal,
  removeItem,
} from '../../data'
import { game, adjustStats, grantDawnIdentity, cooldownLeft, useCooldown, advanceTurns } from './core.js'

/* ===== 曙光阵地 ===== */

export function dawnReady() {
  return !game.dead && game.location === 'dawn-post'
}

/** 领取救济：五档共用每天一次，按曙光身份等级开放 */
export function claimDawnRelief(tierId = 'basic') {
  if (!dawnReady()) return ''
  const tier = DAWN_RELIEF_TIERS.find((item) => item.id === tierId)
  if (!tier) return ''
  const rank = dawnInfo(game.dawnIdentity)?.rank ?? -1
  if (rank < tier.rank) {
    return `「${tier.name}」需要曙光身份「${tier.identity}」，你现在的身份还不够。`
  }
  if (cooldownLeft('dawn-relief', PALACE_COOLDOWN.daily) > 0) return '今天的救济已经领过了，明天再来。'

  const fruitId = pickDawnFruit()
  if (!fruitId) return '救济处今天没有水果可发。'
  const fruitName = getItem(fruitId)?.name ?? fruitId
  const required = [
    { id: fruitId, qty: tier.fruitCount },
    ...tier.items.map((entry) => ({ id: entry.itemId, qty: entry.qty })),
  ]
  if (!canStoreItems(game.inventory, required)) {
    return `背包空间不足，「${tier.name}」装不下，还不算领走。`
  }

  addItem(game.inventory, fruitId, tier.fruitCount)
  const parts = [`${fruitName} ×${tier.fruitCount}`]
  for (const entry of tier.items) {
    addItem(game.inventory, entry.itemId, entry.qty)
    parts.push(`${getItem(entry.itemId)?.name ?? entry.itemId} ×${entry.qty}`)
  }
  game.cooldowns['dawn-relief'] = game.day
  return `你从物资箱里领到「${tier.name}」：${parts.join('、')}。`
}

/** 每日工资：按当前曙光身份领取，五档共用每天一次（无身份也有 1 曙光币） */
export function claimDawnSalary() {
  if (!dawnReady()) return ''
  const identity = dawnInfo(game.dawnIdentity)
  const salary = DAWN_SALARY.find((item) => item.rank === (identity?.rank ?? -1))
  if (!salary) return ''
  if (!useCooldown('dawn-salary', PALACE_COOLDOWN.daily)) {
    return '今天的工资已经领过了，明天再来。'
  }

  game.dawnCoins += salary.coins
  return `领取「${identity?.name ?? '无身份'}」每日工资：曙光币 +${salary.coins}。`
}

/** 曙光市场：全部用曙光币结算 */
export function buyDawnGood(goodId) {
  if (!dawnReady()) return ''
  const good = DAWN_MARKET.find((item) => item.id === goodId)
  if (!good) return ''
  if (game.dawnCoins < good.price) return `曙光币不足，${good.name} 需要 ${good.price} 枚。`
  if (addItem(game.inventory, good.itemId, 1) > 0) return '背包已满，无法购买。'
  game.dawnCoins -= good.price
  return `购买 ${good.name} ×1，花费 ${good.price} 曙光币。`
}

/** 羁绊商店：提交对应纪念徽章 + 365 曙光币兑换限定武器 */
export function buyDawnBond(goodId) {
  if (!dawnReady()) return ''
  const good = DAWN_BOND_SHOP.find((item) => item.id === goodId)
  if (!good) return ''
  if (countItem(game.inventory, good.badgeId) < 1) {
    return `羁绊商店只认信物：需要「${good.badgeName}」×1 才能兑换 ${good.name}。`
  }
  if (game.dawnCoins < good.price) {
    return `曙光币不足，${good.name} 需要 ${good.price} 枚。`
  }
  if (removeItem(game.inventory, good.badgeId, 1) > 0) {
    return `「${good.badgeName}」扣除失败，背包状态异常。`
  }
  const leftover = addItem(game.inventory, good.itemId, 1)
  if (leftover > 0) {
    addItem(game.inventory, good.badgeId, 1)
    return '背包已满，无法兑换。'
  }
  game.dawnCoins -= good.price
  return `你用「${good.badgeName}」和 ${good.price} 曙光币换到了 ${good.name}。`
}

/** 补办历史最高的曙光徽章 */
export function restoreDawnIdentity() {
  if (!dawnReady()) return ''
  if (game.dawnIdentity) return `你的曙光身份牌还在（${game.dawnIdentity}），无需补办。`
  if (!game.maxDawnIdentity) return '没有可补办的曙光身份记录。'
  if (!grantDawnIdentity(game.maxDawnIdentity)) return '背包已满，补办的徽章无处安放。'
  return `已补办历史最高曙光身份「${game.maxDawnIdentity}」的徽章。`
}

/** 加入曙光：需要累计击杀 5 只行尸 */
export function joinDawn() {
  if (!dawnReady()) return ''
  if (game.dawnIdentity) return `你已经是曙光「${game.dawnIdentity}」，无需再加入。`
  if (game.zombieKills < DAWN_JOIN_KILLS) {
    return `管事翻了个白眼：实力不足，先杀够 ${DAWN_JOIN_KILLS} 只行尸再来（当前 ${game.zombieKills}）。`
  }
  if (!grantDawnIdentity('队员')) return '背包已满，队员徽章无处安放。'
  return '管事在名册上写下你的名字，你领到一枚「曙光队员徽章」。'
}

/* ===== 曙光常驻人物服务 ===== */

/** 苏涵：每日配餐，2 曙光币换一份随机食物 / 饮品 */
export function nutritionistMeal() {
  if (!dawnReady()) return ''
  if (cooldownLeft('dawn-meal', PALACE_COOLDOWN.daily) > 0) {
    return '苏涵已经把今天的配餐分完了，明天再来。'
  }

  const price = DAWN_SERVICE.meal.price
  if (game.dawnCoins < price) return `曙光币不足，配餐需要 ${price} 枚。`

  const itemId = pickDawnMeal()
  if (!itemId) return '配餐台上空着。'
  const def = getItem(itemId)
  if (addItem(game.inventory, itemId, 1) > 0) {
    return `背包已满，${def?.name ?? '配餐'}没能装下，曙光币没有扣。`
  }

  game.dawnCoins -= price
  game.cooldowns['dawn-meal'] = game.day
  return `苏涵把一份热食推到你面前：获得 ${def?.name ?? itemId} ×1，花费 ${price} 曙光币。`
}

/** 莉莉：每日调配一支药剂，清除 20 点感染 */
export function lilyBrewMedicine() {
  if (!dawnReady()) return ''
  if (cooldownLeft('dawn-brew', PALACE_COOLDOWN.daily) > 0) {
    return '莉莉说今天的药已经熬过一锅了，明天再来。'
  }
  if (game.stats.infection <= 0) return '莉莉看了看你的伤口：没有感染，药白熬了。'

  const price = DAWN_SERVICE.brew.price
  if (game.dawnCoins < price) return `曙光币不足，药剂需要 ${price} 枚。`

  game.dawnCoins -= price
  adjustStats({ infection: -DAWN_SERVICE.brew.infection })
  game.cooldowns['dawn-brew'] = game.day
  return `莉莉把一支药剂推过来：感染 -${DAWN_SERVICE.brew.infection}，花费 ${price} 曙光币。`
}

/** 莉莉：拆解背包里的远程武器，按品质返还曙光币 */
export function recycleRangedWeapon(slotIndex) {
  if (!dawnReady()) return ''
  const entry = game.inventory[slotIndex]
  if (!entry) return '这个格子里没有东西。'
  const def = getItem(entry.id)
  if (!def || def.category !== 'ranged') return '莉莉只收远程武器。'

  const price = recyclePriceForDay(def.tier, game.day)
  game.inventory[slotIndex] = null
  game.dawnCoins += price
  return `莉莉把「${def.name}」拆成零件：曙光币 +${price}。`
}

/** 物资回收：背包里所有多余武器（近战 + 远程），装备中的不算 */
export function weaponRecyclables() {
  return game.inventory
    .map((entry, index) => {
      const def = entry ? getItem(entry.id) : null
      if (!def || def.category !== 'melee' && def.category !== 'ranged') return null
      return { index, def, price: recyclePriceForDay(def.tier, game.day) }
    })
    .filter(Boolean)
}

/** 回收任意一件多余武器，按品质结算曙光币 */
export function recycleWeapon(slotIndex) {
  if (!dawnReady()) return ''
  const entry = game.inventory[slotIndex]
  if (!entry) return '这个格子里没有东西。'
  const def = getItem(entry.id)
  if (!def || (def.category !== 'melee' && def.category !== 'ranged')) {
    return '物资回收只收武器。'
  }

  const price = recyclePriceForDay(def.tier, game.day)
  game.inventory[slotIndex] = null
  game.dawnCoins += price
  return `你把「${def.name}」交了上去：曙光币 +${price}。`
}

/** 薇尔：每日一次训练，消耗 1 回合 */
export function mercenaryTraining() {
  if (!dawnReady()) return ''
  if (cooldownLeft('dawn-training', PALACE_COOLDOWN.daily) > 0) {
    return '薇尔把毛巾丢回架子上：今天练过了，明天再来。'
  }

  const price = DAWN_SERVICE.training.price
  if (game.dawnCoins < price) return `曙光币不足，训练需要 ${price} 枚。`

  const actionDay = game.day
  advanceTurns(1)
  if (game.dead) return ''
  adjustStats({
    stamina: DAWN_SERVICE.training.stamina,
    sanity: DAWN_SERVICE.training.sanity,
  })
  game.dawnCoins -= price
  game.cooldowns['dawn-training'] = actionDay
  return `薇尔陪你练了一轮：体力 +${DAWN_SERVICE.training.stamina}，理智 +${DAWN_SERVICE.training.sanity}，花费 ${price} 曙光币。`
}

/** 苗苗：每日照看一次实验田，消耗 2 回合，累计田地进度 */
export function tendExperimentField() {
  if (!dawnReady()) return ''
  if (cooldownLeft('field-tend', PALACE_COOLDOWN.daily) > 0) {
    return '苗苗说今天的田已经浇过水了，明天再来。'
  }

  const actionDay = game.day
  advanceTurns(DAWN_SERVICE.tend.turns)
  if (game.dead) return ''

  let line = '你帮苗苗翻了一遍土，又浇了两桶水。'
  const itemId = pickDawnFruit()
  if (itemId) {
    const def = getItem(itemId)
    const leftover = addItem(game.inventory, itemId, 1)
    line +=
      leftover > 0
        ? `背包已满，${def?.name ?? '果子'}落在了田埂上。`
        : `苗苗摘了一个${def?.name ?? '水果'}给你。`
  }

  game.cooldowns['field-tend'] = actionDay
  const progress = (Number(game.flags.fieldProgress) || 0) + 1
  game.flags.fieldProgress = progress

  if (progress >= DAWN_SERVICE.fieldSecretAt && !game.flags.fieldSecret) {
    line += `田地进度 ${progress} / ${DAWN_SERVICE.fieldSecretAt}。苗苗盯着那几垄地看了很久，忽然说：「你想不想听一个秘密？」`
  } else {
    line += `田地进度 ${progress} / ${DAWN_SERVICE.fieldSecretAt}。`
  }
  return line
}

/** 苗苗：田地进度满 5 后，听她讲一个秘密，获得农业大师徽章 */
export function revealFieldSecret() {
  if (!dawnReady()) return ''
  if (game.flags.fieldSecret) return '苗苗把日记本合上，锁回了抽屉里。'

  const progress = Number(game.flags.fieldProgress) || 0
  if (progress < DAWN_SERVICE.fieldSecretAt) {
    return `苗苗摇摇头：「田还没长好呢。」（田地进度 ${progress} / ${DAWN_SERVICE.fieldSecretAt}）`
  }

  if (addItem(game.inventory, 'badge-farming-master', 1) > 0) {
    return '背包已满，那枚旧徽章还压在苗苗手里。'
  }
  game.flags.fieldSecret = true
  return '苗苗从日记本里取出一枚褪色的徽章，放在你掌心。\n\n「我娘以前是农技站的。她总说，地不会骗人，你给它多少，它就还你多少。」她把日记本翻到最后一页，上面画着一整片田，「这块地是我替她留的。现在，你也算种过它的人了。」\n\n获得【农业大师徽章】。'
}
