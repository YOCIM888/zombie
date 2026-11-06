import {
  BACKPACK_MAX_SIZE,
  DEV_SHOP,
  expandPriceAtSize,
  TALENTS,
  TALENT_ACTIVE_LIMIT,
  ITEMS,
  addItem,
  canStoreItems,
  NPCS,
  npcById,
} from '../../data'
import { MAPS } from '../config'
import { game, devState, checkAchievements, checkLoanDue, grantIdentity, processTradeSales, ensureStockMarketDay } from './core.js'

/* ===== 郊区卖场 · 游戏开发者 ===== */

function devGuard() {
  if (game.dead) return ''
  if (game.location !== DEV_SHOP.mapId) return '游戏开发者只在郊区卖场的角落。'
  return null
}

/** 一次性新手礼包：少量货币与基础物资 */
export function takeDevNoviceGift() {
  const blocked = devGuard()
  if (blocked !== null) return blocked
  if (game.flags.devNoviceGiftTaken) return '新手礼包已经领过了。'
  if (!canStoreItems(game.inventory, DEV_SHOP.noviceItems)) {
    return '背包放不下这份补给，先腾出几格再来。'
  }

  for (const item of DEV_SHOP.noviceItems) {
    addItem(game.inventory, item.id, item.qty)
  }
  game.coins += DEV_SHOP.noviceCoins
  game.dawnCoins += DEV_SHOP.noviceDawnCoins
  game.flags.devNoviceGiftTaken = true
  return `游戏开发者递来一个新手礼包：末日币 +${DEV_SHOP.noviceCoins}，曙光币 +${DEV_SHOP.noviceDawnCoins}，外加万能灵药、抗感染针、罐头、越蔓梅、战术匕首和 M1911。「先活过这几天再说。」`
}

/** 一次性骑士礼包：骑士徽章与白兰地 */
export function takeDevKnightGift() {
  const blocked = devGuard()
  if (blocked !== null) return blocked
  if (game.flags.devKnightGiftTaken) return '骑士礼包已经领过了。'
  const brandy = DEV_SHOP.knightItems.find((item) => item.id !== 'badge-knight')
  if (brandy && !canStoreItems(game.inventory, [brandy])) {
    return '背包放不下这份礼包，先腾出几格再来。'
  }
  if (!grantIdentity('骑士')) return '背包已满，骑士徽章无处安放。'
  if (brandy) addItem(game.inventory, brandy.id, brandy.qty)
  game.flags.devKnightGiftTaken = true
  return `游戏开发者递来一枚骑士徽章和 ${brandy?.qty ?? 0} 瓶白兰地：「别问哪来的。」`
}

/** 一次性治疗礼包：绷带、止痛药与止血带 */
export function takeDevHealingGift() {
  const blocked = devGuard()
  if (blocked !== null) return blocked
  if (game.flags.devHealingGiftTaken) return '治疗礼包已经领过了。'
  if (!canStoreItems(game.inventory, DEV_SHOP.healingItems)) {
    return '背包放不下这份医疗物资，先腾出几格再来。'
  }
  for (const item of DEV_SHOP.healingItems) {
    addItem(game.inventory, item.id, item.qty)
  }
  game.flags.devHealingGiftTaken = true
  return '游戏开发者推来一箱医疗物资：绷带 10、止痛药 10、止血带 10。「这次不用缝。」'
}

/** 一次性糖果礼包：开发者糖果 ×10 */
export function takeDevCandyGift() {
  const blocked = devGuard()
  if (blocked !== null) return blocked
  if (game.flags.devCandyGiftTaken) return '糖果礼包已经领过了。'
  if (!canStoreItems(game.inventory, DEV_SHOP.candyItems)) {
    return '背包放不下这份糖果，先腾出几格再来。'
  }
  for (const item of DEV_SHOP.candyItems) {
    addItem(game.inventory, item.id, item.qty)
  }
  game.flags.devCandyGiftTaken = true
  return '游戏开发者推来一袋糖果：开发者糖果 ×10。「甜的东西，至少不会咬你。」'
}

/** 背包扩容：按当前容量分段收费，每次增加 10 格，上限 200 格 */
export function expandBackpack() {
  const blocked = devGuard()
  if (blocked !== null) return blocked
  if (game.inventory.length >= DEV_SHOP.expandLimit) {
    return `背包已经到 ${DEV_SHOP.expandLimit} 格上限，装不下更多了。`
  }

  const price = expandPriceAtSize(game.inventory.length)
  if (!price) return `背包已经到 ${DEV_SHOP.expandLimit} 格上限，装不下更多了。`

  const cost = price.coins
  const dawnCost = price.dawnCoins
  if (game.coins < cost) return `末日币不足，扩容需要 ${cost} 末日币。`
  if (game.dawnCoins < dawnCost) return `曙光币不足，扩容需要 ${dawnCost} 曙光币。`

  game.coins -= cost
  game.dawnCoins -= dawnCost
  const before = game.inventory.length
  const next = Math.min(before + DEV_SHOP.expandSteps, DEV_SHOP.expandLimit)
  for (let index = before; index < next; index += 1) game.inventory.push(null)
  return `你付了 ${cost} 末日币和 ${dawnCost} 曙光币。背包从 ${before} 格扩到 ${next} 格。`
}

