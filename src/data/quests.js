// 三条 NPC 任务线：国王、皇后、羿阳

export const QUEST_OWNERS = {
  king: {
    name: '国王艾伦',
    intro:
      '国王艾伦靠在王座上，指尖一下一下敲着扶手。他认得你胸前的徽章，也记得你替他办过的每一件事。',
  },
  queen: {
    name: '皇后米娅',
    intro:
      '皇后米娅把信收进袖口，重新坐直了身子。她看着你，像在打量一件哥哥送来、又不好随便收下的礼物。',
  },
  yiyang: {
    name: '首领·羿阳',
    intro:
      '羿阳把哨塔的门关上，地图上摊着附近街区的废墟。他没有抬头，只把名册往你手边推了推。',
  },
  nutritionist: {
    name: '营养师·苏涵',
    intro:
      '苏涵把配餐台的盖子掀开，热气涌出来。她看了一眼你身上的灰，先盛了一勺汤推过来：「先吃，吃完再说。」',
  },
  mechanic: {
    name: '机械师·莉莉',
    intro:
      '莉莉把护目镜推到额头上，手里的扳手还没放下。修理台上摊着一堆拆到一半的枪，她踢开脚边的零件，给你腾了个位置。',
  },
  mercenary: {
    name: '雇佣兵·薇尔',
    intro:
      '薇尔靠在训练场的铁丝网上，嘴里叼着半截没点着的烟。她上下打量你，像在估算你身上每一样东西还能换多少钱。',
  },
  agronomist: {
    name: '农学家·苗苗',
    intro:
      '苗苗蹲在田埂边，指尖沾着泥。她抬头看你，笑得有点不好意思：「田里缺人手……你要是有空，能不能帮帮我？」',
  },
}

/** 国王任务：严格顺序，骑士以上才会开口 */
export const KING_QUESTS = [
  {
    id: 'king-1',
    owner: 'king',
    no: '01',
    name: '宫廷调酒师',
    desc: '国王要一场只有贵族才配喝的酒局。六种酒，各一瓶，少一种都不算数。',
    require: {
      items: [
        { id: 'brandy', qty: 1 },
        { id: 'whiskey', qty: 1 },
        { id: 'vodka', qty: 1 },
        { id: 'tequila', qty: 1 },
        { id: 'rum', qty: 1 },
        { id: 'gin', qty: 1 },
      ],
    },
    reward: { identity: '男爵', coins: 20 },
  },
  {
    id: 'king-2',
    owner: 'king',
    no: '02',
    name: '长生灵药',
    desc: '国王的旧伤在阴天里发疼。他要五份万能灵药，别的药一概不要。',
    require: { items: [{ id: 'panacea', qty: 5 }] },
    reward: { identity: '子爵', coins: 30 },
  },
  {
    id: 'king-3',
    owner: 'king',
    no: '03',
    name: '所向披靡',
    desc: '国王要你替他清出一片干净的地。接取之后，去杀五十只行尸。',
    hint: '击杀只在曙光阵地结算；都城徽章会阻止你进入曙光，出发前需要先摘下徽章。',
    require: { kills: 50 },
    reward: { identity: '伯爵', coins: 40 },
  },
  {
    id: 'king-4',
    owner: 'king',
    no: '04',
    name: '手枪收藏',
    desc: '国王喜欢收藏手枪。M1911、USP、CZ75、Glock，各一把，摆满他的丝绒盒。',
    hint: '装备中的手枪不计入提交，四把枪都需要放在背包里。',
    require: {
      items: [
        { id: 'm1911', qty: 1 },
        { id: 'usp', qty: 1 },
        { id: 'cz75', qty: 1 },
        { id: 'glock', qty: 1 },
      ],
    },
    reward: { identity: '侯爵', items: [{ id: 'noble-shortsword', qty: 1 }] },
  },
  {
    id: 'king-5',
    owner: 'king',
    no: '05',
    name: '宴会准备',
    desc: '一场宴会正在筹备。十瓶科罗娜、十瓶白威啤酒、十份苹果、越蔓梅与葡萄。',
    require: {
      items: [
        { id: 'corona', qty: 10 },
        { id: 'white-beer', qty: 10 },
        { id: 'apple', qty: 10 },
        { id: 'cranberry', qty: 10 },
        { id: 'grape', qty: 10 },
      ],
    },
    reward: { identity: '公爵', coins: 50 },
  },
  {
    id: 'king-6',
    owner: 'king',
    no: '06',
    name: '清除异己',
    desc: '曙光阵地的首领羿阳，是王宫里不能提起的名字。国王要你亲自去把他从名单上划掉。',
    hint: '接取后到曙光阵地的羿阳页面动手；需要先摘下都城徽章才能进入曙光。',
    require: { boss: 'dawn-leader' },
    reward: { identity: '储君', items: [{ id: 'keel-blade', qty: 1 }], finale: '权力游戏' },
  },
]

