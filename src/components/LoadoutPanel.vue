<script setup>
import { computed } from 'vue'
import {
  CLEANLINESS_MAX,
  UNARMED,
  cleanlinessJamChance,
  cleanlinessMultiplier,
  countUsedSlots,
  getItem,
  isFistTalentWeapon,
  talentBonus,
  talentEffects,
  UTOPIA_TRAINING_BY_KIND,
} from '../data'
import {
  formatCritDamage,
  formatPercent,
} from '../game/format'
import {
  activeGuild,
  game,
  isTalentActive,
  unequipMelee,
  unequipRanged,
} from '../game/store'

defineProps({
  wide: { type: Boolean, default: false },
})

const equippedDef = computed(() => {
  const equipped = game.equipment.melee
  return equipped ? (getItem(equipped.id) ?? UNARMED) : UNARMED
})

const isEquipped = computed(() => Boolean(game.equipment.melee))
const melee = computed(() => equippedDef.value.weapon)
const activeGuildInfo = computed(() => activeGuild())
const hasItem = (id) => game.inventory.some((entry) => entry?.id === id)

/** 数值加成：10 + 5 -> 10（+5 拳头） */
function valueBreakdown(base, parts) {
  const active = parts.filter(([, value]) => Number(value) > 0)
  const text = active
    .map(([label, value]) => `+${Math.round(Number(value))} ${label}`)
    .join(' ')
  return active.length ? `${Math.round(Number(base) || 0)}（${text}）` : `${Math.round(Number(base) || 0)}`
}

/** 百分比加成：10% + 5% -> 10%（+5% 远程） */
function percentBreakdown(base, parts) {
  const active = parts.filter(([, value]) => Number(value) > 0)
  const text = active
    .map(([label, value]) => `+${formatPercent(Number(value))} ${label}`)
    .join(' ')
  return active.length ? `${formatPercent(base)}（${text}）` : formatPercent(base)
}

/** 爆伤加成：1.6 + 0.4 -> 1.6×（+0.4 骑士公会） */
function timesBreakdown(base, parts) {
  const active = parts.filter(([, value]) => Number(value) > 0)
  const text = active
    .map(([label, value]) => `+${Number(value)} ${label}`)
    .join(' ')
  return active.length ? `${formatCritDamage(base)}（${text}）` : formatCritDamage(base)
}

const activeMeleeBonus = computed(() =>
  isTalentActive('melee') ? talentBonus('melee', game.talents.melee) : 0,
)
const activeArena = computed(() =>
  isFistTalentWeapon(game.equipment.melee) && isTalentActive('arena')
    ? talentEffects('arena', game.talents.arena)
    : {},
)
const knightMelee = computed(
  () =>
    activeGuildInfo.value?.id === 'knight' &&
    game.equipment.melee?.id === 'knight-sword',
)
const warriorMelee = computed(
  () =>
    activeGuildInfo.value?.id === 'warrior' &&
    activeGuildInfo.value.weaponIds?.includes(game.equipment.melee?.id),
)
const meleeAttackText = computed(() => {
  const parts = []
  if (activeArena.value.damage) parts.push(['拳头', activeArena.value.damage])
  if ((knightMelee.value || warriorMelee.value) && activeGuildInfo.value?.damageBonus) {
    parts.push([activeGuildInfo.value.name, activeGuildInfo.value.damageBonus])
  }
  if (knightMelee.value && hasItem('guardian-gem')) parts.push(['守护', 40])
  return valueBreakdown(melee.value.attack ?? 0, parts)
})
const meleeCritText = computed(() => {
  const parts =
    knightMelee.value && activeGuildInfo.value?.critBonus
      ? [[activeGuildInfo.value.name, activeGuildInfo.value.critBonus]]
      : []
  return percentBreakdown(melee.value.crit ?? 0, parts)
})
const meleeCritDamageText = computed(() => {
  const parts =
    knightMelee.value && activeGuildInfo.value?.critDamageBonus
      ? [[activeGuildInfo.value.name, activeGuildInfo.value.critDamageBonus]]
      : []
  return timesBreakdown(melee.value.critDamage ?? 0, parts)
})
const meleeComboText = computed(() => {
  const parts = []
  if (activeMeleeBonus.value > 0) parts.push(['近战', activeMeleeBonus.value])
  if (activeArena.value.combo) parts.push(['拳头', activeArena.value.combo])
  if (knightMelee.value && activeGuildInfo.value?.comboBonus) {
    parts.push([activeGuildInfo.value.name, activeGuildInfo.value.comboBonus])
  }
  return percentBreakdown(melee.value.combo ?? 0, parts)
})
const usedSlots = computed(() => countUsedSlots(game.inventory))

