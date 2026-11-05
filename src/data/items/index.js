// 物品统一出口：按类型拆分到独立文件，新增物品只需改对应的一个文件
import { MELEE_ITEMS, MELEE_TIERS, MELEE_TIER_COLORS } from './melee'
import { RANGED_ITEMS, RANGED_TIERS } from './ranged'
import { FOOD_ITEMS } from './food'
import { DRINK_ITEMS } from './drink'
import { MEDICINE_ITEMS } from './medicine'
import { BADGE_ITEMS } from './badge'
import { GUILD_ITEMS } from './guild'
import { GEM_ITEMS } from './gem'
import { QUEST_ITEMS } from './quest'

export { MELEE_TIERS, MELEE_TIER_COLORS, RANGED_TIERS }
export { MAGIC_GEM_STACK } from './gem'

/** 全部物品总表 */
export const ITEMS = {
  ...MELEE_ITEMS,
  ...RANGED_ITEMS,
  ...FOOD_ITEMS,
  ...DRINK_ITEMS,
  ...MEDICINE_ITEMS,
  ...BADGE_ITEMS,
  ...GUILD_ITEMS,
  ...GEM_ITEMS,
  ...QUEST_ITEMS,
}

export const CATEGORY_LABELS = {
  melee: '近战武器',
  ranged: '远程武器',
  food: '食物',
  drink: '饮品',
  medicine: '药品',
  identity: '身份牌',
  guild: '公会徽章',
  gem: '宝石',
  memento: '纪念徽章',
  quest: '任务物品',
}

export function getItem(id) {
  return ITEMS[id] ?? null
}

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] ?? '其他'
}
