import {
  COMPANIONS,
  DOCTOR,
  GARAGE,
  GIANT_PUPPET,
  LULU,
  MA_SAN,
  MAFEI,
  MERMAID,
  ORCHARD,
  ROCKET,
  ROTTEN_SEED,
  STRANGE_BARBECUE,
  YANRAN,
  addItem,
  canStoreItems,
  countItem,
  getItem,
  isCannedItem,
  isFruitItem,
  isSpiritItem,
  npcById,
  pickCompanionLoot,
  pickDawnFruit,
  pickRandomMedicine,
  removeItem,
} from '../../data'
import { game, notify, adjustStats, die, cooldownLeft, advanceTurns } from './core.js'
import { isQuestDone, isQuestActive, acceptQuest } from './quests.js'

/* ===== 废弃村庄 · 露营山区 专属互动 ===== */

/** 背包内任意水果总数 */
function fruitTotal() {
  return game.inventory.reduce((sum, entry) => {
    if (!entry) return sum
    return isFruitItem(entry.id) ? sum + (entry.qty ?? 1) : sum
  }, 0)
}

export function countFruits() {
  return fruitTotal()
}

/** 按背包顺序消耗任意水果；返回实际消耗的数量 */
function consumeFruits(qty) {
  let remaining = qty
  for (let index = 0; index < game.inventory.length && remaining > 0; index += 1) {
    const entry = game.inventory[index]
    if (!entry || !isFruitItem(entry.id)) continue
    const have = entry.qty ?? 1
    const take = Math.min(have, remaining)
    remaining -= take
    if (have - take <= 0) game.inventory[index] = null
    else entry.qty = have - take
  }
  return qty - remaining
}

/** 背包内阿三认的烈酒总数 */
function spiritTotal() {
  return game.inventory.reduce((sum, entry) => {
    if (!entry) return sum
    return isSpiritItem(entry.id) ? sum + (entry.qty ?? 1) : sum
  }, 0)
}

export function countSpirits() {
  return spiritTotal()
}

function consumeSpirits(qty) {
  let remaining = qty
  for (let index = 0; index < game.inventory.length && remaining > 0; index += 1) {
    const entry = game.inventory[index]
    if (!entry || !isSpiritItem(entry.id)) continue
    const have = entry.qty ?? 1
    const take = Math.min(have, remaining)
    remaining -= take
    if (have - take <= 0) game.inventory[index] = null
    else entry.qty = have - take
  }
  return qty - remaining
}

/** 废弃村庄：果园采摘，随机 1 种水果 ×9，冷却 5 天 */
export function pickOrchard() {
  if (game.dead) return ''
  if (game.location !== ORCHARD.mapId) return '果园只在废弃村庄。'

  const left = cooldownLeft(ORCHARD.cooldownKey, ORCHARD.cooldownDays)
  if (left > 0) return `这片果园刚摘过，还要等 ${left} 天。`

  const actionDay = game.day
  advanceTurns(ORCHARD.turns)
  if (game.dead) return ''

  const itemId = pickDawnFruit()
  if (!itemId) return '枝头上已经空了。'
  const def = getItem(itemId)
  const leftover = addItem(game.inventory, itemId, ORCHARD.quantity)
  const added = ORCHARD.quantity - leftover
  if (added <= 0) return '背包已满，你连一个果子都装不下。'

  game.cooldowns[ORCHARD.cooldownKey] = actionDay
  return leftover > 0
    ? `你摘到 ${def?.name ?? '水果'} ×${added}，剩下的 ${leftover} 个装不下了。`
    : `你在果树上摘到 ${def?.name ?? '水果'} ×${ORCHARD.quantity}。`
}

/** 废弃村庄：从果箱底下翻出腐烂种子 */
export function takeRottenSeed() {
  if (game.dead) return ''
  if (game.location !== ORCHARD.mapId) return '腐烂种子埋在废弃村庄的果箱底下。'
  if (game.flags.rottenSeedPlanted) return '田里的果苗已经长起来了，不需要再找种子。'
  if (game.flags.rottenSeedSprouted) return '种子已经在苗苗的田里了。'
  if (countItem(game.inventory, ROTTEN_SEED.itemId) > 0) return '那枚腐烂种子已经在背包里。'

  advanceTurns(1)
  if (game.dead) return ''
  if (addItem(game.inventory, ROTTEN_SEED.itemId, 1) > 0) {
    return '背包已满，你腾不出手把它带走。'
  }
  game.flags.rottenSeedFound = true
  return '你在塌掉的果箱底下翻到一枚腐烂种子。它裂开的口子里，冒出一点白。'
}