/** 皇后任务：完成羿阳任务五并把信交给她后开启 */
export const QUEEN_QUESTS = [
  {
    id: 'queen-1',
    owner: 'queen',
    no: '01',
    name: '消愁',
    desc: '皇后说，看到那封信，就想起一些不愿意想起的事。她需要酒——白威啤酒和科罗娜各五瓶。',
    require: {
      items: [
        { id: 'white-beer', qty: 5 },
        { id: 'corona', qty: 5 },
      ],
    },
    reward: { coins: 20 },
  },
  {
    id: 'queen-2',
    owner: 'queen',
    no: '02',
    name: '国王近况',
    desc: '国王的咳嗽一夜比一夜重。皇后不能亲自送药，只能托你把万能灵药和止痛药放进医师的柜子。',
    require: {
      items: [
        { id: 'panacea', qty: 3 },
        { id: 'painkiller', qty: 10 },
      ],
    },
    reward: { coins: 25 },
  },
  {
    id: 'queen-3',
    owner: 'queen',
    no: '03',
    name: '剑术练习',
    desc: '演练场的剑断得差不多了。皇后想给国王备两把骑士剑，却不愿让人知道是她的意思。',
    require: { items: [{ id: 'knight-sword', qty: 2 }] },
    reward: { coins: 30 },
  },
  {
    id: 'queen-4',
    owner: 'queen',
    no: '04',
    name: '结婚纪念日',
    desc: '今天是他们的结婚纪念日。皇后想送国王一把 M700，可她的名字不该出现在任何一张军械单上。',
    require: { items: [{ id: 'm700', qty: 1 }] },
    reward: {
      items: [{ id: 'longsword-silver-rose', qty: 1 }],
      coins: 40,
      finale: '爱恨情仇',
    },
  },
]

/** 羿阳任务：严格顺序，任务五需要曙光「指挥」身份接取 */
export const YIYANG_QUESTS = [
  {
    id: 'yiyang-1',
    owner: 'yiyang',
    no: '01',
    name: '街区的清道夫',
    desc: '阵地外围的行尸又聚了起来。羿阳要你清出一条能走的路。',
    require: { kills: 10 },
    reward: { dawnCoins: 5 },
  },
  {
    id: 'yiyang-2',
    owner: 'yiyang',
    no: '02',
    name: '补给站的账本',
    desc: '补给站的账目对不上。三份肉罐头、三份鱼罐头、三份压缩饼干，先把这个月的缺口填上。',
    require: {
      items: [
        { id: 'canned-meat', qty: 3 },
        { id: 'canned-fish', qty: 3 },
        { id: 'compressed-biscuit', qty: 3 },
      ],
    },
    reward: { dawnCoins: 6 },
  },
  {
    id: 'yiyang-3',
    owner: 'yiyang',
    no: '03',
    name: '绷带不够用',
    desc: '巡夜的队员伤得比报上来的多。羿阳把医药单递给你：绷带三卷、止血带两条、缝合包一个。',
    require: {
      items: [
        { id: 'bandage', qty: 3 },
        { id: 'tourniquet', qty: 2 },
        { id: 'suture-kit', qty: 1 },
      ],
    },
    reward: { dawnCoins: 8 },
  },
  {
    id: 'yiyang-4',
    owner: 'yiyang',
    no: '04',
    name: '守夜人的名单',
    desc: '守夜的名单越来越长，补给越来越短。羿阳要五瓶矿泉水、五根能量棒、五份全麦面包。',
    require: {
      items: [
        { id: 'mineral-water', qty: 5 },
        { id: 'energy-bar', qty: 5 },
        { id: 'whole-wheat-bread', qty: 5 },
      ],
    },
    reward: { dawnCoins: 8 },
  },
  {
    id: 'yiyang-5',
    owner: 'yiyang',
    no: '05',
    name: '最后的试炼',
    desc: '羿阳要你独自守住一次夜巡。三十只行尸，够不够资格站在他身边。',
    hint: '接取需要曙光「指挥」身份；先在管事处累计击杀 200 只行尸完成晋升。',
    require: { kills: 30, dawnIdentity: '指挥' },
    reward: {
      dawnIdentity: '副首',
      dawnCoins: 12,
      flag: { queenLetter: true },
      note: '羿阳把一封封了蜡的信交给你：如果你哪天能进王宫，把它交给我妹妹。',
    },
  },
]

