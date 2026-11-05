// 14 套流派配置。伤害、排行与耗损全部由 js/build-metrics.js 在页面载入时按 src/data 实时计算，
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
      "melee": 3
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
      "spear",
      "dagger"
    ],
    "note": "公会加成是每击平砍，对低攻击武器边际收益反而更高：战术匕首 +125%，油锯只有 +37%。但耐久消耗 ×2，弹匣/耐久周期直接砍半。"
  },
  {
    "id": "hunter",
    "group": "公会",
    "name": "猎人弓弩流",
    "tagline": "清洁度不再衰减伤害，这是全场唯一免弹匣税的路子",
    "weapon": "starfall-bow",
    "talents": {
      "ranged": 3,
      "corridor": 4
    },
    "guild": "hunter",
    "gems": [
      "magic-gem",
      "blood-gem",
      "tenacity-gem"
    ],
    "alts": [
      "starfall-bow",
      "compound-bow",
      "crossbow",
      "hunting-bow"
    ],
    "note": "猎人公会把清洁度伤害衰减整个抹掉（其余 36 把远程全都要交 26.8% 伤害税），代价是清洁度消耗 ×2、每匣只有 25 发。"
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
      "kukri",
      "knuckle-blade",
      "triangular-bayonet",
      "karambit-classic",
      "fruit-knife"
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
      "crowbar",
      "baseball-bat",
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
    "weapon": "scarlet-greatsword",
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
      "scarlet-greatsword",
      "frost-greatsword",
      "entrenching-tool",
      "frying-pan"
    ],
    "wlKey": "block",
    "note": "格挡是防守向：50% 触发，4 级减伤 50%，再叠守护宝石 −20% 受伤，等于把坦克尸的 30 点攻击打到 7.5 点。收益不体现在 DPS 表上，体现在你能多活几回合。"
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
      "short-katana"
    ],
    "wlKey": "draw",
    "note": "拔刀是真实伤害，无视护甲、无视血线加成，直接按目标最大生命的 20% 结算（世界 BOSS 封顶 200）。对高血量目标是纯粹的数值，对小怪几乎无效。"
  },
  {
    "id": "sword",
    "group": "专项",
    "name": "致命一击流",
    "tagline": "3% 概率一击必杀，对 BOSS 封顶 500",
    "weapon": "longsword-silver-rose",
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
      "longsword-silver-rose",
      "longsword-frost",
      "longsword-rose-dark",
      "crusader-cross-sword",
      "keel-blade",
      "noble-shortsword"
    ],
    "wlKey": "sword",
    "note": "致命一击只替换「第一击」的伤害，直接等于僵尸当前生命（BOSS 封顶 500 点）。所以它不是加法，是一场赌博：3% 概率直接清场，97% 概率这一回合白打。"
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
      "unarmed"
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
      "daylight-sniper",
      "m82a1",
      "awm",
      "t3x",
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
      "scar",
      "m14"
    ],
    "wlKey": "assault",
    "note": "突击天赋在三项属性上同时给步枪加成：暴击率是绝对值叠加，爆伤按倍率相加（与手枪天赋同一口径），攻击+N 直接加在武器攻击力上再算清洁度乘子。近战、手枪、冲锋枪与狙击枪都不在白名单里，拿不到任何一项。"
  },
  {
    "id": "corridor",
    "group": "专项",
    "name": "闪避逃课流",
    "tagline": "用 60% 闪避换回合数，靠耗而不是靠秒",
    "weapon": "meteor-shotgun",
    "talents": {
      "corridor": 4,
      "ranged": 3
    },
    "guild": null,
    "gems": [
      "tenacity-gem",
      "guardian-gem",
      "blood-gem",
      "magic-gem"
    ],
    "alts": [
      "meteor-shotgun",
      "victor"
    ],
    "note": "闪避是「僵尸打空你」的概率，不影响你的输出，只影响你能不能活到下一回合。机械霰弹-陨星自带 60% 闪避 + 闪避天赋 20% = 80% 闪避，但它是限定枪且伤害只有 83.2。"
  }
]
