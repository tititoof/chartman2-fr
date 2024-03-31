<template>
  <v-row
    dense
    class="py-6 d-flex"
  >
    <v-col
      class="d-flex justify-center text-h4"
      cols="12"
    >
      {{ $t('global.name') }}
    </v-col>
  </v-row>
  <v-row
    dense
    class="py-6 d-flex"
  >
    <v-col
      cols="4"
      md="6"
      class="d-flex justify-end"
    >
      {{ $t('legal_notices.fields.name') }}
    </v-col>
    <v-col
      cols="5"
      md="6"
      class="font-weight-black"
    >
      {{ $t('legal_notices.texts.name') }}
    </v-col>
  </v-row>
  <v-row
    dense
    class="py-6"
  >
    <v-col
      cols="4"
      md="6"
      class="d-flex justify-end"
    >
      {{ $t('legal_notices.fields.address') }}
    </v-col>
    <v-col
      cols="5"
      md="6"
      class="font-weight-black"
    >
      {{ $t('legal_notices.texts.address1') }}<br>
      {{ $t('legal_notices.texts.address2') }}<br>
      {{ $t('legal_notices.texts.address3') }}
    </v-col>
  </v-row>
  <v-row
    dense
    class="py-6"
  >
    <v-col
      cols="4"
      md="6"
      class="d-flex justify-end"
    >
      {{ $t('legal_notices.fields.contact') }}
    </v-col>
    <v-col
      cols="4"
      md="6"
      class="font-weight-black"
    >
      {{ $t('legal_notices.texts.contact') }}
    </v-col>
  </v-row>
  <v-row
    dense
    class="py-6"
  >
    <v-col
      cols="4"
      md="6"
      class="d-flex justify-end"
    >
      {{ $t('legal_notices.fields.website') }}
    </v-col>
    <v-col
      cols="5"
      md="6"
      class="font-weight-black"
    >
      <a
        :href="$t('legal_notices.texts.website')"
        variant="plain"
        target="_blank"
        class="pl-0 pt-0"
      >
        {{ $t('global.name') }}
      </a>
    </v-col>
  </v-row>
  <v-row
    dense
    class="py-6"
  >
    <v-col
      cols="4"
      md="6"
      class="d-flex justify-end"
    >
      {{ $t('legal_notices.fields.siren') }}
    </v-col>
    <v-col
      cols="5"
      md="6"
      class="font-weight-black"
    >
      {{ $t('legal_notices.texts.siren') }}
    </v-col>
  </v-row>

  <v-row
    dense
    class="py-6"
  >
    <v-col
      cols="4"
      md="6"
      class="d-flex justify-end"
    >
      {{ $t('legal_notices.fields.hosting') }}
    </v-col>
    <v-col
      cols="5"
      md="6"
      class="font-weight-black"
    >
      {{ $t('legal_notices.texts.hosting') }} <br>
      {{ $t('legal_notices.texts.hosting_address') }}<br>
      <a
        :href="$t('legal_notices.texts.hosting_website')"
        target="_blank"
        variant="plain"
        class="pl-0 pb-3"
      >
        {{ $t('legal_notices.texts.hosting_name') }}
      </a>
    </v-col>
  </v-row>
</template>

<script setup lang="ts"></script>
