<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BACKGROUND_IMAGE, DEFAULT_CHARACTER_NAME, STAT_DEFS } from '../game/config'
import { AIRSHIP, FINALES, fieldMapById, formatMoney } from '../data'
import {
  currentPhase,
  currentPlaytime,
  dismissTradeNotice,
  game,
  leaveMap,
  leaveToMenu,
  notify,
  renameCharacter,
  saveToSlot,
  statCap,
  tickPlaytime,
  tradeNotice,
} from '../game/store'
import { flushGlobalStats, settings } from '../game/save'
import { battle } from '../game/battle'
import {
  dispatchShortcut,
  isTypingTarget,
} from '../game/keyboard'
import { clearNavFocus, ensureNavFocus, handleNavKey, isNavKey } from '../game/nav'
import { formatDuration } from '../game/format'
import ModalShell from './ModalShell.vue'
import ExplorePanel from './ExplorePanel.vue'
import CityPanel from './CityPanel.vue'
import DawnPanel from './DawnPanel.vue'
import FieldPanel from './FieldPanel.vue'
import AirshipPanel from './AirshipPanel.vue'
import CompanionPanel from './CompanionPanel.vue'
import NotebookPanel from './NotebookPanel.vue'
import InventoryPanel from './InventoryPanel.vue'
import SavePanel from './SavePanel.vue'
import SleepPanel from './SleepPanel.vue'
import StatusHud from './StatusHud.vue'
import SurvivalAlerts from './SurvivalAlerts.vue'
import UtopiaPanel from './UtopiaPanel.vue'
import DevConsole from './DevConsole.vue'

/** 构筑器按需加载：单独分包，只有点开时才会拉取计算模型 */
const BuildCodexPanel = defineAsyncComponent(() => import('./BuildCodexPanel.vue'))

const panel = ref('')
const showLeave = ref(false)
const showRename = ref(false)
const showDevConsole = ref(false)
const renameDraft = ref('')
/** T 键打开背包时直达天赋页；TAB 打开时回到常规背包 */
const inventoryStartView = ref('bag')

/** 隐藏入口：头像连续点击 8 次；相邻两次超过 700ms 视为重新开始 */
const DEV_TAP_TARGET = 8
const DEV_TAP_GAP = 700
const devTapCount = ref(0)
let devTapLast = 0

function onAvatarPointerDown(event) {
  if (showDevConsole.value) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const now = Date.now()
  if (now - devTapLast > DEV_TAP_GAP) devTapCount.value = 0
  devTapLast = now
  devTapCount.value += 1
  if (devTapCount.value >= DEV_TAP_TARGET) {
    devTapCount.value = 0
    devTapLast = 0
    showDevConsole.value = true
  }
}

/** 隐藏入口：Shift + C + Enter 同时按下；按住不放只触发一次 */
const devPressedKeys = new Set()
let devComboFired = false

function onDevKeyDown(event) {
  if (isTypingTarget(event.target)) return
  devPressedKeys.add(event.code)
  const shiftHeld =
    event.shiftKey ||
    devPressedKeys.has('ShiftLeft') ||
    devPressedKeys.has('ShiftRight')
  const comboReady =
    shiftHeld && devPressedKeys.has('KeyC') && devPressedKeys.has('Enter')
  if (comboReady && !devComboFired) {
    devComboFired = true
    event.preventDefault()
    event.stopPropagation()
    showDevConsole.value = true
  }
}

function onDevKeyUp(event) {
  devPressedKeys.delete(event.code)
  if (['ShiftLeft', 'ShiftRight', 'KeyC', 'Enter', 'NumpadEnter'].includes(event.code)) {
    devComboFired = false
  }
}

/** ===== 桌面快捷键 ===== */
const MAP_PANELS = new Set(['city', 'dawn', 'field', 'airship', 'utopia'])
/** 只有安全屋（没有打开任何面板）才响应的按键 */
const SAFEHOUSE_PANELS = {
  KeyN: 'notebook',
  KeyM: 'explore',
  KeyP: 'sleep',
  KeyL: 'save',
  KeyF: 'companion',
  KeyG: 'builds',
}
const SHORTCUT_ACTIONS = {
  Tab: 'toggleBag',
  KeyT: 'openTalent',
  KeyZ: 'organize',
  KeyQ: 'ranged',
  KeyE: 'melee',
  KeyR: 'flee',
  Escape: 'escape',
}

