<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import { REPORT_TYPES, SEVERITIES, REPORT_STATUSES } from '@/config/domain.js'
import { reportsApi } from '@/api/reports.api.js'
import { useToast } from '@/composables/useToast.js'
import { useApiError } from '@/composables/useApiError.js'
import ReportCard from '@/components/reports/ReportCard.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBlock from '@/components/ui/LoadingBlock.vue'

const toast = useToast()
const { messageOf } = useApiError()

const filters = reactive({ q: '', type: '', severity: '', status: '', from: '', to: '', mine: false, sortBy: 'occurredAt', direction: 'desc' })
const data = ref({ content: [], page: 0, totalPages: 0, totalElements: 0 })
const loading = ref(true)
let timer = null

async function load(page = 0) {
  loading.value = true
  try {
    data.value = await reportsApi.list({
      ...filters,
      mine: filters.mine || undefined,
      // Las fechas del formulario son día completo en UTC.
      from: filters.from ? `${filters.from}T00:00:00Z` : '',
      to: filters.to ? `${filters.to}T23:59:59Z` : '',
      page,
      size: 12
    })
  } catch (e) {
    toast.error(messageOf(e))
  } finally {
    loading.value = false
  }
}

function reset() {
  Object.assign(filters, { q: '', type: '', severity: '', status: '', from: '', to: '', mine: false, sortBy: 'occurredAt', direction: 'desc' })
}

// La búsqueda por texto espera a que el usuario deje de escribir.
watch(() => filters.q, () => { clearTimeout(timer); timer = setTimeout(() => load(), 400) })
watch(() => [filters.type, filters.severity, filters.status, filters.from, filters.to, filters.mine, filters.sortBy, filters.direction], () => load())
onMounted(() => load())
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>{{ $t('reports.title') }}</h1>
        <p>{{ $t('reports.subtitle') }}</p>
      </div>
      <RouterLink :to="{ name: 'report-new' }" class="btn"><i class="pi pi-plus" /> {{ $t('reports.new') }}</RouterLink>
    </div>

    <section class="card stack">
      <div class="row">
        <div class="field grow" style="min-width: 220px">
          <input v-model="filters.q" class="input" type="search" :placeholder="$t('reports.search')" :aria-label="$t('reports.search')" />
        </div>
        <div class="row" style="gap: 6px">
          <button class="chip" :class="{ active: !filters.mine }" @click="filters.mine = false">{{ $t('reports.all') }}</button>
          <button class="chip" :class="{ active: filters.mine }" @click="filters.mine = true">{{ $t('reports.mine') }}</button>
        </div>
      </div>
      <div class="filters">
        <select v-model="filters.type" class="select" :aria-label="$t('report.typeLabel')">
          <option value="">{{ $t('report.allTypes') }}</option>
          <option v-for="ty in REPORT_TYPES" :key="ty.value" :value="ty.value">{{ $t(`report.type.${ty.value}`) }}</option>
        </select>
        <select v-model="filters.severity" class="select" :aria-label="$t('report.severityLabel')">
          <option value="">{{ $t('report.allSeverities') }}</option>
          <option v-for="s in SEVERITIES" :key="s.value" :value="s.value">{{ $t(`report.severity.${s.value}`) }}</option>
        </select>
        <select v-model="filters.status" class="select" :aria-label="$t('report.statusLabel')">
          <option value="">{{ $t('report.allStatuses') }}</option>
          <option v-for="s in REPORT_STATUSES" :key="s.value" :value="s.value">{{ $t(`report.status.${s.value}`) }}</option>
        </select>
        <input v-model="filters.from" class="input" type="date" :aria-label="$t('reports.from')" :title="$t('reports.from')" />
        <input v-model="filters.to" class="input" type="date" :aria-label="$t('reports.to')" :title="$t('reports.to')" />
        <select v-model="filters.direction" class="select" :aria-label="$t('reports.order')">
          <option value="desc">{{ $t('reports.newest') }}</option>
          <option value="asc">{{ $t('reports.oldest') }}</option>
        </select>
        <button class="btn btn-ghost" @click="reset"><i class="pi pi-filter-slash" /> {{ $t('reports.clear') }}</button>
      </div>
    </section>

    <LoadingBlock v-if="loading" />
    <EmptyState v-else-if="!data.content.length" icon="pi-file" :text="$t('reports.empty')" />
    <div v-else class="grid">
      <ReportCard v-for="r in data.content" :key="r.id" :report="r" />
    </div>
    <AppPagination :page="data.page" :total-pages="data.totalPages" :total-elements="data.totalElements" @change="load" />
  </div>
</template>

<style scoped>
.filters { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
</style>
