// 17 套流派详解：数值实时计算 + 快速筛选
import { BUILD_METRICS } from '../build-metrics.js'
import { MECH } from '../../data/source.js'
import { $, el, esc, num, statName, statValue, tierTag } from '../ui.js'

/** 天赋行实时取自 talents.js：等级对应的效果数值直接展示，不再手抄 */
function talentText(build) {
  const parts = Object.entries(build.talents).map(([key, level]) => {
    const talent = MECH.talents[key]
    if (!talent) return key
    const effect = talent.effects[Math.min(talent.maxLevel, Math.max(1, level)) - 1] || {}
    const detail = Object.entries(effect)
      .map(([stat, value]) => `${statName(stat)} ${statValue(stat, value)}`)
      .join(' + ')
    return `${talent.label} ${level}${detail ? `（${detail}）` : ''}`
  })
  return parts.join(' + ') || '—'
}

function guildText(build) {
  return build.guild ? MECH.guilds.find((guild) => guild.id === build.guild).name : '—'
}

function gemText(build) {
  return build.gems.map((id) => MECH.gems.find((gem) => gem.id === id)?.name ?? id).join(' / ') || '—'
}

function rankRows(build) {
  const max = build.rank[0]?.perTurn || 1
  return build.rank
    .map(
      (row) => `<div class="bench-row" style="grid-template-columns:112px 1fr 58px">
        <span class="label" title="${esc(row.weapon.name)}">${esc(row.weapon.name)}</span>
        <div class="bar-bg"><div class="bar-fill ${row.id === build.weapon ? '' : 'alt'}" style="width:${((row.perTurn / max) * 100).toFixed(1)}%"></div></div>
        <span class="val">${num(row.perTurn)}</span>
      </div>`,
    )
    .join('')
}

function applyFilters(cards, state) {
  let visible = 0
  cards.forEach((card) => {
    const okGroup = !state.group || card.dataset.group === state.group
    const okCat = !state.cat || card.dataset.cat === state.cat
    const okSearch = !state.q || card.dataset.tags.includes(state.q)
    const ok = okGroup && okCat && okSearch
    card.hidden = !ok
    if (ok) visible++
  })
  $('#buildCount').textContent = `显示 ${visible} / ${cards.length} 套`
  $('#buildEmpty').hidden = visible > 0
}

function initBuildFilters(cards) {
  const state = { group: '', cat: '', q: '' }
  const bar = $('#buildFilters')

  bar.querySelectorAll('[data-filter]').forEach((group) => {
    const kind = group.dataset.filter
    group.querySelectorAll('.filter-btn').forEach((button) => {
      button.addEventListener('click', () => {
        state[kind] = button.dataset.value
        group.querySelectorAll('.filter-btn').forEach((item) => item.classList.toggle('on', item === button))
        applyFilters(cards, state)
      })
    })
  })

  $('#buildSearch').addEventListener('input', (event) => {
    state.q = event.target.value.trim().toLowerCase()
    applyFilters(cards, state)
  })

  applyFilters(cards, state)
}

export function renderBuilds() {
  const box = $('#buildsGrid')
  const cards = []

  BUILD_METRICS.forEach((build) => {
    const main = build.main
    const weapon = main.weapon
    const card = el('div', 'bcard')
    const drain = main.isMelee
      ? `${num(main.durPerTurn)} 耐久 / 回合`
      : `${num(main.cleanPerTurn)} 清洁度 / 回合`

    card.innerHTML = `
      <div class="bhead">
        <div class="top"><span class="bname">${esc(build.name)}</span>
          <span class="chip ${build.group === '公会' ? 'acc' : ''}">${build.group}型</span>
          ${tierTag(weapon.tier)}</div>
        <div class="btag">${esc(build.tagline)}</div>
      </div>
      <div class="bbody">
        <div class="bstat">
          <div class="hi"><b>${num(main.perTurn)}</b><span>期望 / 回合</span></div>
          <div><b>${num(main.pCrit * 100)}%</b><span>暴击率</span></div>
          <div><b>${num(main.cdmg)}×</b><span>爆伤倍率</span></div>
          <div><b style="font-size:13px">${drain}</b><span>耗损</span></div>
        </div>
        <div class="brow">
          <span>武器 <b>${esc(weapon.name)}</b></span>
          <span>天赋 <b>${esc(talentText(build))}</b></span>
          <span>公会 <b>${esc(guildText(build))}</b></span>
          <span>宝石 <b>${esc(gemText(build))}</b></span>
        </div>
        <div class="brow">
          <span>击数 <b>${num(main.hits)}</b></span>
          <span>口径 <b>100 HP 游荡丧尸 · 满血 · 满清洁</b></span>
          ${main.healPerTurn ? `<span>吸血 <b>≈ ${num(main.healPerTurn)} HP / 回合</b></span>` : ''}
        </div>
        <details class="brank">
          <summary>名单内武器排行（实时）</summary>
          <div>${rankRows(build)}</div>
        </details>
        <div class="bnote">${esc(build.note)}</div>
      </div>`

    card.dataset.group = build.group
    card.dataset.cat = main.isMelee ? 'melee' : 'ranged'
    card.dataset.tags = [
      build.name,
      build.tagline,
      weapon.name,
      build.group,
      talentText(build),
      guildText(build),
      gemText(build),
    ]
      .join(' ')
      .toLowerCase()

    box.appendChild(card)
    cards.push(card)
  })

  initBuildFilters(cards)
}
