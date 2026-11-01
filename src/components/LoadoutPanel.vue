<script setup>
import { computed } from 'vue'
import {
  CLEANLINESS_MAX,
  UNARMED,
  cleanlinessJamChance,
  cleanlinessMultiplier,
  countUsedSlots,
  getItem,
} from '../data'
import { formatCritDamage, formatPercent } from '../game/format'
import { game, unequipMelee, unequipRanged } from '../game/store'

const equippedDef = computed(() => {
  const equipped = game.equipment.melee
  return equipped ? (getItem(equipped.id) ?? UNARMED) : UNARMED
})

const isEquipped = computed(() => Boolean(game.equipment.melee))
const melee = computed(() => equippedDef.value.weapon)
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
const rangedEffectiveAttack = computed(() =>
  Math.round((rangedWeapon.value?.attack ?? 0) * rangedDamageScale.value),
)
const rangedJam = computed(() => cleanlinessJamChance(rangedCleanliness.value))
const rangedState = computed(() => {
  if (!isRangedEquipped.value) return '空 · 无法开火'
  if (rangedCleanliness.value <= 0) return '需保养'
  if (rangedJam.value > 0) return '卡壳风险'
  return '已装备'
})

const percent = formatPercent
const critDamage = formatCritDamage
</script>

<template>
  <aside class="loadout">
    <header class="loadout__head">
      <span class="eyebrow">显示面板</span>
      <span class="loadout__bag">背包 · {{ usedSlots }} / {{ game.inventory.length }} 格</span>
    </header>

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
          <b>{{ melee.attack }}</b>
        </div>
        <div class="stat">
          <span>暴击</span>
          <b>{{ percent(melee.crit) }}</b>
        </div>
        <div class="stat">
          <span>暴伤</span>
          <b>{{ critDamage(melee.critDamage) }}</b>
        </div>
        <div class="stat">
          <span>连击</span>
          <b>{{ percent(melee.combo) }}</b>
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
          <b>{{ rangedEffectiveAttack }}</b>
        </div>
        <div class="stat">
          <span>暴击</span>
          <b>{{ percent(rangedWeapon.crit) }}</b>
        </div>
        <div class="stat">
          <span>暴伤</span>
          <b>{{ critDamage(rangedWeapon.critDamage) }}</b>
        </div>
        <div class="stat">
          <span>闪避</span>
          <b>{{ percent(rangedWeapon.dodge) }}</b>
        </div>
        <div class="stat">
          <span>卡壳</span>
          <b>{{ percent(rangedJam) }}</b>
        </div>
        <div class="stat stat--wide">
          <span>清洁度</span>
          <b>{{ rangedCleanliness }} / {{ CLEANLINESS_MAX }} · 伤害 {{ percent(rangedDamageScale) }}</b>
        </div>
      </div>
    </section>
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

@media (max-width: 900px) {
  .loadout {
    padding: 14px;
  }
}
</style>
