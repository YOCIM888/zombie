<script setup>
import { computed, ref } from 'vue'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../game/config'
import { TALENTS } from '../data'
import { globalStats } from '../game/save'
import { game } from '../game/store'
import ModalShell from './ModalShell.vue'

const unlockedCount = computed(() => globalStats.achievements.length)
const totalCount = ACHIEVEMENTS.length
const percent = computed(() => Math.round((unlockedCount.value / totalCount) * 100))

/** 默认进入「生存」：避免一打开就平铺 64 条，同时贴合题材；「全部」仍一键可达 */
const activeCategory = ref('survival')

/** 各分类条目数（含全部），直接给筛选按钮上的计数使用 */
const categoryCounts = computed(() =>
  Object.fromEntries(
    ACHIEVEMENT_CATEGORIES.map((category) => [
      category.id,
      category.id === 'all'
        ? ACHIEVEMENTS.length
        : ACHIEVEMENTS.filter((item) => item.category === category.id).length,
    ]),
  ),
)

/** 筛选后的列表；保留全局序号，保证编号始终对应该条在 64 条里的位置 */
const visibleAchievements = computed(() =>
  ACHIEVEMENTS.map((item, index) => ({ ...item, index })).filter(
    (item) => activeCategory.value === 'all' || item.category === activeCategory.value,
  ),
)

const activeCategoryName = computed(
  () =>
    ACHIEVEMENT_CATEGORIES.find((category) => category.id === activeCategory.value)?.name ?? '',
)

function isUnlocked(id) {
  return globalStats.achievements.includes(id)
}

function flagCount(key) {
  return Number(game.flags[key]) || 0
}

function learnedTalents() {
  return Object.values(game.talents).filter((level) => level > 0).length
}

/** 与 store 的六种属性死亡保持一致 */
const ATTRIBUTE_DEATHS = ['饥荒', '缺水', '自缢', '过劳', '尸变', '伤重不治']

/** 累计类成就的进度，仅未达成且已有进展时展示 */
const PROGRESS_OF = {
  'first-dodge': () => [flagCount('playerDodgeCount'), 1],
  'first-talent': () => [learnedTalents(), 1],
  'first-spray': () => [flagCount('sprayProcCount'), 1],
  'magic-10': () => [Math.min(10, flagCount('magicPeak')), 10],
  'insight-full': () => [Math.min(5, flagCount('insightPeak')), 5],
  'first-sweep': () => [flagCount('sweepHitCount'), 1],
  'execution-3': () => [Math.min(3, flagCount('executeCount')), 3],
  'first-break': () => [flagCount('weaponBrokenCount'), 1],
  'training-30': () => [Math.min(30, flagCount('trainingTotal')), 30],
  'talents-12': () => [learnedTalents(), 12],
  'talent-master': () => [
    Object.values(TALENTS).filter((talent) => (game.talents[talent.key] || 0) >= talent.maxLevel)
      .length,
    1,
  ],
  'death-reaper': () => [
    globalStats.deathEndings.filter((name) => ATTRIBUTE_DEATHS.includes(name)).length,
    ATTRIBUTE_DEATHS.length,
  ],
}

function progressText(item) {
  if (isUnlocked(item.id)) return ''
  const calc = PROGRESS_OF[item.id]
  if (!calc) return ''
  const [current, goal] = calc()
  return current > 0 ? `进度 ${current} / ${goal}` : ''
}
</script>

