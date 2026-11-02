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

/** 初始背包：矿泉水 ×5、压缩饼干 ×5 */
export const INITIAL_ITEMS = [
  { id: 'mineral-water', qty: 5 },
  { id: 'compressed-biscuit', qty: 5 },
]

export function createInitialBackpack() {
  const inventory = createEmptyBackpack()
  for (const item of INITIAL_ITEMS) {
    addItem(inventory, item.id, item.qty)
  }
  return inventory
}

/** 整理时的类别顺序：与背包页签顺序不同，武器优先 */
export const INVENTORY_SORT_CATEGORIES = [
  'ranged',
  'melee',
  'medicine',
  'food',
  'drink',
  'identity',
  'memento',
  'quest',
]

export const ITEM_TIER_ORDER = ['普通', '稀有', '精良', '史诗', '传说', '神话']

/**
 * 原地整理背包：
 * 1. 合并可堆叠物品，按 maxStack 拆堆；
 * 2. 按类别顺序排序；
 * 3. 同类别按品质降序，再按名称升序；
 * 4. 全部前移，空位补 null，数组长度不变。
 * @returns 整理后的已用格数
 */
export function organizeInventory(inventory) {
  const merged = []
  const stackHeads = new Map()

  for (const entry of inventory) {
    if (!entry) continue
    const def = getItem(entry.id)
    if (!def?.stackable) {
      merged.push({ ...entry })
      continue
    }

    const stackMax = Math.min(def.maxStack ?? STACK_LIMIT, STACK_LIMIT)
    let remaining = entry.qty ?? 1
    const head = stackHeads.get(entry.id)

    if (head) {
      const space = stackMax - head.qty
      if (space > 0) {
        const moved = Math.min(space, remaining)
        head.qty += moved
        remaining -= moved
      }
    }

    while (remaining > 0) {
      const stack = { id: entry.id, qty: Math.min(stackMax, remaining) }
      remaining -= stack.qty
      merged.push(stack)
      if (!stackHeads.has(entry.id)) stackHeads.set(entry.id, stack)
    }
  }

  const categoryRank = (def) => {
    const index = INVENTORY_SORT_CATEGORIES.indexOf(def?.category)
    return index === -1 ? INVENTORY_SORT_CATEGORIES.length : index
  }
  const tierRank = (def) => ITEM_TIER_ORDER.indexOf(def?.tier ?? '')

  merged.sort((a, b) => {
    const defA = getItem(a.id)
    const defB = getItem(b.id)
    const byCategory = categoryRank(defA) - categoryRank(defB)
    if (byCategory !== 0) return byCategory

    const byTier = tierRank(defB) - tierRank(defA)
    if (byTier !== 0) return byTier

    const nameA = defA?.name ?? a.id
    const nameB = defB?.name ?? b.id
    return nameA.localeCompare(nameB, 'zh-Hans-CN')
  })

  inventory.fill(null)
  merged.forEach((entry, index) => {
    if (index < inventory.length) inventory[index] = entry
  })

  return countUsedSlots(inventory)
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
