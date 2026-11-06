import {
  CLEANLINESS_MAX,
  FISH_PROCESSING,
  KRAKEN_BLADE_CRAFT,
  GUILD_BY_ID,
  GUILD_COMMISSION_REWARD,
  TALENTS,
  TALENT_ACTIVE_LIMIT,
  UTOPIA_TRAINING_BY_KIND,
  TAVERN_COCKTAILS,
  ITEMS,
  RESTAURANT_DISHES,
  SERVICE_PERMITS,
  addItem,
  countItem,
  getItem,
  identityRank,
  mayorForDay,
  pickMeleeByTier,
  removeItem,
  talentTitle,
} from '../../data'
import { activeGuildId, activeGuild, syncHpCap, game, notify, recordTraining, adjustStats, advanceTurns, hasServicePermit } from './core.js'
import { autoEnableTalent, isTalentActive } from './talents.js'

/* ===== 乌托邦训练 ===== */

function utopiaTrainingDayState() {
  const state = game.flags.utopiaTraining
  if (!state || state.day !== game.day) return { day: game.day }
  return { ...state }
}

/** 今日该训练的剩余次数 */
export function utopiaTrainingLeft(kind) {
  if (!UTOPIA_TRAINING_BY_KIND[kind]) return 0
  const state = utopiaTrainingDayState()
  return Math.max(0, utopiaTrainingLimit(kind) - (Number(state[kind]) || 0))
}

/** 每日训练次数：训练自带上限优先；乌托邦训练办理许可后从 2 次提高到 3 次 */
export function utopiaTrainingLimit(kind) {
  const training = kind ? UTOPIA_TRAINING_BY_KIND[kind] : null
  if (training?.dailyLimit) return training.dailyLimit
  return hasServicePermit('training-permit') ? 3 : 2
}

export function utopiaTrainingGuard(kind) {
  if (game.dead) return ''
  const training = UTOPIA_TRAINING_BY_KIND[kind]
  if (!training) return '没有这个训练。'
  if (game.location !== (training.location ?? 'utopia-city')) {
    return training.awayLine ?? '训练场在乌托邦城。'
  }
  if ((game.talents[kind] || 0) >= TALENTS[kind].maxLevel) {
    return '这项天赋已经满级。'
  }
  if (utopiaTrainingLeft(kind) <= 0) {
    return `今天这项训练已经做满 ${utopiaTrainingLimit(kind)} 次了。`
  }

  const cost = training.cost ?? 10
  if (training.weaponSlot === 'melee') {
    const equipped = game.equipment.melee
    const fits = !training.weaponIds || training.weaponIds.includes(equipped?.id)
    if (!equipped || !fits) {
      return `需要装备：${training.weaponText}`
    }
    const def = getItem(equipped.id)
    const max = def?.weapon?.durability
    const current = Number.isFinite(equipped.durability) ? equipped.durability : max
    if (!Number.isFinite(max) || current < cost) {
      return `武器耐久不足 ${cost}，先去保养。`
    }
  } else {
    const equipped = game.equipment.ranged
    if (!equipped || !training.weaponIds.includes(equipped.id)) {
      return `需要装备：${training.weaponText}`
    }
    const current = Number.isFinite(equipped.cleanliness)
      ? equipped.cleanliness
      : CLEANLINESS_MAX
    if (current < cost) return `武器清洁度不足 ${cost}，先去保养。`
  }
  return ''
}