<template>
  <ModalShell title="我的成就" sub="还没有被大火烧掉的勋章" @close="$emit('close')">
    <div class="summary">
      <div>
        <span class="eyebrow">已达成</span>
        <p class="summary__value">
          {{ unlockedCount }}<em>/{{ totalCount }}</em>
        </p>
      </div>
      <div class="summary__bar">
        <div class="summary__track">
          <div class="summary__fill" :style="{ width: percent + '%' }" />
        </div>
        <span class="summary__hint">完成度 {{ percent }}%</span>
      </div>
    </div>

    <div class="filters" aria-label="成就分类筛选">
      <button
        v-for="category in ACHIEVEMENT_CATEGORIES"
        :key="category.id"
        type="button"
        class="tab"
        :class="{ 'tab--active': activeCategory === category.id }"
        :aria-pressed="activeCategory === category.id"
        @click="activeCategory = category.id"
      >
        {{ category.name }}
        <em class="tab__count">{{ categoryCounts[category.id] }}</em>
      </button>
    </div>

    <p v-if="!visibleAchievements.length" class="empty">
      「{{ activeCategoryName }}」分类下暂无成就。
    </p>

    <div v-else class="list">
      <article
        v-for="item in visibleAchievements"
        :key="item.id"
        class="ach"
        :class="{ 'ach--unlocked': isUnlocked(item.id) }"
      >
        <div class="ach__index">{{ String(item.index + 1).padStart(2, '0') }}</div>
        <div class="ach__body">
          <h3 class="ach__name">{{ item.name }}</h3>
          <p class="ach__desc">{{ item.desc }}</p>
          <p v-if="progressText(item)" class="ach__progress">{{ progressText(item) }}</p>
        </div>
        <span class="ach__state">{{ isUnlocked(item.id) ? '已达成' : '未达成' }}</span>
      </article>
    </div>

    <template #footer>
      <span>成就与存档位无关，所有记录共享同一份成就档案。</span>
      <span class="mode">ACHIEVEMENTS</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.summary {
  display: flex;
  align-items: flex-end;
  gap: 28px;
  padding: 4px 0 20px;
}

.summary__value {
  margin: 6px 0 0;
  font-family: var(--font-mono);
  font-size: 34px;
  color: var(--bone);
}

.summary__value em {
  font-style: normal;
  font-size: 15px;
  color: var(--text-mute);
}

.summary__bar {
  flex: 1;
  padding-bottom: 6px;
}

.summary__track {
  height: 3px;
  background: rgba(214, 208, 191, 0.12);
}

.summary__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--rust), rgba(193, 74, 50, 0.35));
  transition: width 0.5s ease;
}

.summary__hint {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  letter-spacing: 0.16em;
  color: var(--text-mute);
  font-family: var(--font-mono);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 0 16px;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text-mute);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.tab:hover {
  color: var(--text);
  border-color: rgba(214, 208, 191, 0.28);
}

.tab--active {
  color: var(--bone);
  border-color: rgba(193, 74, 50, 0.6);
  background: rgba(193, 74, 50, 0.12);
}

.tab__count {
  font-style: normal;
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.tab--active .tab__count {
  color: var(--rust-soft);
}

.empty {
  margin: 0;
  padding: 36px 0;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
}

.list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ach {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  opacity: 0.6;
  position: relative;
}

.ach--unlocked {
  opacity: 1;
  border-color: rgba(205, 185, 141, 0.35);
  background: rgba(205, 185, 141, 0.05);
}

.ach--unlocked::after {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--rust);
}

.ach__index {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-mute);
  padding-top: 3px;
}

.ach__body {
  flex: 1;
}

.ach__name {
  margin: 0;
  font-family: var(--font-title);
  font-size: 16px;
  letter-spacing: 0.12em;
  color: var(--text);
}

.ach--unlocked .ach__name {
  color: var(--bone);
}

.ach__desc {
  margin: 6px 0 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--text-mute);
  letter-spacing: 0.03em;
}

.ach__progress {
  margin: 4px 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: rgba(205, 185, 141, 0.72);
}

.ach__state {
  flex: none;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--text-mute);
  border: 1px solid var(--line);
  padding: 2px 6px;
}

.ach--unlocked .ach__state {
  color: var(--rust-soft);
  border-color: rgba(193, 74, 50, 0.5);
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}

@media (max-width: 640px) {
  .list {
    grid-template-columns: 1fr;
  }

  .summary {
    gap: 16px;
  }

  .filters {
    gap: 6px;
  }

  .tab {
    padding: 5px 8px;
  }
}
</style>
