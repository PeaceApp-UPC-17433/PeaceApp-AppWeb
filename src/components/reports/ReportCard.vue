<script setup>
import ReportBadges from './ReportBadges.vue'
import { useFormat } from '@/composables/format.js'

defineProps({ report: { type: Object, required: true } })
const { relative } = useFormat()
</script>

<template>
  <RouterLink :to="{ name: 'report-detail', params: { id: report.id } }" class="card report-card">
    <div v-if="report.image" class="thumb" :style="{ backgroundImage: `url('${report.image}')` }" />
    <div class="body">
      <ReportBadges :type="report.type" :severity="report.severity" :status="report.status" />
      <h3>{{ report.title }}</h3>
      <p v-if="report.detail" class="detail">{{ report.detail }}</p>
      <p class="muted small"><i class="pi pi-map-marker" /> {{ report.address }}</p>
      <p class="muted small"><i class="pi pi-clock" /> {{ relative(report.occurredAt) }}</p>
    </div>
  </RouterLink>
</template>

<style scoped>
.report-card { display: flex; flex-direction: column; padding: 0; overflow: hidden; color: inherit; text-decoration: none; transition: transform 0.15s, box-shadow 0.15s; }
.report-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); text-decoration: none; }
.thumb { height: 150px; background-size: cover; background-position: center; background-color: var(--brand-100); }
.body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 6px; }
.detail { color: var(--text-muted); font-size: 0.92rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
