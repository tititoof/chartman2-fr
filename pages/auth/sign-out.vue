<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container class="text-center">
      <page-title
        :title="$t('default.auth.sign_out.title')"
        icon="i-mdi:logout-variant"
        :links="titleLinks"
      />
      <section class="py-12">
        <v-card>
          <v-card-text>
            {{ $t('default.auth.sign_out.text') }}
          </v-card-text>
        </v-card>
      </Section>
    </v-container>
  </v-row>
</template>

<script setup lang="ts">
import { useAuthApi } from '~/composables/api/useAuthApi'
import { useApplicationStore } from '~/stores/application'

const { signOut } = useAuthApi()
const applicationStore = useApplicationStore()
const titleLinks = reactive([])

const handleSignOut = async () => {
  const { status } = await signOut()

  if (status.value == 'success') {
    const token = useCookie('token')

    applicationStore.showSnackbar('success', 'default.auth.sign_out.success')

    token.value = ''

    refreshCookie('token')
  } else {
    applicationStore.showSnackbar('error', 'default.auth.sign_out.fail')
  }
}

onMounted(() => {
  handleSignOut()
})
</script>
