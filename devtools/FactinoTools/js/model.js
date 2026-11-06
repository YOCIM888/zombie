// 行尸 · 流派期望伤害模型 v3
// 严格逐行对齐游戏内结算函数：近战 ei() / 远程 Tu()
// 天赋、公会、白名单、清洁度常量全部来自 src/data 的实时数据。

import { MECH, WEAPONS, FIST_WEAPONS } from '../data/source.js'
import {
  CLEANLINESS_MAX,
  CLEANLINESS_PER_SHOT,
  CLEANLINESS_LOW,
  CLEANLINESS_JAM_MAX,
  SPRAY_SEGMENTS,
  SPRAY_EXTRA_CLEANLINESS,
} from '../../../src/data/weapons.js'
import { MAGIC_GEM_STACK, TIME_GEM } from '../../../src/data/items/gem.js'

const MAXCLEAN = CLEANLINESS_MAX
const CLEAN_PER_SHOT = CLEANLINESS_PER_SHOT
const JAM_THRESHOLD = CLEANLINESS_LOW
const JAM_COEF = CLEANLINESS_JAM_MAX
const ARMOR_MULT = 0.5
const FROZEN_MULT = 0.5
const TRIP_SKIP = 0.3
const BLIND_MISS = 0.5
const KNUCKLE = FIST_WEAPONS
const KNIGHT_SWORD = 'knight-sword'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
/** 塞涅娅的窒息：靶标带 critSuppression 时，按触发概率折算期望暴击率 */
const critAfterSuppression = (p, tg) =>
  p * (1 - clamp(Number(tg && tg.critSuppression) || 0, 0, 1))
