// 游戏静态配置：属性、地图、成就

import { FIELD_MAPS } from '../data/field'
import { AIRSHIP_MAP } from '../data/airship'

export const BACKGROUND_IMAGE = '/image/背景图/背景.webp'

export const SAVE_SLOT_COUNT = 10

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

/** 特殊地图：第 15 天后开放 */
export const UTOPIA_MAP = {
  id: 'utopia-city',
  name: '乌托邦城',
  difficulty: DIFFICULTY_LEVELS[0],
  level: '特殊',
  desc: '高墙、净水与长明的电灯。这里看起来不像末日，但城门只为被选中的人打开。',
  note: '第 15 天后开放 · 公会与自由贸易区',
  risk: 1,
  open: true,
  unlockDay: 15,
  special: true,
}

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
  UTOPIA_MAP,
  AIRSHIP_MAP,
]

export const ACHIEVEMENTS = [
  { id: 'awake', category: 'story', name: '第零天', desc: '在废墟中睁开眼睛，开始一段新的生存。' },
  { id: 'first-night', category: 'survival', name: '长夜', desc: '熬过第一个夜晚，等来灰白的天光。' },
  { id: 'scavenger', category: 'survival', name: '拾荒者', desc: '累计从废墟中带回 10 件物资。' },
  { id: 'dawn-seen', category: 'story', name: '望见曙光', desc: '抵达曙光阵地，看见人类的灯火。' },
  { id: 'codex-10', category: 'misc', name: '博闻强识', desc: '在玩家工具中翻阅完整图鉴。' },
  { id: 'survivor-7', category: 'survival', name: '第七日', desc: '在末日里存活整整七天。' },
  { id: 'survivor-30', category: 'survival', name: '月影', desc: '在末日里存活整整三十天。' },
  { id: 'first-blood', category: 'combat', name: '初见血', desc: '第一次亲手杀死一只丧尸。' },
  { id: 'hunter', category: 'combat', name: '猎手', desc: '累计击杀 10 只丧尸。' },
  { id: 'butcher', category: 'combat', name: '清道夫', desc: '累计击杀 50 只丧尸。' },
  { id: 'dawn-sworn', category: 'story', name: '曙光之誓', desc: '正式加入曙光阵地。' },
  { id: 'dawn-officer', category: 'story', name: '曙光队长', desc: '在曙光阵地晋升到队长。' },
  { id: 'savings', category: 'economy', name: '小有积蓄', desc: '手头攒下 50 枚末日币。' },
  { id: 'dawn-savings', category: 'economy', name: '曙光富翁', desc: '手头攒下 100 枚曙光币。' },
  { id: 'mermaid', category: 'story', name: '海之歌', desc: '走完人鱼公主的四段治疗，收下三叉戟。' },
  { id: 'yanran', category: 'story', name: '半感染者', desc: '在期限之前救下半感染者嫣然。' },
  { id: 'lulu', category: 'story', name: '罐头朋友', desc: '用罐头换回饥饿丧尸露露。' },
  { id: 'barbecue', category: 'story', name: '奇怪的晚餐', desc: '在露营山区吃下那顿奇怪的烧烤。' },
  { id: 'doctor', category: 'story', name: '博士的委托', desc: '用抗感染针换下陈博士的 M700。' },
  { id: 'garage', category: 'story', name: '远走高飞', desc: '和嫣然一起从地下车库离开。' },
  { id: 'rocket', category: 'story', name: '升空', desc: '修好火箭并达成任意一个发射结局。' },
  { id: 'loan-paid', category: 'economy', name: '两清', desc: '还清在都城银行借下的贷款。' },
  { id: 'survivor-60', category: 'survival', name: '长冬', desc: '在末日里存活整整六十天。' },
  { id: 'slayer-100', category: 'combat', name: '尸潮', desc: '累计击杀 100 只丧尸。' },
  { id: 'field-explorer', category: 'survival', name: '走出安全屋', desc: '第一次进入野外地图探索。' },
  { id: 'field-veteran', category: 'survival', name: '踏遍废墟', desc: '探索过 5 张不同的野外地图。' },
  { id: 'fully-armed', category: 'combat', name: '全副武装', desc: '同时装备近战与远程武器。' },
  { id: 'legendary', category: 'combat', name: '传说在手', desc: '拥有一件传说或神话品质的武器。' },
  { id: 'city-knight', category: 'story', name: '封骑士', desc: '在末日都城获得骑士或更高身份。' },
  { id: 'city-heir', category: 'story', name: '王座之前', desc: '在末日都城获得储君身份。' },
  { id: 'dawn-command', category: 'story', name: '曙光指挥', desc: '在曙光阵地晋升到指挥。' },
  { id: 'dawn-deputy', category: 'story', name: '曙光副首', desc: '在曙光阵地晋升到副首。' },
  { id: 'coin-tycoon', category: 'economy', name: '富甲一方', desc: '手头攒下 200 枚末日币。' },
  { id: 'dawn-wealth', category: 'economy', name: '曙光之富', desc: '手头攒下 300 枚曙光币。' },
  { id: 'ma-san', category: 'combat', name: '掀了烧烤摊', desc: '拒绝冷面阿三的邀请，并把他打倒。' },
  { id: 'no-cheat', category: 'combat', name: '我没开挂', desc: '在生死角斗中击败游戏开发者。' },
  { id: 'coup-victory', category: 'story', name: '臣服于我', desc: '在高台政变中让所有贵族低头。' },
  { id: 'death-list', category: 'story', name: '死亡名单', desc: '接过马斐的第十二份委托，成为他名单上的最后一行。' },
  { id: 'seed-life', category: 'story', name: '生机', desc: '把腐烂种子种成一片果苗。' },
  { id: 'doctor-badges', category: 'story', name: '三枚徽章', desc: '集齐陈博士的三枚发射徽章。' },
  { id: 'rocket-crew', category: 'story', name: '一个都不少', desc: '带着嫣然和露露一起升空。' },
  { id: 'rocket-solo', category: 'story', name: '独行者', desc: '独自飞离这片废墟。' },
  { id: 'rocket-send', category: 'story', name: '送别', desc: '让他们上火箭，自己留在废墟。' },
  { id: 'playtime-1h', category: 'misc', name: '一小时', desc: '累计游玩 1 小时。' },
  { id: 'playtime-10h', category: 'misc', name: '长夜未央', desc: '累计游玩 10 小时。' },
  { id: 'first-dodge', category: 'combat', name: '侧身', desc: '在战斗中第一次侧身避开丧尸的反扑。' },
  { id: 'first-talent', category: 'combat', name: '入门', desc: '完成任意专项训练，取得第一级天赋。' },
  { id: 'first-spray', category: 'combat', name: '泼洒', desc: '第一次触发泼射，让霰弹一次覆盖更多目标。' },
  { id: 'magic-10', category: 'combat', name: '十层魔化', desc: '让魔化宝石的层数第一次叠到 10 层。' },
  { id: 'insight-full', category: 'combat', name: '洞若观火', desc: '让要害洞察的层数第一次叠满 5 层。' },
  { id: 'first-sweep', category: 'combat', name: '横扫', desc: '用横扫千军加成打出第一记首击。' },
  { id: 'execution-3', category: 'combat', name: '三度处决', desc: '累计触发致命一击处决 3 次。' },
  { id: 'first-break', category: 'combat', name: '断刃', desc: '第一次在战斗中把近战武器用断。' },
  { id: 'training-30', category: 'misc', name: '勤能补拙', desc: '累计完成专项训练 30 次。' },
  { id: 'talents-12', category: 'misc', name: '博采众长', desc: '让 12 种不同的专项训练都达到至少 1 级。' },
  { id: 'talent-master', category: 'combat', name: '炉火纯青', desc: '把任意一项专项训练练到满级。' },
  { id: 'build-codex', category: 'misc', name: '纸上谈兵', desc: '打开「流派构筑」，查看流派搭配与期望伤害。' },
  { id: 'death-reaper', category: 'survival', name: '死神来了', desc: '累计体验过全部六种属性死亡：饥荒、缺水、自缢、过劳、尸变、伤重不治。' },
  { id: 'swim-champion', category: 'survival', name: '游泳冠军', desc: '在深海里耗尽最后一口气，迎来溺水结局。' },
  { id: 'become-barbecue', category: 'survival', name: '成为烧烤', desc: '接受冷面阿三的邀请，成为后厨里的一道菜。' },
  { id: 'negative-second-gen', category: 'economy', name: '负二代', desc: '平民贷款逾期未还，被放贷的人拖进后巷。' },
  { id: 'mutiny-fame', category: 'story', name: '我名声很好', desc: '在长滩海港掀翻邮轮，成为三座城都不欢迎的人。' },
  { id: 'family-and-love', category: 'story', name: '亲情与爱情', desc: '替皇后送完最后一封信，见证爱与恨的结局。' },
  { id: 'straw-hat', category: 'story', name: '我草帽在哪', desc: '把一整船人驶向没有被末日吞掉的海平线。' },
]

/** 成就分类：顺序即面板筛选条顺序，id 与 ACHIEVEMENTS 的 category 一一对应 */
export const ACHIEVEMENT_CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'survival', name: '生存' },
  { id: 'story', name: '剧情' },
  { id: 'economy', name: '经济' },
  { id: 'combat', name: '战斗' },
  { id: 'misc', name: '其他' },
]

export const INVENTORY_CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'melee', name: '近战武器' },
  { id: 'ranged', name: '远程武器' },
  { id: 'food', name: '食物' },
  { id: 'drink', name: '饮品' },
  { id: 'medicine', name: '药品' },
  { id: 'gem', name: '宝石' },
  { id: 'guild', name: '公会徽章' },
  { id: 'identity', name: '身份牌' },
  { id: 'memento', name: '纪念徽章' },
  { id: 'quest', name: '任务物品' },
]
