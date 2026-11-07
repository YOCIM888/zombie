/**
 * 桌面纯键盘导航：ASDW 移动选中项，ENTER 等同于点击。
 *
 * 只作用于最高层弹窗，且该弹窗的 .modal-body 必须带 data-nav-scope：
 * 背包 / 存档 / 确认框等叠在上面的面板没有作用域，按键会被吞掉而不是继续控制底层地图。
 * 选项按 DOM 顺序收集，再按屏幕坐标归行，保证网格布局的左右移动不会跳行。
 */
import { nextTick } from 'vue'

const NAV_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Enter', 'NumpadEnter'])
/** 同一行允许的最大纵向偏差（像素） */
const ROW_TOLERANCE = 8

let activeItem = null

export function isNavKey(code) {
  return NAV_KEYS.has(code)
}

function topMask() {
  const masks = document.querySelectorAll('.modal-mask')
  return masks.length ? masks[masks.length - 1] : null
}

function navScopeOf(mask) {
  return mask?.querySelector('.modal-body[data-nav-scope]') ?? null
}

/** 跳过的区域：弹窗头尾、返回链接、以及显式标记不参与导航的元素 */
function isSkipped(el) {
  if (el.closest('.modal-head, .modal-foot, .modal-hud')) return true
  if (el.closest('[data-nav-skip]')) return true
  if (el.classList.contains('link')) return true
  const text = el.textContent?.trim() ?? ''
  return text.startsWith('←')
}

function itemAction(el) {
  if (el.matches('button, a[href], [role="button"]')) return el
  return el.querySelector('button, a[href], [role="button"]')
}

/** 禁用项直接跳过：带禁用按钮的卡片（如未解锁地图）不会获得键盘焦点 */
function isDisabled(el) {
  const action = itemAction(el)
  if (!action) return true
  return action.disabled === true || action.getAttribute('aria-disabled') === 'true'
}

function isVisible(el) {
  if (!el.getClientRects().length) return false
  return getComputedStyle(el).visibility !== 'hidden'
}

function collect(scope) {
  const marked = [...scope.querySelectorAll('[data-nav-item]')]
  const raw = marked.length
    ? marked
    : [...scope.querySelectorAll('button, a[href], [role="button"]')]
  return raw.filter((el) => isVisible(el) && !isDisabled(el) && !isSkipped(el))
}

/** 按 getBoundingClientRect 归行：先按纵坐标分行，行内按横坐标排序 */
function buildRows(items) {
  const list = items.map((el) => {
    const rect = el.getBoundingClientRect()
    return { el, top: rect.top, left: rect.left, centerX: rect.left + rect.width / 2 }
  })
  list.sort((a, b) => a.top - b.top || a.left - b.left)
  const rows = []
  for (const item of list) {
    const last = rows[rows.length - 1]
    if (last && Math.abs(item.top - last.top) <= ROW_TOLERANCE) {
      last.items.push(item)
    } else {
      rows.push({ top: item.top, items: [item] })
    }
  }
  for (const row of rows) row.items.sort((a, b) => a.left - b.left || a.top - b.top)
  return rows
}

function setActive(el) {
  if (activeItem && activeItem !== el) activeItem.classList.remove('is-nav-focus')
  activeItem = el
  if (!el) return
  el.classList.add('is-nav-focus')
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

export function clearNavFocus() {
  if (activeItem) activeItem.classList.remove('is-nav-focus')
  activeItem = null
}

/** 打开地图 / 切换子页面后，把焦点放到第一个可用项；同一页面内保持原选中项 */
export function ensureNavFocus() {
  const scope = navScopeOf(topMask())
  if (!scope) return
  const items = collect(scope)
  if (!items.length) {
    if (activeItem && !activeItem.isConnected) clearNavFocus()
    return
  }
  if (activeItem && items.includes(activeItem)) return
  setActive(items[0])
}

function move(items, code) {
  if (!activeItem || !items.includes(activeItem)) {
    setActive(items[0])
    return
  }
  const rows = buildRows(items)
  const rowIndex = rows.findIndex((row) => row.items.some((item) => item.el === activeItem))
  if (rowIndex === -1) {
    setActive(items[0])
    return
  }
  const row = rows[rowIndex]
  const column = row.items.findIndex((item) => item.el === activeItem)
  if (code === 'KeyA' || code === 'KeyD') {
    const nextColumn = code === 'KeyD' ? column + 1 : column - 1
    // 左右到边界停在本行边缘，不跳到另一行
    if (nextColumn < 0 || nextColumn >= row.items.length) return
    setActive(row.items[nextColumn].el)
    return
  }
  const nextRow = code === 'KeyS' ? rows[rowIndex + 1] : rows[rowIndex - 1]
  if (!nextRow) return
  // 上下取目标行里横向距离最近的项；目标行缺列时自然夹到边缘
  const currentX = row.items[column].centerX
  let best = nextRow.items[0]
  for (const item of nextRow.items) {
    if (Math.abs(item.centerX - currentX) < Math.abs(best.centerX - currentX)) best = item
  }
  setActive(best.el)
}

function activate(el) {
  const action = itemAction(el)
  if (!action || action.disabled) return
  action.click()
  // 子页面切换后重新落焦；若当前项仍在（同页操作）则保留选中
  nextTick(() => ensureNavFocus())
}

/**
 * 返回 true 表示按键已被消费：
 * - 没有弹窗 → 不消费；
 * - 顶层弹窗不可导航 → 消费但不动，避免误控底层地图。
 */
export function handleNavKey(code) {
  if (!isNavKey(code)) return false
  const mask = topMask()
  if (!mask) return false
  const scope = navScopeOf(mask)
  if (!scope) return true
  const items = collect(scope)
  if (!items.length) return true
  if (code === 'Enter' || code === 'NumpadEnter') {
    if (!activeItem || !items.includes(activeItem)) setActive(items[0])
    activate(activeItem)
    return true
  }
  move(items, code)
  return true
}
