// 办事中心：用回合和货币换一张证，永久改变其他场所的规则
export const SERVICE_CENTER_EXPRESS_DAWN = 3

export const SERVICE_PERMITS = [
  {
    id: 'trade-license',
    kind: '证照',
    name: '自由贸易执照',
    desc: '摊位上盖一枚乌托邦的蓝章，买家更愿意相信你的货。',
    coins: 60,
    dawnCoins: 20,
    once: true,
    effectText: '自由贸易托管成交概率 +5%',
  },
  {
    id: 'weapon-permit',
    kind: '证照',
    name: '持械备案',
    desc: '把你的刀和枪登记在册。治安官再看见你，会先翻档案再决定抓不抓。',
    coins: 50,
    dawnCoins: 15,
    once: true,
    effectText: '红灯街区罚款减半',
  },
  {
    id: 'training-permit',
    kind: '证照',
    name: '训练许可',
    desc: '允许你在训练场多待一个时段，窗口盖的是“特许”两个字。',
    coins: 120,
    dawnCoins: 40,
    once: true,
    effectText: '每日乌托邦训练次数 2 → 3',
  },
  {
    id: 'badge-reissue',
    kind: '补办',
    name: '公会徽章挂失补办',
    desc: '档案里还留着你的公会记录。交钱，就能把徽章重新压出来。',
    coins: 20,
    dawnCoins: 10,
    once: false,
    effectText: '补回上一次加入的公会徽章',
  },
]
