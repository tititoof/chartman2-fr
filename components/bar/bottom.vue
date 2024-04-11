<template>
  <ClientOnly>

    <v-footer
      app
      min-height="72"
      color="background"
    >
      <v-container>
        <v-row>
          <v-col
            cols="4"
            class="d-flex flex-wrap justify-start"
          >
            <v-btn-group
              v-for="(s, i) in social"
              :key="i"
            >
              <v-btn
                :href="s.route"
                color="background"
                variant="flat"
                target="_blank"
                size="small"
                class="px-0"
              >
                <v-icon
                  size="large"
                  :icon="s.icon"
                />
              </v-btn>
            </v-btn-group>
          </v-col>
          <v-col
            cols="4"
            class="align-self-center text-center"
          >
            {{ currentRangeYears }}
          </v-col>
          <v-col
            v-if="!mobile"
            class="d-flex flex-wrap justify-end align-center flex-shrink-1 text-white"
            cols="4"
          >
            <v-btn-group
              v-for="(s, i) in links"
              :key="i"
            >
              <v-btn
                :href="s.href"
                color="background"
                variant="flat"
                target="_blank"
                size="small"
                class="px-0"
              >
                <v-icon
                  size="large"
                  :icon="s.icon"
                />
              </v-btn>
            </v-btn-group>
          </v-col>
        </v-row>
      </v-container>
    </v-footer>
  </ClientOnly>
</template>

<script setup lang="ts">
const { mobile } = useDisplay()
const dayjs = useDayjs()

const currentYear = ref(dayjs().year())
const currentRangeYears = ref(currentYear.value === 2022 ? "2022" : `2022-${currentYear.value}`)

const social = reactive([
  {
    name: "Facebook",
    route: "https://www.facebook.com/christophe.hartmann1/",
    icon: 'i-mdi:facebook',
  },
  {
    name: "Linkedin",
    route: "https://www.linkedin.com/in/christophe-hartmann-3a297a42/",
    icon: 'i-mdi:linkedin',
  },
])

const links = reactive([
  {
    name: 'NuxtJS',
    icon: 'i-mdi:nuxt',
    href: 'https://nuxt.com/',
  },
  {
    name: 'Vuetify',
    icon: 'i-mdi:vuetify',
    href: 'https://vuetifyjs.com/en/',
  },
  {
    name: 'RoR',
    icon: 'i-mdi:language-ruby-on-rails',
    href: 'https://rubyonrails.org/',
  },
])
</script>