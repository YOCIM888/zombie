// 时间、回合消耗与休息规则

/** 一天八个回合 */
export const PHASES = ['凌晨', '清晨', '上昼', '中午', '下昼', '黄昏', '夜晚', '午夜']

/** 每回合固定扣除 5 点口渴 / 饱食 / 体力/理智 */
export const TURN_COST = { thirst: -5, hunger: -5, stamina: -5, sanity: -5 }

/** 进入一张地图时的固定消耗 */
export const ENTRY_COST = { thirst: -5, hunger: -5, stamina: -5, sanity: -5 }

export const REST_OPTIONS = {
  nap: {
    id: 'nap',
    name: '小憩',
    turns: 1,
    desc: '靠在沙发上合眼片刻，醒来时天光只挪了一格。',
    effects: { hp: 10, thirst: -5, hunger: -5, sanity: 10, stamina: 10 },
  },
  sleep: {
    id: 'sleep',
    name: '睡觉',
    turns: 4,
    desc: '把门反锁，躺回床上。这一次睡得很沉。',
    effects: { hp: 50, thirst: -20, hunger: -20, sanity: 50, stamina: 50 },
  },
  tea: {
    id: 'tea',
    name: '精灵茶会',
    turns: 1,
    gemOnly: true,
    dailyLimit: 2,
    dropCategory: 'drink',
    desc: '精灵们围坐在杯沿上，替你续了三次水。醒来时茶杯还是温的。',
    effects: { hp: 10, thirst: 5, hunger: 5, sanity: 10, stamina: 10 },
  },
  bed: {
    id: 'bed',
    name: '大精灵床',
    turns: 4,
    gemOnly: true,
    dailyLimit: 1,
    dropCategory: 'medicine',
    desc: '藤蔓把你托进一张铺满苔藓的床。精灵在枕边守了一整夜。',
    effects: { hp: 50, sanity: 50, stamina: 50 },
  },
}

export function phaseLabel(index) {
  return PHASES[index] ?? PHASES[0]
}
