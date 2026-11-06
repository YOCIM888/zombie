<script setup>
import { computed, defineAsyncComponent, ref } from 'vue'
import { BACKGROUND_IMAGE } from '../game/config'
import { enterGame } from '../game/store'
import SlotPanel from './SlotPanel.vue'
import PlaytimePanel from './PlaytimePanel.vue'
import AchievementsPanel from './AchievementsPanel.vue'
import CodexPanel from './CodexPanel.vue'
import SettingsPanel from './SettingsPanel.vue'

/** 构筑器按需加载：单独分包，只有点开时才会拉取计算模型 */
const BuildCodexPanel = defineAsyncComponent(() => import('./BuildCodexPanel.vue'))

const menuItems = [
  { id: 'new', label: '新的开始', desc: '选择存档位，踏入废墟' },
  { id: 'load', label: '读取存档', desc: '从上次停下的地方继续' },
  { id: 'playtime', label: '查看时长', desc: '你在末日里活过的每一秒' },
  { id: 'achievements', label: '我的成就', desc: '还没被大火烧掉的勋章' },
  { id: 'tools', label: '玩家工具', desc: '图鉴与生存记录' },
  { id: 'builds', label: '流派构筑', desc: '17 套流派搭配与期望伤害' },
  ...(import.meta.env.DEV
    ? [{ id: 'devtools', label: '开发工具', desc: '流派计算器与平衡评测' }]
    : []),
  { id: 'settings', label: '设置', desc: '音乐与声音偏好' },
]

const panel = ref('')

const bgStyle = computed(() => ({
  backgroundImage: `url("${encodeURI(BACKGROUND_IMAGE)}")`,
}))

function open(id) {
  if (id === 'devtools') {
    window.open('/devtools/FactinoTools/index.html', '_blank', 'noopener')
    return
  }
  panel.value = id === 'new' ? 'slots-new' : id === 'load' ? 'slots-load' : id
}

function startNew(index, name) {
  panel.value = ''
  enterGame(index, { isNew: true, name })
}

function startLoad(index) {
  panel.value = ''
  enterGame(index, { isNew: false })
}

function closePanel() {
  panel.value = ''
}
</script>

<template>
  <main class="menu">
    <div class="menu__bg" :style="bgStyle" />
    <div class="menu__scrim" />
    <div class="film-grain" />

    <div class="frame">
      <header class="topbar">
        <div class="topbar__brand">
          <span class="topbar__sig" />
          <span>行尸 · 档案系统</span>
        </div>
        <div class="topbar__right">
          <span class="topbar__status"><i />幸存者频道 · 静默</span>
          <span class="topbar__ver">v 0.2.2</span>
        </div>
      </header>

      <div class="content">
        <section class="hero">
          <p class="eyebrow">末日回合制互动生存</p>
          <h1 class="hero__title">行尸</h1>
          <p class="hero__en">THE WALKING · SURVIVAL LOG</p>
          <p class="hero__quote">活着，就是唯一的胜利。</p>
        </section>

        <nav class="nav" aria-label="主菜单">
          <button
            v-for="(item, index) in menuItems"
            :key="item.id"
            type="button"
            class="nav-item"
            :style="{ '--delay': index * 0.06 + 's' }"
            @click="open(item.id)"
          >
            <span class="nav-item__no">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="nav-item__main">
              <span class="nav-item__label">{{ item.label }}</span>
              <span class="nav-item__desc">{{ item.desc }}</span>
            </span>
            <span class="nav-item__arrow">→</span>
          </button>
        </nav>
      </div>

      <footer class="footer">
        <span>XINGSHI PROJECT · 2026</span>
        <span class="footer__note">开发中版本 · 框架演示</span>
      </footer>
    </div>

    <SlotPanel
      v-if="panel === 'slots-new' || panel === 'slots-load'"
      :mode="panel === 'slots-new' ? 'new' : 'load'"
      @close="closePanel"
      @start="startNew"
      @load="startLoad"
    />
    <PlaytimePanel v-else-if="panel === 'playtime'" @close="closePanel" />
    <AchievementsPanel v-else-if="panel === 'achievements'" @close="closePanel" />
    <CodexPanel v-else-if="panel === 'tools'" @close="closePanel" />
    <BuildCodexPanel v-else-if="panel === 'builds'" @close="closePanel" />
    <SettingsPanel v-else-if="panel === 'settings'" @close="closePanel" />
  </main>
