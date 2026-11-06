// 公会贡献商店限定宝石：背包内被动生效，或每天有限次主动使用

/** 魔化宝石叠层规则：每层临时暴击 +5%，最多 20 层，打出暴击后清空全部层数 */
export const MAGIC_GEM_STACK = {
  max: 20,
  critPerStack: 0.05,
}

/** 时间宝石：主动快进天数、冷却天数，以及镰刀吸血概率 / 最大生命比例 */
export const TIME_GEM = {
  advanceDays: 3,
  cooldownDays: 3,
  lifestealChance: 0.2,
  lifestealRatio: 0.1,
}

const MAGIC_CRIT_PERCENT = Math.round(MAGIC_GEM_STACK.critPerStack * 100)
const TIME_GEM_LIFESTEAL_PERCENT = Math.round(TIME_GEM.lifestealChance * 100)
const TIME_GEM_LIFESTEAL_RATIO_PERCENT = Math.round(TIME_GEM.lifestealRatio * 100)

function gem(id, name, description, extra = {}) {
  return {
    id,
    name,
    category: 'gem',
    image: `/image/宝石/${name}.webp`,
    description,
    stackable: false,
    maxStack: 1,
    ...extra,
  }
}

const GEM_LIST = [
  gem('angel-gem', '天使宝石',
    '握在手里能听见很轻的羽翼声。使用后全属性恢复 20%（感染值 -20%），一天可免费使用 4 次，战斗中也有效，宝石不会消失。', {
      effects: { hp: 20, hunger: 20, thirst: 20, sanity: 20, stamina: 20, infection: -20 },
      special: 'angel-gem',
      limited: true,
    }),
  gem('time-gem', '时间宝石',
    `宝石内部像有一圈走不完的钟面。使用后快进 ${TIME_GEM.advanceDays} 天，不产生任何属性消耗，之后冷却 ${TIME_GEM.cooldownDays} 天（按游戏天数计算）。装备镰刀类武器时，攻击有 ${TIME_GEM_LIFESTEAL_PERCENT}% 概率吸取 ${TIME_GEM_LIFESTEAL_RATIO_PERCENT}% 最大生命。宝石不会消失。`, {
      special: 'time-gem',
      limited: true,
    }),
  gem('tenacity-gem', '坚毅宝石',
    '背包内被动生效：战斗中生命归零时不会立刻死亡，每场战斗触发一次；触发后你的下一次攻击额外造成 100% 伤害。', {
      passive: true,
      limited: true,
    }),
  gem('guardian-gem', '守护宝石',
    '背包内被动生效：骑士剑伤害 +40，受到的所有伤害减免 20%。', {
      passive: true,
      limited: true,
    }),
  gem('magic-gem', '魔化宝石',
    `背包内被动生效：每次攻击未造成暴击时叠加一层魔化，暴击率临时 +${MAGIC_CRIT_PERCENT}%，最多 ${MAGIC_GEM_STACK.max} 层；打出暴击会清空全部层数。`, {
      passive: true,
      limited: true,
    }),
  gem('blood-gem', '焚血宝石',
    '背包内被动生效：生命低于 80% 时造成的伤害 +10%，低于 50% 时 +25%，低于 20% 时 +40%。', {
      passive: true,
      limited: true,
    }),
  gem('ocean-gem', '海洋宝石',
    '背包内被动生效：深海潜水时氧气消耗减半，潜水战斗时近战伤害额外 +20。', {
      passive: true,
      limited: true,
    }),
  gem('fairy-gem', '精灵宝石',
    '背包内被动生效：持有时解锁睡觉里的精灵茶会（每日 2 次）与大精灵床（每日 1 次）。', {
      passive: true,
      limited: true,
    }),
  gem('developer-gem', '开发者宝石',
    '开发者留下的捷径。使用后直接传送到「郊区卖场」，消耗 1 回合；战斗中无法使用，宝石不会消失，也无法丢弃。', {
      special: 'developer-gem',
      limited: true,
    }),
]

export const GEM_ITEMS = Object.fromEntries(GEM_LIST.map((item) => [item.id, item]))
