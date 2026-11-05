<script setup>
// 玩家侧「流派构筑」：数据与 devtools/FactinoTools 共用同一套 src/data 与计算模型，
// 这里只在打开面板时按需加载（动态 import），不会进入主 bundle 首屏。
import { computed, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import ModalShell from './ModalShell.vue'
import { MAGIC_GEM_STACK } from '../data/items/gem.js'

defineEmits(['close'])

const STORAGE_KEY = 'xingshi.build-calc.v1'
/** 只有这几颗宝石会进入伤害公式，其余是消耗品/地形，避免玩家误选 */
const CALC_GEM_IDS = ['blood-gem', 'tenacity-gem', 'guardian-gem', 'magic-gem', 'ocean-gem']
const TIER_COLORS = {
  普通: '#8a8578',
  稀有: '#7d9c4e',
  精良: '#4b87b8',
  史诗: '#8b74b8',
  传说: '#c9a227',
  神话: '#e26a4c',
  限定: '#e0d6c2',
}
const HP_OPTIONS = [
  { value: 1, label: '100% 满血' },
  { value: 0.7, label: '70%' },
  { value: 0.4, label: '40%（焚血 ×1.25）' },
  { value: 0.15, label: '15%（焚血 ×1.4）' },
]

/** 面板数据：流派卡片 + 同类武器排行 + 计算器所需的原始数据与模型函数 */
const data = shallowRef(null)
const loadError = ref('')
const mode = ref('reference')

const cfg = reactive({
  weapon: '',
  t1: '',
  l1: 1,
  t2: '',
  l2: 1,
  guild: '',
  gems: [],
  target: 'mob',
  hpPct: 1,
})

const num = (value) =>
  value == null || Number.isNaN(value)
    ? '—'
    : (Math.round(value * 10) / 10).toLocaleString('en-US')

const pct = (value) => `${Math.round((Number(value) || 0) * 1000) / 10}%`

const builds = computed(() => data.value?.builds ?? [])
const overview = computed(() =>
  [...builds.value].sort((a, b) => b.main.perTurn - a.main.perTurn),
)
const maxPerTurn = computed(() => overview.value[0]?.main.perTurn || 1)
const mech = computed(() => data.value?.mech ?? null)

const meleeWeapons = computed(() =>
  (data.value?.weaponList ?? []).filter((weapon) => weapon.cat === 'melee'),
)
const rangedWeapons = computed(() =>
  (data.value?.weaponList ?? []).filter((weapon) => weapon.cat === 'ranged'),
)
const talentOptions = computed(() =>
  Object.entries(mech.value?.talents ?? {}).map(([key, talent]) => ({ key, ...talent })),
)
const calcGems = computed(() =>
  (mech.value?.gems ?? []).filter((gem) => CALC_GEM_IDS.includes(gem.id)),
)

function talentLabel(key, level) {
  const talent = mech.value?.talents?.[key]
  return talent ? `${talent.label} ${level}` : key
}

function guildName(id) {
  return mech.value?.guilds?.find((guild) => guild.id === id)?.name ?? '—'
}

function gemNames(ids) {
  return ids
    .map((id) => mech.value?.gems?.find((gem) => gem.id === id)?.name ?? id)
    .join(' / ')
}

function tierColor(tier) {
  return TIER_COLORS[tier] ?? '#8a8578'
}

function drainText(main) {
  return main.isMelee
    ? `${num(main.durPerTurn)} 耐久 / 回合`
    : `${num(main.cleanPerTurn)} 清洁度 / 回合`
}

/* ---------------- 自由计算 ---------------- */

const maxLevel = (key) => mech.value?.talents?.[key]?.maxLevel ?? 0

function normalizeLevel(slot) {
  const key = slot === 1 ? cfg.t1 : cfg.t2
  const max = maxLevel(key)
  const next = max > 0 ? Math.min(Math.max(1, (slot === 1 ? cfg.l1 : cfg.l2) || 1), max) : 0
  if (slot === 1) cfg.l1 = next
  else cfg.l2 = next
}

watch(() => cfg.t1, () => normalizeLevel(1))
watch(() => cfg.t2, () => normalizeLevel(2))

const calc = computed(() => {
  const store = data.value
  if (!store || !cfg.weapon) return null
  const target = store.targets.find((item) => item.id === cfg.target) ?? store.targets[0]
  const talents = {}
  if (cfg.t1) talents[cfg.t1] = cfg.l1
  if (cfg.t2 && cfg.t2 !== cfg.t1) talents[cfg.t2] = cfg.l2

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
  const derived = store.derive(
    { weapon: cfg.weapon, talents, guild: cfg.guild || null, gems: cfg.gems },
    tg,
  )
  if (!derived) return null

  const magicStacks = store.magicMeanStacks(derived)
  const state = { hpPct: cfg.hpPct, cleanliness: 100, boneStacks: 0, magicStacks }
  const exact = derived.isMelee
    ? store.meleeExact(derived, tg, state)
    : store.rangedExact(derived, tg, state)

  const parts = derived.isMelee
    ? [
        [exact.execExp ? '连击 + 致命' : '连击', exact.comboDmg + (exact.execExp || 0)],
        ['拔刀', exact.drawExp],
        ['背刺', exact.backExp],
      ]
    : [
        ['主弹', exact.main],
        ['贯穿', exact.pierce],
        ['泼射', exact.spray],
        ['推土机', exact.bulldozer],
      ]
  const shown = parts.filter(([, value]) => value > 0)
  const total = shown.reduce((sum, [, value]) => sum + value, 0) || 1

  const rows = [
    { label: '期望击数 / 回合', value: derived.isMelee ? num(exact.hits) : '1' },
    { label: '暴击率', value: pct(exact.pCrit) },
    { label: '爆伤倍率', value: `${num(exact.cdmg)}×` },
    {
      label: '攻击基数',
      value: num(derived.atk) + (derived.flat ? `（+${derived.flat} 平砍）` : ''),
    },
    { label: '致命一击修正', value: exact.execExp ? num(exact.execExp) : '—' },
    {
      label: '每回合耗损',
      value: derived.isMelee
        ? `${num(exact.durPerTurn)} 耐久`
        : `${num(exact.cleanPerTurn)} 清洁度`,
    },
    {
      label: '期望碎骨叠层 / 回合',
      value: exact.bonePerTurn > 0 ? exact.bonePerTurn.toFixed(2) : '—',
    },
  ]
  if (derived.gems.has('magic-gem')) {
    rows.push({ label: '魔化平均层数', value: `${magicStacks.toFixed(1)} / ${MAGIC_GEM_STACK.max}` })
  }

  const weapon = store.weapons[cfg.weapon]
  const whitelistKey = Object.keys(mech.value.whitelists).find((key) =>
    mech.value.whitelists[key].weaponIds.includes(cfg.weapon),
  )
  const warnings = []
  if (whitelistKey && !talents[whitelistKey]) {
    warnings.push(
      `${weapon.name} 在「${mech.value.whitelists[whitelistKey].name}」名单里，但对应天赋没启用——专项效果不生效。`,
    )
  }
  if (derived.isMelee && weapon.id === 'knight-sword' && cfg.guild !== 'knight') {
    warnings.push('骑士剑的公会加成全部锁在骑士公会。')
  }
  if (cfg.guild === 'knight' && weapon.id !== 'knight-sword') {
    warnings.push('骑士公会只对骑士剑生效，当前武器拿不到任何加成。')
  }
  if (cfg.guild === 'warrior' && !mech.value.guilds.find((g) => g.id === 'warrior').weaponIds.includes(weapon.id)) {
    warnings.push('战士公会的平砍只对匕首 / 长矛 / 手斧 / 威能战斧生效。')
  }
  if (cfg.guild === 'hunter' && !mech.value.guilds.find((g) => g.id === 'hunter').weaponIds.includes(weapon.id)) {
    warnings.push('猎人公会的免清洁度衰减只对弓弩生效。')
  }
  if (weapon.id === 'trident' && !target.isSea) {
    warnings.push('三叉戟的海洋 +50% 只在深海战斗生效。')
  }
  if (derived.gems.has('ocean-gem') && !target.isSea) {
    warnings.push('海洋宝石的近战 +20 只在深海战斗生效。')
  }
  if (exact.bonePerTurn > 0 && target.hp <= 300) {
    warnings.push('骨层挂在僵尸身上，换怪清零——碎骨是 BOSS 构筑，不适合清杂。')
  }

  return { weapon, target, derived, exact, parts: shown, total, rows, warnings, talents }
})

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        weapon: cfg.weapon,
        talents: { [cfg.t1]: cfg.l1, [cfg.t2]: cfg.l2 },
        guild: cfg.guild,
        gems: cfg.gems,
        target: cfg.target,
        hpPct: cfg.hpPct,
      }),
    )
  } catch {
    /* 隐私模式下不保存即可 */
  }
}

