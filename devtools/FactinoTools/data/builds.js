// 16 套流派配置。伤害、排行与耗损全部由 js/build-metrics.js 在页面载入时按 src/data 实时计算，
// 这里只保留构筑选型与说明，不再保存任何旧评测数值。
export const BUILDS = [
  {
    "id": "knight",
    "group": "公会",
    "name": "骑士五维流",
    "tagline": "一把剑吃满 5 个维度，但只在骑士剑上生效",
    "weapon": "knight-sword",
    "talents": {
      "melee": 3,
      "slash": 3
    },
    "guild": "knight",
    "gems": [
      "guardian-gem",
      "tenacity-gem",
      "blood-gem",
      "magic-gem"
    ],
    "alts": [
      "knight-sword"
    ],
    "note": "骑士公会的全部加成（生命上限+20 / 伤害+20 / 暴击+26% / 连击+22% / 爆伤+40%）都锁死在骑士剑上。换任何武器，公会只留一个空壳身份。"
  },
  {
    "id": "warrior",
    "group": "公会",
    "name": "战士白刃流",
    "tagline": "四把白刃各带 +25 平砍，代价是耐久翻倍",
    "weapon": "might-axe",
    "talents": {
      "melee": 3,
      "slash": 3
    },
    "guild": "warrior",
    "gems": [
      "magic-gem",
      "blood-gem",
      "tenacity-gem"
    ],
    "alts": [
      "might-axe",
      "hand-axe",
      "dagger",
      "spear"
    ],
    "note": "公会加成是每击平砍，对低攻击武器边际收益反而更高：战术匕首 +125%，威能战斧只有 +31%。但耐久消耗 ×2，弹匣/耐久周期直接砍半。本流派没有专项天赋，两个启用位全留给近战 3 级 + 挥砍 3 级，这是公会武器池里最高的通用组合。"
  },
  {
    "id": "hunter",
    "group": "公会",
    "name": "猎人弓弩流",
    "tagline": "清洁度不再衰减伤害，这是全场唯一免弹匣税的路子",
    "weapon": "starfall-bow",
    "talents": {
      "ranged": 3,
      "insight": 4
    },
    "guild": "hunter",
    "gems": [
      "magic-gem",
      "blood-gem",
      "tenacity-gem"
    ],
    "alts": [
      "starfall-bow",
      "crossbow",
      "compound-bow",
      "hunting-bow"
    ],
    "note": "猎人公会把清洁度伤害衰减整个抹掉（其余 36 把远程全都要交 26.8% 伤害税），代价是清洁度消耗 ×2、每匣只有 25 发。弓弩训练的要害洞察按满层爆伤计入期望，与免清洁度衰减叠加后，天星之弓同时吃到高攻、高爆与不吃衰减三份收益。"
  },
  {
    "id": "assassinate",
    "group": "专项",
    "name": "暗杀背刺流",
    "tagline": "连击打完之后再来一刀三段暗刃",
    "weapon": "butterfly-gold",
    "talents": {
      "assassinate": 4,
      "melee": 3
    },
    "guild": null,
    "gems": [
      "magic-gem",
      "blood-gem",
      "tenacity-gem"
    ],
    "alts": [
      "butterfly-gold",
      "spring-knife-aurora",
      "karambit-ghost",
      "butterfly-silver",
      "spring-knife-monochrome",
      "kukri",
      "knuckle-blade",
      "dagger",
      "triangular-bayonet",
      "karambit-classic",
      "fruit-knife",
      "kitchen-knife"
    ],
    "wlKey": "assassinate",
    "note": "背刺是每回合一次的三段独立掷算（攻击 ×30% / ×20% / ×10%），每段各自判定暴击，暴击率只吃武器自身暴击 + 魔化层数——不吃天赋暴击、不吃公会暴击。额外再扣 1 点耐久。"
  },
  {
    "id": "blunt",
    "group": "专项",
    "name": "钝击碎骨流",
    "tagline": "骨层叠到 10 层，钝器伤害翻倍",
    "weapon": "royal-scepter",
    "talents": {
      "blunt": 4,
      "melee": 3
    },
    "guild": null,
    "gems": [
      "blood-gem",
      "guardian-gem",
      "tenacity-gem",
      "magic-gem"
    ],
    "alts": [
      "royal-scepter",
      "chainsaw",
      "crowbar",
      "baseball-bat",
      "nunchaku",
      "pipe-wrench",
      "claw-hammer",
      "baton"
    ],
    "wlKey": "blunt",
    "note": "碎骨每击掷一次，命中就在僵尸身上叠一层骨，每层 +10% 伤害，满 10 层 ×2。骨层挂在僵尸身上、战斗内持续、换一只怪就清零——所以这是 BOSS 战构筑，不是清杂构筑。"
  },
  {
    "id": "block",
    "group": "专项",
    "name": "格挡坦伤流",
    "tagline": "50% 概率格挡，最高把受击伤害砍半",
    "weapon": "frost-greatsword",
    "talents": {
      "block": 4,
      "melee": 3
    },
    "guild": null,
    "gems": [
      "guardian-gem",
      "tenacity-gem",
      "blood-gem",
      "magic-gem"
    ],
    "alts": [
      "frost-greatsword",
      "scarlet-greatsword",
      "entrenching-tool",
      "frying-pan"
    ],
    "wlKey": "block",
    "note": "格挡天赋只减伤：50% 概率格挡，4 级减伤 50%，再叠守护宝石 −20% 受伤；它没有任何反击或追加伤害，所以这张卡的每回合输出不随格挡等级变化，等级只体现在击杀回合与胜率上。武器选寒霜大剑-冰晶：连击与爆伤都在格挡名单顶端；猩红巨剑攻击更高、耐久更长，但连击与爆伤低得多，纯输出反而落后。"
  },
  {
    "id": "draw",
    "group": "专项",
    "name": "拔刀切割流",
    "tagline": "每回合追加目标 20% 最大生命的真实伤害",
    "weapon": "katana-raikiri",
    "talents": {
      "draw": 4,
      "melee": 3
    },
    "guild": null,
    "gems": [
      "magic-gem",
      "blood-gem",
      "tenacity-gem"
    ],
    "alts": [
      "katana-raikiri",
      "katana-dusk",
      "tang-dao",
      "short-katana"
    ],
    "wlKey": "draw",
    "note": "拔刀是真实伤害，无视护甲、无视血线加成，直接按目标最大生命的 20% 结算（世界 BOSS 封顶 200）。对高血量目标是纯粹的数值，对小怪几乎无效。"
  },
  {
    "id": "sword",
    "group": "专项",
    "name": "致命一击流",
    "tagline": "3% 概率处决首击，对 BOSS 封顶 500",
    "weapon": "longsword-rose-dark",
    "talents": {
      "sword": 4,
      "melee": 3
    },
    "guild": null,
    "gems": [
      "magic-gem",
      "blood-gem",
      "tenacity-gem"
    ],
    "alts": [
      "longsword-rose-dark",
      "longsword-frost",
      "longsword-silver-rose",
      "knight-sword",
      "crusader-cross-sword",
      "noble-shortsword",
      "keel-blade"
    ],
    "wlKey": "sword",
    "note": "致命一击只替换每回合第一击：触发时该击伤害直接等于僵尸当前生命（世界BOSS封顶 500），不再叠加暴击与连击；未触发时按正常连击结算。对满血小怪，触发反而可能低于正常首击，所以它的价值在收尾高血量目标，而不是抬高单回合期望。"
  },
  {
    "id": "arena",
    "group": "专项",
    "name": "拳击连击流",
    "tagline": "拳头天赋只认空手和指虎两类",
    "weapon": "knuckle-gold",
    "talents": {
      "arena": 4,
      "melee": 3
    },
    "guild": null,
    "gems": [
      "blood-gem",
      "tenacity-gem",
      "guardian-gem",
      "magic-gem"
    ],
    "alts": [
      "knuckle-gold",
      "knuckle-silver",
      "unarmed",
      "knuckle"
    ],
    "note": "拳头天赋（连击 +60%、伤害 +20）只对空手与指虎生效，指虎-银使 27.6 裸装但 +拳4+近战3 = 250.4/回合；空手同套 120/回合且耐久无限。珍宝商店刻意把两把指虎排除在外。"
  },
  {
    "id": "sniper",
    "group": "专项",
    "name": "狙击贯穿流",
    "tagline": "每发追加 50% 攻击力，直通护甲",
    "weapon": "m82a1",
    "talents": {
      "sniper": 4,
      "ranged": 3
    },
    "guild": null,
    "gems": [
      "blood-gem",
      "tenacity-gem",
      "magic-gem"
    ],
    "alts": [
      "m82a1",
      "awm",
      "daylight-sniper",
      "t3x",
      "mosin",
      "svd",
      "m700"
    ],
    "wlKey": "sniper",
    "note": "贯穿是每发一次追加 round(攻击 × 50%)，不吃暴击、不吃清洁度衰减、不吃护甲减伤。对高攻击狙击枪是纯增益，也是全游戏最稳的单发倍率路线。"
  },
  {
    "id": "pistol",
    "group": "专项",
    "name": "手枪暴击流",
    "tagline": "手枪池唯一能把爆伤拉到 +1.0 的路线",
    "weapon": "blood-raven",
    "talents": {
      "pistol": 4,
      "ranged": 3
    },
    "guild": null,
    "gems": [
      "blood-gem",
      "tenacity-gem",
      "magic-gem"
    ],
    "alts": [
      "blood-raven",
      "desert-eagle",
      "gp100",
      "fn57",
      "m1911",
      "luger-08",
      "cz75",
      "usp",
      "pm",
      "glock"
    ],
    "wlKey": "pistol",
    "note": "手枪天赋 4 级 = 暴击 +20% + 爆伤 +1.0，是全部 8 条专项训练里唯一给爆伤的。爆能手枪-血鸦自带 65% 暴击 / 2.65 爆伤，配上手枪 4 级后爆伤 3.65，是全场最高的单发暴击倍率。"
  },
  {
    "id": "spray",
    "group": "专项",
    "name": "冲锋泼射流",
    "tagline": "按天赋概率一次泼出三发，额外再扣 1 清洁度",
    "weapon": "mpx",
    "talents": {
      "spray": 4,
      "ranged": 3
    },
    "guild": null,
    "gems": [
      "blood-gem",
      "tenacity-gem",
      "magic-gem"
    ],
    "alts": [
      "mpx",
      "victor",
      "ump45",
      "mp5",
      "uzi",
      "mac10"
    ],
    "wlKey": "spray",
    "note": "泼射追加 40%+25%+10% 三段伤害，每段独立判定暴击并按爆伤放大；仍不吃清洁度乘子——它在清洁度已经掉到 30% 以下（输出腰斩）时反而是净正收益。代价是额外 −1 清洁度。"
  },
  {
    "id": "assault",
    "group": "专项",
    "name": "步战突击流",
    "tagline": "突击天赋只认步枪，暴击、爆伤与攻击一起抬",
    "weapon": "m7",
    "talents": {
      "assault": 4,
      "ranged": 3
    },
    "guild": null,
    "gems": [
      "blood-gem",
      "tenacity-gem",
      "magic-gem"
    ],
    "alts": [
      "m7",
      "hk416",
      "royal-lance",
      "m14",
      "scar",
      "aug",
      "fal",
      "mini14",
      "akm",
      "m4a1",
      "ar15"
    ],
    "wlKey": "assault",
    "note": "突击天赋在三项属性上同时给步枪加成：暴击率是绝对值叠加，爆伤按倍率相加（与手枪天赋同一口径），攻击+N 直接加在武器攻击力上再算清洁度乘子。近战、手枪、冲锋枪与狙击枪都不在白名单里，拿不到任何一项。"
  },
  {
    "id": "sweep",
    "group": "专项",
    "name": "横扫千军流",
    "tagline": "每轮第一刀先横扫，再用连击收尾",
    "weapon": "kraken-blade",
    "talents": {
      "sweep": 4,
      "melee": 3
    },
    "guild": null,
    "gems": [
      "magic-gem",
      "blood-gem",
      "tenacity-gem"
    ],
    "alts": [
      "kraken-blade",
      "might-axe",
      "hand-axe",
      "mountain-chopper",
      "fire-axe",
      "huan-shou-dao",
      "scimitar",
      "snake-sword",
      "cleaver",
      "sickle"
    ],
    "wlKey": "sweep",
    "note": "横扫只加成每轮第一记横劈，连击追加段不吃加成。沧龙之刃本身高攻高爆，横扫把它的第一刀抬到近战池顶端；威能战斧则靠战士公会的平砍加成，是公会池里唯一的高攻横扫武器。"
  },
  {
    "id": "polearm",
    "group": "专项",
    "name": "长枪贯刺流",
    "tagline": "暴击时多耗耐久，换一记贯刺",
    "weapon": "trident",
    "talents": {
      "polearm": 4,
      "melee": 3
    },
    "guild": null,
    "gems": [
      "magic-gem",
      "blood-gem",
      "tenacity-gem"
    ],
    "alts": [
      "trident",
      "spear",
      "halberd"
    ],
    "wlKey": "polearm",
    "note": "单枪匹马只在暴击且耐久足够时触发：额外消耗耐久，把这一击的伤害翻倍；耐久不足会自动退回普通结算。三叉戟-海歌的暴击与爆伤都在长杆池顶端，长矛则靠战士公会的平砍补低攻。"
  },
  {
    "id": "bulldozer",
    "group": "专项",
    "name": "霰弹推土流",
    "tagline": "闪避成功就反打，霰弹多出一套输出",
    "weapon": "aa12",
    "talents": {
      "bulldozer": 4,
      "corridor": 4
    },
    "guild": null,
    "gems": [
      "magic-gem",
      "blood-gem",
      "tenacity-gem"
    ],
    "alts": [
      "aa12",
      "meteor-shotgun",
      "henry-lever",
      "m870"
    ],
    "wlKey": "bulldozer",
    "note": "推土机把闪避成功变成第二套输出来源：每次闪避追加多段攻击，每段独立判定暴击。AA12 的基础攻击与爆伤更高，闪避触发后的追加段也更重；陨星靠更高的武器闪避把段数机会拉满，但单发伤害更弱。"
  }
]
