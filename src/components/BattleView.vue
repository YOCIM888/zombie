<script setup>
import { computed, ref } from 'vue'
import { STAT_DEFS } from '../game/config'
import {
  CLEANLINESS_MAX,
  DAWN_FLEE_CHANCE,
  HARBOR_MUTINY,
  MAGIC_GEM_STACK,
  RANGED_BASE,
  SEA_OXYGEN_COST,
  UNARMED,
  ZOMBIE_ABILITY_LABELS,
  cleanlinessJamChance,
  cleanlinessMultiplier,
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
import { activeGuild, game, isTalentActive } from '../game/store'
import {
  battle,
  fleeBattle,
  meleeAttack,
  rangedAttack,
  useBattleItem,
} from '../game/battle'

const emit = defineEmits(['done'])
const bagOpen = ref(false)

const STAT_LABELS = Object.fromEntries(STAT_DEFS.map((stat) => [stat.key, stat.label]))

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

const melee = computed(() => {
  const equipped = game.equipment.melee
  const def = equipped ? getItem(equipped.id) : null
  const weapon = def?.weapon ?? UNARMED.weapon
  const guild = activeGuild()
  const knight = guild?.id === 'knight' && def?.id === 'knight-sword'
  const warrior = guild?.id === 'warrior' && guild.weaponIds?.includes(def?.id)
  const arena =
    isFistTalentWeapon(equipped) && isTalentActive('arena')
      ? talentEffects('arena', game.talents.arena)
      : {}
  const meleeTalent = isTalentActive('melee')
    ? talentBonus('melee', game.talents.melee)
    : 0
  const attackParts = []
  if (arena.damage) attackParts.push(['拳头', arena.damage])
  if ((knight || warrior) && guild?.damageBonus) {
    attackParts.push([guild.name, guild.damageBonus])
  }
  if (hasItem('guardian-gem') && def?.id === 'knight-sword') attackParts.push(['守护', 40])
  if (hasItem('ocean-gem') && battle.kind === 'deep-sea') attackParts.push(['海洋', 20])
  const critParts = []
  if (knight && guild?.critBonus) critParts.push([guild.name, guild.critBonus])
  const critDamageParts = []
  if (knight && guild?.critDamageBonus) critDamageParts.push([guild.name, guild.critDamageBonus])
  const comboParts = []
  if (meleeTalent > 0) comboParts.push(['近战', meleeTalent])
  if (arena.combo) comboParts.push(['拳头', arena.combo])
  if (knight && guild?.comboBonus) comboParts.push([guild.name, guild.comboBonus])
  return {
    name: def?.name ?? UNARMED.name,
    attackText: valueBreakdown(weapon.attack ?? 0, attackParts),
    critText: percentBreakdown(weapon.crit ?? 0, critParts),
    critDamageText: timesBreakdown(weapon.critDamage ?? 0, critDamageParts),
    comboText: percentBreakdown(weapon.combo ?? 0, comboParts),
  }
})

const ranged = computed(() => {
  const equipped = game.equipment.ranged
  const def = equipped ? getItem(equipped.id) : null
  const cleanliness = equipped
    ? Number.isFinite(equipped.cleanliness)
      ? equipped.cleanliness
      : CLEANLINESS_MAX
    : 0
  const weapon = def?.weapon ?? RANGED_BASE
  const guild = activeGuild()
  const hunter = guild?.id === 'hunter' && guild.weaponIds?.includes(def?.id)
  const hunterBonus = hunter ? (guild.damageBonus ?? 0) : 0
  const rangedTalent = isTalentActive('ranged')
    ? talentBonus('ranged', game.talents.ranged)
    : 0
  const pistol =
    UTOPIA_TRAINING_BY_KIND.pistol.weaponIds.includes(def?.id) && isTalentActive('pistol')
      ? talentEffects('pistol', game.talents.pistol)
      : {}
  const assault =
    UTOPIA_TRAINING_BY_KIND.assault.weaponIds.includes(def?.id) && isTalentActive('assault')
      ? talentEffects('assault', game.talents.assault)
      : {}
  const critParts = []
  if (rangedTalent > 0) critParts.push(['远程', rangedTalent])
  if (pistol.crit) critParts.push(['手枪', pistol.crit])
  if (assault.crit) critParts.push(['突击', assault.crit])
  const critDamageParts = []
  if (pistol.critDamage) critDamageParts.push(['手枪', pistol.critDamage])
  if (assault.critDamage) critDamageParts.push(['突击', assault.critDamage])
  const corridor = isTalentActive('corridor')
    ? talentBonus('corridor', game.talents.corridor)
    : 0
  const dodgeParts = corridor > 0 ? [['闪避', corridor]] : []
  const attackBase = Math.round(
    ((weapon.attack ?? 0) + (assault.damage ?? 0)) *
      (hunter ? 1 : cleanlinessMultiplier(cleanliness)),
  )
  const attackParts = hunterBonus ? [[guild.name, hunterBonus]] : []
  return {
    name: def?.name ?? '未装备',
    cleanliness,
    canFire: Boolean(def?.weapon) && cleanliness > 0,
    attackText: valueBreakdown(attackBase, attackParts),
    critText: percentBreakdown(weapon.crit ?? 0, critParts),
    critDamageText: timesBreakdown(weapon.critDamage ?? 0, critDamageParts),
    dodgeText: percentBreakdown(weapon.dodge ?? 0, dodgeParts),
    jamChance: cleanlinessJamChance(cleanliness),
  }
})

/** 当前装备对应的触发型天赋，显示在战斗状态栏 */
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
  const slash = talentEffects('slash', game.talents.slash)
  if (isTalentActive('slash') && slash.damage) {
    chips.push(`挥砍 近战伤害 +${slash.damage}`)
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
  if (isTalentActive('assault') && UTOPIA_TRAINING_BY_KIND.assault.weaponIds.includes(rangedId)) {
    const assault = talentEffects('assault', game.talents.assault)
    chips.push(
      `突击 暴击 ${formatPercent(assault.crit)} · 爆伤 +${assault.critDamage}× · 攻击 +${assault.damage}`,
    )
  }
  if (isTalentActive('block') && UTOPIA_TRAINING_BY_KIND.block.weaponIds.includes(meleeId)) {
    const block = talentEffects('block', game.talents.block)
    chips.push(
      `格挡 ${formatPercent(block.blockChance)} · 减伤 ${formatPercent(block.blockReduction)}`,
    )
  }
  if (isTalentActive('blunt') && UTOPIA_TRAINING_BY_KIND.blunt.weaponIds.includes(meleeId)) {
    const blunt = talentEffects('blunt', game.talents.blunt)
    const stacks = Number(battle.zombie.boneStacks) || 0
    chips.push(
      `碎骨 ${formatPercent(blunt.boneChance)}${stacks ? ` · ${stacks} 层` : ''}`,
    )
  }
  if (
    isTalentActive('assassinate') &&
    UTOPIA_TRAINING_BY_KIND.assassinate.weaponIds.includes(meleeId)
  ) {
    const assassinate = talentEffects('assassinate', game.talents.assassinate)
    chips.push(`背刺 ${formatPercent(assassinate.backstabChance)}`)
  }
  if (isTalentActive('sweep') && UTOPIA_TRAINING_BY_KIND.sweep.weaponIds.includes(meleeId)) {
    chips.push(
      `横扫 首击 +${formatPercent(talentEffects('sweep', game.talents.sweep).sweepDamage)}`,
    )
  }
  if (isTalentActive('polearm') && UTOPIA_TRAINING_BY_KIND.polearm.weaponIds.includes(meleeId)) {
    const polearm = talentEffects('polearm', game.talents.polearm)
    chips.push(`单枪 暴击 ×${polearm.critMult} · 耐久 ${polearm.critDurability}`)
  }
  if (isTalentActive('insight') && UTOPIA_TRAINING_BY_KIND.insight.weaponIds.includes(rangedId)) {
    const insight = talentEffects('insight', game.talents.insight)
    const stacks = Number(battle.insightStacks) || 0
    chips.push(
      `洞察 ${formatPercent(insight.insightCrit)}/层${stacks ? ` · ${stacks} 层` : ''}`,
    )
  }
  if (
    isTalentActive('bulldozer') &&
    UTOPIA_TRAINING_BY_KIND.bulldozer.weaponIds.includes(rangedId)
  ) {
    const segs = talentEffects('bulldozer', game.talents.bulldozer).dodgeSegments ?? []
    chips.push(`推土机 闪避追加 ${segs.map(formatPercent).join(' / ')}`)
  }
  return chips
})

