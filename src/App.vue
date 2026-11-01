<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import MainMenu from './components/MainMenu.vue'
import GameView from './components/GameView.vue'
import LoadingScreen from './components/LoadingScreen.vue'
import { game } from './game/store'
import { flushGlobalStats } from './game/save'

function handleUnload() {
  flushGlobalStats()
}

onMounted(() => {
  window.addEventListener('beforeunload', handleUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleUnload)
})
</script>

<template>
  <MainMenu v-if="game.screen === 'menu'" />
  <GameView v-else />
  <LoadingScreen v-if="game.loading" />
  <div v-if="game.toast" class="toast">{{ game.toast }}</div>
</template>
