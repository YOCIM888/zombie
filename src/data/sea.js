// 长滩海港·深海：变异海洋生物分级、遭遇率与掉落

export const SEA_OXYGEN_DEFAULT = 100
export const SEA_OXYGEN_BLESSED = 200
export const SEA_OXYGEN_COST = 20

/** 深海掉落：普通海生物掉落变异鱼肉，冥渊沧龙掉落沧龙鳞片 */
export const SEA_LOOT = {
  normal: 'mutant-fish',
  boss: 'dragon-scale',
}

function seaCreature(id, name, description, isBoss = false) {
  return {
    id,
    name,
    description,
    image: `/image/变异海洋生物/${name}.webp`,
    isBoss,
  }
}

/** 四个危险等级：低危 45% / 中危 30% / 高危 20% / 特危 10% */
export const SEA_TIERS = [
  {
    id: 'low',
    name: '低危',
    rate: 0.45,
    hpMin: 100,
    hpMax: 120,
    attackMin: 12,
    attackMax: 18,
    creatures: [
      seaCreature(
        'bone-seabass',
        '腐骨石鲈',
        '鱼鳞下露出灰白的骨刺，鳃盖一开一合，像在嚼什么东西。',
      ),
      seaCreature(
        'blind-cod',
        '囊泡盲鳕',
        '没有眼睛，头顶鼓着一层半透明的囊泡，靠水压变化寻找猎物。',
      ),
      seaCreature(
        'chain-eel',
        '链齿海鳗',
        '身体像一截会游动的铁链，嘴里一圈圈牙齿不停旋转。',
      ),
    ],
  },
  {
    id: 'mid',
    name: '中危',
    rate: 0.3,
    hpMin: 150,
    hpMax: 200,
    attackMin: 22,
    attackMax: 24,
    creatures: [
      seaCreature(
        'thorn-ray',
        '棘鳞浊鳐',
        '贴着海床滑行，背上的棘刺把浑浊的水划出一道道白痕。',
      ),
      seaCreature(
        'blood-sailfish',
        '血帆旗鱼',
        '背鳍红得像一面帆，冲刺时几乎看不清它的轮廓。',
      ),
    ],
  },
  {
    id: 'high',
    name: '高危',
    rate: 0.2,
    hpMin: 300,
    hpMax: 400,
    attackMin: 28,
    attackMax: 32,
    creatures: [
      seaCreature(
        'reef-crab',
        '礁壳巨寄居蟹',
        '背着半截集装箱残骸当壳，钳子合拢时能听见金属变形的声音。',
      ),
      seaCreature(
        'ridge-grouper',
        '脊刺巨石斑',
        '体型像一块会呼吸的礁石，背脊上立着一排断裂的骨刺。',
      ),
    ],
  },
  {
    id: 'special',
    name: '特危',
    rate: 0.05,
    hpMin: 1000,
    hpMax: 1000,
    attackMin: 50,
    attackMax: 50,
    creatures: [
      seaCreature(
        'abyss-dragon',
        '冥渊沧龙',
        '海沟深处游上来的长影，鳞片像一块块黑铁，靠近时连海水都会变冷。',
        true,
      ),
    ],
  },
]

export const SEA_CREATURES = SEA_TIERS.flatMap((tier) =>
  tier.creatures.map((creature) => ({ ...creature, tierId: tier.id, tierName: tier.name })),
)

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

/** 按危险等级权重抽一只海洋生物，并在该等级区间内随机生成生命与攻击 */
export function pickSeaCreature() {
  const roll = Math.random()
  let cursor = 0
  const tier = SEA_TIERS.find((item) => {
    cursor += item.rate
    return roll < cursor
  }) ?? SEA_TIERS[0]

  const base = tier.creatures[Math.floor(Math.random() * tier.creatures.length)]
  return {
    ...base,
    hp: randomBetween(tier.hpMin, tier.hpMax),
    attack: randomBetween(tier.attackMin, tier.attackMax),
    infection: 0,
    dodge: 0,
    abilities: [],
    tierId: tier.id,
    tierName: tier.name,
  }
}
