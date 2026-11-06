<script setup>
import { computed, ref } from 'vue'
import { COMPANIONS, npcById, panelBackground } from '../data'
import { cooldownLeft, game, harvestLulu, harvestYanran } from '../game/store'
import ModalShell from './ModalShell.vue'

defineEmits(['close'])

const feed = ref('')

const yanranJoined = computed(() => Boolean(game.flags.yanranRescued))
const luluJoined = computed(() => Boolean(game.flags.luluRescued))
const yanranLeft = computed(() =>
  cooldownLeft(COMPANIONS.yanran.harvestKey, COMPANIONS.yanran.cooldownDays),
)
const luluLeft = computed(() =>
  cooldownLeft(COMPANIONS.lulu.harvestKey, COMPANIONS.lulu.cooldownDays),
)
const anyJoined = computed(() => yanranJoined.value || luluJoined.value)

const partners = computed(() => [
  {
    id: 'yanran',
    avatar: '嫣',
    image: npcById('yanran')?.image,
    name: '嫣然',
    joined: yanranJoined.value,
    left: yanranLeft.value,
    tag: !yanranJoined.value ? '未加入' : yanranLeft.value > 0 ? '今日已领取' : '可领取',
    desc: '每天带回 2 件食物、饮品或水果',
    bonus: '命中后 30% 概率追加 20 伤害',
    actionLabel: '让嫣然出去一趟 · 1 回合',
    action: harvestYanran,
  },
  {
    id: 'lulu',
    avatar: '露',
    image: npcById('lulu')?.image,
    name: '露露',
    joined: luluJoined.value,
    left: luluLeft.value,
    tag: !luluJoined.value ? '未加入' : luluLeft.value > 0 ? '今日已领取' : '可领取',
    desc: '每天带回 1 件药品',
    bonus: '每场胜利恢复 20 生命',
    actionLabel: '让露露出去一趟 · 1 回合',
    action: harvestLulu,
  },
])

function claim(action) {
  const line = action()
  if (game.dead) {
    feed.value = game.deathReason
    return
  }
  if (line) feed.value = line
}
</script>

<template>
  <ModalShell
    title="伙伴收获"
    sub="她们每天出去一趟，带回的东西不一样"
    :bg="panelBackground('companion')"
    bg-tone="normal"
    @close="$emit('close')"
  >
    <p v-if="!anyJoined" class="empty">还没有伙伴加入。去核心商圈或公立医院看看。</p>

    <div class="partners">
      <article
        v-for="partner in partners"
        :key="partner.id"
        class="partner"
        :class="{ 'is-off': !partner.joined }"
      >
        <header class="partner__head">
          <span class="partner__avatar">
            <img v-if="partner.image" :src="partner.image" :alt="partner.name" />
            <template v-else>{{ partner.avatar }}</template>
          </span>
          <div class="partner__id">
            <h3 class="partner__name">{{ partner.name }}</h3>
            <span
              class="partner__tag"
              :class="{ 'is-ready': partner.joined && partner.left === 0 }"
            >
              {{ partner.tag }}
            </span>
          </div>
        </header>

        <p class="partner__desc">{{ partner.desc }}</p>
        <p class="partner__bonus">战斗加成 · {{ partner.bonus }}</p>

        <button
          type="button"
          class="btn btn--primary partner__action"
          :disabled="!partner.joined || partner.left > 0"
          @click="claim(partner.action)"
        >
          {{ partner.actionLabel }}
        </button>
      </article>
    </div>

    <template #footer>
      <span>{{ feed || '领取会消耗 1 回合（正常衰减），每天只能领取一次。' }}</span>
    </template>
  </ModalShell>
</template>

<style scoped>
.empty {
  margin: 0 0 14px;
  padding: 10px 12px;
  font-size: 11.5px;
  line-height: 1.8;
  letter-spacing: 0.04em;
  color: var(--text-mute);
  border: 1px dashed var(--line-strong);
  background: rgba(0, 0, 0, 0.22);
}

.partners {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: var(--line);
}

.partner {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 16px;
  background: rgba(8, 10, 11, 0.6);
  backdrop-filter: blur(4px) saturate(0.9);
}

.partner.is-off {
  opacity: 0.55;
}

.partner__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.partner__avatar {
  width: 64px;
  height: 64px;
  flex: none;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: var(--font-title);
  font-size: 18px;
  letter-spacing: 0.08em;
  color: var(--bone);
  border: 1px solid var(--line-strong);
  background: rgba(0, 0, 0, 0.35);
}

.partner__avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.9) contrast(1.05);
}

.partner__id {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.partner__name {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--text);
}

.partner__tag {
  flex: none;
  padding: 2px 7px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
  border: 1px solid var(--line);
}

.partner__tag.is-ready {
  color: var(--rust-soft);
  border-color: rgba(193, 74, 50, 0.4);
}

.partner__desc {
  margin: 0;
  font-size: 11px;
  line-height: 1.75;
  color: var(--text-dim);
}

.partner__bonus {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 9.5px;
  line-height: 1.7;
  letter-spacing: 0.04em;
  color: var(--rust-soft);
}

.partner__action {
  align-self: flex-start;
  height: 30px;
  margin-top: auto;
  padding: 0 13px;
  font-size: 11px;
}

@media (max-width: 680px) {
  .partners {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
