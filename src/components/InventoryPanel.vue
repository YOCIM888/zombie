<script setup>
import { computed, ref, watch } from 'vue'
import { INVENTORY_CATEGORIES, STAT_DEFS } from '../game/config'
import {
  CLEANLINESS_MAX,
  MELEE_TIER_COLORS,
  STACK_LIMIT,
  TALENTS,
  TALENT_ACTIVE_LIMIT,
  TALENT_EFFECT_LABELS,
  categoryLabel,
  cleanlinessMultiplier,
  countUsedSlots,
  getItem,
  talentEffects,
  talentTitle,
} from '../data'
import { formatCritDamage, formatPercent } from '../game/format'
import {
  activeGuild,
  discardItem,
  equipMelee,
  equipRanged,
  game,
  isTalentActive,
  notify,
  organizeBackpack,
  toggleTalentActive,
  useItem,
} from '../game/store'
import ModalShell from './ModalShell.vue'
import LoadoutPanel from './LoadoutPanel.vue'

const VIEWS = [
  { id: 'bag', name: '背包' },
  { id: 'panel', name: '面板' },
  { id: 'talent', name: '天赋' },
  { id: 'gems', name: '宝石' },
]

const activeView = ref('bag')
const activeCategory = ref('all')
const selectedIndex = ref(null)
const pendingDiscard = ref(null)

const STAT_LABELS = Object.fromEntries(STAT_DEFS.map((stat) => [stat.key, stat.label]))

const usedSlots = computed(() => countUsedSlots(game.inventory))
const equippedCount = computed(
  () => Number(Boolean(game.equipment.melee)) + Number(Boolean(game.equipment.ranged)),
)
const talentLevels = computed(() =>
  Object.values(TALENTS).reduce(
    (total, config) => total + (Number(game.talents[config.key]) || 0),
    0,
  ),
)
const talentActiveCount = computed(
  () => Object.values(TALENTS).filter((config) => isTalentActive(config.key)).length,
)
const talentActiveLabel = computed(
  () => `${talentActiveCount.value}/${TALENT_ACTIVE_LIMIT}`,
)
const guild = computed(() => activeGuild())
const guildBadge = computed(() => (guild.value ? getItem(guild.value.badgeId) : null))

function toggleTalent(kind) {
  const line = toggleTalentActive(kind)
  if (line) notify(line, 3000)
}

function effectText(effects) {
  const entries = Object.entries(effects ?? {})
  if (!entries.length) return '—'
  return entries
    .map(([key, value]) => {
      const label = TALENT_EFFECT_LABELS[key] ?? key
      if (key === 'damage' || key === 'critDamage') return `${label} +${value}`
      const percent = Number((value * 100).toFixed(2))
      return `${label} +${percent}%`
    })
    .join(' · ')
}

const talentCards = computed(() =>
  Object.values(TALENTS).map((config) => {
    const kind = config.key
    const level = Math.max(0, Math.min(config.maxLevel, Number(game.talents[kind]) || 0))
    const full = level >= config.maxLevel
    const progress = full
      ? 100
      : Math.max(0, Math.min(99, Number(game.training[kind]) || 0))
    return {
      key: kind,
      label: config.label,
      maxLevel: config.maxLevel,
      level,
      full,
      progress,
      active: isTalentActive(kind),
      title: talentTitle(kind, level) || '暂无天赋',
      effect: level ? effectText(talentEffects(kind, level)) : '—',
      tiers: config.effects.map((effects, index) => ({
        level: index + 1,
        title: config.titles[index],
        text: effectText(effects),
      })),
    }
  }),
)

const tabs = computed(() =>
  INVENTORY_CATEGORIES.map((category) => ({
    ...category,
    count: game.inventory.filter((entry) => {
      if (!entry) return false
      if (category.id === 'all') return true
      return getItem(entry.id)?.category === category.id
    }).length,
  })),
)

const gemItems = computed(() =>
  game.inventory
    .filter((entry) => entry && getItem(entry.id)?.category === 'gem')
    .map((entry) => ({
      id: entry.id,
      qty: entry.qty ?? 1,
      def: getItem(entry.id),
    })),
)

const slots = computed(() =>
  game.inventory.map((entry, index) => {
    const def = entry ? getItem(entry.id) : null
    const matched =
      activeCategory.value === 'all' || !entry || def?.category === activeCategory.value
    return { index, entry, def, hidden: !matched }
  }),
)

const selectedEntry = computed(() =>
  selectedIndex.value === null ? null : game.inventory[selectedIndex.value],
)