/* ===== 开发者控制台 ===== */

const DEV_HELP = [
  '/help — 查看指令帮助',
  '/day 数字 — 跳转到指定天数（不消耗回合）',
  '/tp 地图名字 — 0 回合传送到指定地图',
  '/get 物品名称 数量 — 获得对应物品',
  '/remove — 移除背包里的所有物品（除开发者宝石）',
  '/kill on|off — 开启 / 关闭一击必杀',
  '/lock on|off — 锁定 / 解除状态条',
  '/ox on|off — 锁定 / 解除深海氧气',
  '/talent max|min — 所有天赋满级 / 重置',
  '/backpack — 背包容量提升至 200 格',
  '/coin_a 数量 — 获得末日币',
  '/coin_b 数量 — 获得曙光币',
  '/gem — 获得除开发者宝石外的所有宝石',
  '/re NPC名字 — 复活指定 NPC（可能影响任务，慎用）',
].join('\n')

/** 按名字或地区简写查找地图 */
function devFindMap(query) {
  const text = String(query ?? '').trim()
  if (!text) return null
  const lower = text.toLowerCase()
  if (['ship', 'airship', '飞行船'].includes(lower)) {
    return MAPS.find((item) => item.id === 'doomsday-airship') ?? null
  }
  return (
    MAPS.find((item) => item.name === text || item.id === lower) ??
    MAPS.find((item) => item.name.includes(text)) ??
    null
  )
}

/** 按名字或 ID 查找 NPC，支持省略「·」前的头衔 */
function devFindNpc(query) {
  const text = String(query ?? '').trim()
  if (!text) return null
  const lower = text.toLowerCase()
  return (
    npcById(text) ??
    Object.values(NPCS).find((item) => item.name === text || item.id === lower) ??
    Object.values(NPCS).find(
      (item) => item.name.includes(text) || item.name.split('·').pop() === text,
    ) ??
    null
  )
}