/** 「返回主菜单」里的快捷键教程：逐项标注实际生效场景 */
const SHORTCUT_GUIDE = [
  { keys: 'TAB', what: '背包', scene: '安全屋 / 地图内 / 战斗中（可开关战斗背包）' },
  { keys: 'N', what: '备忘录', scene: '仅安全屋且无面板打开时' },
  { keys: 'M', what: '外出探索', scene: '仅安全屋且无面板打开时' },
  { keys: 'P', what: '睡觉', scene: '仅安全屋且无面板打开时' },
  { keys: 'L', what: '查看存档', scene: '仅安全屋且无面板打开时' },
  { keys: 'T', what: '天赋页', scene: '安全屋 / 地图内（直接打开天赋页，战斗中除外）' },
  { keys: 'F', what: '伙伴收获', scene: '仅安全屋且无面板打开时' },
  { keys: 'G', what: '流派构筑', scene: '仅安全屋且无面板打开时' },
  { keys: 'Z', what: '整理背包', scene: '仅背包打开时' },
  { keys: 'Q', what: '远程攻击', scene: '仅战斗进行中，需可用远程武器且背包关闭' },
  { keys: 'E', what: '近战攻击', scene: '仅战斗进行中且背包关闭' },
  { keys: 'R', what: '逃跑', scene: '仅战斗进行中，需允许逃跑且背包关闭' },
  { keys: 'ESC', what: '返回 / 关闭', scene: '任意界面逐级关闭；安全屋无面板时打开返回主菜单' },
]

const NAV_GUIDE = [
  { keys: 'ASDW', what: '移动选中项', scene: '地图选择 / 地图内部菜单（桌面）' },
  { keys: 'ENTER', what: '确认当前选中', scene: '地图选择 / 地图内部菜单（桌面）' },
]

/** 关闭压在地图/存档面板上方的确认弹窗（保留面板本身） */
function closeStackedModal() {
  const masks = document.querySelectorAll('.modal-mask')
  if (masks.length <= 1) return false
  const close = masks[masks.length - 1].querySelector('.icon-close')
  if (!close) return false
  close.click()
  return true
}

function onShortcutKeyDown(event) {
  if (event.repeat) return
  // 不接管浏览器 / 系统组合键，Shift+Tab 仍保留反向焦点导航，Shift+C+Enter 留给开发者组合键
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  const action = SHORTCUT_ACTIONS[event.code]
  const isEscape = event.code === 'Escape'
  const isNav = isNavKey(event.code)
  if (!action && !SAFEHOUSE_PANELS[event.code] && !isNav) return
  // 输入框聚焦时除 ESC 外一律不响应：保证打字 / 回车提交不被导航拦截
  if (isTypingTarget(event.target) && !isEscape) return

  // 纯键盘导航：只受「键盘导航」开关控制，与快捷操作互不影响
  if (isNav) {
    if (!settings.keyboardNav) return
    // 战斗中交给 Q/E/R，避免 ENTER 误触攻击
    if (battle.active) {
      event.preventDefault()
      return
    }
    if (handleNavKey(event.code)) event.preventDefault()
    return
  }

  // 其余按键只受「快捷操作」开关控制
  if (!settings.shortcuts) return

  if (isEscape) {
    if (showDevConsole.value) {
      showDevConsole.value = false
      event.preventDefault()
      return
    }
    if (showRename.value) {
      showRename.value = false
      event.preventDefault()
      return
    }
    if (showLeave.value) {
      showLeave.value = false
      event.preventDefault()
      return
    }
    if (tradeNotice.sales.length && !battle.active && !game.dead) {
      dismissTradeNotice()
      event.preventDefault()
      return
    }
  }

  // 由最上层面板处理（战斗背包 / 战斗操作 / 背包 / 地图子页面）
  if (action && dispatchShortcut(action)) {
    event.preventDefault()
    return
  }

  if (isEscape) {
    if (closeStackedModal()) {
      event.preventDefault()
      return
    }
    if (panel.value) {
      if (MAP_PANELS.has(panel.value)) closeCity()
      else panel.value = ''
      event.preventDefault()
      return
    }
    // 最底层：安全屋且没有任何面板，ESC 等同于点击「返回主菜单」按钮
    if (game.location === null && !game.dead && !game.finale) {
      showLeave.value = true
      event.preventDefault()
    }
    return
  }

  // TAB / T / N / M / P / L 的安全屋兜底：只在没有任何面板、没有确认弹窗时生效
  if (panel.value !== '' || game.dead || game.finale) return
  if (closeStackedModal()) return
  if (event.code === 'Tab') {
    inventoryStartView.value = 'bag'
    panel.value = 'inventory'
    event.preventDefault()
    return
  }
  if (event.code === 'KeyT') {
    inventoryStartView.value = 'talent'
    panel.value = 'inventory'
    event.preventDefault()
    return
  }
  const safehousePanel = SAFEHOUSE_PANELS[event.code]
  if (safehousePanel) {
    panel.value = safehousePanel
    event.preventDefault()
  }
}
const bgStyle = computed(() => ({
  backgroundImage: `url("${encodeURI(BACKGROUND_IMAGE)}")`,
}))
const finaleText = computed(() => {
  const entry = FINALES[game.finale] ?? null
  // 米娅已死时「新秩序」使用变体文案，标题与结局判定不变
  if (entry?.queenDeadText && game.flags.queenKilled) {
    return { ...entry, text: entry.queenDeadText }
  }
  return entry
})