const usableItems = computed(() =>
  game.inventory
    .map((entry, index) => ({ entry, index, def: entry ? getItem(entry.id) : null }))
    .filter((item) => item.entry && item.def?.effects),
)

/** 开发者宝石在战斗中不可用，但仍显示禁用条目与提示，而不是让入口凭空消失 */
const devGemEntry = computed(() => {
  const index = game.inventory.findIndex((entry) => entry?.id === 'developer-gem')
  if (index === -1) return null
  return {
    entry: game.inventory[index],
    index,
    def: getItem('developer-gem'),
  }
})

const hpPercent = computed(() =>
  battle.zombie.maxHp
    ? Math.max(0, Math.min(100, (battle.zombie.hp / battle.zombie.maxHp) * 100))
    : 0,
)

const isSeaBattle = computed(() => battle.kind === 'deep-sea')
const oxygenPercent = computed(() =>
  battle.oxygenMax
    ? Math.max(0, Math.min(100, (battle.oxygen / battle.oxygenMax) * 100))
    : 0,
)
const fleeChance = computed(() =>
  battle.kind === 'world-boss'
    ? 1
    : isSeaBattle.value && battle.mermaidBlessed
      ? 0.8
      : DAWN_FLEE_CHANCE,
)
const oceanGem = computed(() =>
  game.inventory.some((entry) => entry?.id === 'ocean-gem'),
)
const oxygenCost = computed(() =>
  oceanGem.value ? Math.max(1, Math.ceil(SEA_OXYGEN_COST / 2)) : SEA_OXYGEN_COST,
)
const worldBossDamage = computed(() =>
  battle.kind === 'world-boss'
    ? Math.max(0, battle.zombie.maxHp - battle.zombie.hp)
    : 0,
)
const enemyAttackText = computed(() => {
  const { attackMin, attackMax, attack } = battle.zombie
  return Number.isFinite(attackMin) && Number.isFinite(attackMax)
    ? `${attackMin}-${attackMax}`
    : attack
})
const rangedLocked = computed(() => isSeaBattle.value || !ranged.value.canFire)
const meleeHint = computed(() =>
  isSeaBattle.value
    ? `攻击 ${melee.value.attackText} · 氧气 -${oxygenCost.value}`
    : `攻击 ${melee.value.attackText}`,
)

