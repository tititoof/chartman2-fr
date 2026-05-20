<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { list, remove } = useArticles()
const store            = useArticleStore()
const { success, error: notifyError } = useNotification()

const search        = ref('')
const deleteId      = ref<number | null>(null)
const deleteLoading = ref(false)
const showDelete    = ref(false)

const { refresh } = await useAsyncData(
  'articles-list',
  async () => {
    store.setLoading(true)
    try {
      const data = await list(store.meta.page, { search: search.value })
      store.setList(data)
    } catch (e: any) {
      store.setError(e.data?.message || 'Erreur de chargement')
    } finally {
      store.setLoading(false)
    }
  },
  { watch: [() => store.meta.page, search] }
)

const onSearch = () => { store.meta.page = 1 }

const onDeleteRequest = (id: number) => {
  deleteId.value = id
  showDelete.value = true
}

const onDeleteConfirm = async () => {
  if (!deleteId.value) return
  deleteLoading.value = true
  try {
    await remove(deleteId.value)
    store.removeItem(deleteId.value)
    showDelete.value = false
    success('Article supprimé avec succès')
  } catch (e: any) {
    notifyError(e.data?.message || 'Erreur lors de la suppression')
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h4">Articles</h1>
      <v-btn color="primary" :to="`/articles/create`">Créer un(e) Article</v-btn>
    </div>

    <AppSearch v-model="search" @update:modelValue="onSearch" />

    <v-alert v-if="store.error" type="error" class="mb-4">{{ store.error }}</v-alert>

    <v-row v-if="!store.loading">
      <v-col
        cols="12" md="6" lg="4"
        v-for="item in store.items"
        :key="item.id"
      >
        <ArticleCard
          :item="item"
          @show="navigateTo(`/articles/${$event}/show`)">
        </ArticleCard>
      </v-col>
      <v-col v-if="store.isEmpty" cols="12">
        <v-empty-state title="Aucun résultat" icon="mdi-magnify" />
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col cols="12" md="6" lg="4" v-for="n in 6" :key="n">
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>

    <AppPagination
      v-model="store.meta.page"
      :total="store.meta.total"
      :per-page="store.meta.per_page"
    />

    <ConfirmDialog
      v-model="showDelete"
      title="Supprimer le/la Article"
      message="Êtes-vous sûr de vouloir supprimer cet élément ?"
      :loading="deleteLoading"
      @confirm="onDeleteConfirm"
    />
  </v-container>
</template>