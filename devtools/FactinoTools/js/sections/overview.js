// 期望伤害总览：16 套构筑全部实时计算
import { BUILD_METRICS } from '../build-metrics.js'
import { $, el, esc, num } from '../ui.js'

export function renderRank() {
  const sorted = BUILD_METRICS.slice().sort((a, b) => b.main.perTurn - a.main.perTurn)
  const max = sorted[0]?.main.perTurn || 1
  const box = $('#rankChart')

  sorted.forEach((build, index) => {
    const row = el('div', 'bench-row')
    row.innerHTML = `<span class="label" title="${esc(build.name)}">${index + 1}. ${esc(build.name)}</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${((build.main.perTurn / max) * 100).toFixed(1)}%"></div></div>
      <span class="val">${num(build.main.perTurn)}</span>`
    row.title = `${build.name} · ${build.main.weapon.name} · ${num(build.main.perTurn)} / 回合（实时）`
    box.appendChild(row)
  })

  const meleeTop = sorted.find((build) => build.main.isMelee)
  const rangedTop = sorted.find((build) => !build.main.isMelee)
  const lowest = sorted[sorted.length - 1]
  const gap = meleeTop && rangedTop ? (1 - rangedTop.main.perTurn / meleeTop.main.perTurn) * 100 : 0

  const notes = [
    [
      '近战最高',
      `${meleeTop.name} · ${num(meleeTop.main.perTurn)}`,
      `使用 ${meleeTop.main.weapon.name}，靠连击与爆伤把单回合期望堆到近战池顶端。`,
    ],
    [
      '远程最高',
      `${rangedTop.name} · ${num(rangedTop.main.perTurn)}`,
      `使用 ${rangedTop.main.weapon.name}；非猎人远程还要额外承担清洁度伤害衰减。当前近战最高比它高 ${gap.toFixed(0)}%。`,
    ],
    [
      '最低输出',
      `${lowest.name} · ${num(lowest.main.perTurn)}`,
      `使用 ${lowest.main.weapon.name}；这套的卖点不是伤害，而是它附带的生存或控场机制。`,
    ],
  ]

  const box2 = $('#rankNotes')
  notes.forEach(([title, value, desc]) => {
    const card = el('div', 'card')
    card.innerHTML = `<div class="subhead" style="margin:0">${title}</div>
      <div class="mono" style="font-size:19px;letter-spacing:-.02em;margin:2px 0 6px">${value}</div>
      <div class="small muted">${desc}</div>`
    box2.appendChild(card)
  })
}