const resultTitle = computed(() => {
  if (battle.kind === 'world-boss' && battle.result === 'flee') {
    return '世界BOSS · 已撤退'
  }
  return (
    {
      victory: '战斗结束 · 胜利',
      flee: '你逃掉了',
      dead: '你倒下了',
      'spar-win': '切磋结束 · 你赢了',
      'spar-loss': '切磋结束 · 你输了',
    }[battle.result] ?? '战斗结束'
  )
})

const abilityLabels = computed(() =>
  (battle.zombie.abilities ?? []).map((key) => ZOMBIE_ABILITY_LABELS[key] ?? key),
)

const finishLabel = computed(() => {
  if (battle.kind === 'banker') return '返回银行'
  if (battle.kind === 'field') return '继续探索'
  if (battle.kind === 'deep-sea') return '返回海面'
  if (battle.kind === 'mutiny') return battle.mutinyNext ? '迎战下一位' : '返回甲板'
  if (battle.kind === 'airship-coup') return battle.coupNext ? '迎战下一位' : '返回高台'
  if (battle.kind === 'airship-commission') return '返回委托板'
  if (battle.kind === 'airship-cargo') return '返回机务舱'
  if (battle.kind === 'spar') return '返回城主办公室'
  if (battle.kind === 'world-boss') return '返回乌托邦城'
  return '返回阵地'
})