/** 曙光阵地：把种子交给苗苗育苗，消耗 3 份任意水果 */
export function sproutRottenSeed() {
  if (game.dead) return ''
  if (game.location !== 'dawn-post') return '育苗要找曙光阵地的苗苗。'
  if (game.flags.rottenSeedPlanted) return '果苗已经移栽进田里了。'
  if (!game.flags.rottenSeedFound) return '你还没有找到那枚腐烂种子。'
  if (game.flags.rottenSeedSprouted) return '种子已经在她手里育着，该去补果苗了。'
  if (countItem(game.inventory, ROTTEN_SEED.itemId) < 1) return '种子不在背包里。'
  if (fruitTotal() < ROTTEN_SEED.sproutFruits) {
    return `育苗至少需要 ${ROTTEN_SEED.sproutFruits} 份水果。`
  }

  removeItem(game.inventory, ROTTEN_SEED.itemId, 1)
  consumeFruits(ROTTEN_SEED.sproutFruits)
  advanceTurns(ROTTEN_SEED.sproutTurns)
  if (game.dead) return ''

  game.flags.rottenSeedSprouted = true
  return '苗苗把种子埋进湿土里，说：过两天你再来，它要么活，要么烂透。'
}

/** 曙光阵地：补齐 9 份水果后移栽，触发结局「生机」 */
export function plantRottenSeed() {
  if (game.dead) return ''
  if (game.location !== 'dawn-post') return '移栽得在曙光阵地苗苗的田里。'
  if (game.flags.rottenSeedPlanted) return '果苗已经长在田里了。'
  if (!game.flags.rottenSeedSprouted) return '先让苗苗把种子育出苗来。'
  if (fruitTotal() < ROTTEN_SEED.plantFruits) {
    return `移栽需要 ${ROTTEN_SEED.plantFruits} 份水果，让她把苗周围的土养住。`
  }

  consumeFruits(ROTTEN_SEED.plantFruits)
  advanceTurns(ROTTEN_SEED.plantTurns)
  if (game.dead) return ''

  game.flags.rottenSeedPlanted = true
  game.finale = ROTTEN_SEED.finale
  if (typeof window !== 'undefined') notify(`结局达成 · ${ROTTEN_SEED.finale}`)
  return ''
}

/** 露营山区：奇怪烧烤，每日一次 */
export function eatStrangeBarbecue() {
  if (game.dead) return ''
  if (game.location !== STRANGE_BARBECUE.mapId) return '烧烤摊只在露营山区。'

  const left = cooldownLeft(STRANGE_BARBECUE.cooldownKey, STRANGE_BARBECUE.cooldownDays)
  if (left > 0) return '今天这炉已经吃过了，阿三在收摊。'

  const actionDay = game.day
  advanceTurns(STRANGE_BARBECUE.turns)
  if (game.dead) return ''

  adjustStats(STRANGE_BARBECUE.effects)
  if (game.dead) return ''

  game.cooldowns[STRANGE_BARBECUE.cooldownKey] = actionDay
  game.flags.ateStrangeMeat = true
  return '肉有点酸，但你还是咽了下去。胃里暖起来，伤口却在发烫。'
}

function maSanStage() {
  return Number(game.flags.maSanStage) || 0
}

function maSanGuard() {
  if (game.dead) return ''
  if (game.location !== MA_SAN.mapId) return '阿三的摊子只在露营山区。'
  if (!game.flags.ateStrangeMeat) return MA_SAN.lockedLine
  if (game.flags.maSanKilled) return MA_SAN.killedLine
  return null
}

/** 冷面阿三·第一段：3 罐白威啤酒 */
export function deliverMaSanBeer() {
  const blocked = maSanGuard()
  if (blocked !== null) return blocked
  if (maSanStage() !== 0) return '他已经收下酒了。'

  const have = countItem(game.inventory, MA_SAN.beerId)
  if (have < MA_SAN.beerCount) return `白威啤酒不够：${have} / ${MA_SAN.beerCount}。`

  removeItem(game.inventory, MA_SAN.beerId, MA_SAN.beerCount)
  game.flags.maSanStage = 1
  return '阿三把三罐白威啤酒塞进围裙口袋，刀口往砧板上一拍。'
}

