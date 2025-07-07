<script setup lang="ts">
  import type { NuxtError } from '#app'

  const applicationStore = useApplicationStore()
  const nuxtApp = useNuxtApp()
  const { mobile } = useDisplay()
  const theme = useTheme()

  const storeThemeDark = computed(() => applicationStore.isDarkTheme)

  theme.global.name.value = storeThemeDark.value === false ? 'chartman2frLightTheme' : 'chartman2frDarkTheme'

  nuxtApp.hook('page:finish', () => {
    theme.global.name.value = setTheme()

    applicationStore.setIsPhone(mobile.value)
    applicationStore.setIsDarkTheme(theme.global.name.value === 'chartman2frDarkTheme')
  })

  watch(storeThemeDark, (value) => {
    theme.global.name.value =
      value === false ? 'chartman2frLightTheme' : 'chartman2frDarkTheme'
  })

  const props = defineProps({
    error: Object as () => NuxtError
  })
</script>

<template>
   <v-layout>
    <bar-top />
    <page-snackbar />
    <v-app>
      <v-main
        :dark="true"
        class="d-flex align-center fill-height pb-24"
        background-color="background"
      >
        <v-img
          :min-height="mobile ? '45vh' : '70vh'"
          src="/backgrounds/hero-2.svg"
          contain
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
                  class="font-weight-black pb-4 align-self-center"
                >
                  Oops !
                </span>
                <span
                  :class="[mobile ? 'display-3' : 'display-4']"
                  class="font-weight-black"
                >
                  
                </span>
              </v-col>
              <v-col
                class="text-center pt-12"
                cols="6"
                tag="h1"
              >
                <span
                  :class="[mobile ? 'display-3' : 'display-4']"
                  class="font-weight-black"
                >
                  <v-btn
                    variant="tonal"
                    color="info"
                    class="ml-6"
                    @click="$router.back()"
                  >
                    <v-icon icon="i-mdi:arrow-left-circle" />
                    Page précédente
                  </v-btn>
                </span>
              </v-col>
              <v-col
                class="text-center pt-12"
                cols="6"
                tag="h1"
              >
                <span
                  :class="[mobile ? 'display-3' : 'display-4']"
                  class="font-weight-black"
                >
                  <v-btn
                    to="/"
                    variant="tonal"
                    class="ml-6"
                    color="info"
                  >
                    <v-icon icon="i-mdi-home" />
                    Accueil
                  </v-btn>
                </span>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                {{ error }}
              </v-col>
            </v-row>
          </v-container>
        </v-img>
        
        <button-back-to-top />
      </v-main>
    </v-app>
    <CookieControl locale="fr" />

    <bar-bottom />
  </v-layout>
</template>

<style lang="css" scoped>
:root {
  --main-color: white;
  --stroke-color: #5d862e;
  --link-color: #29abe2;
}
h1 {
  text-align: center;
}
h2 {
  text-align: center;
}
.loading h1, .loading h2 {
  margin-top: 0px;
  opacity: 0;  
}
.gears {
  position: relative;
  margin: 0 auto;
  width: auto; height: 0;
}
.gear {
  position: relative;
  z-index: 0;
  width: 120px; height: 120px;
  margin: 0 auto;
  border-radius: 50%;
  background: var(--stroke-color);
}
.gear:before{
  position: absolute; left: 5px; top: 5px; right: 5px; bottom: 5px;
  z-index: 2;
  content: "";
  border-radius: 50%;
  background: var(--main-color);
}
.gear:after {
  position: absolute; left: 25px; top: 25px;
  z-index: 3;
  content: "";
  width: 70px; height: 70px;
  border-radius: 50%;
  border: 5px solid var(--stroke-color);
  box-sizing: border-box;
  background: var(--main-color);
}
.gear.one {
  left: -130px;
}
.gear.two {
  top: -75px;
}
.gear.three {
  top: -235px;
  left: 130px;
}
.gear .bar {
  position: absolute; left: -15px; top: 50%;
  z-index: 0;
  width: 150px; height: 30px;
  margin-top: -15px;
  border-radius: 5px;
  background: var(--stroke-color);
}
.gear .bar:before {
  position: absolute; left: 5px; top: 5px; right: 5px; bottom: 5px;
  z-index: 1;
  content: "";
  border-radius: 2px;
  background: var(--main-color);
}
.gear .bar:nth-child(2) {
  transform: rotate(60deg);
  -webkit-transform: rotate(60deg);
}
.gear .bar:nth-child(3) {
  transform: rotate(120deg);
  -webkit-transform: rotate(120deg);
}
@-webkit-keyframes clockwise {
  0% { -webkit-transform: rotate(0deg);}
  100% { -webkit-transform: rotate(360deg);}
}
@-webkit-keyframes anticlockwise {
  0% { -webkit-transform: rotate(360deg);}
  100% { -webkit-transform: rotate(0deg);}
}
@-webkit-keyframes clockwiseError {
  0% { -webkit-transform: rotate(0deg);}
  20% { -webkit-transform: rotate(30deg);}
  40% { -webkit-transform: rotate(25deg);}
  60% { -webkit-transform: rotate(30deg);}
  100% { -webkit-transform: rotate(0deg);}
}
@-webkit-keyframes anticlockwiseErrorStop {
  0% { -webkit-transform: rotate(0deg);}
  20% { -webkit-transform: rotate(-30deg);}
  60% { -webkit-transform: rotate(-30deg);}
  100% { -webkit-transform: rotate(0deg);}
}
@-webkit-keyframes anticlockwiseError {
  0% { -webkit-transform: rotate(0deg);}
  20% { -webkit-transform: rotate(-30deg);}
  40% { -webkit-transform: rotate(-25deg);}
  60% { -webkit-transform: rotate(-30deg);}
  100% { -webkit-transform: rotate(0deg);}
}
.gear.one {
  -webkit-animation: anticlockwiseErrorStop 2s linear infinite;
}
.gear.two {
  -webkit-animation: anticlockwiseError 2s linear infinite;
}
.gear.three {
  -webkit-animation: clockwiseError 2s linear infinite;
}
.loading .gear.one, .loading .gear.three {
  -webkit-animation: clockwise 3s linear infinite;
}
.loading .gear.two {
  -webkit-animation: anticlockwise 3s linear infinite;
}
</style>