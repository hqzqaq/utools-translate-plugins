<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import Hello from './Hello/index.vue'
import Read from './Read/index.vue'
import Write from './Write/index.vue'

const route = ref('')
const enterAction = ref({})

onMounted(() => {
  window.utools.onPluginEnter((action) => {
    route.value = action.code
    enterAction.value = action
    console.log(route.value)
  })
  window.utools.onPluginOut((isKill) => {
    route.value = ''
  })
})
</script>

<template>
  <template v-if="route === 'translate'">
    <Hello :enterAction="enterAction"></Hello>
  </template>
  <template v-if="route === 'over'">
    <Hello :enterAction="enterAction"></Hello>
  </template>
  <template v-if="route === 'write'">
    <Write :enterAction="enterAction"></Write>
  </template>
</template>
