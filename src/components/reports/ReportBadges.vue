<script setup>
import { severityMeta, statusMeta, typeMeta } from '@/config/domain.js'

defineProps({ type: String, severity: String, status: String })
</script>

<template>
  <div class="row" style="gap: 6px">
    <span v-if="type" class="badge badge-soft"><i class="pi" :class="typeMeta[type]?.icon" />{{ $t(`report.type.${type}`) }}</span>
    <span v-if="severity" class="badge" :style="{ background: severityMeta[severity]?.color }">{{ $t(`report.severity.${severity}`) }}</span>
    <span v-if="status" class="badge" :style="{ background: statusMeta[status]?.color }">{{ $t(`report.status.${status}`) }}</span>
  </div>
</template>
