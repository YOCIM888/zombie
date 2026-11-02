// 远程武器：按六档稀有度录入
// 不使用弹药与耐久，弹药机制由清洁度替代（清洁度随开火下降，越低伤害越差、越容易卡壳）

export const RANGED_TIERS = ['普通', '稀有', '精良', '史诗', '传说', '神话', '限定']

/** 生成一件远程武器（图片默认按武器名对应 public/image/远程武器） */
function ranged(id, name, tier, weapon, description, extra = {}) {
  return {
    id,
    name,
    tier,
    category: 'ranged',
    image: `/image/远程武器/${name}.webp`,
    description,
    stackable: false,
    maxStack: 1,
    weapon,
    ...extra,
  }
}

const RANGED_LIST = [
  /* ===== 普通 ===== */
  ranged('hunting-bow', '猎弓', '普通', {
    attack: 20, crit: 0.14, critDamage: 1.35, dodge: 0.22,
  }, '桦木弓身，弓弦换过好几回，拉满时会发出一声轻响。'),
  ranged('cz75', 'CZ75', '普通', {
    attack: 22, crit: 0.12, critDamage: 1.3, dodge: 0.18,
  }, '握把磨得发亮，弹匣里的簧片有点松，但还能打。'),
  ranged('glock', 'Glock', '普通', {
    attack: 20, crit: 0.1, critDamage: 1.28, dodge: 0.16,
  }, '没有多余的保险，拔出来就能扣，剩下只看手稳不稳。'),
  ranged('m1911', 'M1911', '普通', {
    attack: 26, crit: 0.11, critDamage: 1.35, dodge: 0.15,
  }, '老式击锤手枪，后坐力顶得手腕发麻，声音却让人安心。'),
  ranged('usp', 'USP', '普通', {
    attack: 21, crit: 0.12, critDamage: 1.3, dodge: 0.18,
  }, '枪身上刻过使用者的名字，大半已经被划掉了。'),

  /* ===== 稀有 ===== */
  ranged('compound-bow', '复合弓', '稀有', {
    attack: 38, crit: 0.22, critDamage: 1.55, dodge: 0.26,
  }, '滑轮和钢缆让拉弓省了一半力气，箭出去却更狠。'),
  ranged('crossbow', '十字弩', '稀有', {
    attack: 46, crit: 0.16, critDamage: 1.5, dodge: 0.2,
  }, '弩臂上还留着猎场的编号，上弦得用两只手。'),
  ranged('fn57', 'FN57', '稀有', {
    attack: 34, crit: 0.2, critDamage: 1.45, dodge: 0.22,
  }, '轻得像玩具，子弹却能咬穿旧防弹衣。'),
  ranged('gp100', 'GP100', '稀有', {
    attack: 42, crit: 0.18, critDamage: 1.45, dodge: 0.2,
  }, '左轮转轮里还剩三发，合上时的金属声很实在。'),
  ranged('mac10', 'MAC10', '稀有', {
    attack: 32, crit: 0.16, critDamage: 1.4, dodge: 0.24,
  }, '简陋的冲锋枪，射速快得不像话，枪口会往上跳。'),
  ranged('m870', 'M870', '稀有', {
    attack: 52, crit: 0.1, critDamage: 1.5, dodge: 0.16,
  }, '泵动霰弹枪，推拉护木的声音在走廊里传得很远。'),

  /* ===== 精良 ===== */
  ranged('mp5', 'MP5', '精良', {
    attack: 52, crit: 0.24, critDamage: 1.55, dodge: 0.28,
  }, '标准的警用冲锋枪，准星和握把都被人仔细保养过。'),
  ranged('uzi', 'UZI', '精良', {
    attack: 50, crit: 0.22, critDamage: 1.5, dodge: 0.27,
  }, '短小、可靠，弹匣直接插在握把里。'),
  ranged('ump45', 'UMP45', '精良', {
    attack: 56, crit: 0.2, critDamage: 1.6, dodge: 0.25,
  }, '枪托能折叠，适合在车里或楼道里开火。'),
  ranged('m4a1', 'M4A1', '精良', {
    attack: 68, crit: 0.26, critDamage: 1.6, dodge: 0.3,
  }, '导轨上挂过瞄具，如今只剩一个空卡扣。'),
  ranged('ar15', 'AR15', '精良', {
    attack: 62, crit: 0.27, critDamage: 1.55, dodge: 0.28,
  }, '半自动，枪管还很直，扳机组有点涩。'),
  ranged('akm', 'AKM', '精良', {
    attack: 72, crit: 0.2, critDamage: 1.7, dodge: 0.24,
  }, '木托磨出了包浆，导气管里的积碳怎么也刮不干净。'),
  ranged('mini14', 'Mini14', '精良', {
    attack: 74, crit: 0.28, critDamage: 1.65, dodge: 0.26,
  }, '轻便的射手步枪，适合从二楼窗口点射。'),
  ranged('m700', 'M700', '精良', {
    attack: 88, crit: 0.34, critDamage: 1.7, dodge: 0.22,
  }, '栓动步枪，拉机柄要用力才顺畅，准得让人上瘾。'),

  /* ===== 史诗 ===== */
  ranged('desert-eagle', '沙漠之鹰', '史诗', {
    attack: 96, crit: 0.26, critDamage: 1.85, dodge: 0.26,
  }, '握在手里像块铁砖，开一枪整个房间都在响。'),
  ranged('aug', 'AUG', '史诗', {
    attack: 92, crit: 0.3, critDamage: 1.8, dodge: 0.32,
  }, '无托结构，贴腮时能感觉到里面复进簧的震动。'),
  ranged('scar', 'SCAR', '史诗', {
    attack: 105, crit: 0.28, critDamage: 1.85, dodge: 0.3,
  }, '战斗步枪，枪身泛着哑光的沙色，弹壳落得很重。'),
  ranged('mosin', '莫辛纳甘', '史诗', {
    attack: 112, crit: 0.36, critDamage: 1.85, dodge: 0.2,
  }, '一把比爷爷还老的栓动枪，木托上刻满划痕。'),

  /* ===== 传说 ===== */
  ranged('victor', 'Victor', '传说', {
    attack: 104, crit: 0.4, critDamage: 2, dodge: 0.4,
  }, '短行程后坐，枪声像一声压低的哨响，弹着点几乎连成一线。'),
  ranged('aa12', 'AA12', '传说', {
    attack: 138, crit: 0.18, critDamage: 2, dodge: 0.28,
  }, '全自动霰弹枪，弹鼓沉得压手，扣下去几乎不需要瞄准。'),
  ranged('t3x', 'T3X', '传说', {
    attack: 122, crit: 0.4, critDamage: 2, dodge: 0.26,
  }, '轻量栓动枪，枪托上贴着早已褪色的狩猎许可。'),

  /* ===== 神话 ===== */
  ranged('awm', 'AWM', '神话', {
    attack: 175, crit: 0.48, critDamage: 2.25, dodge: 0.36,
  }, '军方留下的最后一批狙击枪，弹盒上写着一行字：只为一个人准备。'),

  /* ===== 限定 ===== */
  ranged('royal-lance', '皇家长枪', '限定', {
    attack: 66, crit: 0.66, critDamage: 1.66, dodge: 0.16,
  }, '枪管细长，鎏金纹路从枪托一路延伸到枪口。', {
    limited: true,
    image: '/image/末日都城限定/皇家长枪.webp',
  }),
]

export const RANGED_ITEMS = Object.fromEntries(RANGED_LIST.map((item) => [item.id, item]))
