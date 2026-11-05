// 手动回合制战斗：近战连击、远程闪避、丧尸技能、逃跑与击杀掉落
import { reactive } from 'vue'
import {
  AIRSHIP,
  CLEANLINESS_MAX,
  COMPANIONS,
  BANKER,
  DAWN_FLEE_CHANCE,
  DAWN_LEADER,
  DAWN_ZOMBIE,
  DEV_SHOP,
  GIANT_PUPPET,
  HARBOR_MUTINY,
  MA_SAN,
  MERMAID,
  SEA_LOOT,
  SEA_OXYGEN_BLESSED,
  SEA_OXYGEN_COST,
  SEA_OXYGEN_DEFAULT,
  UTOPIA_TRAINING_BY_KIND,
  pickSeaCreature,
  UNARMED,
  YANRAN,
  addItem,
  cleanlinessJamChance,
  cleanlinessMultiplier,
  commissionForDay,
  getItem,
  identityRank,
  isFistTalentWeapon,
  mafeiQuestForTarget,
  mayorForDay,
  npcById,
  pickDawnLoot,
  pickZombieLoot,
  talentBonus,
  talentEffects,
  worldBossById,
  zombieById,
} from '../data'
import {
  advanceTurns,
  activeGuild,
  applyStatChanges,
  consumeMeleeDurability,
  consumeRangedCleanliness,
  cooldownLeft,
  devState,
  drownPlayer,
  game,
  isTalentActive,
  questStatus,
  recordGuildKill,
  statCap,
  useItem,
  waiveLoanInterest,
  notify,
} from './store'
import { playWeaponSfx } from './sfx'
import { unlockAchievement } from './save'

/** 丧尸技能数值：参考一代，按二代 100 血 / 手动回合制缩放 */
const ABILITY = {
  tripSkip: 0.3,
  blindMiss: 0.5,
  leapMult: 0.6,
  cloakCounter: 0.5,
  armorMult: 0.5,
  corrodeLoss: 5,
  acidMin: 8,
  acidMax: 12,
  cloakAmbushRate: 0.4,
  cloakAmbushMult: 0.8,
  explosiveMult: 2,
  impaleMult: 0.6,
  screechStamina: 5,
  summonDamage: 8,
  frozenMult: 0.5,
}

export const battle = reactive({
  active: false,
  finished: false,
  result: '',
  round: 0,
  kind: 'zombie',
  mapId: null,
  npcId: null,
  questId: null,
  mode: 'melee',
  summary: '',
  log: [],
  zombie: { ...DAWN_ZOMBIE, maxHp: DAWN_ZOMBIE.hp, abilities: [], dodge: 0 },
  tripped: false,
  blinded: false,
  frozen: false,
  summoned: false,
  coupStage: 0,
  coupNext: false,
  mutinyStage: 0,
  mutinyNext: false,
  tenacityPending: false,
  tenacityEmpower: false,
  magicStacks: 0,
  oxygen: 0,
  oxygenMax: SEA_OXYGEN_DEFAULT,
  mermaidBlessed: false,
})

let logSeq = 0

function pushLog(text) {
  logSeq += 1
  battle.log.unshift({ id: logSeq, text })
  if (battle.log.length > 16) battle.log.pop()
}

export function resetBattle(enemy = DAWN_ZOMBIE, kind = 'zombie', mapId = null) {
  logSeq = 0
  battle.active = false
  battle.finished = false
  battle.result = ''
  battle.round = 0
  battle.kind = kind
  battle.mapId = mapId
  battle.npcId = null
  battle.questId = null
  battle.mode = 'melee'
  battle.summary = ''
  battle.log = []
  battle.tripped = false
  battle.blinded = false
  battle.frozen = false
  battle.summoned = false
  battle.coupStage = 0
  battle.coupNext = false
  battle.mutinyStage = 0
  battle.mutinyNext = false
  battle.tenacityPending = false
  battle.tenacityEmpower = false
  battle.magicStacks = 0
  battle.oxygen = 0
  battle.oxygenMax = SEA_OXYGEN_DEFAULT
  battle.mermaidBlessed = false
  battle.zombie = {
    ...enemy,
    abilities: Array.isArray(enemy.abilities) ? [...enemy.abilities] : [],
    dodge: Number(enemy.dodge) || 0,
    maxHp: Number.isFinite(enemy.maxHp) ? enemy.maxHp : enemy.hp,
  }
}

/** 敌人血量下限：行长这类对手会锁血，不会被打死 */
function enemyFloor() {
  return Number.isFinite(battle.zombie.hpFloor) ? battle.zombie.hpFloor : 0
}

/** 是否已经打到认输/死亡的血量下限 */
function enemyDefeated() {
  return battle.zombie.hp <= enemyFloor()
}

function damageEnemy(amount) {
  battle.zombie.hp = Math.max(enemyFloor(), battle.zombie.hp - Math.max(1, amount))
  if (battle.zombie.isWorldBoss && battle.zombie.bossId) {
    game.flags.worldBossHp = {
      ...(game.flags.worldBossHp ?? {}),
      [battle.zombie.bossId]: battle.zombie.hp,
    }
  }
}

/**
 * 清理丧尸：先消耗 1 回合（正常衰减），进入战斗
 * @returns 提示文本（没有提示时为空字符串）
 */
export function startDawnCombat() {
  if (game.dead || game.location !== 'dawn-post') return ''
  if (battle.active) return ''

  advanceTurns(1)
  if (game.dead) return ''

  resetBattle()
  battle.active = true
  pushLog('你踩过碎砖，一只普通行尸从车后站了起来。')
  return ''
}

/** 野外遭遇：由地图面板在探索遇到丧尸后调用；kind = 'npc' 时用于特殊敌人 */
export function startFieldCombat(enemy, mapId, kind = 'field') {
  if (game.dead || battle.active) return false
  if (!enemy || !mapId || game.location !== mapId) return false

  resetBattle(enemy, kind, mapId)
  battle.active = true
  pushLog(`${enemy.name}从阴影里扑了出来。`)
  return true
}

/**
 * 代理城主切磋：与当值会长打一场，双方都在 1 点生命时收手。
 * 每天一次，与面谈共用次数；失败不会死亡。
 */
export function startMayorSpar() {
  if (game.dead || battle.active) return ''
  if (game.location !== 'utopia-city') return '切磋在乌托邦城的市政厅。'
  if (Number(game.flags.mayorVisitDay) === game.day) return '今天已经拜访过代理城主了。'
  if ((Number(game.stats.hp) || 0) <= 1) return '你只剩一口气，先去处理伤口再来切磋。'

  const mayor = mayorForDay(game.day)
  if (!mayor) return ''
  const npc = npcById(`guild-leader-${mayor.id}`)
  if (!npc) return ''

  const actionDay = game.day
  advanceTurns(1)
  if (game.dead) return ''

  game.flags.mayorVisitDay = actionDay
  game.flags.mayorLastOption = 'spar'
  resetBattle(npc, 'spar', 'utopia-city')
  battle.zombie.hpFloor = 1
  battle.active = true
  pushLog(`${npc.name}把外套搭在椅背上，走到市政厅的空地上。`)
  pushLog('“点到为止。”')
  return ''
}

