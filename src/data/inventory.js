// 背包规则与初始物资
import { getItem } from './items'
import { CLEANLINESS_MAX } from './weapons'

export const BACKPACK_SIZE = 20
export const BACKPACK_MAX_SIZE = 200
export const STACK_LIMIT = 999

/** 生成空的背包格子 */
export function createEmptyBackpack(size = BACKPACK_SIZE) {
  return Array.from({ length: size }, () => null)
}

/**
 * 放入物品：可堆叠物品优先补满已有堆，再占用空格；不可堆叠的物品一格一件
 * @returns 没放进去的剩余数量
 */
export function addItem(inventory, itemId, qty = 1) {
  const def = getItem(itemId)
  if (!def) return qty

  let remaining = qty
  const stackMax = Math.min(def.maxStack ?? STACK_LIMIT, STACK_LIMIT)

  if (def.stackable) {
    for (let i = 0; i < inventory.length && remaining > 0; i += 1) {
      const entry = inventory[i]
      if (!entry || entry.id !== itemId) continue
      const space = stackMax - entry.qty
      if (space <= 0) continue
      const moved = Math.min(space, remaining)
      entry.qty += moved
      remaining -= moved
    }
  }

  for (let i = 0; i < inventory.length && remaining > 0; i += 1) {
    if (inventory[i]) continue
    if (def.stackable) {
      const moved = Math.min(stackMax, remaining)
      inventory[i] = { id: itemId, qty: moved }
      remaining -= moved
    } else if (def.category === 'ranged') {
      inventory[i] = { id: itemId, qty: 1, cleanliness: CLEANLINESS_MAX }
      remaining -= 1
    } else {
      inventory[i] = { id: itemId, qty: 1, durability: def.weapon?.durability ?? null }
      remaining -= 1
    }
  }

  return remaining
}

/** 初始背包：菜刀 ×1、矿泉水 ×2、压缩饼干 ×1 */
export const INITIAL_ITEMS = [
  { id: 'kitchen-knife', qty: 1 },
  { id: 'mineral-water', qty: 2 },
  { id: 'compressed-biscuit', qty: 1 },
]

export function createInitialBackpack() {
  const inventory = createEmptyBackpack()
  for (const item of INITIAL_ITEMS) {
    addItem(inventory, item.id, item.qty)
  }
  return inventory
}

export function countUsedSlots(inventory) {
  return inventory.filter(Boolean).length
}

export function findEmptySlot(inventory) {
  return inventory.findIndex((entry) => !entry)
}

/** 统计背包内某件物品的总数量（跨堆叠） */
export function countItem(inventory, itemId) {
  let total = 0
  for (const entry of inventory) {
    if (entry && entry.id === itemId) total += entry.qty ?? 1
  }
  return total
}

/** 从背包扣除指定数量，返回没扣完的剩余数量 */
export function removeItem(inventory, itemId, qty = 1) {
  let remaining = qty
  for (let index = 0; index < inventory.length && remaining > 0; index += 1) {
    const entry = inventory[index]
    if (!entry || entry.id !== itemId) continue
    const have = entry.qty ?? 1
    const moved = Math.min(have, remaining)
    remaining -= moved
    if (moved >= have) {
      inventory[index] = null
    } else {
      entry.qty = have - moved
    }
  }
  return remaining
}

/** 判断背包能否放下这批物品（只读，不改动原背包） */
export function canStoreItems(inventory, items) {
  const copy = inventory.map((entry) => (entry ? { ...entry } : null))
  return items.every((item) => addItem(copy, item.id, item.qty ?? 1) === 0)
}
