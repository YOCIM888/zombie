import {
  DAWN_PROMOTIONS,
  AIRSHIP,
  MAFEI,
  addItem,
  countItem,
  dawnItemId,
  dawnRank,
  getItem,
  identityItemId,
  identityRank,
  npcById,
  questById,
  questLine,
  removeItem,
} from '../../data'
import { game, die, grantIdentity, grantDawnIdentity } from './core.js'
import { globalStats } from '../save'
import { dawnReady } from './dawn.js'
import { palaceReady } from './palace.js'

/* ===== NPC 任务 ===== */

const DAWN_NPC_OWNERS = ['nutritionist', 'mechanic', 'mercenary', 'agronomist']

function questOwnerReady(owner) {
  if (owner === 'mafei') return !game.dead && game.location === MAFEI.mapId
  if (owner === 'alex') return !game.dead && game.location === 'long-beach-harbor'
  if (['schika', 'nubi', 'moran'].includes(owner)) {
    return !game.dead && game.location === AIRSHIP.mapId
  }
  return owner === 'king' || owner === 'queen' ? palaceReady() : dawnReady()
}

function previousQuest(quest) {
  const line = questLine(quest.owner)
  const index = line.findIndex((item) => item.id === quest.id)
  return index > 0 ? line[index - 1] : null
}

export function isQuestDone(id) {
  return game.quests[id]?.status === 'done'
}

export function isQuestActive(id) {
  return game.quests[id]?.status === 'active'
}

/** 击杀进度：接取时记录基准，只统计接取之后的击杀 */
export function questKillProgress(id) {
  const quest = questById(id)
  const target = quest?.require?.kills
  if (!target) return null
  const baseline = Number(game.quests[id]?.baseline) || 0
  return { current: Math.max(0, game.zombieKills - baseline), target }
}

/** 整条任务线的对话门槛：返回空字符串表示可以对话 */
export function questLineLocked(owner) {
  if (owner === 'king') {
    if (game.flags.kingKilled) return '国王艾伦已经不在了。'
    if (identityRank(game.identity) < identityRank('骑士')) {
      return '国王艾伦没有看你。至少需要「骑士」身份，他才愿意开口。'
    }
    return ''
  }

  if (owner === 'queen') {
    if (game.flags.queenKilled) return '皇后米娅已经不在了。'
    if (identityRank(game.identity) < identityRank('骑士')) {
      return '皇后米娅没有看你。至少需要「骑士」身份，王宫的门才会为你打开。'
    }
    if (!isQuestDone('yiyang-5')) {
      return '皇后米娅没有召见你。她只肯见曙光阵地那位首领信得过的人。'
    }
    if (!game.flags.queenLetterDelivered) {
      return game.flags.queenLetter
        ? '皇后米娅看着你手里的信，没有先开口。'
        : '皇后米娅没有召见你。'
    }
    return ''
  }

  if (owner === 'mafei') {
    return game.flags.mafeiKilled ? '马斐已经不在了。' : ''
  }

  if (owner === 'alex') {
    return game.flags.alexKilled ? '亚历克斯船长已经不在了。' : ''
  }

  if (['schika', 'nubi', 'moran'].includes(owner)) {
    if (game.flags.airshipCoupDone) {
      return '飞行船已经换了主人，这位贵族不再交办任务。'
    }
    if (owner === 'schika' && identityRank(game.identity) < identityRank('骑士')) {
      return '席卡只和有爵位的人说话。至少需要「骑士」身份。'
    }
    if (owner === 'moran' && identityRank(game.identity) < identityRank('伯爵')) {
      return '漠然的觐见厅只对伯爵以上开放。'
    }
    return ''
  }

  if (owner === 'yiyang' && game.flags.dawnLeaderKilled) return '羿阳已经不在了。'

  if (DAWN_NPC_OWNERS.includes(owner)) {
    const npc = npcById(owner)
    if (npc && game.flags[npc.deathFlag]) return `${npc.name}已经不在了。`
    if (!game.dawnIdentity) {
      return '哨塔里的人还不认识你。先联系管事加入曙光。'
    }
  }
  return ''
}

