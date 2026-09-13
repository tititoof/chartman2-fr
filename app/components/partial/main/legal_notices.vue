<template>
  <v-card
    color="background"
    variant="flat"
    class="mx-auto legal-card"
    max-width="720"
  >
    <h3 class="legal-card-title">
      {{ $t('global.name') }}
    </h3>

    <div class="legal-row">
      <span class="legal-label">{{ $t('legal_notices.fields.name') }}</span>
      <span class="legal-value">{{ $t('legal_notices.texts.name') }}</span>
    </div>

    <div class="legal-row">
      <span class="legal-label">{{ $t('legal_notices.fields.address') }}</span>
      <span class="legal-value">
        {{ $t('legal_notices.texts.address1') }}<br>
        {{ $t('legal_notices.texts.address2') }}<br>
        {{ $t('legal_notices.texts.address3') }}
      </span>
    </div>

    <div class="legal-row">
      <span class="legal-label">{{ $t('legal_notices.fields.contact') }}</span>
      <span class="legal-value">{{ $t('legal_notices.texts.contact') }}</span>
    </div>

    <div class="legal-row">
      <span class="legal-label">{{ $t('legal_notices.fields.website') }}</span>
      <span class="legal-value">
        <a
          :href="$t('legal_notices.texts.website')"
          target="_blank"
          class="legal-link"
        >
          {{ $t('global.name') }}
        </a>
      </span>
    </div>

    <div class="legal-row">
      <span class="legal-label">{{ $t('legal_notices.fields.siren') }}</span>
      <span class="legal-value">{{ $t('legal_notices.texts.siren') }}</span>
    </div>

    <div class="legal-row legal-row-last">
      <span class="legal-label">{{ $t('legal_notices.fields.hosting') }}</span>
      <span class="legal-value">
        {{ $t('legal_notices.texts.hosting') }}<br>
        {{ $t('legal_notices.texts.hosting_address') }}<br>
        <a
          :href="$t('legal_notices.texts.hosting_website')"
          target="_blank"
          class="legal-link"
        >
          {{ $t('legal_notices.texts.hosting_name') }}
        </a>
      </span>
    </div>
  </v-card>
</template>

<script lang="ts" setup>
const emit = defineEmits(['addLoading', 'removeLoading'])

onBeforeMount(() => {
  emit('addLoading')
})

onMounted(() => {
  emit('removeLoading')
})
</script>

<style lang="css" scoped>
.legal-card {
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 20px;
  padding: 32px 28px;
}

.legal-card-title {
  font-family: var(--font-display);
  font-size: var(--text-h3);
  font-weight: 700;
  text-align: center;
  margin-bottom: 28px;
}

.legal-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
  padding: 16px 0;
  border-bottom: 1px solid rgb(var(--v-theme-border));
}

.legal-row-last {
  border-bottom: none;
  padding-bottom: 0;
}

.legal-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(var(--v-theme-muted));
}

.legal-value {
  color: rgb(var(--v-theme-on-background));
  line-height: 1.6;
}

.legal-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.legal-link:hover {
  text-decoration: underline;
}

@media (min-width: 960px) {
  .legal-row {
    grid-template-columns: 220px 1fr;
    align-items: baseline;
    gap: 16px;
  }
}
</style>
