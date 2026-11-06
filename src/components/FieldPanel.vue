<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  DEV_SHOP,
  DOCTOR,
  GARAGE,
  GIANT_PUPPET,
  HELICOPTER,
  LULU,
  MA_SAN,
  MAFEI,
  MERMAID,
  ORCHARD,
  QUEST_OWNERS,
  ROCKET,
  ROTTEN_SEED,
  SEA_OXYGEN_BLESSED,
  SEA_OXYGEN_COST,
  SEA_OXYGEN_DEFAULT,
  SEA_TIERS,
  STRANGE_BARBECUE,
  TALENTS,
  TALENT_EFFECT_LABELS,
  UTOPIA_TRAINING_BY_KIND,
  YANRAN,
  ZOMBIE_ABILITY_LABELS,
  ALEX_QUESTS,
  CLEANLINESS_MAX,
  canStoreItems,
  countItem,
  expandPriceAtSize,
  fieldMapById,
  getItem,
  lootCategoryText,
  mapBackground,
  npcById,
  rarityText,
  talentEffects,
  talentTitle,
  zombiePool,
} from '../data'
import {
  acceptMaSanInvite,
  advanceTurns,
  approachYanran,
  cooldownLeft,
  collectGenerator,
  countAntiInfection,
  countCans,
  countDoctorBadges,
  countFruits,
  countGasoline,
  countHighExplosive,
  countSpirits,
  craftHighExplosive,
  currentPhase,
  deliverMaSanBeer,
  deliverMaSanFruit,
  deliverMaSanSpirit,
  detonateSpaceport,
  doctorSupplyCounts,
  doctorTrade,
  eatStrangeBarbecue,
  elopeGarage,
  exploreField,
  extractEnergy,
  expandBackpack,
  feedLulu,
  flyToAirship,
  game,
  isNpcDead,
  isQuestDone,
  launchRocket,
  mermaidCurrent as readMermaidCurrent,
  mermaidStage as readMermaidStage,
  notify,
  utopiaTrain,
  utopiaTrainingGuard,
  utopiaTrainingLeft,
  utopiaTrainingLimit,
  isTalentActive,
  openGarageDoor,
  pickOrchard,
  questStatus,
  repairHelicopter,
  rescueYanran,
  searchGarageKey,
  stealGarageGasoline,
  submitEnergy,
  submitGenerator,
  submitMermaidDrink,
  submitSupplies,
  takeDevCandyGift,
  takeDevHealingGift,
  takeDevKnightGift,
  takeDevNoviceGift,
  takeRottenSeed,
  yanranDaysLeft,
} from '../game/store'
import {
  battle,
  continueHarborMutiny,
  resetBattle,
  startFieldCombat,
  startHarborMutiny,
  startSeaDive,
} from '../game/battle'
import AssassinationCard from './AssassinationCard.vue'
import BattleView from './BattleView.vue'
import MapMenuList from './MapMenuList.vue'
import ModalShell from './ModalShell.vue'
import NpcIntro from './NpcIntro.vue'
import QuestLinePanel from './QuestLinePanel.vue'
import StatusHud from './StatusHud.vue'

const emit = defineEmits(['close', 'travel'])
const feed = ref('')
const view = ref('menu')
const zombiesOpen = ref(false)

const map = computed(() => fieldMapById(game.location))
const zombies = computed(() => zombiePool(map.value?.zombiePool))
const encounterPercent = computed(() => Math.round((map.value?.encounterRate ?? 0) * 100))
const lootText = computed(() => lootCategoryText(map.value?.lootTable))
const rarityLabel = computed(() => rarityText(map.value?.rarityWeights))

// 切换地图时回到菜单并重新折叠「出没丧尸」
watch(map, () => {
  view.value = 'menu'
  zombiesOpen.value = false
})

const isPolice = computed(() => map.value?.id === HELICOPTER.mapId)
const helicopterRepaired = computed(() => Boolean(game.flags[HELICOPTER.repairedFlag]))
const helicopterGasoline = computed(() => countGasoline())

/* 假人训练：荒废警局专用的突击天赋训练，沿用乌托邦训练引擎 */
const dummyTraining = UTOPIA_TRAINING_BY_KIND.assault
const dummyLevel = computed(() => Math.round(Number(game.talents.assault) || 0))
const dummyProgress = computed(() => Math.min(100, Number(game.training.assault) || 0))
const dummyRanged = computed(() => game.equipment.ranged)
const dummyRangedItem = computed(() => getItem(dummyRanged.value?.id))
const dummyFits = computed(() =>
  Boolean(dummyTraining.weaponIds.includes(dummyRanged.value?.id)),
)
const dummyCleanliness = computed(() => {
  const value = dummyRanged.value?.cleanliness
  return Number.isFinite(value) ? value : CLEANLINESS_MAX
})
const dummyLeft = computed(() => utopiaTrainingLeft('assault'))
const dummyLimit = computed(() => utopiaTrainingLimit('assault'))
const dummyBlocked = computed(() => utopiaTrainingGuard('assault'))
const dummyFull = computed(() => dummyLevel.value >= TALENTS.assault.maxLevel)
const dummyTitle = computed(() => talentTitle('assault', dummyLevel.value) || '尚未训练')
const dummyEffectText = computed(() => {
  if (!dummyLevel.value) return '暂无加成'
  const effect = talentEffects('assault', dummyLevel.value)
  return `暴击 +${Math.round((effect.crit || 0) * 100)}% / 爆伤 +${effect.critDamage || 0}× / 攻击 +${effect.damage || 0}`
})
function trainDummy() {
  const message = utopiaTrain('assault')
  if (message) notify(message)
}

/* 清理杂草：废弃村庄专用的收割天赋训练，与时间宝石 / 盗贼公会共用镰刀白名单 */
const harvestTraining = UTOPIA_TRAINING_BY_KIND.harvest
const harvestLevel = computed(() => Math.round(Number(game.talents.harvest) || 0))
const harvestProgress = computed(() => Math.min(100, Number(game.training.harvest) || 0))
const harvestMelee = computed(() => game.equipment.melee)
const harvestMeleeItem = computed(() => getItem(harvestMelee.value?.id))
const harvestFits = computed(() =>
  Boolean(harvestTraining.weaponIds.includes(harvestMelee.value?.id)),
)
const harvestDurability = computed(() => {
  const value = harvestMelee.value?.durability
  if (Number.isFinite(value)) return value
  return harvestMeleeItem.value?.weapon?.durability ?? 0
})
const harvestLeft = computed(() => utopiaTrainingLeft('harvest'))
const harvestLimit = computed(() => utopiaTrainingLimit('harvest'))
const harvestBlocked = computed(() => utopiaTrainingGuard('harvest'))
const harvestFull = computed(() => harvestLevel.value >= TALENTS.harvest.maxLevel)
const harvestTitle = computed(() => talentTitle('harvest', harvestLevel.value) || '尚未训练')
const harvestEffectText = computed(() => {
  if (!harvestLevel.value) return '暂无加成'
  const effect = talentEffects('harvest', harvestLevel.value)
  return `爆伤 +${effect.critDamage || 0}× / ${Math.round((effect.harvestChance || 0) * 100)}% 概率回 ${effect.harvestHeal || 0} 血`
})
function trainHarvest() {
  const message = utopiaTrain('harvest')
  if (message) notify(message)
}

