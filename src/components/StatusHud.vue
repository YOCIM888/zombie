<script setup>
import { computed } from 'vue'
import { STAT_DEFS, STAT_MAX } from '../game/config'
import { game } from '../game/store'
import { formatMoney } from '../data'

const RING_SIZE = 34
const RING_STROKE = 3
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const RING_CENTER = RING_SIZE / 2

const stats = computed(() =>
  STAT_DEFS.map((def) => {
    const value = Math.max(0, Math.min(STAT_MAX, Math.round(Number(game.stats[def.key]) || 0)))
    const percent = Math.round((value / STAT_MAX) * 100)
    const filled = (percent / 100) * RING_CIRCUMFERENCE
    return {
      ...def,
      value,
      percent,
      filled,
      gap: RING_CIRCUMFERENCE - filled,
    }
  }),
)
</script>

<template>
  <section class="hud" aria-label="玩家状态">
    <article
      v-for="stat in stats"
      :key="stat.key"
      class="hud__item"
      :aria-label="`${stat.label} ${stat.percent}%`"
    >
      <svg
        class="hud__ring"
        :viewBox="`0 0 ${RING_SIZE} ${RING_SIZE}`"
        role="progressbar"
        :aria-valuenow="stat.percent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <circle
          class="hud__track"
          :cx="RING_CENTER"
          :cy="RING_CENTER"
          :r="RING_RADIUS"
          :stroke-width="RING_STROKE"
        />
        <circle
          class="hud__value"
          :cx="RING_CENTER"
          :cy="RING_CENTER"
          :r="RING_RADIUS"
          :stroke-width="RING_STROKE"
          :stroke="stat.color"
          :stroke-dasharray="`${stat.filled} ${stat.gap}`"
        />
      </svg>
      <span class="hud__label">{{ stat.label }}</span>
      <b class="hud__percent" :style="{ color: stat.color }">{{ stat.percent }}%</b>
    </article>

    <article class="hud__item hud__item--coin" aria-label="末日币">
      <span class="coin__badge coin__badge--doom">末</span>
      <span class="hud__label">末日币</span>
      <b class="coin__value coin__value--doom">{{ formatMoney(game.coins) }}</b>
    </article>

    <article class="hud__item hud__item--coin" aria-label="曙光币">
      <span class="coin__badge coin__badge--dawn">曙</span>
      <span class="hud__label">曙光币</span>
      <b class="coin__value coin__value--dawn">{{ formatMoney(game.dawnCoins) }}</b>
    </article>
  </section>
</template>

<style scoped>
.hud {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 1px;
  border: 1px solid var(--line);
  background: var(--line);
}

.hud__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: 9px;
  row-gap: 1px;
  padding: 7px 10px;
  background: #0d0f10;
}

.hud__ring {
  grid-row: span 2;
  width: 34px;
  height: 34px;
}

.hud__track {
  fill: none;
  stroke: rgba(214, 208, 191, 0.16);
}

.hud__value {
  fill: none;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dasharray 0.35s ease;
}

.hud__label {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
  white-space: nowrap;
}

.hud__percent {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
}

.coin__badge {
  grid-row: span 2;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  font-family: var(--font-title);
  font-size: 13px;
  border-radius: 50%;
}

.coin__badge--doom {
  color: #d6b15b;
  border: 1px solid rgba(214, 177, 91, 0.5);
  background: rgba(214, 177, 91, 0.08);
}

.coin__badge--dawn {
  color: #6fbfa5;
  border: 1px solid rgba(111, 191, 165, 0.5);
  background: rgba(111, 191, 165, 0.08);
}

.coin__value {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.coin__value--doom {
  color: #d6b15b;
}

.coin__value--dawn {
  color: #6fbfa5;
}

@media (max-width: 900px) {
  .hud {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .hud__item {
    column-gap: 6px;
    padding: 5px 6px;
  }

  .hud__ring,
  .coin__badge {
    width: 28px;
    height: 28px;
  }

  .coin__badge {
    font-size: 11px;
  }

  .hud__label {
    font-size: 9px;
  }

  .hud__percent,
  .coin__value {
    font-size: 10px;
  }
}
</style>
