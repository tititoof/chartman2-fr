<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container class="text-center">
      <page-title
        :title="$t('default.auth.sign_in.title')"
        icon="i-mdi:login-variant"
        :links="titleLinks"
      />
      <section class="py-12">
        <LazyAuthComponentsForm
          @submit-form="handleSubmit"
        />
      </Section>
    </v-container>
  </v-row>
</template>

<script setup lang="ts">
import { useCookies } from '@vueuse/integrations/useCookies'
import { useAuthApi } from '~/composables/api/useAuthApi'
import { useApplicationStore } from '~/stores/application'

const applicationStore = useApplicationStore()
const { $apiErrors } = useNuxtApp()
const router = useRouter()
const { signIn } = useAuthApi()
const titleLinks = reactive([])

const handleSubmit = async (payload: { email: string, password: string }) => {
  const {data: response, status } = await useAsyncData(JSON.stringify(payload), () =>  signIn(payload), {
    immediate: true,
    server: false,
  })

  if (status.value == 'success') {
    applicationStore.showSnackbar('success', 'default.auth.sign_in.success')

    const cookies = useCookies('token', {
      maxAge: 60 * 60 * 24 * 7,
      secure: true,
      httpOnly: true,
    })

    cookies.set('token', response.value.token)
    cookies.set('refresh_token', response.value.refresh_token)

    router.push('/ages')
  } else {
    applicationStore.showSnackbar('error', 'default.auth.sign_in.fail')
  }
}
</script>