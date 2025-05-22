<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import Page from './Page/index.vue'
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
    <Page :enterAction="enterAction"></Page>
  </template>
  <template v-if="route === 'over'">
    <Page :enterAction="enterAction"></Page>
  </template>
  <template v-if="route === 'write'">
    <Write :enterAction="enterAction"></Write>
  </template>
</template>
