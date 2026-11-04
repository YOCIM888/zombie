// 食物：水果（fruit: true）不进入都城探索掉落池
function food(id, name, effects, description, extra = {}) {
  return {
    id,
    name,
    category: 'food',
    image: `/image/食物/${name}.webp`,
    description,
    stackable: true,
    maxStack: 999,
    effects,
    ...extra,
  }
}

const FOOD_LIST = [
  food('chocolate', '巧克力', { hunger: 15 },
    '表面起了白霜，掰开还是整块的。'),
  food('energy-bar', '能量棒', { hunger: 15, stamina: 5 },
    '包装皱成一团，热量密度高得不像食物。'),
  food('instant-noodle', '干脆面', { hunger: 20 },
    '塑料袋里压得粉碎，调料包倒进去，干嚼也能听见响声。'),
  food('potato-chips', '薯片', { hunger: 20 },
    '大半袋是空气，剩下的一半也碎得差不多了。'),
  food('compressed-biscuit', '压缩饼干', { hunger: 25 },
    '硬得像砖头，嚼久了会尝出一丝甜味。至少能填饱肚子。'),
  food('whole-wheat-bread', '全麦面包', { hunger: 25 },
    '边角发硬，中间还能撕出软芯。'),
  food('death-spicy-strip', '死神辣条', { hunger: 25, sanity: -2 },
    '红得发黑的辣条，包装上画着一个骷髅。辣得人眼冒金星，脑子里嗡嗡作响。'),
  food('canned-fruit', '水果罐头', { hunger: 25, thirst: 10 },
    '糖水泡着的果块，保质期长得可疑。'),
  food('pickled-veg-can', '腌菜罐头', { hunger: 30 },
    '酸味冲鼻，却很下饭。'),
  food('canned-meat', '肉罐头', { hunger: 30 },
    '不明来源的肉，油层封住了表面。'),
  food('canned-fish', '鱼罐头', { hunger: 30 },
    '骨头都酥了，连刺一起吃。'),
  food('canned-beans', '豆类罐头', { hunger: 30 },
    '标签褪色，摇起来是沉闷的声响。'),

  /* ===== 水果 ===== */
  food('orange', '橙子', { hunger: 10, thirst: 10 },
    '皮上还带着蜡光，剥开时汁水溅在指缝里。', { fruit: true }),
  food('apple', '苹果', { hunger: 10, thirst: 10 },
    '果皮有一道撞痕，但咬下去还是脆的。', { fruit: true }),
  food('grape', '葡萄', { hunger: 10, thirst: 10 },
    '一小串，纸袋里闷出了酒味。', { fruit: true }),
  food('peach', '桃子', { hunger: 10, thirst: 10 },
    '软得刚好，绒毛蹭在掌心。', { fruit: true }),
  food('banana', '香蕉', { hunger: 10, thirst: 10 },
    '表皮发黑，里面还是白的。', { fruit: true }),
  food('cranberry', '越蔓梅', { hunger: 10, thirst: 10 },
    '酸得让人皱眉，能压住嘴里的铁锈味。', { fruit: true }),

  /* ===== 特殊：不进入任何掉落池 ===== */
  food('dev-candy', '开发者糖果', { hunger: 100 },
    '包装纸上印着一行小字：「调试用，别多吃。」甜得完全不讲道理。', {
      special: true,
    }),

  /* ===== 深海：不进入常规探索池 ===== */
  food('mutant-fish', '变异鱼肉', {
    hunger: 30, thirst: 30, stamina: 100, sanity: -80, infection: 80,
  }, '鱼肉泛着不自然的蓝光，入口后胃里像有什么东西在慢慢苏醒。', {
    special: true,
  }),
  food('safe-fish', '无害化鱼肉', {
    hunger: 30, thirst: 30, stamina: 50,
  }, '处理过的鱼肉不再发蓝，煎熟后只剩正常的腥香。', {
    special: true,
  }),

  /* ===== 限定 ===== */
  food('royal-dessert', '皇家甜点', { hunger: 60, hp: 60, infection: -60 },
    '奶油上压着王宫的家徽，甜得几乎不像末日里的东西。', {
      tier: '限定',
      limited: true,
      image: '/image/末日都城限定/皇家甜点.webp',
    }),
]

export const FOOD_ITEMS = Object.fromEntries(FOOD_LIST.map((item) => [item.id, item]))