/** 单个任务不能接取的原因 */
export function questLockReason(id) {
  const quest = questById(id)
  if (!quest) return '未知任务。'
  const state = game.quests[id]?.status
  if (state === 'done') return '这个任务已经完成。'
  if (state === 'active') return ''

  const lineGate = questLineLocked(quest.owner)
  if (lineGate) return lineGate

  if (game.flags.dawnLeaderKilled && quest.owner === 'queen') {
    return '羿阳已经不在了，皇后不再交办新的事。'
  }

  const previous = previousQuest(quest)
  if (previous && !isQuestDone(previous.id)) {
    return `需要先完成「${previous.name}」。`
  }

  if (quest.require?.dawnIdentity && dawnRank(game.dawnIdentity) < dawnRank(quest.require.dawnIdentity)) {
    return `需要曙光「${quest.require.dawnIdentity}」身份（当前：${game.dawnIdentity ?? '无'}）。`
  }

  return ''
}

export function questStatus(id) {
  const quest = questById(id)
  if (!quest) return 'locked'
  const state = game.quests[id]?.status
  if (state === 'done') return 'done'
  if (state === 'active') return 'active'
  return questLockReason(id) ? 'locked' : 'available'
}

export function acceptQuest(id) {
  const quest = questById(id)
  if (!quest || !questOwnerReady(quest.owner)) return ''
  const reason = questLockReason(id)
  if (reason) return reason

  if (quest.require?.betrayal) {
    game.quests[id] = { status: 'done' }
    die(MAFEI.betrayalReason, '恶魔')
    return ''
  }

  game.quests[id] = { status: 'active', baseline: game.zombieKills }
  return quest.require?.kills
    ? `已接取「${quest.name}」，从现在开始计算击杀。`
    : `已接取「${quest.name}」。`
}

function questClaimBlocker(quest) {
  const state = game.quests[quest.id]
  if (!state || state.status !== 'active') return '这个任务现在不能提交。'
  if (['schika', 'nubi', 'moran'].includes(quest.owner) && game.flags.airshipCoupDone) {
    return '政变之后，这位贵族不再承认这份委托。'
  }

  for (const item of quest.require?.items ?? []) {
    const have = countItem(game.inventory, item.id)
    if (have < item.qty) {
      const name = getItem(item.id)?.name ?? item.id
      return `「${name}」不够：${have}/${item.qty}。`
    }
  }

  if (quest.require?.kills) {
    const progress = questKillProgress(quest.id)
    if (progress.current < progress.target) {
      return `还差 ${progress.target - progress.current} 只行尸。`
    }
  }

  if (quest.require?.boss === 'dawn-leader' && !game.flags.dawnLeaderKilled) {
    return '羿阳还活着。'
  }

  if (quest.require?.npc) {
    const npc = npcById(quest.require.npc)
    if (npc && !game.flags[npc.deathFlag]) return `${npc.name}还活着。`
  }

  if (quest.require?.flag && !game.flags[quest.require.flag]) {
    return quest.require.label ? `还没有完成「${quest.require.label}」。` : '条件还没有达成。'
  }

  return ''
}

/** 在背包副本上模拟扣除与发放，空间不够时整体拒绝 */
function simulateQuestClaim(quest) {
  const copy = game.inventory.map((entry) => (entry ? { ...entry } : null))
  for (const item of quest.require?.items ?? []) {
    if (removeItem(copy, item.id, item.qty) > 0) return false
  }

  const reward = quest.reward ?? {}

  if (reward.identity) {
    const badgeId = identityItemId(reward.identity)
    for (let index = 0; index < copy.length; index += 1) {
      const entry = copy[index]
      if (!entry) continue
      const def = getItem(entry.id)
      if (def?.category === 'identity' && def.faction !== 'dawn') copy[index] = null
    }
    if (!badgeId || addItem(copy, badgeId, 1) > 0) return false
  }

  if (reward.dawnIdentity) {
    const badgeId = dawnItemId(reward.dawnIdentity)
    for (let index = 0; index < copy.length; index += 1) {
      const entry = copy[index]
      if (!entry) continue
      const def = getItem(entry.id)
      if (def?.category === 'identity' && def.faction === 'dawn') copy[index] = null
    }
    if (!badgeId || addItem(copy, badgeId, 1) > 0) return false
  }

  for (const item of reward.items ?? []) {
    if (addItem(copy, item.id, item.qty ?? 1) > 0) return false
  }

  return true
}