/** 冷面阿三·第二段：3 份任意水果 */
export function deliverMaSanFruit() {
  const blocked = maSanGuard()
  if (blocked !== null) return blocked
  if (maSanStage() !== 1) return '现在还不是递水果的时候。'

  const have = fruitTotal()
  if (have < MA_SAN.fruitCount) return `水果不够：${have} / ${MA_SAN.fruitCount}。`

  consumeFruits(MA_SAN.fruitCount)
  game.flags.maSanStage = 2
  return '他捏了捏果子，没说好坏，只把果核吐进了火里。'
}

/** 冷面阿三·第三段：5 瓶任意烈酒 */
export function deliverMaSanSpirit() {
  const blocked = maSanGuard()
  if (blocked !== null) return blocked
  if (maSanStage() !== 2) return '他还没打算喝这一轮。'

  const have = spiritTotal()
  if (have < MA_SAN.spiritCount) return `烈酒不够：${have} / ${MA_SAN.spiritCount}。`

  consumeSpirits(MA_SAN.spiritCount)
  game.flags.maSanStage = 3
  return '阿三拧开第五瓶，先给自己倒了半碗。他看你的眼神变了。'
}

/** 冷面阿三·接受邀请：不可继续结局「食人魔」 */
export function acceptMaSanInvite() {
  const blocked = maSanGuard()
  if (blocked !== null) return blocked
  if (maSanStage() !== 3) return '他还没打算让你进后厨。'

  die(MA_SAN.acceptReason, '食人魔')
  return ''
}

/* ===== 山地军营 · 马斐 ===== */

/** NPC 是否已被马斐的委托处决 */
export function isNpcDead(npcId) {
  const npc = npcById(npcId)
  return Boolean(npc && game.flags[npc.deathFlag])
}

/** 背包里的高能炸药数量 */
export function countHighExplosive() {
  return countItem(game.inventory, MAFEI.explosiveItemId)
}

/** 合成高能炸药：完成马斐任务十后解锁，16 回合一块，正常衰减 */
export function craftHighExplosive() {
  if (game.dead) return ''
  if (game.location !== MAFEI.mapId) return '炸药台架在山地军营的营房后面。'
  if (game.flags.mafeiKilled) return MAFEI.killedLine
  if (!isQuestDone('mafei-10')) return '马斐把方子压在枪下面：「先把名单办完。」'

  if (!canStoreItems(game.inventory, [{ id: MAFEI.explosiveItemId, qty: 1 }])) {
    return '背包已满，配好的炸药无处安放。'
  }

  advanceTurns(MAFEI.craftTurns)
  if (game.dead) return ''

  addItem(game.inventory, MAFEI.explosiveItemId, 1)
  return `你按马斐的方子守了 ${MAFEI.craftTurns} 个回合，一块高能炸药压成了型（现有 ${countHighExplosive()} 块）。`
}

/** 航天基地：把高能炸药装进发射架，炸毁火箭 */
export function detonateSpaceport() {
  if (game.dead) return ''
  if (game.location !== ROCKET.mapId) return '发射架在航天基地最深处。'
  if (!isQuestActive('mafei-11')) return '你还没有接到爆破火箭的命令。'
  if (game.flags.spaceportBlown) return '发射架已经塌了，只剩下扭曲的钢架。'
  if (countHighExplosive() < 1) return '你手里没有高能炸药。先回山地军营合成一块。'

  removeItem(game.inventory, MAFEI.explosiveItemId, 1)
  advanceTurns(1)
  if (game.dead) return ''

  game.flags.spaceportBlown = true
  return '你把炸药贴在箭体的承力环上，引线短得来不及跑远。爆炸声过后，发射架上只剩一段歪斜的钢架。'
}

/** 马斐任务十二：接取即被灭口，达成死亡结局「恶魔」 */
export function acceptMafeiFinalQuest() {
  if (game.dead) return ''
  if (game.location !== MAFEI.mapId) return '马斐在山地军营等你。'
  return acceptQuest('mafei-12')
}

/* ===== 郊区卖场 · 人鱼公主 ===== */

export function mermaidStage() {
  return Number(game.flags.mermaidStage) || 0
}