const slotLabel = computed(() =>
  game.slotIndex === null ? '—' : String(game.slotIndex + 1).padStart(2, '0'),
)

let timer = 0

onMounted(() => {
  timer = window.setInterval(tickPlaytime, 1000)
  window.addEventListener('keydown', onDevKeyDown)
  window.addEventListener('keyup', onDevKeyUp)
  window.addEventListener('keydown', onShortcutKeyDown)
})

onBeforeUnmount(() => {
  window.clearInterval(timer)
  window.removeEventListener('keydown', onDevKeyDown)
  window.removeEventListener('keyup', onDevKeyUp)
  window.removeEventListener('keydown', onShortcutKeyDown)
  flushGlobalStats()
})

function saveAndLeave() {
  if (game.slotIndex !== null) saveToSlot(game.slotIndex)
  showLeave.value = false
  leaveToMenu()
}

function leaveDirectly() {
  showLeave.value = false
  leaveToMenu()
}

function closeCity() {
  leaveMap()
  panel.value = ''
}

function openRegion() {
  if (game.location === 'dawn-post') {
    panel.value = 'dawn'
  } else if (game.location === 'ruined-city') {
    panel.value = 'city'
  } else if (game.location === AIRSHIP.mapId) {
    panel.value = 'airship'
  } else if (game.location === 'utopia-city') {
    panel.value = 'utopia'
  } else if (fieldMapById(game.location)) {
    panel.value = 'field'
  } else {
    panel.value = 'city'
  }
}

// 位置变化即打开对应区域：开发者传送等直接改 location 的入口也能自动弹出面板
watch(
  () => game.location,
  (mapId) => {
    if (mapId && !game.dead) openRegion()
  },
)

// 打开地图 / 地图选择后，把键盘焦点落到第一个可选项；键盘导航关闭时不显示导航焦点
watch(panel, async (value) => {
  if (!value || !settings.keyboardNav) {
    clearNavFocus()
    return
  }
  await nextTick()
  ensureNavFocus()
})

// 设置里切换「键盘导航」：关闭立刻清除高亮，打开则给当前面板补上首项焦点
watch(
  () => settings.keyboardNav,
  async (enabled) => {
    if (!enabled) {
      clearNavFocus()
      return
    }
    if (!panel.value) return
    await nextTick()
    ensureNavFocus()
  },
)

function backHome() {
  leaveToMenu()
}

function closeFinale() {
  game.finale = ''
}

function openRename() {
  renameDraft.value = game.character
  showRename.value = true
}

function submitRename() {
  const line = renameCharacter(renameDraft.value)
  if (!line) return
  notify(line)
  showRename.value = false
}

function finishAndLeave() {
  // 死亡结局（如「恶魔」）不写存档，避免把无法继续的状态覆盖进存档位
  if (!game.dead && game.slotIndex !== null) saveToSlot(game.slotIndex)
  leaveToMenu()
}

function percentOf(key) {
  return Math.max(0, Math.min(100, (game.stats[key] / statCap(key)) * 100))
}
</script>

