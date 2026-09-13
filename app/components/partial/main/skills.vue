<!-- eslint-disable vue/multiline-html-element-content-newline -->
<template>
  <v-card color="surface" variant="flat">
    <v-container
      id="features"
      class="text-center py-12"
    >
      <section-title
        eyebrow="Mes compétences"
        title=""
      />

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
              class="py-12 px-4 skill-card"
              color="background"
              variant="flat"
              max-height="300"
              min-height="300"
            >
              <v-avatar
                v-if="type === 'icon'"
                color="surface"
                size="72"
                class="skill-avatar"
              >
                <v-icon size="x-large" color="primary" :icon="src">
                </v-icon>
              </v-avatar>
              <v-avatar
                v-else
                color="surface"
                size="72"
                class="skill-avatar"
              >
                <v-avatar
                  color="surface"
                  size="42"
                  rounded="lg"
                  :image="src"
                />
              </v-avatar>
              <p class="skill-card-title">
                {{ skillTitle }}
              </p>
              <p class="skill-card-desc">
                {{ skillText }}
              </p>
            </v-card>
          </v-col>
        </v-row>
        <v-responsive
          class="mx-auto"
          width="112"
        >
          <v-divider color="border" class="mt-4" />

        </v-responsive>
      </section>
    </v-container>
  </v-card>
</template>

<script setup>
import { CSkills, CSkillsCICD } from '~/utils/common'

const skills = reactive([...CSkills, CSkillsCICD])
const emit = defineEmits(['addLoading', 'removeLoading'])

const imageSrcs = skills
  .flatMap(({ skill }) => skill)
  .filter(({ type }) => type === 'image')
  .map(({ src }) => src)

onBeforeMount(() => {
  emit('addLoading')
})

onMounted(async () => {
  await preloadImages(imageSrcs)
  emit('removeLoading')
})
</script>

<style lang="css" scoped>
.skill-card {
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 12px;
}

.skill-avatar {
  border-radius: 12px !important;
}

.skill-card-title {
  font-size: 13px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 16px 0 8px;
}

.skill-card-desc {
  color: rgb(var(--v-theme-muted));
  font-size: 13px;
  margin: 0;
}
</style>