const selectedDef = computed(() => {
  const entry = selectedEntry.value
  return entry ? getItem(entry.id) : null
})

const canUse = computed(() => Boolean(selectedDef.value?.effects || selectedDef.value?.special))
const canEquipMelee = computed(
  () => selectedDef.value?.category === 'melee' && Boolean(selectedDef.value?.weapon),
)
const canEquipRanged = computed(
  () => selectedDef.value?.category === 'ranged' && Boolean(selectedDef.value?.weapon),
)

const selectedDurability = computed(() => {
  const def = selectedDef.value
  const entry = selectedEntry.value
  if (!def?.weapon || def.category !== 'melee') return null
  const max = def.weapon.durability
  if (!Number.isFinite(max)) return '无限'
  return `${entry?.durability ?? max} / ${max}`
})

const selectedCleanliness = computed(() => {
  const def = selectedDef.value
  const entry = selectedEntry.value
  if (!def?.weapon || def.category !== 'ranged') return null
  const value = entry && Number.isFinite(entry.cleanliness) ? entry.cleanliness : CLEANLINESS_MAX
  return `${value} / ${CLEANLINESS_MAX} · 伤害 ${formatPercent(cleanlinessMultiplier(value))}`
})

const tierColor = computed(() =>
  selectedDef.value?.tier ? (MELEE_TIER_COLORS[selectedDef.value.tier] ?? 'inherit') : '',
)

const discardLabel = computed(() =>
  pendingDiscard.value === selectedIndex.value ? '确认丢弃' : '丢弃',
)

function firstInCategory(category) {
  const index = game.inventory.findIndex((entry) => {
    if (!entry) return false
    return category === 'all' || getItem(entry.id)?.category === category
  })
  return index === -1 ? null : index
}

selectedIndex.value = firstInCategory('all')

watch(activeCategory, (category) => {
  selectedIndex.value = firstInCategory(category)
  pendingDiscard.value = null
})

watch(selectedIndex, () => {
  pendingDiscard.value = null
})

function selectSlot(slot) {
  if (!slot.entry || slot.hidden) return
  selectedIndex.value = slot.index
}

function handleOrganize() {
  if (!organizeBackpack()) return
  activeCategory.value = 'all'
  selectedIndex.value = firstInCategory('all')
  pendingDiscard.value = null
}

function handleUse() {
  if (!selectedEntry.value) return
  useItem(selectedIndex.value)
  if (!game.inventory[selectedIndex.value]) selectedIndex.value = null
}

function handleDiscard() {
  if (!selectedEntry.value) return
  if (pendingDiscard.value !== selectedIndex.value) {
    pendingDiscard.value = selectedIndex.value
    return
  }
  discardItem(selectedIndex.value)
  if (!game.inventory[selectedIndex.value]) selectedIndex.value = null
  pendingDiscard.value = null
}

function handleEquipMelee() {
  if (!selectedEntry.value) return
  equipMelee(selectedIndex.value)
  if (!game.inventory[selectedIndex.value]) selectedIndex.value = null
  pendingDiscard.value = null
}

function handleEquipRanged() {
  if (!selectedEntry.value) return
  equipRanged(selectedIndex.value)
  if (!game.inventory[selectedIndex.value]) selectedIndex.value = null
  pendingDiscard.value = null
}

function weaponLine(weapon) {
  const lines = [
    `攻击 ${weapon.attack}`,
    `暴击 ${formatPercent(weapon.crit)}`,
    `暴伤 ${formatCritDamage(weapon.critDamage)}`,
  ]
  if (weapon.combo != null) lines.push(`连击 ${formatPercent(weapon.combo)}`)
  if (weapon.dodge != null) lines.push(`闪避 ${formatPercent(weapon.dodge)}`)
  return lines
}
</script>

