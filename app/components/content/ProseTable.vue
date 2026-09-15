<template>
  <div class="prose-table-wrapper">
    <table>
      <slot />
    </table>
  </div>
</template>

<style scoped>
.prose-table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  max-width: 100%;
}
</style>