/** 乌托邦专项训练：1 回合、10 消耗、每天 2 次（训练许可后 3 次）、每次 5-10 进度 */
export function utopiaTrain(kind) {
  const blocked = utopiaTrainingGuard(kind)
  if (blocked) return blocked

  const training = UTOPIA_TRAINING_BY_KIND[kind]
  const cost = training.cost ?? 10
  const progressMin = training.progressMin ?? 5
  const progressMax = training.progressMax ?? 10
  const actionDay = game.day
  const actionState = utopiaTrainingDayState()
  advanceTurns(1)
  if (game.dead) return ''

  const notes = []
  if (training.weaponSlot === 'melee') {
    const equipped = game.equipment.melee
    const def = getItem(equipped.id)
    const max = def?.weapon?.durability
    const current = Number.isFinite(equipped.durability) ? equipped.durability : max
    equipped.durability = Math.max(0, current - cost)
    notes.push(`训练消耗 ${def?.name ?? '近战武器'} 耐久 ${cost}。`)
    if (equipped.durability <= 0) {
      game.equipment.melee = null
      syncHpCap()
      notes.push(`${def?.name ?? '武器'}在训练中断裂了。`)
      if (typeof window !== 'undefined') notify(`${def?.name ?? '武器'}已经断裂`, 3000)
    }
  } else {
    const equipped = game.equipment.ranged
    const def = getItem(equipped.id)
    const current = Number.isFinite(equipped.cleanliness)
      ? equipped.cleanliness
      : CLEANLINESS_MAX
    equipped.cleanliness = Math.max(0, current - cost)
    notes.push(`训练消耗 ${def?.name ?? '远程武器'} 清洁度 ${cost}。`)
    if (equipped.cleanliness <= 0) {
      notes.push(`${def?.name ?? '远程武器'}的清洁度归零，需要保养。`)
      if (typeof window !== 'undefined') notify(`${def?.name ?? '远程武器'}需要保养`, 3000)
    }
  }

  const gain = progressMin + Math.floor(Math.random() * (progressMax - progressMin + 1))
  let level = game.talents[kind] || 0
  let progress = (game.training[kind] || 0) + gain
  while (level < TALENTS[kind].maxLevel && progress >= 100) {
    level += 1
    progress -= 100
  }
  if (level >= TALENTS[kind].maxLevel) progress = 0

  const before = game.talents[kind] || 0
  game.talents[kind] = level
  game.training[kind] = progress
  recordTraining()
  if (level > before) {
    const title = talentTitle(kind, level)
    notes.push(`天赋提升 · ${title}`)
    autoEnableTalent(kind)
    if (!isTalentActive(kind)) {
      notes.push(`启用位已满 ${TALENT_ACTIVE_LIMIT} 个，新天赋尚未启用，请到天赋面板调整。`)
    }
    if (typeof window !== 'undefined') notify(`天赋提升 · ${title}`, 3400)
  }

  const next = { ...actionState, day: actionDay }
  next[kind] = (Number(actionState[kind]) || 0) + 1
  game.flags.utopiaTraining = next
  const progressText = level >= TALENTS[kind].maxLevel ? '已满级' : `${progress}%`
  notes.unshift(`${training.name}完成。熟练度 +${gain}，当前 ${progressText}。`)
  notes.push(`今日剩余训练次数：${utopiaTrainingLeft(kind)}`)
  return notes.join('\n')
}


/** 沿街乞讨：1 回合，五档各 20%；盗贼公会奖励翻倍 */
export function begUtopia() {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '沿街乞讨在乌托邦城。'

  advanceTurns(1)
  if (game.dead) return ''

  recordGuildBeg()

  const guild = activeGuild()
  const multiplier = guild?.beggingMultiplier ?? 1
  const roll = Math.random()

  if (roll < 0.2) {
    game.coins += 1 * multiplier
    return `一个路人丢下 ${1 * multiplier} 枚末日币，没有看你第二眼。`
  }
  if (roll < 0.4) {
    game.dawnCoins += 1 * multiplier
    return `有人把 ${1 * multiplier} 枚曙光币塞进你手里，像在打发一条野狗。`
  }

  const category = roll < 0.6 ? 'drink' : roll < 0.8 ? 'food' : 'fruit'
  const pool = Object.values(ITEMS).filter((item) => {
    if (item.limited || item.special) return false
    if (category === 'fruit') return Boolean(item.fruit)
    if (category === 'food') return item.category === 'food' && !item.fruit
    return item.category === category
  })
  if (!pool.length) return '今天没有人愿意施舍。'

  const item = pool[Math.floor(Math.random() * pool.length)]
  const qty = 1 * multiplier
  const leftover = addItem(game.inventory, item.id, qty)
  const added = qty - leftover
  if (added <= 0) return `有人递来 ${item.name}，但你的背包已经塞满了。`
  return `有人递来 ${item.name} ×${added}${leftover > 0 ? '（背包已满）' : ''}。`
}

/* ===== 乌托邦 · 红灯街区 ===== */

const RED_LIGHT_GOODS = new Set(['food', 'drink', 'medicine'])