const isVillage = computed(() => map.value?.id === ORCHARD.mapId)
const isCamp = computed(() => map.value?.id === STRANGE_BARBECUE.mapId)
const isMarket = computed(() => map.value?.id === MERMAID.mapId)
const isCore = computed(() => map.value?.id === YANRAN.mapId || map.value?.id === GARAGE.mapId)
const isHospital = computed(() => map.value?.id === LULU.mapId)
const isLab = computed(() => map.value?.id === DOCTOR.mapId)
const isSpaceport = computed(() => map.value?.id === ROCKET.mapId)
const isHarbor = computed(() => map.value?.id === 'long-beach-harbor')
const alexQuestDone = computed(
  () => ALEX_QUESTS.filter((quest) => isQuestDone(quest.id)).length,
)
const alexKilled = computed(() => Boolean(game.flags.alexKilled))
const alexTag = computed(() =>
  alexKilled.value
    ? '已死亡'
    : game.finale === '远洋航行'
      ? '已启航'
      : `${alexQuestDone.value} / ${ALEX_QUESTS.length}`,
)
const mermaidBlessed = computed(
  () => (Number(game.flags.mermaidStage) || 0) >= MERMAID.stages.length,
)
const seaOxygenMax = computed(() =>
  mermaidBlessed.value ? SEA_OXYGEN_BLESSED : SEA_OXYGEN_DEFAULT,
)
const isBarracks = computed(() => map.value?.id === MAFEI.mapId)
const mafeiKilled = computed(() => Boolean(game.flags.mafeiKilled))
const mafeiQuest10Done = computed(() => isQuestDone('mafei-10'))
const mafeiQuest11Active = computed(() => questStatus('mafei-11') === 'active')
const explosiveCount = computed(() => countHighExplosive())
const spaceportBlown = computed(() => Boolean(game.flags.spaceportBlown))
const mermaidDead = computed(() => isNpcDead('mermaid'))
const doctorDead = computed(() => isNpcDead('doctor'))
const orchardLeft = computed(() => cooldownLeft(ORCHARD.cooldownKey, ORCHARD.cooldownDays))
const barbecueLeft = computed(() =>
  cooldownLeft(STRANGE_BARBECUE.cooldownKey, STRANGE_BARBECUE.cooldownDays),
)
const seedFound = computed(() => Boolean(game.flags.rottenSeedFound))
const seedSprouted = computed(() => Boolean(game.flags.rottenSeedSprouted))
const seedPlanted = computed(() => Boolean(game.flags.rottenSeedPlanted))
const hasSeed = computed(() => countItem(game.inventory, ROTTEN_SEED.itemId) > 0)
const ateStrangeMeat = computed(() => Boolean(game.flags.ateStrangeMeat))
const maSanStage = computed(() => Number(game.flags.maSanStage) || 0)
const maSanKilled = computed(() => Boolean(game.flags.maSanKilled))
const beerCount = computed(() => countItem(game.inventory, MA_SAN.beerId))
const fruitCount = computed(() => countFruits())
const spiritCount = computed(() => countSpirits())

const maSanLine = computed(() => {
  if (maSanKilled.value) return MA_SAN.killedLine
  if (!ateStrangeMeat.value) return MA_SAN.lockedLine
  if (maSanStage.value === 0) return MA_SAN.askBeerLine
  if (maSanStage.value === 1) return MA_SAN.askFruitLine
  if (maSanStage.value === 2) return MA_SAN.askSpiritLine
  return MA_SAN.inviteLine
})

const mermaidStage = computed(() => readMermaidStage())
const mermaidCurrent = computed(() => readMermaidCurrent())
const mermaidStageCount = computed(() => MERMAID.stages.length)
const mermaidDone = computed(() => mermaidStage.value >= mermaidStageCount.value)
const mermaidCurrentName = computed(() => {
  const stage = mermaidCurrent.value
  return stage ? getItem(stage.itemId)?.name ?? stage.itemId : ''
})
const mermaidNeedCount = computed(() => mermaidCurrent.value?.count ?? 0)
const mermaidOwned = computed(() =>
  mermaidCurrent.value ? countItem(game.inventory, mermaidCurrent.value.itemId) : 0,
)
const mermaidRewardName = computed(
  () => getItem(MERMAID.rewardItemId)?.name ?? MERMAID.rewardItemId,
)
const mermaidHint = computed(() => {
  const index = mermaidStage.value
  if (index <= 0) return ''
  return MERMAID.lines[index - 1] ?? ''
})

const noviceGiftTaken = computed(() => Boolean(game.flags.devNoviceGiftTaken))
const knightGiftTaken = computed(() => Boolean(game.flags.devKnightGiftTaken))
const healingGiftTaken = computed(() => Boolean(game.flags.devHealingGiftTaken))
const candyGiftTaken = computed(() => Boolean(game.flags.devCandyGiftTaken))
const devGiftTaken = computed(
  () => noviceGiftTaken.value && knightGiftTaken.value && healingGiftTaken.value && candyGiftTaken.value,
)
const devDuelWon = computed(() => Boolean(game.flags[DEV_SHOP.duel.doneFlag]))
const devNpc = computed(() => npcById(DEV_SHOP.duel.npcId))
const devMenuTag = computed(() => {
  if (!devGiftTaken.value) return '可领取'
  return devDuelWon.value ? '已完成' : '可角斗'
})
const bagSize = computed(() => game.inventory.length)
const bagFull = computed(() => bagSize.value >= DEV_SHOP.expandLimit)
const expandPrice = computed(() => expandPriceAtSize(bagSize.value))
const canExpand = computed(
  () =>
    !bagFull.value &&
    expandPrice.value !== null &&
    game.coins >= expandPrice.value.coins &&
    game.dawnCoins >= expandPrice.value.dawnCoins,
)

const yanranSeen = computed(() => Boolean(game.flags.yanranSeen))
const yanranRescued = computed(() => Boolean(game.flags.yanranRescued))
const yanranKilled = computed(() => Boolean(game.flags.yanranKilled))
const yanranLost = computed(() => Boolean(game.flags.yanranLost))
const yanranDays = computed(() => yanranDaysLeft() ?? 0)
// 截止日当天仍可营救：只有超过 deadline 才视为变异
const yanranOverdue = computed(
  () => yanranSeen.value && game.day > Number(game.flags.yanranDeadline),
)
const yanranMutated = computed(
  () =>
    !yanranRescued.value &&
    !yanranKilled.value &&
    (yanranLost.value || yanranOverdue.value),
)
const serumCount = computed(() => countAntiInfection())

const garageUnlocked = computed(() => Boolean(game.flags.yanranRescued))
const garageOpened = computed(() => Boolean(game.flags.garageOpened))
const garageKeyFound = computed(
  () => Boolean(game.flags.garageKeyFound) || countItem(game.inventory, GARAGE.carKeyId) > 0,
)
const garageDeparted = computed(() => Boolean(game.flags.garageDeparted))
const gasolineCount = computed(() => countGasoline())
const hasCrowbar = computed(() => game.equipment.melee?.id === GARAGE.crowbarId)

const luluRescued = computed(() => Boolean(game.flags.luluRescued))
const cans = computed(() => countCans())

const doctorTradeDone = computed(() => Boolean(game.flags.doctorTradeDone))
const doctorQuest1Done = computed(() => Boolean(game.flags.doctorQuest1Done))
const doctorQuest2Done = computed(() => Boolean(game.flags.doctorQuest2Done))
const doctorBadges = computed(() => countDoctorBadges())
const doctorReady = computed(() => doctorBadges.value >= DOCTOR.badges.length)
const generatorOwned = computed(() => countItem(game.inventory, DOCTOR.generatorId) > 0)
const energyCount = computed(() => countItem(game.inventory, DOCTOR.energyId))
const energyLeft = computed(() =>
  cooldownLeft(DOCTOR.energyCooldownKey, DOCTOR.energyCooldownDays),
)
const supplies = computed(() => doctorSupplyCounts())
const suppliesReady = computed(
  () =>
    supplies.value.medicine >= DOCTOR.supply.medicine &&
    supplies.value.food >= DOCTOR.supply.food &&
    supplies.value.drink >= DOCTOR.supply.drink,
)
const doctorTag = computed(() => {
  if (doctorDead.value) return '已死亡'
  if (doctorReady.value) return '火箭就绪'
  if (doctorQuest2Done.value) return '任务③物资'
  if (doctorQuest1Done.value) return `任务②能源 ${energyCount.value}/${DOCTOR.energyCount}`
  if (doctorTradeDone.value) return '任务①发电机'
  return '未交易'
})

const puppetDefeated = computed(() => Boolean(game.flags.giantPuppetDefeated))
const generatorPending = computed(() => Boolean(game.flags.generatorPending))
const rocketBadges = computed(() => doctorBadges.value)
const rocketCompanionsReady = computed(() => {
  return ROCKET.companionFlags.every((flag) => Boolean(game.flags[flag]))
})
const rocketTag = computed(() => {
  if (spaceportBlown.value) return '已爆破'
  if (!puppetDefeated.value) return '傀儡堵门'
  if (rocketBadges.value < ROCKET.badgeIds.length) return '维修中'
  return '已就绪'
})

