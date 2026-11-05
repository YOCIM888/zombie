// 天赋全表、公会、宝石
import { WEAPONS, MECH, TALENT_ROWS } from '../../data/source.js'
import { $, el, esc, statName, statValue } from '../ui.js'

export function renderTalents() {
  const table = $('#talentTbl')
  table.innerHTML =
    `<thead><tr><th>天赋</th><th>效果（逐级）</th><th class="num">上限</th><th>训练名单</th></tr></thead><tbody>` +
    TALENT_ROWS.map(
      (row) => `<tr>
      <td><b>${esc(row.label)}</b><br><span class="badge">${row.key}</span></td>
      <td class="small">${row.effects
        .map(
          (effect, index) =>
            `${index + 1}级 ${Object.entries(effect)
              .map(([key, value]) => `${statName(key)} ${statValue(key, value)}`)
              .join(' + ')}`,
        )
        .join('<br>')}</td>
      <td class="num">${row.maxLevel}</td>
      <td class="small ${row.wl ? '' : 'muted'}">${row.wl ? esc(row.wlText) : '<span class="muted">通用（无名单限制）</span>'}</td>
    </tr>`,
    ).join('') +
    `</tbody>`
}

export function renderGuilds() {
  const table = $('#guildTbl')
  table.innerHTML =
    `<thead><tr><th>公会</th><th>武器加成</th><th>其他效果</th><th>进入伤害公式</th></tr></thead><tbody>` +
    MECH.guilds
      .map((guild) => {
        const weapons = guild.weaponIds
          ? guild.weaponIds.map((id) => (WEAPONS[id] ? WEAPONS[id].name : id)).join(' / ')
          : '—'
        const extra = []
        if (guild.maxHpBonus) extra.push('生命上限 +' + guild.maxHpBonus)
        if (guild.critBonus) extra.push('暴击 +' + Math.round(guild.critBonus * 100) + '%')
        if (guild.critDamageBonus) extra.push('爆伤 +' + Math.round(guild.critDamageBonus * 100) + '%')
        if (guild.comboBonus) extra.push('连击 +' + Math.round(guild.comboBonus * 100) + '%')
        if (guild.durabilityCostMultiplier) extra.push('耐久消耗 ×' + guild.durabilityCostMultiplier)
        if (guild.cleanlinessCostMultiplier) extra.push('清洁度消耗 ×' + guild.cleanlinessCostMultiplier)
        return `<tr><td><b>${esc(guild.name)}</b><br><span class="badge">${guild.id}</span></td>
        <td class="small">${weapons === '—' ? '—' : esc(weapons) + '<br><span class="muted">每击平砍 +' + (guild.damageBonus || 0) + '</span>'}</td>
        <td class="small">${extra.join('<br>') || esc(guild.buff)}</td>
        <td>${guild.weaponIds ? '<span class="ok">是</span>' : '<span class="muted">否（后勤向）</span>'}</td></tr>`
      })
      .join('') +
    `</tbody>`

  $('#guildNote').innerHTML =
    '<b>三个带武器加成的公会同时只能进一个。</b>骑士公会的五项加成全部锁死在骑士剑上；猎人是唯一能绕开清洁度伤害衰减的通道，但清洁度消耗 ×2。'
}

export function renderGems() {
  const box = $('#gems')
  const inCalc = new Set(['blood-gem', 'tenacity-gem', 'guardian-gem', 'magic-gem'])
  MECH.gems.forEach((gem) => {
    const card = el('div', 'card')
    card.innerHTML = `<div class="top" style="display:flex;gap:8px;align-items:center">
        <b style="font-size:15px">${esc(gem.name)}</b>
        ${inCalc.has(gem.id) ? '<span class="chip acc">进伤害公式</span>' : '<span class="chip">消耗品 / 地形</span>'}</div>
      <div class="small muted" style="margin-top:6px">${esc(gem.desc)}</div>`
    box.appendChild(card)
  })
}