/** 从背包随机拿走一份食物 / 饮品 / 药品；没有可偷的东西时返回 null */
function stealRedLightGoods() {
  const candidates = []
  game.inventory.forEach((entry, index) => {
    if (!entry) return
    if (!RED_LIGHT_GOODS.has(getItem(entry.id)?.category)) return
    candidates.push({ index, entry })
  })
  if (!candidates.length) return null

  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  const def = getItem(pick.entry.id)
  const qty = pick.entry.qty ?? 1
  if (qty > 1) pick.entry.qty = qty - 1
  else game.inventory[pick.index] = null
  return { name: def?.name ?? pick.entry.id, qty: 1 }
}

/** 治安官罚款：付得起就扣款，付不起就清零货币并劳动改造；持械备案罚款减半 */
function redLightFine(coins, dawnCoins) {
  const permit = hasServicePermit('weapon-permit')
  const fineCoins = permit ? Math.max(1, Math.ceil(coins / 2)) : coins
  const fineDawn = permit ? Math.max(1, Math.ceil(dawnCoins / 2)) : dawnCoins
  if (game.coins >= fineCoins && game.dawnCoins >= fineDawn) {
    game.coins -= fineCoins
    game.dawnCoins -= fineDawn
    const note = permit ? '（持械备案减半）' : ''
    return `治安官的靴子踩在你背上：罚款 ${fineCoins} 末日币 + ${fineDawn} 曙光币${note}。`
  }
  game.coins = 0
  game.dawnCoins = 0
  adjustStats({ stamina: -30 })
  if (game.dead) return ''
  return '你付不起罚款，治安官把你拖去劳动改造：货币清零，体力 -30。'
}

/** 红灯街区 · 献身自由：1 回合（正常衰减），需任意公会徽章 */
export function redLightSellBody() {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '红灯街区在乌托邦城。'
  if (!activeGuildId()) return '需要任意公会徽章才能进入红灯街区。'

  advanceTurns(1)
  if (game.dead) return ''

  const roll = Math.random()
  if (roll < 0.4) return redLightFine(4, 4)
  if (roll < 0.7) {
    game.coins += 3
    game.dawnCoins += 3
    return '这是见不得光的事情。你躲在暗处数钱，像一只阴暗的老鼠：末日币 +3，曙光币 +3。'
  }
  if (roll < 0.9) return '对方并未支付报酬。你上当了。'

  const stolen = stealRedLightGoods()
  if (!stolen) return '完事了，但是你穷得叮当响，TA 懒得偷你。'
  return `你的东西被偷走了：${stolen.name} ×${stolen.qty}。`
}

/** 红灯街区 · 追求自由：先付 3 末日币 + 3 曙光币，1 回合（正常衰减） */
export function redLightPayForFreedom() {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '红灯街区在乌托邦城。'
  if (!activeGuildId()) return '需要任意公会徽章才能进入红灯街区。'
  if (game.coins < 3 || game.dawnCoins < 3) {
    return '走进那条巷子需要 3 末日币 + 3 曙光币。'
  }

  game.coins -= 3
  game.dawnCoins -= 3
  advanceTurns(1)
  if (game.dead) return ''

  const roll = Math.random()
  if (roll < 0.4) return redLightFine(3, 3)
  if (roll < 0.7) {
    adjustStats({ sanity: -20, stamina: -20 })
    if (game.dead) return ''
    return '完事后你感到一阵空虚：理智 -20，体力 -20。'
  }
  if (roll < 0.9) {
    const weapon = pickMeleeByTier('普通')
    if (!weapon) return 'TA 落下了一件东西，但你没能捡起来。'
    const leftover = addItem(game.inventory, weapon.id, 1)
    return leftover > 0
      ? `TA 落下了一把${weapon.name}，但你的背包已经满了。`
      : `TA 落下了一件东西：${weapon.name}（${weapon.tier}）。`
  }

  adjustStats({ infection: 90 })
  if (game.dead) return ''
  return '你感染了疾病：感染 +90%。'
}

/** 乌托邦 · 自由酒馆：双币购买，当场喝完，不进入背包、不消耗回合 */
export function drinkTavernCocktail(cocktailId) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '自由酒馆在乌托邦城。'
  if (!activeGuildId()) return '需要任意公会徽章才能进入自由酒馆。'

  const cocktail = TAVERN_COCKTAILS.find((item) => item.id === cocktailId)
  if (!cocktail) return ''
  if (game.coins < cocktail.coins || game.dawnCoins < cocktail.dawnCoins) {
    return `${cocktail.name} 需要 ${cocktail.coins} 末日币 + ${cocktail.dawnCoins} 曙光币。`
  }

  game.coins -= cocktail.coins
  game.dawnCoins -= cocktail.dawnCoins
  adjustStats(cocktail.effects)
  if (game.dead) return ''
  return `${cocktail.name}见底：${cocktail.effectText}。`
}