// 当前地图可进入的选项卡片
const fieldMenu = computed(() => {
  if (isPolice.value) {
    return [
      {
        id: 'helicopter',
        name: '老旧直升机',
        desc: '修复后可从警局天台飞往末日飞行船。',
        tag: helicopterRepaired.value ? '已修复' : '未修复',
      },
      {
        id: 'dummy',
        name: '假人训练',
        desc: `${dummyTraining.name}：1 回合、${dummyTraining.cost} 清洁度，每天 ${dummyLimit.value} 次。`,
        tag: dummyFull.value ? '已满级' : `剩余 ${dummyLeft.value}/${dummyLimit.value}`,
      },
    ]
  }
  if (isVillage.value) {
    return [
      {
        id: 'orchard',
        name: '果园采摘',
        desc: `随机水果 ×${ORCHARD.quantity}，同一片果园要缓上几天。`,
        tag: orchardLeft.value > 0 ? `冷却 ${orchardLeft.value} 天` : '可采摘',
      },
      {
        id: 'harvest',
        name: '清理杂草',
        desc: `${harvestTraining.name}：1 回合、耐久 ${harvestTraining.cost}，每天 ${harvestLimit.value} 次。`,
        tag: harvestFull.value ? '已满级' : `剩余 ${harvestLeft.value}/${harvestLimit.value}`,
      },
      {
        id: 'seed',
        name: '腐烂种子',
        desc: '塌掉的果箱底下压着一条隐藏线索。',
        tag: seedPlanted.value
          ? '已完成'
          : seedSprouted.value
            ? '育苗中'
            : seedFound.value
              ? '已拾取'
              : '未发现',
      },
    ]
  }
  if (isCamp.value) {
    return [
      {
        id: 'barbecue',
        name: '奇怪烧烤',
        desc: '来路不明的烤肉，每天只能吃一次。',
        tag: barbecueLeft.value > 0 ? '今日已吃' : '每日一次',
      },
      {
        id: 'masan',
        name: '冷面阿三',
        desc: '烧烤摊老板，递上他想要的东西。',
        tag: maSanKilled.value
          ? '已击杀'
          : !ateStrangeMeat.value
            ? '未接触'
            : maSanStage.value === 3
              ? '后厨邀请'
              : `第 ${maSanStage.value + 1} 段`,
      },
    ]
  }
  if (isMarket.value) {
    return [
      {
        id: 'mermaid',
        name: '人鱼公主',
        desc: '用饮品换回她需要的治疗。',
        tag: mermaidDead.value
          ? '已死亡'
          : mermaidDone.value
            ? '已愈合'
            : mermaidStage.value === 0
              ? '未愈合'
              : `第 ${mermaidStage.value + 1} / ${mermaidStageCount.value} 段`,
      },
      {
        id: 'dev',
        name: devNpc.value?.name ?? '游戏开发者',
        desc: '一次性补给、背包扩容与生死角斗。',
        tag: devMenuTag.value,
      },
    ]
  }
  if (isCore.value) {
    return [
      {
        id: 'yanran',
        name: '半感染者嫣然',
        desc: '限时营救，成功后可加入队伍。',
        tag: yanranKilled.value
          ? '已击杀'
          : yanranRescued.value
            ? '已入队'
            : yanranMutated.value
              ? '已变异'
              : yanranSeen.value
                ? `剩余 ${yanranDays.value} 天`
                : '未接触',
      },
      {
        id: 'garage',
        name: '地下车库',
        desc: '撬棍、车钥匙与汽油，通往城外。',
        tag: garageDeparted.value
          ? '已出发'
          : !garageUnlocked.value
            ? '未解锁'
            : !garageOpened.value
              ? '门未开'
              : !garageKeyFound.value
                ? '找钥匙'
                : gasolineCount.value < GARAGE.gasolineCount
                  ? '凑汽油'
                  : '可以出发',
      },
    ]
  }
  if (isHospital.value) {
    return [
      {
        id: 'lulu',
        name: '饥饿丧尸露露',
        desc: '用罐头把她换回来。',
        tag: luluRescued.value ? '已入队' : '未投喂',
      },
    ]
  }
  if (isLab.value) {
    return [
      {
        id: 'doctor',
        name: '陈博士',
        desc: '抗感染针换 M700，以及火箭的三枚徽章。',
        tag: doctorTag.value,
      },
    ]
  }
  if (isBarracks.value) {
    return [
      {
        id: 'mafei',
        name: '马斐',
        desc: '名单上的委托与最后的第十二份。',
        tag: mafeiKilled.value ? '已死亡' : '名单',
      },
      {
        id: 'craft',
        name: '合成炸药',
        desc: '在营房后面合成高能炸药。',
        tag: mafeiKilled.value
          ? '已停止'
          : mafeiQuest10Done.value
            ? '可合成'
            : '未解锁',
      },
    ]
  }
  if (isSpaceport.value) {
    const items = [
      {
        id: 'rocket',
        name: '发射中心',
        desc: '傀儡、徽章与最后的发射。',
        tag: rocketTag.value,
      },
    ]
    if (mafeiQuest11Active.value || spaceportBlown.value) {
      items.push({
        id: 'blow',
        name: '爆破发射架',
        desc: '马斐的最终委托：让火箭再也飞不起来。',
        tag: spaceportBlown.value ? '已爆破' : '等待引爆',
      })
    }
    return items
  }
  if (isHarbor.value) {
    return [
      {
        id: 'cruise',
        name: '巨型邮轮',
        desc: '亚历克斯船长的十档启航任务。',
        tag: alexTag.value,
      },
      {
        id: 'deep-sea',
        name: '潜入深海',
        desc: '变异海洋生物、氧气与深海掉落。',
        tag: '可下潜',
      },
    ]
  }
  return []
})

onMounted(() => {
  if (battle.finished) resetBattle()
})

function abilityLabel(key) {
  return ZOMBIE_ABILITY_LABELS[key] ?? key
}

function explore() {
  const result = exploreField(game.location)
  if (!result) return

  feed.value = result.line
  if (!result.zombie) return

  if (startFieldCombat(result.zombie, game.location)) {
    feed.value = result.line
  }
}

function run(action) {
  const line = action()
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (line) feed.value = line
}

function travelToAirship() {
  const line = flyToAirship()
  if (game.location !== HELICOPTER.mapId) {
    feed.value = line
    emit('travel')
    return
  }
  if (line) feed.value = line
}

function fightMaSan() {
  if (game.dead || battle.active) return
  advanceTurns(1)
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (startFieldCombat(MA_SAN.enemy, game.location, 'npc')) {
    feed.value = '阿三抄起砧板边的 AKM。你抢先扑了上去。'
  }
}

function fightYanran() {
  if (game.dead || battle.active) return
  advanceTurns(1)
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (startFieldCombat(YANRAN.enemy, game.location, 'yanran')) {
    feed.value = '她抬起眼，喉咙里只剩不像人的气音。你握紧了武器。'
  }
}

function fightPuppet() {
  if (game.dead || battle.active) return
  advanceTurns(1)
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (startFieldCombat(GIANT_PUPPET.enemy, game.location, 'puppet')) {
    feed.value = GIANT_PUPPET.intro
  }
}

function startDevDuel() {
  if (game.dead || battle.active) return
  if (game.flags[DEV_SHOP.duel.doneFlag]) {
    feed.value = '这场生死角斗已经结束了。'
    return
  }
  if (!canStoreItems(game.inventory, [{ id: DEV_SHOP.duel.rewardItemId, qty: 1 }])) {
    feed.value = '背包至少要留一格，才能带走角斗的奖品。'
    return
  }

  advanceTurns(1)
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  const dev = devNpc.value
  if (!dev) return
  if (startFieldCombat(dev, DEV_SHOP.mapId, 'dev-duel')) {
    feed.value = dev.duelIntro
  }
}

function startMutiny() {
  if (game.dead || battle.active) return
  const line = startHarborMutiny()
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (line) feed.value = line
}

function startDive() {
  if (game.dead || battle.active) return
  const line = startSeaDive()
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (line) feed.value = line
}

function battleDone() {
  if (battle.kind === 'deep-sea') {
    const summary = battle.summary
    resetBattle()
    feed.value = summary || '你浮回海面，氧气表重新归零。'
    return
  }

  if (battle.kind === 'mutiny') {
    const summary = battle.summary
    if (battle.mutinyNext && continueHarborMutiny()) return
    resetBattle()
    feed.value = summary || '甲板安静下来。'
    return
  }

  const wasMaSan = battle.kind === 'npc'
  const wasYanran = battle.kind === 'yanran'
  const wasPuppet = battle.kind === 'puppet'
  const wasAssassination = battle.kind === 'assassination'
  const wasDuel = battle.kind === 'dev-duel'
  const assassinationSummary = battle.summary
  const duelSummary = battle.summary
  const yanranKilled = Boolean(game.flags.yanranKilled)
  const puppetKilled = Boolean(game.flags.giantPuppetDefeated)
  resetBattle()
  if (wasAssassination) {
    feed.value = assassinationSummary || '目标倒下了。'
    return
  }
  if (wasDuel) {
    feed.value = duelSummary || '你赢下了这场生死角斗。'
    return
  }
  if (wasMaSan && game.flags.maSanKilled) {
    feed.value = '烧烤摊安静下来。你在砧板旁站了一会儿，把 AKM 收进背包。'
    return
  }
  if (wasYanran) {
    feed.value = yanranKilled
      ? YANRAN.killedLine
      : '你退出了商场深处，身后那声嘶吼没有追上来。'
    return
  }
  if (wasPuppet) {
    feed.value = puppetKilled
      ? GIANT_PUPPET.victoryLine
      : GIANT_PUPPET.fleeLine
    return
  }
  feed.value = '你收起武器，继续沿着这片区域搜寻。'
}