/**
 * 世界BOSS：尸化魔龙 / 火龙 / 海妖 / 妖精
 * 5 万生命，剩余血量写入存档；随时可以逃跑；击杀掉落对应宝石。
 */
export function startWorldBossBattle(bossId) {
  if (game.dead || battle.active) return ''
  if (game.location !== 'utopia-city') return '世界BOSS的裂缝在乌托邦城。'

  const boss = worldBossById(bossId)
  if (!boss) return ''
  if (game.flags.worldBossDefeated?.[boss.id]) return `${boss.name}已经倒下了。`
  if (!game.inventory.some((entry) => !entry)) return '背包已满，至少腾出一格再来挑战。'

  const saved = Number(game.flags.worldBossHp?.[boss.id])
  const hp = Number.isFinite(saved) && saved > 0 ? Math.min(boss.hp, saved) : boss.hp
  const enemy = {
    id: `world-boss-${boss.id}`,
    name: boss.name,
    hp,
    maxHp: boss.hp,
    attack: Math.round((boss.attackMin + boss.attackMax) / 2),
    attackMin: boss.attackMin,
    attackMax: boss.attackMax,
    infection: 0,
    dodge: 0,
    abilities: [],
    image: boss.image,
    description: boss.description,
    isWorldBoss: true,
    bossId: boss.id,
    gemId: boss.gemId,
  }

  resetBattle(enemy, 'world-boss', 'utopia-city')
  battle.active = true
  pushLog(`${boss.name}从市政厅地下的裂缝里爬了出来。`)
  pushLog(`生命 ${hp} / ${boss.hp}。它记得你造成的每一道伤。`)
  return ''
}

/** 国王任务六：在曙光阵地刺杀首领羿阳 */
export function startLeaderCombat() {
  if (game.dead || game.location !== 'dawn-post') return ''
  if (battle.active) return ''
  if (game.flags.dawnLeaderKilled) return '羿阳已经不在了。'
  if (questStatus('king-6') !== 'active') return '你还没有接到要杀他的命令。'

  advanceTurns(1)
  if (game.dead) return ''

  resetBattle(DAWN_LEADER, 'leader')
  battle.active = true
  pushLog('哨塔顶层的门没有锁。羿阳背对着你，手按在刀柄上。')
  return ''
}

/**
 * 都城银行行长：化债战斗
 * 行长生命 250、攻击 30，但血量锁在 1；把他逼到 1 点血即认账
 */
export function startBankerCombat() {
  if (game.dead || battle.active) return ''
  if (!game.loan) return BANKER.noLoanLine
  if (game.loan.interestWaived) return BANKER.waivedLine

  advanceTurns(1)
  if (game.dead) return ''

  const npc = npcById(BANKER.npcId)
  if (!npc) return ''
  resetBattle({ ...npc, hpFloor: BANKER.hpFloor }, 'banker', npc.mapId)
  battle.active = true
  pushLog(`${npc.name}合上账本，从柜台后走了出来。你听见他指节按得咔咔作响。`)
  return ''
}

/**
 * 末日飞行船：努比任务「货舱异响」
 * 接取 nubi-2 后可下到货舱清理一只铁甲尸
 */
export function startAirshipCargoBattle() {
  if (game.dead || battle.active) return ''
  if (game.location !== AIRSHIP.mapId) return '货舱在末日飞行船上。'
  if (game.flags.airshipCargoCleared) return AIRSHIP.cargo.alreadyLine
  if (questStatus('nubi-2') !== 'active') return AIRSHIP.cargo.lockedLine

  const base = zombieById('armored')
  if (!base) return ''
  const enemy = {
    ...base,
    name: AIRSHIP.cargo.enemyName,
    description: AIRSHIP.cargo.enemyDescription,
  }

  advanceTurns(1)
  if (game.dead) return ''

  resetBattle(enemy, 'airship-cargo', AIRSHIP.mapId)
  battle.active = true
  pushLog(AIRSHIP.cargo.intro)
  return ''
}

/**
 * 末日飞行船：居民战斗委托
 * 每天一次，无衰减消耗 1 回合，目标从全部丧尸中按天抽取
 */
export function startAirshipCommissionBattle() {
  if (game.dead || battle.active) return ''
  if (game.location !== AIRSHIP.mapId) return '居民委托在末日飞行船上。'
  const commission = AIRSHIP.commission.battle
  if (cooldownLeft(commission.cooldownKey, commission.cooldownDays) > 0) {
    return commission.cooldownLine
  }

  const target = commissionForDay(game.day).zombie
  if (!target) return ''

  const actionDay = game.day
  advanceTurns(commission.turns, { decay: false })
  if (game.dead) return ''

  game.cooldowns[commission.cooldownKey] = actionDay
  resetBattle(target, 'airship-commission', AIRSHIP.mapId)
  battle.active = true
  pushLog(commission.desc)
  pushLog(`${target.name}从居民区的门后走了出来。`)
  return ''
}

/**
 * 末日飞行船：高台政变
 * 需要公爵身份、声望 60，连续击败三位贵族；中途不回复
 */
export function startAirshipCoupBattle() {
  if (game.dead || battle.active) return ''
  if (game.location !== AIRSHIP.mapId) return '高台在末日飞行船上。'
  if (game.flags.airshipCoupDone) return AIRSHIP.coup.doneLine
  if (identityRank(game.identity) < AIRSHIP.coup.rank) return AIRSHIP.coup.rankLine
  if (game.reputation < AIRSHIP.coup.reputation) return AIRSHIP.coup.reputationLine

  advanceTurns(1)
  if (game.dead) return ''

  game.flags.airshipCoupStep = 0
  game.flags.airshipCoupDone = false
  if (!startCoupStage(0)) return ''
  return ''
}

/** 按顺序开始第 index 场政变战斗 */
function startCoupStage(index) {
  const coup = AIRSHIP.coup
  const npc = npcById(coup.enemyIds[index])
  if (!npc) return false

  resetBattle(npc, 'airship-coup', AIRSHIP.mapId)
  battle.coupStage = index
  battle.coupNext = false
  battle.active = true
  if (index === 0) {
    pushLog(coup.startLine)
  } else {
    pushLog(`高台下没有人鼓掌。${npc.name}已经站到了你的面前。`)
  }
  pushLog(npc.description)
  return true
}

/** 战胜一位对手后，无缝进入下一场 */
export function continueAirshipCoup() {
  if (game.dead) return false
  if (game.location !== AIRSHIP.mapId) return false
  if (game.flags.airshipCoupDone) return false
  const nextIndex = Number(game.flags.airshipCoupStep) || 0
  if (nextIndex <= 0 || nextIndex >= AIRSHIP.coup.enemyIds.length) return false
  return startCoupStage(nextIndex)
}

/* ===== 长滩海港 · 巨型邮轮：杀害船长 ===== */

