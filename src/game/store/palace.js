import {
  GARDEN,
  PALACE_COOLDOWN,
  PALACE_COUNCILS,
  PALACE_DANCES,
  PALACE_BANQUETS,
  PALACE_ROOMS,
  PALACE_SALARY,
  PALACE_SHOP,
  TREATMENT_TIERS,
  addItem,
  getItem,
  identityRank,
  pickDawnFruit,
  pickMeleeByTier,
} from '../../data'
import { DEFAULT_STATS } from '../config'
import { activeGuildId, activeGuild, statCap, game, adjustStats, cooldownLeft, useCooldown, advanceTurns } from './core.js'
import { recordGuildTheft } from './utopia.js'

/* ===== 都城王宫（进入不消耗回合） ===== */

export function palaceReady() {
  return !game.dead && game.location === 'ruined-city'
}

function knightReady() {
  return identityRank(game.identity) >= identityRank('骑士')
}

/** 贵族商店：王宫限定商品，全部用末日币结算 */
export function buyPalaceGood(goodId) {
  if (!palaceReady()) return ''
  if (!knightReady()) return '至少需要「骑士」身份才能进入王宫。'
  const good = PALACE_SHOP.find((item) => item.id === goodId)
  if (!good) return ''
  if (game.coins < good.price) return `末日币不足，${good.name} 需要 ${good.price}。`
  if (addItem(game.inventory, good.itemId, 1) > 0) return '背包已满，无法购买。'

  game.coins -= good.price
  return `购买 ${good.name} ×1，花费 ${good.price} 末日币。`
}

/** 偷窃：1 回合（正常衰减），每天一次，按概率获得末日币或被守卫扇耳光 */
export function stealPalace() {
  if (!palaceReady()) return ''
  if (!knightReady()) return '至少需要「骑士」身份才能进入王宫。'
  if (!useCooldown('steal', PALACE_COOLDOWN.daily)) {
    return '今天已经偷过一次，守卫把你盯得更紧了。'
  }

  advanceTurns(1)
  if (game.dead) return ''

  game.flags.cityTheftCount = (Number(game.flags.cityTheftCount) || 0) + 1
  recordGuildTheft()

  if (activeGuildId() === 'rogue') {
    const guild = activeGuild()
    const coinChance = Number(guild?.theftCoinChance) || 0.6
    const brandyChance = Number(guild?.theftBrandyChance) || 0.3
    const roll = Math.random()
    if (roll < coinChance) {
      const coins = Number(guild?.theftCoins) || 3
      game.coins += coins
      return `盗贼公会的徽章让守卫移开了视线：末日币 +${coins}。`
    }
    if (roll < coinChance + brandyChance) {
      const leftover = addItem(game.inventory, 'brandy', 1)
      return leftover > 0
        ? '你摸到一瓶白兰地，但背包已经满了，只能放回去。'
        : '你从酒柜里抽走一瓶白兰地：白兰地 ×1。'
    }
    const weapon = pickMeleeByTier('普通')
    if (!weapon) return '你摸到一件武器，但它卡在柜子缝里拔不出来。'
    const leftover = addItem(game.inventory, weapon.id, 1)
    return leftover > 0
      ? `你摸到一把${weapon.name}，但你的背包已经满了。`
      : `你从兵器架上顺走一把${weapon.name}（${weapon.tier}）。`
  }

  const roll = Math.random() * 100
  if (roll < 10) {
    game.coins += 3
    return '你摸走了一只鼓鼓的钱袋，没人看见：末日币 +3。'
  }
  if (roll < 30) {
    game.coins += 2
    return '你从供桌上抽走两枚硬币，塞进袖口：末日币 +2。'
  }
  if (roll < 60) {
    game.coins += 1
    return '你从银器柜里摸走一枚末日币：末日币 +1。'
  }
  if (roll < 80) {
    return '你把手伸进柜子，只摸到一层灰，什么也没偷到。'
  }

  adjustStats({ hp: -5 })
  return game.dead ? '' : '守卫一巴掌扇在你脸上，把你推出长廊：生命 -5。'
}

