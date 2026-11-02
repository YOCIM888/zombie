<script setup>
defineProps({
  title: { type: String, required: true },
  sub: { type: String, default: '' },
  wide: { type: Boolean, default: false },
})

defineEmits(['close'])
</script>

<template>
  <div class="modal-mask" @click.self="$emit('close')">
    <div class="modal-card" :class="{ 'modal-card--wide': wide }" role="dialog" aria-modal="true">
      <header class="modal-head">
        <div>
          <h2 class="modal-title">{{ title }}</h2>
          <p v-if="sub" class="modal-sub">{{ sub }}</p>
        </div>
        <button class="icon-close" type="button" aria-label="关闭" @click="$emit('close')">
          ✕
        </button>
      </header>
      <div v-if="$slots.hud" class="modal-hud">
        <slot name="hud" />
      </div>
      <div class="modal-body">
        <slot />
      </div>
      <footer v-if="$slots.footer" class="modal-foot">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-card--wide {
  width: min(1080px, 100%);
  max-height: min(90vh, 900px);
}

.modal-hud {
  flex: none;
  margin: -6px 0 16px;
}

.modal-foot {
  flex: none;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
  color: var(--text-mute);
  letter-spacing: 0.06em;
}
</style>
