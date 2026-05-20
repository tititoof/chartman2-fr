<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const id    = Number(route.params.id)

const { get, update }  = useArticles()
const store            = useArticleStore()
const { form, rules, isValid, fill } = useArticleForm()
const { success, error: notifyError } = useNotification()

const loading = ref(false)

const { data } = await useAsyncData(
  `article-edit-${id}`,
  async () => {
    const item = await get(id)
    store.setCurrentItem(item)
    fill(item)
    return item
  }
)

const onSubmit = async () => {
  if (!isValid.value) return
  loading.value = true
  try {
    const updated = await update(id, form)
    store.setCurrentItem(updated)
    success('Article mis à jour avec succès')
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
      <v-btn icon="mdi-arrow-left" variant="text" :to="`/articles/${id}/show`" />
      <h1 class="text-h4">Éditer Article #{{ id }}</h1>
    </div>
    <ArticleForm
      v-model="form"
      :rules="rules"
      :loading="loading"
      @submit="onSubmit"
      @cancel="navigateTo(`/articles/${id}/show`)">
    </ArticleForm>
  </v-container>
</template>