/** 苏涵任务：替哨塔凑齐口粮，顺序解锁 */
export const NUTRITIONIST_QUESTS = [
  {
    id: 'nutritionist-1',
    owner: 'nutritionist',
    no: '01',
    name: '热汤的底料',
    desc: '苏涵想在配餐台上加一道肉汤。三份肉罐头、三份鱼罐头，先凑出汤底。',
    require: {
      items: [
        { id: 'canned-meat', qty: 3 },
        { id: 'canned-fish', qty: 3 },
      ],
    },
    reward: { dawnCoins: 6 },
  },
  {
    id: 'nutritionist-2',
    owner: 'nutritionist',
    no: '02',
    name: '一份果盘',
    desc: '哨塔里的孩子已经很久没见过新鲜水果。苹果、橙子、葡萄各五份，切成小份分下去。',
    require: {
      items: [
        { id: 'apple', qty: 5 },
        { id: 'orange', qty: 5 },
        { id: 'grape', qty: 5 },
      ],
    },
    reward: { dawnCoins: 9 },
  },
  {
    id: 'nutritionist-3',
    owner: 'nutritionist',
    no: '03',
    name: '营养配餐表',
    desc: '苏涵要把新的配餐表钉在墙上。豆类罐头、腌菜罐头、水果罐头和全麦面包各三份，替下那些只会发霉的东西。',
    require: {
      items: [
        { id: 'canned-beans', qty: 3 },
        { id: 'pickled-veg-can', qty: 3 },
        { id: 'canned-fruit', qty: 3 },
        { id: 'whole-wheat-bread', qty: 3 },
      ],
    },
    reward: { items: [{ id: 'badge-nutritionist', qty: 1 }], dawnCoins: 12 },
  },
]

/** 莉莉任务：修理与拆解，顺序解锁 */
export const MECHANIC_QUESTS = [
  {
    id: 'mechanic-1',
    owner: 'mechanic',
    no: '01',
    name: '拆解练习',
    desc: '莉莉收了一堆废铁，要你带两把战术匕首和一根棒球棍来练手。',
    require: {
      items: [
        { id: 'dagger', qty: 2 },
        { id: 'baseball-bat', qty: 1 },
      ],
    },
    reward: { dawnCoins: 6 },
  },
  {
    id: 'mechanic-2',
    owner: 'mechanic',
    no: '02',
    name: '空药箱',
    desc: '修理台旁边的药箱空了。莉莉不介意替你处理伤口，但材料得你来出：绷带、止血带各五份。',
    require: {
      items: [
        { id: 'bandage', qty: 5 },
        { id: 'tourniquet', qty: 5 },
      ],
    },
    reward: { dawnCoins: 9 },
  },
  {
    id: 'mechanic-3',
    owner: 'mechanic',
    no: '03',
    name: '一张好弓',
    desc: '莉莉想拆一张猎弓，看看弓臂里的钢片还能不能再用。两把猎弓，她要一把研究、一把留底。',
    require: { items: [{ id: 'hunting-bow', qty: 2 }] },
    reward: { items: [{ id: 'badge-mechanic', qty: 1 }], dawnCoins: 12 },
  },
]

