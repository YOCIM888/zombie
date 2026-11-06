// 实时数据适配层
// 页面每次载入都直接 import src/data 的最新配置，武器/天赋/公会/宝石改动后刷新即可生效，
// 不再维护任何手抄的数值快照。

import { MELEE_ITEMS } from '../../../src/data/items/melee.js'
import { RANGED_ITEMS } from '../../../src/data/items/ranged.js'
import { UNARMED, FIST_TALENT_WEAPON_IDS } from '../../../src/data/weapons.js'
import { TALENTS, UTOPIA_TRAININGS } from '../../../src/data/talents.js'
import { GUILDS } from '../../../src/data/guilds.js'
import { GEM_ITEMS } from '../../../src/data/items/gem.js'
import { ZOMBIE_TYPES } from '../../../src/data/zombies.js'
import { WORLD_BOSS_HP, WORLD_BOSSES } from '../../../src/data/worldBoss.js'
import { NPCS } from '../../../src/data/npcs.js'
import { SEA_TIERS } from '../../../src/data/sea.js'

/** 把 src/data 的物品结构折成报告页使用的武器结构 */
function toWeapon(item) {
  return {
    id: item.id,
    name: item.name,
    tier: item.tier ?? '普通',
    category: item.category,
    stats: { ...(item.weapon || item.stats || {}) },
    desc: item.description ?? item.desc ?? '',
    extra: item.extra ?? {},
  }
}

const UNARMED_ITEM = toWeapon({
  ...UNARMED,
  name: '拳头（空手）',
  tier: '普通',
  description: UNARMED.description,
})

const MELEE_LIST = [...Object.values(MELEE_ITEMS), UNARMED_ITEM].map(toWeapon)
const RANGED_LIST = Object.values(RANGED_ITEMS).map(toWeapon)

/** 全部武器：近战（含空手）在前，远程在后 */
export const WEAPONS = Object.fromEntries(
  [...MELEE_LIST, ...RANGED_LIST].map((weapon) => [weapon.id, weapon]),
)

/** 计算器下拉用的扁平武器表 */
export const WEAPON_LIST = [...MELEE_LIST, ...RANGED_LIST].map((weapon) => ({
  id: weapon.id,
  name: weapon.name,
  tier: weapon.tier,
  cat: weapon.category,
  atk: weapon.stats.attack ?? 0,
  crit: weapon.stats.crit ?? 0,
  cdmg: weapon.stats.critDamage ?? 0,
  combo: weapon.stats.combo ?? 0,
  dodge: weapon.stats.dodge,
}))

/** 全部专项训练 = 天赋白名单；通用天赋（如挥砍，weaponIds 为 null）不进入白名单 */
export const WHITELISTS = Object.fromEntries(
  UTOPIA_TRAININGS.filter((training) => Array.isArray(training.weaponIds)).map((training) => [
    training.kind,
    {
      name: training.name,
      slot: training.weaponSlot,
      cost: training.costType,
      weaponIds: training.weaponIds,
      weaponText: training.weaponText,
    },
  ]),
)

/** 天赋 / 白名单 / 公会 / 宝石：报告页统一从这里取最新值 */
export const MECH = {
  talents: TALENTS,
  whitelists: WHITELISTS,
  guilds: GUILDS.map((guild) => ({
    ...guild,
    buff: guild.buffText,
    req: guild.requirementText,
  })),
  gems: Object.values(GEM_ITEMS).map((gem) => ({
    id: gem.id,
    name: gem.name,
    desc: gem.description,
  })),
}

/** 只有空手与三把指虎能吃拳头天赋 */
export const FIST_WEAPONS = ['unarmed', ...FIST_TALENT_WEAPON_IDS]

/** 天赋表：把白名单信息拍平，供页面表格直接渲染 */
export const TALENT_ROWS = Object.entries(TALENTS).map(([key, talent]) => {
  const whitelist = WHITELISTS[key]
  return {
    ...talent,
    key,
    wl: Boolean(whitelist),
    wlText: whitelist?.weaponText ?? '',
    wlIds: whitelist?.weaponIds ?? [],
  }
})

const ZOMBIE_BY_ID = Object.fromEntries(ZOMBIE_TYPES.map((zombie) => [zombie.id, zombie]))

function target(id, creature, extra = {}) {
  return {
    id,
    name: creature.name,
    hp: creature.hp,
    atk: creature.attack,
    dodge: creature.dodge ?? 0,
    abilities: creature.abilities ?? [],
    maxHp: creature.hp,
    isBoss: false,
    isSea: false,
    ...extra,
  }
}

const dragon = WORLD_BOSSES.find((boss) => boss.id === 'dragon') ?? WORLD_BOSSES[0]
const alex = NPCS.alex
const abyssTier = SEA_TIERS.find((tier) => tier.id === 'special')
const abyssDragon = abyssTier.creatures.find((creature) => creature.id === 'abyss-dragon')

/** 计算器靶标：丧尸、NPC 与深海生物都直接取自 src/data */
export const TARGETS = [
  target('mob', ZOMBIE_BY_ID.wanderer),
  target('tank', ZOMBIE_BY_ID.tank),
  target('alex', alex),
  target(
    'abyss',
    {
      ...abyssDragon,
      hp: abyssTier.hpMax,
      attack: abyssTier.attackMax,
      dodge: 0,
      abilities: [],
    },
    { isBoss: true, isSea: true },
  ),
  {
    id: 'boss',
    name: `世界BOSS ${dragon.name}`,
    hp: WORLD_BOSS_HP,
    atk: Math.round(((dragon.attackMin ?? 0) + (dragon.attackMax ?? 0)) / 2),
    dodge: 0,
    abilities: [],
    maxHp: WORLD_BOSS_HP,
    isBoss: true,
    isSea: false,
  },
]
