// 任务物品：只用于隐藏剧情线，不进探索掉落池，不可使用/装备
function questItem(id, name, description, extra = {}) {
  return {
    id,
    name,
    category: 'quest',
    description,
    stackable: false,
    maxStack: 1,
    ...extra,
  }
}

const QUEST_LIST = [
  questItem(
    'dragon-scale',
    '沧龙鳞片',
    '一片巴掌大的黑铁色鳞片，边缘还带着海水的咸味。冥渊沧龙身上剥下来的东西，压手得不像生物组织。',
    { image: '/image/任务道具/沧龙鳞片.webp', stackable: true, maxStack: 999 },
  ),
  questItem('rotten-seed',
    '腐烂种子',
    '一枚发黑的果核，表皮已经烂穿，裂口里却顶出一点白。',
    { image: '/image/任务道具/腐烂种子.webp' },
  ),
  questItem('car-key', '车钥匙', '奔驰车钥匙，虽然有些褪色，但是齿口还很新。', {
    image: '/image/任务道具/车钥匙.webp',
  }),
  questItem('gasoline', '汽油', '铁皮桶里晃荡着半桶刺鼻的液体。', {
    image: '/image/任务道具/汽油.webp',
    stackable: true,
    maxStack: 999,
  }),
  questItem(
    'small-nuclear-generator',
    '小核能发电机',
    '军用储备里拆出来的小功率机组，外壳上还贴着封存编号。',
    { image: '/image/任务道具/小核能发电机.webp' },
  ),
  questItem('pure-energy', '纯净能源', '淡蓝色的液体在容器里微微发光，像一小段被装起来的夜。', {
    image: '/image/任务道具/纯净能源.webp',
    stackable: true,
    maxStack: 99,
  }),
  questItem(
    'high-explosive',
    '高能炸药',
    '军用炸药重新压成的方块，外壳上刻着编号，引线短得几乎贴着掌心。',
    { image: '/image/任务道具/高能炸药.webp', stackable: true, maxStack: 99 },
  ),
  questItem(
    'work-doll',
    '工作玩偶',
    '一个缝得歪歪扭扭的布偶，肚子上的补丁像一张笑歪的嘴。把它摆在桌上，它就会替你把一整天的活按顺序做完。',
    {
      image: '/image/任务道具/工作玩偶.webp',
      special: 'work-doll',
    },
  ),
  questItem(
    'kill-doll',
    '杀戮玩偶',
    '布偶的手里攥着一截磨钝的刀片，线头从指缝里露出来。把它放在桌上，它会替你清理掉挡路的东西，再顺手把该领的体面领完。',
    {
      image: '/image/任务道具/杀戮玩偶.webp',
      special: 'kill-doll',
    },
  ),
]

export const QUEST_ITEMS = Object.fromEntries(QUEST_LIST.map((item) => [item.id, item]))