watch(cfg, save, { deep: true })

/** 套用上次选择；失效项直接跳过，不报错 */
function restore() {
  const store = data.value
  const saved = readSaved()
  const weaponIds = store.weaponList.map((weapon) => weapon.id)
  const fallback =
    weaponIds.includes('butterfly-gold') ? 'butterfly-gold' : store.weaponList[0]?.id ?? ''
  cfg.weapon = saved?.weapon && weaponIds.includes(saved.weapon) ? saved.weapon : fallback

  const pairs = Object.entries(saved?.talents || {})
    .filter(([key]) => store.mech.talents[key])
    .slice(0, 2)
  cfg.t1 = pairs[0]?.[0] || (store.mech.talents.assassinate ? 'assassinate' : '')
  cfg.l1 = pairs[0]?.[1] || (cfg.t1 ? maxLevel(cfg.t1) : 0)
  cfg.t2 = pairs[1]?.[0] || (store.mech.talents.melee ? 'melee' : '')
  cfg.l2 = pairs[1]?.[1] || Math.min(3, maxLevel(cfg.t2))

  cfg.guild =
    saved?.guild && store.mech.guilds.some((guild) => guild.id === saved.guild) ? saved.guild : ''
  const gemIds = new Set(calcGems.value.map((gem) => gem.id))
  cfg.gems = Array.isArray(saved?.gems) ? saved.gems.filter((id) => gemIds.has(id)) : []
  cfg.target = saved?.target && store.targets.some((t) => t.id === saved.target) ? saved.target : 'mob'
  cfg.hpPct = HP_OPTIONS.some((option) => option.value === saved?.hpPct) ? saved.hpPct : 1

  normalizeLevel(1)
  normalizeLevel(2)
}