<template>
  <main class="game">
    <div class="game__bg" :style="bgStyle" />
    <div class="game__veil" />
    <div class="film-grain" />

    <div class="frame">
      <header class="hud panel">
        <div class="hud__top">
          <div class="identity">
            <img
              class="identity__avatar"
              src="/image/主角与NPC立绘/主角头像.webp"
              :alt="`${game.character}的头像`"
              draggable="false"
              @pointerdown.prevent="onAvatarPointerDown"
              @contextmenu.prevent
            />
            <div class="identity__main">
              <span class="eyebrow">幸存者档案</span>
              <div class="identity__row">
                <h1 class="identity__name">{{ game.character }}</h1>
                <button type="button" class="identity__rename" @click="openRename">改名</button>
                <span class="identity__tag">存档 {{ slotLabel }}</span>
                <span v-if="game.identity" class="identity__tag">身份 · {{ game.identity }}</span>
                <span v-if="game.dawnIdentity" class="identity__tag">曙光 · {{ game.dawnIdentity }}</span>
              </div>
              <p class="identity__meta">
                第 {{ game.day }} 天 · {{ currentPhase }} · 本次游玩
                {{ formatDuration(currentPlaytime, { withSeconds: false }) }} · 累计击杀
                {{ game.zombieKills }} 丧尸
              </p>
            </div>
          </div>

          <div class="hud__right">
            <span class="hud__signal"><i />安全屋 · 暂时安全</span>
            <button type="button" class="btn hud__leave" @click="panel = 'builds'">
              流派构筑
            </button>
            <button type="button" class="btn hud__leave" @click="showLeave = true">
              返回主菜单
            </button>
          </div>
        </div>

        <div class="gauges">
          <div v-for="stat in STAT_DEFS" :key="stat.key" class="gauge">
            <div class="gauge__head">
              <span class="gauge__label">{{ stat.label }}</span>
              <span class="gauge__value">
                {{ game.stats[stat.key] }}<em>/{{ statCap(stat.key) }}</em>
              </span>
            </div>
            <div class="gauge__track">
              <div
                class="gauge__fill"
                :style="{ width: percentOf(stat.key) + '%', background: stat.color }"
              />
            </div>
          </div>

          <div class="gauge gauge--coin gauge--doom">
            <div class="gauge__head">
              <span class="gauge__label">末日币</span>
              <span class="gauge__value">{{ formatMoney(game.coins) }}</span>
            </div>
            <div class="gauge__track gauge__track--coin" />
          </div>

          <div class="gauge gauge--coin gauge--dawn">
            <div class="gauge__head">
              <span class="gauge__label">曙光币</span>
              <span class="gauge__value">{{ formatMoney(game.dawnCoins) }}</span>
            </div>
            <div class="gauge__track gauge__track--coin" />
          </div>
        </div>
      </header>

      <section class="scene">
        <div class="scene__bg" :style="bgStyle" />
        <div class="scene__shade" />

        <div class="scene__content">
          <div class="scene__head">
            <p class="eyebrow">当前位置</p>
            <h2 class="scene__title">安全屋 · 三楼公寓</h2>
            <p class="scene__desc">
              窗外仍旧是那片废墟。收音机里只剩电流声，但门还锁着——今天你还活着。
            </p>
          </div>

          <div class="scene__body">
            <div class="log">
              <h3 class="log__title">生存记录</h3>
              <ul class="log__list">
                <li><span>01</span>你在公寓的沙发上醒来，天色灰白，空气里有铁锈味。</li>
                <li><span>02</span>街道上有人影缓慢移动，它们没有影子。</li>
                <li><span>03</span>选择「外出探索」，看看这座城市还剩什么。</li>
              </ul>
            </div>

            <div class="scene__note">
              <span class="eyebrow">游戏向导</span>
              <p>
                觉得游戏太难可以去【郊区卖场】地图寻找开发者领取一次性奖励,但游戏硬核度将会下降。
                <br />
                备忘录有空就看看，里有所有交互的冷却与剩余次数，帮助你规划你的行动。
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer class="actions">
        <button type="button" class="action" @click="panel = 'explore'">
          <span class="action__no">01</span>
          <span class="action__main">
            <span class="action__label">外出探索</span>
            <span class="action__desc">离开安全屋，进入废墟</span>
          </span>
          <span class="action__arrow">→</span>
        </button>

        <button type="button" class="action" @click="panel = 'sleep'">
          <span class="action__no">02</span>
          <span class="action__main">
            <span class="action__label">睡觉</span>
            <span class="action__desc">小憩 1 回合，或睡足 4 回合</span>
          </span>
          <span class="action__arrow">→</span>
        </button>

        <button type="button" class="action" @click="panel = 'inventory'">
          <span class="action__no">03</span>
          <span class="action__main">
            <span class="action__label">打开背包</span>
            <span class="action__desc">查看随身携带的物资</span>
          </span>
          <span class="action__arrow">→</span>
        </button>

        <button type="button" class="action" @click="panel = 'save'">
          <span class="action__no">04</span>
          <span class="action__main">
            <span class="action__label">查看存档</span>
            <span class="action__desc">保存或读取当前进度</span>
          </span>
          <span class="action__arrow">→</span>
        </button>

        <button type="button" class="action" @click="panel = 'companion'">
          <span class="action__no">05</span>
          <span class="action__main">
            <span class="action__label">伙伴收获</span>
            <span class="action__desc">嫣然与露露今天带回了什么</span>
          </span>
          <span class="action__arrow">→</span>
        </button>

        <button type="button" class="action" @click="panel = 'notebook'">
          <span class="action__no">06</span>
          <span class="action__main">
            <span class="action__label">备忘录</span>
            <span class="action__desc">所有交互的冷却与剩余次数</span>
          </span>
          <span class="action__arrow">→</span>
        </button>
      </footer>
    </div>

    <ExplorePanel
      v-if="panel === 'explore'"
      @close="panel = ''"
      @enter="openRegion"
    />
    <CityPanel v-else-if="panel === 'city'" @close="closeCity" />
    <DawnPanel v-else-if="panel === 'dawn'" @close="closeCity" />
    <FieldPanel v-else-if="panel === 'field'" @close="closeCity" @travel="panel = 'airship'" />
    <AirshipPanel v-else-if="panel === 'airship'" @close="closeCity" />
    <UtopiaPanel v-else-if="panel === 'utopia'" @close="closeCity" />
    <CompanionPanel v-else-if="panel === 'companion'" @close="panel = ''" />
    <NotebookPanel v-else-if="panel === 'notebook'" @close="panel = ''" />
    <SleepPanel v-else-if="panel === 'sleep'" @close="panel = ''" />
    <InventoryPanel
      v-else-if="panel === 'inventory'"
      :initial-view="inventoryStartView"
      @close="panel = ''"
    />
    <SavePanel v-else-if="panel === 'save'" @close="panel = ''" />
    <BuildCodexPanel v-else-if="panel === 'builds'" @close="panel = ''" />

    <SurvivalAlerts />

    <div v-if="game.dead && !game.finale" class="death">
      <div class="death__card">
        <p class="eyebrow">生存终止</p>
        <h2 class="death__title">{{ game.ending || '你死了' }}</h2>
        <p class="death__reason">{{ game.deathReason }}</p>
        <button type="button" class="btn btn--primary" @click="backHome">回到主菜单</button>
      </div>
    </div>

    <div v-if="game.finale" class="finale">
      <div class="finale__card">
        <p class="eyebrow">结局</p>
        <h2 class="finale__title">{{ finaleText?.title ?? game.finale }}</h2>
        <p class="finale__text">{{ finaleText?.text }}</p>
        <div class="finale__actions">
          <button v-if="!finaleText?.terminal" type="button" class="btn" @click="closeFinale">
            继续游戏
          </button>
          <button type="button" class="btn btn--primary" @click="finishAndLeave">
            {{ game.dead ? '回到主菜单' : '保存并返回主界面' }}
          </button>
        </div>
      </div>
    </div>

    <ModalShell
      v-if="showRename"
      title="修改名字"
      sub="档案上的名字随时可以改，保存进度后写入存档"
      @close="showRename = false"
    >
      <label class="rename" for="rename-input">
        <span class="rename__label">幸存者名字</span>
        <input
          id="rename-input"
          v-model="renameDraft"
          type="text"
          maxlength="16"
          :placeholder="DEFAULT_CHARACTER_NAME"
          @keyup.enter="submitRename"
        />
        <span class="rename__hint">最多 16 个字符，留空则不会修改</span>
      </label>
      <template #footer>
        <div class="leave__actions">
          <span class="leave__hint">当前名字：{{ game.character }}</span>
          <div class="leave__buttons">
            <button type="button" class="btn" @click="showRename = false">取消</button>
            <button type="button" class="btn btn--primary" @click="submitRename">
              保存名字
            </button>
          </div>
        </div>
      </template>
    </ModalShell>

    <ModalShell
      v-if="showLeave"
      title="返回主菜单"
      sub="未保存的进度将会丢失"
      bg="/image/背景图/返回主菜单.webp"
      bg-light
      @close="showLeave = false"
    >
      <p class="leave__text">
        你正在游玩存档 {{ slotLabel }}。可以选择保存后离开，或者直接返回——下一次进入时将回到主菜单。
      </p>

      <section class="tutorial">
        <div class="tutorial__head">
          <h3>快捷键教程</h3>
          <p>输入框聚焦时不会拦截按键；键盘导航只作用于最上层可导航面板</p>
        </div>

        <div class="tutorial__group" :class="{ 'tutorial__group--off': !settings.shortcuts }">
          <div class="tutorial__group-head">
            <strong>快捷操作</strong>
            <span
              class="tutorial__state"
              :class="{ 'tutorial__state--off': !settings.shortcuts }"
            >
              {{ settings.shortcuts ? '已开启' : '当前已关闭 · 以下按键不响应' }}
            </span>
          </div>
          <ul class="tutorial__list">
            <li v-for="item in SHORTCUT_GUIDE" :key="item.keys" class="tutorial__row">
              <kbd>{{ item.keys }}</kbd>
              <span class="tutorial__what">{{ item.what }}</span>
              <span class="tutorial__scene">{{ item.scene }}</span>
            </li>
          </ul>
        </div>

        <div class="tutorial__group" :class="{ 'tutorial__group--off': !settings.keyboardNav }">
          <div class="tutorial__group-head">
            <strong>键盘导航</strong>
            <span
              class="tutorial__state"
              :class="{ 'tutorial__state--off': !settings.keyboardNav }"
            >
              {{ settings.keyboardNav ? '已开启' : '当前已关闭 · 导航与高亮不响应' }}
            </span>
          </div>
          <ul class="tutorial__list">
            <li v-for="item in NAV_GUIDE" :key="item.keys" class="tutorial__row">
              <kbd>{{ item.keys }}</kbd>
              <span class="tutorial__what">{{ item.what }}</span>
              <span class="tutorial__scene">{{ item.scene }}</span>
            </li>
          </ul>
          <p class="tutorial__note">
            地图选择与地图内部用 ASDW 移动、ENTER 确认；背包 / 存档等弹窗打开时暂停，不会控制底层地图。两项可在「设置」中分别开关。
          </p>
        </div>
      </section>
      <template #footer>
        <div class="leave__actions">
          <span class="leave__hint">进度只在你点击保存时写入</span>
          <div class="leave__buttons">
            <button type="button" class="btn" @click="showLeave = false">继续游戏</button>
            <button type="button" class="btn" @click="leaveDirectly">直接返回</button>
            <button type="button" class="btn btn--primary" @click="saveAndLeave">
              保存并返回
            </button>
          </div>
        </div>
      </template>
    </ModalShell>

    <ModalShell
      v-if="tradeNotice.sales.length && !battle.active && !game.dead"
      title="自由贸易 · 售出通知"
      :sub="`第 ${tradeNotice.day} 天结算`"
      @close="dismissTradeNotice()"
    >
      <div class="trade-notice">
        <p class="trade-notice__lead">你在自由贸易托管的东西卖出去了。</p>
        <ul class="trade-notice__list">
          <li v-for="(sale, index) in tradeNotice.sales" :key="index">
            <span>{{ sale.name }}</span>
            <span>{{ sale.price }} 末日币</span>
          </li>
        </ul>
        <p class="trade-notice__total">
          合计 {{ tradeNotice.total }} 末日币，已记入自由贸易待领取收入。
        </p>
      </div>
      <template #footer>
        <span>前往乌托邦城 · 自由贸易领取</span>
        <button type="button" class="btn btn--primary" @click="dismissTradeNotice()">
          知道了
        </button>
      </template>
    </ModalShell>

    <DevConsole v-if="showDevConsole" @close="showDevConsole = false" />
  </main>
