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
        if (guild.durabilityExtraCost) extra.push('每击耐久 +' + guild.durabilityExtraCost)
        if (guild.cleanlinessExtraCost) extra.push('每击清洁度 +' + guild.cleanlinessExtraCost)
        if (guild.healBonusChance) extra.push('治疗药 ' + Math.round(guild.healBonusChance * 100) + '% 额外 +' + guild.healBonusHp)
        if (guild.lifestealChance) extra.push('镰刀 ' + Math.round(guild.lifestealChance * 100) + '% 吸血 ' + guild.lifestealHp)
        if (guild.fleeBonus) extra.push('逃跑 +' + Math.round(guild.fleeBonus * 100) + '%')
        if (guild.zeroStatDrain) extra.push('属性归零/感染满 每回合 -' + guild.zeroStatDrain + ' 生命')
        return `<tr><td><b>${esc(guild.name)}</b><br><span class="badge">${guild.id}</span></td>
        <td class="small">${weapons === '—' ? '—' : esc(weapons) + '<br><span class="muted">每击平砍 +' + (guild.damageBonus || 0) + '</span>'}</td>
        <td class="small">${extra.join('<br>') || esc(guild.buff)}</td>
        <td>${guild.weaponIds ? '<span class="ok">是</span>' : '<span class="muted">否（后勤向）</span>'}</td></tr>`
      })
      .join('') +
    `</tbody>`

  $('#guildNote').innerHTML =
    '<b>三个带武器加成的公会同时只能进一个。</b>骑士公会的五项加成全部锁死在骑士剑上；猎人能绕开清洁度伤害衰减，代价是每枪多耗 1 点清洁度；战士每击多耗 1 点耐久。'
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