function grantQuestRewards(quest) {
  const reward = quest.reward ?? {}
  if (reward.identity) grantIdentity(reward.identity)
  if (reward.dawnIdentity) grantDawnIdentity(reward.dawnIdentity)
  if (reward.coins) game.coins += reward.coins
  if (reward.dawnCoins) game.dawnCoins += reward.dawnCoins
  if (reward.reputation) game.reputation += reward.reputation
  for (const item of reward.items ?? []) addItem(game.inventory, item.id, item.qty ?? 1)
  if (reward.flag && typeof reward.flag === 'object') Object.assign(game.flags, reward.flag)
  if (reward.finale) game.finale = reward.finale
}

function questRewardText(quest) {
  const reward = quest.reward ?? {}
  const parts = []
  if (reward.identity) parts.push(`「${reward.identity}」身份牌`)
  if (reward.dawnIdentity) parts.push(`曙光「${reward.dawnIdentity}」徽章`)
  if (reward.coins) parts.push(`${reward.coins} 末日币`)
  if (reward.dawnCoins) parts.push(`${reward.dawnCoins} 曙光币`)
  if (reward.reputation) parts.push(`${reward.reputation} 声望`)
  for (const item of reward.items ?? []) {
    parts.push(`${getItem(item.id)?.name ?? item.id} ×${item.qty ?? 1}`)
  }
  if (reward.finale) parts.push(`结局「${reward.finale}」`)
  return parts.join('、')
}

export function claimQuest(id) {
  const quest = questById(id)
  if (!quest || !questOwnerReady(quest.owner)) return ''

  const blocker = questClaimBlocker(quest)
  if (blocker) return blocker
  if (!simulateQuestClaim(quest)) return '背包空间不足，先腾出位置再来领取。'

  for (const item of quest.require?.items ?? []) {
    removeItem(game.inventory, item.id, item.qty)
  }
  grantQuestRewards(quest)
  game.quests[id] = { status: 'done' }

  const rewards = questRewardText(quest)
  const note = quest.reward?.note ? `\n\n${quest.reward.note}` : ''
  return `任务「${quest.name}」完成。获得 ${rewards}。${note}`
}

/** 皇后线前置：把羿阳托付的信交给皇后 */
export function deliverQueenLetter() {
  if (!palaceReady()) return ''
  if (!game.flags.queenLetter) return '你手里没有要交给皇后的信。'
  game.flags.queenLetter = false
  game.flags.queenLetterDelivered = true
  return '皇后米娅接过信，看到信封上的字迹时，手停在了半空。\n\n「这是……哥哥的字。」她的声音很轻，「三年了，他才肯让人送信来。」\n\n她把信折好，按在胸口，没有哭。\n\n「既然是他信得过的人，那你也算我信得过的人。」她抬起头，「替我办几件事。」'
}

/**
 * 管事处晋升状态：击杀口径与晋升链的唯一来源。
 * 击杀数使用 globalStats.totalKills（跨周目累计，与「死神来了」同口径）。
 */
export function dawnPromotionState() {
  const kills = Math.max(0, Number(globalStats.totalKills) || 0)
  if (!game.dawnIdentity) return { state: 'not-joined', kills }
  const promotion = DAWN_PROMOTIONS.find((item) => item.from === game.dawnIdentity)
  if (promotion) {
    return {
      state: kills >= promotion.kills ? 'ready' : 'locked',
      promotion,
      kills,
      left: Math.max(0, promotion.kills - kills),
    }
  }
  const rank = dawnRank(game.dawnIdentity)
  if (rank === dawnRank('指挥')) return { state: 'quest-only', kills }
  if (rank === dawnRank('总督')) {
    if (game.flags.warPrepNewOrder) {
      // 米娅已在马斐线死亡：名册最后一页无人交付
      if (game.flags.queenKilled) return { state: 'leader-mia-dead', kills }
      // 羿阳已死、米娅还在：这一局徽章无处可寻
      if (game.flags.dawnLeaderKilled) return { state: 'leader-no-badge', kills }
      if (game.dawnIdentity !== '领袖') return { state: 'leader-story', kills }
    }
    return { state: 'leader-locked', kills }
  }
  return { state: 'max', kills }
}

