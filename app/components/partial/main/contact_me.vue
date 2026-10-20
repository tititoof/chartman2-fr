<template>
  <v-container
    id="contact-me"
    class="text-center py-12"
  >
    <section-title
      eyebrow="Contact"
      title="Un projet, une mission ?"
    />

    <p class="contact-intro mx-auto mb-8">
      Décrivez votre besoin en quelques lignes : contexte, stack, délais.
      Mission freelance ou opportunité salariée, je vous réponds rapidement.
    </p>

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
              label="E-mail*"
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
              :loading="isSubmitting"
              :disabled="isSubmitting"
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
const form = ref(null)
const valid = ref(false)
const isSubmitting = ref(false)
const name = ref('')
const email = ref('')
const subject = ref('')
const message = ref('')

const nameRules = [
  v => !!v || 'Votre nom est requis',
  v => v.length <= 100 || 'Votre nom doit faire moins de 100 caractères',
]
const emailRules = [
  v => !!v || 'Votre e-mail est requis',
  v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Votre e-mail doit être valide',
]
const subjectRules = [
  v => !!v || 'Le sujet est requis',
  v => v.length >= 5 || 'Le sujet doit faire au moins 5 caractères',
]
const messageRules = [
  v => !!v || 'Le message est requis',
  v => v.length >= 15 || 'Le message doit faire au moins 15 caractères',
]

const sendErrorMessage = `Une erreur est survenue lors de l'envoi. Vous pouvez aussi me contacter sur LinkedIn.`

const sendEmail = async () => {
  // Valide tous les champs, même non touchés, pour afficher leurs erreurs
  const { valid: isValid } = await form.value.validate()

  if (!isValid || isSubmitting.value) {
    return
  }

  isSubmitting.value = true

  try {
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
      applicationStore.showSnackbar('success', 'Message envoyé avec succès ! Je vous répondrai dans les plus brefs délais.')
    }
    else {
      applicationStore.showSnackbar('error', sendErrorMessage)
    }
  }
  catch {
    applicationStore.showSnackbar('error', sendErrorMessage)
  }
  finally {
    isSubmitting.value = false
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
.contact-intro {
  color: rgb(var(--v-theme-muted));
  max-width: 560px;
}

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
