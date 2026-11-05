<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  DAWN_ZOMBIE,
  FIELD_MAPS,
  HARBOR_MUTINY,
  ITEMS,
  NPCS,
  RESTAURANT_DISHES,
  SEA_CREATURES,
  TAVERN_COCKTAILS,
  WORLD_BOSSES,
  ZOMBIE_LOOT_DROP_RATE,
  ZOMBIE_TYPES,
  categoryLabel,
  zombiePool,
} from '../data'
import { STAT_DEFS } from '../game/config'
import { allImageAssets, buildCodexCategories } from '../game/assets'
import { unlockAchievement } from '../game/save'
import ModalShell from './ModalShell.vue'

const STAT_LABELS = Object.fromEntries(STAT_DEFS.map((stat) => [stat.key, stat.label]))
const CODEX_DEFS = [
  ...Object.values(ITEMS),
  ...TAVERN_COCKTAILS,
  ...RESTAURANT_DISHES,
  ...WORLD_BOSSES,
]
const ITEM_BY_NAME = new Map(CODEX_DEFS.map((item) => [item.name, item]))

const TOOLS = [
  {
    id: 'codex',
    name: '图鉴百科',
    hint: '物品、身份徽章与全部立绘',
    ready: true,
  },
  {
    id: 'damage',
    name: '伤害查询',
    hint: '全部武器的期望伤害与属性',
    ready: true,
  },
  {
    id: 'maps',
    name: '地图爆率',
    hint: '各区域探索与击杀掉落',
    ready: true,
  },
]

/** 立绘分类只展示文字说明 */
const PORTRAIT_CATEGORIES = new Set(['角色立绘', '丧尸立绘', '变异海洋生物', '世界BOSS'])
const PORTRAIT_DESCRIPTIONS = new Map([
  [
    '主角头像',
    '在安全屋三楼醒来的幸存者。窗外还是那片废墟，门还锁着，今天也还活着。',
  ],
  [HARBOR_MUTINY.crewName, HARBOR_MUTINY.crewDescription],
  ...Object.values(NPCS).map((npc) => [npc.name, npc.description]),
  ...[...ZOMBIE_TYPES, DAWN_ZOMBIE].map((zombie) => [zombie.name, zombie.description]),
  ...SEA_CREATURES.map((creature) => [creature.name, creature.description]),
])

const categories = buildCodexCategories(allImageAssets).map((category) => ({
  ...category,
  items: category.items.map((item) => ({
    ...item,
    def: ITEM_BY_NAME.get(item.name) ?? null,
  })),
}))
const activeToolId = ref('codex')
const activeTool = computed(() => TOOLS.find((tool) => tool.id === activeToolId.value) ?? TOOLS[0])
const activeIndex = ref(0)
const active = computed(() => categories[activeIndex.value])
const totalItems = computed(() => categories.reduce((sum, c) => sum + c.items.length, 0))
const collected = computed(() => totalItems.value)
const selected = ref(null)

const isPortraitCategory = computed(() => PORTRAIT_CATEGORIES.has(active.value?.name))
const selectedDef = computed(() => selected.value?.def ?? null)
const selectedDescription = computed(() => {
  if (!selected.value) return ''
  return (
    selectedDef.value?.description ??
    PORTRAIT_DESCRIPTIONS.get(selected.value.name) ??
    '这张立绘还没有留下说明。'
  )
})
const selectedStats = computed(() => {
  const def = selectedDef.value
  if (!def) return []
  const chips = []
  if (def.tier) chips.push(`品质 ${def.tier}`)
  if (def.weapon) {
    const w = def.weapon
    chips.push(`攻击 ${w.attack}`)
    if (Number.isFinite(w.crit)) chips.push(`暴击 ${Math.round(w.crit * 100)}%`)
    if (Number.isFinite(w.critDamage)) chips.push(`暴伤 ${w.critDamage}`)
    if (Number.isFinite(w.combo)) chips.push(`连击 ${Math.round(w.combo * 100)}%`)
    if (Number.isFinite(w.dodge)) chips.push(`闪避 ${Math.round(w.dodge * 100)}%`)
    if (Number.isFinite(w.durability)) chips.push(`耐久 ${w.durability}`)
  }
  if (def.hp && Number.isFinite(def.attackMin) && Number.isFinite(def.attackMax)) {
    chips.push(`生命 ${def.hp}`)
    chips.push(`攻击 ${def.attackMin}-${def.attackMax}`)
  }
  if (Number.isFinite(def.coins)) chips.push(`末日币 ${def.coins}`)
  if (Number.isFinite(def.dawnCoins)) chips.push(`曙光币 ${def.dawnCoins}`)
  if (def.effects) {
    for (const [key, value] of Object.entries(def.effects)) {
      const label = STAT_LABELS[key] ?? key
      chips.push(`${label} ${value > 0 ? '+' : ''}${value}`)
    }
  }
  return chips
})

