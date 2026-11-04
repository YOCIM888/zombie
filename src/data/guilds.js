// 乌托邦城公会：徽章、加入条件、日常委托、公会商店与贡献兑换
// 公会商店按「末日币 + 曙光币」复合定价，取自武器定价与实用价值

/** 日常委托统一奖励 */
export const GUILD_COMMISSION_REWARD = { coins: 2, dawnCoins: 2, contribution: 1 }

export const GUILDS = [
  {
    id: 'hunter',
    name: '猎人公会',
    badgeId: 'guild-hunter',
    requirementText: '上交猎弓、复合弓、十字弩各一把',
    buffText:
      '猎弓 / 复合弓 / 十字弩 / 天星之弓伤害 +20；清洁度不再降低伤害，但清洁度消耗翻倍。',
    requirement: {
      items: [
        { id: 'hunting-bow', qty: 1 },
        { id: 'compound-bow', qty: 1 },
        { id: 'crossbow', qty: 1 },
      ],
    },
    weaponIds: ['hunting-bow', 'compound-bow', 'crossbow', 'starfall-bow'],
    damageBonus: 20,
    noCleanlinessDecay: true,
    cleanlinessCostMultiplier: 2,
    commission: {
      type: 'kill',
      weaponIds: ['hunting-bow', 'compound-bow', 'crossbow'],
      count: 2,
      text: '使用猎弓 / 复合弓 / 十字弩击杀 2 只任意丧尸',
    },
    shop: [
      { id: 'hunting-bow', coins: 16, dawnCoins: 8 },
      { id: 'compound-bow', coins: 32, dawnCoins: 16 },
      { id: 'crossbow', coins: 36, dawnCoins: 18 },
    ],
    contributionShop: [
      {
        id: 'starfall-bow',
        contribution: 60,
        coins: 300,
        dawnCoins: 300,
        once: true,
      },
    ],
  },
  {
    id: 'warrior',
    name: '战士公会',
    badgeId: 'guild-warrior',
    requirementText: '累计击杀 30 只丧尸',
    buffText: '战术匕首 / 长矛 / 手斧 / 威能战斧伤害 +20，但耐久消耗翻倍。',
    requirement: { kills: 30 },
    weaponIds: ['dagger', 'spear', 'hand-axe', 'might-axe'],
    damageBonus: 20,
    durabilityCostMultiplier: 2,
    commission: {
      type: 'kill',
      weaponIds: ['dagger', 'spear', 'hand-axe'],
      count: 2,
      text: '使用战术匕首 / 长矛 / 手斧击杀 2 只任意丧尸',
    },
    shop: [
      { id: 'dagger', coins: 20, dawnCoins: 9 },
      { id: 'spear', coins: 28, dawnCoins: 13 },
      { id: 'hand-axe', coins: 40, dawnCoins: 19 },
    ],
    contributionShop: [
      {
        id: 'might-axe',
        contribution: 60,
        coins: 300,
        dawnCoins: 300,
        once: true,
      },
    ],
  },
  {
    id: 'priest',
    name: '牧师公会',
    badgeId: 'guild-priest',
    requirementText: '提交 3 支肾上腺素 + 3 支体能针',
    buffText: '绷带 / 止痛药 / 抗生素的效果翻倍。',
    requirement: {
      items: [
        { id: 'adrenaline', qty: 3 },
        { id: 'stamina-shot', qty: 3 },
      ],
    },
    medicineIds: ['bandage', 'painkiller', 'antibiotic'],
    medicineMultiplier: 2,
    commission: {
      type: 'medicine',
      count: 5,
      text: '上交任意药品 5 份',
    },
    shop: [
      { id: 'bandage', coins: 4, dawnCoins: 2 },
      { id: 'painkiller', coins: 4, dawnCoins: 2 },
      { id: 'antibiotic', coins: 6, dawnCoins: 3 },
    ],
    contributionShop: [
      {
        id: 'angel-gem',
        contribution: 60,
        coins: 300,
        dawnCoins: 300,
        once: true,
      },
    ],
  },
  {
    id: 'rogue',
    name: '盗贼公会',
    badgeId: 'guild-rogue',
    requirementText: '在末日都城进行盗窃 10 次',
    buffText: '都城偷窃 100% 产出 3 币；沿街乞讨奖励翻倍。',
    requirement: { thefts: 10 },
    theftCoins: 3,
    beggingMultiplier: 2,
    commission: {
      type: 'rogue',
      thefts: 2,
      begs: 2,
      text: '进行盗窃 2 次、沿街乞讨 2 次',
    },
    shop: [
      { id: 'scimitar', coins: 26, dawnCoins: 13 },
      { id: 'cleaver', coins: 27, dawnCoins: 13 },
      { id: 'knuckle-blade', coins: 37, dawnCoins: 18 },
    ],
    contributionShop: [
      {
        id: 'time-gem',
        contribution: 60,
        coins: 300,
        dawnCoins: 300,
        once: true,
      },
    ],
  },
  {
    id: 'poet',
    name: '诗人公会',
    badgeId: 'guild-poet',
    requirementText: '提交 10 瓶白兰地',
    buffText: '饱食 / 口渴 / 理智 / 体力归零后不会直接死亡，每回合扣 25 生命。',
    requirement: { items: [{ id: 'brandy', qty: 10 }] },
    zeroStatDrain: 25,
    commission: {
      type: 'wine',
      items: ['brandy', 'whiskey', 'gin', 'vodka', 'tequila', 'rum'],
      count: 3,
      text: '提交白兰地 / 威士忌 / 金酒 / 伏特加 / 龙舌兰 / 朗姆酒任意 3 份',
    },
    shop: [
      { id: 'corona', coins: 3, dawnCoins: 2 },
      { id: 'white-beer', coins: 3, dawnCoins: 2 },
    ],
    contributionShop: [
      {
        id: 'tenacity-gem',
        contribution: 60,
        coins: 300,
        dawnCoins: 300,
        once: true,
      },
    ],
  },
  {
    id: 'knight',
    name: '骑士公会',
    badgeId: 'guild-knight',
    requirementText: '持有都城「骑士」及以上身份，并提交 2 把骑士剑',
    buffText:
      '装备骑士剑时，生命上限 +20、暴击率 +16%、骑士剑连击 +22%。',
    requirement: {
      minIdentity: '骑士',
      items: [{ id: 'knight-sword', qty: 2 }],
    },
    weaponIds: ['knight-sword'],
    maxHpBonus: 20,
    critBonus: 0.16,
    comboBonus: 0.22,
    commission: {
      type: 'kill',
      weaponIds: ['knight-sword'],
      count: 2,
      text: '使用骑士剑击杀 2 只任意丧尸',
    },
    shop: [
      { id: 'knight-sword', coins: 41, dawnCoins: 20 },
      { id: 'whole-wheat-bread', coins: 3, dawnCoins: 2 },
    ],
    contributionShop: [
      {
        id: 'guardian-gem',
        contribution: 60,
        coins: 300,
        dawnCoins: 300,
        once: true,
      },
    ],
  },
]

export const GUILD_BY_ID = Object.fromEntries(GUILDS.map((guild) => [guild.id, guild]))

export function guildById(id) {
  return GUILD_BY_ID[id] ?? null
}