onMounted(async () => {
  try {
    const [metrics, source, model] = await Promise.all([
      import('../../devtools/FactinoTools/js/build-metrics.js'),
      import('../../devtools/FactinoTools/data/source.js'),
      import('../../devtools/FactinoTools/js/model.js'),
    ])
    data.value = {
      builds: metrics.BUILD_METRICS,
      weapons: source.WEAPONS,
      weaponList: source.WEAPON_LIST,
      mech: source.MECH,
      targets: source.TARGETS,
      derive: model.derive,
      meleeExact: model.meleeExact,
      rangedExact: model.rangedExact,
      magicMeanStacks: model.magicMeanStacks,
    }
    restore()
  } catch (error) {
    loadError.value = error?.message || String(error)
  }
})
</script>

<template>
  <ModalShell
    title="流派构筑"
    sub="16 套流派搭配与期望伤害，数值随 src/data 实时重算"
    wide
    @close="$emit('close')"
  >
    <template #hud>
      <div class="bc-tabs">
        <button
          type="button"
          :class="{ on: mode === 'reference' }"
          @click="mode = 'reference'"
        >
          流派参考
        </button>
        <button type="button" :class="{ on: mode === 'calc' }" @click="mode = 'calc'">
          自由计算
        </button>
      </div>
    </template>

    <div v-if="loadError" class="bc-state">构筑数据加载失败：{{ loadError }}</div>
    <div v-else-if="!data" class="bc-state">正在准备构筑数据…</div>

    <template v-else>
      <!-- ===== 流派参考 ===== -->
      <div v-if="mode === 'reference'" class="bc-ref">
        <section class="bc-overview">
          <div class="bc-ov-head">
            <span>期望伤害总览 · {{ builds.length }} 套</span>
            <span>期望 / 回合</span>
          </div>
          <div v-for="(build, index) in overview" :key="build.id" class="bc-ov-row">
            <span class="bc-ov-no">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="bc-ov-name">
              {{ build.name }}
              <em>{{ build.group }}型</em>
            </span>
            <span class="bc-bar">
              <i :style="{ width: (build.main.perTurn / maxPerTurn) * 100 + '%' }" />
            </span>
            <span class="bc-ov-val">{{ num(build.main.perTurn) }}</span>
          </div>
        </section>

        <div class="bc-grid">
          <article v-for="build in overview" :key="build.id" class="bc-card">
            <header class="bc-card-head">
              <div class="bc-card-title">
                <span class="bc-name">{{ build.name }}</span>
                <span class="bc-chip">{{ build.group }}型</span>
                <span class="bc-tier" :style="{ color: tierColor(build.main.weapon.tier) }">
                  {{ build.main.weapon.tier }}
                </span>
              </div>
              <p class="bc-tag">{{ build.tagline }}</p>
            </header>

            <div class="bc-nums">
              <div class="hi"><b>{{ num(build.main.perTurn) }}</b><span>期望 / 回合</span></div>
              <div><b>{{ pct(build.main.pCrit) }}</b><span>暴击率</span></div>
              <div><b>{{ num(build.main.cdmg) }}×</b><span>爆伤倍率</span></div>
              <div><b>{{ drainText(build.main) }}</b><span>耗损</span></div>
            </div>

            <dl class="bc-meta">
              <div><dt>武器</dt><dd>{{ build.main.weapon.name }}</dd></div>
              <div>
                <dt>天赋</dt>
                <dd>
                  {{
                    Object.entries(build.talents)
                      .map(([key, level]) => talentLabel(key, level))
                      .join(' + ') || '—'
                  }}
                </dd>
              </div>
              <div><dt>公会</dt><dd>{{ guildName(build.guild) }}</dd></div>
              <div><dt>宝石</dt><dd>{{ gemNames(build.gems) }}</dd></div>
              <div><dt>击数</dt><dd>{{ num(build.main.hits) }} · 100 HP 游荡丧尸 · 满血</dd></div>
            </dl>

            <details class="bc-rank">
              <summary>名单内武器排行（实时）</summary>
              <div v-for="row in build.rank" :key="row.id" class="bc-rk-row">
                <span class="bc-rk-name">{{ row.weapon.name }}</span>
                <span class="bc-rk-bar">
                  <i
                    :style="{
                      width: (row.perTurn / build.rank[0].perTurn) * 100 + '%',
                      background: row.id === build.weapon ? 'var(--rust)' : 'var(--line-strong)',
                    }"
                  />
                </span>
                <span class="bc-rk-val">{{ num(row.perTurn) }}</span>
              </div>
            </details>

            <p class="bc-note">{{ build.note }}</p>
          </article>
        </div>
      </div>

      <!-- ===== 自由计算 ===== -->
      <div v-else class="bc-calc">
        <div class="bc-form">
          <label class="bc-fld">
            <span>武器</span>
            <select v-model="cfg.weapon">
              <optgroup label="近战武器">
                <option v-for="weapon in meleeWeapons" :key="weapon.id" :value="weapon.id">
                  {{ weapon.name }} · {{ weapon.tier }} · 攻{{ weapon.atk }}
                </option>
              </optgroup>
              <optgroup label="远程武器">
                <option v-for="weapon in rangedWeapons" :key="weapon.id" :value="weapon.id">
                  {{ weapon.name }} · {{ weapon.tier }} · 攻{{ weapon.atk }}
                </option>
              </optgroup>
            </select>
          </label>

          <div class="bc-fld">
            <span>天赋槽位 1</span>
            <div class="bc-slot">
              <select v-model="cfg.t1">
                <option value="">（不启用）</option>
                <option v-for="talent in talentOptions" :key="talent.key" :value="talent.key">
                  {{ talent.label }}（{{ talent.stat }} L{{ talent.maxLevel }}）
                </option>
              </select>
              <input
                v-model.number="cfg.l1"
                type="range"
                min="0"
                :max="maxLevel(cfg.t1) || 0"
                :disabled="!cfg.t1"
                @input="normalizeLevel(1)"
              />
              <em>{{ cfg.t1 ? `${cfg.l1} / ${maxLevel(cfg.t1)}` : '—' }}</em>
            </div>
          </div>

          <div class="bc-fld">
            <span>天赋槽位 2</span>
            <div class="bc-slot">
              <select v-model="cfg.t2">
                <option value="">（不启用）</option>
                <option v-for="talent in talentOptions" :key="talent.key" :value="talent.key">
                  {{ talent.label }}（{{ talent.stat }} L{{ talent.maxLevel }}）
                </option>
              </select>
              <input
                v-model.number="cfg.l2"
                type="range"
                min="0"
                :max="maxLevel(cfg.t2) || 0"
                :disabled="!cfg.t2"
                @input="normalizeLevel(2)"
              />
              <em>{{ cfg.t2 ? `${cfg.l2} / ${maxLevel(cfg.t2)}` : '—' }}</em>
            </div>
          </div>

          <label class="bc-fld">
            <span>公会</span>
            <select v-model="cfg.guild">
              <option value="">（无公会）</option>
              <option v-for="guild in mech.guilds" :key="guild.id" :value="guild.id">
                {{ guild.name }}{{ guild.weaponIds ? '（武器平砍）' : '' }}
              </option>
            </select>
          </label>

          <div class="bc-fld">
            <span>宝石（可多选）</span>
            <div class="bc-gems">
              <label v-for="gem in calcGems" :key="gem.id" class="bc-gem">
                <input v-model="cfg.gems" type="checkbox" :value="gem.id" />
                <span>{{ gem.name }}</span>
              </label>
            </div>
          </div>

          <label class="bc-fld">
            <span>靶标</span>
            <select v-model="cfg.target">
              <option v-for="target in data.targets" :key="target.id" :value="target.id">
                {{ target.name }} · {{ target.hp }} HP · 攻 {{ target.atk
                }}{{ target.isSea ? ' · 深海' : '' }}
              </option>
            </select>
          </label>

          <label class="bc-fld">
            <span>玩家血线（影响焚血宝石）</span>
            <select v-model.number="cfg.hpPct">
              <option v-for="option in HP_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <div v-if="calc" class="bc-out">
          <div class="bc-hero">
            <span>期望每回合伤害</span>
            <b>{{ num(calc.exact.perTurn) }}<small> / 回合</small></b>
            <p>
              {{ calc.weapon.name }} ·
              {{
                Object.entries(calc.talents)
                  .map(([key, level]) => talentLabel(key, level))
                  .join(' + ') || '无天赋'
              }}
              · {{ guildName(cfg.guild) }} · {{ calc.target.name }}
            </p>
          </div>

          <div v-if="calc.parts.length" class="bc-stack">
            <i
              v-for="(part, index) in calc.parts"
              :key="part[0]"
              :style="{
                width: (part[1] / calc.total) * 100 + '%',
                background: ['#c14a32', '#c9a227', '#8b74b8', '#4b87b8'][index % 4],
              }"
            />
          </div>
          <p class="bc-stack-lbl">
            {{ calc.parts.map(([name, value]) => `${name} ${num(value)}`).join(' · ') }}
          </p>

          <dl class="bc-kv">
            <div v-for="row in calc.rows" :key="row.label">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          </dl>

          <p v-for="warning in calc.warnings" :key="warning" class="bc-warn">⚠ {{ warning }}</p>
        </div>
        <div v-else class="bc-state">请选择武器后查看期望伤害。</div>
      </div>
    </template>

    <template #footer>
      <span>口径：无限血量吞吐期望 · 满清洁 · 满血；名单内武器排行按同一套天赋 / 公会 / 宝石计算。</span>
      <button type="button" class="btn bc-close" @click="$emit('close')">关闭</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.bc-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bc-close {
  flex: none;
  white-space: nowrap;
}

