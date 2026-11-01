<script setup>
import { computed, onMounted, ref } from 'vue'
import { ITEMS } from '../data'
import { STAT_DEFS } from '../game/config'
import { allImageAssets, buildCodexCategories } from '../game/assets'
import { unlockAchievement } from '../game/save'
import ModalShell from './ModalShell.vue'

const STAT_LABELS = Object.fromEntries(STAT_DEFS.map((stat) => [stat.key, stat.label]))
const ITEM_BY_NAME = new Map(Object.values(ITEMS).map((item) => [item.name, item]))

const categories = buildCodexCategories(allImageAssets).map((category) => ({
  ...category,
  items: category.items.map((item) => ({
    ...item,
    def: ITEM_BY_NAME.get(item.name) ?? null,
  })),
}))
const activeIndex = ref(0)
const active = computed(() => categories[activeIndex.value])
const totalItems = computed(() => categories.reduce((sum, c) => sum + c.items.length, 0))
const collected = computed(() => totalItems.value)
const selected = ref(null)

const selectedDef = computed(() => selected.value?.def ?? null)
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
  if (def.effects) {
    for (const [key, value] of Object.entries(def.effects)) {
      const label = STAT_LABELS[key] ?? key
      chips.push(`${label} ${value > 0 ? '+' : ''}${value}`)
    }
  }
  return chips
})

function select(item) {
  selected.value = selected.value?.src === item.src ? null : item
}

onMounted(() => {
  unlockAchievement('codex-10')
})
</script>

<template>
  <ModalShell title="玩家工具" sub="图鉴 · 全部物品已点亮，点击图标查看信息" @close="$emit('close')">
    <div class="codex">
      <div class="codex__meta">
        <div>
          <span class="eyebrow">图鉴收录</span>
          <p class="codex__count">
            {{ collected }}<em>/{{ totalItems }}</em>
          </p>
        </div>
        <div class="codex__marks">
          <span v-for="category in categories" :key="category.name" class="mark">
            {{ category.name.slice(0, 2) }}
            <i>{{ category.items.length }}</i>
          </span>
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

      <article v-if="selected" class="detail">
        <img class="detail__img" :src="selected.src" :alt="selected.name" />
        <div class="detail__main">
          <div class="detail__tags">
            <span>{{ active.name }}</span>
            <span v-if="selectedDef?.tier">{{ selectedDef.tier }}</span>
          </div>
          <h3 class="detail__name">{{ selected.name }}</h3>
          <p class="detail__desc">
            {{ selectedDef?.description ?? '这件物品还没有留下说明。' }}
          </p>
          <div v-if="selectedStats.length" class="detail__stats">
            <span v-for="chip in selectedStats" :key="chip">{{ chip }}</span>
          </div>
        </div>
        <button type="button" class="detail__close" @click="selected = null">×</button>
      </article>
      <p v-else class="detail__hint">点击任意图标，查看该物品的名称、品质与说明。</p>

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

    <template #footer>
      <span>所有图标均已点亮。图鉴与存档位无关。</span>
      <span class="mode">CODEX</span>
    </template>
  </ModalShell>
</template>

<style scoped>
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

.codex__marks {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mark {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--line);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.mark i {
  font-style: normal;
  font-family: var(--font-mono);
  color: var(--text-dim);
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
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  }

  .detail {
    flex-direction: column;
  }
}
</style>