</template>

<style scoped>
.game {
  position: relative;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  background: #08090a;
}

.game__bg {
  position: fixed;
  inset: 0;
  background-size: cover;
  background-position: center 35%;
  filter: grayscale(0.55) brightness(0.42) blur(1px);
  transform: scale(1.04);
}

.game__veil {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at 50% 20%, rgba(10, 12, 13, 0.35), rgba(6, 7, 8, 0.94) 78%),
    linear-gradient(180deg, rgba(6, 7, 8, 0.86), rgba(6, 7, 8, 0.55) 45%, rgba(6, 7, 8, 0.94));
}

.frame {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding: 16px clamp(14px, 3.4vw, 44px) 18px;
}

/* ===== 角色 UI ===== */

.hud {
  padding: 16px 22px 18px;
}

.hud__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
}

.identity {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.identity__avatar {
  width: 72px;
  height: 72px;
  flex: none;
  object-fit: cover;
  border: 1px solid var(--line-strong);
  background: rgba(0, 0, 0, 0.4);
  filter: saturate(0.9) contrast(1.05);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

.identity__main {
  min-width: 0;
}

.identity__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 3px;
}

.identity__name {
  margin: 0;
  font-family: var(--font-title);
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--text);
}

.identity__rename {
  padding: 0;
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--text-mute);
  background: none;
  border: none;
  border-bottom: 1px dashed var(--line-strong);
  cursor: pointer;
  transition: color 0.2s;
}