const fleeLocked = computed(() => battle.kind === 'mutiny')

function effectText(def) {
  return Object.entries(def.effects)
    .map(([key, value]) => `${STAT_LABELS[key] ?? key} ${value > 0 ? '+' : ''}${value}`)
    .join(' · ')
}

function useItemInBattle(index) {
  useBattleItem(index)
  bagOpen.value = false
}

function finish() {
  emit('done')
}
</script>

<template>
  <div class="battle">
    <section class="zombie">
      <div v-if="battle.zombie.image" class="zombie__portrait">
        <img :src="battle.zombie.image" :alt="battle.zombie.name" />
      </div>
      <div class="zombie__info">
        <header class="zombie__head">
          <div>
            <span class="eyebrow">
              {{
                battle.kind === 'spar'
                  ? '切磋'
                  : battle.kind === 'world-boss'
                    ? '世界BOSS'
                    : '遭遇'
              }}
            </span>
            <h3 class="zombie__name">{{ battle.zombie.name }}</h3>
          </div>
          <div class="zombie__stats">
            <span class="zombie__hp">生命 {{ battle.zombie.hp }} / {{ battle.zombie.maxHp }}</span>
            <span v-if="battle.kind === 'world-boss'" class="zombie__damage">
              累计伤害 {{ worldBossDamage }}
            </span>
          </div>
        </header>
        <div class="bar">
          <div class="bar__fill" :style="{ width: hpPercent + '%' }" />
        </div>
        <div v-if="isSeaBattle" class="oxygen">
          <div class="oxygen__head">
            <span>氧气</span>
            <span>{{ battle.oxygen }} / {{ battle.oxygenMax }}</span>
          </div>
          <div class="bar bar--oxygen">
            <div class="bar__fill" :style="{ width: oxygenPercent + '%' }" />
          </div>
          <p v-if="battle.mermaidBlessed" class="oxygen__bless">
            人鱼的祝福仍在，氧气上限提升至 200。
          </p>
        </div>
        <p class="zombie__desc">{{ battle.zombie.description }}</p>
        <div class="meta">
          <span>攻击 {{ enemyAttackText }}</span>
          <span v-if="battle.zombie.infection > 0">命中感染 +{{ battle.zombie.infection }}%</span>
          <span v-if="battle.kind === 'spar'" class="meta__ability">切磋 · 双方锁血 1</span>
          <span v-if="battle.kind === 'world-boss'" class="meta__ability">世界BOSS · 逃跑必定成功</span>
          <span v-if="battle.zombie.hpFloor" class="meta__ability">锁血 {{ battle.zombie.hpFloor }}</span>
          <span v-for="label in abilityLabels" :key="label" class="meta__ability">{{ label }}</span>
          <span v-if="battle.kind === 'mutiny'">
            第 {{ battle.mutinyStage + 1 }} / {{ HARBOR_MUTINY.crewCount + 1 }} 轮
          </span>
          <span>回合 {{ battle.round }}</span>
        </div>
      </div>
    </section>

    <section class="player">
      <span>近战 <b>{{ melee.name }}</b></span>
      <span>攻击 <b>{{ melee.attackText }}</b></span>
      <span>暴击 <b>{{ melee.critText }}</b></span>
      <span>爆伤 <b>{{ melee.critDamageText }}</b></span>
      <span>连击 <b>{{ melee.comboText }}</b></span>
      <span>远程 <b>{{ ranged.name }}</b></span>
      <span v-if="game.equipment.ranged">远程攻击 <b>{{ ranged.attackText }}</b></span>
      <span v-if="game.equipment.ranged">远程暴击 <b>{{ ranged.critText }}</b></span>
      <span v-if="game.equipment.ranged">远程爆伤 <b>{{ ranged.critDamageText }}</b></span>
      <span v-if="game.equipment.ranged">远程闪避 <b>{{ ranged.dodgeText }}</b></span>
      <span v-if="game.equipment.ranged">清洁度 <b>{{ ranged.cleanliness }}</b></span>
      <span v-if="ranged.jamChance > 0">卡壳 <b>{{ formatPercent(ranged.jamChance) }}</b></span>
      <span v-for="chip in talentChips" :key="chip">{{ chip }}</span>
      <span v-if="battle.magicStacks > 0">
        魔化 <b>{{ battle.magicStacks }} / {{ MAGIC_GEM_STACK.max }} 层</b> · 暴击 +{{ Math.round(battle.magicStacks * MAGIC_GEM_STACK.critPerStack * 100) }}%
      </span>
    </section>

    <section class="log">
      <ul class="log__list">
        <li v-for="line in battle.log" :key="line.id">{{ line.text }}</li>
      </ul>
    </section>

    <section v-if="battle.active" class="actions">
      <button type="button" class="btn btn--primary" @click="meleeAttack">
        近战攻击
        <span class="actions__hint">{{ meleeHint }}</span>
      </button>
      <button type="button" class="btn" :disabled="rangedLocked" @click="rangedAttack">
        远程攻击
        <span class="actions__hint">
          {{
            isSeaBattle
              ? '水下无法开枪'
              : !game.equipment.ranged
                ? '未装备'
                : ranged.canFire
                  ? `攻击 ${ranged.attackText} · 清洁 ${ranged.cleanliness}`
                  : '需保养'
          }}
        </span>
      </button>
      <button type="button" class="btn" @click="bagOpen = !bagOpen">
        打开背包
        <span class="actions__hint">{{ usableItems.length }} 件可用</span>
      </button>
      <button type="button" class="btn" :disabled="fleeLocked" @click="fleeBattle">
        逃跑
        <span class="actions__hint">
          {{
            fleeLocked
              ? '无路可逃'
              : battle.kind === 'airship-coup'
                ? '100%'
                : formatPercent(fleeChance)
          }}
        </span>
      </button>
    </section>

    <Teleport to="body">
      <div v-if="bagOpen && battle.active" class="bag-mask" @click.self="bagOpen = false">
        <section class="bag" role="dialog" aria-modal="true" aria-label="战斗背包">
          <header class="bag__head">
            <h4>背包 · 使用物品会消耗一次行动</h4>
            <button
              type="button"
              class="bag__close"
              aria-label="关闭背包"
              @click="bagOpen = false"
            >
              ✕
            </button>
          </header>
          <div v-if="usableItems.length" class="bag__list">
            <article v-for="item in usableItems" :key="item.index" class="bag__item">
              <img v-if="item.def.image" :src="item.def.image" :alt="item.def.name" />
              <div class="bag__main">
                <h5>{{ item.def.name }} ×{{ item.entry.qty }}</h5>
                <p>{{ effectText(item.def) }}</p>
              </div>
              <button type="button" class="btn" @click="useItemInBattle(item.index)">使用</button>
            </article>
          </div>
          <p v-else class="bag__empty">背包里没有可用的食物、饮品或药品。</p>
          <article v-if="devGemEntry" class="bag__item bag__item--locked">
            <img
              v-if="devGemEntry.def.image"
              :src="devGemEntry.def.image"
              :alt="devGemEntry.def.name"
            />
            <div class="bag__main">
              <h5>{{ devGemEntry.def.name }} ×{{ devGemEntry.entry.qty }}</h5>
              <p>战斗中无法使用，请先结束这场战斗。</p>
            </div>
            <button type="button" class="btn" disabled>不可用</button>
          </article>
        </section>
      </div>
    </Teleport>

    <section v-if="battle.finished" class="result">
      <span class="eyebrow">{{ resultTitle }}</span>
      <p v-if="battle.summary" class="result__text">{{ battle.summary }}</p>
      <button type="button" class="btn btn--primary" @click="finish">{{ finishLabel }}</button>
    </section>
  </div>
