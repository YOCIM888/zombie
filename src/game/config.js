// 游戏静态配置：属性、地图、成就

import { FIELD_MAPS } from '../data/field'
import { AIRSHIP_MAP } from '../data/airship'

export const BACKGROUND_IMAGE = '/image/背景图/背景.webp'

export const SAVE_SLOT_COUNT = 3

export const DEFAULT_CHARACTER_NAME = '无名幸存者'

/** danger = true 表示数值越高越危险 */
export const STAT_DEFS = [
  { key: 'hp', label: '生命值', color: '#c8473a', danger: false },
  { key: 'hunger', label: '饱食度', color: '#c9923f', danger: false },
  { key: 'thirst', label: '口渴值', color: '#4b87b8', danger: false },
  { key: 'sanity', label: '理智值', color: '#8b74b8', danger: false },
  { key: 'stamina', label: '体力值', color: '#4b9c8a', danger: false },
  { key: 'infection', label: '感染值', color: '#7c9840', danger: true },
]

export const STAT_MAX = 100

export const DEFAULT_STATS = {
  hp: 100,
  hunger: 100,
  thirst: 100,
  sanity: 100,
  infection: 0,
  stamina: 100,
}

/**
 * 属性触发的死亡/异变结局
 * at = 0 表示降到 0 触发；at = 100 表示涨满触发
 * 按顺序判定，先满足的结局生效
 */
export const STAT_ENDINGS = [
  {
    key: 'hunger',
    at: 0,
    ending: '饥荒',
    reason: '饱食度归零。你翻遍了最后一条街，只找到几块不能吃的东西，最后倒在了墙根。',
  },
  {
    key: 'thirst',
    at: 0,
    ending: '缺水',
    reason: '口渴值归零。喉咙干裂得说不出话，你开始看见不存在的河流。',
  },
  {
    key: 'sanity',
    at: 0,
    ending: '自缢',
    reason: '理智值归零。那天夜里，你用一根旧绳子把自己挂在了公寓的横梁上。',
  },
  {
    key: 'stamina',
    at: 0,
    ending: '过劳',
    reason: '体力值归零。你只是坐下歇一会儿，然后再也没有站起来。',
  },
  {
    key: 'infection',
    at: 100,
    ending: '尸变',
    reason: '感染值满 100。你能听见自己的心跳慢下来，然后彻底停止。',
  },
  {
    key: 'hp',
    at: 0,
    ending: '伤重不治',
    reason: '生命值归零。伤口没能在天亮前止住，你失血过多。',
  },
]

/** 地图难度：risk 1-5 对应这五档 */
export const DIFFICULTY_LEVELS = [
  '相对安全',
  '低度威胁',
  '中度威胁',
  '高度威胁',
  '绝对禁区',
]

export const MAPS = [
  {
    id: 'ruined-city',
    name: '末日都城',
    difficulty: DIFFICULTY_LEVELS[0],
    level: 'LV. 01',
    desc: '断壁、烟尘，以及无穷无尽的脚步声。物资丰厚，也埋着无数具尸体。',
    note: '可进入 · 探索、深处、银行、身份办理、劳动、集市',
    risk: 1,
    open: true,
  },
  {
    id: 'dawn-post',
    name: '曙光阵地',
    difficulty: DIFFICULTY_LEVELS[1],
    level: 'LV. 02',
    desc: '残存的秩序与灯火。哨塔的探照灯扫过废墟，也扫过每一个靠近的人。',
    note: '可进入 · 清理丧尸、领取救济、联系管事、曙光市场',
    risk: 2,
    open: true,
  },
  ...FIELD_MAPS,
  AIRSHIP_MAP,
]

