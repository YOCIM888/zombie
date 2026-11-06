// 地图背景图：按地图 id 对应 public/image/背景图 下的同名中文文件
export const DEFAULT_MAP_BACKGROUND = '/image/背景图/背景.webp'

export const MAP_BACKGROUNDS = {
  'ruined-city': '/image/背景图/末日都城.webp',
  'dawn-post': '/image/背景图/曙光阵地.webp',
  'utopia-city': '/image/背景图/乌托邦城.webp',
  'doomsday-airship': '/image/背景图/末日飞行船.webp',
  'abandoned-village': '/image/背景图/废弃村庄.webp',
  'mountain-camp': '/image/背景图/露营山区.webp',
  'suburb-market': '/image/背景图/郊区卖场.webp',
  'core-district': '/image/背景图/核心商圈.webp',
  'public-hospital': '/image/背景图/公立医院.webp',
  'abandoned-police': '/image/背景图/荒废警局.webp',
  'mountain-barracks': '/image/背景图/山地军营.webp',
  'x-lab': '/image/背景图/X研究所.webp',
  'spaceport': '/image/背景图/航天基地.webp',
  'long-beach-harbor': '/image/背景图/长滩海港.webp',
  'biochemical-nest': '/image/背景图/生化巢穴.webp',
}

/** 没有专属背景的地图统一使用通用背景，避免卡片空白或破图 */
export function mapBackground(id) {
  return MAP_BACKGROUNDS[id] ?? DEFAULT_MAP_BACKGROUND
}

// 休息选项背景图：按选项 id 对应同名中文文件
export const REST_BACKGROUNDS = {
  nap: '/image/背景图/小憩.webp',
  sleep: '/image/背景图/睡觉.webp',
  tea: '/image/背景图/精灵茶会.webp',
  bed: '/image/背景图/大精灵床.webp',
}

/** 四个休息选项均有素材；返回空值时卡片保持原面板样式 */
export function restBackground(id) {
  return REST_BACKGROUNDS[id] ?? ''
}

// 独立界面背景图：按界面 id 对应同名中文文件，缺图时回落到通用背景
export const PANEL_BACKGROUNDS = {
  inventory: '/image/背景图/打开背包.webp',
  save: '/image/背景图/查看存档.webp',
  companion: '/image/背景图/伙伴收获.webp',
  notebook: '/image/背景图/备忘录.webp',
}

export function panelBackground(id) {
  return PANEL_BACKGROUNDS[id] ?? DEFAULT_MAP_BACKGROUND
}