</template>

<style scoped>
.battle {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: calc(100% - 14px);
  margin-top: 14px;
}

.zombie {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.24);
}

.zombie__portrait {
  width: 96px;
  flex: none;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.35);
  box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.55);
}

.zombie__portrait img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.9) contrast(1.05);
}

.zombie__info {
  flex: 1;
  min-width: 0;
}

.zombie__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.zombie__name {
  margin: 5px 0 0;
  font-family: var(--font-title);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--text);
}

.zombie__stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.zombie__hp {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--bone);
}

.zombie__damage {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--rust-soft);
}

.bar {
  height: 4px;
  margin-top: 11px;
  background: rgba(214, 208, 191, 0.12);
  overflow: hidden;
}

.bar__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--rust), var(--rust-soft));
  transition: width 0.4s ease;
}

.oxygen {
  margin-top: 9px;
}

.oxygen__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.oxygen .bar {
  margin-top: 5px;
}

.bar--oxygen .bar__fill {
  background: linear-gradient(90deg, #2f6f96, #6fb4dd);
}

.oxygen__bless {
  margin: 6px 0 0;
  font-size: 9.5px;
  letter-spacing: 0.03em;
  color: #6fb4dd;
}

.zombie__desc {
  margin: 10px 0 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-mute);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
}

