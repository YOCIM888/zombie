<script setup>
defineProps({
  title: { type: String, required: true },
  sub: { type: String, default: '' },
  wide: { type: Boolean, default: false },
  /** 地图窗口背景图（public 静态路径）；传空则保持原面板样式 */
  bg: { type: String, default: '' },
  /** 让背景更亮、遮罩更浅，用于需要突出背景图的特殊弹窗 */
  bgLight: { type: Boolean, default: false },
  /** 背景暗化档位：normal 常规、soft 更亮、deep 更深；留空沿用原口径 */
  bgTone: { type: String, default: '' },
})

defineEmits(['close'])
</script>

<template>
  <div class="modal-mask" @click.self="$emit('close')">
    <div
      class="modal-card"
      :class="{
        'modal-card--wide': wide,
        'modal-card--bg-light': bgLight,
        'modal-card--bg-normal': bgTone === 'normal',
        'modal-card--bg-soft': bgTone === 'soft',
        'modal-card--bg-deep': bgTone === 'deep',
      }"
      role="dialog"
      aria-modal="true"
    >
      <img v-if="bg" class="modal-bg" :src="bg" alt="" decoding="async" draggable="false" />
      <div v-if="bg" class="modal-veil" aria-hidden="true" />
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
/* 地图背景：铺满窗口、等比裁切；遮罩压暗保证标题与内容可读 */
.modal-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  filter: saturate(0.72) brightness(0.6);
  pointer-events: none;
  user-select: none;
}

.modal-veil {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 90% at 50% 18%, rgba(8, 9, 10, 0.32), rgba(8, 9, 10, 0.82) 100%),
    linear-gradient(180deg, rgba(8, 9, 10, 0.58) 0%, rgba(8, 9, 10, 0.86) 100%);
}

/* 特殊弹窗：背景图更亮，顶部标题与底部按钮区域保留较深遮罩，中段让画面透出 */
.modal-card--bg-light .modal-bg {
  filter: saturate(0.9) brightness(0.8);
}

.modal-card--bg-light .modal-veil {
  background: linear-gradient(
    180deg,
    rgba(8, 9, 10, 0.62) 0%,
    rgba(8, 9, 10, 0.56) 26%,
    rgba(8, 9, 10, 0.2) 55%,
    rgba(8, 9, 10, 0.64) 100%
  );
}

/* 面板背景档位：normal 沿用地图卡片的 .66；soft 让稀疏界面更透；deep 给密集文本 */
.modal-card--bg-normal .modal-bg {
  filter: saturate(0.72) brightness(0.66);
}

.modal-card--bg-soft .modal-bg {
  filter: saturate(0.78) brightness(0.72);
}

.modal-card--bg-soft .modal-veil {
  background:
    radial-gradient(120% 90% at 50% 18%, rgba(8, 9, 10, 0.24), rgba(8, 9, 10, 0.7) 100%),
    linear-gradient(180deg, rgba(8, 9, 10, 0.5) 0%, rgba(8, 9, 10, 0.8) 100%);
}

.modal-card--bg-deep .modal-bg {
  filter: saturate(0.66) brightness(0.58);
}

.modal-card--bg-deep .modal-veil {
  background:
    radial-gradient(120% 90% at 50% 18%, rgba(8, 9, 10, 0.36), rgba(8, 9, 10, 0.84) 100%),
    linear-gradient(180deg, rgba(8, 9, 10, 0.6) 0%, rgba(8, 9, 10, 0.88) 100%);
}

.modal-card > .modal-head,
.modal-card > .modal-hud,
.modal-card > .modal-body,
.modal-card > .modal-foot {
  position: relative;
  z-index: 1;
}

/* 所有面板统一铺满，宽版只是保留类名，不再限制宽度 */
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
