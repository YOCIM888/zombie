// 身份徽章：不可堆叠，拥有徽章即拥有对应身份
// faction 区分阵营：city = 末日都城，dawn = 曙光阵地；两个阵营的身份互斥
// 纪念徽章（memento）只是纪念品，不参与身份判定
function badge(id, name, identityLevel, description, faction = 'city') {
  return {
    id,
    name,
    category: 'identity',
    faction,
    identityLevel,
    image: `/image/身份徽章/${name}.webp`,
    description,
    stackable: false,
    maxStack: 1,
  }
}

function memento(id, name, description) {
  return {
    id,
    name,
    category: 'memento',
    image: `/image/纪念徽章/${name}.webp`,
    description,
    stackable: false,
    maxStack: 1,
  }
}

const BADGE_LIST = [
  /* ===== 末日都城 ===== */
  badge('badge-common', '都城平民徽章', '平民',
    '都城衙门发的铁皮牌，边角磨得发亮。至少能让你在街上不被驱赶。'),
  badge('badge-knight', '都城骑士徽章', '骑士',
    '铜制，背面刻着编号。守卫看到它会侧身让路。'),
  badge('badge-baron', '都城男爵徽章', '男爵',
    '镀银的牌子，边缘压着细密的纹路。'),
  badge('badge-viscount', '都城子爵徽章', '子爵',
    '嵌着一小粒暗红宝石，握在手里有些凉。'),
  badge('badge-earl', '都城伯爵徽章', '伯爵',
    '厚实的金边牌子，佩在胸前会压得衣领下沉。'),
  badge('badge-marquis', '都城侯爵徽章', '侯爵',
    '刻着展翼的纹章。戴着它走过长廊，没人敢直视你。'),
  badge('badge-duke', '都城公爵徽章', '公爵',
    '沉甸甸的纯金，纹章中心嵌着一颗黑石。'),
  badge('badge-heir', '都城储君徽章', '储君',
    '王宫最深处的牌子。拿到它的人，离王座只差一步。'),

  /* ===== 曙光阵地 ===== */
  badge('badge-dawn-initiate', '曙光见习徽章', '见习',
    '刚在名册上留下名字的人领到的薄铁片。背面还留着没擦干净的旧字。', 'dawn'),
  badge('badge-dawn-member', '曙光队员徽章', '队员',
    '薄铁片，正面压着一枚半升的太阳。哨塔里的人认得这个记号。', 'dawn'),
  badge('badge-dawn-captain', '曙光队长徽章', '队长',
    '边角磨圆的铜牌，背面刻着带过的小队编号。', 'dawn'),
  badge('badge-dawn-command', '曙光指挥徽章', '指挥',
    '黑铁底子上嵌着一条银线，代表整段防线的调度权。', 'dawn'),
  badge('badge-dawn-deputy', '曙光总督徽章', '总督',
    '唯一的暗金徽章。戴上它，哨塔的每一盏灯都听你的。', 'dawn'),
  badge('badge-dawn-leader', '曙光领袖徽章', '领袖',
    '压在最深处的一枚旧徽章，边缘已经磨得发白。还没有人拿到过它。', 'dawn'),

  /* ===== 纪念徽章（不参与身份） ===== */
  memento('badge-nutritionist', '营养师徽章',
    '苏涵用旧围裙上的布条缝的。背面绣着一行小字：今天也要好好吃饭。'),
  memento('badge-mechanic', '机械师徽章',
    '一块磨薄的黄铜片，边缘留着钳痕。莉莉说，能修的东西就不该被扔掉。'),
  memento('badge-mercenary', '雇佣兵徽章',
    '一枚被子弹擦过的狗牌，薇尔把它磨平了，刻上你的名字。'),
  memento('badge-farming-master', '农业大师徽章',
    '苗苗从日记本里取出来的旧徽章。土黄色的珐琅掉了一角，仍能看出麦穗的纹路。'),

  /* ===== 发射徽章：火箭维修三段任务的凭证 ===== */
  memento('power-badge', '动力徽章',
    '陈博士从发电机外壳上拧下来的铭牌，背面刻着一个「动」字。'),
  memento('fuel-badge', '燃料徽章',
    '沾着淡蓝色能源残渍的铜片。凑近看，里面像有一小团光在流动。'),
  memento('supply-badge', '生存徽章',
    '用罐头铁皮压成的圆牌，边缘粗糙，正面刻着一株很小的麦穗。'),
]

export const BADGE_ITEMS = Object.fromEntries(BADGE_LIST.map((item) => [item.id, item]))
