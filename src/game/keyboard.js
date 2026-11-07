/**
 * 桌面快捷键基础设施：
 * - 设备能力判定（悬停 + 精确指针）与输入场景判定
 * - 组件级快捷键上下文栈：越晚挂载越靠上，战斗背包/地图背包优先于地图本体
 */
import { onBeforeUnmount, onMounted } from 'vue'

/** 只有带悬停能力与精确指针的桌面设备才响应快捷键（触屏 / 移动端不成立） */
export function isDesktopKeyboard() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

/** 输入场景：表单控件或可编辑区域内 */
export function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** 地图面板自身占 1 个弹窗；超过 1 个说明上面还压着确认弹窗 */
export function hasStackedModal() {
  return document.querySelectorAll('.modal-mask').length > 1
}

const layers = []

/** 组件挂载期间注册快捷键上下文；卸载时自动移除 */
export function useShortcutLayer(layer) {
  onMounted(() => {
    layers.push(layer)
  })
  onBeforeUnmount(() => {
    const index = layers.indexOf(layer)
    if (index !== -1) layers.splice(index, 1)
  })
}

/** 从最上层向下派发，返回 true 表示本次按键已被消费 */
export function dispatchShortcut(action) {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const handler = layers[index]?.[action]
    if (typeof handler === 'function' && handler() === true) return true
  }
  return false
}