/** 乌托邦 · 自由餐馆：双币购买，当场吃完，不进入背包、不消耗回合 */
export function eatRestaurantDish(dishId) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '自由餐馆在乌托邦城。'
  if (!activeGuildId()) return '需要任意公会徽章才能进入自由餐馆。'

  const dish = RESTAURANT_DISHES.find((item) => item.id === dishId)
  if (!dish) return ''
  if (game.coins < dish.coins || game.dawnCoins < dish.dawnCoins) {
    return `${dish.name} 需要 ${dish.coins} 末日币 + ${dish.dawnCoins} 曙光币。`
  }

  game.coins -= dish.coins
  game.dawnCoins -= dish.dawnCoins
  adjustStats(dish.effects)
  if (game.dead) return ''
  return `${dish.name}吃完了：${dish.effectText}。`
}

/* ===== 乌托邦 · 代理城主 ===== */

/** 拜访当值会长：常规选项人人可选，成员选项只对本公会开放；每天一次、1 回合 */
export function meetActingMayor(option = 'public') {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '代理城主办公室在乌托邦城。'

  const mayor = mayorForDay(game.day)
  if (!mayor) return ''
  if (Number(game.flags.mayorVisitDay) === game.day) {
    return '今天已经拜访过代理城主了，明天换人再来。'
  }

  const memberOnly = option === 'member'
  if (memberOnly && activeGuildId() !== mayor.guildId) {
    return `你身上没有「${mayor.guildName}」的徽章，${mayor.name}不会私下见你。`
  }

  const request = memberOnly ? mayor.member : mayor.public
  if (!request) return ''

  if (request.serviceIds?.length) {
    const equipped = request.service === 'clean-ranged' ? game.equipment.ranged : game.equipment.melee
    if (!equipped || !request.serviceIds.includes(equipped.id)) {
      const allowed = request.serviceIds.map((id) => getItem(id)?.name ?? id).join('、')
      return `${mayor.name}摇了摇头：${request.serviceLabel ?? '会长只修'}${allowed}。`
    }
  }

  const actionDay = game.day
  advanceTurns(1)
  if (game.dead) return ''

  game.flags.mayorVisitDay = actionDay
  game.flags.mayorLastOption = option

  const notes = [request.text]
  if (request.effects) adjustStats(request.effects)
  if (request.coins) game.coins += request.coins
  if (request.dawnCoins) game.dawnCoins += request.dawnCoins
  if (request.reputation) game.reputation += request.reputation
  if (request.contribution) addGuildContribution(mayor.guildId, request.contribution)

  if (request.service === 'clean-ranged') {
    const equipped = game.equipment.ranged
    equipped.cleanliness = CLEANLINESS_MAX
    notes.push(`你的远程武器清洁度已恢复到 ${CLEANLINESS_MAX}。`)
  } else if (request.service === 'repair-melee') {
    const equipped = game.equipment.melee
    const max = getItem(equipped.id)?.weapon?.durability
    equipped.durability = max
    notes.push(`你的近战武器耐久已恢复到 ${max}。`)
  }

  return notes.filter(Boolean).join(' ')
}

/* ===== 乌托邦 · 办事中心 ===== */


function grantServicePermit(permitId) {
  game.flags.servicePermits = {
    ...(game.flags.servicePermits ?? {}),
    [permitId]: true,
  }
}

