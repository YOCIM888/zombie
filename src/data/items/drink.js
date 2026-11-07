// 饮品：默认进入探索掉落池；限定饮品需标记 limited
function drink(id, name, effects, description, extra = {}) {
  return {
    id,
    name,
    category: 'drink',
    image: `/image/饮品/${name}.webp`,
    description,
    stackable: true,
    maxStack: 999,
    effects,
    ...extra,
  }
}

const DRINK_LIST = [
  drink('kvass', '格瓦斯', { thirst: 20, hunger: 5 },
    '发酵面包味，甜得发黏。'),
  drink('milk', '牛奶', { thirst: 20, hunger: 10 },
    '利乐包鼓了一点，闻着还没坏。'),
  drink('functional-drink', '功能饮料', { thirst: 20, stamina: 10 },
    '标签上的牛磺酸含量被圈了出来。'),
  drink('monster', '魔爪', { thirst: 20, stamina: 15 },
    '黑色罐子，冰过之后更刺喉。'),
  drink('mineral-water', '矿泉水', { thirst: 25 },
    '半瓶被晒得温热的矿泉水，瓶口留着别人的牙印。'),
  drink('electrolyte-water', '电解质水', { thirst: 30 },
    '瓶身写着补给站专用。'),
  drink('sports-drink', '运动饮料', { thirst: 30 },
    '蓝色液体，标签已经泡烂。'),
  // 酒精饮品
  drink('corona', '科罗娜', { thirst: 15, sanity: 5 },
    '瓶口塞着半片柠檬，早就干了。'),
  drink('white-beer', '白威啤酒', { thirst: 15, sanity: 5 },
    '易拉罐被压出凹痕，摇起来还有声音。'),
  drink('brandy', '白兰地', { thirst: 10, sanity: 10 },
    '琥珀色，瓶塞已经干了。'),
  drink('vodka', '伏特加', { thirst: 10, sanity: 10 },
    '无色透明，喝下去像吞了一口火。'),
  drink('gin', '金酒', { thirst: 10, sanity: 10 },
    '瓶里泡着几粒干枯的杜松子。'),
  drink('rum', '朗姆酒', { thirst: 10, sanity: 10 },
    '深色玻璃瓶，甜味盖住了酒精。'),
  drink('tequila', '龙舌兰', { thirst: 10, sanity: 10 },
    '瓶底沉着一条虫子。'),
  drink('whiskey', '威士忌', { thirst: 10, sanity: 10 },
    '泥煤味很重，适合暖手也暖胃。'),

  /* ===== 限定 ===== */
  drink('royal-mix', '皇家特调', { thirst: 50, sanity: 50, stamina: 50 },
    '琥珀色的酒液里浮着一层细金粉，杯沿还留着一小片干柠檬。', {
      tier: '限定',
      limited: true,
      image: '/image/饮品/皇家特调.webp',
    }),
]

export const DRINK_ITEMS = Object.fromEntries(DRINK_LIST.map((item) => [item.id, item]))
