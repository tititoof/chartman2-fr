<template>
  <v-container
    id="contact-me"
    class="text-center py-12"
  >
    <section-title
      eyebrow="Contactez-moi"
      title=""
    />

    <v-card
      color="secondary-container"
      variant="flat"
      class="mx-auto contact-card"
      max-width="640"
    >
      <v-form
        ref="form"
        v-model="valid"
      >
        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="name"
              variant="outlined"
              bg-color="background"
              label="Nom*"
              :rules="nameRules"
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="email"
              variant="outlined"
              bg-color="background"
              label="Email*"
              :rules="emailRules"
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="subject"
              variant="outlined"
              bg-color="background"
              label="Sujet*"
              :rules="subjectRules"
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <v-textarea
              v-model="message"
              variant="outlined"
              bg-color="background"
              label="Message*"
              :rules="messageRules"
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col
            class="py-4"
            cols="12"
          >
            <v-btn
              class="btn-lire"
              color="primary"
              variant="outlined"
              rounded="lg"
              size="large"
              min-width="180"
              @click="sendEmail"
            >
              Envoyer
            </v-btn>
          </v-col>
        </v-row>
      </v-form>
    </v-card>
  </v-container>
</template>

<script setup>
import { useApplicationStore } from '~/stores/application'

const applicationStore = useApplicationStore()
const emit = defineEmits(['addLoading', 'removeLoading'])
const valid = ref(false)
const name = ref('')
const email = ref('')
const subject = ref('')
const message = ref('')

const nameRules = [
  v => !!v || 'Votre nom est requis',
  v => v.length <= 30 || 'Votre nom doit faire moins de 30 caractères',
]
const emailRules = [
  v => !!v || 'Votre courriel (e-mail) est requis',
  v => /.+@.+\..+/.test(v) || 'Votre courriel (e-mail) doit être valide',
]
const subjectRules = [
  v => !!v || 'Le sujet est requis',
  v => v.length >= 5 || 'Le sujet doit faire au moins 5 caractères',
]
const messageRules = [
  v => !!v || 'Le message est requis',
  v => v.length >= 15 || 'Le message doit faire au moins 15 caractères',
]

const sendEmail = async () => {
  if (valid.value === true) {
    const result = await $fetch('/api/email', {
      method: 'post',
      body: {
        name: name.value,
        email: email.value,
        subject: subject.value,
        message: message.value,
      },
    })

    if (result.error === null) {
      applicationStore.showSnackbar('success', 'Courriel envoyé.')
    } else {
      applicationStore.showSnackbar('error', `Impossible d'envoyer le courriel.`)
    }
  }
}

onBeforeMount(() => {
  emit('addLoading')
})

onMounted(() => {
  emit('removeLoading')
})
</script>

<style lang="css" scoped>
.contact-card {
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 20px;
  padding: 32px 28px;
}

.btn-lire {
  transition: background-color 0.15s ease, color 0.15s ease;
}

.btn-lire:hover {
  background-color: rgb(var(--v-theme-primary)) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
}
</style>
