<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { create } = useArticles()
const { form, rules, reset, isValid } = useArticleForm()
const { success, error: notifyError } = useNotification()

const loading = ref(false)

const onSubmit = async () => {
  if (!isValid.value) return
  loading.value = true
  try {
    await create(form)
    reset()
    success('Article créé avec succès')
    await navigateTo('/articles')
  } catch (e: any) {
    notifyError(e.data?.message || 'Une erreur est survenue')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container max-width="700">
    <div class="d-flex align-center mb-6 gap-2">
      <v-btn icon="mdi-arrow-left" variant="text" :to="`/articles`" />
      <h1 class="text-h4">Créer un(e) Article</h1>
    </div>
    <ArticleForm
      v-model="form"
      :rules="rules"
      :loading="loading"
      @submit="onSubmit"
      @cancel="navigateTo('/articles')"
    />
  </v-container>
</template>