function harborCrewEnemy(index) {
  const { crewHpMin, crewHpMax, crewAttackMin, crewAttackMax } = HARBOR_MUTINY
  return {
    id: `harbor-crew-${index + 1}`,
    name: HARBOR_MUTINY.crewName,
    hp: crewHpMin + Math.floor(Math.random() * (crewHpMax - crewHpMin + 1)),
    attack: crewAttackMin + Math.floor(Math.random() * (crewAttackMax - crewAttackMin + 1)),
    infection: 0,
    dodge: 0,
    abilities: [],
    image: HARBOR_MUTINY.crewImage,
    description: HARBOR_MUTINY.crewDescription,
  }
}

function startMutinyStage(index) {
  const enemy =
    index < HARBOR_MUTINY.crewCount
      ? harborCrewEnemy(index)
      : npcById(HARBOR_MUTINY.captainId)
  if (!enemy) return false

  resetBattle(enemy, 'mutiny', HARBOR_MUTINY.mapId)
  battle.mutinyStage = index
  battle.mutinyNext = false
  battle.active = true

  if (index === 0) {
    pushLog(HARBOR_MUTINY.startLine)
  } else if (index < HARBOR_MUTINY.crewCount) {
    pushLog(`第 ${index + 1} 名${HARBOR_MUTINY.crewName}从货舱后面走了出来。`)
  } else {
    pushLog('最后一名船员倒下了。亚历克斯船长站在驾驶台前，手里握着那把旧拆信刀。')
  }
  pushLog(enemy.description)
  return true
}

/** 巨型邮轮：杀害船长，连续十轮死斗；中途无法逃跑 */
export function startHarborMutiny() {
  if (game.dead || battle.active) return ''
  if (game.location !== HARBOR_MUTINY.mapId) return '巨型邮轮停在长滩海港。'
  if (game.flags.alexKilled) return '亚历克斯船长已经不在了。'

  advanceTurns(1)
  if (game.dead) return ''

  if (!startMutinyStage(0)) return ''
  return ''
}

/** 战胜一名死士后继续下一轮 */
export function continueHarborMutiny() {
  if (game.dead || battle.active) return false
  const next = battle.mutinyStage + 1
  if (next >= HARBOR_MUTINY.crewCount + 1) return false
  return startMutinyStage(next)
}

/* ===== 长滩海港 · 潜入深海 ===== */

/** 下潜一次：按危险等级抽取海洋生物，并重置本次氧气 */
export function startSeaDive() {
  if (game.dead || battle.active) return ''
  if (game.location !== HARBOR_MUTINY.mapId) return '潜水点在长滩海港。'

  advanceTurns(1)
  if (game.dead) return ''

  const enemy = pickSeaCreature()
  const blessed = (Number(game.flags.mermaidStage) || 0) >= MERMAID.stages.length

  resetBattle(enemy, 'deep-sea', HARBOR_MUTINY.mapId)
  battle.oxygenMax = blessed ? SEA_OXYGEN_BLESSED : SEA_OXYGEN_DEFAULT
  battle.oxygen = battle.oxygenMax
  battle.mermaidBlessed = blessed
  battle.active = true

  pushLog('你从邮轮残骸边翻下水，冰冷的海水没过胸口。')
  if (blessed) pushLog('人鱼的祝福护住了你的肺，氧气上限提升至 200。')
  pushLog(`${enemy.name}从暗处游了出来。`)
  return ''
}

/**
 * 马斐委托：刺杀指定 NPC
 * 需要对应委托处于进行中、目标还活着，并且玩家就在目标所在地
 */
export function startAssassination(npcId) {
  if (game.dead || battle.active) return ''
  const npc = npcById(npcId)
  if (!npc) return ''
  if (game.location !== npc.mapId) return '你不在这里。'
  if (game.flags[npc.deathFlag]) return `${npc.name}已经不在了。`

  const quest = mafeiQuestForTarget(npcId)
  if (!quest || questStatus(quest.id) !== 'active') return '你还没有接到这条委托。'

  advanceTurns(1)
  if (game.dead) return ''

  resetBattle(npc, 'assassination', npc.mapId)
  battle.npcId = npcId
  battle.questId = quest.id
  battle.active = true
  pushLog(`你走近${npc.name}。对方似乎察觉到了什么。`)
  return ''
}

/** 当前近战武器（未装备时为拳头） */
function currentMelee() {
  const equipped = game.equipment.melee
  const def = equipped ? getItem(equipped.id) : null
  return {
    def,
    weapon: def?.weapon ?? UNARMED.weapon,
  }
}

function hasAbility(key) {
  return battle.zombie.abilities.includes(key)
}

/** 当前启用天赋的实际效果，未启用返回空对象 */
function activeTalentEffects(kind) {
  return isTalentActive(kind) ? talentEffects(kind, game.talents[kind] || 0) : {}
}

/** 背包里是否有某件宝石（宝石放在背包内即被动生效） */
function hasGem(itemId) {
  return game.inventory.some((entry) => entry?.id === itemId)
}

/** 魔化宝石：每层提供 5% 临时暴击率 */
function magicCritBonus() {
  return hasGem('magic-gem') ? battle.magicStacks * 0.05 : 0
}

/** 焚血宝石：生命低于 80% / 50% / 20% 时的伤害倍率 */
function bloodGemMultiplier() {
  if (!hasGem('blood-gem')) return 1
  const ratio = (Number(game.stats.hp) || 0) / statCap('hp')
  if (ratio < 0.2) return 1.4
  if (ratio < 0.5) return 1.25
  if (ratio < 0.8) return 1.1
  return 1
}

/** 魔化层数结算：本次攻击出现过暴击就清空，否则叠加一层 */
function updateMagicStacks(critted) {
  if (!hasGem('magic-gem')) return
  if (critted) {
    if (battle.magicStacks > 0) {
      pushLog(`暴击撕开了魔化，${battle.magicStacks} 层全部清空。`)
    }
    battle.magicStacks = 0
    return
  }
  battle.magicStacks = Math.min(50, battle.magicStacks + 1)
  pushLog(`魔化 +1 层：暴击率临时 +5%（当前 ${battle.magicStacks} 层）。`)
}

/** 世界BOSS的攻击在 40-60 之间浮动 */
function enemyAttackValue() {
  const zombie = battle.zombie
  const min = Number(zombie.attackMin)
  const max = Number(zombie.attackMax)
  if (Number.isFinite(min) && Number.isFinite(max) && max >= min) {
    return min + Math.floor(Math.random() * (max - min + 1))
  }
  return Number(zombie.attack) || 0
}

/**
 * 敌方伤害结算：守护宝石全伤害减免 10%，坚毅宝石首次致死伤害留 1 点生命；
 * 装备指定近战且启用格挡天赋时，再按格挡档位减伤。
 */