/** 办理证照 / 补办业务：取号消耗 1 回合，加急额外付曙光币但不消耗回合 */
export function applyServicePermit(permitId, express = false) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '办事中心在乌托邦城。'

  const permit = SERVICE_PERMITS.find((item) => item.id === permitId)
  if (!permit) return ''
  if (permit.once && hasServicePermit(permitId)) {
    return `「${permit.name}」已经办过了。`
  }

  let badgeId = null
  if (permitId === 'badge-reissue') {
    if (activeGuildId()) return '你身上已经有公会徽章，不需要补办。'
    const lastGuildId = game.flags.lastGuildId
    const lastGuild = GUILD_BY_ID[lastGuildId]
    if (!lastGuild) return '档案里没有你的公会记录，无法补办。'
    badgeId = lastGuild.badgeId
    if (!canFitInventory(badgeId)) return '背包已满，先腾出一格再来补办。'
  }

  const expressCost = express ? SERVICE_CENTER_EXPRESS_DAWN : 0
  if (game.coins < permit.coins) {
    return `末日币不足，办理「${permit.name}」需要 ${permit.coins}。`
  }
  if (game.dawnCoins < permit.dawnCoins + expressCost) {
    return express
      ? `曙光币不足，办理「${permit.name}」并加急需要 ${permit.dawnCoins + expressCost}。`
      : `曙光币不足，办理「${permit.name}」需要 ${permit.dawnCoins}。`
  }

  if (!express) {
    advanceTurns(1)
    if (game.dead) return ''
  }

  game.coins -= permit.coins
  game.dawnCoins -= permit.dawnCoins + expressCost

  if (badgeId) {
    addItem(game.inventory, badgeId, 1)
    const name = getItem(badgeId)?.name ?? '公会徽章'
    const suffix = express ? '（加急，未消耗回合）' : ''
    return `${name}补办完成，钢印还没干透${suffix}。`
  }

  grantServicePermit(permitId)
  const suffix = express ? `（加急 +${expressCost} 曙光币，未消耗回合）` : ''
  return `「${permit.name}」办结，钢印落在纸上：${permit.effectText}${suffix}`
}

/* ===== 乌托邦 · 鱼肉处理与沧龙之刃 ===== */

/** 消耗双币，把一份变异鱼肉处理成无害化鱼肉 */
export function processMutantFish() {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '鱼肉处理在乌托邦城。'

  const have = countItem(game.inventory, FISH_PROCESSING.inputId)
  if (have <= 0) return '背包里没有变异鱼肉。'
  if (game.coins < FISH_PROCESSING.coins || game.dawnCoins < FISH_PROCESSING.dawnCoins) {
    return `处理一份变异鱼肉需要 ${FISH_PROCESSING.coins} 末日币 + ${FISH_PROCESSING.dawnCoins} 曙光币。`
  }

  const copy = game.inventory.map((entry) => (entry ? { ...entry } : null))
  removeItem(copy, FISH_PROCESSING.inputId, 1)
  if (addItem(copy, FISH_PROCESSING.outputId, 1) > 0) {
    return '背包已满，先腾出一格再来处理。'
  }

  game.coins -= FISH_PROCESSING.coins
  game.dawnCoins -= FISH_PROCESSING.dawnCoins
  removeItem(game.inventory, FISH_PROCESSING.inputId, 1)
  addItem(game.inventory, FISH_PROCESSING.outputId, 1)
  const output = getItem(FISH_PROCESSING.outputId)
  return `变异鱼肉处理完成：获得 ${output?.name ?? '无害化鱼肉'} ×1。`
}

/** 消耗 50 片沧龙鳞片铸造沧龙之刃 */
export function craftKrakenBlade() {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '锻造台在乌托邦城。'

  const scales = countItem(game.inventory, KRAKEN_BLADE_CRAFT.scaleId)
  if (scales < KRAKEN_BLADE_CRAFT.scales) {
    return `沧龙鳞片不足：需要 ${KRAKEN_BLADE_CRAFT.scales} 片，当前 ${scales} 片。`
  }

  const copy = game.inventory.map((entry) => (entry ? { ...entry } : null))
  removeItem(copy, KRAKEN_BLADE_CRAFT.scaleId, KRAKEN_BLADE_CRAFT.scales)
  if (addItem(copy, KRAKEN_BLADE_CRAFT.itemId, 1) > 0) {
    return '背包已满，先腾出一格再来铸造。'
  }

  removeItem(game.inventory, KRAKEN_BLADE_CRAFT.scaleId, KRAKEN_BLADE_CRAFT.scales)
  addItem(game.inventory, KRAKEN_BLADE_CRAFT.itemId, 1)
  const blade = getItem(KRAKEN_BLADE_CRAFT.itemId)
  return `沧龙之刃铸成：${blade?.name ?? '沧龙之刃'} 已放入背包。`
}

