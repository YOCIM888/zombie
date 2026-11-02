// 药品：使用后立即结算，全部可堆叠
function medicine(id, name, effects, description) {
  return {
    id,
    name,
    category: 'medicine',
    image: `/image/药品/${name}.webp`,
    description,
    stackable: true,
    maxStack: 999,
    effects,
  }
}

const MEDICINE_LIST = [
  medicine('bandage', '绷带', { hp: 30 },
    '卷起的旧纱布，压住伤口，血会慢慢止住。'),
  medicine('tourniquet', '止血带', { hp: 10, sanity: 10 },
    '橡胶带勒住上臂，阻断的不只是血流，也挡住了正在扩散的东西。'),
  medicine('painkiller', '止痛药', { hp: 15, infection: -15 },
    '白色药片，吞下去之后，疼的地方会变得很远。'),
  medicine('suture-kit', '缝合包', { hp: 50 },
    '针线、碘伏和一块干净的布。缝上的伤口不会再裂开。'),
  medicine('anti-infection-shot', '抗感染针', { infection: -50 },
    '一支浑浊的药剂，推下去之后喉咙里全是苦味。'),
  medicine('adrenaline', '肾上腺素', { hp: 20, stamina: 40 },
    '扎进大腿，心跳立刻撞到耳朵里，手也不再抖了。'),
  medicine('medical-kit', '医疗箱', { hp: 80, infection: -20 },
    '整箱的器械与药品，足够把一个人从边缘拉回来。'),
  medicine('panacea', '万能灵药', { hp: 100, infection: -40, sanity: 20 },
    '标签上没有成分，只有一行手写的字：喝下去。'),
]

export const MEDICINE_ITEMS = Object.fromEntries(MEDICINE_LIST.map((item) => [item.id, item]))