function closePanel() {
  if (battle.active) {
    notify('战斗中无法离开：先逃跑，或者把它打倒')
    return
  }
  if (battle.kind === 'mutiny' && battle.mutinyNext) {
    notify('船员还堵着舷梯，必须先迎战下一位')
    return
  }
  if (battle.finished) resetBattle()
  emit('close')
}
</script>

<template>
  <ModalShell
    v-if="map"
    :title="map.name"
    :sub="`${map.level} · ${map.difficulty} · 第 ${game.day} 天 · ${currentPhase}`"
    wide
    :bg="mapBackground(game.location)"
    @close="closePanel"
  >
    <template #hud>
      <StatusHud />
    </template>

    <section v-if="battle.active || battle.finished" class="pane">
      <header class="pane__head">
        <h3 class="pane__title">遭遇战</h3>
      </header>
      <BattleView @done="battleDone" />
    </section>

    <section v-else class="pane">
      <template v-if="view === 'menu'">
        <p class="pane__desc">{{ map.desc }}</p>

        <div class="chips">
          <span>遭遇率 {{ encounterPercent }}%</span>
          <span>探索掉落：{{ lootText }}</span>
          <span>武器品质：{{ rarityLabel }}</span>
          <span>{{ map.lootNote }}</span>
        </div>

        <MapMenuList :items="fieldMenu" @select="view = $event.id" />
      </template>

      <template v-else>
        <div class="bar">
          <button type="button" class="btn" @click="view = 'menu'">← 返回选项</button>
        </div>

        <article v-if="view === 'helicopter'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">老旧直升机</h4>
            <span class="extra__tag">{{ helicopterRepaired ? '已修复' : '未修复' }}</span>
          </header>
          <p class="extra__desc">
            {{ helicopterRepaired ? HELICOPTER.repairedLine : HELICOPTER.desc }}
          </p>
          <div class="chips">
            <span>汽油 {{ helicopterGasoline }} / {{ HELICOPTER.repairGasoline }}</span>
            <span>修复 消耗 {{ HELICOPTER.repairGasoline }} 汽油</span>
            <span>前往 消耗 {{ HELICOPTER.travelGasoline }} 汽油</span>
            <span>目的地：末日飞行船</span>
          </div>
          <div class="extra__actions">
            <button
              type="button"
              class="btn btn--primary"
              :disabled="helicopterRepaired || helicopterGasoline < HELICOPTER.repairGasoline"
              @click="run(repairHelicopter)"
            >
              {{
                helicopterRepaired
                  ? '直升机已修复'
                  : `修复 · ${HELICOPTER.repairGasoline} 汽油`
              }}
            </button>
            <button
              type="button"
              class="btn"
              :disabled="!helicopterRepaired || helicopterGasoline < HELICOPTER.travelGasoline"
              @click="travelToAirship"
            >
              {{
                !helicopterRepaired
                  ? '修复后才能前往'
                  : `前往末日飞行船 · ${HELICOPTER.travelGasoline} 汽油`
              }}
            </button>
          </div>
        </article>

        <article v-else-if="view === 'dummy'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">假人训练 · 树脂假人</h4>
            <span class="extra__tag">{{ dummyFull ? '已满级' : `Lv ${dummyLevel}` }}</span>
          </header>
          <p class="extra__desc">{{ dummyTraining.desc }}</p>
          <div class="chips">
            <span>
              装备：{{ dummyRangedItem?.name || '未装备远程武器' }}
              {{ dummyFits ? '（合格）' : '（不合格）' }}
            </span>
            <span>清洁度 {{ dummyCleanliness }}</span>
            <span>今日剩余 {{ dummyLeft }} / {{ dummyLimit }} 次</span>
            <span>消耗 清洁度 {{ dummyTraining.cost }} · 1 回合</span>
            <span>进度 +{{ dummyTraining.progressMin }}%–{{ dummyTraining.progressMax }}%</span>
          </div>
          <div class="dummy-bar"><i :style="{ width: `${dummyProgress}%` }" /></div>
          <p class="extra__desc">
            熟练度 {{ dummyProgress }}% · {{ dummyTitle }} · {{ dummyEffectText }}
          </p>
          <p v-if="dummyBlocked" class="extra__desc">{{ dummyBlocked }}</p>
          <p v-else-if="!isTalentActive('assault')" class="extra__desc">
            「突击天赋」尚未启用，请到天赋页占用一个启用位。
          </p>
          <div class="extra__actions">
            <button
              type="button"
              class="btn btn--primary"
              :disabled="Boolean(dummyBlocked)"
              @click="trainDummy"
            >
              {{ dummyFull ? '已满级' : '训练 · 1 回合' }}
            </button>
          </div>
        </article>

        <article v-else-if="view === 'cruise'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">巨型邮轮</h4>
            <span class="extra__tag">{{ alexTag }}</span>
          </header>

          <div v-if="!alexKilled" class="mutiny-start">
            <p class="extra__desc">
              舷梯下的船员已经堵住退路。动手之后要连续打穿九名死士，才能见到船长。
            </p>
            <button
              type="button"
              class="btn extra__deadly mutiny-start__btn"
              :disabled="battle.active"
              @click="startMutiny"
            >
              杀害船长
            </button>
          </div>

          <NpcIntro npc-id="alex">
            <p class="extra__desc">
              {{ alexKilled ? npcById('alex').deathLine : QUEST_OWNERS.alex.intro }}
            </p>
          </NpcIntro>
          <div class="chips">
            <span>长任务线 {{ alexQuestDone }} / {{ ALEX_QUESTS.length }}</span>
            <span>最终奖励：结局「远洋航行」</span>
          </div>
          <QuestLinePanel v-if="!alexKilled" owner="alex" @feedback="feed = $event" />
        </article>

        <article v-else-if="view === 'deep-sea'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">潜入深海</h4>
            <span class="extra__tag">{{ mermaidBlessed ? '人鱼祝福' : '普通潜水' }}</span>
          </header>
          <p class="extra__desc">
            邮轮残骸外侧是一片沉没的城区。海床上的东西已经不再是原来的样子，水压和黑暗都让它们变了形。
          </p>
          <div class="chips">
            <span>氧气 {{ seaOxygenMax }}</span>
            <span>近战每次 -{{ SEA_OXYGEN_COST }} 氧气</span>
            <span>远程禁用</span>
            <span>逃跑 {{ mermaidBlessed ? '80%' : '50%' }}</span>
          </div>
          <div class="sea-tiers">
            <div v-for="tier in SEA_TIERS" :key="tier.id" class="sea-tier">
              <span class="sea-tier__rate">
                {{ tier.name }} {{ Math.round(tier.rate * 100) }}%
              </span>
              <span class="sea-tier__names">
                {{ tier.creatures.map((creature) => creature.name).join(' / ') }}
              </span>
            </div>
          </div>
          <p class="cure__note">
            {{
              mermaidBlessed
                ? '人鱼的祝福仍在你身上，氧气上限为 200。'
                : '完成人鱼传说后，氧气上限会提升到 200。'
            }}
          </p>
          <p class="extra__desc">
            普通海生物掉落变异鱼肉；冥渊沧龙掉落沧龙鳞片。氧气耗尽会溺水。
          </p>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="battle.active"
            @click="startDive"
          >
            下潜 · 1 回合
          </button>
        </article>

        <article v-else-if="view === 'harvest'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">清理杂草 · 镰刀</h4>
            <span class="extra__tag">{{ harvestFull ? '已满级' : `Lv ${harvestLevel}` }}</span>
          </header>
          <p class="extra__desc">{{ harvestTraining.desc }}</p>
          <div class="chips">
            <span>
              装备：{{ harvestMeleeItem?.name || '未装备近战武器' }}
              {{ harvestFits ? '（合格）' : '（不合格）' }}
            </span>
            <span>耐久 {{ harvestDurability }}</span>
            <span>今日剩余 {{ harvestLeft }} / {{ harvestLimit }} 次</span>
            <span>消耗 耐久 {{ harvestTraining.cost }} · 1 回合</span>
            <span>进度 +{{ harvestTraining.progressMin }}%–{{ harvestTraining.progressMax }}%</span>
          </div>
          <div class="dummy-bar"><i :style="{ width: `${harvestProgress}%` }" /></div>
          <p class="extra__desc">
            熟练度 {{ harvestProgress }}% · {{ harvestTitle }} · {{ harvestEffectText }}
          </p>
          <p v-if="harvestBlocked" class="extra__desc">{{ harvestBlocked }}</p>
          <p v-else-if="!isTalentActive('harvest')" class="extra__desc">
            「收割天赋」尚未启用，请到天赋页占用一个启用位。
          </p>
          <div class="extra__actions">
            <button
              type="button"
              class="btn btn--primary"
              :disabled="Boolean(harvestBlocked)"
              @click="trainHarvest"
            >
              {{ harvestFull ? '已满级' : '训练 · 1 回合' }}
            </button>
          </div>
        </article>

        <article v-else-if="view === 'orchard'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">果园采摘</h4>
            <span class="extra__tag">
              {{ orchardLeft > 0 ? `冷却 ${orchardLeft} 天` : '可采摘' }}
            </span>
          </header>
          <p class="extra__desc">
            果树还挂着没人摘的果子。一次能装满九只口袋，但同一片果园要缓上几天。
          </p>
          <div class="chips">
            <span>随机水果 ×{{ ORCHARD.quantity }}</span>
            <span>消耗 {{ ORCHARD.turns }} 回合</span>
            <span>冷却 {{ ORCHARD.cooldownDays }} 天</span>
          </div>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="orchardLeft > 0"
            @click="run(pickOrchard)"
          >
            {{ orchardLeft > 0 ? `还要等 ${orchardLeft} 天` : '采摘 · 1 回合' }}
          </button>
        </article>

        <article v-else-if="view === 'seed'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">腐烂种子</h4>
            <span class="extra__tag">
              {{
                seedPlanted
                  ? '已完成'
                  : seedSprouted
                    ? '育苗中'
                    : seedFound
                      ? '已拾取'
                      : '未发现'
              }}
            </span>
          </header>
          <p class="extra__desc">
            <template v-if="seedPlanted">
              田里的果苗已经长起来了。苗苗说，等第一批果子熟，她会留一篮给你。
            </template>
            <template v-else-if="seedSprouted">
              果苗在苗苗手里。回果园再摘 {{ ROTTEN_SEED.plantFruits }} 份水果，然后去曙光阵地移栽。
            </template>
            <template v-else-if="seedFound && hasSeed">
              那枚腐烂种子在背包里。去曙光阵地找苗苗，她要 {{ ROTTEN_SEED.sproutFruits }} 份水果育苗。
            </template>
            <template v-else-if="seedFound">
              种子不在背包里。果箱还没翻完，可以再找一次。
            </template>
            <template v-else>
              塌掉的果箱底下压着什么东西，凑近能闻到一股烂透的甜味。
            </template>
          </p>
          <div v-if="!seedPlanted && !seedSprouted && !hasSeed" class="chips">
            <span>消耗 1 回合</span>
            <span>隐藏剧情</span>
          </div>
          <button
            v-if="!seedPlanted && !seedSprouted && !hasSeed"
            type="button"
            class="btn btn--primary extra__action"
            @click="run(takeRottenSeed)"
          >
            翻找果箱 · 1 回合
          </button>
        </article>

        <article v-else-if="view === 'barbecue'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">奇怪烧烤</h4>
            <span class="extra__tag">
              {{ barbecueLeft > 0 ? '今日已吃' : '每日一次' }}
            </span>
          </header>
          <p class="extra__desc">
            铁架上串着几块来路不明的肉，油脂滴进火里，腾起一股说不清道不明的香。
          </p>
          <div class="chips">
            <span>饱食 +{{ STRANGE_BARBECUE.effects.hunger }}</span>
            <span>水分 +{{ STRANGE_BARBECUE.effects.thirst }}</span>
            <span>体力 {{ STRANGE_BARBECUE.effects.stamina }}</span>
            <span>感染 +{{ STRANGE_BARBECUE.effects.infection }}</span>
          </div>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="barbecueLeft > 0"
            @click="run(eatStrangeBarbecue)"
          >
            {{ barbecueLeft > 0 ? '今天这炉收摊了' : '吃一串 · 1 回合' }}
          </button>
        </article>

        <article v-else-if="view === 'masan'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">冷面阿三</h4>
            <span class="extra__tag">
              {{
                maSanKilled
                  ? '已击杀'
                  : !ateStrangeMeat
                    ? '未接触'
                    : maSanStage === 3
                      ? '后厨邀请'
                      : `第 ${maSanStage + 1} 段`
              }}
            </span>
          </header>
          <NpcIntro npc-id="ma-san">
            <p class="extra__desc">
              {{ MA_SAN.intro }}
              <q>{{ maSanLine }}</q>
            </p>
          </NpcIntro>
          <div v-if="ateStrangeMeat && !maSanKilled" class="chips">
            <span v-if="maSanStage === 0">白威啤酒 {{ beerCount }} / {{ MA_SAN.beerCount }}</span>
            <span v-else-if="maSanStage === 1">水果 {{ fruitCount }} / {{ MA_SAN.fruitCount }}</span>
            <span v-else-if="maSanStage === 2">烈酒 {{ spiritCount }} / {{ MA_SAN.spiritCount }}</span>
            <span v-else>接受邀请将结束本局</span>
          </div>
          <button
            v-if="ateStrangeMeat && !maSanKilled && maSanStage === 0"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="beerCount < MA_SAN.beerCount"
            @click="run(deliverMaSanBeer)"
          >
            递上 {{ MA_SAN.beerCount }} 罐白威啤酒
          </button>
          <button
            v-else-if="ateStrangeMeat && !maSanKilled && maSanStage === 1"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="fruitCount < MA_SAN.fruitCount"
            @click="run(deliverMaSanFruit)"
          >
            递上 {{ MA_SAN.fruitCount }} 份水果
          </button>
          <button
            v-else-if="ateStrangeMeat && !maSanKilled && maSanStage === 2"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="spiritCount < MA_SAN.spiritCount"
            @click="run(deliverMaSanSpirit)"
          >
            递上 {{ MA_SAN.spiritCount }} 瓶烈酒
          </button>
          <div
            v-else-if="ateStrangeMeat && !maSanKilled && maSanStage === 3"
            class="extra__actions"
          >
            <button
              type="button"
              class="btn extra__deadly"
              @click="run(acceptMaSanInvite)"
            >
              接受邀请（⚠ 这将改变你的命运）
            </button>
            <button type="button" class="btn extra__action" @click="fightMaSan">
              拒绝，动手
            </button>
          </div>

          <AssassinationCard npc-id="ma-san" @feedback="feed = $event" />
        </article>

        <article v-else-if="view === 'mafei'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">马斐</h4>
            <span class="extra__tag">{{ mafeiKilled ? '已死亡' : '名单' }}</span>
          </header>
          <NpcIntro npc-id="mafei">
            <p class="extra__desc">
              {{ mafeiKilled ? MAFEI.killedLine : MAFEI.intro }}
              <q v-if="!mafeiKilled">{{ MAFEI.whisperLine }}</q>
            </p>
          </NpcIntro>
          <div v-if="!mafeiKilled" class="chips">
            <span>高能炸药 {{ explosiveCount }} 块</span>
            <span>任务十{{ mafeiQuest10Done ? '已完成' : '未完成' }}</span>
          </div>
          <QuestLinePanel v-if="!mafeiKilled" owner="mafei" @feedback="feed = $event" />
        </article>

        <article v-else-if="view === 'craft'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">合成炸药</h4>
            <span class="extra__tag">
              {{ mafeiKilled ? '已停止' : mafeiQuest10Done ? '可合成' : '未解锁' }}
            </span>
          </header>
          <p class="extra__desc">{{ MAFEI.craftLine }}</p>
          <div class="chips">
            <span>{{ MAFEI.craftTurns }} 回合 / 块</span>
            <span>回合正常衰减</span>
            <span>高能炸药 {{ explosiveCount }}</span>
          </div>
          <button
            type="button"
            class="btn btn--primary extra__action"
            :disabled="!mafeiQuest10Done || mafeiKilled"
            @click="run(craftHighExplosive)"
          >
            {{
              mafeiQuest10Done
                ? `合成 1 块 · ${MAFEI.craftTurns} 回合`
                : '完成马斐任务十后解锁'
            }}
          </button>
        </article>

        <article v-else-if="view === 'mermaid'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">人鱼公主</h4>
            <span class="extra__tag">
              {{
                mermaidDead
                  ? '已死亡'
                  : mermaidDone
                    ? '已愈合'
                    : mermaidStage === 0
                      ? '未愈合'
                      : `第 ${mermaidStage + 1} / ${mermaidStageCount} 段`
              }}
            </span>
          </header>
          <NpcIntro npc-id="mermaid">
            <p class="extra__desc">
              <template v-if="mermaidDead">水族箱里已经没有动静，只剩一层发白的盐霜。</template>
              <template v-else-if="mermaidDone">她只留下一道水痕，和那柄三叉戟。</template>
              <template v-else>
                {{ MERMAID.intro }}
                <q v-if="mermaidHint">{{ mermaidHint }}</q>
              </template>
            </p>
          </NpcIntro>
          <div v-if="!mermaidDead" class="chips">
            <template v-if="mermaidDone">
              <span>已获得 {{ mermaidRewardName }}</span>
            </template>
            <template v-else>
              <span>{{ mermaidCurrentName }} {{ mermaidOwned }} / {{ mermaidNeedCount }}</span>
              <span>消耗 {{ MERMAID.turns }} 回合</span>
            </template>
          </div>
          <button
            v-if="!mermaidDone && !mermaidDead"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="mermaidOwned < mermaidNeedCount"
            @click="run(submitMermaidDrink)"
          >
            提交 {{ mermaidCurrentName }} ×{{ mermaidNeedCount }}
          </button>

          <AssassinationCard npc-id="mermaid" @feedback="feed = $event" />
        </article>

        <article v-else-if="view === 'dev'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">游戏开发者</h4>
            <span class="extra__tag">{{ devMenuTag }}</span>
          </header>
          <NpcIntro npc-id="game-developer">
            <p class="extra__desc">
              {{ devNpc?.shopIntro }}
              <q>{{ devNpc?.shopLine }}</q>
            </p>
          </NpcIntro>

          <div class="dev-gift">
            <header class="extra__head">
              <h4 class="extra__title">领取新手礼包</h4>
              <span class="extra__tag">{{ noviceGiftTaken ? '已领取' : '一次性' }}</span>
            </header>
            <div class="chips">
              <span>末日币 +{{ DEV_SHOP.noviceCoins }}</span>
              <span>曙光币 +{{ DEV_SHOP.noviceDawnCoins }}</span>
              <span>万能灵药 ×5</span>
              <span>抗感染针 ×5</span>
              <span>豆类罐头 ×30</span>
              <span>越蔓梅 ×30</span>
              <span>战术匕首 ×1</span>
              <span>Glock ×1</span>
            </div>
            <p v-if="noviceGiftTaken" class="extra__desc">
              新手礼包已经在你包里了。
            </p>
            <button
              v-else
              type="button"
              class="btn btn--primary extra__action"
              @click="run(takeDevNoviceGift)"
            >
              领取新手礼包
            </button>
          </div>

          <div class="dev-gift">
            <header class="extra__head">
              <h4 class="extra__title">领取骑士礼包</h4>
              <span class="extra__tag">{{ knightGiftTaken ? '已领取' : '一次性' }}</span>
            </header>
            <div class="chips">
              <span>骑士徽章 ×1</span>
              <span>白兰地 ×10</span>
            </div>
            <p v-if="knightGiftTaken" class="extra__desc">
              骑士徽章已经在你身上了。
            </p>
            <button
              v-else
              type="button"
              class="btn btn--primary extra__action"
              @click="run(takeDevKnightGift)"
            >
              领取骑士礼包
            </button>
          </div>

          <div class="dev-gift">
            <header class="extra__head">
              <h4 class="extra__title">领取治疗礼包</h4>
              <span class="extra__tag">{{ healingGiftTaken ? '已领取' : '一次性' }}</span>
            </header>
            <div class="chips">
              <span>绷带 ×10</span>
              <span>止痛药 ×10</span>
              <span>止血带 ×10</span>
            </div>
            <p v-if="healingGiftTaken" class="extra__desc">
              一箱医疗物资已经塞进你的背包。
            </p>
            <button
              v-else
              type="button"
              class="btn btn--primary extra__action"
              @click="run(takeDevHealingGift)"
            >
              领取治疗礼包
            </button>
          </div>

          <div class="dev-gift">
            <header class="extra__head">
              <h4 class="extra__title">领取糖果礼包</h4>
              <span class="extra__tag">{{ candyGiftTaken ? '已领取' : '一次性' }}</span>
            </header>
            <div class="chips">
              <span>开发者糖果 ×10</span>
              <span>每颗饱食 +100</span>
              <span>不进入任何掉落池</span>
            </div>
            <p v-if="candyGiftTaken" class="extra__desc">
              一袋糖果已经塞进你的背包。
            </p>
            <button
              v-else
              type="button"
              class="btn btn--primary extra__action"
              @click="run(takeDevCandyGift)"
            >
              领取糖果礼包
            </button>
          </div>

          <div class="dev-expand">
            <header class="extra__head">
              <h4 class="extra__title">我要扩容背包</h4>
              <span class="extra__tag">背包 {{ bagSize }} / {{ DEV_SHOP.expandLimit }} 格</span>
            </header>
            <p class="extra__desc">
              每次加 {{ DEV_SHOP.expandSteps }} 格，按当前容量分段收费：20-50 格 5+5，50-100 格 8+8，
              100-150 格 10+10，150-200 格 15+15（末日币 + 曙光币）。
            </p>
            <button
              type="button"
              class="btn extra__action"
              :disabled="!canExpand"
              @click="run(expandBackpack)"
            >
              {{ bagFull ? '已达容量上限' : `扩容 +${DEV_SHOP.expandSteps} 格（${expandPrice.coins} + ${expandPrice.dawnCoins}）` }}
            </button>
          </div>

          <div class="dev-gift">
            <header class="extra__head">
              <h4 class="extra__title">进行生死角斗</h4>
              <span class="extra__tag">{{ devDuelWon ? '已获胜' : '99999 生命' }}</span>
            </header>
            <p class="extra__desc">{{ devNpc?.description }}</p>
            <div class="chips">
              <span>对手生命 {{ devNpc?.hp }}</span>
              <span>攻击 {{ devNpc?.attack }}</span>
              <span>消耗 1 回合</span>
              <span>胜利掉落：十字剑-圣战</span>
            </div>
            <p v-if="devDuelWon" class="extra__desc">
              角斗结束，十字剑-圣战已经在你手里。
            </p>
            <button
              v-else
              type="button"
              class="btn btn--primary extra__action"
              :disabled="battle.active"
              @click="startDevDuel"
            >
              开始角斗 · 1 回合
            </button>
          </div>
        </article>

        <article v-else-if="view === 'yanran'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">半感染者嫣然</h4>
            <span class="extra__tag">
              {{
                yanranKilled
                  ? '已击杀'
                  : yanranRescued
                    ? '已入队'
                    : yanranMutated
                      ? '已变异'
                      : yanranSeen
                        ? `剩余 ${yanranDays} 天`
                        : '未接触'
              }}
            </span>
          </header>
          <NpcIntro npc-id="yanran">
            <p class="extra__desc">
              <template v-if="yanranRescued">嫣然在安全屋等你。</template>
              <template v-else-if="yanranKilled">{{ YANRAN.killedLine }}</template>
              <template v-else-if="yanranMutated">{{ YANRAN.lostLine }}</template>
              <template v-else>{{ YANRAN.intro }}</template>
            </p>
          </NpcIntro>
          <div
            v-if="yanranSeen && !yanranRescued && !yanranMutated && !yanranKilled"
            class="chips"
          >
            <span>抗感染针 {{ serumCount }} / {{ YANRAN.serumCount }}</span>
          </div>
          <div v-if="yanranRescued" class="chips">
            <span>战斗助战：30% 追伤 20</span>
          </div>
          <button
            v-if="!yanranSeen && !yanranRescued && !yanranKilled"
            type="button"
            class="btn btn--primary extra__action"
            @click="run(approachYanran)"
          >
            靠近查看 · 1 回合
          </button>
          <button
            v-else-if="yanranSeen && !yanranRescued && !yanranMutated && !yanranKilled"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="serumCount < YANRAN.serumCount"
            @click="run(rescueYanran)"
          >
            注射 {{ YANRAN.serumCount }} 支 · 1 回合
          </button>
          <button
            v-else-if="yanranMutated && !yanranKilled"
            type="button"
            class="btn extra__deadly"
            @click="fightYanran"
          >
            迎战变异的嫣然 · 1 回合
          </button>
        </article>

        <article v-else-if="view === 'garage'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">地下车库</h4>
            <span class="extra__tag">
              {{
                garageDeparted
                  ? '已出发'
                  : !garageUnlocked
                    ? '未解锁'
                    : !garageOpened
                      ? '门未开'
                      : !garageKeyFound
                        ? '找钥匙'
                        : gasolineCount < GARAGE.gasolineCount
                          ? '凑汽油'
                          : '可以出发'
              }}
            </span>
          </header>
          <p class="extra__desc">
            <template v-if="garageDeparted">{{ GARAGE.departedLine }}</template>
            <template v-else-if="!garageUnlocked">{{ GARAGE.lockedLine }}</template>
            <template v-else>{{ GARAGE.intro }}</template>
          </p>
          <div v-if="garageUnlocked && !garageDeparted" class="chips">
            <span>汽油 {{ gasolineCount }} / {{ GARAGE.gasolineCount }}</span>
            <span v-if="garageOpened">每 2 回合 +1 桶</span>
            <span v-if="!garageKeyFound">车钥匙 未找到</span>
            <span v-if="!garageOpened && !hasCrowbar">需要装备撬棍</span>
          </div>
          <template v-if="garageUnlocked && !garageDeparted">
            <button
              v-if="!garageOpened"
              type="button"
              class="btn btn--primary extra__action"
              :disabled="!hasCrowbar"
              @click="run(openGarageDoor)"
            >
              撬开卷帘门 · 1 回合
            </button>
            <button
              v-else-if="!garageKeyFound"
              type="button"
              class="btn btn--primary extra__action"
              @click="run(searchGarageKey)"
            >
              翻找车钥匙 · 1 回合
            </button>
            <button
              v-else-if="gasolineCount < GARAGE.gasolineCount"
              type="button"
              class="btn btn--primary extra__action"
              @click="run(stealGarageGasoline)"
            >
              偷取汽油 · 2 回合
            </button>
            <button
              v-else
              type="button"
              class="btn btn--primary extra__action"
              @click="run(elopeGarage)"
            >
              出发 · 私奔
            </button>
          </template>
          <template v-if="garageDeparted">
            <div class="chips">
              <span>汽油 {{ gasolineCount }}</span>
              <span>每 2 回合 +1 桶</span>
            </div>
            <button
              type="button"
              class="btn btn--primary extra__action"
              @click="run(stealGarageGasoline)"
            >
              偷取汽油 · 2 回合
            </button>
          </template>
        </article>

        <article v-else-if="view === 'lulu'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">饥饿丧尸露露</h4>
            <span class="extra__tag">{{ luluRescued ? '已入队' : '未投喂' }}</span>
          </header>
          <NpcIntro npc-id="lulu">
            <p class="extra__desc">
              {{ luluRescued ? LULU.rescuedLine : LULU.intro }}
            </p>
          </NpcIntro>
          <div class="chips">
            <span>罐头 {{ cans }} / {{ LULU.cannedCount }}</span>
            <span v-if="!luluRescued">消耗 1 回合</span>
            <span v-else>每场胜利回血 20</span>
          </div>
          <button
            v-if="!luluRescued"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="cans < LULU.cannedCount"
            @click="run(feedLulu)"
          >
            一次放下 {{ LULU.cannedCount }} 个罐头
          </button>
        </article>

        <article v-else-if="view === 'doctor'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">陈博士</h4>
            <span class="extra__tag">{{ doctorTag }}</span>
          </header>
          <NpcIntro npc-id="doctor">
            <p class="extra__desc">
              <template v-if="doctorDead">{{ npcById('doctor').deathLine }}</template>
              <template v-else-if="doctorReady">{{ DOCTOR.readyLine }}</template>
              <template v-else-if="!doctorTradeDone">{{ DOCTOR.intro }}</template>
              <template v-else-if="!puppetDefeated">{{ DOCTOR.needPuppetLine }}</template>
              <template v-else-if="!doctorQuest1Done">{{ DOCTOR.quest1Line }}</template>
              <template v-else-if="!doctorQuest2Done">{{ DOCTOR.quest2Line }}</template>
              <template v-else>{{ DOCTOR.quest3Line }}</template>
            </p>
          </NpcIntro>

          <template v-if="!doctorDead">
          <div class="chips">
            <template v-if="doctorReady">
              <span v-for="id in DOCTOR.badges" :key="id">{{ getItem(id)?.name }}</span>
            </template>
            <template v-else-if="!doctorTradeDone">
              <span>抗感染针 {{ serumCount }} / {{ DOCTOR.serumCount }}</span>
              <span>奖励：M700</span>
            </template>
            <template v-else-if="!doctorQuest1Done">
              <span>小核能发电机 {{ generatorOwned ? 1 : 0 }} / 1</span>
              <span v-if="generatorPending">遗落在发射中心</span>
            </template>
            <template v-else-if="!doctorQuest2Done">
              <span>纯净能源 {{ energyCount }} / {{ DOCTOR.energyCount }}</span>
              <span>{{ energyLeft > 0 ? `能源井 ${energyLeft} 天后可抽取` : '能源井可抽取' }}</span>
            </template>
            <template v-else>
              <span>医疗 {{ supplies.medicine }} / {{ DOCTOR.supply.medicine }}</span>
              <span>食物 {{ supplies.food }} / {{ DOCTOR.supply.food }}</span>
              <span>饮品 {{ supplies.drink }} / {{ DOCTOR.supply.drink }}</span>
            </template>
          </div>

          <button
            v-if="!doctorTradeDone"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="serumCount < DOCTOR.serumCount"
            @click="run(doctorTrade)"
          >
            交付 {{ DOCTOR.serumCount }} 支抗感染针 · 换 M700
          </button>
          <button
            v-else-if="!doctorQuest1Done && generatorOwned"
            type="button"
            class="btn btn--primary extra__action"
            @click="run(submitGenerator)"
          >
            上交小核能发电机 · 动力徽章
          </button>
          <div v-else-if="!doctorQuest2Done" class="extra__actions">
            <button
              type="button"
              class="btn"
              :disabled="energyLeft > 0"
              @click="run(extractEnergy)"
            >
              {{ energyLeft > 0 ? `能源井 ${energyLeft} 天后可抽取` : '抽取能源 · 1 回合' }}
            </button>
            <button
              type="button"
              class="btn btn--primary"
              :disabled="energyCount < DOCTOR.energyCount"
              @click="run(submitEnergy)"
            >
              上交 {{ DOCTOR.energyCount }} 份纯净能源 · 燃料徽章
            </button>
          </div>
          <button
            v-else-if="!doctorReady"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="!suppliesReady"
            @click="run(submitSupplies)"
          >
            上交生存物资 · 生存徽章
          </button>
          </template>

          <AssassinationCard npc-id="doctor" @feedback="feed = $event" />
        </article>

        <article v-else-if="view === 'rocket'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">发射中心</h4>
            <span class="extra__tag">{{ rocketTag }}</span>
          </header>
          <p class="extra__desc">
            <template v-if="!puppetDefeated">{{ GIANT_PUPPET.intro }}</template>
            <template v-else-if="rocketBadges < ROCKET.badgeIds.length">
              {{ ROCKET.lockedLine }}
            </template>
            <template v-else>{{ ROCKET.repairedLine }}</template>
          </p>

          <div class="chips">
            <template v-if="!puppetDefeated">
              <span>巨型丧尸傀儡 · 生命 {{ GIANT_PUPPET.enemy.hp }}</span>
              <span>攻击 {{ GIANT_PUPPET.enemy.attack }}</span>
              <span>闪避 {{ Math.round(GIANT_PUPPET.enemy.dodge * 100) }}%</span>
            </template>
            <template v-else>
              <span>发射徽章 {{ rocketBadges }} / {{ ROCKET.badgeIds.length }}</span>
              <span v-for="id in ROCKET.badgeIds" :key="id">
                {{ getItem(id)?.name }}{{ countItem(game.inventory, id) > 0 ? '已持有' : '未持有' }}
              </span>
              <span>嫣然 {{ yanranRescued ? '在队' : '未入队' }}</span>
              <span>露露 {{ luluRescued ? '在队' : '未入队' }}</span>
            </template>
          </div>

          <button
            v-if="!puppetDefeated"
            type="button"
            class="btn btn--primary extra__action"
            :disabled="battle.active"
            @click="fightPuppet"
          >
            迎战巨型傀儡 · 1 回合
          </button>
          <button
            v-else-if="generatorPending"
            type="button"
            class="btn extra__action"
            @click="run(collectGenerator)"
          >
            拾取小核能发电机
          </button>
          <div v-else-if="spaceportBlown" class="chips">
            <span>发射架已坍塌</span>
            <span>火箭无法发射</span>
          </div>
          <div
            v-else-if="rocketBadges >= ROCKET.badgeIds.length"
            class="extra__actions"
          >
            <button
              type="button"
              class="btn btn--primary"
              :disabled="!rocketCompanionsReady"
              @click="run(() => launchRocket('all'))"
            >
              带所有人上火箭
            </button>
            <button type="button" class="btn" @click="run(() => launchRocket('solo'))">
              独自飞走
            </button>
            <button type="button" class="btn" @click="run(() => launchRocket('send'))">
              让他们走
            </button>
            <button type="button" class="btn" @click="run(() => launchRocket('stay'))">
              留下
            </button>
          </div>
        </article>

        <article v-else-if="view === 'blow'" class="extra">
          <header class="extra__head">
            <h4 class="extra__title">爆破发射架</h4>
            <span class="extra__tag">{{ spaceportBlown ? '已爆破' : '等待引爆' }}</span>
          </header>
          <p class="extra__desc">
            <template v-if="spaceportBlown">
              发射架只剩一段歪斜的钢架，箭体散落在发射台下。火箭再也飞不起来了。
            </template>
            <template v-else>
              马斐要你把火箭炸掉。高能炸药的引线很短，贴上承力环之后就没有回头路。
            </template>
          </p>
          <div v-if="!spaceportBlown" class="chips">
            <span>高能炸药 {{ explosiveCount }} / 1</span>
            <span>消耗 1 回合</span>
          </div>
          <button
            v-if="!spaceportBlown"
            type="button"
            class="btn extra__deadly extra__action"
            :disabled="explosiveCount < 1"
            @click="run(detonateSpaceport)"
          >
            安放炸药 · 1 回合
          </button>
        </article>
      </template>

      <div v-if="view === 'menu'" class="zombies">
        <button
          type="button"
          class="zombies__head"
          :aria-expanded="zombiesOpen"
          @click="zombiesOpen = !zombiesOpen"
        >
          <span class="zombies__title">出没丧尸</span>
          <span class="zombies__meta">
            <span class="zombies__count">{{ zombies.length }} 种</span>
            <span class="zombies__toggle">{{ zombiesOpen ? '收起' : '展开' }}</span>
          </span>
        </button>
        <template v-if="zombiesOpen">
          <article v-for="zombie in zombies" :key="zombie.id" class="zombie">
            <div class="zombie__main">
              <h5 class="zombie__name">{{ zombie.name }}</h5>
              <p class="zombie__desc">{{ zombie.description }}</p>
            </div>
            <div class="zombie__stats">
              <span>生命 {{ zombie.hp }}</span>
              <span>攻击 {{ zombie.attack }}</span>
              <span v-if="zombie.infection > 0">感染 +{{ zombie.infection }}%</span>
              <span v-for="ability in zombie.abilities" :key="ability" class="zombie__ability">
                {{ abilityLabel(ability) }}
              </span>
            </div>
          </article>
        </template>
      </div>

      <div class="actions">
        <button v-if="view === 'menu'" type="button" class="btn btn--primary" @click="explore">
          探索 · 1 回合
        </button>
        <button type="button" class="btn" @click="closePanel">返回安全屋</button>
      </div>
    </section>

    <template #footer>
      <span>{{ feed || '探索会消耗 1 回合（正常衰减）；遭遇丧尸时进入手动回合制战斗。' }}</span>
      <span class="mode">FIELD · {{ map.level }}</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.pane {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100%;
  padding-top: 14px;
}

