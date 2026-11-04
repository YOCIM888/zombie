// 乌托邦城六公会徽章：持有即代表公会身份，不与都城 / 曙光身份冲突
function guildBadge(id, name, guildId, description) {
  return {
    id,
    name,
    category: 'guild',
    guildId,
    image: `/image/公会徽章/${name}.webp`,
    description,
    stackable: false,
    maxStack: 1,
  }
}

const GUILD_BADGES = [
  guildBadge('guild-hunter', '猎人公会徽章', 'hunter',
    '一枚刻着展翼箭矢的铜章。握着它时，弓弦的声音会比平时更清楚。'),
  guildBadge('guild-warrior', '战士公会徽章', 'warrior',
    '边缘被刀口磕出缺口的铁章，正面是一柄交叉的短剑。'),
  guildBadge('guild-priest', '牧师公会徽章', 'priest',
    '旧银章上压着一只合拢的手，背面还留着药草的苦味。'),
  guildBadge('guild-rogue', '盗贼公会徽章', 'rogue',
    '黑铁小牌，图案是一只没有眼睛的猫。它从不承认自己属于谁。'),
  guildBadge('guild-poet', '诗人公会徽章', 'poet',
    '薄薄的铜片，刻着一行读不清的诗。佩戴者据说很难真正倒下。'),
  guildBadge('guild-knight', '骑士公会徽章', 'knight',
    '沉甸甸的银章，纹章是一柄立在盾后的长剑。只有真正的骑士才配得上它。'),
]

export const GUILD_ITEMS = Object.fromEntries(GUILD_BADGES.map((item) => [item.id, item]))
