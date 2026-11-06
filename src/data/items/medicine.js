// 药品：使用后立即结算，全部可堆叠
function medicine(id, name, effects, description, extra = {}) {
  return {
    id,
    name,
    category: 'medicine',
    image: `/image/药品/${name}.webp`,
    description,
    stackable: true,
    maxStack: 999,
    effects,
    ...extra,
  }
}

const MEDICINE_LIST = [
  medicine('band-aid', '创可贴', { hp: 10 },
    '一小片医用胶布，盖住擦伤就够了，别指望它对付咬痕。'),
  medicine('tourniquet', '止血带', { hp: 20 },
    '橡胶带勒住上臂，阻断的不只是血流，也挡住了正在扩散的东西。'),
  medicine('bandage', '绷带', { hp: 30 },
    '卷起的旧纱布，压住伤口，血会慢慢止住。'),
  medicine('suture-kit', '缝合包', { hp: 50 },
    '针线、碘伏和一块干净的布。缝上的伤口不会再裂开。'),
  medicine('medical-kit', '医疗箱', { hp: 80 },
    '一只鼓鼓的医疗箱，器械与药品塞得拉链都快合不上。', {
      image: '/image/药品/医疗箱.webp',
    }),
  medicine('military-first-aid-kit', '军用急救包', { hp: 100 },
    '帆布包压着军徽，里面是压缩敷料、止血粉和一整卷绷带。'),
  medicine('painkiller', '止痛药', { sanity: 30 },
    '白色药片，吞下去之后，疼的地方会变得很远。'),
  medicine('sedative', '镇静剂', { sanity: 60 },
    '透明安瓿里的药液很凉，推下去之后，耳朵里的声音会慢慢退远。'),
  medicine('antibiotic', '抗生素', { infection: -30 },
    '一板过期的胶囊，对付伤口里的东西比对付感冒更有用。'),
  medicine('anti-infection-shot', '抗感染针', { infection: -50 },
    '一支浑浊的药剂，推下去之后喉咙里全是苦味。'),
  medicine('adrenaline', '肾上腺素', { hp: 30, stamina: 30, sanity: -10 },
    '扎进大腿，心跳立刻撞到耳朵里，手也不再抖了。'),
  medicine('stamina-shot', '体能针', { stamina: 80, sanity: -30 },
    '针管上贴着褪色的标签，扎下去之后腿会先于脑子做出反应。'),
  medicine('panacea', '万能灵药', { hp: 50, thirst: 50, sanity: 50, stamina: 50, infection: -50 },
    '标签上没有成分，只有一行手写的字：喝下去。'),
]

export const MEDICINE_ITEMS = Object.fromEntries(MEDICINE_LIST.map((item) => [item.id, item]))
