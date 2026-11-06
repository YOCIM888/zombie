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
    description: '鳞片下透出暗紫色的光，每一次呼吸都让市政厅的灯忽明忽暗。',
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
    description: '它的伤口里流着不会熄灭的火，空气被烤得发甜。',
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
    description: '半个身子还留在水里，歌声让玻璃窗上结出一层盐。',
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
    description: '她很美，只是因为某种原因变堕落，试图打败她吧。',
  },
]

export function worldBossById(id) {
  return WORLD_BOSSES.find((boss) => boss.id === id) ?? null
}