.bc-tabs button {
  padding: 7px 14px;
  border: 1px solid var(--line);
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--text-mute);
  background: rgba(0, 0, 0, 0.25);
  transition: 0.2s;
}

.bc-tabs button.on {
  border-color: rgba(193, 74, 50, 0.7);
  color: #f0e3d2;
  background: rgba(193, 74, 50, 0.18);
}

.bc-state {
  padding: 34px 8px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
}

/* ===== 总览 ===== */

.bc-overview {
  margin-bottom: 18px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.24);
}

.bc-ov-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--text-mute);
}

.bc-ov-row {
  display: grid;
  grid-template-columns: 26px minmax(0, 1.15fr) minmax(60px, 1fr) 62px;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  border-top: 1px solid rgba(214, 208, 191, 0.07);
  font-size: 11.5px;
}

.bc-ov-row:first-of-type {
  border-top: none;
}

.bc-ov-no {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-mute);
}

.bc-ov-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-dim);
}

.bc-ov-name em {
  margin-left: 6px;
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-mute);
}

.bc-bar,
.bc-rk-bar {
  display: block;
  height: 4px;
  background: rgba(214, 208, 191, 0.1);
  overflow: hidden;
}

.bc-bar i,
.bc-rk-bar i {
  display: block;
  height: 100%;
  background: var(--rust);
}

