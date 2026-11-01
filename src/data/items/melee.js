// 近战武器：按稀有度分六档，属性随档位递增
export const MELEE_TIERS = ['普通', '稀有', '精良', '史诗', '传说', '神话']

export const MELEE_TIER_COLORS = {
  '普通': '#9b9588',
  '稀有': '#4b87b8',
  '精良': '#7c9840',
  '史诗': '#8b74b8',
  '传说': '#c9923f',
  '神话': '#c8473a',
}

/** 生成一件近战武器（图片按武器名自动对应 public/image/近战武器） */
function melee(id, name, tier, weapon, description) {
  return {
    id,
    name,
    tier,
    category: 'melee',
    image: `/image/近战武器/${name}.webp`,
    description,
    stackable: false,
    maxStack: 1,
    weapon,
  }
}

const MELEE_LIST = [
  /* ===== 普通 ===== */
  melee('kitchen-knife', '菜刀', '普通', { attack: 12, crit: 0.05, critDamage: 1.15, combo: 0.03, durability: 100 },
    '厨房里最常见的铁器，卷刃、生锈，但依然能切开东西。'),
  melee('dagger', '匕首', '普通', { attack: 15, crit: 0.06, critDamage: 1.22, combo: 0.2, durability: 80 },
    '贫民集市里最锋利的货色，刀柄缠着发黑的布条。'),
  melee('baseball-bat', '棒球棍', '普通', { attack: 16, crit: 0.04, critDamage: 1.2, combo: 0.08, durability: 130 },
    '球棒上还粘着干掉的泥，握柄缠了几圈胶带。'),
  melee('pipe-wrench', '管钳', '普通', { attack: 14, crit: 0.05, critDamage: 1.25, combo: 0.05, durability: 120 },
    '沉得压手，拧得动螺栓，也敲得碎骨头。'),
  melee('baton', '警棍', '普通', { attack: 12, crit: 0.06, critDamage: 1.18, combo: 0.1, durability: 110 },
    '橡胶棍身，末端有一圈磨白的金属。'),
  melee('frying-pan', '平底锅', '普通', { attack: 11, crit: 0.03, critDamage: 1.3, combo: 0.03, durability: 90 },
    '锅底凹进去一块，炒过什么东西没人知道。'),
  melee('nunchaku', '双截棍', '普通', { attack: 10, crit: 0.08, critDamage: 1.15, combo: 0.22, durability: 80 },
    '两节铁棍用短链连着，甩起来会响。'),
  melee('fruit-knife', '水果刀', '普通', { attack: 9, crit: 0.1, critDamage: 1.25, combo: 0.15, durability: 60 },
    '刀身很薄，削苹果刚好，捅人也不差。'),
  melee('claw-hammer', '羊角锤', '普通', { attack: 13, crit: 0.05, critDamage: 1.28, combo: 0.06, durability: 120 },
    '羊角那头能撬开木箱，也能撬开别的东西。'),
  melee('karambit-classic', '爪刀-经典', '普通', { attack: 14, crit: 0.1, critDamage: 1.3, combo: 0.18, durability: 75 },
    '弧形刀身贴在指节上，拔出时很顺手。'),
  melee('knuckle', '指虎', '普通', { attack: 12, crit: 0.07, critDamage: 1.2, combo: 0.12, durability: 100 },
    '四根铁环套在指节上，拳头的重量翻了倍。'),

  /* ===== 稀有 ===== */
  melee('cleaver', '大砍刀', '稀有', { attack: 28, crit: 0.08, critDamage: 1.4, combo: 0.1, durability: 150 },
    '刀背厚，刃口有一排旧豁口。'),
  melee('entrenching-tool', '工兵铲', '稀有', { attack: 24, crit: 0.09, critDamage: 1.35, combo: 0.12, durability: 160 },
    '折叠铲，边缘被磨得能削断树枝。'),
  melee('sickle', '镰刀', '稀有', { attack: 23, crit: 0.12, critDamage: 1.38, combo: 0.2, durability: 110 },
    '农具改的，刀刃弯得刚好绕过人的脖子。'),
  melee('snake-sword', '蛇刀', '稀有', { attack: 22, crit: 0.14, critDamage: 1.42, combo: 0.24, durability: 100 },
    '刃口呈波浪形，割开的地方很难缝。'),
  melee('scimitar', '弯刀', '稀有', { attack: 26, crit: 0.11, critDamage: 1.4, combo: 0.18, durability: 120 },
    '刀身弧度过半，适合在马背上挥砍。'),
  melee('spear', '长矛', '稀有', { attack: 30, crit: 0.08, critDamage: 1.35, combo: 0.08, durability: 150 },
    '木杆矛头，长度足够让对手近不了身。'),
  melee('crowbar', '撬棍', '稀有', { attack: 25, crit: 0.09, critDamage: 1.32, combo: 0.1, durability: 160 },
    '铁棍一头开叉，撬门比砍人更常用。'),
  melee('halberd', '战戟', '稀有', { attack: 32, crit: 0.08, critDamage: 1.45, combo: 0.08, durability: 140 },
    '长杆前端的斧刃和尖刺都有锈了。'),

  /* ===== 精良 ===== */
  melee('knight-sword', '骑士剑', '精良', { attack: 40, crit: 0.14, critDamage: 1.6, combo: 0.18, durability: 170 },
    '十字护手，剑身刻着一行看不清的字。'),
  melee('kukri', '廓尔喀弯刀', '精良', { attack: 38, crit: 0.17, critDamage: 1.65, combo: 0.24, durability: 150 },
    '重心靠前，一刀下去能带走整条手臂。'),
  melee('huan-shou-dao', '环首刃', '精良', { attack: 36, crit: 0.16, critDamage: 1.55, combo: 0.2, durability: 160 },
    '刀柄末端有个圆环，握起来很稳。'),
  melee('mountain-chopper', '开山刀', '精良', { attack: 46, crit: 0.12, critDamage: 1.55, combo: 0.14, durability: 190 },
    '刃长背厚，砍柴和开路都靠它。'),
  melee('triangular-bayonet', '三棱军刺', '精良', { attack: 34, crit: 0.2, critDamage: 1.6, combo: 0.16, durability: 140 },
    '三道棱，伤口不会被缝合。'),
  melee('hand-axe', '手斧', '精良', { attack: 42, crit: 0.13, critDamage: 1.6, combo: 0.12, durability: 150 },
    '短柄斧，单手抡起来毫不费力。'),
  melee('short-katana', '武士刀-短', '精良', { attack: 38, crit: 0.18, critDamage: 1.65, combo: 0.22, durability: 150 },
    '短刃，适合在狭窄走廊里拔刀。'),
  melee('fire-axe', '消防斧', '精良', { attack: 45, crit: 0.1, critDamage: 1.55, combo: 0.1, durability: 180 },
    '红色斧身，斧刃还印着消防编号。'),
  melee('knuckle-blade', '指虎刀', '精良', { attack: 35, crit: 0.19, critDamage: 1.62, combo: 0.2, durability: 130 },
    '指虎上加了一片刃，打和割只差一个角度。'),

  /* ===== 史诗 ===== */
  melee('spring-knife-monochrome', '弹簧刀-黑白', '史诗', { attack: 52, crit: 0.24, critDamage: 1.9, combo: 0.34, durability: 160 },
    '黑白相间的柄，按下按钮刀就弹出来。'),
  melee('butterfly-silver', '蝴蝶刀-银蝶', '史诗', { attack: 50, crit: 0.26, critDamage: 1.95, combo: 0.42, durability: 150 },
    '银色刀身翻起来像翅膀，熟练的人从不割到自己。'),
  melee('tang-dao', '唐横刀', '史诗', { attack: 62, crit: 0.22, critDamage: 1.95, combo: 0.26, durability: 180 },
    '直刃厚脊，刀身比看上去重得多。'),
  melee('katana-dusk', '武士刀-黄昏', '史诗', { attack: 60, crit: 0.24, critDamage: 2, combo: 0.3, durability: 175 },
    '刀身泛着暗金色，像被落日浸过。'),
  melee('chainsaw', '油锯', '史诗', { attack: 68, crit: 0.18, critDamage: 1.85, combo: 0.18, durability: 200 },
    '导板上的链条缺了几齿，发动机还能响。'),
  melee('karambit-ghost', '爪刀-幽灵', '史诗', { attack: 54, crit: 0.28, critDamage: 2, combo: 0.38, durability: 140 },
    '刀身几乎透明，握柄凉得像冰。'),

  /* ===== 传说 ===== */
  melee('spring-knife-aurora', '弹簧刀-极光', '传说', { attack: 70, crit: 0.32, critDamage: 2.2, combo: 0.44, durability: 190 },
    '弹出的瞬间，刀身映出流动的光。'),
  melee('noble-shortsword', '贵族短剑', '传说', { attack: 76, crit: 0.28, critDamage: 2.25, combo: 0.36, durability: 210 },
    '镀金剑柄，剑鞘上还留着家徽。'),
  melee('butterfly-gold', '蝴蝶刀-金蝶', '传说', { attack: 72, crit: 0.34, critDamage: 2.3, combo: 0.5, durability: 170 },
    '金色刀身开合无声，握久了会烫手。'),
  melee('keel-blade', '龙骨剑', '传说', { attack: 88, crit: 0.26, critDamage: 2.25, combo: 0.28, durability: 240 },
    '剑脊像一段脊椎，沉得必须双手握。'),
  melee('trident', '三叉戟-海歌', '传说', { attack: 92, crit: 0.25, critDamage: 2.2, combo: 0.24, durability: 230 },
    '三叉上缠着贝壳和藤条，靠近能听见水声。'),
  melee('katana-raikiri', '武士刀-雷切', '传说', { attack: 84, crit: 0.3, critDamage: 2.35, combo: 0.34, durability: 210 },
    '出鞘时有细微电弧，刀身亮得刺眼。'),

  /* ===== 神话 ===== */
  melee('crusader-cross-sword', '十字剑-圣战', '神话', { attack: 108, crit: 0.36, critDamage: 2.55, combo: 0.32, durability: 280 },
    '剑柄是十字架，剑身上刻满祷文。'),
  melee('scarlet-greatsword', '猩红巨剑', '神话', { attack: 125, crit: 0.32, critDamage: 2.6, combo: 0.24, durability: 320 },
    '整块剑身泛红，血干了也和它分不清。'),
  melee('longsword-rose-dark', '长剑-暗夜玫瑰', '神话', { attack: 100, crit: 0.42, critDamage: 2.7, combo: 0.46, durability: 250 },
    '剑身黑得吸光，只有刃口一线银。'),
  melee('longsword-frost', '长剑-寒芒', '神话', { attack: 105, crit: 0.44, critDamage: 2.75, combo: 0.4, durability: 245 },
    '拔出时空气变冷，剑锋上凝着白霜。'),
  melee('longsword-silver-rose', '长剑-银色玫瑰', '神话', { attack: 110, crit: 0.4, critDamage: 2.8, combo: 0.38, durability: 260 },
    '银白剑身雕着玫瑰纹理，轻得不像它的体量。'),
]

export const MELEE_ITEMS = Object.fromEntries(MELEE_LIST.map((item) => [item.id, item]))