/** 薇尔任务：训练与夜巡，顺序解锁 */
export const MERCENARY_QUESTS = [
  {
    id: 'mercenary-1',
    owner: 'mercenary',
    no: '01',
    name: '训练场的靶子',
    desc: '薇尔把一把钝刀扔给你：「先去外面数清楚，十五只。数完再回来谈别的。」',
    require: { kills: 15 },
    reward: { dawnCoins: 6 },
  },
  {
    id: 'mercenary-2',
    owner: 'mercenary',
    no: '02',
    name: '一把顺手的弓',
    desc: '薇尔看上了猎弓。她不说要做什么，只把空出来的枪架擦了一遍。',
    require: { items: [{ id: 'hunting-bow', qty: 1 }] },
    reward: { dawnCoins: 9 },
  },
  {
    id: 'mercenary-3',
    owner: 'mercenary',
    no: '03',
    name: '夜巡',
    desc: '薇尔要你跟她走一趟夜巡。三十只行尸，能回来的人才会被她记住名字。',
    require: { kills: 30 },
    reward: { items: [{ id: 'badge-mercenary', qty: 1 }], dawnCoins: 15 },
  },
]

/** 苗苗任务：实验田的扩建，顺序解锁 */
export const AGRONOMIST_QUESTS = [
  {
    id: 'agronomist-1',
    owner: 'agronomist',
    no: '01',
    name: '第一垄地',
    desc: '苗苗要留种。苹果和香蕉各三份，果肉她做成酱，籽留下来育苗。',
    require: {
      items: [
        { id: 'apple', qty: 3 },
        { id: 'banana', qty: 3 },
      ],
    },
    reward: { dawnCoins: 6 },
  },
  {
    id: 'agronomist-2',
    owner: 'agronomist',
    no: '02',
    name: '换一茬土',
    desc: '第一垄收完之后，苗苗想换一茬土。桃子、越蔓梅、橙子各三份，果核和果皮都能沤进土里。',
    require: {
      items: [
        { id: 'peach', qty: 3 },
        { id: 'cranberry', qty: 3 },
        { id: 'orange', qty: 3 },
      ],
    },
    reward: { dawnCoins: 9 },
  },
  {
    id: 'agronomist-3',
    owner: 'agronomist',
    no: '03',
    name: '扩大试验田',
    desc: '苗苗想再开两垄地。苹果、橙子、葡萄、香蕉、桃子各三份，凑齐这一季的果苗。',
    require: {
      items: [
        { id: 'apple', qty: 3 },
        { id: 'orange', qty: 3 },
        { id: 'grape', qty: 3 },
        { id: 'banana', qty: 3 },
        { id: 'peach', qty: 3 },
      ],
    },
    reward: {
      items: [{ id: 'hunting-bow', qty: 1 }],
      dawnCoins: 15,
      note: '苗苗把一张猎弓塞给你：「没有原野里的那种弓，这张也能用。」',
    },
  },
]

export const QUEST_LINES = {
  king: KING_QUESTS,
  queen: QUEEN_QUESTS,
  yiyang: YIYANG_QUESTS,
  nutritionist: NUTRITIONIST_QUESTS,
  mechanic: MECHANIC_QUESTS,
  mercenary: MERCENARY_QUESTS,
  agronomist: AGRONOMIST_QUESTS,
}

export const QUESTS = Object.fromEntries(
  Object.values(QUEST_LINES)
    .flat()
    .map((quest) => [quest.id, quest]),
)

export function questById(id) {
  return QUESTS[id] ?? null
}

export function questLine(owner) {
  return QUEST_LINES[owner] ?? []
}