/** 某公会的加入条件明细，供乌托邦界面显示 */
export function guildRequirementState(guildId) {
  const guild = GUILD_BY_ID[guildId]
  if (!guild) return null
  const active = activeGuild()
  const requirements = guild.requirement ?? {}
  const items = (requirements.items ?? []).map((need) => ({
    id: need.id,
    name: getItem(need.id)?.name ?? need.id,
    qty: need.qty ?? 1,
    have: countItem(game.inventory, need.id),
  }))

  const kills = requirements.kills ?? 0
  const thefts = requirements.thefts ?? 0
  const minIdentity = requirements.minIdentity ?? null
  const itemsOk = items.every((need) => need.have >= need.qty)
  const killsOk = game.zombieKills >= kills
  const theftsOk = (Number(game.flags.cityTheftCount) || 0) >= thefts
  const identityOk =
    !minIdentity || identityRank(game.identity) >= identityRank(minIdentity)

  let reason = ''
  if (active) reason = `你已经是「${active.name}」成员，先退出当前公会。`
  else if (!itemsOk) reason = '提交物品不足。'
  else if (!killsOk) reason = `还需要累计击杀 ${kills} 只丧尸（当前 ${game.zombieKills}）。`
  else if (!theftsOk) {
    reason = `还需要在都城盗窃 ${thefts} 次（当前 ${Number(game.flags.cityTheftCount) || 0} 次）。`
  } else if (!identityOk) reason = `需要「${minIdentity}」及以上身份。`

  return {
    guild,
    active,
    items,
    kills,
    killsHave: game.zombieKills,
    thefts,
    theftsHave: Number(game.flags.cityTheftCount) || 0,
    minIdentity,
    canJoin: !active && itemsOk && killsOk && theftsOk && identityOk,
    reason,
  }
}

/** 加入公会：消耗报名物品，放入对应公会徽章 */
export function joinGuild(guildId) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '公会报名在乌托邦城。'
  const state = guildRequirementState(guildId)
  if (!state) return '没有这个公会。'
  if (state.active) return state.reason
  if (!state.canJoin) return state.reason

  const guild = state.guild
  const copy = game.inventory.map((entry) => (entry ? { ...entry } : null))
  for (const need of state.items) removeItem(copy, need.id, need.qty)
  if (addItem(copy, guild.badgeId, 1) > 0) {
    return '背包已满，腾出一格再来报名。'
  }

  for (const need of state.items) removeItem(game.inventory, need.id, need.qty)
  addItem(game.inventory, guild.badgeId, 1)
  game.flags.lastGuildId = guildId
  return `你通过了「${guild.name}」的报名。公会徽章已经放进背包。`
}

/** 退出当前公会：回收徽章，之后重新加入需要重做报名条件 */
export function leaveGuild() {
  const guild = activeGuild()
  if (!guild) return '你还没有加入任何公会。'
  if (removeItem(game.inventory, guild.badgeId, 1) > 0) {
    return '公会徽章不在背包里，退出失败。'
  }
  game.flags.lastGuildId = guild.id
  syncHpCap()
  return `你退出了「${guild.name}」，公会徽章已被回收。再次加入需要重新完成报名条件。`
}

/* ===== 公会日常委托 · 商店 · 贡献兑换 ===== */

/** 某公会的公会贡献值 */
export function guildContribution(guildId) {
  return Math.max(0, Number(game.flags.guildContribution?.[guildId]) || 0)
}

function addGuildContribution(guildId, amount) {
  const map = { ...(game.flags.guildContribution ?? {}) }
  map[guildId] = (Number(map[guildId]) || 0) + amount
  game.flags.guildContribution = map
}

/** 单个公会的委托进度：领取后清零，未领取时跨天累计 */
function guildProgressFor(guildId) {
  const state = game.flags.guildProgress
  const entry = state && typeof state === 'object' ? state[guildId] : null
  return {
    kills: Number(entry?.kills) || 0,
    thefts: Number(entry?.thefts) || 0,
    begs: Number(entry?.begs) || 0,
    lastClaimDay: Number(entry?.lastClaimDay) || 0,
  }
}

function saveGuildProgress(guildId, entry) {
  const map = { ...(game.flags.guildProgress ?? {}) }
  map[guildId] = { ...entry }
  game.flags.guildProgress = map
}

function bumpGuildProgress(guildId, key, amount = 1) {
  const entry = guildProgressFor(guildId)
  entry[key] = (Number(entry[key]) || 0) + amount
  saveGuildProgress(guildId, entry)
}