.meta span,
.player span {
  padding: 3px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-mute);
  border: 1px solid var(--line);
}

.meta__ability {
  color: var(--rust-soft);
  border-color: rgba(184, 98, 70, 0.45);
}

.player {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.player b {
  color: var(--bone);
  font-weight: 500;
}

.log {
  height: 150px;
  flex: none;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 12px 14px;
  border-left: 2px solid var(--line-strong);
  background: rgba(0, 0, 0, 0.22);
}

.log__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.log__list li {
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--text-dim);
}

.actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: grid;
  flex: none;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: auto;
  padding: 12px 0 4px;
  border-top: 1px solid var(--line);
  background: #0c0e0f;
}

.actions .btn {
  flex-direction: column;
  gap: 3px;
  height: 54px;
  font-size: 12.5px;
}

.actions__hint {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.04em;
  color: var(--text-mute);
}

.bag-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(4, 5, 6, 0.72);
  backdrop-filter: blur(6px);
}

.bag {
  display: flex;
  flex-direction: column;
  width: min(520px, 100%);
  max-height: min(76vh, 620px);
  overflow: auto;
  padding: 16px 18px 18px;
  border: 1px solid var(--line-strong);
  background: linear-gradient(180deg, rgba(17, 19, 20, 0.98), rgba(10, 12, 13, 0.99));
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
}

.bag__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 9px;
  border-bottom: 1px solid var(--line);
}

.bag__head h4 {
  margin: 0;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

.bag__close {
  width: 28px;
  height: 28px;
  flex: none;
  font-size: 13px;
  color: var(--text-mute);
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.bag__close:hover {
  color: var(--text);
  border-color: var(--line-strong);
}

.bag__list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 9px;
  background: var(--line);
}

.bag__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  background: #0d0f10;
}

.bag__item--locked {
  margin-top: 9px;
  border-top: 1px solid var(--line);
  opacity: 0.62;
}

.bag__item--locked .bag__main p {
  color: var(--rust-soft);
}

.bag__item img {
  width: 34px;
  height: 34px;
  flex: none;
  object-fit: contain;
}

.bag__main {
  min-width: 0;
  flex: 1;
}

.bag__main h5 {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--text);
}

.bag__main p {
  margin: 3px 0 0;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--text-mute);
}

.bag__item .btn {
  height: 28px;
  padding: 0 12px;
  font-size: 10.5px;
  flex: none;
}

.bag__empty {
  margin: 9px 0 0;
  font-size: 11px;
  color: var(--text-mute);
}

.result {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  border: 1px dashed var(--line-strong);
}

.result__text {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.8;
  color: var(--text-dim);
}

@media (max-width: 720px) {
  .zombie {
    gap: 10px;
  }

  .zombie__portrait {
    width: 72px;
  }

  .actions {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
