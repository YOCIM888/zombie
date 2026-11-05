// 构筑计算器：随选随算，武器/天赋/公会/宝石/靶标全部实时
import { WEAPON_LIST, MECH, TARGETS, WEAPONS } from '../data/source.js'
import { derive, meleeExact, rangedExact, perTurnMC, fightStats, magicMeanStacks } from './model.js'
import { MAGIC_GEM_STACK } from '../../../src/data/items/gem.js'
import { $, $$, el, esc, num } from './ui.js'

const SPECIAL_IDS = new Set(Object.values(MECH.whitelists).flatMap((whitelist) => whitelist.weaponIds))
const STORAGE_KEY = 'factino.calc.v1'

/** 记住上一次的构筑选择：改完 src/data 触发页面重载后，仍能看到同一套构筑的新数值 */
function readSavedState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

function writeSavedState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* 隐私模式下 localStorage 不可用，忽略即可 */
  }
}

function selectedWhitelists() {
  const keys = [$('#cT1').value, $('#cT2').value].filter(Boolean)
  return keys.map((key) => MECH.whitelists[key]).filter(Boolean)
}

/** 武器下拉：标记名单适配，支持只看适配武器 */
function renderWeaponOptions() {
  const select = $('#cWeapon')
  const current = select.value
  const lists = selectedWhitelists()
  const fitOnly = $('#cFitOnly').checked
  select.innerHTML = ''

  ;['melee', 'ranged'].forEach((category) => {
    const group = el('optgroup')
    group.label = category === 'melee' ? '近战武器' : '远程武器'
    WEAPON_LIST.filter((weapon) => weapon.cat === category).forEach((weapon) => {
      const matched = lists.some((whitelist) => whitelist.weaponIds.includes(weapon.id))
      const generic = !SPECIAL_IDS.has(weapon.id)
      const visible = !fitOnly || !lists.length || matched || generic
      if (!visible && weapon.id !== current) return
      const option = el('option')
      option.value = weapon.id
      option.textContent =
        `${weapon.name} · ${weapon.tier} · 攻${weapon.atk}` +
        (matched ? ' ✓' : '') +
        (visible ? '' : '（当前）')
      group.appendChild(option)
    })
    if (group.children.length) select.appendChild(group)
  })

  if (current && select.querySelector(`option[value="${current}"]`)) select.value = current
}

function syncLevel(selectSelector, rangeSelector, labelSelector) {
  const key = $(selectSelector).value
  const talent = MECH.talents[key]
  const range = $(rangeSelector)
  const label = $(labelSelector)
  if (!talent) {
    range.disabled = true
    range.value = 0
    label.textContent = '—'
    return
  }
  range.disabled = false
  range.max = talent.maxLevel
  if (+range.value < 1) range.value = 1
  if (+range.value > talent.maxLevel) range.value = talent.maxLevel
  label.textContent = `${range.value} / ${range.max}`
}

function currentCalcCfg() {
  const first = $('#cT1').value
  const second = $('#cT2').value
  const talents = {}
  if (first) talents[first] = +$('#cL1').value
  if (second && second !== first) talents[second] = +$('#cL2').value
  const gems = $$('#cGems .gemchip.on').map((chip) => chip.dataset.id)
  return {
    weapon: $('#cWeapon').value,
    talents,
    guild: $('#cGuild').value || null,
    gems,
    hpPct: +$('#cHp').value,
    target: TARGETS.find((target) => target.id === $('#cTarget').value),
  }
}