.pane__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pane__title {
  margin: 0;
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--text);
}

.pane__desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.9;
  letter-spacing: 0.04em;
  color: var(--text-dim);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.chips span {
  padding: 4px 9px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.2);
}

.zombies {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--line);
}

.zombies__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 9px 12px;
  background: #0d0f10;
  text-align: left;
  transition: background 0.2s;
}

.zombies__head:hover {
  background: #121516;
}

.zombies__title {
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.18em;
  color: var(--text-mute);
}

.zombies__meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.zombies__count {
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--text-mute);
}

.zombies__toggle {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: var(--rust-soft);
}

.zombie {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 11px 12px;
  background: #0d0f10;
}

.zombie__main {
  min-width: 0;
}

.zombie__name {
  margin: 0;
  font-size: 12.5px;
  letter-spacing: 0.1em;
  color: var(--text);
}

.zombie__desc {
  margin: 4px 0 0;
  font-size: 10.5px;
  line-height: 1.65;
  color: var(--text-mute);
}

.zombie__stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 5px;
  flex: none;
  max-width: 46%;
}

.zombie__stats span {
  padding: 2px 7px;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-mute);
  border: 1px solid var(--line);
}

.zombie__ability {
  color: var(--rust-soft) !important;
  border-color: rgba(184, 98, 70, 0.45) !important;
}

.bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pane :deep(.map-menu) {
  margin-top: 0;
}

.bar .btn {
  height: 28px;
  padding: 0 10px;
  font-size: 10.5px;
}

.extra {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(214, 208, 191, 0.16);
  background: rgba(8, 10, 11, 0.58);
  -webkit-backdrop-filter: blur(6px) saturate(0.92);
  backdrop-filter: blur(6px) saturate(0.92);
  transition:
    background 0.2s,
    border-color 0.2s;
}

.extra:focus-within {
  border-color: rgba(193, 74, 50, 0.45);
  background: rgba(193, 74, 50, 0.1);
}

.extra__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.extra__title {
  margin: 0;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--text);
}

.extra__tag {
  flex: none;
  padding: 2px 7px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--rust-soft);
  border: 1px solid rgba(193, 74, 50, 0.4);
}

.extra__desc {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.75;
  color: var(--text-mute);
}

.extra__desc q {
  display: block;
  margin-top: 6px;
  color: var(--text-dim);
  font-style: normal;
}

.mutiny-start {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(193, 74, 50, 0.4);
  background: rgba(193, 74, 50, 0.08);
}

.mutiny-start__btn {
  align-self: stretch;
}

.sea-tiers {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.18);
}

.sea-tier {
  display: flex;
  gap: 8px;
  font-size: 10px;
  line-height: 1.6;
}