.identity__rename:hover {
  color: var(--rust-soft);
}

.rename {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11.5px;
  color: var(--text-mute);
}

.rename__label {
  letter-spacing: 0.08em;
  color: var(--text-dim);
}

.rename input {
  width: 180px;
  height: 32px;
  padding: 0 9px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--line-strong);
  outline: none;
}

.rename input:focus {
  border-color: rgba(193, 74, 50, 0.6);
}

.rename__hint {
  font-size: 10px;
  color: var(--text-mute);
}

.identity__tag {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.12em;
  color: var(--text-mute);
  border: 1px solid var(--line);
  padding: 2px 7px;
}

.identity__meta {
  margin: 6px 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
}

.hud__right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: none;
}

.hud__signal {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-dim);
}

.hud__signal i {
  width: 5px;
  height: 5px;
  background: var(--sick);
  animation: pulse 2.4s ease-in-out infinite;
}

.hud__leave {
  height: 30px;
  padding: 0 12px;
  font-size: 11px;
}

.gauges {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 18px;
  padding-top: 16px;
}

.gauge__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.gauge__label {
  font-size: 11.5px;
  letter-spacing: 0.1em;
  color: var(--text-dim);
}

.gauge__value {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text);
}

.gauge__value em {
  font-style: normal;
  font-size: 9.5px;
  color: var(--text-mute);
}