</template>

<style scoped>
.menu {
  position: relative;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--bg);
}

.menu__bg {
  position: fixed;
  inset: 0;
  background-size: cover;
  background-position: center 35%;
  filter: grayscale(0.4) contrast(1.05) brightness(0.8);
  transform: scale(1.02);
}

.menu__scrim {
  position: fixed;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(6, 7, 8, 0.95) 0%, rgba(6, 7, 8, 0.8) 40%, rgba(6, 7, 8, 0.55) 100%),
    linear-gradient(180deg, rgba(6, 7, 8, 0.55) 0%, transparent 28%, rgba(6, 7, 8, 0.9) 100%);
}

.frame {
  position: relative;
  z-index: 3;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 22px clamp(18px, 4.6vw, 64px) 18px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.18em;
  color: var(--text-mute);
}

.topbar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topbar__sig {
  width: 6px;
  height: 6px;
  background: var(--rust);
  animation: pulse 2.6s ease-in-out infinite;
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: 22px;
}

.topbar__status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-dim);
}

.topbar__status i {
  width: 4px;
  height: 4px;
  background: var(--sick);
}

.content {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 390px);
  align-items: center;
  gap: clamp(28px, 6vw, 110px);
  padding: clamp(24px, 5vh, 60px) 0;
}

.hero {
  animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.hero__title {
  margin: 18px 0 10px;
  font-family: var(--font-title);
  font-size: clamp(76px, 11.5vw, 158px);
  line-height: 0.86;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #e7e0d2;
  text-shadow:
    0 2px 40px rgba(0, 0, 0, 0.7),
    0 0 80px rgba(193, 74, 50, 0.12);
}

.hero__en {
  margin: 0;
  font-family: var(--font-mono);
  font-size: clamp(9px, 0.85vw, 11px);
  letter-spacing: 0.42em;
  color: var(--text-mute);
}

.hero__quote {
  margin: clamp(26px, 4vh, 46px) 0 0;
  padding-left: 16px;
  border-left: 2px solid var(--rust);
  font-family: var(--font-title);
  font-size: clamp(13px, 1.2vw, 16px);
  letter-spacing: 0.26em;
  color: var(--text-dim);
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 14px;
  padding: 13px 14px 13px 12px;
  text-align: left;
  border: 1px solid transparent;
  border-left: 1px solid var(--line);
  background: linear-gradient(90deg, rgba(20, 22, 23, 0.62), rgba(20, 22, 23, 0.18));
  backdrop-filter: blur(4px);
  transition:
    transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.28s,
    border-color 0.28s;
  animation: fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(0.35s + var(--delay));
}

.nav-item:hover {
  transform: translateX(6px);
  border-color: var(--line);
  border-left-color: var(--rust);
  background: linear-gradient(90deg, rgba(193, 74, 50, 0.14), rgba(20, 22, 23, 0.3));
}

.nav-item:focus-visible {
  outline: 1px solid var(--rust-soft);
  outline-offset: 2px;
}

.nav-item__no {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
  transition: color 0.28s;
}

.nav-item:hover .nav-item__no {
  color: var(--rust-soft);
}

.nav-item__main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.nav-item__label {
  font-family: var(--font-title);
  font-size: 17.5px;
  letter-spacing: 0.14em;
  color: var(--text);
}

.nav-item__desc {
  font-size: 11px;
  letter-spacing: 0.03em;
  color: var(--text-mute);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item__arrow {
  font-size: 13px;
  color: var(--text-mute);
  transition:
    color 0.28s,
    transform 0.28s;
}

.nav-item:hover .nav-item__arrow {
  color: var(--rust-soft);
  transform: translateX(3px);
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--text-mute);
}

.footer__note {
  color: var(--text-mute);
  opacity: 0.75;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

@media (max-width: 960px) {
  .content {
    grid-template-columns: 1fr;
    gap: 34px;
    align-content: start;
    padding-top: 34px;
  }

  .hero__title {
    font-size: clamp(64px, 18vw, 110px);
  }

  .nav {
    max-width: 460px;
  }

  .footer {
    margin-top: 30px;
  }
}

@media (max-width: 640px) {
  .topbar__status,
  .topbar__ver {
    display: none;
  }

  .hero__quote {
    margin-top: 24px;
  }

  .nav-item {
    padding: 11px 12px;
  }

  .footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
