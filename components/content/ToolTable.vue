<template>
  <div class="tool-table">
    <slot />
  </div>
</template>

<style scoped>
.tool-table :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.tool-table :deep(th) {
  text-align: left;
  padding: 0.6rem 1rem;
  border-bottom: 2px solid #41dcce;
  color: #41dcce;
  font-weight: 600;
}

.tool-table :deep(td) {
  padding: 0.65rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  vertical-align: middle;
}

.tool-table :deep(tr:last-child td) {
  border-bottom: none;
}

.tool-table :deep(tr:hover td) {
  background: rgba(65, 220, 206, 0.05);
}
</style>