const durabilityText = computed(() => {
  if (!isEquipped.value) return '无限'
  const max = equippedDef.value.weapon.durability
  if (!Number.isFinite(max)) return '无限'
  return `${game.equipment.melee.durability ?? max} / ${max}`
})

const isRangedEquipped = computed(() => Boolean(game.equipment.ranged))
const rangedDef = computed(() => {
  const equipped = game.equipment.ranged
  return equipped ? getItem(equipped.id) : null
})
const rangedWeapon = computed(() => rangedDef.value?.weapon ?? null)
const rangedCleanliness = computed(() => {
  const value = game.equipment.ranged?.cleanliness
  return Number.isFinite(value) ? value : CLEANLINESS_MAX
})
const rangedDamageScale = computed(() => cleanlinessMultiplier(rangedCleanliness.value))
const rangedJam = computed(() => cleanlinessJamChance(rangedCleanliness.value))
const rangedHunter = computed(
  () =>
    activeGuildInfo.value?.id === 'hunter' &&
    activeGuildInfo.value.weaponIds?.includes(game.equipment.ranged?.id),
)
const rangedPistol = computed(() =>
  UTOPIA_TRAINING_BY_KIND.pistol.weaponIds.includes(game.equipment.ranged?.id) &&
  isTalentActive('pistol')
    ? talentEffects('pistol', game.talents.pistol)
    : {},
)
const rangedAttackText = computed(() => {
  const base = Math.round(
    (rangedWeapon.value?.attack ?? 0) *
      (rangedHunter.value ? 1 : rangedDamageScale.value),
  )
  const parts =
    rangedHunter.value && activeGuildInfo.value?.damageBonus
      ? [[activeGuildInfo.value.name, activeGuildInfo.value.damageBonus]]
      : []
  return valueBreakdown(base, parts)
})
const rangedCritText = computed(() => {
  const parts = []
  const rangedTalent = isTalentActive('ranged')
    ? talentBonus('ranged', game.talents.ranged)
    : 0
  if (rangedTalent > 0) parts.push(['远程', rangedTalent])
  if (rangedPistol.value.crit) parts.push(['手枪', rangedPistol.value.crit])
  return percentBreakdown(rangedWeapon.value?.crit ?? 0, parts)
})
const rangedCritDamageText = computed(() => {
  const parts =
    rangedPistol.value.critDamage > 0
      ? [['手枪', rangedPistol.value.critDamage]]
      : []
  return timesBreakdown(rangedWeapon.value?.critDamage ?? 0, parts)
})
const rangedDodgeText = computed(() => {
  const corridor = isTalentActive('corridor')
    ? talentBonus('corridor', game.talents.corridor)
    : 0
  const parts = corridor > 0 ? [['闪避', corridor]] : []
  return percentBreakdown(rangedWeapon.value?.dodge ?? 0, parts)
})
const rangedState = computed(() => {
  if (!isRangedEquipped.value) return '空 · 无法开火'
  if (rangedCleanliness.value <= 0) return '需保养'
  if (rangedJam.value > 0) return '卡壳风险'
  return '已装备'
})

