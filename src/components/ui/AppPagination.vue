<script setup>
// Paginación sobre el objeto { page, totalPages, totalElements } que devuelve el backend (page desde 0).
defineProps({ page: Number, totalPages: Number, totalElements: Number })
defineEmits(['change'])
</script>

<template>
  <nav v-if="totalPages > 1" class="pager" :aria-label="$t('common.pagination')">
    <button class="btn btn-secondary btn-sm" :disabled="page <= 0" @click="$emit('change', page - 1)">
      <i class="pi pi-chevron-left" />
    </button>
    <span class="muted small">{{ $t('common.pageOf', { page: page + 1, total: totalPages }) }} · {{ totalElements }}</span>
    <button class="btn btn-secondary btn-sm" :disabled="page >= totalPages - 1" @click="$emit('change', page + 1)">
      <i class="pi pi-chevron-right" />
    </button>
  </nav>
</template>

<style scoped>
.pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding-top: 6px; }
</style>