.bc-ov-val,
.bc-rk-val {
  font-family: var(--font-mono);
  font-size: 11px;
  text-align: right;
  color: var(--text);
}

/* ===== 卡片 ===== */

.bc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 12px;
}

.bc-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 15px 12px;
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(20, 23, 24, 0.7), rgba(11, 13, 14, 0.7));
}

.bc-card-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.bc-name {
  font-family: var(--font-title);
  font-size: 17px;
  letter-spacing: 0.1em;
  color: var(--text);
}

.bc-chip {
  padding: 1px 6px;
  border: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
}

.bc-tier {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.08em;
}

.bc-tag {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.6;
  letter-spacing: 0.03em;
  color: var(--text-mute);
}

.bc-nums {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 9px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.bc-nums div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.bc-nums b {
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
}

.bc-nums .hi b {
  font-size: 17px;
  color: var(--rust-soft);
}

.bc-nums span {
  font-size: 9.5px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.bc-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0;
  font-size: 10.5px;
  line-height: 1.6;
}

.bc-meta div {
  display: flex;
  gap: 8px;
}

.bc-meta dt {
  flex: none;
  width: 30px;
  color: var(--text-mute);
}

.bc-meta dd {
  margin: 0;
  min-width: 0;
  color: var(--text-dim);
  overflow-wrap: anywhere;
}

.bc-rank {
  border-top: 1px dashed var(--line);
  padding-top: 8px;
}

.bc-rank summary {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
  cursor: pointer;
}

.bc-rank summary:hover {
  color: var(--rust-soft);
}

.bc-rk-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(50px, 1.2fr) 52px;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 10.5px;
}