function blockIncomingDamage(amount) {
  let value = amount
  if (battle.kind === 'spar') {
    const hp = Number(game.stats.hp) || 0
    if (hp <= 1) return 0
    if (hasGem('guardian-gem')) {
      value = Math.max(1, Math.round(value * 0.8))
    }
    return Math.max(1, Math.min(value, hp - 1))
  }
  if (hasGem('guardian-gem')) {
    value = Math.max(1, Math.round(value * 0.8))
  }
  if (value > 0 && hasGem('tenacity-gem') && !battle.tenacityPending) {
    const hp = Number(game.stats.hp) || 0
    if (value >= hp) {
      battle.tenacityPending = true
      battle.tenacityEmpower = true
      pushLog('坚毅宝石裂开一道光，你撑住了最后一口气。下一次攻击伤害翻倍。')
      value = Math.max(0, hp - 1)
    }
  }
  if (value <= 0) return 0
  if (!isTalentActive('block')) return value
  const effects = talentEffects('block', game.talents.block || 0)
  const weaponId = game.equipment.melee?.id
  if (!weaponId || !UTOPIA_TRAINING_BY_KIND.block.weaponIds.includes(weaponId)) {
    return value
  }
  if (Math.random() >= (effects.blockChance ?? 0)) return value
  const reduced = Math.max(1, Math.round(value * (1 - (effects.blockReduction ?? 0))))
  pushLog(`你横起武器格挡，伤害 ${value} → ${reduced}。`)
  return reduced
}

/** 深海近战每次点击扣氧；海洋宝石让消耗减半；返回本次是否扣到 0（仍允许这一击结算） */
function consumeSeaOxygen() {
  if (battle.kind !== 'deep-sea' || devState.lockOxygen) return false
  const cost = hasGem('ocean-gem')
    ? Math.max(1, Math.ceil(SEA_OXYGEN_COST / 2))
    : SEA_OXYGEN_COST
  battle.oxygen = Math.max(0, battle.oxygen - cost)
  return battle.oxygen <= 0
}

/** 这一击结算后若氧气归零，触发溺水死亡 */
function checkDrowning(pending) {
  if (!pending || game.dead) return
  drownPlayer()
  battle.active = false
  battle.finished = true
  battle.result = 'dead'
  battle.summary = '氧气耗尽。你向海面挣扎，但四肢已经不听使唤。'
  pushLog(battle.summary)
}

/** 绊倒 / 致盲：返回 true 表示这一击被跳过 */
function attackBlocked() {
  if (battle.tripped) {
    battle.tripped = false
    if (Math.random() < ABILITY.tripSkip) {
      pushLog('你被绊了个踉跄，灰头土脸地爬起来，没能出手。')
      return true
    }
    pushLog('你挣开缠住双腿的手，稳住了身形。')
  }
  if (battle.blinded) {
    battle.blinded = false
    if (Math.random() < ABILITY.blindMiss) {
      pushLog('你的视线被血糊住，这一下打偏了。')
      return true
    }
  }
  return false
}

/** 丧尸闪避后的反扑：跳跃尸借势撞击，幽灵潜行尸从背后偷袭 */
function counterOnDodge() {
  if (hasAbility('leap')) {
    const damage = blockIncomingDamage(
      Math.max(1, Math.round(battle.zombie.attack * ABILITY.leapMult)),
    )
    applyStatChanges({ hp: -damage })
    pushLog(`跳跃尸借势反扑，把你撞退了两步：生命 -${damage}。`)
  }
  if (hasAbility('cloak')) {
    const damage = blockIncomingDamage(
      Math.max(1, Math.round(battle.zombie.attack * ABILITY.cloakCounter)),
    )
    applyStatChanges({ hp: -damage })
    pushLog(`幽灵潜行尸遁入暗影，从背后划了一刀：生命 -${damage}。`)
  }
  if (game.dead) markPlayerDead()
}

function deathThroes() {
  const zombie = battle.zombie
  if (hasAbility('selfDestruct')) {
    const damage = blockIncomingDamage(zombie.attack)
    applyStatChanges({ hp: -damage })
    pushLog(`${zombie.name}的尸体炸开了，冲击波把你掀翻：生命 -${damage}。`)
  }
  if (hasAbility('explosive')) {
    const damage = blockIncomingDamage(Math.round(zombie.attack * ABILITY.explosiveMult))
    applyStatChanges({ hp: -damage })
    pushLog(`爆裂尸的尸体猛然炸开，碎片四溅：生命 -${damage}。`)
  }
  if (game.dead) {
    markPlayerDead()
    return true
  }
  return false
}

