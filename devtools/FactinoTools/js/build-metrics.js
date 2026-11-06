// 17 套构筑的实时指标：每次载入都按 src/data 重算，不保存任何旧数值
import { BUILDS } from '../data/builds.js'
import { TARGETS } from '../data/source.js'
import { derive, meleeExact, rangedExact, magicMeanStacks, sustainHeal } from './model.js'

const MOB = TARGETS.find((target) => target.id === 'mob')
const TG = {
  hp: MOB.hp,
  maxHp: MOB.maxHp,
  attack: MOB.atk,
  dodge: MOB.dodge,
  armor: MOB.abilities.includes('armor'),
  frozen: false,
  abilities: MOB.abilities,
  isBoss: MOB.isBoss,
}

const STATE = { hpPct: 1, cleanliness: 100, boneStacks: 0 }

function metricsFor(weaponId, talents, guild, gems) {
  const derived = derive({ weapon: weaponId, talents, guild, gems }, TG)
  if (!derived) return null
  /* 魔化宝石按稳态平均层数近似，与计算器同一套推导 */
  const state = { ...STATE, magicStacks: magicMeanStacks(derived) }
  const exact = derived.isMelee ? meleeExact(derived, TG, state) : rangedExact(derived, TG, state)
  return {
    weapon: derived.weapon,
    isMelee: derived.isMelee,
    perTurn: exact.perTurn,
    hits: exact.hits,
    pCrit: exact.pCrit,
    cdmg: exact.cdmg,
    durPerTurn: exact.durPerTurn,
    cleanPerTurn: exact.cleanPerTurn,
    bonePerTurn: exact.bonePerTurn,
    healPerTurn: sustainHeal(derived),
  }
}

function rankFor(build) {
  return build.alts
    .map((id) => ({ id, ...metricsFor(id, build.talents, build.guild, build.gems) }))
    .filter((row) => row.perTurn != null)
    .sort((a, b) => b.perTurn - a.perTurn)
}

export const BUILD_METRICS = BUILDS.map((build) => ({
  ...build,
  main: metricsFor(build.weapon, build.talents, build.guild, build.gems),
  rank: rankFor(build),
})).filter((build) => build.main)
