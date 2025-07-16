<template>
  <v-card color="info-container">
    <v-container
      id="contact-me"
      class="text-center"
    >
      <section-title title="Contactez moi" />

      <v-responsive>
        <v-form
          ref="form"
          v-model="valid"
        >
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="name"
                flat
                label="Nom*"
                :rules="nameRules"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="email"
                flat
                label="Email*"
                :rules="emailRules"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="subject"
                flat
                label="Sujet*"
                :rules="subjectRules"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-textarea
                v-model="message"
                flat
                label="Message*"
                :rules="messageRules"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col
              class="mx-auto py-4" 
              cols="12"
            >
              <v-btn
                color="primary"
                block
                variant="outlined"
                dark
                @click="sendEmail"
              >
                Envoyer
              </v-btn>
            </v-col>
          </v-row>
        </v-form>
      </v-responsive>
    </v-container>
  </v-card>
</template>
<script setup>
const valid = ref(false)
const name = ref('')
const email = ref("")
const subject = ref("")
const message = ref("")

const nameRules = [
  (v) => !!v || "Votre nom est requis",
  (v) => v.length <= 30 || "Votre nom doit faire moins de 30 caractères",
];
const emailRules = [
  (v) => !!v || "Votre courriel (e-mail) est requis",
  (v) => /.+@.+\..+/.test(v) || "Votre courriel (e-mail) doit être valide",
];
const subjectRules = [
  (v) => !!v || "Le sujet est requis",
  (v) => v.length >= 5 || "Le sujet doit faire au moins de 5 caractères",
];
const messageRules = [
  (v) => !!v || "Le message est requis",
  (v) => v.length >= 15 || "Le message doit faire au moins de 15 caractères",
];

const sendEmail = async () => {
  if (valid.value === true) {
    fetch("https://api.chartman2.fr/contacts/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contact: {
          name,
          email,
          subject,
          message,
        },
      }),
    })
      // .then((response) => response.json())
      .then((response) => {
        valid.value = false
        name.value = ""
        email.value = ""
        subject.value = ""
        message.value = ""
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }
};
</script>