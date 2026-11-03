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
  MA_SAN,
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
  npcById,
  pickDawnLoot,
  pickZombieLoot,
  talentBonus,
  talentEffects,
  zombieById,
} from '../data'
import {
  advanceTurns,
  applyStatChanges,
  consumeMeleeDurability,
  consumeRangedCleanliness,
  cooldownLeft,
  devState,
  game,
  isTalentActive,
  questStatus,
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
  battle.zombie = {
    ...enemy,
    abilities: Array.isArray(enemy.abilities) ? [...enemy.abilities] : [],
    dodge: Number(enemy.dodge) || 0,
    maxHp: enemy.hp,
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

/** 绊倒 / 致盲：返回 true 表示这一击被跳过 */
function attackBlocked() {
  if (battle.tripped) {
    battle.tripped = false
    pushLog('你被绊了个踉跄，灰头土脸地爬起来，没能出手。')
    return true
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
    const damage = Math.max(1, Math.round(battle.zombie.attack * ABILITY.leapMult))
    applyStatChanges({ hp: -damage })
    pushLog(`跳跃尸借势反扑，把你撞退了两步：生命 -${damage}。`)
  }
  if (hasAbility('cloak')) {
    const damage = Math.max(1, Math.round(battle.zombie.attack * ABILITY.cloakCounter))
    applyStatChanges({ hp: -damage })
    pushLog(`幽灵潜行尸遁入暗影，从背后划了一刀：生命 -${damage}。`)
  }
  if (game.dead) markPlayerDead()
}

function deathThroes() {
  const zombie = battle.zombie
  if (hasAbility('selfDestruct')) {
    applyStatChanges({ hp: -zombie.attack })
    pushLog(`${zombie.name}的尸体炸开了，冲击波把你掀翻：生命 -${zombie.attack}。`)
  }
  if (hasAbility('explosive')) {
    const damage = Math.round(zombie.attack * ABILITY.explosiveMult)
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

  if (attackBlocked()) {
    zombieTurn()
    return
  }

  if (Math.random() < battle.zombie.dodge) {
    pushLog(`${battle.zombie.name}闪开了你的攻击。`)
    counterOnDodge()
    if (game.dead) return
    zombieTurn()
    return
  }

  let hits = 0
  let total = 0
  let crits = 0
  let broken = null
  let loops = 0
  const armored = hasAbility('armor')
  const frozen = battle.frozen
  if (frozen) battle.frozen = false

  while (loops < 500) {
    loops += 1
    const { weapon } = currentMelee()
    const arena =
      isFistTalentWeapon(game.equipment.melee) && isTalentActive('arena')
        ? talentEffects('arena', game.talents.arena)
        : {}
    const crit = Math.random() < (weapon.crit ?? 0) && (weapon.critDamage ?? 0) >= 1
    const attack = (weapon.attack ?? 0) + (arena.damage ?? 0)
    let damage = Math.max(1, Math.round(attack * (crit ? weapon.critDamage : 1)))
    if (armored) damage = Math.max(1, Math.floor(damage * ABILITY.armorMult))
    if (frozen && hits === 0) damage = Math.max(1, Math.floor(damage * ABILITY.frozenMult))
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
    const comboChance = Math.min(
      1,
      (weapon.combo ?? 0) + meleeTalent + (arena.combo ?? 0),
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
  companionAssist()

  if (enemyDefeated()) {
    winBattle()
    return
  }
  zombieTurn()
}

/**
 * 远程攻击：每一枪消耗清洁度；清洁度越低伤害越低、越容易卡壳
 * 命中后按远程武器的闪避率躲开反击
 */
export function rangedAttack() {
  if (!battle.active || game.dead) return
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
  const critChance = Math.min(1, (weapon.crit ?? 0) + rangedTalent)
  const crit = Math.random() < critChance && (weapon.critDamage ?? 0) >= 1
  const frozen = battle.frozen
  if (frozen) battle.frozen = false
  let multiplier = (crit ? weapon.critDamage : 1) * cleanlinessMultiplier(cleanliness)
  if (hasAbility('armor')) multiplier *= ABILITY.armorMult
  if (frozen) multiplier *= ABILITY.frozenMult
  const damage = devState.oneHitKill
    ? battle.zombie.hp
    : Math.max(1, Math.round((weapon.attack ?? 0) * multiplier))

  damageEnemy(damage)

  const dry = cleanlinessMultiplier(cleanliness) < 0.8 ? '（枪身发涩，威力下降）' : ''
  pushLog(`你用${def.name}${crit ? '命中要害' : '命中'}，造成 ${damage} 点伤害。${dry}`)
  if (hasAbility('armor')) pushLog('子弹打在它的铁甲上，威力削弱了一半。')
  if (frozen) pushLog('寒气让你的手抖了一下，这一枪威力减半。')
  const condition = consumeRangedCleanliness()
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

  if (Math.random() < DAWN_FLEE_CHANCE) {
    battle.active = false
    battle.finished = true
    battle.result = 'flee'
    pushLog('你转身冲进废墟，脚步声渐渐远了。逃跑没有战利品。')
    battle.summary =
      battle.kind === 'yanran'
        ? '你退出了商场深处，身后那声嘶吼没有追上来。'
        : battle.kind === 'banker'
          ? BANKER.fleeLine
          : battle.kind === 'puppet'
            ? GIANT_PUPPET.fleeLine
            : battle.kind === 'assassination'
              ? '你退开了几步，杀意还没来得及落下。'
              : battle.kind === 'field'
                ? '你从地图深处退了出来，这一趟什么也没带回去。'
                : battle.kind === 'npc'
                  ? '你退出了烧烤摊，阿三没有追出来。'
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

function zombieTurn() {
  if (!battle.active || game.dead) return

  battle.round += 1
  const zombie = battle.zombie
  const attack = zombie.attack

  if (hasAbility('screech') && battle.round % 2 === 0) {
    applyStatChanges({ stamina: -ABILITY.screechStamina })
    pushLog(`${zombie.name}发出尖啸，你的耳膜一阵刺痛：体力 -${ABILITY.screechStamina}。`)
    if (game.dead) {
      markPlayerDead()
      return
    }
  }

  const changes = { hp: -attack }
  if (zombie.infection > 0) changes.infection = zombie.infection
  applyStatChanges(changes)

  if (zombie.infection > 0) {
    pushLog(`${zombie.name}抓中了你：生命 -${attack}，感染 +${zombie.infection}%。`)
  } else {
    pushLog(`${zombie.name}击中了你：生命 -${attack}。`)
  }

  if (game.dead) {
    markPlayerDead()
    return
  }

  if (hasAbility('blind')) {
    battle.blinded = true
    pushLog('它撕开你的视线，下一击有 50% 概率打偏。')
  }
  if (hasAbility('corrode')) corrodeWeapon()
  if (hasAbility('acid')) {
    const damage =
      ABILITY.acidMin + Math.floor(Math.random() * (ABILITY.acidMax - ABILITY.acidMin + 1))
    applyStatChanges({ hp: -damage })
    pushLog(`酸液泼在你身上，皮肉发出滋滋声：额外生命 -${damage}。`)
  }
  if (hasAbility('summon') && !battle.summoned) {
    battle.summoned = true
    applyStatChanges({ hp: -ABILITY.summonDamage })
    pushLog(`群居尸母召唤了两只游荡丧尸，它们同时扑上来：生命 -${ABILITY.summonDamage}。`)
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
    const damage = Math.max(1, Math.round(attack * ABILITY.impaleMult))
    applyStatChanges({ hp: -damage })
    pushLog(`骨刺深深扎进你的身体：额外生命 -${damage}。`)
  }
  if (hasAbility('cloak') && Math.random() < ABILITY.cloakAmbushRate) {
    const damage = Math.max(1, Math.round(attack * ABILITY.cloakAmbushMult))
    applyStatChanges({ hp: -damage })
    pushLog(`幽灵潜行尸从暗影里补了一刀：额外生命 -${damage}。`)
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

/** 普通丧尸胜利的通用结算：死亡自爆、露露回血、击杀计数 */
function resolveZombieVictory() {
  if (deathThroes()) return false

  battle.result = 'victory'
  luluHeal()
  game.zombieKills += 1
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
    const leftover = addItem(game.inventory, DEV_SHOP.duel.rewardItemId, 1)
    battle.summary = leftover
      ? `${DEV_SHOP.duel.victoryLine} 可你的背包已经塞满，剑只能先留在桌上。`
      : DEV_SHOP.duel.victoryLine
    pushLog(battle.summary)
    return
  }

  if (deathThroes()) return

  battle.result = 'victory'
  luluHeal()
  game.zombieKills += 1
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