/** 战斗击杀记录：只有当前公会委托认可的武器才会计数 */
export function recordGuildKill(weaponId) {
  const guild = activeGuild()
  if (!guild || !weaponId) return
  const weapons = guild.commission?.weaponIds
  if (!Array.isArray(weapons) || !weapons.includes(weaponId)) return
  bumpGuildProgress(guild.id, 'kills')
}

/** 盗贼委托：都城盗窃计数 */
export function recordGuildTheft() {
  if (activeGuildId() !== 'rogue') return
  bumpGuildProgress('rogue', 'thefts')
}

/** 盗贼委托：沿街乞讨计数 */
export function recordGuildBeg() {
  if (activeGuildId() !== 'rogue') return
  bumpGuildProgress('rogue', 'begs')
}

/** 统计背包内符合条件的物品总数 */
function countInventoryWhere(test) {
  let total = 0
  for (const entry of game.inventory) {
    if (!entry) continue
    if (test(getItem(entry.id), entry)) total += entry.qty ?? 1
  }
  return total
}

/** 从背包里消耗符合条件的物品；返回是否足量扣完 */
function consumeInventoryWhere(test, amount) {
  let left = amount
  for (let index = 0; index < game.inventory.length && left > 0; index += 1) {
    const entry = game.inventory[index]
    if (!entry) continue
    const def = getItem(entry.id)
    if (!test(def, entry)) continue
    const take = Math.min(left, entry.qty ?? 1)
    entry.qty -= take
    left -= take
    if (entry.qty <= 0) game.inventory[index] = null
  }
  return left === 0
}

/** 当前公会日常委托的进度与领取状态 */
export function guildCommissionState(guildId) {
  const guild = GUILD_BY_ID[guildId]
  const commission = guild?.commission
  if (!guild || !commission) return null

  const progress = guildProgressFor(guildId)
  let lines = []
  if (commission.type === 'kill') {
    const need = commission.count ?? 2
    lines = [
      {
        label: '指定武器击杀',
        have: Math.min(progress.kills, need),
        need,
        ok: progress.kills >= need,
      },
    ]
  } else if (commission.type === 'rogue') {
    const theftNeed = commission.thefts ?? 2
    const begNeed = commission.begs ?? 2
    lines = [
      {
        label: '都城盗窃',
        have: Math.min(progress.thefts, theftNeed),
        need: theftNeed,
        ok: progress.thefts >= theftNeed,
      },
      {
        label: '沿街乞讨',
        have: Math.min(progress.begs, begNeed),
        need: begNeed,
        ok: progress.begs >= begNeed,
      },
    ]
  } else if (commission.type === 'medicine') {
    const need = commission.count ?? 5
    const have = countInventoryWhere((def) => def?.category === 'medicine')
    lines = [{ label: '背包内药品', have: Math.min(have, need), need, ok: have >= need }]
  } else if (commission.type === 'wine') {
    const need = commission.count ?? 3
    const ids = commission.items ?? []
    const have = countInventoryWhere((def) => def && ids.includes(def.id))
    lines = [{ label: '指定酒类', have: Math.min(have, need), need, ok: have >= need }]
  }

  const claimedToday = progress.lastClaimDay === game.day
  let reason = ''
  if (claimedToday) reason = '今天已经领取过这份委托奖励。'
  else if (!lines.every((line) => line.ok)) reason = '委托进度还没完成。'

  return {
    guild,
    lines,
    claimedToday,
    canClaim: !claimedToday && lines.every((line) => line.ok),
    reason,
    rewardText: `${GUILD_COMMISSION_REWARD.coins} 末日币 + ${GUILD_COMMISSION_REWARD.dawnCoins} 曙光币 + ${GUILD_COMMISSION_REWARD.contribution} 公会贡献`,
  }
}

