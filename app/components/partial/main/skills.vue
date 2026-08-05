<!-- eslint-disable vue/multiline-html-element-content-newline -->
<template>
  <v-card color="info-container">
    <v-container
      id="features"
      class="text-center py-12"
    >
      <section-title title="Mes compétences" />

      <section
        v-for="({ title, text, skill }, iSkills) in skills"
        :key="iSkills"
        class="pb-4"
      >
        <h3 class="font-weight-bold mb-3 align-justify">
          {{ title }}
        </h3>

        <span class="subtitle-1">
          {{ text }}
        </span>
        <v-row class="d-flex justify-space-around mt-2">
          <v-col
            v-for="({ type, src, title: skillTitle, text: skillText }, iSkill) in skill"
            :key="iSkill"
            v-aos="['animate__fadeIn']"
            cols="12"
            md="4"
          >
            <v-card
              v-aos="['animate__flipInY']"
              :data-aos-delay="`0.` + ((iSkills + 1) * (iSkill + 1) * 5) + `s`"
              class="py-12 px-4"
              :color="color"
              flat
              rounded="lg"
              variant="outlined"
              max-height="300"
              min-height="300"
            >
              <v-avatar
                v-if="type === 'icon'"
                color="primary-container"
                size="88"
                rounded="2"
              >
                <v-icon size="x-large" :icon="src">
                </v-icon>
              </v-avatar>
              <v-avatar
                v-else
                color="primary-container"
                size="88"
                rounded="2"
              >
                <v-avatar
                  color="primary-container"
                  size="42"
                  rounded="2"
                  :image="src"
                />
              </v-avatar>
              <v-card-title
                class="justify-center text-subtitle-1 font-weight-black text-uppercase"
              >
                {{ skillTitle }}
              </v-card-title>
              <v-card-text class="subtitle-1">
                {{ skillText }}
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
        <v-responsive
          class="mx-auto"
          width="112"
        >
          <v-divider class="mt-4" />

        </v-responsive>
      </section>
    </v-container>
  </v-card>
</template>

<script setup>
import { CSkills, CSkillsCICD } from '~/utils/common'
import { useApplicationStore } from '~/stores/application'

const applicationStore = useApplicationStore()
const color = computed(() => applicationStore.isDarkTheme ? 'white' : 'black')
const skills = reactive([...CSkills, CSkillsCICD])
const emit = defineEmits(['addLoading', 'removeLoading'])

onBeforeMount(() => {
  emit('addLoading')
})

onMounted(() => {
  emit('removeLoading')
})
</script>