const xi = (c) => 0.5 + 0.5 * (clamp(c || 0, 0, MAXCLEAN) / MAXCLEAN)
const jamChance = (c) => {
  c = clamp(c || 0, 0, MAXCLEAN)
  return c >= JAM_THRESHOLD ? 0 : ((JAM_THRESHOLD - c) / JAM_THRESHOLD) * JAM_COEF
}
const bloodMult = (hpPct) => (hpPct < 0.2 ? 1.4 : hpPct < 0.5 ? 1.25 : hpPct < 0.8 ? 1.1 : 1)
const mul32 = (a) => () => {
  a |= 0
  a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/* ---------------- 派生配置：把天赋/公会/白名单折成结算参数 ---------------- */
function derive(cfg, tg) {
  const w = WEAPONS[cfg.weapon]
  if (!w) return null
  const S = w.stats || {}
  const T = cfg.talents || {}
  const fx = (k) => {
    const d = MECH.talents[k]
    if (!d) return {}
    const lv = Math.round(T[k] || 0)
    if (lv <= 0) return {}
    return d.effects[clamp(lv, 1, d.maxLevel) - 1] || {}
  }
  const g = (MECH.guilds || []).find((x) => x.id === cfg.guild) || null
  const guildHas = (w2) => g && Array.isArray(g.weaponIds) && g.weaponIds.includes(w2)
  const inWl = (kind) => !!(MECH.whitelists[kind] && MECH.whitelists[kind].weaponIds.includes(cfg.weapon))
  const arenaOK = KNUCKLE.includes(cfg.weapon)
  const knightOK = !!(g && g.id === 'knight' && cfg.weapon === KNIGHT_SWORD)
  const warriorOK = !!(g && g.id === 'warrior' && guildHas(cfg.weapon))
  const hunterOK = !!(g && g.id === 'hunter' && guildHas(cfg.weapon))
  const G = {
    meleeFx: fx('melee'),
    rangedFx: fx('ranged'),
    arenaFx: arenaOK ? fx('arena') : {},
    corridorFx: fx('corridor'),
    drawFx: fx('draw'),
    swordFx: fx('sword'),
    sniperFx: fx('sniper'),
    blockFx: fx('block'),
    pistolFx: fx('pistol'),
    sprayFx: fx('spray'),
    assaultFx: fx('assault'),
    bluntFx: fx('blunt'),
    assassinateFx: fx('assassinate'),
    slashFx: fx('slash'),
    sweepFx: fx('sweep'),
    polearmFx: fx('polearm'),
    insightFx: fx('insight'),
    bulldozerFx: fx('bulldozer'),
    harvestFx: fx('harvest'),
  }
  const D = Object.assign({}, G, {
    weapon: w,
    stats: S,
    isMelee: w.category === 'melee',
    guild: g,
    knightOK,
    warriorOK,
    hunterOK,
    arenaOK,
    inDraw: inWl('draw'),
    inSword: inWl('sword'),
    inSniper: inWl('sniper'),
    inBlock: inWl('block'),
    inPistol: inWl('pistol'),
    inSpray: inWl('spray'),
    inAssault: inWl('assault'),
    inBlunt: inWl('blunt'),
    inAssassinate: inWl('assassinate'),
    inSweep: inWl('sweep'),
    inPolearm: inWl('polearm'),
    inInsight: inWl('insight'),
    inBulldozer: inWl('bulldozer'),
    inHarvest: inWl('harvest'),
    isSea: !!(tg && tg.isSea),
    gems: new Set(cfg.gems || []),
    durMult: 1 + (g && g.durabilityExtraCost && guildHas(cfg.weapon) ? Number(g.durabilityExtraCost) || 0 : 0),
    cleanPerShot: CLEAN_PER_SHOT + (g && g.cleanlinessExtraCost && guildHas(cfg.weapon) ? Number(g.cleanlinessExtraCost) || 0 : 0),
    maxHp: g && g.id === 'knight' && cfg.weapon === KNIGHT_SWORD ? 100 + (g.maxHpBonus || 20) : 100,
  })
  D.noExecute = !!cfg.noExecute
  D.combo = D.isMelee
    ? clamp(
        (S.combo || 0) +
          (D.meleeFx.combo || 0) +
          (D.arenaOK ? D.arenaFx.combo || 0 : 0) +
          (knightOK ? g.comboBonus || 0 : 0),
        0,
        1,
      )
    : 0
  D.critBase = clamp((S.crit || 0) + (knightOK ? g.critBonus || 0 : 0) + (warriorOK ? g.critBonus || 0 : 0), 0, 1)
  D.critM = (S.critDamage ?? 1) + (knightOK ? g.critDamageBonus || 0 : 0) + (D.inHarvest ? D.harvestFx.critDamage || 0 : 0)
  D.rangedAtk = (S.attack || 0) + (D.inAssault ? (G.assaultFx.damage || 0) : 0)
  D.atk = D.isMelee
    ? (S.attack || 0) + (D.arenaOK ? D.arenaFx.damage || 0 : 0) + (D.slashFx?.damage || 0)
    : D.rangedAtk
  D.flat = warriorOK || knightOK ? g.damageBonus || 0 : 0
  return D
}

/* ---------------- 生存属性：收割 / 时间宝石的期望回血 ---------------------------- */
/**
 * 吸血不进入伤害模型。收割与时间宝石都是「每次近战攻击动作判定一次」，
 * 连击追加段不重复掷骰，因此这里不乘期望击数，只按每回合一次动作计算。
 * 满血时会跳过掷骰，长期在血线以下作战才接近这个期望值。
 */
function sustainHeal(D) {
  if (!D || !D.isMelee || !D.inHarvest) return 0
  const harvest = (D.harvestFx.harvestChance || 0) * (D.harvestFx.harvestHeal || 0)
  const time = D.gems.has('time-gem')
    ? TIME_GEM.lifestealChance * Math.max(1, Math.round(D.maxHp * TIME_GEM.lifestealRatio))
    : 0
  // 盗贼公会的镰刀吸血只影响生存，不进入伤害模型
  const rogue =
    D.guild?.id === 'rogue'
      ? (D.guild.lifestealChance || 0) * (D.guild.lifestealHp || 0)
      : 0
  return harvest + time + rogue
}

/* ---------------- 魔化宝石：稳态平均层数（计算器近似） ---------------- */
/**
 * 逐回合：未暴击 +1 层（封顶 data 层上限），暴击清零；第 s 层的暴击率 = 基础暴击 + s * 每层加成。
 * 把 0..上限 视为一条马尔可夫链，迭代到稳态后取平均层数。
 * 近似点：一回合只做一次暴击判定，与游戏内「一次攻击结算完后统一更新层数」一致；
 * 近战多段连击按整体是否出现暴击结算，理论平均层数会略低于逐段判定，这里不做细分。
 */
export function magicMeanStacks(D) {
  if (!D.gems.has('magic-gem')) return 0
  const max = MAGIC_GEM_STACK.max
  const per = MAGIC_GEM_STACK.critPerStack
  const S = D.stats
  const base = D.isMelee
    ? clamp((S.crit || 0) + (D.knightOK ? D.guild.critBonus || 0 : 0), 0, 1)
    : clamp(
        (S.crit || 0) +
          (D.rangedFx.crit || 0) +
          (D.inPistol ? D.pistolFx.crit || 0 : 0) +
          (D.inAssault ? D.assaultFx.crit || 0 : 0),
        0,
        1,
      )
  const states = max + 1
  let dist = new Array(states).fill(0)
  dist[0] = 1
  for (let iter = 0; iter < 400; iter++) {
    const next = new Array(states).fill(0)
    for (let s = 0; s < states; s++) {
      const p = dist[s]
      if (!p) continue
      const q = clamp(base + s * per, 0, 1)
      next[0] += p * q
      next[Math.min(max, s + 1)] += p * (1 - q)
    }
    let diff = 0
    for (let s = 0; s < states; s++) diff += Math.abs(next[s] - dist[s])
    dist = next
    if (diff < 1e-9) break
  }
  return dist.reduce((sum, p, s) => sum + p * s, 0)
}

/* ---------------- 解析式：单回合期望伤害（精确，无蒙特卡洛噪声） ---------------- */
function meleeExact(D, tg, st) {
  st = st || {}
  tg = tg || {}
  const S = D.stats
  const hpPct = st.hpPct ?? 1
  const bm = bloodMult(hpPct)
  const magic = st.magicStacks || 0
  const bone0 = Math.min(10, st.boneStacks || 0)
  const cd = S.critDamage ?? 0
  const pCrit = cd >= 1 ? critAfterSuppression(clamp(S.crit + (D.knightOK ? D.guild.critBonus || 0 : 0) + (D.warriorOK ? D.guild.critBonus || 0 : 0) + magic * MAGIC_GEM_STACK.critPerStack, 0, 1), tg) : 0
  const ce = cd + (D.knightOK ? D.guild.critDamageBonus || 0 : 0) + (D.inHarvest ? D.harvestFx.critDamage || 0 : 0)
  const flat =
    D.flat +
    (D.gems.has('guardian-gem') && D.weapon.id === KNIGHT_SWORD ? 40 : 0) +
    (D.isSea && D.gems.has('ocean-gem') ? 20 : 0)
  const armorOn = !!tg.armor
  const frozen = !!tg.frozen
  const seaBonus = D.isSea && D.weapon.id === 'trident' ? 1.5 : 1
  /* 与 battle.js 同序：先按攻击倍率结算并过护甲，再加公会/守护/海洋平加，最后乘血线宝石 */
  const mk = (v) => {
    let x = v
    if (armorOn) x = Math.max(1, Math.floor(x * ARMOR_MULT))
    x += flat
    if (bm > 1) x = Math.round(x * bm)
    return x
  }
  const baseNormRaw = Math.max(1, Math.round(D.atk * seaBonus))
  /* 横扫千军：只作用于第一击，在护甲/血线之前乘，与 battle.js 同序 */
  const sweepOn = D.inSweep && (D.sweepFx.sweepDamage || 0) > 0
  const baseCritRaw =
    cd >= 1
      ? Math.max(1, Math.round(D.atk * ce * seaBonus))
      : baseNormRaw
  const firstNormRaw = sweepOn
    ? Math.max(1, Math.round(baseNormRaw * (1 + D.sweepFx.sweepDamage)))
    : baseNormRaw
  const firstCritRaw = sweepOn
    ? Math.max(1, Math.round(baseCritRaw * (1 + D.sweepFx.sweepDamage)))
    : baseCritRaw
  /* 单枪匹马：暴击击单独 ×critMult（先按游戏内取整顺序复算，再过护甲/平加/血线） */
  const polearmOn = D.inPolearm && (D.polearmFx.critMult || 0) > 0
  const polearmMult = polearmOn ? D.polearmFx.critMult : 1
  const gNorm = mk(baseNormRaw)
  const gCrit = mk(polearmOn ? Math.max(1, Math.round(baseCritRaw * polearmMult)) : baseCritRaw)
  const gFirstNorm = mk(firstNormRaw)
  const gFirstCrit = mk(
    polearmOn ? Math.max(1, Math.round(firstCritRaw * polearmMult)) : firstCritRaw,
  )
  const perHitBase = (1 - pCrit) * gNorm + pCrit * gCrit
  const firstHitBase = (1 - pCrit) * gFirstNorm + pCrit * gFirstCrit
  const K = D.inBlunt ? D.bluntFx.boneChance || 0 : 0
  const combo = D.combo
  /* 骨层 DP：f(b) = 本击伤害 + combo*[ (1-K)·f(b) + K·f(b+1) ] */
  const f = new Array(11).fill(0)
  for (let b = 10; b >= 0; b--) {
    const dmg = perHitBase * (1 + b * 0.1)
    const Kp = K > 0 && b < 10 ? K : 0
    const denom = 1 - combo * (1 - Kp)
    f[b] = denom > 1e-9 ? (dmg + combo * Kp * (f[b + 1] || 0)) / denom : dmg
  }
  const comboDmg =
    f[bone0] +
    (firstHitBase - perHitBase) * (1 + Math.min(10, bone0) * 0.1)
  /* 致命一击：每回合开始 roll 一次，触发后首击伤害替换为僵尸当前生命（世界BOSS封顶 500），
     与 battle.js 的 swordExecute 同序；若未击杀，后续连击照常继续。 */
  let execExp = 0
  const execChance = D.inSword && !D.noExecute ? D.swordFx.executeChance || 0 : 0
  const targetHp = tg.maxHp ?? tg.hp ?? 0
  if (execChance > 0 && targetHp > 0) {
    const worldBoss = tg.isWorldBoss ?? (tg.isBoss && !D.isSea)
    const execHp = worldBoss ? Math.min(500, targetHp) : targetHp
    const execTurn = execHp >= targetHp ? execHp : execHp + (comboDmg - firstHitBase)
    execExp = execChance * (execTurn - comboDmg)
  }
  const hits = 1 / (1 - Math.min(0.999, combo))
  /* 长杆：暴击击的耐久消耗替换为 critDurability（忽略耐久不足的降级边界） */
  const perHitDur = polearmOn
    ? (1 - pCrit) * D.durMult + pCrit * (D.polearmFx.critDurability || D.durMult)
    : D.durMult
  /* 拔刀：真实伤害，绕开护甲与血线 */
  let drawExp = 0
  if (D.inDraw && (D.drawFx.cutChance || 0) > 0) {
    const c = Math.max(1, Math.ceil((tg.maxHp || 100) * 0.2))
    drawExp = D.drawFx.cutChance * (tg.isBoss ? Math.min(200, c) : c)
  }
  /* 背刺：三段独立暴击（暴击率 = 武器暴击 + 魔化层数，不含天赋/公会暴击） */
  let backExp = 0
  if (D.inAssassinate && (D.assassinateFx.backstabChance || 0) > 0) {
    const pb = clamp((S.crit || 0) + magic * MAGIC_GEM_STACK.critPerStack, 0, 1)
    const cd2 = S.critDamage ?? 1
    for (const u of [0.3, 0.2, 0.1]) {
      const plain = Math.max(1, Math.round((S.attack || 0) * u))
      const critv = cd2 >= 1 ? Math.max(1, Math.round((S.attack || 0) * u * cd2)) : plain
      backExp += (1 - pb) * plain + pb * critv
    }
    backExp *= D.assassinateFx.backstabChance || 0
  }
  return {
    perTurn: comboDmg + execExp + drawExp + backExp,
    comboDmg,
    execExp,
    drawExp,
    backExp,
    hits,
    pCrit,
    perHit: perHitBase,
    cdmg: ce,
    bm,
    bone0,
    bonePerTurn: hits * K,
    durPerTurn:
      hits * perHitDur +
      (D.inAssassinate ? (D.assassinateFx.backstabChance || 0) * D.durMult : 0),
    cleanPerTurn: 0,
    frozen,
  }
}

function rangedExact(D, tg, st) {
  st = st || {}
  tg = tg || {}
  const S = D.stats
  const hpPct = st.hpPct ?? 1
  const bm = bloodMult(hpPct)
  const magic = st.magicStacks || 0
  const clean = st.cleanliness ?? 100
  const pistolOn = D.inPistol
  const assaultOn = D.inAssault
  const cd = S.critDamage ?? 1
  const pCrit = critAfterSuppression(clamp(
    (S.crit || 0) +
      (D.rangedFx.crit || 0) +
      (pistolOn ? D.pistolFx.crit || 0 : 0) +
      (assaultOn ? D.assaultFx.crit || 0 : 0) +
      magic * MAGIC_GEM_STACK.critPerStack,
    0,
    1,
  ), tg)
  const F =
    cd +
    (pistolOn ? D.pistolFx.critDamage || 0 : 0) +
    (assaultOn ? D.assaultFx.critDamage || 0 : 0) +
    /* 要害洞察按稳态 5 层折算爆伤增量 */
    (D.inInsight ? 5 * (D.insightFx.insightCrit || 0) : 0)
  const atk = D.rangedAtk
  const mult = D.hunterOK ? 1 : xi(clean)
  const armorOn = !!tg.armor
  const mk = (v) => {
    let x = v
    if (armorOn) x = Math.max(1, Math.floor(x * ARMOR_MULT))
    if (bm > 1) x = Math.round(x * bm)
    return x
  }
  const baseNorm = Math.max(1, Math.round(atk * mult))
  const baseCrit = Math.max(1, Math.round(atk * (F >= 1 ? F : 1) * mult))
  let main = (1 - pCrit) * mk(baseNorm) + pCrit * mk(baseCrit)
  if (D.hunterOK) main += D.guild.damageBonus || 0
  let pierce = 0
  if (D.inSniper && (D.sniperFx.pierceChance || 0) > 0)
    pierce = D.sniperFx.pierceChance * Math.max(1, Math.round(atk * 0.5))
  let spray = 0
  const sprayP = D.sprayFx.sprayChance || 0
  if (D.inSpray && sprayP > 0) {
    /* 三段独立暴击：每段期望 = 段倍率 × (1 + p×(爆伤-1))，这里按游戏内逐段取整复算 */
    const sprayCritP = F >= 1 ? pCrit : 0
    const perProc = SPRAY_SEGMENTS.reduce((sum, ratio) => {
      const normal = Math.max(1, Math.round(atk * ratio))
      const critHit = Math.max(1, Math.round(atk * ratio * (F >= 1 ? F : 1)))
      return sum + (1 - sprayCritP) * normal + sprayCritP * critHit
    }, 0)
    spray = sprayP * perProc
  }
  const cleanCost =
    D.cleanPerShot +
    (D.inSpray ? sprayP * SPRAY_EXTRA_CLEANLINESS : 0)
  /* 推土机：闪避成功概率 × 追加段期望；每段独立暴击、按武器攻击力取整 */
  let bulldozer = 0
  const segs = D.inBulldozer ? D.bulldozerFx.dodgeSegments : null
  if (Array.isArray(segs) && segs.length > 0) {
    const dodge = clamp((S.dodge || 0) + (D.corridorFx.dodge || 0), 0, 1)
    const segCritP = F >= 1 ? pCrit : 0
    const weaponAtk = S.attack || 0
    const perDodge = segs.reduce((sum, ratio) => {
      const normal = Math.max(1, Math.round(weaponAtk * ratio))
      const critHit = Math.max(1, Math.round(weaponAtk * ratio * (F >= 1 ? F : 1)))
      return sum + (1 - segCritP) * normal + segCritP * critHit
    }, 0)
    bulldozer = dodge * perDodge
  }
  return {
    perTurn: main + pierce + spray + bulldozer,
    main,
    pierce,
    spray,
    bulldozer,
    pCrit,
    cdmg: F,
    bm,
    cleanPerTurn: cleanCost,
    jamChance: jamChance(clean),
    mult,
    hits: 1,
    combo: 0,
    bonePerTurn: 0,
    durPerTurn: 0,
    drawExp: 0,
    backExp: 0,
  }
}

/* ---------------- 逐行照抄源码的单次攻击动作（用于蒙特卡洛） ---------------- */
function meleeAction(D, st, tg, rnd) {
  const S = D.stats
  let hits = 0
  let crits = 0
  let total = 0
  let boneGained = 0
  let durUsed = 0
  const frozen = !!tg.frozen
  const armor = !!tg.armor
  const bloodOn = D.gems.has('blood-gem')
  const K = D.inBlunt ? D.bluntFx.boneChance || 0 : 0
  const execute = !D.noExecute && D.inSword && !st.dead && (D.swordFx.executeChance || 0) > 0 && rnd() < (D.swordFx.executeChance || 0)
  const magicAtStart = st.magicStacks || 0
  const bm = bloodMult(st.hpPct)
  const seaBonus = D.isSea && D.weapon.id === 'trident' ? 1.5 : 1
  for (let c = 0; c < 500; c++) {
    const critP = critAfterSuppression(clamp(S.crit + (D.knightOK ? D.guild.critBonus || 0 : 0) + (D.warriorOK ? D.guild.critBonus || 0 : 0) + magicAtStart * MAGIC_GEM_STACK.critPerStack, 0, 1), tg)
    const isCrit = rnd() < critP && (S.critDamage ?? 0) >= 1
    const ce = (S.critDamage ?? 0) + (D.knightOK ? D.guild.critDamageBonus || 0 : 0) + (D.inHarvest ? D.harvestFx.critDamage || 0 : 0)
    let G = Math.max(1, Math.round(D.atk * (isCrit ? ce : 1) * seaBonus))
    if (D.inSweep && hits === 0 && (D.sweepFx.sweepDamage || 0) > 0) {
      G = Math.max(1, Math.round(G * (1 + D.sweepFx.sweepDamage)))
    }
    let durCost = D.durMult
    const polearmDur = D.inPolearm ? D.polearmFx.critDurability || 0 : 0
    if (isCrit && polearmDur > 0 && (D.polearmFx.critMult || 0) > 0 && st.dur >= polearmDur) {
      G = Math.max(1, Math.round(G * D.polearmFx.critMult))
      durCost = polearmDur
    }
    if (armor) G = Math.max(1, Math.floor(G * ARMOR_MULT))
    if (frozen && hits === 0) G = Math.max(1, Math.floor(G * FROZEN_MULT))
    if (D.flat) G += D.flat
    if (D.gems.has('guardian-gem') && D.weapon.id === KNIGHT_SWORD) G += 40
    if (D.gems.has('ocean-gem') && D.isSea) G += 20
    if (bloodOn && bm > 1) G = Math.round(G * bm)
    const B = Math.min(10, st.boneStacks || 0)
    if (D.inBlunt && B > 0) G = Math.round(G * (1 + B * 0.1))
    if (execute && hits === 0) G = tg.isBoss ? Math.min(500, st.zHp) : st.zHp
    if (st.tenacityEmpower) {
      G = Math.max(1, G * 2)
      st.tenacityEmpower = false
    }
    hits++
    total += G
    if (isCrit) crits++
    st.zHp = Math.max(0, st.zHp - Math.max(1, G))
    if (st.zHp <= 0) {
      st.dead = true
      break
    }
    if (!st.dead && D.inBlunt && K > 0 && rnd() < K && (st.boneStacks || 0) < 10) {
      st.boneStacks = (st.boneStacks || 0) + 1
      boneGained++
    }
    st.dur -= durCost
    durUsed += durCost
    if (st.dur <= 0) {
      st.broken = true
      break
    }
    if (rnd() >= D.combo) break
  }
  if (!st.dead && !st.broken && D.inDraw && (D.drawFx.cutChance || 0) > 0 && rnd() < (D.drawFx.cutChance || 0)) {
    let C = Math.max(1, Math.ceil(tg.maxHp * 0.2))
    if (tg.isBoss) C = Math.min(C, 200)
    total += C
    st.zHp = Math.max(0, st.zHp - Math.max(1, C))
    if (st.zHp <= 0) st.dead = true
  }
  if (
    !st.dead &&
    !st.broken &&
    D.inAssassinate &&
    (D.assassinateFx.backstabChance || 0) > 0 &&
    rnd() < (D.assassinateFx.backstabChance || 0)
  ) {
    const pb = clamp((S.crit || 0) + magicAtStart * MAGIC_GEM_STACK.critPerStack, 0, 1)
    const cd = S.critDamage ?? 1
    let add = 0
    for (const u of [0.3, 0.2, 0.1]) {
      const c2 = rnd() < pb && cd >= 1
      add += Math.max(1, Math.round((S.attack || 0) * u * (c2 ? cd : 1)))
    }
    total += add
    st.zHp = Math.max(0, st.zHp - Math.max(1, add))
    if (st.zHp <= 0) st.dead = true
    st.dur -= D.durMult
    durUsed += D.durMult
    if (st.dur <= 0) st.broken = true
  }
  if (D.gems.has('magic-gem')) st.magicStacks = crits > 0 ? 0 : Math.min(MAGIC_GEM_STACK.max, (st.magicStacks || 0) + 1)
  return { total, hits, crits, durUsed, boneGained }
}

function rangedAction(D, st, tg, rnd) {
  const S = D.stats
  let total = 0
  let crits = 0
  let cleanUsed = 0
  const bloodOn = D.gems.has('blood-gem')
  const magicAtStart = st.magicStacks || 0
  const bm = bloodMult(st.hpPct)
  if (rnd() < (tg.dodge || 0)) return { total: 0, hits: 0, crits: 0, cleanUsed: 0, skipped: true }
  if (rnd() < jamChance(st.clean)) {
    st.clean = Math.max(0, st.clean - D.cleanPerShot)
    return { total: 0, hits: 0, crits: 0, cleanUsed: D.cleanPerShot, jammed: true }
  }
  const pistolOn = D.inPistol
  const assaultOn = D.inAssault
  const critP = critAfterSuppression(clamp(
    (S.crit || 0) +
      (D.rangedFx.crit || 0) +
      (pistolOn ? D.pistolFx.crit || 0 : 0) +
      (assaultOn ? D.assaultFx.crit || 0 : 0) +
      magicAtStart * MAGIC_GEM_STACK.critPerStack,
    0,
    1,
  ), tg)
  const F =
    (S.critDamage ?? 1) +
    (pistolOn ? D.pistolFx.critDamage || 0 : 0) +
    (assaultOn ? D.assaultFx.critDamage || 0 : 0) +
    (D.inInsight ? 5 * (D.insightFx.insightCrit || 0) : 0)
  const isCrit = rnd() < critP && F >= 1
  let O = (isCrit ? F : 1) * (D.hunterOK ? 1 : xi(st.clean))
  if (tg.armor) O *= ARMOR_MULT
  if (tg.frozen) O *= FROZEN_MULT
  let C = Math.max(1, Math.round(D.rangedAtk * O) + (D.hunterOK ? D.guild.damageBonus || 0 : 0))
  if (bloodOn && bm > 1) C = Math.round(C * bm)
  if (st.tenacityEmpower) {
    C = Math.max(1, C * 2)
    st.tenacityEmpower = false
  }
  total += C
  st.zHp = Math.max(0, st.zHp - Math.max(1, C))
  if (isCrit) crits = 1
  let extra = 0
  let spray = false
  if (st.zHp > 0 && D.inSniper && (D.sniperFx.pierceChance || 0) > 0 && rnd() < (D.sniperFx.pierceChance || 0))
    extra += Math.max(1, Math.round((S.attack || 0) * 0.5))
  if (st.zHp > 0 && D.inSpray && (D.sprayFx.sprayChance || 0) > 0 && rnd() < (D.sprayFx.sprayChance || 0)) {
    /* 每段独立 roll 暴击，命中段单独乘爆伤倍率 */
    for (const ratio of SPRAY_SEGMENTS) {
      const segmentCrit = rnd() < critP && F >= 1
      if (segmentCrit) crits = 1
      extra += Math.max(
        1,
        Math.round((S.attack || 0) * ratio * (segmentCrit ? F : 1)),
      )
    }
    spray = true
  }
  /* 推土机：按玩家闪避率折算追加段，每段独立暴击（近似：每次行动 roll 一次闪避） */
  const dozerSegs = D.inBulldozer ? D.bulldozerFx.dodgeSegments : null
  if (st.zHp > 0 && Array.isArray(dozerSegs) && dozerSegs.length > 0) {
    const dodge = clamp((S.dodge || 0) + (D.corridorFx.dodge || 0), 0, 1)
    if (rnd() < dodge) {
      for (const ratio of dozerSegs) {
        const segmentCrit = rnd() < critP && F >= 1
        if (segmentCrit) crits = 1
        extra += Math.max(
          1,
          Math.round((S.attack || 0) * ratio * (segmentCrit ? F : 1)),
        )
      }
    }
  }
  if (extra > 0) {
    total += extra
    st.zHp = Math.max(0, st.zHp - Math.max(1, extra))
  }
  st.clean = Math.max(0, st.clean - D.cleanPerShot)
  cleanUsed = D.cleanPerShot
  if (spray) {
    st.clean = Math.max(0, st.clean - SPRAY_EXTRA_CLEANLINESS)
    cleanUsed += SPRAY_EXTRA_CLEANLINESS
  }
  if (D.gems.has('magic-gem')) st.magicStacks = crits > 0 ? 0 : Math.min(MAGIC_GEM_STACK.max, (st.magicStacks || 0) + 1)
  return { total, hits: 1, crits, cleanUsed }
}

/* ---------------- 整场战斗 ---------------- */
function fight(D, tg, st0, rnd) {
  const st = Object.assign(
    {
      dur: D.stats.durability || 0,
      clean: MAXCLEAN,
      boneStacks: 0,
      magicStacks: 0,
      hpPct: 1,
      zHp: tg.hp,
      dead: false,
      broken: false,
      tenacityEmpower: false,
    },
    st0 || {},
  )
  const turnDmg = []
  let turns = 0
  let total = 0
  const playerMax = D.maxHp
  let playerHp = playerMax
  while (st.zHp > 0 && turns < 400) {
    turns++
    let skip = false
    if (tg.abilities && tg.abilities.includes('trip') && rnd() < TRIP_SKIP) skip = true
    if (!skip && tg.abilities && tg.abilities.includes('blind') && rnd() < BLIND_MISS) skip = true
    if (!skip) {
      const r = D.isMelee ? meleeAction(D, st, tg, rnd) : rangedAction(D, st, tg, rnd)
      turnDmg.push(r.total)
      total += r.total
    } else turnDmg.push(0)
    if (st.zHp > 0 && !tg.isWorldBoss) {
      let dmg = Math.round(tg.attack || 0)
      if (D.gems.has('guardian-gem')) dmg = Math.max(1, Math.round(dmg * 0.8))
      if (D.inBlock && (D.blockFx.blockChance || 0) > 0 && rnd() < D.blockFx.blockChance)
        dmg = Math.max(1, Math.round(dmg * (1 - (D.blockFx.blockReduction || 0))))
      if (tg.abilities && tg.abilities.includes('leap')) dmg = Math.round(dmg * 0.6)
      if (tg.abilities && tg.abilities.includes('cloak')) dmg = Math.round(dmg * 0.5)
      playerHp -= dmg
      if (playerHp <= 0) {
        if (D.gems.has('tenacity-gem') && !st.tenacityEmpower) {
          playerHp = 1
          st.tenacityEmpower = true
        } else {
          playerHp = 0
          break
        }
      }
      st.hpPct = Math.max(0, playerHp / playerMax)
    }
    if (D.isMelee && st.dur <= 0) break
  }
  return { turns, total, turnDmg, win: st.zHp <= 0, playerHp, st }
}

/* ---------------- 统计 ---------------- */
function perTurnMC(D, tg, opts) {
  opts = opts || {}
  const N = opts.sims || 40000
  const rnd = mul32(opts.seed || 777)
  const arr = []
  let hits = 0
  let crits = 0
  let dur = 0
  let clean = 0
  let bones = 0
  for (let i = 0; i < N; i++) {
    const st = {
      dur: D.stats.durability || 0,
      clean: opts.cleanliness ?? MAXCLEAN,
      boneStacks: opts.boneStacks || 0,
      magicStacks: opts.magicStacks || 0,
      hpPct: opts.hpPct ?? 1,
      zHp: (tg && tg.hp) || 1e9,
      dead: false,
      broken: false,
      tenacityEmpower: false,
    }
    const r = D.isMelee ? meleeAction(D, st, tg, rnd) : rangedAction(D, st, tg, rnd)
    arr.push(r.total)
    hits += r.hits
    crits += r.crits
    if (D.isMelee) dur += r.durUsed
    else clean += r.cleanUsed
    bones += r.boneGained
  }
  arr.sort((a, b) => a - b)
  const mean = arr.reduce((a, b) => a + b, 0) / N
  const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / N)
  return {
    mean,
    sd,
    cv: mean ? sd / mean : 0,
    median: arr[Math.floor(N * 0.5)],
    p10: arr[Math.floor(N * 0.1)],
    p90: arr[Math.floor(N * 0.9)],
    p99: arr[Math.floor(N * 0.99)],
    max: arr[N - 1],
    min: arr[0],
    hits: hits / N,
    critRate: crits / (hits || 1),
    durPerTurn: dur / N,
    cleanPerTurn: clean / N,
    bonePerTurn: bones / N,
    sims: N,
  }
}