/** 执行开发者指令，返回要显示在控制台里的文本 */
export function runDevCommand(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return ''
  const [cmd, ...args] = raw.split(/\s+/)
  const command = cmd.toLowerCase()

  if (command === '/help') return DEV_HELP

  if (command === '/kill') {
    const mode = (args[0] ?? '').toLowerCase()
    if (mode === 'on') {
      devState.oneHitKill = true
      return '一击必杀已开启：你的下一次攻击会直接放倒目标。'
    }
    if (mode === 'off') {
      devState.oneHitKill = false
      return '一击必杀已关闭。'
    }
    return '用法：/kill on 或 /kill off'
  }

  if (command === '/lock') {
    const mode = (args[0] ?? '').toLowerCase()
    if (mode === 'on') {
      devState.lockStats = true
      return '状态条已锁定：生命、饱食、口渴、理智、体力不再下降，感染不再上升。'
    }
    if (mode === 'off') {
      devState.lockStats = false
      return '状态条已解锁，恢复正常衰减。'
    }
    return '用法：/lock on 或 /lock off'
  }

  if (command === '/ox') {
    const mode = (args[0] ?? '').toLowerCase()
    if (mode === 'on') {
      devState.lockOxygen = true
      return '深海氧气已锁定：深海战斗中近战不再消耗氧气。'
    }
    if (mode === 'off') {
      devState.lockOxygen = false
      return '深海氧气已解锁，深海近战恢复每次 20 点消耗。'
    }
    return '用法：/ox on 或 /ox off'
  }

  if (command === '/backpack') {
    if (game.inventory.length >= BACKPACK_MAX_SIZE) {
      return `背包已经是 ${BACKPACK_MAX_SIZE} 格上限。`
    }
    const before = game.inventory.length
    for (let index = before; index < BACKPACK_MAX_SIZE; index += 1) {
      game.inventory.push(null)
    }
    return `背包从 ${before} 格提升到 ${BACKPACK_MAX_SIZE} 格。`
  }

  if (command === '/get') {
    const tokens = [...args]
    let qty = 1
    if (tokens.length && /^\d+$/.test(tokens[tokens.length - 1])) {
      qty = Number.parseInt(tokens.pop(), 10)
    }
    const name = tokens.join(' ').trim()
    if (!name) return '用法：/get 物品名称 数量'
    if (!Number.isFinite(qty) || qty <= 0) return '数量必须是正整数。'

    const def =
      Object.values(ITEMS).find((item) => item.name === name) ?? ITEMS[name] ?? null
    if (!def) return `没有找到「${name}」这件物品。`
    const leftover = addItem(game.inventory, def.id, qty)
    return leftover > 0
      ? `背包只放下了 ${qty - leftover} 个「${def.name}」，还有 ${leftover} 个没装下。`
      : `获得 ${def.name} ×${qty}。`
  }

  if (command === '/remove') {
    let removed = 0
    for (let index = 0; index < game.inventory.length; index += 1) {
      const entry = game.inventory[index]
      if (!entry || entry.id === 'developer-gem') continue
      game.inventory[index] = null
      removed += 1
    }
    return removed > 0
      ? `已移除背包里的 ${removed} 件物品，开发者宝石已保留。`
      : '背包里没有可移除的物品（开发者宝石已保留）。'
  }

  if (command === '/gem') {
    const gems = Object.values(ITEMS).filter(
      (item) => item.category === 'gem' && item.special !== 'developer-gem',
    )
    const given = []
    const missed = []
    for (const gem of gems) {
      const leftover = addItem(game.inventory, gem.id, 1)
      if (leftover > 0) missed.push(gem.name)
      else given.push(gem.name)
    }
    const lines = []
    if (given.length) lines.push(`获得宝石：${given.join(' / ')}。`)
    if (missed.length) lines.push(`背包空间不足，未能放入：${missed.join(' / ')}。`)
    return lines.join('\n')
  }

  if (command === '/coin_a' || command === '/coin_b') {
    const value = Number.parseInt(args[0], 10)
    if (!Number.isFinite(value) || value <= 0) {
      return `用法：${command} 数量（正整数）`
    }
    if (command === '/coin_a') {
      game.coins += value
      return `获得末日币 ×${value}，当前 ${game.coins}。`
    }
    game.dawnCoins += value
    return `获得曙光币 ×${value}，当前 ${game.dawnCoins}。`
  }

  if (command === '/talent') {
    const mode = (args[0] ?? '').toLowerCase()
    if (mode === 'max') {
      for (const talent of Object.values(TALENTS)) {
        game.talents[talent.key] = talent.maxLevel
        game.training[talent.key] = 0
      }
      const levels = Object.values(TALENTS)
        .map((talent) => `${talent.label} Lv.${talent.maxLevel}`)
        .join(' · ')
      return `所有天赋已满级：${levels}。最多仍只能启用 ${TALENT_ACTIVE_LIMIT} 个。`
    }
    if (mode === 'min') {
      for (const talent of Object.values(TALENTS)) {
        game.talents[talent.key] = 0
        game.training[talent.key] = 0
      }
      game.activeTalents = []
      return '所有天赋已重置为 0，熟练度与启用列表已清空。'
    }
    return '用法：/talent max 或 /talent min'
  }

  if (command === '/day') {
    const value = Number.parseInt(args[0], 10)
    if (!Number.isFinite(value) || value < 1) {
      return '用法：/day 数字（最小为第 1 天）'
    }
    if (game.dead) return '你已经死了，无法跳转时间。'

    const before = game.day
    game.day = value
    game.phase = 0
    if (value > before) processTradeSales()
    if (game.market) ensureStockMarketDay()
    checkLoanDue()
    checkAchievements()
    return game.dead
      ? `时间从第 ${before} 天跳到第 ${value} 天，借贷逾期同时结算。`
      : `时间从第 ${before} 天跳转到第 ${value} 天，属性没有产生消耗。`
  }

  if (command === '/tp') {
    const query = args.join(' ').trim()
    if (!query) {
      return `用法：/tp 地图名字（可用：${MAPS.map((item) => item.name).join(' / ')}）`
    }
    const map = devFindMap(query)
    if (!map) {
      return `没有找到「${query}」这张地图。可用：${MAPS.map((item) => item.name).join(' / ')}`
    }
    if (game.dead) return '你已经死了，无法传送。'

    game.location = map.id
    return `已传送至「${map.name}」，消耗 0 回合，未扣除属性。`
  }

  if (command === '/re') {
    const query = args.join(' ').trim()
    if (!query) {
      return `用法：/re NPC名字（可用：${Object.values(NPCS)
        .map((npc) => npc.name)
        .join(' / ')}）`
    }
    const npc = devFindNpc(query)
    if (!npc) {
      return `没有找到 NPC「${query}」。可用：${Object.values(NPCS)
        .map((item) => item.name)
        .join(' / ')}`
    }
    if (!game.flags[npc.deathFlag]) return `${npc.name} 本来就活着。`
    game.flags[npc.deathFlag] = false
    return `已复活「${npc.name}」。注意：相关任务与剧情标记不会回滚，可能导致任务异常或坏档，请务必先存档。`
  }

  return `未知指令：${cmd}。输入 /help 查看可用指令。`
}
