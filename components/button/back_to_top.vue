<template>
  <transition name="fade-transition">
    <v-btn
      v-show="showBackToTop"
      class="mb-24 mx-12"
      position="fixed"
      location="bottom right"
      color="info"
      icon="i-mdi:chevron-up"
      transition="fade-transition"
      @click="scrollToTop"
    />
  </transition>
</template>

<script setup>
import { tryOnMounted, tryOnUnmounted } from '@vueuse/core'

const showBackToTop = ref(false)

const handleScroll = () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop

  showBackToTop.value = scrollTop > 0
}

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

tryOnMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

tryOnUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>
<style>

.mb-24 {
    margin-bottom: 96px !important;
}
</style>