function fightStats(D, tg, opts) {
  opts = opts || {}
  const N = opts.sims || 4000
  const rnd = mul32(opts.seed || 4242)
  let win = 0
  let tTurns = 0
  let tTotal = 0
  let maxTurn = 0
  let minTurn = 1e9
  let aTurns = 0
  let aTotal = 0
  let survived = 0
  const allTurns = []
  for (let i = 0; i < N; i++) {
    const r = fight(D, tg, null, rnd)
    aTurns += r.turns
    aTotal += r.total
    if (r.turns > 0) survived++
    if (r.win) {
      win++
      tTurns += r.turns
      tTotal += r.total
      maxTurn = Math.max(maxTurn, r.turns)
      minTurn = Math.min(minTurn, r.turns)
      for (const v of r.turnDmg) allTurns.push(v)
    }
  }
  allTurns.sort((a, b) => a - b)
  return {
    sims: N,
    winRate: win / N,
    meanTurns: win ? tTurns / win : null,
    meanTotal: win ? tTotal / win : null,
    anyTurns: aTurns / N,
    anyTotal: aTotal / N,
    surviveRate: survived / N,
    maxTurns: maxTurn,
    minTurns: minTurn === 1e9 ? null : minTurn,
    turnMedian: allTurns.length ? allTurns[Math.floor(allTurns.length / 2)] : null,
    turnMean: allTurns.length ? allTurns.reduce((a, b) => a + b, 0) / allTurns.length : null,
    turnP10: allTurns.length ? allTurns[Math.floor(allTurns.length * 0.1)] : null,
    turnP90: allTurns.length ? allTurns[Math.floor(allTurns.length * 0.9)] : null,
  }
}

export {
  derive,
  meleeExact,
  rangedExact,
  meleeAction,
  rangedAction,
  fight,
  perTurnMC,
  fightStats,
  bloodMult,
  xi,
  jamChance,
  mul32,
  sustainHeal,
}