export function mermaidCurrent() {
  return MERMAID.stages[mermaidStage()] ?? null
}

/** 提交当前阶段饮品；第四段完成后发放三叉戟-海歌与结局 */
export function submitMermaidDrink() {
  if (game.dead) return ''
  if (game.location !== MERMAID.mapId) return '人鱼公主在郊区卖场的水族箱边。'
  if (mermaidStage() >= MERMAID.stages.length) return MERMAID.healedLine

  const index = mermaidStage()
  const stage = MERMAID.stages[index]
  const def = getItem(stage.itemId)
  const have = countItem(game.inventory, stage.itemId)
  if (have < stage.count) {
    return `还差 ${stage.count - have} 瓶${def?.name ?? '饮品'}。`
  }

  removeItem(game.inventory, stage.itemId, stage.count)
  advanceTurns(MERMAID.turns)
  if (game.dead) return ''

  game.flags.mermaidStage = index + 1
  if (index + 1 < MERMAID.stages.length) return MERMAID.lines[index]

  const leftover = addItem(game.inventory, MERMAID.rewardItemId, 1)
  if (leftover > 0) {
    game.flags.mermaidStage = index
    return '背包已满，三叉戟-海歌还留在水边。'
  }
  game.finale = MERMAID.finale
  if (typeof window !== 'undefined') notify(`结局达成 · ${MERMAID.finale}`)
  return `${MERMAID.lines[index]}\n\n${MERMAID.rewardLine}`
}

/* ===== 核心商圈 · 半感染者嫣然 ===== */

export function countAntiInfection() {
  return countItem(game.inventory, YANRAN.serumId)
}

/** 已发现时返回剩余天数；未发现返回 null */
export function yanranDaysLeft() {
  if (!game.flags.yanranSeen) return null
  if (game.flags.yanranRescued || game.flags.yanranKilled) return null
  const left = Number(game.flags.yanranDeadline) - game.day
  return Math.max(0, left)
}

/** 第一次靠近：开始 30 天倒计时 */
export function approachYanran() {
  if (game.dead) return ''
  if (game.location !== YANRAN.mapId) return '嫣然在核心商圈的中庭。'
  if (game.flags.yanranRescued) return '嫣然已经在安全屋等你了。'
  if (game.flags.yanranKilled) return YANRAN.killedLine

  if (game.flags.yanranSeen) {
    if (game.day > Number(game.flags.yanranDeadline)) {
      game.flags.yanranLost = true
      return YANRAN.lostLine
    }
    return `你又一次靠近她。距离她彻底变异还有 ${yanranDaysLeft()} 天。`
  }

  advanceTurns(1)
  if (game.dead) return ''

  game.flags.yanranSeen = true
  game.flags.yanranDeadline = game.day + YANRAN.deadlineDays
  return `${YANRAN.intro}\n\n她还有 ${YANRAN.deadlineDays} 天。你数了数身上的抗感染针。`
}

/** 一次性注射 5 支抗感染针 */
export function rescueYanran() {
  if (game.dead) return ''
  if (game.location !== YANRAN.mapId) return '嫣然在核心商圈的中庭。'
  if (game.flags.yanranRescued) return '嫣然已经在安全屋等你了。'
  if (game.flags.yanranKilled) return YANRAN.killedLine
  if (!game.flags.yanranSeen) return '你先得靠近她，才知道她还有没有救。'
  if (game.day > Number(game.flags.yanranDeadline)) {
    game.flags.yanranLost = true
    return YANRAN.lostLine
  }

  const have = countAntiInfection()
  if (have < YANRAN.serumCount) {
    return `抗感染针不够：${have} / ${YANRAN.serumCount}。`
  }

  removeItem(game.inventory, YANRAN.serumId, YANRAN.serumCount)
  advanceTurns(1)
  if (game.dead) return ''

  game.flags.yanranRescued = true
  if (typeof window !== 'undefined') notify('伙伴加入 · 嫣然', 3200)
  return YANRAN.rescuedLine
}

/* ===== 核心商圈 · 地下车库 ===== */

export function countGasoline() {
  return countItem(game.inventory, GARAGE.gasolineId)
}

function garageGuard({ allowDeparted = false } = {}) {
  if (game.dead) return ''
  if (game.location !== GARAGE.mapId) return '地下车库在核心商圈负一层。'
  if (!game.flags[GARAGE.requiresFlag]) return GARAGE.lockedLine
  if (game.flags.garageDeparted && !allowDeparted) return GARAGE.departedLine
  return null
}

