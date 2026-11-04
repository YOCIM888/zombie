<script setup>
import { computed } from 'vue'
import { npcById } from '../data'

const props = defineProps({
  npcId: { type: String, required: true },
})

const npc = computed(() => npcById(props.npcId))
</script>

<template>
  <div class="npc-intro">
    <div v-if="npc?.image" class="npc-intro__portrait">
      <img :src="npc.image" :alt="npc.name" />
    </div>
    <div class="npc-intro__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.npc-intro {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.npc-intro__portrait {
  width: 96px;
  flex: none;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.35);
  box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.55);
}

.npc-intro__portrait img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.9) contrast(1.05);
}

.npc-intro__body {
  flex: 1;
  min-width: 0;
}

@media (max-width: 560px) {
  .npc-intro {
    gap: 10px;
  }

  .npc-intro__portrait {
    width: 72px;
  }
}
</style>