.bc-rk-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-dim);
}

.bc-note {
  margin: 0;
  font-size: 10px;
  line-height: 1.75;
  letter-spacing: 0.02em;
  color: var(--text-mute);
}

/* ===== 自由计算 ===== */

.bc-calc {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  gap: 14px;
  align-items: start;
}

.bc-form {
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 14px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.24);
}

.bc-fld {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.bc-fld select {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  font-size: 11.5px;
  letter-spacing: 0.02em;
  color: var(--text);
  background: rgba(0, 0, 0, 0.42);
  border: 1px solid var(--line-strong);
  outline: none;
}

.bc-fld select:focus {
  border-color: rgba(193, 74, 50, 0.7);
}

.bc-slot {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 84px 52px;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bc-slot select {
  min-width: 0;
  width: 100%;
}

.bc-slot input[type="range"] {
  width: 100%;
  min-width: 0;
  margin: 0;
  accent-color: var(--rust);
}

.bc-slot em {
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 10px;
  text-align: right;
  color: var(--text-dim);
}

.bc-gems {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.bc-gem {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border: 1px solid var(--line);
  font-size: 10.5px;
  color: var(--text-dim);
  cursor: pointer;
  transition: 0.2s;
}

.bc-gem:has(input:checked) {
  border-color: rgba(193, 74, 50, 0.7);
  color: #f0e3d2;
  background: rgba(193, 74, 50, 0.14);
}

.bc-gem input {
  accent-color: var(--rust);
}

.bc-out {
  padding: 14px;
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(20, 23, 24, 0.6), rgba(10, 12, 13, 0.6));
}

.bc-hero > span {
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--text-mute);
}

.bc-hero b {
  display: block;
  margin-top: 4px;
  font-family: var(--font-mono);
  font-size: 34px;
  font-weight: 500;
  line-height: 1.15;
  color: var(--rust-soft);
}

.bc-hero b small {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-mute);
}