/** 连击：每一击独立判定，连击命中后还能继续触发下一次连击 */
export function meleeAttack() {
  if (!battle.active || game.dead) return
  battle.mode = 'melee'
  playWeaponSfx(currentMelee().def)
  const drowning = consumeSeaOxygen()
  const seaTrident = battle.kind === 'deep-sea' && currentMelee().def?.id === 'trident'
  if (seaTrident) pushLog('三叉戟-海歌在水中低鸣，对海洋生物伤害 +50%。')

  if (attackBlocked()) {
    zombieTurn()
    checkDrowning(drowning)
    return
  }

  if (Math.random() < battle.zombie.dodge) {
    pushLog(`${battle.zombie.name}闪开了你的攻击。`)
    counterOnDodge()
    if (game.dead) return
    zombieTurn()
    checkDrowning(drowning)
    return
  }

  let hits = 0
  let total = 0
  let crits = 0
  let broken = null
  let loops = 0
  const armored = hasAbility('armor')
  const frozen = battle.frozen
  const guild = activeGuild()
  const initialMelee = currentMelee().def
  const drawTalent = activeTalentEffects('draw')
  const drawWeapon =
    initialMelee && UTOPIA_TRAINING_BY_KIND.draw.weaponIds.includes(initialMelee.id)
  const swordTalent = activeTalentEffects('sword')
  const swordWeapon =
    initialMelee && UTOPIA_TRAINING_BY_KIND.sword.weaponIds.includes(initialMelee.id)
  const swordExecute =
    swordWeapon && Math.random() < (swordTalent.executeChance ?? 0)
  if (frozen) battle.frozen = false

  while (loops < 500) {
    loops += 1
    const { def, weapon } = currentMelee()
    const arena =
      isFistTalentWeapon(game.equipment.melee) && isTalentActive('arena')
        ? talentEffects('arena', game.talents.arena)
        : {}
    const knight = guild?.id === 'knight' && def?.id === 'knight-sword'
    const warrior = guild?.id === 'warrior' && guild.weaponIds?.includes(def?.id)
    const critChance = Math.min(
      1,
      (weapon.crit ?? 0) + (knight ? (guild.critBonus ?? 0) : 0) + magicCritBonus(),
    )
    const crit = Math.random() < critChance && (weapon.critDamage ?? 0) >= 1
    const critDamage =
      (weapon.critDamage ?? 0) + (knight ? (guild.critDamageBonus ?? 0) : 0)
    const attack = (weapon.attack ?? 0) + (arena.damage ?? 0)
    const seaBonus = battle.kind === 'deep-sea' && def?.id === 'trident' ? 1.5 : 1
    const guildBonus = warrior || knight ? (guild.damageBonus ?? 0) : 0
    let damage = Math.max(
      1,
      Math.round(attack * (crit ? critDamage : 1) * seaBonus),
    )
    if (armored) damage = Math.max(1, Math.floor(damage * ABILITY.armorMult))
    if (frozen && hits === 0) damage = Math.max(1, Math.floor(damage * ABILITY.frozenMult))
    if (guildBonus) damage += guildBonus
    if (hasGem('guardian-gem') && def?.id === 'knight-sword') damage += 40
    if (hasGem('ocean-gem') && battle.kind === 'deep-sea') damage += 20
    const bloodMult = bloodGemMultiplier()
    if (bloodMult > 1) damage = Math.round(damage * bloodMult)
    if (swordExecute && hits === 0) {
      damage = battle.zombie.isWorldBoss
        ? Math.min(500, battle.zombie.hp)
        : battle.zombie.hp
      pushLog(
        battle.zombie.isWorldBoss
          ? '致命一击被厚重的尸壳挡住，只撕开 500 点伤口。'
          : '致命一击：剑尖找到了那一瞬间的空门。',
      )
    }
    if (battle.tenacityEmpower) {
      damage = Math.max(1, damage * 2)
      battle.tenacityEmpower = false
      pushLog('坚毅宝石的余烬涌入手臂，这一击伤害翻倍。')
    }
    if (devState.oneHitKill) damage = battle.zombie.hp

    hits += 1
    total += damage
    if (crit) crits += 1
    damageEnemy(damage)

    const result = consumeMeleeDurability()
    if (enemyDefeated()) break
    if (result.broken) {
      broken = result.name
      break
    }
    const meleeTalent = isTalentActive('melee')
      ? talentBonus('melee', game.talents.melee)
      : 0
    const knightCombo = knight ? (guild.comboBonus ?? 0) : 0
    const comboChance = Math.min(
      1,
      (weapon.combo ?? 0) + meleeTalent + (arena.combo ?? 0) + knightCombo,
    )
    if (Math.random() >= comboChance) break
  }

  if (armored) pushLog('铁皮挡住了大半力道，你的伤害被压了下去。')
  if (frozen) pushLog('寒气还没散，第一击软绵绵的。')
  if (hits === 1) {
    pushLog(`${crits ? '你挥出一记暴击' : '你挥出一击'}，造成 ${total} 点伤害。`)
  } else {
    pushLog(`你连续挥出 ${hits} 击${crits ? `（暴击 ${crits} 次）` : ''}，共 ${total} 点伤害。`)
  }
  if (broken) pushLog(`${broken}在最后一次挥砍中断成了两截。`)
  updateMagicStacks(crits > 0)
  companionAssist()

  if (
    !enemyDefeated() &&
    drawWeapon &&
    !broken &&
    Math.random() < (drawTalent.cutChance ?? 0)
  ) {
    let cut = Math.max(1, Math.ceil(battle.zombie.maxHp * 0.2))
    if (battle.zombie.isWorldBoss) cut = Math.min(cut, 200)
    damageEnemy(cut)
    pushLog(`拔刀斩触发切割，追加 ${cut} 点真实伤害。`)
  }

  if (enemyDefeated()) {
    winBattle()
    return
  }
  zombieTurn()
  checkDrowning(drowning)
}

/**
 * 远程攻击：每一枪消耗清洁度；清洁度越低伤害越低、越容易卡壳
 * 命中后按远程武器的闪避率躲开反击
 */
export function rangedAttack() {
  if (!battle.active || game.dead) return
  if (battle.kind === 'deep-sea') {
    pushLog('水下无法开枪，枪膛里灌满了海水。')
    return
  }
  const equipped = game.equipment.ranged
  if (!equipped) return

  const def = getItem(equipped.id)
  if (!def?.weapon) return
  const weapon = def.weapon
  const cleanliness = Number.isFinite(equipped.cleanliness) ? equipped.cleanliness : CLEANLINESS_MAX
  battle.mode = 'ranged'
  playWeaponSfx(def)

  if (cleanliness <= 0) {
    pushLog(`${def.name}的枪膛积满了油垢，需要保养后才能开火。`)
    return
  }

  if (attackBlocked()) {
    zombieTurn()
    return
  }

  if (Math.random() < battle.zombie.dodge) {
    pushLog(`${battle.zombie.name}闪开了你的枪线。`)
    counterOnDodge()
    if (game.dead) return
    zombieTurn()
    return
  }

  // 卡壳：枪身太脏时有可能哑火，白白浪费一次行动
  if (Math.random() < cleanlinessJamChance(cleanliness)) {
    pushLog(`${def.name}卡壳了，你拍了两下枪身，只能先退开。`)
    const result = consumeRangedCleanliness()
    if (result.empty) pushLog('清洁度归零，需要保养后才能继续开火。')
    zombieTurn()
    return
  }

  const rangedTalent = isTalentActive('ranged')
    ? talentBonus('ranged', game.talents.ranged)
    : 0
  const pistolTalent = activeTalentEffects('pistol')
  const pistolWeapon =
    pistolTalent.crit && UTOPIA_TRAINING_BY_KIND.pistol.weaponIds.includes(def.id)
  const sniperTalent = activeTalentEffects('sniper')
  const sniperWeapon =
    sniperTalent.pierceChance &&
    UTOPIA_TRAINING_BY_KIND.sniper.weaponIds.includes(def.id)
  const sprayTalent = activeTalentEffects('spray')
  const sprayWeapon =
    sprayTalent.sprayChance &&
    UTOPIA_TRAINING_BY_KIND.spray.weaponIds.includes(def.id)
  const pistolCrit = pistolWeapon ? (pistolTalent.crit ?? 0) : 0
  const pistolCritDamage = pistolWeapon ? (pistolTalent.critDamage ?? 0) : 0
  const critChance = Math.min(
    1,
    (weapon.crit ?? 0) + rangedTalent + pistolCrit + magicCritBonus(),
  )
  const effectiveCritDamage = (weapon.critDamage ?? 1) + pistolCritDamage
  const crit = Math.random() < critChance && effectiveCritDamage >= 1
  const frozen = battle.frozen
  if (frozen) battle.frozen = false
  const guild = activeGuild()
  const hunter = guild?.id === 'hunter' && guild.weaponIds?.includes(def.id)
  const hunterBonus = hunter ? (guild.damageBonus ?? 0) : 0
  let multiplier =
    (crit ? effectiveCritDamage : 1) *
    (hunter ? 1 : cleanlinessMultiplier(cleanliness))
  if (hasAbility('armor')) multiplier *= ABILITY.armorMult
  if (frozen) multiplier *= ABILITY.frozenMult
  let damage = devState.oneHitKill
    ? battle.zombie.hp
    : Math.max(1, Math.round((weapon.attack ?? 0) * multiplier) + hunterBonus)
  const bloodMult = bloodGemMultiplier()
  if (bloodMult > 1) damage = Math.round(damage * bloodMult)
  if (battle.tenacityEmpower) {
    damage = Math.max(1, damage * 2)
    battle.tenacityEmpower = false
    pushLog('坚毅宝石的余烬涌入手臂，这一枪伤害翻倍。')
  }

  damageEnemy(damage)

  const dry =
    !hunter && cleanlinessMultiplier(cleanliness) < 0.8 ? '（枪身发涩，威力下降）' : ''
  pushLog(`你用${def.name}${crit ? '命中要害' : '命中'}，造成 ${damage} 点伤害。${dry}`)
  if (hasAbility('armor')) pushLog('子弹打在它的铁甲上，威力削弱了一半。')
  if (frozen) pushLog('寒气让你的手抖了一下，这一枪威力减半。')

  let extraDamage = 0
  let sprayProc = false
  if (!enemyDefeated() && sniperWeapon && Math.random() < sniperTalent.pierceChance) {
    const pierce = Math.max(1, Math.round((weapon.attack ?? 0) * 0.5))
    extraDamage += pierce
    pushLog(`贯穿触发：子弹穿过目标，额外造成 ${pierce} 点伤害。`)
  }
  if (!enemyDefeated() && sprayWeapon && Math.random() < sprayTalent.sprayChance) {
    const threeShots =
      Math.max(1, Math.round((weapon.attack ?? 0) * 0.3)) +
      Math.max(1, Math.round((weapon.attack ?? 0) * 0.2)) +
      Math.max(1, Math.round((weapon.attack ?? 0) * 0.1))
    extraDamage += threeShots
    sprayProc = true
    pushLog(`泼射触发：追加三发，额外造成 ${threeShots} 点伤害。`)
  }
  if (extraDamage > 0) damageEnemy(extraDamage)
  updateMagicStacks(crit)

  const condition = consumeRangedCleanliness()
  if (sprayProc) {
    const current = Number.isFinite(equipped.cleanliness)
      ? equipped.cleanliness
      : CLEANLINESS_MAX
    equipped.cleanliness = Math.max(0, current - 1)
    pushLog('泼射额外消耗 1 点清洁度。')
  }
  if (condition.empty && !enemyDefeated()) {
    pushLog('清洁度归零，需要保养后才能继续开火。')
  }
  companionAssist()

  if (enemyDefeated()) {
    winBattle()
    return
  }

  const corridorTalent = isTalentActive('corridor')
    ? talentBonus('corridor', game.talents.corridor)
    : 0
  const dodgeChance = Math.min(1, (weapon.dodge ?? 0) + corridorTalent)
  if (Math.random() < dodgeChance) {
    pushLog('它扑了个空，你侧身退开，避开了这一击。')
    return
  }
  zombieTurn()
}