export const ACHIEVEMENTS = [
  { id: 'awake', name: '第零天', desc: '在废墟中睁开眼睛，开始一段新的生存。' },
  { id: 'first-night', name: '长夜', desc: '熬过第一个夜晚，等来灰白的天光。' },
  { id: 'scavenger', name: '拾荒者', desc: '累计从废墟中带回 10 件物资。' },
  { id: 'dawn-seen', name: '望见曙光', desc: '抵达曙光阵地，看见人类的灯火。' },
  { id: 'codex-10', name: '博闻强识', desc: '在玩家工具中翻阅完整图鉴。' },
  { id: 'survivor-7', name: '第七日', desc: '在末日里存活整整七天。' },
  { id: 'survivor-30', name: '月影', desc: '在末日里存活整整三十天。' },
  { id: 'first-blood', name: '初见血', desc: '第一次亲手杀死一只丧尸。' },
  { id: 'hunter', name: '猎手', desc: '累计击杀 10 只丧尸。' },
  { id: 'butcher', name: '清道夫', desc: '累计击杀 50 只丧尸。' },
  { id: 'dawn-sworn', name: '曙光之誓', desc: '正式加入曙光阵地。' },
  { id: 'dawn-officer', name: '曙光队长', desc: '在曙光阵地晋升到队长。' },
  { id: 'savings', name: '小有积蓄', desc: '手头攒下 50 枚末日币。' },
  { id: 'dawn-savings', name: '曙光富翁', desc: '手头攒下 100 枚曙光币。' },
  { id: 'mermaid', name: '海之歌', desc: '走完人鱼公主的四段治疗，收下三叉戟。' },
  { id: 'yanran', name: '半感染者', desc: '在期限之前救下半感染者嫣然。' },
  { id: 'lulu', name: '罐头朋友', desc: '用罐头换回饥饿丧尸露露。' },
  { id: 'barbecue', name: '奇怪的晚餐', desc: '在露营山区吃下那顿奇怪的烧烤。' },
  { id: 'doctor', name: '博士的委托', desc: '用抗感染针换下陈博士的 M700。' },
  { id: 'garage', name: '远走高飞', desc: '和嫣然一起从地下车库离开。' },
  { id: 'rocket', name: '升空', desc: '修好火箭并达成任意一个发射结局。' },
  { id: 'loan-paid', name: '两清', desc: '还清在都城银行借下的贷款。' },
  { id: 'survivor-60', name: '长冬', desc: '在末日里存活整整六十天。' },
  { id: 'slayer-100', name: '尸潮', desc: '累计击杀 100 只丧尸。' },
  { id: 'field-explorer', name: '走出安全屋', desc: '第一次进入野外地图探索。' },
  { id: 'field-veteran', name: '踏遍废墟', desc: '探索过 5 张不同的野外地图。' },
  { id: 'fully-armed', name: '全副武装', desc: '同时装备近战与远程武器。' },
  { id: 'legendary', name: '传说在手', desc: '拥有一件传说或神话品质的武器。' },
  { id: 'city-knight', name: '封骑士', desc: '在末日都城获得骑士或更高身份。' },
  { id: 'city-heir', name: '王座之前', desc: '在末日都城获得储君身份。' },
  { id: 'dawn-command', name: '曙光指挥', desc: '在曙光阵地晋升到指挥。' },
  { id: 'dawn-deputy', name: '曙光副首', desc: '在曙光阵地晋升到副首。' },
  { id: 'coin-tycoon', name: '富甲一方', desc: '手头攒下 200 枚末日币。' },
  { id: 'dawn-wealth', name: '曙光之富', desc: '手头攒下 300 枚曙光币。' },
  { id: 'ma-san', name: '掀了烧烤摊', desc: '拒绝冷面阿三的邀请，并把他打倒。' },
  { id: 'no-cheat', name: '我没开挂', desc: '在生死角斗中击败游戏开发者。' },
  { id: 'coup-victory', name: '臣服于我', desc: '在高台政变中让所有贵族低头。' },
  { id: 'death-list', name: '死亡名单', desc: '接过马斐的第十二份委托，成为他名单上的最后一行。' },
  { id: 'seed-life', name: '生机', desc: '把腐烂种子种成一片果苗。' },
  { id: 'doctor-badges', name: '三枚徽章', desc: '集齐陈博士的三枚发射徽章。' },
  { id: 'rocket-crew', name: '一个都不少', desc: '带着嫣然和露露一起升空。' },
  { id: 'rocket-solo', name: '独行者', desc: '独自飞离这片废墟。' },
  { id: 'rocket-send', name: '送别', desc: '让他们上火箭，自己留在废墟。' },
  { id: 'playtime-1h', name: '一小时', desc: '累计游玩 1 小时。' },
  { id: 'playtime-10h', name: '长夜未央', desc: '累计游玩 10 小时。' },
]

export const INVENTORY_CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'melee', name: '近战武器' },
  { id: 'ranged', name: '远程武器' },
  { id: 'food', name: '食物' },
  { id: 'drink', name: '饮品' },
  { id: 'medicine', name: '药品' },
  { id: 'identity', name: '身份牌' },
  { id: 'memento', name: '纪念徽章' },
  { id: 'quest', name: '任务物品' },
]