/** 当前装备能触发的天赋，显示在面板中 */
const talentChips = computed(() => {
  const meleeId = game.equipment.melee?.id
  const rangedId = game.equipment.ranged?.id
  const chips = []
  if (isTalentActive('draw') && UTOPIA_TRAINING_BY_KIND.draw.weaponIds.includes(meleeId)) {
    chips.push(`拔刀切割 ${formatPercent(talentEffects('draw', game.talents.draw).cutChance)}`)
  }
  if (isTalentActive('sword') && UTOPIA_TRAINING_BY_KIND.sword.weaponIds.includes(meleeId)) {
    chips.push(
      `致命一击 ${formatPercent(talentEffects('sword', game.talents.sword).executeChance)}`,
    )
  }
  if (isTalentActive('sniper') && UTOPIA_TRAINING_BY_KIND.sniper.weaponIds.includes(rangedId)) {
    chips.push(
      `贯穿 ${formatPercent(talentEffects('sniper', game.talents.sniper).pierceChance)}`,
    )
  }
  if (isTalentActive('spray') && UTOPIA_TRAINING_BY_KIND.spray.weaponIds.includes(rangedId)) {
    chips.push(
      `泼射 ${formatPercent(talentEffects('spray', game.talents.spray).sprayChance)}`,
    )
  }
  if (isTalentActive('block') && UTOPIA_TRAINING_BY_KIND.block.weaponIds.includes(meleeId)) {
    const block = talentEffects('block', game.talents.block)
    chips.push(
      `格挡 ${formatPercent(block.blockChance)} · 减伤 ${formatPercent(block.blockReduction)}`,
    )
  }
  return chips
})

const percent = formatPercent
</script>

<template>
  <aside class="loadout" :class="{ 'loadout--wide': wide }">
    <header class="loadout__head">
      <span class="eyebrow">显示面板</span>
      <span class="loadout__bag">背包 · {{ usedSlots }} / {{ game.inventory.length }} 格</span>
    </header>

    <div class="loadout__blocks">
      <section class="block">
        <div class="block__head">
          <h3 class="block__title">近战</h3>
        <span class="block__state">{{ isEquipped ? '已装备' : '空 · 默认拳头' }}</span>
      </div>

      <div class="weapon">
        <div class="weapon__visual" :class="{ 'weapon__visual--empty': !isEquipped }">
          <img
            v-if="isEquipped && equippedDef.image"
            :src="equippedDef.image"
            :alt="equippedDef.name"
          />
          <span v-else class="weapon__fist">拳</span>
        </div>

        <div class="weapon__info">
          <div class="weapon__name">
            {{ equippedDef.name }}
            <span v-if="!isEquipped" class="weapon__tag">默认</span>
          </div>
          <p class="weapon__desc">{{ equippedDef.description }}</p>
          <p class="weapon__durability">耐久 <b>{{ durabilityText }}</b></p>
        </div>
      </div>

      <div v-if="isEquipped" class="weapon__actions">
        <button type="button" class="btn" @click="unequipMelee">卸下武器</button>
      </div>

      <div class="stats">
        <div class="stat">
          <span>攻击</span>
          <b>{{ meleeAttackText }}</b>
        </div>
        <div class="stat">
          <span>暴击</span>
          <b>{{ meleeCritText }}</b>
        </div>
        <div class="stat">
          <span>暴伤</span>
          <b>{{ meleeCritDamageText }}</b>
        </div>
        <div class="stat">
          <span>连击</span>
          <b>{{ meleeComboText }}</b>
        </div>
        <div class="stat stat--wide">
          <span>耐久</span>
          <b>{{ durabilityText }}</b>
        </div>
      </div>
    </section>

    <div class="hairline" />

    <section class="block">
      <div class="block__head">
        <h3 class="block__title">远程</h3>
        <span class="block__state">{{ rangedState }}</span>
      </div>

      <div class="weapon" :class="{ 'weapon--quiet': !isRangedEquipped }">
        <div class="weapon__visual" :class="{ 'weapon__visual--empty': !isRangedEquipped }">
          <img
            v-if="isRangedEquipped && rangedDef.image"
            :src="rangedDef.image"
            :alt="rangedDef.name"
          />
          <span v-else class="weapon__fist weapon__fist--small">空</span>
        </div>

        <div class="weapon__info">
          <div class="weapon__name">
            {{ isRangedEquipped ? rangedDef.name : '未装备远程武器' }}
            <span v-if="isRangedEquipped" class="weapon__tag">{{ rangedDef.tier }}</span>
          </div>
          <p class="weapon__desc">
            {{
              isRangedEquipped
                ? rangedDef.description
                : '远程槽位空着。在背包里选中远程武器，点「装备远程位」即可开火。'
            }}
          </p>
          <p v-if="isRangedEquipped" class="weapon__durability">
            清洁度 <b>{{ rangedCleanliness }} / {{ CLEANLINESS_MAX }}</b>
          </p>
        </div>
      </div>

      <div v-if="isRangedEquipped" class="weapon__actions">
        <button type="button" class="btn" @click="unequipRanged">卸下远程武器</button>
      </div>

      <div v-if="isRangedEquipped" class="stats">
        <div class="stat">
          <span>攻击</span>
          <b>{{ rangedWeapon.attack }}</b>
        </div>
        <div class="stat">
          <span>实际伤害</span>
          <b>{{ rangedAttackText }}</b>
        </div>
        <div class="stat">
          <span>暴击</span>
          <b>{{ rangedCritText }}</b>
        </div>
        <div class="stat">
          <span>暴伤</span>
          <b>{{ rangedCritDamageText }}</b>
        </div>
        <div class="stat">
          <span>闪避</span>
          <b>{{ rangedDodgeText }}</b>
        </div>
        <div class="stat">
          <span>卡壳</span>
          <b>{{ percent(rangedJam) }}</b>
        </div>
        <div class="stat stat--wide">
          <span>清洁度</span>
          <b>
            {{ rangedCleanliness }} / {{ CLEANLINESS_MAX }} · 伤害
            {{ rangedHunter ? '100%（猎人公会不衰减）' : percent(rangedDamageScale) }}
          </b>
        </div>
      </div>
    </section>
    <div v-if="talentChips.length" class="talents">
      <span v-for="chip in talentChips" :key="chip" class="talent">{{ chip }}</span>
    </div>
    </div>
  </aside>
