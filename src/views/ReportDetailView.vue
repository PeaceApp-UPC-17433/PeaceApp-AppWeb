<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { reportsApi } from '@/api/reports.api.js'
import { session } from '@/stores/session.js'
import { STATUS_TRANSITIONS } from '@/config/domain.js'
import { useToast } from '@/composables/useToast.js'
import { useApiError } from '@/composables/useApiError.js'
import { useFormat } from '@/composables/format.js'
import ReportBadges from '@/components/reports/ReportBadges.vue'
import VotePanel from '@/components/reports/VotePanel.vue'
import CommentsSection from '@/components/reports/CommentsSection.vue'
import FlagDialog from '@/components/reports/FlagDialog.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import LoadingBlock from '@/components/ui/LoadingBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const props = defineProps({ id: String })
const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const { messageOf } = useApiError()
const { dateTime } = useFormat()

const report = ref(null)
const loading = ref(true)
const notFound = ref(false)
const flagOpen = ref(false)
const deleteOpen = ref(false)
const busy = ref(false)
const newStatus = ref('')
const votePanel = ref(null)

const isOwner = computed(() => report.value?.idUser === session.profileId.value)
const canEdit = computed(() => isOwner.value || session.state.isAdmin)
const closed = computed(() => ['DISCARDED', 'RESOLVED'].includes(report.value?.status))
const nextStatuses = computed(() => STATUS_TRANSITIONS[report.value?.status] || [])

async function load() {
  loading.value = true
  try {
    report.value = await reportsApi.get(props.id)
    newStatus.value = ''
  } catch (e) {
    if (e.status === 404) notFound.value = true
    else toast.error(messageOf(e))
  } finally {
    loading.value = false
  }
}

async function changeStatus() {
  if (!newStatus.value) return
  busy.value = true
  try {
    report.value = await reportsApi.changeStatus(report.value.id, newStatus.value)
    newStatus.value = ''
    toast.success(t('reportDetail.statusChanged'))
  } catch (e) {
    toast.error(e.status === 409 ? t('reportDetail.transitionNotAllowed') : messageOf(e))
  } finally {
    busy.value = false
  }
}

async function remove() {
  busy.value = true
  try {
    await reportsApi.remove(report.value.id)
    toast.success(t('reportDetail.deleted'))
    router.replace({ name: 'reports' })
  } catch (e) {
    toast.error(messageOf(e))
    busy.value = false
    deleteOpen.value = false
  }
}

// La verificación comunitaria se aplica en segundo plano: se vuelve a leer el reporte poco después del voto.
function onVoteChanged() {
  setTimeout(async () => {
    try { report.value = await reportsApi.get(props.id) } catch { /* se conserva lo mostrado */ }
  }, 1200)
}

onMounted(load)
</script>

<template>
  <div class="page page-narrow">
    <RouterLink :to="{ name: 'reports' }" class="small"><i class="pi pi-arrow-left" /> {{ $t('reportDetail.back') }}</RouterLink>

    <LoadingBlock v-if="loading" />
    <EmptyState v-else-if="notFound || !report" icon="pi-search" :text="$t('reportDetail.notFound')" />

    <template v-else>
      <article class="card stack">
        <img v-if="report.image" :src="report.image" :alt="report.title" class="photo" />
        <ReportBadges :type="report.type" :severity="report.severity" :status="report.status" />
        <h1>{{ report.title }}</h1>
        <p v-if="report.detail" class="detail">{{ report.detail }}</p>
        <dl class="meta">
          <div><dt><i class="pi pi-map-marker" /> {{ $t('reportDetail.address') }}</dt><dd>{{ report.address }}</dd></div>
          <div><dt><i class="pi pi-clock" /> {{ $t('reportDetail.occurredAt') }}</dt><dd>{{ dateTime(report.occurredAt) }}</dd></div>
          <div><dt><i class="pi pi-calendar" /> {{ $t('reportDetail.createdAt') }}</dt><dd>{{ dateTime(report.createdAt) }}</dd></div>
        </dl>

        <div class="row">
          <RouterLink v-if="canEdit" :to="{ name: 'report-edit', params: { id: report.id } }" class="btn btn-secondary"><i class="pi pi-pencil" /> {{ $t('common.edit') }}</RouterLink>
          <button v-if="canEdit" class="btn btn-secondary" @click="deleteOpen = true"><i class="pi pi-trash" /> {{ $t('common.delete') }}</button>
          <button v-if="!isOwner" class="btn btn-ghost" @click="flagOpen = true"><i class="pi pi-flag" /> {{ $t('flag.title') }}</button>
        </div>
      </article>

      <section v-if="session.state.isAdmin && nextStatuses.length" class="card stack">
        <h3>{{ $t('reportDetail.moderation') }}</h3>
        <div class="row">
          <select v-model="newStatus" class="select grow" :aria-label="$t('report.statusLabel')">
            <option value="" disabled>{{ $t('reportDetail.changeStatus') }}</option>
            <option v-for="s in nextStatuses" :key="s" :value="s">{{ $t(`report.status.${s}`) }}</option>
          </select>
          <button class="btn" :disabled="!newStatus || busy" @click="changeStatus">{{ $t('common.apply') }}</button>
        </div>
      </section>

      <VotePanel ref="votePanel" :report-id="report.id" :can-vote="!isOwner && !closed" @changed="onVoteChanged" />
      <CommentsSection :report-id="report.id" />

      <FlagDialog v-model="flagOpen" :target="{ kind: 'report', id: report.id }" />
      <ConfirmDialog v-model="deleteOpen" :title="$t('reportDetail.deleteTitle')" :message="$t('reportDetail.deleteMessage')" danger :busy="busy" :confirm-label="$t('common.delete')" @confirm="remove" />
    </template>
  </div>
</template>

<style scoped>
.photo { width: 100%; max-height: 360px; object-fit: cover; border-radius: 10px; }
.detail { white-space: pre-wrap; }
.meta { display: grid; gap: 10px; margin: 0; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.meta dt { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
.meta dd { margin: 2px 0 0; font-weight: 600; }
</style>