/** 逃跑：成功则结束战斗，失败会挨一次攻击 */
export function fleeBattle() {
  if (!battle.active || game.dead) return

  if (battle.kind === 'mutiny') {
    pushLog('船员堵死了舷梯，退路已经被封住。')
    return
  }

  // 政变中逃跑必定成功，但算政变失败并清空声望
  if (battle.kind === 'airship-coup') {
    battle.active = false
    battle.finished = true
    battle.result = 'flee'
    battle.coupNext = false
    game.reputation = 0
    game.flags.airshipCoupStep = 0
    battle.summary = AIRSHIP.coup.fleeLine
    pushLog('你从高台边沿翻了下去，身后的喧哗很快被风盖住。')
    return
  }

  // 世界BOSS：随时可以撤退，血量已经按每次伤害记录
  if (battle.kind === 'world-boss') {
    battle.active = false
    battle.finished = true
    battle.result = 'flee'
    battle.summary = '你退出裂缝。它的血条停在原处，下一次还会从那里继续。'
    pushLog('你撤出了世界BOSS的领域，累计伤害已记录。')
    return
  }

  const fleeChance =
    battle.kind === 'deep-sea' && battle.mermaidBlessed ? 0.8 : DAWN_FLEE_CHANCE
  if (Math.random() < fleeChance) {
    battle.active = false
    battle.finished = true
    battle.result = 'flee'
    pushLog(
      battle.kind === 'deep-sea'
        ? '你拼命蹬水，朝有光的方向游去。'
        : '你转身冲进废墟，脚步声渐渐远了。逃跑没有战利品。',
    )
    battle.summary =
      battle.kind === 'yanran'
        ? '你退出了商场深处，身后那声嘶吼没有追上来。'
        : battle.kind === 'banker'
          ? BANKER.fleeLine
          : battle.kind === 'puppet'
            ? GIANT_PUPPET.fleeLine
            : battle.kind === 'assassination'
              ? '你退开了几步，杀意还没来得及落下。'
              : battle.kind === 'deep-sea'
                ? '你蹬水退回海面，身后那道影子没有追上来。'
                : battle.kind === 'field'
                  ? '你从地图深处退了出来，这一趟什么也没带回去。'
                  : battle.kind === 'npc'
                    ? '你退出了烧烤摊，阿三没有追出来。'
                    : battle.kind === 'spar'
                      ? '你退后两步，抬手认输。对方也收了手。'
                      : '你活着离开了废墟，但这一趟什么也没带回去。'
    return
  }

  pushLog('你被碎砖绊了一下，没能甩开它。')
  zombieTurn()
}

/** 战斗中使用背包物品：使用后行尸反击一次 */
export function useBattleItem(slotIndex) {
  if (!battle.active || game.dead) return
  const entry = game.inventory[slotIndex]
  if (!entry) return
  const def = getItem(entry.id)
  if (!def?.effects) return

  useItem(slotIndex)
  pushLog(`你使用了 ${def.name} ×1。`)
  if (game.dead) {
    markPlayerDead()
    return
  }
  zombieTurn()
}

/** 腐蚀武器：按当前战斗方式扣近战耐久或远程清洁度 */
function corrodeWeapon() {
  if (battle.mode === 'ranged' && game.equipment.ranged) {
    const def = getItem(game.equipment.ranged.id)
    const current = Number.isFinite(game.equipment.ranged.cleanliness)
      ? game.equipment.ranged.cleanliness
      : CLEANLINESS_MAX
    game.equipment.ranged.cleanliness = Math.max(0, current - ABILITY.corrodeLoss)
    pushLog(`污液渗进${def?.name ?? '远程武器'}：清洁度 -${ABILITY.corrodeLoss}。`)
    return
  }

  const equipped = game.equipment.melee
  if (!equipped) return
  const def = getItem(equipped.id)
  const max = def?.weapon?.durability
  if (!Number.isFinite(max)) return

  const current = Number.isFinite(equipped.durability) ? equipped.durability : max
  const next = Math.max(0, current - ABILITY.corrodeLoss)
  equipped.durability = next
  if (next <= 0) {
    game.equipment.melee = null
    pushLog(`${def?.name ?? '近战武器'}被酸液蚀断了，你只能空手。`)
    return
  }
  pushLog(`酸液咬住了${def?.name ?? '近战武器'}：耐久 -${ABILITY.corrodeLoss}（${next}/${max}）。`)
}

