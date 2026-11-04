// 乌托邦城地下裂缝：四只世界BOSS，血量按玩家进度保存
export const WORLD_BOSS_HP = 50000

export const WORLD_BOSSES = [
  {
    id: 'dragon',
    name: '尸化魔龙',
    gemId: 'magic-gem',
    image: '/image/世界BOSS/尸化魔龙.webp',
    hp: WORLD_BOSS_HP,
    attackMin: 40,
    attackMax: 60,
    description: '鳞片下透出暗紫色的光，每一次呼吸都让市政厅的灯忽明忽暗。',
  },
  {
    id: 'fire-dragon',
    name: '尸化火龙',
    gemId: 'blood-gem',
    image: '/image/世界BOSS/尸化火龙.webp',
    hp: WORLD_BOSS_HP,
    attackMin: 40,
    attackMax: 60,
    description: '它的伤口里流着不会熄灭的火，空气被烤得发甜。',
  },
  {
    id: 'siren',
    name: '尸化海妖',
    gemId: 'ocean-gem',
    image: '/image/世界BOSS/尸化海妖.webp',
    hp: WORLD_BOSS_HP,
    attackMin: 40,
    attackMax: 60,
    description: '半个身子还留在水里，歌声让玻璃窗上结出一层盐。',
  },
  {
    id: 'fairy',
    name: '尸化妖精',
    gemId: 'fairy-gem',
    image: '/image/世界BOSS/尸化妖精.webp',
    hp: WORLD_BOSS_HP,
    attackMin: 40,
    attackMax: 60,
    description: '它很小，翅膀像两片碎玻璃，笑起来却让人后背发凉。',
  },
]

export function worldBossById(id) {
  return WORLD_BOSSES.find((boss) => boss.id === id) ?? null
}