<template>
  <ModalShell
    title="背包"
    sub="物品栏 · 支持整理、分类与装备详情"
    wide
    @close="$emit('close')"
  >
    <div class="view-switch" role="tablist" aria-label="背包视图">
      <button
        v-for="view in VIEWS"
        :key="view.id"
        type="button"
        class="view-switch__btn"
        :class="{ 'is-active': activeView === view.id }"
        role="tab"
        :aria-selected="activeView === view.id"
        @click="activeView = view.id"
      >
        {{ view.name }}
        <span>
          {{
            view.id === 'bag'
              ? `${usedSlots}/${game.inventory.length}`
              : view.id === 'panel'
                ? equippedCount
                : view.id === 'talent'
                  ? talentActiveLabel
                  : gemItems.length
          }}
        </span>
      </button>
    </div>

    <div v-if="activeView === 'bag'" class="bag-view">
      <section class="bag-main">
        <div class="bag-bar">
          <div class="tabs">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="tab"
              :class="{ 'tab--active': activeCategory === tab.id }"
              @click="activeCategory = tab.id"
            >
              {{ tab.name }}
              <span>{{ tab.count }}</span>
            </button>
          </div>
          <button type="button" class="btn bag-bar__organize" @click="handleOrganize">
            整理背包
          </button>
        </div>

        <div class="grid">
          <button
            v-for="slot in slots"
            :key="slot.index"
            type="button"
            class="cell"
            :class="{
              'cell--empty': !slot.entry || slot.hidden,
              'cell--selected': selectedIndex === slot.index && slot.entry && !slot.hidden,
            }"
            @click="selectSlot(slot)"
          >
            <template v-if="slot.entry && !slot.hidden">
              <img
                v-if="slot.def?.image"
                class="cell__img"
                :src="slot.def.image"
                :alt="slot.def.name"
              />
              <span v-else class="cell__fallback">?</span>
              <span v-if="slot.entry.qty > 1" class="cell__qty">×{{ slot.entry.qty }}</span>
              <span class="cell__name">{{ slot.def?.name ?? '未知物品' }}</span>
            </template>
            <span v-else class="cell__plus">+</span>
          </button>
        </div>
      </section>

      <aside class="bag-detail">
        <section v-if="selectedDef" class="detail">
          <div class="detail__thumb">
            <img v-if="selectedDef.image" :src="selectedDef.image" :alt="selectedDef.name" />
            <span v-else>?</span>
          </div>

          <div class="detail__main">
            <div class="detail__headline">
              <h3 class="detail__name">{{ selectedDef.name }}</h3>
              <span class="detail__qty">×{{ selectedEntry.qty }}</span>
              <span
                v-if="selectedDef.tier"
                class="detail__tier"
                :style="{ color: tierColor, borderColor: tierColor }"
              >
                {{ selectedDef.tier }}
              </span>
              <span class="detail__category">{{ categoryLabel(selectedDef.category) }}</span>
            </div>
            <p class="detail__desc">{{ selectedDef.description }}</p>

            <div v-if="selectedDef.weapon" class="detail__tags">
              <span v-for="line in weaponLine(selectedDef.weapon)" :key="line">{{ line }}</span>
              <span v-if="selectedDef.category === 'melee'">耐久 {{ selectedDurability }}</span>
              <span v-else>清洁度 {{ selectedCleanliness }}</span>
            </div>

            <div v-if="selectedDef.effects" class="detail__tags">
              <span v-for="(value, key) in selectedDef.effects" :key="key">
                {{ STAT_LABELS[key] ?? key }} +{{ value }}
              </span>
            </div>

            <p v-if="selectedDef.stackable" class="detail__stack">
              可堆叠 · 当前 {{ selectedEntry.qty }} / 上限
              {{ Math.min(selectedDef.maxStack ?? STACK_LIMIT, STACK_LIMIT) }}
            </p>
          </div>
        </section>

        <section v-else class="detail detail--empty">
          选择一件物品查看详情 · 食物、饮品、药品可使用，武器可装备
        </section>
      </aside>
    </div>

    <div v-else-if="activeView === 'panel'" class="panel-view">
      <LoadoutPanel wide />
    </div>

    <div v-else-if="activeView === 'gems'" class="gem-view">
      <p class="gem-view__intro">
        宝石只有放在背包里才会生效；主动宝石使用后不会消失。
      </p>
      <div v-if="gemItems.length" class="gem-grid">
        <article v-for="item in gemItems" :key="item.id" class="gem-card">
          <span class="gem-card__tag">{{ item.def.special ? '主动' : '背包被动' }}</span>
          <img v-if="item.def.image" :src="item.def.image" :alt="item.def.name" />
          <h4>{{ item.def.name }} ×{{ item.qty }}</h4>
          <p>{{ item.def.description }}</p>
        </article>
      </div>
      <p v-else class="gem-view__empty">背包里还没有宝石。</p>
    </div>

    <div v-else class="talent-view">
      <section class="guild-buff">
        <div v-if="guildBadge?.image" class="guild-buff__badge">
          <img :src="guildBadge.image" :alt="guildBadge.name" />
        </div>
        <div class="guild-buff__main">
          <span class="eyebrow">公会效果</span>
          <h3>{{ guild?.name ?? '无' }}</h3>
          <p>{{ guild?.buffText ?? '尚未加入任何公会。' }}</p>
          <span class="guild-buff__note">公会效果不占用天赋启用位。</span>
        </div>
      </section>

      <div class="talent-view__head">
        <span class="talent-view__limit">
          最多同时启用 {{ TALENT_ACTIVE_LIMIT }} 个天赋 · 已启用
          {{ talentActiveCount }} / {{ TALENT_ACTIVE_LIMIT }}
        </span>
        <span class="talent-view__note">只有启用中的天赋会加成到面板与战斗</span>
      </div>

      <article
        v-for="card in talentCards"
        :key="card.key"
        class="talent-row"
        :class="{ 'is-active': card.active }"
      >
        <div class="talent-row__main">
          <div class="talent-row__head">
            <span class="talent-row__label">{{ card.label }}</span>
            <h3 class="talent-row__title">{{ card.title }}</h3>
            <span class="talent-row__level">Lv.{{ card.level }} / {{ card.maxLevel }}</span>
          </div>

          <div class="talent-row__meta">
            <span>当前加成 <b>{{ card.effect }}</b></span>
            <span>
              熟练度
              <b>{{ card.full ? '已满级' : `${card.progress} / 100` }}</b>
            </span>
          </div>

          <div class="track">
            <div class="track__fill" :style="{ width: card.progress + '%' }" />
          </div>

          <div class="talent-row__tiers">
            <span
              v-for="tier in card.tiers"
              :key="tier.title"
              :class="{ 'is-on': card.level >= tier.level }"
            >
              Lv.{{ tier.level }} · {{ tier.title }} · {{ tier.text }}
            </span>
          </div>
        </div>

        <button
          type="button"
          class="talent-switch"
          :class="{ 'is-on': card.active }"
          :disabled="card.level <= 0"
          role="switch"
          :aria-checked="card.active"
          @click="toggleTalent(card.key)"
        >
          <span class="talent-switch__track" aria-hidden="true">
            <span class="talent-switch__knob" />
          </span>
          <span class="talent-switch__label">
            {{ card.active ? '已启用' : card.level > 0 ? '启用' : '未获得' }}
          </span>
        </button>
      </article>

      <p v-if="talentLevels === 0" class="talent-empty">
        还没有任何天赋。去末日飞行船的木桩或靶场、都城的斗兽擂台，或曙光阵地的行尸走廊
        练习，熟练度满 100% 会提升一级天赋。
      </p>
    </div>

    <template #footer>
      <span v-if="activeView === 'bag'" class="foot-note">
        背包 {{ usedSlots }} / {{ game.inventory.length }} 格 · 单格堆叠上限
        {{ STACK_LIMIT }}
      </span>
      <span v-else-if="activeView === 'panel'" class="foot-note">
        装备面板 · 近战与远程武器详情
      </span>
      <span v-else-if="activeView === 'gems'" class="foot-note">
        宝石 · 只有放在背包里才会生效
      </span>
      <span v-else class="foot-note">
        天赋 · 熟练度与加成，取最高等级且不叠加；最多同时启用
        {{ TALENT_ACTIVE_LIMIT }} 个
      </span>
      <div v-if="activeView === 'bag' && selectedDef" class="foot-actions">
        <span class="foot-item">{{ selectedDef.name }} ×{{ selectedEntry.qty }}</span>
        <button
          v-if="canEquipMelee"
          type="button"
          class="btn btn--primary"
          @click="handleEquipMelee"
        >
          装备近战位
        </button>
        <button
          v-if="canEquipRanged"
          type="button"
          class="btn btn--primary"
          @click="handleEquipRanged"
        >
          装备远程位
        </button>
        <button v-if="canUse" type="button" class="btn btn--primary" @click="handleUse">
          使用
        </button>
        <button
          type="button"
          class="btn"
          :class="{ 'btn--discard': pendingDiscard === selectedIndex }"
          @click="handleDiscard"
        >
          {{ discardLabel }}
        </button>
      </div>
      <span v-else class="mode">
        {{ activeView === 'bag' ? 'BACKPACK' : activeView === 'panel' ? 'PANEL' : activeView === 'gems' ? 'GEMS' : 'TALENTS' }}
      </span>
    </template>
  </ModalShell>