.gauge__track {
  height: 3px;
  background: rgba(214, 208, 191, 0.12);
  overflow: hidden;
}

.gauge__fill {
  height: 100%;
  transition: width 0.45s ease;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.12);
}

.gauge--coin .gauge__value {
  font-weight: 600;
}

.gauge--doom .gauge__value {
  color: #d6b15b;
}

.gauge--dawn .gauge__value {
  color: #6fbfa5;
}

.gauge__track--coin {
  background: linear-gradient(90deg, rgba(214, 177, 91, 0.55), transparent);
}

.gauge--dawn .gauge__track--coin {
  background: linear-gradient(90deg, rgba(111, 191, 165, 0.55), transparent);
}

/* ===== 场景 ===== */

.scene {
  position: relative;
  flex: 1;
  min-height: 340px;
  border: 1px solid var(--line);
  overflow: hidden;
}

.scene__bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center 30%;
  filter: grayscale(0.8) brightness(0.46) contrast(1.05);
  transform: scale(1.02);
}

.scene__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(7, 8, 9, 0.9) 0%, rgba(7, 8, 9, 0.58) 48%, rgba(7, 8, 9, 0.22) 100%),
    linear-gradient(180deg, rgba(7, 8, 9, 0.3), rgba(7, 8, 9, 0.66));
}

.scene__content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
  padding: clamp(20px, 3vw, 34px);
}

.scene__title {
  margin: 8px 0 0;
  font-family: var(--font-title);
  font-size: clamp(24px, 2.6vw, 32px);
  font-weight: 600;
  letter-spacing: 0.12em;
  color: #e6ded0;
}

.scene__desc {
  max-width: 460px;
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.9;
  letter-spacing: 0.05em;
  color: var(--text-dim);
}

.scene__body {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  flex-wrap: wrap;
}

.log {
  min-width: 240px;
}

.log__title {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.24em;
  color: var(--text-mute);
}

.log__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.log__list li {
  display: flex;
  gap: 10px;
  font-size: 12px;
  line-height: 1.7;
  letter-spacing: 0.03em;
  color: var(--text-dim);
}

.log__list span {
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--rust);
  padding-top: 4px;
}

.scene__note {
  max-width: 300px;
  padding: 14px 16px;
  border-left: 1px solid var(--line-strong);
  background: rgba(9, 11, 12, 0.55);
}

.scene__note p {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.8;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

/* ===== 行动按钮 ===== */

.actions {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.action {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  text-align: left;
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(20, 23, 24, 0.75), rgba(12, 14, 15, 0.75));
  backdrop-filter: blur(8px);
  transition:
    border-color 0.25s,
    background 0.25s,
    transform 0.25s;
}

.action:hover {
  border-color: rgba(193, 74, 50, 0.55);
  background: linear-gradient(180deg, rgba(40, 28, 25, 0.8), rgba(14, 15, 16, 0.8));
  transform: translateY(-2px);
}

.action:active {
  transform: translateY(0);
}

.action__no {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-mute);
}

.action__main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.action__label {
  font-family: var(--font-title);
  font-size: 17px;
  letter-spacing: 0.14em;
  color: var(--text);
}