/** 管事处的晋升：按全局累计击杀授予队员 / 队长 / 指挥 */
export function promoteDawnIdentity() {
  if (!dawnReady()) return ''
  const info = dawnPromotionState()

  if (info.state === 'not-joined') return '你还没有加入曙光，先去联系管事登记名册。'
  if (info.state === 'quest-only') {
    return '管事关上名册：总督只能由首领羿阳亲自授予。'
  }
  if (info.state === 'leader-locked') {
    return '管事翻到名册最后一页又合上了：领袖徽章暂不可获取，还没有该给的人。'
  }
  if (info.state === 'leader-story') {
    return '管事把名册最后一页留给你：领袖徽章在曙光「羿阳的妹妹」那里，由米娅亲手交付。'
  }
  if (info.state === 'leader-mia-dead') {
    return '管事翻到名册最后一页又合上了：米娅已经不在了，这一页没有人能签字。'
  }
  if (info.state === 'leader-no-badge') {
    return '管事翻到名册最后一页，又合上了：羿阳已经不在了，这一局没有人能把领袖徽章交出来。'
  }
  if (info.state === 'max') return '你已经是曙光「领袖」，没有更高的位置。'
  if (info.state === 'locked') {
    return `管事翻了翻名册：晋升${info.promotion.to}需要累计击杀 ${info.promotion.kills} 只行尸（当前 ${info.kills}）。`
  }

  if (!grantDawnIdentity(info.promotion.to)) return '背包已满，晋升徽章无处安放。'
  return `管事在名册上划掉旧名字：你晋升为曙光「${info.promotion.to}」。`
}

/** 新秩序后由米娅交付的领袖徽章文案 */
export const MIA_LEADER_TEXT =
  '米娅已经脱掉了那身华丽的凤袍，此刻哥哥已经是她唯一的亲人，羿阳摊了摊手，将领袖徽章交给你，或许米娅需要时间来消化丈夫已经在战乱中过世的事实。'

/** 羿阳已被马斐线杀死：米娅仍在，但徽章无人交付 */
export const MIA_LEADER_TEXT_YIYANG_DEAD =
  '米娅已经脱掉了那身华丽的凤袍，此刻哥哥已经是她唯一的亲人。可哨塔顶层已经空了，羿阳不在了，那枚领袖徽章也随着他一起留在了过去。米娅只是站在名册旁，久久地看着最后一页，没有再开口。'

/** 曙光「羿阳的妹妹」：新秩序后领取第 5 档领袖徽章，不可重复领取 */
export function claimMiaLeader() {
  if (!game.flags.warPrepNewOrder) return ''
  if (!dawnReady()) return ''
  // 皇后（米娅）已被马斐线杀死，无人交付徽章
  if (game.flags.queenKilled) return ''
  if (game.dawnIdentity === '领袖') {
    game.flags.miaLeaderClaimed = true
    return '你已经是曙光「领袖」，徽章就在你身上。'
  }
  if (game.flags.miaLeaderClaimed) {
    return '领袖徽章已经交到你手里了。名册最后一页，不会再写第二个名字。'
  }
  // 羿阳已死：徽章已无处可寻，翻过一次名册后不再重复提示
  if (game.flags.dawnLeaderKilled) {
    if (game.flags.miaLeaderMissingBadge) {
      return '名册的最后一页已经翻过了：羿阳不在，领袖徽章无处可寻。'
    }
    game.flags.miaLeaderMissingBadge = true
    return `${MIA_LEADER_TEXT_YIYANG_DEAD}\n\n你合上名册。羿阳不在，属于领袖的那枚徽章这一局无处可寻。`
  }
  if (!grantDawnIdentity('领袖')) return '背包已满，领袖徽章无处安放。'
  game.flags.miaLeaderClaimed = true
  return `${MIA_LEADER_TEXT}\n\n你接过领袖徽章。曙光名册的最后一页，终于有了名字。`
}