const WEAPON_TYPE_FILTERS = [
  { id: 'all', name: '全部' },
  { id: 'melee', name: '近战' },
  { id: 'ranged', name: '远程' },
]
const WEAPON_TIER_ORDER = ['普通', '稀有', '精良', '史诗', '传说', '神话', '限定']
const WEAPONS = Object.values(ITEMS).filter(
  (item) => item.weapon && (item.category === 'melee' || item.category === 'ranged'),
)

const weaponSearch = ref('')
const weaponType = ref('all')
const weaponTier = ref('all')
const weaponSort = ref('desc')

const weaponTiers = computed(() => {
  const present = new Set(WEAPONS.map((item) => item.tier).filter(Boolean))
  const ordered = WEAPON_TIER_ORDER.filter((tier) => present.has(tier))
  const extra = [...present].filter((tier) => !WEAPON_TIER_ORDER.includes(tier))
  return ['全部', ...ordered, ...extra]
})

function percentText(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`
}

function expectedText(value) {
  return Number(value || 0).toFixed(1)
}

/** 近战按连击链算一次行动的期望；远程按满清洁度的一枪计算 */
function expectedDamage(item) {
  const weapon = item.weapon ?? {}
  const attack = Number(weapon.attack) || 0
  const crit = Number(weapon.crit) || 0
  const critDamage = Number(weapon.critDamage) || 1
  const critFactor = 1 + (critDamage >= 1 ? crit * (critDamage - 1) : 0)
  if (item.category === 'melee') {
    const combo = Math.min(0.999, Math.max(0, Number(weapon.combo) || 0))
    return (attack * critFactor) / (1 - combo)
  }
  return attack * critFactor
}

const weaponRows = computed(() => {
  const query = weaponSearch.value.trim().toLowerCase()
  const rows = WEAPONS.map((item) => {
    const weapon = item.weapon ?? {}
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      tier: item.tier ?? '—',
      attack: Number(weapon.attack) || 0,
      crit: percentText(weapon.crit),
      critDamage: Number(weapon.critDamage) || 1,
      combo: item.category === 'melee' ? percentText(weapon.combo) : '',
      dodge: item.category === 'ranged' ? percentText(weapon.dodge) : '',
      durability: Number.isFinite(weapon.durability) ? weapon.durability : '∞',
      expected: expectedDamage(item),
    }
  }).filter((row) => {
    if (weaponType.value !== 'all' && row.category !== weaponType.value) return false
    if (weaponTier.value !== 'all' && row.tier !== weaponTier.value) return false
    if (query && !row.name.toLowerCase().includes(query)) return false
    return true
  })

  return rows.sort((a, b) => {
    const diff = a.expected - b.expected
    if (diff !== 0) return weaponSort.value === 'desc' ? -diff : diff
    return a.name.localeCompare(b.name, 'zh-CN')
  })
})

const weaponTop = computed(() =>
  weaponRows.value.reduce((max, row) => Math.max(max, row.expected), 0),
)

const activeMapId = ref(FIELD_MAPS[0]?.id ?? '')
const activeMap = computed(
  () => FIELD_MAPS.find((map) => map.id === activeMapId.value) ?? FIELD_MAPS[0] ?? null,
)

/** 把权重表归一化成百分比，标签可由调用方决定 */
function weightShares(table, label = (key) => categoryLabel(key)) {
  const entries = Object.entries(table ?? {}).filter(([, weight]) => Number(weight) > 0)
  const total = entries.reduce((sum, [, weight]) => sum + Number(weight), 0)
  return entries.map(([key, weight]) => {
    const rate = total ? Number(weight) / total : 0
    return { key, name: label(key), rate, percent: rate * 100 }
  })
}

function shareText(rate, digits = 1) {
  return `${(Number(rate || 0) * 100).toFixed(digits)}%`
}

const mapLootShares = computed(() => weightShares(activeMap.value?.lootTable))
const mapZombieShares = computed(() => weightShares(activeMap.value?.zombieLoot))
const mapTierShares = computed(() =>
  weightShares(activeMap.value?.rarityWeights, (tier) => tier),
)
const mapZombies = computed(() =>
  zombiePool(activeMap.value?.zombiePool).map((zombie) => zombie.name),
)

function select(item) {
  selected.value = selected.value?.src === item.src ? null : item
}

onMounted(() => {
  unlockAchievement('codex-10')
})
</script>

<template>
  <ModalShell title="玩家工具" sub="图鉴与查询工具" @close="$emit('close')">
    <div class="tool-switch" role="tablist" aria-label="玩家工具">
      <button
        v-for="tool in TOOLS"
        :key="tool.id"
        type="button"
        class="tool-card"
        :class="{ 'tool-card--active': activeToolId === tool.id }"
        role="tab"
        :aria-selected="activeToolId === tool.id"
        @click="activeToolId = tool.id"
      >
        <span class="tool-card__head">
          <strong>{{ tool.name }}</strong>
          <span class="tool-card__tag" :class="{ 'is-ready': tool.ready }">
            {{ tool.ready ? '已开放' : '占位' }}
          </span>
        </span>
        <span class="tool-card__hint">{{ tool.hint }}</span>
      </button>
    </div>

    <div v-if="activeToolId === 'codex'" class="codex">
      <div class="codex__meta">
        <div>
          <span class="eyebrow">图鉴收录</span>
          <p class="codex__count">
            {{ collected }}<em>/{{ totalItems }}</em>
          </p>
        </div>
      </div>

      <div class="tabs">
        <button
          v-for="(category, index) in categories"
          :key="category.name"
          type="button"
          class="tab"
          :class="{ 'tab--active': index === activeIndex }"
          @click="activeIndex = index"
        >
          {{ category.name }}
          <span>{{ category.items.length }}</span>
        </button>
      </div>

      <article v-if="selected" class="detail" :class="{ 'detail--portrait': isPortraitCategory }">
        <img class="detail__img" :src="selected.src" :alt="selected.name" />
        <div class="detail__main">
          <div class="detail__tags">
            <span>{{ active.name }}</span>
            <span v-if="selectedDef?.tier">{{ selectedDef.tier }}</span>
          </div>
          <h3 class="detail__name">{{ selected.name }}</h3>
          <p class="detail__desc">{{ selectedDescription }}</p>
          <div v-if="selectedStats.length" class="detail__stats">
            <span v-for="chip in selectedStats" :key="chip">{{ chip }}</span>
          </div>
        </div>
        <button type="button" class="detail__close" @click="selected = null">×</button>
      </article>
      <p v-else class="detail__hint">点击任意图标，查看对应说明。</p>

      <div class="grid">
        <button
          v-for="(item, index) in active.items"
          :key="item.src"
          type="button"
          class="cell"
          :class="{ 'cell--active': selected?.src === item.src }"
          @click="select(item)"
        >
          <img class="cell__img" :src="item.src" :alt="item.name" loading="lazy" />
          <span class="cell__name">{{ item.name }}</span>
          <span class="cell__lock">{{ String(index + 1).padStart(3, '0') }}</span>
        </button>
      </div>
    </div>

    <div v-else-if="activeToolId === 'damage'" class="damage-view">
      <div class="damage-controls">
        <label class="damage-search" for="weapon-search">
          <span class="eyebrow">搜索武器</span>
          <input
            id="weapon-search"
            v-model="weaponSearch"
            type="search"
            placeholder="输入武器名称…"
          />
        </label>

        <div class="damage-filters">
          <div class="damage-filter">
            <span class="damage-filter__label">类型</span>
            <div class="damage-chips">
              <button
                v-for="type in WEAPON_TYPE_FILTERS"
                :key="type.id"
                type="button"
                class="damage-chip"
                :class="{ 'is-active': weaponType === type.id }"
                @click="weaponType = type.id"
              >
                {{ type.name }}
              </button>
            </div>
          </div>

          <div class="damage-filter">
            <span class="damage-filter__label">品质</span>
            <div class="damage-chips">
              <button
                v-for="tier in weaponTiers"
                :key="tier"
                type="button"
                class="damage-chip"
                :class="{ 'is-active': weaponTier === tier }"
                @click="weaponTier = tier"
              >
                {{ tier }}
              </button>
            </div>
          </div>

          <div class="damage-filter">
            <span class="damage-filter__label">排序</span>
            <div class="damage-chips">
              <button
                type="button"
                class="damage-chip"
                :class="{ 'is-active': weaponSort === 'desc' }"
                @click="weaponSort = 'desc'"
              >
                期望 ↓
              </button>
              <button
                type="button"
                class="damage-chip"
                :class="{ 'is-active': weaponSort === 'asc' }"
                @click="weaponSort = 'asc'"
              >
                期望 ↑
              </button>
            </div>
          </div>
        </div>
      </div>

      <p class="damage-note">
        近战期望 = 攻击 × (1 + 暴击 × (暴伤 - 1)) ÷ (1 - 连击)，按一次行动内的连击链计算；
        远程期望 = 攻击 × (1 + 暴击 × (暴伤 - 1))，按满清洁度的一枪计算。
        未计入天赋、敌人闪避与护甲。
      </p>

      <div class="damage-summary">
        <span>命中 {{ weaponRows.length }} 把武器</span>
        <span v-if="weaponRows.length">最高期望 {{ expectedText(weaponTop) }}</span>
        <span>数据实时取自武器属性</span>
      </div>

      <div v-if="weaponRows.length" class="damage-list">
        <article v-for="row in weaponRows" :key="row.id" class="damage-row">
          <div class="damage-row__main">
            <div class="damage-row__title">
              <h3>{{ row.name }}</h3>
              <span class="damage-row__tier">{{ row.tier }}</span>
              <span class="damage-row__type">
                {{ row.category === 'melee' ? '近战' : '远程' }}
              </span>
            </div>
            <div class="damage-row__stats">
              <span>攻击 <b>{{ row.attack }}</b></span>
              <span>暴击 <b>{{ row.crit }}</b></span>
              <span>暴伤 <b>{{ row.critDamage }}</b></span>
              <span v-if="row.category === 'melee'">连击 <b>{{ row.combo }}</b></span>
              <span v-if="row.category === 'melee'">耐久 <b>{{ row.durability }}</b></span>
              <span v-if="row.category === 'ranged'">闪避 <b>{{ row.dodge }}</b></span>
              <span v-if="row.category === 'ranged'">清洁度 <b>100</b></span>
            </div>
          </div>
          <div class="damage-row__value">
            <strong>{{ expectedText(row.expected) }}</strong>
            <span>期望 / 行动</span>
          </div>
        </article>
      </div>
      <p v-else class="damage-empty">没有匹配的武器，换个关键词或筛选条件试试。</p>
    </div>

    <div v-else-if="activeToolId === 'maps'" class="maps-view">
      <div class="map-switch">
        <button
          v-for="map in FIELD_MAPS"
          :key="map.id"
          type="button"
          class="map-option"
          :class="{ 'map-option--active': activeMapId === map.id }"
          @click="activeMapId = map.id"
        >
          <span class="map-option__name">{{ map.name }}</span>
          <span class="map-option__meta">
            {{ map.level }} · 遭遇 {{ shareText(map.encounterRate, 0) }}
          </span>
        </button>
      </div>

      <article v-if="activeMap" class="map-card">
        <header class="map-card__head">
          <div>
            <span class="eyebrow">{{ activeMap.level }} · {{ activeMap.difficulty }}</span>
            <h3>{{ activeMap.name }}</h3>
            <p>{{ activeMap.desc }}</p>
          </div>
          <div class="map-card__rate">
            <strong>{{ shareText(activeMap.encounterRate, 0) }}</strong>
            <span>探索遭遇率</span>
          </div>
        </header>

        <div class="map-card__chips">
          <span>非遭遇掉落 {{ shareText(1 - activeMap.encounterRate, 0) }}</span>
          <span>丧尸掉率 {{ shareText(ZOMBIE_LOOT_DROP_RATE, 0) }}</span>
          <span>{{ mapZombies.length }} 种丧尸</span>
        </div>

        <p class="map-note">{{ activeMap.lootNote }}</p>

        <div class="map-grid">
          <section class="drop-block">
            <header class="drop-block__head">
              <h4>探索掉落</h4>
              <span>非遭遇时</span>
            </header>
            <ul class="drop-list">
              <li v-for="row in mapLootShares" :key="row.key" class="drop-row">
                <span class="drop-row__name">{{ row.name }}</span>
                <span class="drop-row__bar">
                  <i :style="{ width: row.percent + '%' }" />
                </span>
                <span class="drop-row__value">{{ shareText(row.rate) }}</span>
              </li>
            </ul>
            <p class="drop-hint">同类别内等概率；武器会再按下方品质权重抽取。</p>
          </section>

          <section class="drop-block">
            <header class="drop-block__head">
              <h4>丧尸击杀掉落</h4>
              <span>先判定 {{ shareText(ZOMBIE_LOOT_DROP_RATE, 0) }}</span>
            </header>
            <ul class="drop-list">
              <li v-for="row in mapZombieShares" :key="row.key" class="drop-row">
                <span class="drop-row__name">{{ row.name }}</span>
                <span class="drop-row__bar">
                  <i :style="{ width: row.percent + '%' }" />
                </span>
                <span class="drop-row__value">
                  <b>{{ shareText(row.rate) }}</b>
                  <small>实际 {{ shareText(row.rate * ZOMBIE_LOOT_DROP_RATE) }}</small>
                </span>
              </li>
            </ul>
            <p class="drop-hint">百分比为掉落成立后的类别占比。</p>
          </section>

          <section class="drop-block">
            <header class="drop-block__head">
              <h4>武器品质</h4>
              <span>掉落武器时</span>
            </header>
            <ul class="drop-list">
              <li v-for="row in mapTierShares" :key="row.key" class="drop-row">
                <span class="drop-row__name">{{ row.name }}</span>
                <span class="drop-row__bar">
                  <i :style="{ width: row.percent + '%' }" />
                </span>
                <span class="drop-row__value">{{ shareText(row.rate) }}</span>
              </li>
            </ul>
            <p class="drop-hint">探索与击杀共用同一套品质权重。</p>
          </section>

          <section class="drop-block">
            <header class="drop-block__head">
              <h4>丧尸池</h4>
              <span>{{ mapZombies.length }} 种</span>
            </header>
            <div class="map-zombies">
              <span v-for="name in mapZombies" :key="name">{{ name }}</span>
            </div>
            <p class="drop-hint">同池内等概率抽取。</p>
          </section>
        </div>
      </article>
    </div>

    <section v-else class="placeholder">
      <span class="eyebrow">建设中</span>
      <h3>{{ activeTool.name }}</h3>
      <p>{{ activeTool.placeholder }}</p>
    </section>

    <template #footer>
      <template v-if="activeToolId === 'codex'">
        <span>所有图标均已点亮。图鉴与存档位无关。</span>
        <span class="mode">CODEX</span>
      </template>
      <template v-else-if="activeToolId === 'damage'">
        <span>期望伤害由武器属性实时计算，微调数值后会自动刷新。</span>
        <span class="mode">DAMAGE</span>
      </template>
      <template v-else-if="activeToolId === 'maps'">
        <span>遭遇率、掉落表与品质权重均直接读取地图配置。</span>
        <span class="mode">MAPS</span>
      </template>
      <template v-else>
        <span>该功能正在建设中。</span>
        <span class="mode">TOOLS</span>
      </template>
    </template>
  </ModalShell>
</template>

<style scoped>
.tool-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 18px;
}

.tool-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 11px 13px;
  text-align: left;
  border: 1px solid var(--line-strong);
  background: rgba(255, 255, 255, 0.015);
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.tool-card:hover {
  border-color: rgba(214, 208, 191, 0.45);
  background: rgba(255, 255, 255, 0.04);
}

.tool-card--active {
  border-color: rgba(205, 185, 141, 0.5);
  background: rgba(205, 185, 141, 0.08);
}

.tool-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.tool-card__head strong {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--text-mute);
}

.tool-card--active .tool-card__head strong {
  color: var(--bone);
}

.tool-card__tag {
  flex: none;
  padding: 1px 6px;
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
  border: 1px solid var(--line);
}

.tool-card__tag.is-ready {
  color: var(--sick);
  border-color: rgba(124, 152, 64, 0.45);
}

.tool-card__hint {
  font-size: 10px;
  line-height: 1.6;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.damage-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.damage-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.015);
}

.damage-search {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.damage-search input {
  height: 34px;
  padding: 0 12px;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--text);
  border: 1px solid var(--line-strong);
  background: rgba(0, 0, 0, 0.25);
  outline: none;
}

.damage-search input:focus {
  border-color: rgba(193, 74, 50, 0.6);
}

.damage-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
}

.damage-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.damage-filter__label {
  flex: none;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
}

.damage-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.damage-chip {
  padding: 4px 9px;
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;
}

.damage-chip:hover {
  color: var(--text);
  border-color: var(--line-strong);
}

.damage-chip.is-active {
  color: var(--bone);
  border-color: rgba(205, 185, 141, 0.5);
  background: rgba(205, 185, 141, 0.08);
}

.damage-note {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.8;
  letter-spacing: 0.03em;
  color: var(--text-mute);
}

.damage-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.damage-list {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--line);
}

.damage-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 11px 2px;
  border-bottom: 1px solid var(--line);
}

.damage-row__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.damage-row__title {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 10px;
}

.damage-row__title h3 {
  margin: 0;
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text);
}

.damage-row__tier,
.damage-row__type {
  padding: 1px 6px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
  border: 1px solid var(--line);
}

.damage-row__type {
  color: var(--rust-soft);
  border-color: rgba(193, 74, 50, 0.35);
}

.damage-row__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.02em;
  color: var(--text-mute);
}

.damage-row__stats b {
  font-weight: 500;
  color: var(--bone);
}

.damage-row__value {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  min-width: 92px;
}

.damage-row__value strong {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 500;
  line-height: 1;
  color: var(--rust-soft);
}

.damage-row__value span {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.damage-empty {
  margin: 0;
  padding: 24px 16px;
  text-align: center;
  font-size: 11.5px;
  color: var(--text-mute);
  border: 1px dashed var(--line-strong);
}

.maps-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.map-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.map-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 8px 10px;
  text-align: left;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.map-option:hover {
  border-color: var(--line-strong);
  background: rgba(255, 255, 255, 0.035);
}

.map-option--active {
  border-color: rgba(205, 185, 141, 0.5);
  background: rgba(205, 185, 141, 0.08);
}

.map-option__name {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
}

.map-option--active .map-option__name {
  color: var(--bone);
}

.map-option__meta {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.02em;
  color: var(--text-mute);
}

.map-card {
  padding: 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.015);
}

.map-card__head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.map-card__head h3 {
  margin: 5px 0 0;
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--text);
}

.map-card__head p {
  max-width: 600px;
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.8;
  letter-spacing: 0.03em;
  color: var(--text-dim);
}

.map-card__rate {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.map-card__rate strong {
  font-family: var(--font-mono);
  font-size: 28px;
  font-weight: 500;
  line-height: 1;
  color: var(--rust-soft);
}

.map-card__rate span,
.drop-block__head span {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.map-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 12px;
}

.map-card__chips span {
  padding: 2px 7px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.03em;
  color: var(--text-mute);
  border: 1px solid var(--line);
}

.map-note {
  margin: 10px 0 0;
  font-size: 10.5px;
  line-height: 1.7;
  letter-spacing: 0.03em;
  color: var(--bone);
}

.map-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.drop-block {
  padding: 11px 12px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.18);
}

.drop-block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.drop-block__head h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--text);
}

.drop-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.drop-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) 64px;
  align-items: center;
  gap: 8px;
  font-size: 10.5px;
  color: var(--text-mute);
}

.drop-row__name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.drop-row__bar {
  height: 4px;
  overflow: hidden;
  background: rgba(214, 208, 191, 0.12);
}

.drop-row__bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--rust), var(--rust-soft));
}

.drop-row__value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--bone);
}

.drop-row__value b {
  font-weight: 500;
  color: var(--bone);
}

.drop-row__value small {
  font-size: 8.5px;
  color: var(--text-mute);
}

.drop-hint {
  margin: 8px 0 0;
  font-size: 9.5px;
  line-height: 1.6;
  letter-spacing: 0.02em;
  color: var(--text-mute);
}

.map-zombies {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.map-zombies span {
  padding: 2px 7px;
  font-size: 9.5px;
  color: var(--text-dim);
  border: 1px solid var(--line);
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 260px;
  padding: 32px 20px;
  text-align: center;
  border: 1px dashed var(--line-strong);
  background: rgba(255, 255, 255, 0.015);
}

.placeholder h3 {
  margin: 6px 0 0;
  font-family: var(--font-title);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--bone);
}

.placeholder p {
  max-width: 440px;
  margin: 0;
  font-size: 11.5px;
  line-height: 1.85;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.codex__meta {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 2px 0 18px;
  flex-wrap: wrap;
}

.codex__count {
  margin: 6px 0 0;
  font-family: var(--font-mono);
  font-size: 30px;
  color: var(--bone);
}

.codex__count em {
  font-style: normal;
  font-size: 14px;
  color: var(--text-mute);
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 16px;
}

.tab {
  position: relative;
  padding: 10px 14px 12px;
  font-size: 12.5px;
  letter-spacing: 0.1em;
  color: var(--text-mute);
  transition: 0.2s;
}

.tab span {
  margin-left: 6px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-mute);
}

.tab:hover {
  color: var(--text);
}

.tab--active {
  color: var(--bone);
}

.tab--active::after {
  content: "";
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: -1px;
  height: 1px;
  background: var(--rust);
}

.detail {
  position: relative;
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid rgba(205, 185, 141, 0.35);
  background: rgba(205, 185, 141, 0.05);
}

.detail__img {
  width: 84px;
  height: 84px;
  flex: none;
  object-fit: contain;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.25);
}

.detail--portrait .detail__img {
  width: 112px;
  height: 112px;
  object-fit: cover;
}

.detail__main {
  min-width: 0;
  flex: 1;
  padding-right: 24px;
}

.detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail__tags span {
  padding: 2px 7px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.06em;
  color: var(--rust-soft);
  border: 1px solid rgba(193, 74, 50, 0.4);
}

.detail__name {
  margin: 7px 0 0;
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--bone);
}

.detail__desc {
  margin: 7px 0 0;
  font-size: 11.5px;
  line-height: 1.8;
  color: var(--text-dim);
}

.detail__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 9px;
}

.detail__stats span {
  padding: 3px 8px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--bone);
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.2);
}

.detail__close {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 15px;
  line-height: 1;
  color: var(--text-mute);
  cursor: pointer;
}

.detail__close:hover {
  color: var(--rust-soft);
}

.detail__hint {
  margin: 0 0 14px;
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 8px;
}

.cell {
  position: relative;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.02);
  overflow: hidden;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.cell:hover {
  border-color: rgba(193, 74, 50, 0.55);
  background: rgba(193, 74, 50, 0.07);
}

.cell--active {
  border-color: rgba(205, 185, 141, 0.55);
  background: rgba(205, 185, 141, 0.08);
}

.cell__img {
  width: 72%;
  height: 72%;
  object-fit: contain;
  transition: 0.3s;
}

.cell:hover .cell__img {
  transform: scale(1.08);
}

.cell__name {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 9px 6px 5px;
  font-size: 9.5px;
  letter-spacing: 0.04em;
  text-align: center;
  color: var(--text-dim);
  background: linear-gradient(180deg, transparent, rgba(6, 7, 8, 0.88) 42%);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell__lock {
  position: absolute;
  top: 5px;
  right: 7px;
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
  opacity: 0.55;
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}

@media (max-width: 640px) {
  .tool-switch {
    grid-template-columns: minmax(0, 1fr);
  }

  .damage-filters {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .damage-row {
    align-items: flex-start;
  }

  .map-switch {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .map-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .drop-row {
    grid-template-columns: 48px minmax(0, 1fr) 58px;
  }

  .grid {
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  }

  .detail {
    flex-direction: column;
  }
}
</style>