/** 非死亡结局文案 */
export const FINALES = {
  权力游戏: {
    title: '权力游戏',
    text:
      '王座上的位置换了一个名字。国王把储君徽章别在你胸前，手很稳。\n\n都城的钟敲了三下。你听见有人在远处喊你的新头衔，也听见更远处传来的、被风吹散的一声枪响。\n\n权力像一场没有尽头的游戏。现在，轮到你上桌了。',
  },
  爱恨情仇: {
    title: '爱恨情仇',
    text:
      '皇后把长剑-银色玫瑰放进你手里，剑鞘上还留着她的手温。\n\n「替我把这封信带给他。」她说，「也替我……替他收尸的时候，别让他一个人。」\n\n你想起都城王座上的国王，也想起曙光哨塔上的男人。他们都要你站队，而她只想两个都保住。\n\n在这座只剩废墟的城里，爱和恨从来分不开。',
  },
  生机: {
    title: '生机',
    text:
      '第一株苗从腐叶底下钻出来的时候，苗苗蹲在田埂上看了很久。\n\n她没说话，只把沾着泥的手在围裙上擦了擦。风穿过废墟，塑料布哗哗作响，田里第一次有了活物拔节的声音。\n\n后来那九棵果苗长成了什么样子，你在路上没有听说。但在这座只剩废墟的城里，有人还在种东西——这件事本身，就是生机。',
  },
  私奔: {
    title: '私奔',
    text:
      '引擎第一次打火就着了。越野车从地下车库冲上坡道，卷帘门被撞开的声音在后视镜里越来越远。\n\n嫣然坐在副驾，风从破碎的车窗灌进来，吹乱了她额前的碎发。她把地图摊在膝盖上，指着一条没有名字的路说：「走这边。」\n\n后备箱里塞着几桶汽油、半箱罐头和一把卷了刃的撬棍。你们不知道前面是什么，但你们在一起。',
  },
  人鱼传说: {
    title: '人鱼传说',
    text:
      '最后一瓶电解质水见底的时候，她的鱼尾已经完全愈合。新生的鳞片在灯下泛着珍珠色的光，像一整片没有风的夜海。\n\n她从水里抬起手，那柄三叉戟-海歌从水雾中浮出来，落进你掌心。「这是我母亲留下的东西。」她说，「现在它归你了。」\n\n她游向卖场尽头的排水口，在消失前回了一次头。你握着渔叉站在原地，掌心还留着海水的凉。',
  },
  希望的火种: {
    title: '希望的火种',
    terminal: true,
    text:
      '倒计时归零的时候，整座发射塔都在抖。嫣然抓住扶手，露露把药箱抱在膝上，陈博士在最后一遍核对数据。\n\n三、二、一——\n\n你们挤在狭小的舱体里，看着脚下那片被丧尸啃过的大地缩成一颗灰点。嫣然忽然笑了一声，说原来从上面看，那些废墟也没有那么吓人。露露没说话，只把一枚罐头塞进你手里。\n\n舷窗外是无尽的黑暗与星辰。舱内有呼吸，有体温，有彼此。\n\n——你们是末日最后的火种，也是最亮的星光。',
  },
  飞向太空: {
    title: '飞向太空',
    terminal: true,
    text:
      '倒计时归零的那一刻，整座发射塔剧烈震颤。你独自坐在狭小的驾驶舱里，安全带勒得胸口发疼。\n\n三、二、一——\n\n火箭冲破大气层。你看着脚下灰蒙蒙的大地渐渐缩小，那些在废墟里挣扎的日夜、那些来不及说出口的告别，全都化作舷窗外一闪而逝的流星。\n\n发射台下，嫣然和露露还站在原地。你看不清她们的脸，只看见两条很小的影子，被尾焰照得发白。\n\n你不知道自己做对了还是做错了。但此刻，你已无法回头。\n\n——你的故事，飞向了未知的星空。',
  },
  留下来吧: {
    title: '留下来吧',
    terminal: true,
    text:
      '你站在舷梯下，看着陈博士、嫣然和露露一个个走上去。嫣然回头看了你一眼，没说话，只把围巾往上拉了拉。\n\n舱门关闭。倒计时开始。\n\n你转身走出发射中心，火箭的轰鸣在身后越来越响。你抬头望去，一道刺目的白光撕裂了灰蒙蒙的天空，像一颗逆行的流星。\n\n他们带着希望走了。你选择留下。\n\n你握紧了手中的武器。这世界还没完，你还要继续战斗。\n\n——只要还有一口气在，故事就不会结束。',
  },
}
