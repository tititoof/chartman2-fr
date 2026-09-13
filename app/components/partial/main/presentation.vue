<template>
  <ClientOnly>
    <v-card
      id="hero"
      color="blue lighten-1"
    >
      <v-img
        :min-height="mobile ? '45vh' : '70vh'"
        :max-height="mobile ? '45vh' : '70vh'"
        src="/backgrounds/weasley.png"
        cover
      >
        <v-container
          class="d-flex align-self-center pt-12"
          fluid
        >
          <v-row
            align="center"
            class="mx-auto pt-12"
            justify="center"
          >
            <v-col
              class="text-center pt-12"
              cols="12"
              tag="h1"
            >
              <span
                :class="[mobile ? 'display-1' : 'display-2']"
                class="font-weight-light pb-4 align-self-center"
              >
                Bienvenue sur
              </span>

              <span
                :class="[mobile ? 'display-3' : 'display-4']"
                class="font-weight-black"
              >
                {{ appUrl }}
              </span>
            </v-col>

            <v-btn
              class="align-self-end"
              fab
              variant="outlined"
              icon="i-mdi:chevron-double-down"
              @click="useScroll('about-me')"
            />
          </v-row>
        </v-container>
        <section>
          <vue-particles
            id="tsparticles"
            :options="options"
          />
        </section>
      </v-img>
    </v-card>
  </ClientOnly>
</template>

<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const { mobile } = useDisplay()
const appUrl = runtimeConfig.public.appUrl

const options = {
  fullScreen: { enable: false },
  fpsLimit: 60,
  detectRetina: true,
  particles: {
    number: {
      value: mobile.value ? 10 : 20,
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

const emit = defineEmits(['addLoading', 'removeLoading'])
onBeforeMount(() => {
  emit('addLoading')
})

onMounted(async () => {
  await preloadImage('/backgrounds/weasley.png')
  emit('removeLoading')
})
</script>
