<template>
  <section id="stats">
    <v-parallax
      :height="!mobile ? 500 : ''"
      src="https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1950&q=80"
    >
      <v-container>
        <v-row class="d-flex justify-space-evenly">
          <v-col
            v-for="stat of stats"
            :key="stat.title"
            cols="6"
            md="3"
            class="text-center"
          >
            <div
              class="text-h3 text-white font-weight-black mb-4 pt-6 justify-center"
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
  </section>
</template>
<script setup>
const { mobile } = useDisplay()

const getStars = async (url, star_count) => {
  try {
    const response = await fetch(url)
    const data = await response.json()
  
    return numberFormat(data.stargazers_count)
  } catch (error) {
    return star_count
  }
}

const stats = reactive([
  {
    value: '199k+',
    title: 'VueJS',
    url: 'https://github.com/vuejs/vue',
    star_url: `https://api.github.com/repos/vuejs/vue`
  },
  {
    value: '41k+',
    title: 'NuxtJS',
    url: 'https://github.com/nuxt/nuxt.js/',
    star_url: `https://api.github.com/repos/nuxt/nuxt.js`
  },
  {
    value: '19k+',
    title: 'Ruby',
    url: 'https://github.com/ruby/ruby',
    star_url: `https://api.github.com/repos/ruby/ruby`
  },
  {
    value: '51k+',
    title: 'Ruby on Rails',
    url: 'https://github.com/rails/rails',
    star_url: `https://api.github.com/repos/rails/rails`
  },
  {
    value: '72k+',
    title: 'Laravel',
    url: 'https://github.com/laravel/laravel',
    star_url: `https://api.github.com/repos/laravel/laravel`
  },
  {
    value: '28k+',
    title: 'Symfony',
    url: 'https://github.com/symfony/symfony',
    star_url: `https://api.github.com/repos/symfony/symfony`
  },
])

stats.forEach(async (stat) => {
  stat.value = await getStars(stat.star_url, stat.value)
})
</script>