/** 第一段：装备撬棍撬开卷帘门 */
export function openGarageDoor() {
  const blocked = garageGuard()
  if (blocked !== null) return blocked
  if (game.flags.garageOpened) return '门已经开了。'

  if (game.equipment.melee?.id !== GARAGE.crowbarId) {
    return '卷帘门纹丝不动，你需要装备一根撬棍。'
  }

  advanceTurns(1)
  if (game.dead) return ''
  game.flags.garageOpened = true
  return '撬棍卡进卷帘门的缝里，你整个人压上去。门后是几排积灰的车位。'
}

/** 第二段：翻找车钥匙 */
export function searchGarageKey() {
  const blocked = garageGuard()
  if (blocked !== null) return blocked
  if (!game.flags.garageOpened) return '得先撬开卷帘门。'
  if (game.flags.garageKeyFound || countItem(game.inventory, GARAGE.carKeyId) > 0) {
    return '车钥匙在你口袋里。'
  }

  advanceTurns(1)
  if (game.dead) return ''

  if (Math.random() >= GARAGE.keyChance) return '你翻遍了几辆车，只摸到一手灰。'
  const leftover = addItem(game.inventory, GARAGE.carKeyId, 1)
  if (leftover > 0) return '车钥匙就在遮阳板后面，可你的背包塞不下。'
  game.flags.garageKeyFound = true
  return '你在第三辆车的遮阳板后面摸到一把车钥匙。'
}

/** 第三段：从油桶里偷取汽油（达成私奔结局后仍可继续偷油） */
export function stealGarageGasoline() {
  const blocked = garageGuard({ allowDeparted: true })
  if (blocked !== null) return blocked
  if (!game.flags.garageOpened) return '得先撬开卷帘门。'

  advanceTurns(2)
  if (game.dead) return ''

  const leftover = addItem(game.inventory, GARAGE.gasolineId, 1)
  if (leftover > 0) return '你从油桶里倒出一桶汽油，可背包已经塞满了。'
  return `你从油桶里倒出 1 桶汽油（当前 ${countGasoline()} / ${GARAGE.gasolineCount}）。`
}

/** 终点：出发私奔，可继续结局「私奔」 */
export function elopeGarage() {
  const blocked = garageGuard()
  if (blocked !== null) return blocked
  if (!game.flags.garageOpened) return '得先撬开卷帘门。'
  if (!game.flags.garageKeyFound) return '还没找到车钥匙。'
  if (countGasoline() < GARAGE.gasolineCount) {
    return `汽油不够：${countGasoline()} / ${GARAGE.gasolineCount}。`
  }

  removeItem(game.inventory, GARAGE.gasolineId, GARAGE.gasolineCount)
  advanceTurns(1)
  if (game.dead) return ''

  game.flags.garageDeparted = true
  game.finale = GARAGE.finale
  if (typeof window !== 'undefined') notify(`结局达成 · ${GARAGE.finale}`)
  return '引擎第一次打火就着了。嫣然坐进副驾，把地图摊在膝盖上。'
}

/* ===== 公立医院 · 饥饿丧尸露露 ===== */

export function countCans() {
  return game.inventory.reduce((sum, entry) => {
    if (!entry) return sum
    return isCannedItem(entry.id) ? sum + (entry.qty ?? 1) : sum
  }, 0)
}

/** 按背包顺序消耗任意罐头；返回实际消耗数量 */
function consumeCans(qty) {
  let remaining = qty
  for (let index = 0; index < game.inventory.length && remaining > 0; index += 1) {
    const entry = game.inventory[index]
    if (!entry || !isCannedItem(entry.id)) continue
    const have = entry.qty ?? 1
    const take = Math.min(have, remaining)
    remaining -= take
    if (have - take <= 0) game.inventory[index] = null
    else entry.qty = have - take
  }
  return qty - remaining
}

