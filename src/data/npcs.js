// 具名 NPC 的统一属性表：战斗数值、所在地与死亡标记
function npc(id, name, hp, attack, extra = {}) {
  return {
    id,
    name,
    hp,
    attack,
    infection: 0,
    dodge: 0,
    abilities: [],
    mapId: null,
    deathFlag: `${id}Killed`,
    deathLine: `${name}倒下了。`,
    description: '',
    ...extra,
  }
}

export const NPCS = {
  nutritionist: npc('nutritionist', '营养师·苏涵', 130, 13, {
    mapId: 'dawn-post',
    dodge: 0.08,
    deathFlag: 'nutritionistKilled',
    description: '配餐台的围裙上还沾着汤渍。她赤手空拳，但知道每一把刀放在哪里。',
    deathLine: '苏涵靠在配餐台边滑了下去，汤锅还在火上咕嘟作响。',
  }),
  mechanic: npc('mechanic', '机械师·莉莉', 160, 16, {
    mapId: 'dawn-post',
    dodge: 0.1,
    deathFlag: 'mechanicKilled',
    description: '修理台上摊着拆到一半的枪，她的扳手比任何人的动作都快。',
    deathLine: '莉莉手里的扳手掉在地上，修理台的灯还亮着。',
  }),
  mercenary: npc('mercenary', '雇佣兵·薇尔', 200, 22, {
    mapId: 'dawn-post',
    dodge: 0.18,
    deathFlag: 'mercenaryKilled',
    description: '训练场的铁丝网边靠着一个从不离枪的人。她早就看出你眼神不对。',
    deathLine: '薇尔最后笑了一下，像是终于确认自己没看错人。',
  }),
  agronomist: npc('agronomist', '农学家·苗苗', 110, 11, {
    mapId: 'dawn-post',
    dodge: 0.06,
    deathFlag: 'agronomistKilled',
    description: '她蹲在田埂边，指尖沾着泥，手边只有一把用来除草的小铲。',
    deathLine: '苗苗倒在田埂上，手里的泥还没干。',
  }),
  yiyang: npc('dawn-leader', '首领·羿阳', 360, 22, {
    mapId: 'dawn-post',
    deathFlag: 'dawnLeaderKilled',
    description: '他站在哨塔顶层，背对着你，手按在刀柄上。',
    deathLine: '羿阳倒下了。哨塔顶层安静得只能听见自己的心跳。',
  }),
  queen: npc('queen', '皇后·米娅', 240, 19, {
    mapId: 'ruined-city',
    dodge: 0.12,
    deathFlag: 'queenKilled',
    description: '王宫最深处的女人，袖口里藏着一封哥哥写来的信。',
    deathLine: '米娅把那封信按在胸口，直到最后也没有松开。',
  }),
  king: npc('king', '国王·艾伦', 320, 25, {
    mapId: 'ruined-city',
    dodge: 0.1,
    deathFlag: 'kingKilled',
    description: '他坐在王座上，指尖一下一下敲着扶手，像在等一个迟到的臣子。',
    deathLine: '艾伦从王座上滑了下去。敲击声停了，整座大厅安静下来。',
  }),
  maSan: npc('ma-san', '冷面阿三', 110, 18, {
    mapId: 'mountain-camp',
    dodge: 0.12,
    deathFlag: 'maSanKilled',
    description: '围裙上全是洗不掉的深色污渍，砧板边靠着一支 AKM。',
    deathLine: '阿三倒在砧板旁。烧烤摊不会再开张了。',
  }),
  mermaid: npc('mermaid', '人鱼公主', 200, 21, {
    mapId: 'suburb-market',
    dodge: 0.2,
    deathFlag: 'mermaidKilled',
    description: '她蜷在水族箱的浅水里，鱼尾上的伤口已经发白。',
    deathLine: '水族箱里的水慢慢平静下来，只剩一层盐霜。',
  }),
  banker: npc('banker', '行长·金钱堡', 250, 30, {
    mapId: 'ruined-city',
    description:
      '他坐在银行最里面的隔间，金丝眼镜后面是一双从不吃亏的眼睛。柜台上摆着一本翻开的账本。',
    deathFlag: 'bankerKilled',
    deathLine: '金钱堡靠在椅子上，账本从手边滑了下去。',
  }),
  doctor: npc('doctor', '陈博士', 140, 10, {
    mapId: 'x-lab',
    dodge: 0.05,
    deathFlag: 'doctorKilled',
    description: '一个戴厚眼镜的中年男人，白大褂下摆烧焦了一角，手里还护着试管。',
    deathLine: '陈博士倒在一排培养槽之间，手里的试管终于松开了。',
  }),
  mafei: npc('mafei', '马斐', 260, 24, {
    mapId: 'mountain-barracks',
    dodge: 0.15,
    deathFlag: 'mafeiKilled',
    description: '山地军营里那个总在擦枪的男人。他说话时从不看你的眼睛。',
    deathLine: '马斐倒在自己的营房门口，枪还在手里。',
  }),
  yanran: npc('yanran', '半感染者·嫣然', 95, 17, {
    mapId: 'core-district',
    infection: 2,
    dodge: 0.1,
    abilities: ['infect'],
    deathFlag: 'yanranKilled',
    description: '她的半张脸还是人的样子，另外半张已经烂到了骨头。',
    deathLine: '她终于安静下来。你认不出那张脸了，但还是替她把眼睛合上。',
  }),
  lulu: npc('lulu', '露露', 80, 8, {
    mapId: 'public-hospital',
    dodge: 0.04,
    deathFlag: 'luluKilled',
    description: '护士站后面那个瘦得脱了形的人影，白大褂上全是干涸的褐色。',
    deathLine: '她倒下去的时候，手里还攥着一只空罐头。',
  }),
  schika: npc('schika', '伯爵·席卡', 220, 24, {
    mapId: 'doomsday-airship',
    dodge: 0.1,
    deathFlag: 'airshipSchikaDefeated',
    description: '他第一个从座位上站起来，把餐巾叠好放在桌沿，像只是要去跳一支舞。',
    deathLine: '席卡单膝跪地，随后整个人伏了下去。高台周围安静了一瞬。',
  }),
  nubi: npc('nubi', '伯爵·努比', 260, 28, {
    mapId: 'doomsday-airship',
    dodge: 0.14,
    deathFlag: 'airshipNubiDefeated',
    description: '他比席卡更沉得住气，手里那支拆信刀一直没有放下。',
    deathLine: '努比靠在高台栏杆上滑坐下来，拆信刀从指间掉了。',
  }),
  moran: npc('moran', '公爵·漠然', 320, 32, {
    mapId: 'doomsday-airship',
    dodge: 0.16,
    deathFlag: 'airshipMoranDefeated',
    description: '漠然坐在最高处，从始至终没有看席卡和努比一眼，只看着你。',
    deathLine: '漠然终于起身，又终于坐下。他的手按在扶手上，没有再抬起来。',
  }),
  giantPuppet: npc('giant-puppet', '巨型丧尸傀儡', 260, 28, {
    mapId: 'spaceport',
    dodge: 0.12,
    deathFlag: 'giantPuppetDefeated',
    description: '三倍于常人的体型，四肢被金属框架固定，身上的管线还亮着暗红色的光。',
    deathLine: '傀儡跪下去的时候，金属框架一节节散开。',
  }),
}

export function npcById(id) {
  if (!id) return null
  if (NPCS[id]) return NPCS[id]
  return Object.values(NPCS).find((npc) => npc.id === id) ?? null
}
