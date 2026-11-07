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

/** 初始背包：开发者宝石 ×1、矿泉水 ×6、压缩饼干 ×6 */
export const INITIAL_ITEMS = [
  { id: 'developer-gem', qty: 1 },
  { id: 'compressed-biscuit', qty: 6 },
  { id: 'mineral-water', qty: 6 },
]

export function createInitialBackpack() {
  const inventory = createEmptyBackpack()
  for (const item of INITIAL_ITEMS) {
    addItem(inventory, item.id, item.qty)
  }
  return inventory
}

/**
 * 整理分组（从左到右共 12 组）：
 * 开发者宝石 → 其他宝石 → 近战 → 远程 → 药品 → 食物 → 饮品 → 身份 → 公会 → 纪念 → 任务 → 其他
 * developer-gem 是伪分组：仍属于 gem，但固定排在最前
 */
export const INVENTORY_SORT_GROUPS = [
  'developer-gem',
  'gem',
  'melee',
  'ranged',
  'medicine',
  'food',
  'drink',
  'identity',
  'guild',
  'memento',
  'quest',
]

export const ITEM_TIER_ORDER = ['普通', '稀有', '精良', '史诗', '传说', '神话', '限定']

/** 总数值：物品所有 effects 数值的代数和（负值效果直接抵扣），无 effects 视为 0 */
export function itemEffectTotal(def) {
  const effects = def?.effects
  if (!effects) return 0
  let total = 0
  for (const value of Object.values(effects)) {
    const num = Number(value)
    if (Number.isFinite(num)) total += num
  }
  return total
}

/** 分组序号：未知类别（包括查不到的物品）统一落到「其他」 */
function groupRank(entry, def) {
  if (entry?.id === 'developer-gem') return 0
  const index = INVENTORY_SORT_GROUPS.indexOf(def?.category)
  return index === -1 ? INVENTORY_SORT_GROUPS.length : index
}

/**
 * 原地整理背包（纯排序，不合并、不拆分、不改变任何堆叠数量）：
 * 1. 按 12 组顺序排列；
 * 2. 近战/远程按品质降序；
 * 3. 药品/食物/饮品按总数值降序；
 * 4. 并列时按名称 → id → 原顺序，保证多次整理结果完全一致；
 * 5. 全部前移，空位补 null，数组长度不变。
 * @returns 整理后的已用格数
 */
export function organizeInventory(inventory) {
  const entries = inventory
    .filter(Boolean)
    .map((entry, order) => ({ entry, order, def: getItem(entry.id) }))

  entries.sort((a, b) => {
    const byGroup = groupRank(a.entry, a.def) - groupRank(b.entry, b.def)
    if (byGroup !== 0) return byGroup

    const category = a.def?.category
    if (category === 'melee' || category === 'ranged') {
      const tierA = ITEM_TIER_ORDER.indexOf(a.def?.tier ?? '')
      const tierB = ITEM_TIER_ORDER.indexOf(b.def?.tier ?? '')
      const byTier = tierB - tierA
      if (byTier !== 0) return byTier
    } else if (category === 'medicine' || category === 'food' || category === 'drink') {
      const byTotal = itemEffectTotal(b.def) - itemEffectTotal(a.def)
      if (byTotal !== 0) return byTotal
    }

    const nameA = a.def?.name ?? a.entry.id
    const nameB = b.def?.name ?? b.entry.id
    const byName = nameA.localeCompare(nameB, 'zh-Hans-CN')
    if (byName !== 0) return byName

    const byId = a.entry.id.localeCompare(b.entry.id)
    if (byId !== 0) return byId

    // 同一物品的多个堆按原有相对顺序排列，连续整理不会来回跳动
    return a.order - b.order
  })

  inventory.fill(null)
  entries.forEach(({ entry }, index) => {
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