/** 一次性放下 30 个任意罐头 */
export function feedLulu() {
  if (game.dead) return ''
  if (game.location !== LULU.mapId) return '露露在公立医院的护士站。'
  if (game.flags.luluRescued) return '露露已经跟着你了。'

  const have = countCans()
  if (have < LULU.cannedCount) {
    return `罐头不够：${have} / ${LULU.cannedCount}。`
  }

  consumeCans(LULU.cannedCount)
  advanceTurns(1)
  if (game.dead) return ''

  game.flags.luluRescued = true
  if (typeof window !== 'undefined') notify('伙伴加入 · 露露', 3200)
  return LULU.rescuedLine
}

/* ===== 伙伴收获 ===== */

function companionGuard(partnerId) {
  if (game.dead) return ''
  if (!game.flags[`${partnerId}Rescued`]) return '她还没有跟着你。'
  return null
}

/** 嫣然每天带回 2 件食物/饮品/水果 */
export function harvestYanran() {
  const blocked = companionGuard('yanran')
  if (blocked !== null) return blocked
  const left = cooldownLeft(COMPANIONS.yanran.harvestKey, COMPANIONS.yanran.cooldownDays)
  if (left > 0) return `嫣然今天已经出去过了，${left} 天后可以再来。`

  const actionDay = game.day
  advanceTurns(1)
  if (game.dead) return ''

  const picks = pickCompanionLoot('yanran')
  const names = []
  let leftoverTotal = 0
  for (const itemId of picks) {
    const leftover = addItem(game.inventory, itemId, 1)
    const def = getItem(itemId)
    if (leftover > 0) leftoverTotal += 1
    else names.push(def?.name ?? itemId)
  }
  if (!names.length) return '嫣然空手回来了。你的背包已经塞不下任何东西。'

  game.cooldowns[COMPANIONS.yanran.harvestKey] = actionDay
  const tail = leftoverTotal > 0 ? ' 有东西没能塞进背包。' : ''
  return `嫣然带回：${names.join('、')}。${tail}`
}

/** 露露每天带回 1 件药品 */
export function harvestLulu() {
  const blocked = companionGuard('lulu')
  if (blocked !== null) return blocked
  const left = cooldownLeft(COMPANIONS.lulu.harvestKey, COMPANIONS.lulu.cooldownDays)
  if (left > 0) return `露露今天已经出去过了，${left} 天后可以再来。`

  const actionDay = game.day
  advanceTurns(1)
  if (game.dead) return ''

  const itemId = pickRandomMedicine()
  const leftover = addItem(game.inventory, itemId, 1)
  const def = getItem(itemId)
  if (leftover > 0) return '露露带回了一件药品，可你的背包塞不下。'

  game.cooldowns[COMPANIONS.lulu.harvestKey] = actionDay
  return `露露带回：${def?.name ?? '药品'}。`
}

/* ===== X研究所 · 陈博士 ===== */

function doctorGuard() {
  if (game.dead) return ''
  if (game.location !== DOCTOR.mapId) return '陈博士在 X研究所的培养区。'
  return null
}

/** 背包里已经攒了几枚发射徽章 */
export function countDoctorBadges() {
  return DOCTOR.badges.reduce(
    (sum, id) => sum + (countItem(game.inventory, id) > 0 ? 1 : 0),
    0,
  )
}

/** 模拟「扣掉一批物品后还能放下新物品」，避免交付后徽章无处安放 */
function fitsAfterRemove(removals, newItemId) {
  const copy = game.inventory.map((entry) => (entry ? { ...entry } : null))
  for (const { category, itemId, qty } of removals) {
    if (category) consumeCategory(copy, category, qty)
    else removeItem(copy, itemId, qty)
  }
  return addItem(copy, newItemId, 1) === 0
}

function countCategory(inventory, category) {
  return inventory.reduce((sum, entry) => {
    if (!entry) return sum
    return getItem(entry.id)?.category === category ? sum + (entry.qty ?? 1) : sum
  }, 0)
}

/** 按背包顺序消耗某一分类的物品；返回实际消耗数量 */
function consumeCategory(inventory, category, qty) {
  let remaining = qty
  for (let index = 0; index < inventory.length && remaining > 0; index += 1) {
    const entry = inventory[index]
    if (!entry || getItem(entry.id)?.category !== category) continue
    const have = entry.qty ?? 1
    const take = Math.min(have, remaining)
    remaining -= take
    if (have - take <= 0) inventory[index] = null
    else entry.qty = have - take
  }
  return qty - remaining
}

