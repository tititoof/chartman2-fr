<template>
  <ClientOnly>
    <v-card
      id="hero"
      color="blue lighten-1"
    >
     
      <v-img
        :min-height="mobile ? '45vh' : '70vh'"
        :max-height="mobile ? '45vh' : '70vh'"
        src="/backgrounds/background.jpeg"
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
                Bienvenu sur
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
          <NuxtParticles
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
  fullScreen: false,
  fpsLimit: 60,
  particles: {
    number: {
      value: 15,
      density: {
        enable: true,
        value_area: mobile ? '40vh' : '65vh',
      },
    },
    shape: {
      type: 'circle',
    },
    preset: 'firefly',
    color: {
      value: '#CCCC66',
    },
    life: {
      duration: {
        value: 12,
        sync: false,
      },
      count: 105,
    },
    opacity: {
      value: { min: 0.1, max: 2 },
      animation: {
        enable: true,
        speed: 3,
      },
    },
    size: {
      value: {
        min: 1,
        max: 4,
      },
    },
    move: {
      enable: true,
      speed: 7,
      random: true,
      size: true,
    },
    retina_detect: true,
  },
}

const emit = defineEmits(['addLoading', 'removeLoading'])
onBeforeMount(() => {
  emit('addLoading')
})

onMounted(() => {
  emit('removeLoading')
})
</script>