/** 宫廷舞会：三档共用每日次数，1 回合，无衰减，骑士以上 */
export function palaceDance(danceId = 'common') {
  if (!palaceReady()) return ''
  if (!knightReady()) return '至少需要「骑士」身份才能参加宫廷舞会。'
  const dance = PALACE_DANCES.find((item) => item.id === danceId)
  if (!dance) return ''
  if (cooldownLeft('dance', PALACE_COOLDOWN.daily) > 0) return '今天的舞会已经结束，明天再来。'
  if (game.coins < dance.price) return `末日币不足，${dance.name} 需要 ${dance.price}。`
  useCooldown('dance', PALACE_COOLDOWN.daily)

  if (dance.price > 0) game.coins -= dance.price
  advanceTurns(1, { decay: false })
  if (game.dead) return ''
  adjustStats({ sanity: dance.sanity })
  const cost = dance.price > 0 ? `，花费 ${dance.price} 末日币` : ''
  return `${dance.name}结束：理智 +${dance.sanity}${cost}。`
}

/** 宫廷宴会：三档共用每日次数，1 回合，无衰减，骑士以上 */
export function palaceBanquet(banquetId = 'common') {
  if (!palaceReady()) return ''
  if (!knightReady()) return '至少需要「骑士」身份才能参加宫廷宴会。'
  const banquet = PALACE_BANQUETS.find((item) => item.id === banquetId)
  if (!banquet) return ''
  if (cooldownLeft('banquet', PALACE_COOLDOWN.daily) > 0) return '今天的宴会已经结束，明天再来。'
  if (game.coins < banquet.price) return `末日币不足，${banquet.name} 需要 ${banquet.price}。`
  useCooldown('banquet', PALACE_COOLDOWN.daily)

  if (banquet.price > 0) game.coins -= banquet.price
  advanceTurns(1, { decay: false })
  if (game.dead) return ''
  adjustStats({ hunger: banquet.hunger, thirst: banquet.thirst })
  const cost = banquet.price > 0 ? `，花费 ${banquet.price} 末日币` : ''
  return `${banquet.name}结束：饱食 +${banquet.hunger}，口渴 +${banquet.thirst}${cost}。`
}

/** 宫廷客房：三档共用每日次数，2 回合，无衰减，骑士以上 */
export function palaceGuestRoom(roomId = 'common') {
  if (!palaceReady()) return ''
  if (!knightReady()) return '至少需要「骑士」身份才能入住宫廷客房。'
  const room = PALACE_ROOMS.find((item) => item.id === roomId)
  if (!room) return ''
  if (cooldownLeft('room', PALACE_COOLDOWN.daily) > 0) return '今天已经住过一次客房，明天再来。'
  if (game.coins < room.price) return `末日币不足，${room.name} 需要 ${room.price}。`
  useCooldown('room', PALACE_COOLDOWN.daily)

  if (room.price > 0) game.coins -= room.price
  advanceTurns(2, { decay: false })
  if (game.dead) return ''
  adjustStats({ stamina: room.stamina })
  const cost = room.price > 0 ? `，花费 ${room.price} 末日币` : ''
  return `${room.name}：体力 +${room.stamina}${cost}。`
}

/** 感染治疗：1 回合，无衰减，每天一次，按身份解锁不同档位 */
export function treatInfection(tierId) {
  if (!palaceReady()) return ''
  const tier = TREATMENT_TIERS.find((item) => item.id === tierId)
  if (!tier) return ''
  if (identityRank(game.identity) < tier.minRank) {
    return `「${tier.name}」至少需要「${tier.minIdentity}」身份。`
  }
  if (!useCooldown('treatment', PALACE_COOLDOWN.daily)) {
    return '今天已经接受过一次治疗，明天再来。'
  }

  advanceTurns(1, { decay: false })
  if (game.dead) return ''
  adjustStats({ infection: -tier.reduce })
  return `接受了${tier.name}：感染 -${tier.reduce}。`
}

