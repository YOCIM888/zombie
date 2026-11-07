// 乌托邦城地下裂缝：四只世界BOSS，血量按玩家进度保存
export const WORLD_BOSSES = [
  {
    id: 'dragon',
    name: '黑魔龙',
    gemId: 'magic-gem',
    image: '/image/世界BOSS/黑魔龙.webp',
    hp: 58880,
    attack: 45,
    skill: {
      type: 'dodge-rage',
      perStack: 5,
      maxStacks: 10,
      text: '你每闪避成功一次，它的伤害便上涨 5 点，至多叠加 10 层。',
    },
    description: '暗紫鳞光随吐息明灭，你每一次闪身，都像往它胸口的怒火里添了一勺油。',
  },
  {
    id: 'fire-dragon',
    name: '焚火龙',
    gemId: 'blood-gem',
    image: '/image/世界BOSS/焚火龙.webp',
    hp: 60000,
    attack: 42,
    skill: {
      type: 'hp-enrage',
      thresholds: [
        { hpBelow: 55000, attackBonus: 10 },
        { hpBelow: 40000, attackBonus: 25 },
        { hpBelow: 30000, attackBonus: 40 },
      ],
      text: '血量低于 55000 / 40000 / 30000 时，攻击分别 +10 / +25 / +40。',
    },
    description: '伤口淌着不灭的火，血线每降一截，被烤甜的空气就更烫一分。',
  },
  {
    id: 'siren',
    name: '塞涅娅',
    gemId: 'ocean-gem',
    image: '/image/世界BOSS/塞涅娅.webp',
    hp: 49880,
    attack: 39,
    skill: {
      type: 'suffocate',
      chance: 0.5,
      critPenalty: 1,
      text: '造成伤害时有 50% 概率让你窒息：下一次攻击暴击率 -100%。',
    },
    description: '她半身浸在礁影里，歌声让玻璃结出盐霜，也让下一次出手在窒息中失去准星。',
  },
  {
    id: 'fairy',
    name: '堕精灵',
    gemId: 'fairy-gem',
    image: '/image/世界BOSS/堕精灵.webp',
    hp: 52880,
    attack: 20,
    skill: {
      type: 'drain',
      sanity: 10,
      infection: 10,
      text: '每次对你造成伤害时，理智 -10、感染 +10。',
    },
    description: '残破蝶翼抖落腐孢，她的葬歌钻进伤口，把理智和洁净一点点抽走。',
  },
]

export function worldBossById(id) {
  return WORLD_BOSSES.find((boss) => boss.id === id) ?? null
}