/** 交付 20 支抗感染针，换一把 M700 */
export function doctorTrade() {
  const blocked = doctorGuard()
  if (blocked !== null) return blocked
  if (game.flags.doctorTradeDone) return '陈博士已经把最后一把 M700 交给你了。'

  const have = countAntiInfection()
  if (have < DOCTOR.serumCount) {
    return `抗感染针不够：${have} / ${DOCTOR.serumCount}。`
  }
  if (!fitsAfterRemove([{ itemId: DOCTOR.serumId, qty: DOCTOR.serumCount }], DOCTOR.rewardItemId)) {
    return DOCTOR.fullLine
  }

  removeItem(game.inventory, DOCTOR.serumId, DOCTOR.serumCount)
  advanceTurns(1)
  if (game.dead) return ''

  addItem(game.inventory, DOCTOR.rewardItemId, 1)
  game.flags.doctorTradeDone = true
  return DOCTOR.tradedLine
}

/** 任务①：上交小核能发电机，取得动力徽章 */
export function submitGenerator() {
  const blocked = doctorGuard()
  if (blocked !== null) return blocked
  if (!game.flags.doctorTradeDone) return '先用手里的抗感染针换下那把 M700，陈博士才肯谈下一步。'
  if (game.flags.doctorQuest1Done) return '动力回路已经接好了。'
  if (!game.flags.giantPuppetDefeated) return DOCTOR.needPuppetLine
  if (countItem(game.inventory, DOCTOR.generatorId) < 1) {
    return '发电机还在航天基地发射中心那具傀儡的残骸里。'
  }

  removeItem(game.inventory, DOCTOR.generatorId, 1)
  advanceTurns(1)
  if (game.dead) return ''

  if (addItem(game.inventory, DOCTOR.badges[0], 1) > 0) {
    addItem(game.inventory, DOCTOR.generatorId, 1)
    return DOCTOR.fullLine
  }
  game.flags.doctorQuest1Done = true
  return '陈博士把铭牌拧下来，在背面刻了一个「动」字。「动力这一环，过了。」'
}

/** 任务②：能源井每天抽 1 份纯净能源 */
export function extractEnergy() {
  const blocked = doctorGuard()
  if (blocked !== null) return blocked
  if (!game.flags.doctorTradeDone) return '先用手里的抗感染针换下那把 M700，陈博士才肯谈下一步。'
  if (!game.flags.doctorQuest1Done) return '得先把动力回路接上，能源井才会通电。'
  if (game.flags.doctorQuest2Done) return '能源已经抽够了，井口封了回去。'

  const left = cooldownLeft(DOCTOR.energyCooldownKey, DOCTOR.energyCooldownDays)
  if (left > 0) return `能源井今天已经抽过一份，还要等 ${left} 天。`

  const actionDay = game.day
  advanceTurns(1)
  if (game.dead) return ''

  if (addItem(game.inventory, DOCTOR.energyId, 1) > 0) {
    return '能源井吐出一份纯净能源，可你的背包塞不下。'
  }
  game.cooldowns[DOCTOR.energyCooldownKey] = actionDay
  const have = countItem(game.inventory, DOCTOR.energyId)
  return `能源井抽出 1 份纯净能源（${have} / ${DOCTOR.energyCount}）。${DOCTOR.quest2Line}`
}

/** 任务②：上交 15 份纯净能源，取得燃料徽章 */
export function submitEnergy() {
  const blocked = doctorGuard()
  if (blocked !== null) return blocked
  if (!game.flags.doctorQuest1Done) return '得先把动力回路接上。'
  if (game.flags.doctorQuest2Done) return '燃料舱已经灌满了。'

  const have = countItem(game.inventory, DOCTOR.energyId)
  if (have < DOCTOR.energyCount) {
    return `纯净能源不够：${have} / ${DOCTOR.energyCount}。`
  }
  if (!fitsAfterRemove([{ itemId: DOCTOR.energyId, qty: DOCTOR.energyCount }], DOCTOR.badges[1])) {
    return DOCTOR.fullLine
  }

  removeItem(game.inventory, DOCTOR.energyId, DOCTOR.energyCount)
  advanceTurns(1)
  if (game.dead) return ''

  addItem(game.inventory, DOCTOR.badges[1], 1)
  game.flags.doctorQuest2Done = true
  return '淡蓝色的能源一点点灌进燃料舱。陈博士递来一枚沾着残渍的铜片：「燃料这一环，也过了。」'
}

