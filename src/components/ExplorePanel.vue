<script setup>
import { computed, ref } from 'vue'
import { MAPS } from '../game/config'
import { enterMap, game } from '../game/store'
import { ENTRY_COST, HARBOR_MUTINY } from '../data'
import ModalShell from './ModalShell.vue'

const emit = defineEmits(['close', 'enter'])
const displayed = ref('')
const visibleMaps = computed(() => MAPS.filter((item) => !item.hidden))
const portBanLeft = computed(() =>
  Math.max(0, (Number(game.flags.portBanUntilDay) || 0) - game.day),
)

function mapPortBanned(map) {
  return portBanLeft.value > 0 && HARBOR_MUTINY.banMapIds.includes(map.id)
}

function mapAvailable(map) {
  if (!map.open) return false
  if (map.unlockDay && game.day < map.unlockDay) return false
  if (mapPortBanned(map)) return false
  return true
}

function enterLabel(map) {
  if (!map.open) return '尚未开放'
  if (mapPortBanned(map)) return `${portBanLeft.value} 天后解禁`
  if (map.unlockDay && game.day < map.unlockDay) {
    return `第 ${map.unlockDay} 天开放`
  }
  return '进入区域'
}

function enter(map) {
  if (mapPortBanned(map)) {
    displayed.value = `油轮沉没后你的名声臭了：还有 ${portBanLeft.value} 天无法进入「${map.name}」。`
    return
  }
  if (!mapAvailable(map)) {
    displayed.value =
      map.open && map.unlockDay
        ? `「${map.name}」要到第 ${map.unlockDay} 天后才会开放（当前第 ${game.day} 天）。`
        : `「${map.name}」尚未开放：探索事件、战斗与掉落将在下一阶段接入。`
    return
  }
  if (enterMap(map.id)) emit('enter')
}
</script>

<template>
  <ModalShell title="外出探索" sub="选择一个区域，离开安全屋" @close="$emit('close')">
    <div class="maps">
      <article
        v-for="map in visibleMaps"
        :key="map.id"
        class="map"
        :class="{ 'map--locked': !mapAvailable(map) }"
      >
        <header class="map__head">
          <span class="map__level">{{ map.level }}</span>
          <span class="map__difficulty" :class="`risk-${map.risk}`">{{ map.difficulty }}</span>
        </header>

        <h3 class="map__name">{{ map.name }}</h3>
        <p class="map__desc">{{ map.desc }}</p>

        <div class="map__risk">
          <span class="map__risk-label">威胁度</span>
          <div class="map__dots">
            <i v-for="n in 5" :key="n" :class="{ 'is-on': n <= map.risk }" />
          </div>
          <span class="map__risk-value">{{ map.difficulty }}</span>
        </div>

        <p v-if="map.field" class="map__loot">
          {{ map.lootNote }} · 遭遇率 {{ Math.round(map.encounterRate * 100) }}%
        </p>

        <p v-if="mapPortBanned(map)" class="map__unlock">
          名声受损：还有 {{ portBanLeft }} 天无法进入
        </p>
        <p v-else-if="map.unlockDay && !mapAvailable(map)" class="map__unlock">
          解锁：第 {{ map.unlockDay }} 天后（当前第 {{ game.day }} 天）
        </p>

        <p class="map__entry">
          进入消耗：口渴 {{ ENTRY_COST.thirst }} / 饱食 {{ ENTRY_COST.hunger }} / 体力
          {{ ENTRY_COST.stamina }}
        </p>

        <div class="map__foot">
          <span class="map__note">{{ map.note }}</span>
          <button
            type="button"
            class="btn"
            :class="{ 'btn--primary': mapAvailable(map) }"
            :disabled="!mapAvailable(map)"
            @click="enter(map)"
          >
            {{ enterLabel(map) }}
          </button>
        </div>
      </article>
    </div>

    <p v-if="displayed" class="notice">{{ displayed }}</p>

    <template #footer>
      <span>进入地图会立即扣除一次 5 点口渴 / 饱食 / 体力；区域内的行动才消耗回合。</span>
      <span class="mode">MAP SELECT</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.maps {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.map {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 18px;
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
  transition: 0.25s;
}

.map:hover {
  border-color: var(--line-strong);
}

.map--locked {
  opacity: 0.66;
}

.map__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.map__level {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--text-mute);
}

.map__difficulty {
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--bone);
  border: 1px solid var(--line-strong);
  padding: 2px 7px;
}

.map__difficulty.risk-1 {
  color: var(--sick);
  border-color: rgba(124, 152, 64, 0.5);
}

.map__difficulty.risk-2 {
  color: var(--sick);
  border-color: rgba(124, 152, 64, 0.4);
}

.map__difficulty.risk-3 {
  color: var(--rust-soft);
  border-color: rgba(193, 74, 50, 0.5);
}

.map__difficulty.risk-4 {
  color: var(--rust-soft);
  border-color: rgba(193, 74, 50, 0.68);
}

.map__difficulty.risk-5 {
  color: #d4573f;
  border-color: rgba(212, 87, 63, 0.8);
  background: rgba(193, 74, 50, 0.1);
}

.map__loot {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 9.5px;
  line-height: 1.6;
  letter-spacing: 0.03em;
  color: var(--text-mute);
}

.map__unlock {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 9.5px;
  line-height: 1.6;
  letter-spacing: 0.03em;
  color: var(--rust-soft);
}

.map__name {
  margin: 2px 0 0;
  font-family: var(--font-title);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--text);
}

.map__desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.85;
  letter-spacing: 0.03em;
  color: var(--text-dim);
  min-height: 66px;
}

.map__risk {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 2px;
}

.map__risk-label {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--text-mute);
}

.map__dots {
  display: flex;
  gap: 4px;
}

.map__dots i {
  width: 10px;
  height: 3px;
  background: rgba(214, 208, 191, 0.16);
}

.map__dots i.is-on {
  background: rgba(193, 74, 50, 0.8);
}

.map__risk-value {
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.map__entry {
  margin: 0;
  padding: 8px 10px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--text-dim);
  background: rgba(0, 0, 0, 0.22);
  border-left: 2px solid var(--line-strong);
}

.map__foot {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}

.map__note {
  flex: 1 1 100%;
  font-size: 10.5px;
  letter-spacing: 0.03em;
  color: var(--text-mute);
}

.map__foot .btn {
  height: 32px;
  padding: 0 14px;
  font-size: 11.5px;
}

.map__foot .btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.notice {
  margin: 14px 0 0;
  padding: 10px 12px;
  border-left: 2px solid var(--rust);
  background: rgba(193, 74, 50, 0.08);
  font-size: 11px;
  letter-spacing: 0.03em;
  color: var(--text-dim);
}

.mode {
  font-family: var(--font-mono);
  letter-spacing: 0.22em;
}

@media (max-width: 680px) {
  .maps {
    grid-template-columns: 1fr;
  }
}
</style>