.action__desc {
  font-size: 11px;
  letter-spacing: 0.03em;
  color: var(--text-mute);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action__arrow {
  font-size: 14px;
  color: var(--text-mute);
  transition: 0.25s;
}

.action:hover .action__arrow {
  color: var(--rust-soft);
  transform: translateX(3px);
}

/* 离开提示 */

.leave__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  letter-spacing: 0.04em;
  color: var(--text-dim);
}

.leave__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  width: 100%;
  flex-wrap: wrap;
}

.leave__hint {
  font-size: 11px;
  color: var(--text-mute);
  letter-spacing: 0.05em;
}

.leave__buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}

/* 快捷键教程：放在可滚动内容区，底部按钮区保持固定可点 */

.tutorial {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid var(--line);
  background: rgba(6, 7, 8, 0.88);
}

.tutorial__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.tutorial__head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: var(--text);
}

.tutorial__head p {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.tutorial__group + .tutorial__group {
  margin-top: 16px;
}

.tutorial__group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.tutorial__group-head strong {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.16em;
  color: var(--bone);
}

.tutorial__state {
  padding: 2px 8px;
  border: 1px solid var(--line-strong);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--text-dim);
}

.tutorial__state--off {
  border-color: rgba(193, 74, 50, 0.55);
  color: var(--rust-soft);
}

.tutorial__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tutorial__row {
  display: grid;
  grid-template-columns: 76px minmax(0, 0.9fr) minmax(0, 1.4fr);
  align-items: baseline;
  gap: 10px;
  padding: 7px 9px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.52);
  transition: opacity 0.2s;
}

.tutorial__row kbd {
  justify-self: start;
  padding: 1px 6px;
  border: 1px solid var(--line-strong);
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: var(--bone);
}

.tutorial__what {
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--text);
}

.tutorial__scene {
  font-size: 10.5px;
  line-height: 1.65;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.tutorial__group--off .tutorial__row {
  opacity: 0.42;
}

.tutorial__note {
  margin: 10px 0 0;
  font-size: 10.5px;
  line-height: 1.75;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

/* 自由贸易结算 */

.trade-notice {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trade-notice__lead {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
  letter-spacing: 0.04em;
  color: var(--text-dim);
}

.trade-notice__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
  border: 1px solid var(--line);
  background: var(--line);
}

.trade-notice__list li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  background: #0d0f10;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.03em;
  color: var(--bone);
}

.trade-notice__total {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.03em;
  color: var(--rust-soft);
}

/* 死亡 */

.death {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(4, 5, 6, 0.9);
  backdrop-filter: blur(8px);
}

.death__card {
  width: min(520px, 100%);
  padding: 34px 36px;
  border: 1px solid rgba(193, 74, 50, 0.5);
  background: linear-gradient(180deg, rgba(22, 14, 13, 0.98), rgba(10, 8, 8, 0.98));
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7);
}

.death__title {
  margin: 10px 0 0;
  font-family: var(--font-title);
  font-size: 34px;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: var(--rust-soft);
}

.death__reason {
  margin: 14px 0 24px;
  font-size: 12.5px;
  line-height: 1.9;
  letter-spacing: 0.04em;
  color: var(--text-dim);
  white-space: pre-line;
}

/* 非死亡结局 */

.finale {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(4, 5, 6, 0.92);
  backdrop-filter: blur(8px);
}

.finale__card {
  width: min(600px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  padding: 36px 38px 30px;
  border: 1px solid rgba(214, 208, 191, 0.32);
  background: linear-gradient(180deg, rgba(20, 19, 17, 0.98), rgba(10, 9, 8, 0.98));
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7);
}

.finale__title {
  margin: 10px 0 0;
  font-family: var(--font-title);
  font-size: 34px;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: var(--bone);
}

.finale__text {
  margin: 16px 0 26px;
  font-size: 12.5px;
  line-height: 2;
  letter-spacing: 0.04em;
  color: var(--text-dim);
  white-space: pre-line;
}

.finale__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

@media (max-width: 1080px) {
  .gauges {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px 18px;
  }

  .actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .hud__signal {
    display: none;
  }

  .actions {
    grid-template-columns: 1fr;
  }

  .scene__note {
    display: none;
  }
}

@media (max-width: 560px) {
  .gauges {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hud {
    padding: 14px 14px 16px;
  }

  .identity__name {
    font-size: 18px;
  }

  .identity__avatar {
    width: 56px;
    height: 56px;
  }

  .hud__leave {
    font-size: 10px;
    padding: 0 9px;
  }

  .tutorial__row {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 6px 10px;
  }

  .tutorial__scene {
    grid-column: 2;
  }
}
</style>