.bc-hero p {
  margin: 4px 0 10px;
  font-size: 10.5px;
  line-height: 1.6;
  color: var(--text-mute);
}

.bc-stack {
  display: flex;
  height: 5px;
  overflow: hidden;
  background: rgba(214, 208, 191, 0.08);
}

.bc-stack i {
  display: block;
  height: 100%;
}

.bc-stack-lbl {
  margin: 6px 0 12px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  line-height: 1.7;
  color: var(--text-mute);
}

.bc-kv {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  border-top: 1px solid var(--line);
  font-size: 10.5px;
}

.bc-kv div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(214, 208, 191, 0.07);
}

.bc-kv dt {
  color: var(--text-mute);
}

.bc-kv dd {
  margin: 0;
  font-family: var(--font-mono);
  text-align: right;
  color: var(--text);
}

.bc-warn {
  margin: 8px 0 0;
  font-size: 10px;
  line-height: 1.7;
  color: #c9a227;
}

/* ===== 窄屏 ===== */

@media (max-width: 900px) {
  .bc-calc {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .bc-ov-row {
    grid-template-columns: 24px minmax(0, 1fr) 56px;
  }

  .bc-ov-row .bc-bar {
    display: none;
  }

  .bc-rk-row {
    grid-template-columns: minmax(0, 1fr) 52px;
  }

  .bc-rk-row .bc-rk-bar {
    display: none;
  }

  .bc-nums {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bc-slot {
    grid-template-columns: minmax(0, 1fr) 72px;
  }

  .bc-slot em {
    display: none;
  }

  .bc-hero b {
    font-size: 28px;
  }
}
</style>
