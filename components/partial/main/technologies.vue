<template>
  <section id="stats">
    <client-only>
      <v-parallax
        :height="!mobile ? 500 : ''"
        scale="1"
        src="https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1950&q=80"
      >
        <v-container>
          <v-row class="d-flex justify-space-evenly">
            <v-col
              v-for="(stat, iStat) of stats"
              :key="stat.title"
              cols="6"
              md="3"
              class="text-center"
            >
              <div
                v-aos="['animate__zoomIn']"
                  class="text-h3 font-weight-black mb-4 pt-6 justify-center text-white"
                  :data-aos-delay="`0.` + ((iStat + 1) * 5) + `s`"
              >
                {{ stat.value }}
                <v-icon
                  color="yellow"
                  :size="mobile ? 12 : 24"
                  icon="i-mdi:star"
                />
              </div>

              <v-btn
                  color="white"
                  :href="stat.url"
                  outlined
                  large
                  target="_blank"
                  variant="outlined"
                >
                <span class="white-text text-darken-1 font-weight-bold">
                  {{ stat.title }}
                </span>
              </v-btn>
            </v-col>
          </v-row>
        </v-container>
      </v-parallax>
    </client-only>
  </section>
</template>
<script setup>
import { CStats } from '~/utils/common'

const { mobile } = useDisplay()

const stats = reactive(CStats)
const getStars = async (url, star_count) => {
  const { data, status, error, refresh, clear } = await useFetch(url)

  if (! error) {
    const item = await data.json()

    return numberFormat(item.stargazers_count) + '+'
  } else {
    return star_count
  }
}

stats.forEach(async (stat) => {
  stat.value = await getStars(stat.star_url, stat.value)
})
</script>
