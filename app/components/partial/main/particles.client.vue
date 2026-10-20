<template>
  <vue-particles
    id="tsparticles"
    :options="options"
  />
</template>

<script setup lang="ts">
const { mobile } = useDisplay()

const options = {
  fullScreen: { enable: false },
  fpsLimit: 30,
  detectRetina: true,
  particles: {
    number: {
      value: mobile.value ? 6 : 12,
    },
    shape: {
      type: 'circle',
    },
    color: {
      value: '#FFD700',
    },
    life: {
      duration: {
        value: 4,
        sync: false,
      },
      count: 0,
    },
    opacity: {
      value: { min: 0.1, max: 0.9 },
      animation: {
        enable: true,
        speed: 1,
        sync: false,
      },
    },
    size: {
      value: { min: 1, max: 4 },
      animation: {
        enable: true,
        speed: 4,
        minimumValue: 0.5,
        sync: false,
      },
    },
    move: {
      enable: true,
      speed: 1.5,
      random: true,
      straight: false,
      outModes: {
        default: 'out',
      },
    },
  },
}
</script>

<style lang="css" scoped>
#tsparticles {
  position: absolute;
  inset: 0;
}
</style>
