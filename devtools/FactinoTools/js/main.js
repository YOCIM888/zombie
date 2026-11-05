// 启动：把实时数据灌进页面
import { WEAPON_LIST, MECH, TARGETS } from '../data/source.js'
import { BUILD_METRICS } from './build-metrics.js'
import { renderRank } from './sections/overview.js'
import { renderBuilds } from './sections/builds.js'
import { renderTalents, renderGuilds, renderGems } from './sections/reference.js'
import { initCalc } from './calculator.js'
import { $ } from './ui.js'

function setKpis() {
  $('#kpiBuilds').textContent = BUILD_METRICS.length
  $('#kpiTalents').textContent = Object.keys(MECH.talents).length
  $('#kpiGuilds').textContent = MECH.guilds.length
  $('#kpiGems').textContent = MECH.gems.length
  $('#kpiWeapons').textContent = WEAPON_LIST.filter((weapon) => weapon.id !== 'unarmed').length
  $('#dataMeta').textContent =
    `数据源 src/data · 实时载入 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })} · ` +
    `${TARGETS.length} 个靶标 · 构筑数值随配置重算`
}

function boot() {
  setKpis()
  renderRank()
  initCalc()
  renderBuilds()
  renderTalents()
  renderGuilds()
  renderGems()
}

$('#reloadData').addEventListener('click', () => location.reload())
boot()