</template>

<style scoped>
.view-switch {
  display: inline-flex;
  gap: 1px;
  margin-bottom: 16px;
  padding: 1px;
  border: 1px solid var(--line);
  background: var(--line);
}

.view-switch__btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 22px;
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--text-mute);
  background: #0d0f10;
  transition:
    color 0.2s,
    background 0.2s;
}

.view-switch__btn span {
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--text-mute);
}

.view-switch__btn:hover {
  color: var(--text);
}

.view-switch__btn.is-active {
  color: var(--bone);
  background: rgba(193, 74, 50, 0.12);
  box-shadow: inset 0 -1px 0 var(--rust);
}

.bag-view {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.9fr);
  gap: 22px;
  align-items: start;
}

.bag-main {
  min-width: 0;
}

.bag-bar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.tabs {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  border-bottom: 1px solid var(--line);
}

.bag-bar__organize {
  flex: none;
  height: 30px;
  margin-bottom: 7px;
  padding: 0 14px;
  font-size: 11px;
}

.tab {
  position: relative;
  padding: 9px 13px 11px;
  font-size: 12.5px;
  letter-spacing: 0.1em;
  color: var(--text-mute);
  transition: 0.2s;
}

.tab span {
  margin-left: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
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
  left: 9px;
  right: 9px;
  bottom: -1px;
  height: 1px;
  background: var(--rust);
}

.grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.cell {
  position: relative;
  aspect-ratio: 1;
  max-height: 84px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.015);
  overflow: hidden;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.cell:hover {
  border-color: var(--line-strong);
  background: rgba(255, 255, 255, 0.04);
}

.cell--selected {
  border-color: rgba(193, 74, 50, 0.75);
  background: rgba(193, 74, 50, 0.1);
}

.cell--empty {
  cursor: default;
  border-style: dashed;
  background: rgba(255, 255, 255, 0.008);
}

.cell--empty:hover {
  border-color: var(--line);
  background: rgba(255, 255, 255, 0.008);
}

.cell__img {
  width: 66%;
  height: 66%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
}

.cell__fallback {
  font-size: 18px;
  color: var(--text-mute);
}

.cell__qty {
  position: absolute;
  top: 4px;
  right: 5px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--bone);
  background: rgba(8, 9, 10, 0.8);
  padding: 1px 4px;
}

.cell__name {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 3px 4px;
  font-size: 9.5px;
  letter-spacing: 0.02em;
  text-align: center;
  color: var(--text-dim);
  background: linear-gradient(180deg, transparent, rgba(8, 9, 10, 0.85));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell__plus {
  font-size: 13px;
  color: rgba(214, 208, 191, 0.14);
}

.bag-detail {
  min-width: 0;
}

.detail {
  display: flex;
  align-items: stretch;
  gap: 14px;
  padding: 13px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.022);
  min-height: 180px;
}

.detail--empty {
  align-items: center;
  justify-content: center;
  font-size: 11.5px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
  border-style: dashed;
  text-align: center;
  padding: 22px 16px;
}

.detail__thumb {
  width: 66px;
  height: 66px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.25);
}

.detail__thumb img {
  width: 78%;
  height: 78%;
  object-fit: contain;
}

.detail__thumb span {
  font-size: 18px;
  color: var(--text-mute);
}

.detail__main {
  flex: 1;
  min-width: 0;
}

.detail__headline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.detail__name {
  margin: 0;
  font-family: var(--font-title);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text);
}

.detail__qty {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--bone);
}

.detail__category {
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
  border: 1px solid var(--line);
  padding: 1px 6px;
}

.detail__tier {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.12em;
  border: 1px solid;
  padding: 1px 6px;
}

.detail__desc {
  margin: 8px 0 0;
  font-size: 11.5px;
  line-height: 1.7;
  letter-spacing: 0.03em;
  color: var(--text-dim);
}

.detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
  margin-top: 9px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.03em;
  color: var(--bone);
}

.detail__stack {
  margin: 8px 0 0;
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.panel-view {
  width: 100%;
}

.talent-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.guild-buff {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(205, 185, 141, 0.28);
  background: rgba(205, 185, 141, 0.05);
}

.guild-buff__badge {
  width: 52px;
  height: 52px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.25);
}

.guild-buff__badge img {
  width: 86%;
  height: 86%;
  object-fit: contain;
}

.guild-buff__main {
  min-width: 0;
}

.guild-buff__main h3 {
  margin: 4px 0 0;
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--bone);
}

.guild-buff__main p {
  margin: 5px 0 0;
  font-size: 10.5px;
  line-height: 1.75;
  letter-spacing: 0.03em;
  color: var(--text-dim);
}