/** 切磋落败：玩家被逼到 1 点生命，对手收手，不会死亡 */
function finishSparLoss() {
  game.stats.hp = 1
  battle.active = false
  battle.finished = true
  battle.result = 'spar-loss'
  battle.summary = `${battle.zombie.name}在你只剩一口气时收住了手。“到此为止。”你扶着膝盖，喘得说不出话。`
  pushLog('切磋结束：你被逼到 1 点生命，对手主动停手。')
}

function zombieTurn() {
  if (!battle.active || game.dead) return

  battle.round += 1
  const zombie = battle.zombie
  const attack = enemyAttackValue()

  if (hasAbility('screech') && battle.round % 2 === 0) {
    applyStatChanges({ stamina: -ABILITY.screechStamina })
    pushLog(`${zombie.name}发出尖啸，你的耳膜一阵刺痛：体力 -${ABILITY.screechStamina}。`)
    if (game.dead) {
      markPlayerDead()
      return
    }
  }

  const changes = { hp: -blockIncomingDamage(attack) }
  if (zombie.infection > 0) changes.infection = zombie.infection
  applyStatChanges(changes)

  if (zombie.infection > 0) {
    pushLog(`${zombie.name}抓中了你：生命 -${-changes.hp}，感染 +${zombie.infection}%。`)
  } else {
    pushLog(`${zombie.name}击中了你：生命 -${-changes.hp}。`)
  }

  if (game.dead) {
    markPlayerDead()
    return
  }

  if (battle.kind === 'spar' && game.stats.hp <= 1) {
    finishSparLoss()
    return
  }

  if (hasAbility('blind')) {
    battle.blinded = true
    pushLog('它撕开你的视线，下一击有 50% 概率打偏。')
  }
  if (hasAbility('corrode')) corrodeWeapon()
  if (hasAbility('acid')) {
    const damage = blockIncomingDamage(
      ABILITY.acidMin + Math.floor(Math.random() * (ABILITY.acidMax - ABILITY.acidMin + 1)),
    )
    applyStatChanges({ hp: -damage })
    pushLog(`酸液泼在你身上，皮肉发出滋滋声：额外生命 -${damage}。`)
  }
  if (hasAbility('summon') && !battle.summoned) {
    battle.summoned = true
    const damage = blockIncomingDamage(ABILITY.summonDamage)
    applyStatChanges({ hp: -damage })
    pushLog(`群居尸母召唤了两只游荡丧尸，它们同时扑上来：生命 -${damage}。`)
  }
  if (hasAbility('trip')) {
    battle.tripped = true
    pushLog('爬行尸缠住你的双腿，你被绊倒了。')
  }
  if (hasAbility('freeze')) {
    battle.frozen = true
    pushLog('冰霜尸的寒气侵入身体，你的动作变得迟缓。')
  }
  if (hasAbility('impale')) {
    const damage = blockIncomingDamage(Math.max(1, Math.round(attack * ABILITY.impaleMult)))
    applyStatChanges({ hp: -damage })
    pushLog(`骨刺深深扎进你的身体：额外生命 -${damage}。`)
  }
  if (hasAbility('cloak') && Math.random() < ABILITY.cloakAmbushRate) {
    const damage = blockIncomingDamage(
      Math.max(1, Math.round(attack * ABILITY.cloakAmbushMult)),
    )
    applyStatChanges({ hp: -damage })
    pushLog(`幽灵潜行尸从暗影里补了一刀：额外生命 -${damage}。`)
  }

  if (battle.kind === 'spar' && game.stats.hp <= 1) {
    finishSparLoss()
    return
  }

  if (game.dead) markPlayerDead()
}

function markPlayerDead() {
  battle.active = false
  battle.finished = true
  battle.result = 'dead'
  battle.summary =
    battle.kind === 'field'
      ? '你倒在了野外的尘土里，没有等到下一次天亮。'
      : battle.kind === 'banker'
        ? '你倒在了银行大厅的大理石地面上，账本上的数字还没抹掉。'
        : battle.kind === 'airship-coup'
          ? AIRSHIP.coup.defeatedLine
          : '伤口太深了，你没能撑到哨塔的灯下。'
  if (battle.kind === 'airship-coup') game.flags.airshipCoupStep = 0
  pushLog('你倒下了，眼前的废墟慢慢变黑。')
}

/** 露露战斗辅助：每场胜利后处理伤口 */
function luluHeal() {
  if (!game.flags.luluRescued) return
  applyStatChanges({ hp: COMPANIONS.lulu.healAfterBattle })
  pushLog(`露露替你处理了伤口，生命恢复 ${COMPANIONS.lulu.healAfterBattle}。`)
}

/** 嫣然战斗辅助：有一定概率从侧后方补一刀 */
function companionAssist() {
  if (!game.flags.yanranRescued) return
  if (enemyDefeated()) return
  if (Math.random() >= COMPANIONS.yanran.assistRate) return
  damageEnemy(COMPANIONS.yanran.assistDamage)
  pushLog(`嫣然从侧后方补了一下，造成 ${COMPANIONS.yanran.assistDamage} 点伤害。`)
}

/** 结算击杀时最后一击使用的武器 */
function killWeaponId() {
  return battle.mode === 'melee'
    ? (game.equipment.melee?.id ?? null)
    : (game.equipment.ranged?.id ?? null)
}

/** 普通丧尸胜利的通用结算：死亡自爆、露露回血、击杀计数 */
function resolveZombieVictory() {
  if (deathThroes()) return false

  battle.result = 'victory'
  luluHeal()
  game.zombieKills += 1
  recordGuildKill(killWeaponId())
  pushLog(`${battle.zombie.name}终于不动了。`)
  return true
}