.sea-tier__rate {
  flex: none;
  width: 72px;
  font-family: var(--font-mono);
  color: var(--bone);
}

.sea-tier__names {
  color: var(--text-mute);
}

.extra__warn {
  margin: 0;
  padding: 7px 9px;
  font-size: 10px;
  line-height: 1.7;
  color: var(--rust-soft);
  border: 1px solid rgba(193, 74, 50, 0.4);
  background: rgba(193, 74, 50, 0.08);
}

.dev-gift {
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}

.dev-gift .extra__head {
  margin-bottom: 8px;
}

.dummy-bar {
  height: 6px;
  margin: 10px 0 8px;
  background: var(--line);
  overflow: hidden;
}

.dummy-bar i {
  display: block;
  height: 100%;
  background: var(--accent, #c8a45c);
  transition: width 0.2s ease;
}

.dev-gift .chips {
  margin-bottom: 8px;
}

.dev-expand {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}

.dev-expand .extra__head {
  margin-bottom: 8px;
}

.dev-expand .extra__desc {
  margin-bottom: 8px;
}

.extra__action {
  align-self: flex-start;
  height: 30px;
  padding: 0 13px;
  font-size: 11px;
}

.extra__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.extra__deadly {
  height: 30px;
  padding: 0 13px;
  font-size: 11px;
  color: var(--rust-soft);
  border-color: rgba(193, 74, 50, 0.6);
}

.extra__deadly:hover {
  background: rgba(193, 74, 50, 0.14);
}

.actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  margin-top: auto;
  padding: 12px 0 4px;
  border-top: 1px solid var(--line);
  background: rgba(8, 10, 11, 0.72);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

.actions .btn {
  height: 34px;
  padding: 0 16px;
  font-size: 11.5px;
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}

@media (max-width: 680px) {
  .zombie {
    flex-direction: column;
  }

  .zombie__stats {
    max-width: none;
    justify-content: flex-start;
  }
}
</style>