</template>

<style scoped>
.loadout {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 16px 18px 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.02);
}

.loadout__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.loadout__blocks {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.loadout--wide .loadout__blocks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 26px;
  align-items: start;
}

.loadout--wide .hairline {
  display: none;
}

.loadout__bag {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.block__title {
  margin: 0;
  font-family: var(--font-title);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: var(--text);
}

.block__state {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
}

.weapon {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.weapon--quiet {
  opacity: 0.72;
}

.weapon__visual {
  position: relative;
  width: 92px;
  height: 92px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-strong);
  background: radial-gradient(circle at 50% 40%, rgba(205, 185, 141, 0.1), transparent 70%);
  overflow: hidden;
}

.weapon__visual img {
  width: 82%;
  height: 82%;
  object-fit: contain;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.55));
}

.weapon__visual--empty {
  border-style: dashed;
  background: none;
}

.weapon__fist {
  font-family: var(--font-title);
  font-size: 34px;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}

.weapon__fist--small {
  font-size: 20px;
  color: var(--text-mute);
}

.weapon__info {
  min-width: 0;
  flex: 1;
}

.weapon__name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  letter-spacing: 0.1em;
  color: var(--text);
}

.weapon__tag {
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
  border: 1px solid var(--line);
  padding: 1px 5px;
}

.weapon__desc {
  margin: 7px 0 0;
  font-size: 10.5px;
  line-height: 1.7;
  letter-spacing: 0.02em;
  color: var(--text-mute);
}

.weapon__durability {
  margin: 8px 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--text-dim);
}

.weapon__durability b {
  color: var(--bone);
  font-weight: 500;
}

.weapon__actions {
  margin-top: 12px;
}

.weapon__actions .btn {
  height: 30px;
  padding: 0 14px;
  font-size: 11px;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  margin-top: 14px;
  background: var(--line);
  border: 1px solid var(--line);
}

.stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 11px;
  background: #0d0f10;
}

.stat--wide {
  grid-column: span 2;
}

.stat span {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--text-mute);
}

.stat b {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--bone);
}

.talents {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.loadout--wide .talents {
  grid-column: span 2;
}

.talent {
  padding: 3px 8px;
  border: 1px solid var(--line-strong);
  background: rgba(205, 185, 141, 0.05);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--bone);
}

@media (max-width: 900px) {
  .loadout {
    padding: 14px;
  }

  .loadout--wide .loadout__blocks {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .loadout--wide .hairline {
    display: block;
  }
}
</style>