.guild-buff__note {
  display: block;
  margin-top: 5px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.talent-view__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 16px;
  padding: 9px 11px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.025);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.talent-view__limit {
  color: var(--bone);
}

.talent-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 13px 16px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.022);
  transition:
    border-color 0.2s,
    background 0.2s;
}

.talent-row.is-active {
  border-color: rgba(124, 152, 64, 0.35);
  background: rgba(124, 152, 64, 0.04);
}

.talent-row__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.talent-row__head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 10px;
}

.talent-row__label {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.16em;
  color: var(--text-mute);
}

.talent-row__title {
  margin: 0;
  font-family: var(--font-title);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--text);
}

.talent-row__level {
  flex: none;
  padding: 2px 7px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--rust-soft);
  border: 1px solid rgba(193, 74, 50, 0.45);
}

.talent-row__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-mute);
}

.talent-row__meta b {
  font-weight: 500;
  color: var(--bone);
}

.track {
  height: 4px;
  background: rgba(214, 208, 191, 0.12);
  overflow: hidden;
}

.track__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--rust), var(--rust-soft));
  transition: width 0.4s ease;
}

.talent-row__tiers {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
}

.talent-row__tiers span {
  font-size: 10px;
  letter-spacing: 0.03em;
  color: rgba(214, 208, 191, 0.34);
}

.talent-row__tiers span.is-on {
  color: var(--bone);
}

.talent-switch {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 52px;
  padding: 0;
  color: var(--text-mute);
  background: none;
  border: 0;
  cursor: pointer;
}

.talent-switch__track {
  position: relative;
  width: 44px;
  height: 22px;
  border: 1px solid var(--line-strong);
  background: rgba(0, 0, 0, 0.35);
  transition:
    border-color 0.2s,
    background 0.2s;
}

.talent-switch__knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  background: var(--text-mute);
  transition:
    transform 0.2s ease,
    background 0.2s;
}

.talent-switch.is-on .talent-switch__track {
  border-color: rgba(124, 152, 64, 0.6);
  background: rgba(124, 152, 64, 0.18);
}

.talent-switch.is-on .talent-switch__knob {
  transform: translateX(22px);
  background: var(--sick);
}

.talent-switch__label {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.talent-switch.is-on .talent-switch__label {
  color: var(--sick);
}

.talent-switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.talent-empty {
  margin: 0;
  padding: 18px;
  font-size: 11.5px;
  line-height: 1.8;
  letter-spacing: 0.04em;
  color: var(--text-mute);
  border: 1px dashed var(--line-strong);
  text-align: center;
}

.foot-note {
  font-size: 11.5px;
  letter-spacing: 0.06em;
}

.foot-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
}

.foot-actions .btn {
  height: 32px;
  padding: 0 16px;
  font-size: 11.5px;
}

.foot-item {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--bone);
}

.btn--discard {
  border-color: rgba(193, 74, 50, 0.7);
  color: var(--rust-soft);
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}

.gem-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gem-view__intro {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.8;
  letter-spacing: 0.03em;
  color: var(--text-mute);
}

.gem-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.gem-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.022);
}

.gem-card__tag {
  align-self: flex-start;
  padding: 2px 7px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--rust-soft);
  border: 1px solid rgba(205, 185, 141, 0.4);
}

.gem-card img {
  width: 76px;
  height: 76px;
  align-self: center;
  object-fit: contain;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.25);
}

.gem-card h4 {
  margin: 0;
  font-family: var(--font-title);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--bone);
}

.gem-card p {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.8;
  letter-spacing: 0.02em;
  color: var(--text-mute);
}

.gem-view__empty {
  margin: 0;
  padding: 24px;
  border: 1px dashed var(--line-strong);
  text-align: center;
  font-size: 11.5px;
  color: var(--text-mute);
}

@media (max-width: 900px) {
  .bag-view {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* 移动端：详情置顶并吸顶，背包格子单独滚动 */
  .bag-detail {
    position: sticky;
    top: 0;
    z-index: 4;
    order: -1;
    padding-bottom: 8px;
    background: #0c0e0f;
  }

  .detail {
    min-height: 0;
  }

  .grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .gem-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .talent-row {
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
  }

  .talent-row__title {
    font-size: 16px;
  }
}

@media (max-width: 560px) {
  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .detail {
    flex-wrap: wrap;
  }

  .foot-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .foot-actions .btn {
    flex: 1;
  }

  .gem-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
