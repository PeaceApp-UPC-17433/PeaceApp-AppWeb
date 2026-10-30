<script setup>
import { ref, onMounted } from 'vue'
import { communityApi } from '@/api/community.api.js'
import { useToast } from '@/composables/useToast.js'
import { useApiError } from '@/composables/useApiError.js'

// Votos de confirmación / duda. El dueño del reporte y los reportes cerrados no pueden votar.
const props = defineProps({ reportId: Number, canVote: Boolean })
const emit = defineEmits(['changed'])

const toast = useToast()
const { messageOf } = useApiError()
const summary = ref(null)
const busy = ref(false)

async function load() {
  try { summary.value = await communityApi.votes(props.reportId) } catch { summary.value = null }
}

async function vote(type) {
  busy.value = true
  try {
    summary.value = summary.value?.myVote === type
        ? await communityApi.retractVote(props.reportId)
        : await communityApi.vote(props.reportId, type)
    emit('changed')
  } catch (e) {
    toast.error(messageOf(e))
  } finally {
    busy.value = false
  }
}

onMounted(load)
defineExpose({ reload: load })
</script>

<template>
  <section v-if="summary" class="card">
    <h3 class="card-title">{{ $t('votes.title') }}</h3>
    <div class="row">
      <button class="btn" :class="summary.myVote === 'CONFIRM' ? '' : 'btn-secondary'" :disabled="busy || !canVote" @click="vote('CONFIRM')">
        <i class="pi pi-check" /> {{ $t('votes.confirm') }} ({{ summary.confirmations }})
      </button>
      <button class="btn" :class="summary.myVote === 'DISPUTE' ? 'btn-danger' : 'btn-secondary'" :disabled="busy || !canVote" @click="vote('DISPUTE')">
        <i class="pi pi-times" /> {{ $t('votes.dispute') }} ({{ summary.disputes }})
      </button>
    </div>
    <div class="meter" role="progressbar" :aria-valuenow="Math.max(summary.net, 0)" :aria-valuemax="summary.verificationThreshold">
      <span :style="{ width: Math.min(100, Math.max(0, summary.net) / summary.verificationThreshold * 100) + '%' }" />
    </div>
    <p class="muted small">{{ $t('votes.progress', { net: summary.net, threshold: summary.verificationThreshold }) }}</p>
    <p v-if="!canVote" class="muted small">{{ $t('votes.cannot') }}</p>
  </section>
</template>

<style scoped>
.meter { height: 8px; background: var(--brand-100); border-radius: 99px; margin: 14px 0 6px; overflow: hidden; }
.meter span { display: block; height: 100%; background: var(--success); transition: width 0.3s; }
</style>