function calc() {
  const cfg = currentCalcCfg()
  const target = cfg.target
  writeSavedState({
    weapon: cfg.weapon,
    talents: cfg.talents,
    guild: cfg.guild,
    gems: cfg.gems,
    target: target.id,
    hpPct: cfg.hpPct,
  })
  const tg = {
    hp: target.hp,
    maxHp: target.maxHp,
    attack: target.atk,
    dodge: target.dodge,
    armor: target.abilities.includes('armor'),
    frozen: false,
    abilities: target.abilities,
    isBoss: target.isBoss,
    isSea: target.isSea,
  }
  const derived = derive({ weapon: cfg.weapon, talents: cfg.talents, guild: cfg.guild, gems: cfg.gems }, tg)
  if (!derived) {
    $('#oDmg').innerHTML = '—'
    return
  }

  /* 魔化宝石按稳态平均层数近似：未暴击 +1、暴击清零，上限来自 src/data */
  const magicStacks = magicMeanStacks(derived)
  const state = { hpPct: cfg.hpPct, cleanliness: 100, boneStacks: 0, magicStacks }
  const exact = derived.isMelee ? meleeExact(derived, tg, state) : rangedExact(derived, tg, state)
  const monteCarlo = perTurnMC(derived, tg, {
    sims: 12000,
    seed: 3,
    cleanliness: 100,
    hpPct: cfg.hpPct,
    magicStacks,
  })
  const fight = fightStats(derived, tg, { sims: 200, seed: 11 })

  $('#oDmg').innerHTML = num(exact.perTurn) + '<small> / 回合</small>'

  const whitelistKey = Object.keys(MECH.whitelists).find((key) =>
    MECH.whitelists[key].weaponIds.includes(cfg.weapon),
  )
  const talentText =
    Object.entries(cfg.talents)
      .map(([key, level]) => `${MECH.talents[key].label} ${level}`)
      .join(' + ') || '无天赋'
  $('#oMeta').innerHTML = `${esc(WEAPONS[cfg.weapon].name)} · ${esc(talentText)} · ${esc(
    cfg.guild ? MECH.guilds.find((guild) => guild.id === cfg.guild).name : '无公会',
  )} · ${esc(target.name)}`

  const parts = []
  if (derived.isMelee) {
    parts.push([exact.execExp ? '连击+致命' : '连击', exact.comboDmg + (exact.execExp || 0)])
    if (exact.drawExp) parts.push(['拔刀', exact.drawExp])
    if (exact.backExp) parts.push(['背刺', exact.backExp])
  } else {
    parts.push(['主弹', exact.main])
    if (exact.pierce) parts.push(['贯穿', exact.pierce])
    if (exact.spray) parts.push(['泼射', exact.spray])
  }
  const total = parts.reduce((sum, part) => sum + part[1], 0) || 1
  const colors = ['var(--accent)', '#c9a227', '#8b74b8', '#4b87b8']
  $('#oStack').innerHTML = parts
    .map(
      ([, value], index) =>
        `<i style="width:${((value / total) * 100).toFixed(1)}%;background:${parts.length > 1 ? colors[index] : 'var(--accent)'}"></i>`,
    )
    .join('')
  $('#oStackLbl').innerHTML = parts.map(([key, value]) => `${key} ${num(value)}`).join(' · ')

  const rows = [
    ['期望击数/回合', derived.isMelee ? num(exact.hits) : '1'],
    ['暴击率', num((exact.pCrit || 0) * 100) + '%'],
    ['爆伤倍率', num(exact.cdmg) + '×'],
    ['攻击基数', num(derived.atk) + (derived.flat ? `（+${derived.flat} 平砍）` : '')],
    ['致命一击修正', exact.execExp ? num(exact.execExp) : '—'],
    ['单回合中位伤害', num(monteCarlo.median)],
    ['单回合 P90', num(monteCarlo.p90)],
    ['每回合耗损', derived.isMelee ? num(exact.durPerTurn) + ' 耐久' : num(exact.cleanPerTurn) + ' 清洁度'],
    ['击杀回合数（模拟）', fight.meanTurns ? fight.meanTurns.toFixed(2) + `（胜率 ${(fight.winRate * 100).toFixed(0)}%）` : '—'],
    ['期望碎骨叠层/回合', exact.bonePerTurn > 0 ? exact.bonePerTurn.toFixed(2) : '—'],
  ]
  if (derived.gems.has('magic-gem')) {
    rows.push(
      ['魔化平均层数', `${magicStacks.toFixed(1)} / ${MAGIC_GEM_STACK.max}`],
      [
        '魔化暴击加成',
        `+${num(magicStacks * MAGIC_GEM_STACK.critPerStack * 100)}%`,
      ],
    )
  }
  $('#oKv').innerHTML = rows.map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`).join('')

  const warns = []
  if (whitelistKey && !Object.keys(cfg.talents).includes(whitelistKey))
    warns.push(`${WEAPONS[cfg.weapon].name} 在「${MECH.whitelists[whitelistKey].name}」名单里，但这条天赋没启用——专项效果不生效。`)
  if (derived.isMelee && derived.weapon.id === 'knight-sword' && cfg.guild !== 'knight')
    warns.push('骑士剑的公会加成全部锁在骑士公会，且生命上限 +20 也需要同时装备骑士剑。')
  if (cfg.guild === 'knight' && cfg.weapon !== 'knight-sword')
    warns.push('骑士公会只对骑士剑生效，当前武器拿不到任何加成。')
  if (cfg.guild === 'warrior' && !MECH.guilds.find((guild) => guild.id === 'warrior').weaponIds.includes(cfg.weapon))
    warns.push('战士公会的 +25 只对匕首/长矛/手斧/威能战斧生效。')
  if (cfg.guild === 'hunter' && !MECH.guilds.find((guild) => guild.id === 'hunter').weaponIds.includes(cfg.weapon))
    warns.push('猎人公会的免衰减只对弓弩生效。')
  if (cfg.gems.includes('magic-gem') && (exact.pCrit || 0) > 0.5)
    warns.push(
      `魔化宝石：暴击率较高，稳态平均约 ${magicStacks.toFixed(1)} 层（上限 ${MAGIC_GEM_STACK.max} 层），收益有限。`,
    )
  if (Object.keys(cfg.talents).includes('assault') && !MECH.whitelists.assault.weaponIds.includes(cfg.weapon))
    warns.push(`突击天赋只对 10 把步枪生效，${WEAPONS[cfg.weapon].name} 拿不到 +攻击 / +暴击 / +爆伤。`)
  if (cfg.weapon === 'trident' && !target.isSea)
    warns.push('三叉戟的海洋伤害 +50% 只在深海战斗生效，当前靶标不是深海。')
  if (cfg.gems.includes('ocean-gem') && !target.isSea)
    warns.push('海洋宝石的近战 +20 只在深海战斗生效，当前靶标不是深海。')
  if (exact.bonePerTurn > 0 && target.hp <= 300)
    warns.push('碎骨骨层挂在僵尸身上，清杂时每只怪都要重新叠——这是 BOSS 构筑。')
  $('#oWarn').innerHTML = warns.map((warning) => '⚠ ' + esc(warning)).join('<br>')
}

let calcTimer = 0
function scheduleCalc() {
  clearTimeout(calcTimer)
  calcTimer = setTimeout(calc, 120)
}

/** 把上次保存的构筑选择套回控件；任何失效的选项都跳过，回到默认值 */
function restoreState() {
  const state = readSavedState()
  if (!state) return

  const pairs = Object.entries(state.talents || {})
    .filter(([key]) => MECH.talents[key])
    .slice(0, 2)
  ;['#cT1', '#cT2'].forEach((selector) => {
    $(selector).value = ''
  })
  ;['#cL1', '#cL2'].forEach((selector) => {
    $(selector).value = 0
  })
  pairs.forEach(([key, level], index) => {
    $(`#cT${index + 1}`).value = key
    $(`#cL${index + 1}`).value = level
  })
  syncLevel('#cT1', '#cL1', '#cL1v')
  syncLevel('#cT2', '#cL2', '#cL2v')
  renderWeaponOptions()

  if (state.weapon && WEAPON_LIST.some((weapon) => weapon.id === state.weapon))
    $('#cWeapon').value = state.weapon
  if (state.guild && MECH.guilds.some((guild) => guild.id === state.guild))
    $('#cGuild').value = state.guild
  if (state.target && TARGETS.some((target) => target.id === state.target))
    $('#cTarget').value = state.target
  if (state.hpPct != null && $('#cHp').querySelector(`option[value="${state.hpPct}"]`))
    $('#cHp').value = String(state.hpPct)
  const gemIds = Array.isArray(state.gems) ? state.gems : []
  $$('#cGems .gemchip').forEach((chip) => {
    chip.classList.toggle('on', gemIds.includes(chip.dataset.id))
  })
}