/** 领取俸禄：1 回合，无衰减，每天一次，按身份发币 */
export function claimSalary() {
  if (!palaceReady()) return ''
  const amount = PALACE_SALARY[game.identity]
  if (!amount) return '只有骑士及以上身份才能领取俸禄。'
  if (!useCooldown('salary', PALACE_COOLDOWN.daily)) return '今天已经领过俸禄，明天再来。'

  advanceTurns(1, { decay: false })
  if (game.dead) return ''
  game.coins += amount
  return `以「${game.identity}」的身份领取俸禄：末日币 +${amount}。`
}

/** 参加会议：1 回合，无衰减，七种会议共用七日冷却 */
export function attendCouncil(councilId = 'knight') {
  if (!palaceReady()) return ''

  const council = PALACE_COUNCILS.find((item) => item.id === councilId)
  if (!council) return ''
  if (identityRank(game.identity) < council.rank) {
    return `「${council.name}」需要「${council.identity}」身份。`
  }
  if (!useCooldown('council', PALACE_COOLDOWN.weekly)) return '会议七天一次，还没到下一次。'

  advanceTurns(council.turns, { decay: false })
  if (game.dead) return ''

  game.coins += council.coins
  let line = `你参加「${council.name}」直到散会：末日币 +${council.coins}。`

  const weapon = pickMeleeByTier(council.weaponTier)
  if (weapon) {
    const leftover = addItem(game.inventory, weapon.id, 1)
    line +=
      leftover > 0
        ? ` 背包已满，${weapon.name}留在了会议桌上。`
        : ` 会后有人递给你一把${weapon.name}（${weapon.tier}）。`
  }
  return line
}

/** 宫廷花园：仅储君可用，四项活动各自计算次数 */
export function gardenActivity(activityId = 'walk') {
  if (!palaceReady()) return ''
  if (identityRank(game.identity) < GARDEN.rank) {
    return `花园只对「${GARDEN.identity}」开放。守卫没有让你进去。`
  }
  const activity = GARDEN.activities.find((item) => item.id === activityId)
  if (!activity) return ''
  if (!useCooldown(activity.cooldownKey, activity.days)) {
    return `「${activity.name}」${activity.days} 天一次，还没到下一次。`
  }

  advanceTurns(activity.turns, { decay: false })
  if (game.dead) return ''

  const lines = [`「${activity.name}」完成。`]

  if (activity.fullRestore) {
    Object.assign(game.stats, DEFAULT_STATS, { hp: statCap('hp') })
    lines.push('状态全部补满。')
  }
  if (activity.coins) {
    game.coins += activity.coins
    lines.push(`末日币 +${activity.coins}。`)
  }

  if (activity.fruitCount) {
    const fruitId = pickDawnFruit()
    if (fruitId) {
      const def = getItem(fruitId)
      const leftover = addItem(game.inventory, fruitId, activity.fruitCount)
      const added = activity.fruitCount - leftover
      const name = def?.name ?? '水果'
      if (added > 0) lines.push(`获得${name} ×${added}。`)
      if (leftover > 0) lines.push(`背包已满，${name} ×${leftover}留在了藤架下。`)
    }
  }

  for (const entry of activity.items ?? []) {
    const def = getItem(entry.itemId)
    const leftover = addItem(game.inventory, entry.itemId, entry.qty)
    const added = entry.qty - leftover
    const name = def?.name ?? entry.itemId
    if (added > 0) lines.push(`获得${name} ×${added}。`)
    if (leftover > 0) lines.push(`背包已满，${name} ×${leftover}留在了石桌上。`)
  }

  return lines.join(' ')
}
