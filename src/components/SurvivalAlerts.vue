<script setup>
import { computed, reactive, watchEffect } from 'vue'
import { CLEANLINESS_MAX, countUsedSlots, getItem } from '../data'
import { settings } from '../game/save'
import { game } from '../game/store'

const THRESHOLD = 0.2

/** armed：本轮低值还没有提示过；shown：提示条正在显示 */
const armed = { backpack: true, melee: true, ranged: true }
const shown = reactive({ backpack: false, melee: false, ranged: false })
let lastMelee = null
let lastRanged = null

const bagTotal = computed(() => game.inventory.length || 0)
const bagFree = computed(() => bagTotal.value - countUsedSlots(game.inventory))
const bagLow = computed(
  () => bagTotal.value > 0 && bagFree.value < bagTotal.value * THRESHOLD,
)

const meleeInfo = computed(() => {
  const entry = game.equipment.melee
  if (!entry) return null
  const def = getItem(entry.id)
  const max = Number(def?.weapon?.durability)
  const current = Number(entry.durability)
  if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(current)) return null
  return {
    name: def?.name ?? entry.id,
    current: Math.max(0, Math.round(current)),
    max: Math.round(max),
    ratio: current / max,
  }
})

const rangedInfo = computed(() => {
  const entry = game.equipment.ranged
  if (!entry) return null
  const def = getItem(entry.id)
  const current = Number.isFinite(entry.cleanliness) ? entry.cleanliness : CLEANLINESS_MAX
  return {
    name: def?.name ?? entry.id,
    current: Math.max(0, Math.round(current)),
    max: CLEANLINESS_MAX,
    ratio: current / CLEANLINESS_MAX,
  }
})

const meleeLow = computed(() => Boolean(meleeInfo.value && meleeInfo.value.ratio < THRESHOLD))
const rangedLow = computed(() => Boolean(rangedInfo.value && rangedInfo.value.ratio < THRESHOLD))

function sync(key, low) {
  if (!low) {
    armed[key] = true
    if (shown[key]) shown[key] = false
    return
  }
  if (!armed[key]) return
  armed[key] = false
  shown[key] = true
}

watchEffect(() => {
  // 装备对象被替换（换武器 / 读档）时重新武装，允许再次提示
  const meleeEntry = game.equipment.melee
  if (meleeEntry !== lastMelee) {
    lastMelee = meleeEntry
    armed.melee = true
    shown.melee = false
  }
  const rangedEntry = game.equipment.ranged
  if (rangedEntry !== lastRanged) {
    lastRanged = rangedEntry
    armed.ranged = true
    shown.ranged = false
  }

  const enabled = Boolean(settings.survivalHints)
  sync('backpack', enabled && bagLow.value)
  sync('melee', enabled && meleeLow.value)
  sync('ranged', enabled && rangedLow.value)
})

const bars = computed(() => {
  if (game.dead || game.finale || !settings.survivalHints) return []
  const list = []
  if (shown.backpack) {
    list.push({
      id: 'backpack',
      tone: 'bag',
      title: '背包空间告急',
      text: '尽快清理背包，否则新掉落物品无法拾取',
      detail: `剩余 ${bagFree.value} / ${bagTotal.value} 格`,
    })
  }
  if (shown.melee && meleeInfo.value) {
    list.push({
      id: 'melee',
      tone: 'melee',
      title: '近战武器告急',
      text: '当前近战武器耐久度低',
      detail: `${meleeInfo.value.name} · ${meleeInfo.value.current} / ${meleeInfo.value.max}`,
    })
  }
  if (shown.ranged && rangedInfo.value) {
    list.push({
      id: 'ranged',
      tone: 'ranged',
      title: '远程武器告急',
      text: '当前远程武器清洁度低',
      detail: `${rangedInfo.value.name} · ${rangedInfo.value.current} / ${rangedInfo.value.max}`,
    })
  }
  return list
})

function dismiss(id) {
  shown[id] = false
}
</script>

<template>
  <div v-if="bars.length" class="alerts">
    <article v-for="bar in bars" :key="bar.id" class="alert" :class="`alert--${bar.tone}`">
      <div class="alert__main">
        <span class="alert__title">{{ bar.title }}</span>
        <span class="alert__text">{{ bar.text }}</span>
        <span class="alert__detail">{{ bar.detail }}</span>
      </div>
      <button
        type="button"
        class="alert__close"
        :aria-label="`关闭${bar.title}提示`"
        @click="dismiss(bar.id)"
      >
        ×
      </button>
    </article>
  </div>
</template>

<style scoped>
.alerts {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 70;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(560px, calc(100% - 32px));
  pointer-events: none;
}

.alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px 10px 14px;
  border: 1px solid var(--line-strong);
  border-left: 3px solid var(--rust);
  background: linear-gradient(180deg, rgba(26, 18, 16, 0.94), rgba(12, 13, 14, 0.94));
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  pointer-events: auto;
  animation: alert-in 0.22s ease both;
}

.alert--bag {
  border-left-color: var(--bone);
}

.alert__main {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  min-width: 0;
  flex: 1;
}

.alert__title {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--rust-soft);
  text-transform: uppercase;
}

.alert--bag .alert__title {
  color: var(--bone);
}

.alert__text {
  font-size: 12.5px;
  letter-spacing: 0.04em;
  color: var(--text);
}

.alert__detail {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
  margin-left: auto;
}

.alert__close {
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-strong);
  font-size: 14px;
  line-height: 1;
  color: var(--text-mute);
  transition: 0.2s;
}

.alert__close:hover {
  color: var(--bone);
  border-color: rgba(205, 185, 141, 0.45);
}

@keyframes alert-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
