<script setup>
defineProps({
  items: { type: Array, default: () => [] },
})
defineEmits(['select'])
</script>

<template>
  <div class="map-menu" :class="{ 'map-menu--single': items.length === 1 }">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="map-menu__item"
      :disabled="item.disabled"
      @click="$emit('select', item)"
    >
      <span class="map-menu__head">
        <span class="map-menu__name">{{ item.name }}</span>
        <span class="map-menu__tag">{{ item.tag ?? '可用' }}</span>
      </span>
      <span class="map-menu__note">{{ item.desc }}</span>
    </button>
  </div>
</template>

<style scoped>
.map-menu {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin-top: 14px;
  background: var(--line);
}

.map-menu__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(214, 208, 191, 0.16);
  background: rgba(8, 10, 11, 0.58);
  -webkit-backdrop-filter: blur(6px) saturate(0.92);
  backdrop-filter: blur(6px) saturate(0.92);
  text-align: left;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.map-menu__item:hover:not(:disabled) {
  border-color: rgba(193, 74, 50, 0.5);
  background: rgba(193, 74, 50, 0.2);
}

.map-menu__item:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.map-menu__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.map-menu__name {
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--text);
}

.map-menu__tag {
  flex: none;
  padding: 2px 7px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--rust-soft);
  border: 1px solid rgba(193, 74, 50, 0.4);
}

.map-menu__note {
  font-size: 10.5px;
  line-height: 1.65;
  letter-spacing: 0.03em;
  color: var(--text-mute);
}

.map-menu--single {
  grid-template-columns: minmax(0, 1fr);
}

@media (max-width: 680px) {
  .map-menu {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