/** 任务③所需的医疗 / 食物 / 饮品数量 */
export function doctorSupplyCounts() {
  return {
    medicine: countCategory(game.inventory, 'medicine'),
    food: countCategory(game.inventory, 'food'),
    drink: countCategory(game.inventory, 'drink'),
  }
}

/** 任务③：上交医疗 / 食物 / 饮品各 10 份，取得生存徽章 */
export function submitSupplies() {
  const blocked = doctorGuard()
  if (blocked !== null) return blocked
  if (!game.flags.doctorQuest2Done) return '得先把燃料舱灌满，再来谈物资。'
  if (game.flags.doctorQuest3Done) return '物资已经码进舱里了。'

  const counts = doctorSupplyCounts()
  const need = DOCTOR.supply
  if (
    counts.medicine < need.medicine ||
    counts.food < need.food ||
    counts.drink < need.drink
  ) {
    return `物资还差：医疗 ${counts.medicine}/${need.medicine}，食物 ${counts.food}/${need.food}，饮品 ${counts.drink}/${need.drink}。`
  }

  const removals = Object.entries(need).map(([category, qty]) => ({ category, qty }))
  if (!fitsAfterRemove(removals, DOCTOR.badges[2])) return DOCTOR.fullLine

  for (const { category, qty } of removals) consumeCategory(game.inventory, category, qty)
  advanceTurns(1)
  if (game.dead) return ''

  addItem(game.inventory, DOCTOR.badges[2], 1)
  game.flags.doctorQuest3Done = true
  return '医疗、食物、饮品一样样码进舱里。陈博士把一枚用罐头铁皮压成的圆牌放在你手心。「三枚都在了。去航天基地吧，最后一步不在我这里。」'
}

/** 傀儡掉落时背包满的兜底：回发射中心把发电机抱走 */
export function collectGenerator() {
  if (game.dead) return ''
  if (game.location !== GIANT_PUPPET.mapId) return '小核能发电机还在发射中心的残骸里。'
  if (countItem(game.inventory, GIANT_PUPPET.rewardItemId) > 0) return '那台发电机已经在背包里了。'
  if (!game.flags.generatorPending) return '残骸里已经空了。'

  if (addItem(game.inventory, GIANT_PUPPET.rewardItemId, 1) > 0) {
    return '背包已满，你得先腾出一点地方。'
  }
  game.flags.generatorPending = false
  return '你从傀儡胸腔里抱出了那台还在运转的小核能发电机。'
}

/* ===== 航天基地 · 发射中心 ===== */

function rocketGuard() {
  if (game.dead) return ''
  if (game.location !== ROCKET.mapId) return '发射中心在航天基地最深处。'
  if (countDoctorBadges() < ROCKET.badgeIds.length) return ROCKET.lockedLine
  return null
}

/**
 * 火箭四选一：all 带所有人 / solo 独自飞走 / send 让他们走 / stay 留下
 * 前三种直接达成不可继续的好结局，stay 不设结局，可以继续游戏
 */
export function launchRocket(kind) {
  const blocked = rocketGuard()
  if (blocked !== null) return blocked

  if (kind === 'all') {
    const missing = ROCKET.companionFlags.some((flag) => !game.flags[flag])
    if (missing) return '嫣然和露露还没有都在安全屋。火箭上不能少了她们。'
    game.finale = ROCKET.finaleAll
    if (typeof window !== 'undefined') notify(`结局达成 · ${ROCKET.finaleAll}`)
    return '倒计时归零。舱门合上的一瞬间，嫣然和露露都抓住了扶手。火箭穿过云层，把整片废墟甩在脚下。'
  }

  if (kind === 'solo') {
    game.finale = ROCKET.finaleSolo
    if (typeof window !== 'undefined') notify(`结局达成 · ${ROCKET.finaleSolo}`)
    return '你一个人按下发射键。发射台下，嫣然和露露站在原地，直到火光把她们的影子拉得很长。'
  }

  if (kind === 'send') {
    game.finale = ROCKET.finaleSend
    if (typeof window !== 'undefined') notify(`结局达成 · ${ROCKET.finaleSend}`)
    return '陈博士、嫣然和露露走进舱门。你把最后的补给递上去，退后两步，按下了发射键。'
  }

  if (kind === 'stay') {
    return ROCKET.stayedLine
  }

  return ''
}
