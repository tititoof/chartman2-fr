<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const id    = Number(route.params.id)

const { get, remove } = useArticles()
const store           = useArticleStore()
const { success, error: notifyError } = useNotification()

const deleteLoading = ref(false)
const showDelete    = ref(false)

const { data } = await useAsyncData(
  `article-show-${id}`,
  async () => {
    const item = await get(id)
    store.setCurrentItem(item)
    return item
  }
)

const onDeleteConfirm = async () => {
  deleteLoading.value = true
  try {
    await remove(id)
    success('Article supprimé avec succès')
    await navigateTo('/articles')
  } catch (e: any) {
    notifyError(e.data?.message || 'Erreur lors de la suppression')
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <v-container max-width="700">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="d-flex align-center gap-2">
        <v-btn icon="mdi-arrow-left" variant="text" to="/articles" />
        <h1 class="text-h4">Article #{{ id }}</h1>
      </div>
      <div class="d-flex gap-2">
        <v-btn color="primary" :to="`/articles/${id}/edit`">Éditer</v-btn>
        <v-btn color="error" variant="outlined" @click="showDelete = true">Supprimer</v-btn>
      </div>
    </div>

    <ArticleDetail v-if="store.currentItem" :item="store.currentItem" />
    <v-skeleton-loader v-else type="article" />

    <ConfirmDialog
      v-model="showDelete"
      title="Supprimer le/la Article"
      message="Êtes-vous sûr de vouloir supprimer cet élément ?"
      :loading="deleteLoading"
      @confirm="onDeleteConfirm"
    />
  </v-container>
</template>