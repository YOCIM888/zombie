// 公会贡献商店限定宝石：背包内被动生效，或每天有限次主动使用
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
    '握在手里能听见很轻的羽翼声。使用后生命 +30，一天可免费使用 3 次，宝石不会消失。', {
      effects: { hp: 30 },
      special: 'angel-gem',
      limited: true,
    }),
  gem('time-gem', '时间宝石',
    '宝石内部像有一圈走不完的钟面。使用后时间快进 3 回合，不产生回合消耗，一天只能使用一次。', {
      special: 'time-gem',
      limited: true,
    }),
  gem('tenacity-gem', '坚毅宝石',
    '背包内被动生效：战斗中生命归零时不会立刻死亡，但下一次攻击仍会带走你。', {
      passive: true,
      limited: true,
    }),
  gem('guardian-gem', '守护宝石',
    '背包内被动生效：骑士剑伤害 +20，受到的伤害减免 10%。', {
      passive: true,
      limited: true,
    }),
  gem('magic-gem', '魔化宝石',
    '背包内被动生效：每次攻击未造成暴击时叠加一层魔化，暴击率临时 +2%；打出暴击会清空全部层数。', {
      passive: true,
      limited: true,
    }),
  gem('blood-gem', '焚血宝石',
    '背包内被动生效：生命低于 50% 时造成的伤害 +20%，生命低于 20% 时造成的伤害 +40%。', {
      passive: true,
      limited: true,
    }),
  gem('ocean-gem', '海洋宝石',
    '背包内被动生效：深海潜水时氧气消耗减半。', {
      passive: true,
      limited: true,
    }),
  gem('fairy-gem', '精灵宝石',
    '背包内被动生效：小憩和睡觉不再产生饱食与口渴的负面消耗。', {
      passive: true,
      limited: true,
    }),
]

export const GEM_ITEMS = Object.fromEntries(GEM_LIST.map((item) => [item.id, item]))