/** 交付公会日常委托：一天一次，提交类委托会消耗物品 */
export function claimGuildCommission(guildId) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '公会委托只能在乌托邦城的公会大厅交付。'
  const guild = GUILD_BY_ID[guildId]
  if (!guild?.commission) return '没有这个公会委托。'
  if (activeGuildId() !== guildId) return `你不在「${guild.name}」，无法领取这里的委托。`

  const state = guildCommissionState(guildId)
  if (!state) return ''
  if (!state.canClaim) return state.reason

  if (guild.commission.type === 'medicine') {
    consumeInventoryWhere((def) => def?.category === 'medicine', guild.commission.count ?? 5)
  } else if (guild.commission.type === 'wine') {
    const ids = guild.commission.items ?? []
    consumeInventoryWhere((def) => def && ids.includes(def.id), guild.commission.count ?? 3)
  }

  game.coins += GUILD_COMMISSION_REWARD.coins
  game.dawnCoins += GUILD_COMMISSION_REWARD.dawnCoins
  addGuildContribution(guildId, GUILD_COMMISSION_REWARD.contribution)

  const progress = guildProgressFor(guildId)
  progress.kills = 0
  progress.thefts = 0
  progress.begs = 0
  progress.lastClaimDay = game.day
  saveGuildProgress(guildId, progress)

  return `委托完成：${guild.name}收下了你的交付。获得 ${state.rewardText}。`
}

/** 背包能否放下一件物品（按堆叠规则模拟一次） */
function canFitInventory(itemId, qty = 1) {
  const copy = game.inventory.map((entry) => (entry ? { ...entry } : null))
  return addItem(copy, itemId, qty) === 0
}

/** 公会商店购买：需要当前佩戴该公会徽章 */
export function buyGuildShopItem(guildId, itemId) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '公会商店只在乌托邦城营业。'
  const guild = GUILD_BY_ID[guildId]
  if (!guild) return '没有这个公会。'
  if (activeGuildId() !== guildId) return `需要「${guild.name}」徽章才能在这里购买。`
  const good = guild.shop?.find((entry) => entry.id === itemId)
  if (!good) return '这家公会不卖这件东西。'
  if (game.coins < good.coins) return `末日币不足：需要 ${good.coins}，当前 ${game.coins}。`
  if (game.dawnCoins < good.dawnCoins) {
    return `曙光币不足：需要 ${good.dawnCoins}，当前 ${game.dawnCoins}。`
  }
  if (!canFitInventory(itemId)) return '背包已满，先腾出一格。'

  game.coins -= good.coins
  game.dawnCoins -= good.dawnCoins
  addItem(game.inventory, itemId, 1)
  return `购买 ${getItem(itemId)?.name ?? itemId} ×1，花费 ${good.coins} 末日币 + ${good.dawnCoins} 曙光币。`
}

/** 贡献商店物品是否已经兑换过 */
export function guildContributionPurchased(itemId) {
  return Boolean(game.flags.guildPurchases?.[itemId])
}

/** 贡献商店兑换：贡献值与双货币复合支付 */
export function buyGuildContributionItem(guildId, itemId) {
  if (game.dead) return ''
  if (game.location !== 'utopia-city') return '贡献商店只在乌托邦城营业。'
  const guild = GUILD_BY_ID[guildId]
  if (!guild) return '没有这个公会。'
  if (activeGuildId() !== guildId) return `需要「${guild.name}」徽章才能在这里兑换。`
  const good = guild.contributionShop?.find((entry) => entry.id === itemId)
  if (!good) return '这家公会没有这件兑换物。'
  if (good.once && guildContributionPurchased(itemId)) {
    return '这件兑换物每位成员只能兑换一次。'
  }
  const contribution = guildContribution(guildId)
  if (contribution < good.contribution) {
    return `公会贡献不足：需要 ${good.contribution}，当前 ${contribution}。`
  }
  if (game.coins < good.coins) return `末日币不足：需要 ${good.coins}，当前 ${game.coins}。`
  if (game.dawnCoins < good.dawnCoins) {
    return `曙光币不足：需要 ${good.dawnCoins}，当前 ${game.dawnCoins}。`
  }
  if (!canFitInventory(itemId)) return '背包已满，先腾出一格。'

  const map = { ...(game.flags.guildContribution ?? {}) }
  map[guildId] = contribution - good.contribution
  game.flags.guildContribution = map
  game.coins -= good.coins
  game.dawnCoins -= good.dawnCoins

  if (good.once) {
    const purchases = { ...(game.flags.guildPurchases ?? {}) }
    purchases[itemId] = true
    game.flags.guildPurchases = purchases
  }

  addItem(game.inventory, itemId, 1)
  return `兑换 ${getItem(itemId)?.name ?? itemId} ×1，消耗 ${good.contribution} 公会贡献 + ${good.coins} 末日币 + ${good.dawnCoins} 曙光币。`
}