function winBattle() {
  battle.active = false
  battle.finished = true

  if (battle.kind === 'airship-cargo') {
    if (!resolveZombieVictory()) return
    game.flags.airshipCargoCleared = true
    battle.summary = `${AIRSHIP.cargo.clearedLine}\n\n${AIRSHIP.cargo.clearedNote}`
    pushLog(battle.summary)
    return
  }

  if (battle.kind === 'airship-commission') {
    if (!resolveZombieVictory()) return
    const commission = AIRSHIP.commission.battle
    game.reputation += commission.reputation
    battle.summary = `${commission.doneLine}（声望 +${commission.reputation}，当前 ${game.reputation}）`
    pushLog(battle.summary)
    return
  }

  if (battle.kind === 'deep-sea') {
    battle.result = 'victory'
    const rewardId = battle.zombie.isBoss ? SEA_LOOT.boss : SEA_LOOT.normal
    const reward = getItem(rewardId)
    const rewardName = reward?.name ?? '战利品'
    const leftover = addItem(game.inventory, rewardId, 1)
    battle.summary =
      leftover > 0
        ? `你击退了${battle.zombie.name}，但背包已满，${rewardName}只能留在海里。`
        : `你击退了${battle.zombie.name}，获得 ${rewardName} ×1。`
    pushLog(battle.summary)
    return
  }

  if (battle.kind === 'mutiny') {
    battle.result = 'victory'
    const stage = battle.mutinyStage

    if (stage < HARBOR_MUTINY.crewCount) {
      battle.mutinyNext = true
      battle.summary = `第 ${stage + 1} 名${HARBOR_MUTINY.crewName}倒下了。舷梯那头的脚步声没有停。`
      pushLog(battle.summary)
      return
    }

    battle.mutinyNext = false
    game.flags.alexKilled = true
    game.flags.portBanUntilDay = game.day + HARBOR_MUTINY.banDays
    game.finale = HARBOR_MUTINY.finale
    battle.summary = `${HARBOR_MUTINY.captainDeathLine}\n\n结局达成 · ${HARBOR_MUTINY.finale}`
    pushLog(battle.summary)
    return
  }

  if (battle.kind === 'airship-coup') {
    const coup = AIRSHIP.coup
    const npc = npcById(battle.zombie.id)
    battle.result = 'victory'
    const nextIndex = battle.coupStage + 1

    if (nextIndex < coup.enemyIds.length) {
      battle.coupNext = true
      game.flags.airshipCoupStep = nextIndex
      battle.summary = `${npc?.deathLine ?? '对手倒下了。'}\n\n高台下没有掌声。下一位对手已经站了起来。`
      pushLog(battle.summary)
      return
    }

    battle.coupNext = false
    game.flags.airshipCoupDone = true
    game.flags.airshipCoupStep = 0
    game.finale = coup.finale
    if (unlockAchievement('coup-victory') && typeof window !== 'undefined') {
      notify('成就解锁 · 臣服于我')
    }
    battle.summary = `${coup.doneLine}\n\n结局达成 · ${coup.finale}`
    pushLog(battle.summary)
    return
  }

  if (battle.kind === 'assassination') {
    const npc = npcById(battle.npcId)
    battle.result = 'victory'
    if (npc) game.flags[npc.deathFlag] = true
    luluHeal()
    battle.summary = npc?.deathLine ?? '目标倒下了。'
    pushLog(battle.summary)
    return
  }

  if (battle.kind === 'leader') {
    battle.result = 'victory'
    game.flags.dawnLeaderKilled = true
    luluHeal()
    battle.summary = '羿阳倒下了。哨塔顶层安静得只能听见自己的心跳。'
    pushLog(battle.summary)
    return
  }

  if (battle.kind === 'yanran') {
    battle.result = 'victory'
    game.flags.yanranKilled = true
    game.flags.yanranLost = true
    luluHeal()
    battle.summary = YANRAN.killedLine
    pushLog(battle.summary)
    return
  }

  if (battle.kind === 'npc') {
    battle.result = 'victory'
    game.flags.maSanKilled = true
    game.flags.maSanStage = 99
    luluHeal()
    const leftover = addItem(game.inventory, MA_SAN.rewardItemId, 1)
    battle.summary = leftover
      ? '阿三倒在砧板旁。AKM 还在那儿，你的背包却塞不下。'
      : '阿三倒在砧板旁。你从他围裙下摸出一支 AKM。'
    pushLog(battle.summary)
    return
  }

  if (battle.kind === 'puppet') {
    battle.result = 'victory'
    game.flags.giantPuppetDefeated = true
    luluHeal()
    const leftover = addItem(game.inventory, GIANT_PUPPET.rewardItemId, 1)
    game.flags.generatorPending = leftover > 0
    battle.summary = leftover
      ? `${GIANT_PUPPET.victoryLine} 可你的背包已经塞满，只能先把它留在残骸里。`
      : GIANT_PUPPET.victoryLine
    pushLog(battle.summary)
    return
  }

  if (battle.kind === 'banker') {
    battle.result = 'victory'
    battle.summary = waiveLoanInterest()
    pushLog(battle.summary)
    return
  }

  if (battle.kind === 'dev-duel') {
    battle.result = 'victory'
    game.flags[DEV_SHOP.duel.doneFlag] = true
    game.finale = '作弊者'
    if (unlockAchievement('no-cheat') && typeof window !== 'undefined') {
      notify('成就解锁 · 我没开挂')
    }
    const dev = npcById(DEV_SHOP.duel.npcId)
    const line = dev?.victoryLine ?? '开发者的血条终于见底。'
    const leftover = addItem(game.inventory, DEV_SHOP.duel.rewardItemId, 1)
    battle.summary = leftover
      ? `${line} 可你的背包已经塞满，剑只能先留在桌上。`
      : line
    pushLog(battle.summary)
    return
  }

  if (battle.kind === 'world-boss') {
    battle.result = 'victory'
    const bossId = battle.zombie.bossId
    game.flags.worldBossDefeated = {
      ...(game.flags.worldBossDefeated ?? {}),
      [bossId]: true,
    }
    game.flags.worldBossHp = {
      ...(game.flags.worldBossHp ?? {}),
      [bossId]: 0,
    }
    const gem = getItem(battle.zombie.gemId)
    const leftover = addItem(game.inventory, battle.zombie.gemId, 1)
    battle.summary =
      leftover > 0
        ? `${battle.zombie.name}倒下了，但你的背包已满，${gem?.name ?? '宝石'}只能留在灰烬里。`
        : `${battle.zombie.name}倒下了。你从它的残骸里取出 ${gem?.name ?? '宝石'}。`
    pushLog(battle.summary)
    return
  }

  if (battle.kind === 'spar') {
    battle.result = 'spar-win'
    game.reputation += 2
    battle.summary = `${battle.zombie.name}退后一步，收住了手。“你赢了。”声望 +2（当前 ${game.reputation}）。`
    pushLog(battle.summary)
    return
  }

  if (deathThroes()) return

  battle.result = 'victory'
  luluHeal()
  game.zombieKills += 1
  recordGuildKill(killWeaponId())
  pushLog(`${battle.zombie.name}终于不动了。`)

  if (battle.kind === 'field') {
    const loot = pickZombieLoot(battle.mapId)
    let lootText = '它身上没有留下能带走的东西。'
    if (loot) {
      const def = getItem(loot.itemId)
      const leftover = addItem(game.inventory, loot.itemId, 1)
      lootText =
        leftover > 0
          ? `它身上有 ${def?.name ?? '物资'}，但你的背包已经满了。`
          : `它身上掉落 ${def?.name ?? '物资'} ×1。`
    }
    battle.summary = `你击杀了${battle.zombie.name}。${lootText}`
    pushLog('野外击杀：没有曙光币，只有它身上留下的东西。')
    pushLog(lootText)
    return
  }

  game.dawnCoins += 1
  pushLog('击杀行尸：曙光币 +1。')

  const itemId = pickDawnLoot()
  let extra = '它身上没有留下能带走的东西。'
  if (itemId) {
    const def = getItem(itemId)
    const leftover = addItem(game.inventory, itemId, 1)
    extra =
      leftover > 0
        ? `它身上有 ${def?.name ?? '物资'}，但你的背包已经满了。`
        : `它身上掉落 ${def?.name ?? '物资'} ×1。`
    pushLog(extra)
  }
  battle.summary = `行尸倒在你的脚下。曙光币 +1，${extra}`
}