export function initCalc() {
  const talentSelects = [$('#cT1'), $('#cT2')]
  talentSelects.forEach((select) => {
    const blank = el('option')
    blank.value = ''
    blank.textContent = '（不启用）'
    select.appendChild(blank)
    Object.entries(MECH.talents).forEach(([key, talent]) => {
      const option = el('option')
      option.value = key
      option.textContent = `${talent.label}（${talent.stat} L${talent.maxLevel}）${MECH.whitelists[key] ? ' · 专项' : ''}`
      select.appendChild(option)
    })
  })

  const guildSelect = $('#cGuild')
  const none = el('option')
  none.value = ''
  none.textContent = '（无公会）'
  guildSelect.appendChild(none)
  MECH.guilds.forEach((guild) => {
    const option = el('option')
    option.value = guild.id
    option.textContent = guild.name + (guild.weaponIds ? '（武器 +25）' : '')
    guildSelect.appendChild(option)
  })

  const gemBox = $('#cGems')
  MECH.gems.forEach((gem) => {
    const chip = el('div', 'gemchip', gem.name)
    chip.dataset.id = gem.id
    chip.onclick = () => chip.classList.toggle('on')
    gemBox.appendChild(chip)
  })

  const targetSelect = $('#cTarget')
  TARGETS.forEach((target) => {
    const option = el('option')
    option.value = target.id
    option.textContent = `${target.name} · ${target.hp} HP · 攻 ${target.atk}` + (target.isSea ? ' · 深海' : '')
    targetSelect.appendChild(option)
  })

  const preferredWeapon = WEAPON_LIST.some((weapon) => weapon.id === 'butterfly-gold')
    ? 'butterfly-gold'
    : WEAPON_LIST[0]?.id
  if (MECH.talents.assassinate) $('#cT1').value = 'assassinate'
  if (MECH.talents.melee) $('#cT2').value = 'melee'
  if (MECH.talents.assassinate) $('#cL1').value = Math.min(4, MECH.talents.assassinate.maxLevel)
  if (MECH.talents.melee) $('#cL2').value = Math.min(3, MECH.talents.melee.maxLevel)
  syncLevel('#cT1', '#cL1', '#cL1v')
  syncLevel('#cT2', '#cL2', '#cL2v')

  renderWeaponOptions()
  if (preferredWeapon) $('#cWeapon').value = preferredWeapon
  guildSelect.value = ''
  $('#cHp').value = '1'
  targetSelect.value = 'mob'
  $$('#cGems .gemchip').forEach((chip) => chip.classList.remove('on'))

  restoreState()

  ;['#cWeapon', '#cGuild', '#cTarget', '#cHp'].forEach((selector) =>
    $(selector).addEventListener('input', scheduleCalc),
  )
  ;[
    ['#cT1', '#cL1', '#cL1v'],
    ['#cT2', '#cL2', '#cL2v'],
  ].forEach(([selectSelector, rangeSelector, labelSelector]) => {
    $(selectSelector).addEventListener('change', () => {
      syncLevel(selectSelector, rangeSelector, labelSelector)
      renderWeaponOptions()
      scheduleCalc()
    })
    $(rangeSelector).addEventListener('input', () => {
      syncLevel(selectSelector, rangeSelector, labelSelector)
      scheduleCalc()
    })
  })
  $('#cFitOnly').addEventListener('change', renderWeaponOptions)
  gemBox.addEventListener('click', scheduleCalc)
  calc()
}
