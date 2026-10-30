<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminApi } from '@/api/community.api.js'
import { reportsApi } from '@/api/reports.api.js'
import { FLAG_STATUSES, REPORT_STATUSES, statusMeta } from '@/config/domain.js'
import { useToast } from '@/composables/useToast.js'
import { useApiError } from '@/composables/useApiError.js'
import { useFormat } from '@/composables/format.js'
import AppDialog from '@/components/ui/AppDialog.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import ReportCard from '@/components/reports/ReportCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBlock from '@/components/ui/LoadingBlock.vue'

const { t } = useI18n()
const toast = useToast()
const { messageOf } = useApiError()
const { dateTime, relative } = useFormat()

const tab = ref('metrics')
const loading = ref(false)
const metrics = ref(null)
const flags = ref({ content: [], page: 0, totalPages: 0, totalElements: 0 })
const flagStatus = ref('OPEN')
const log = ref({ content: [], page: 0, totalPages: 0, totalElements: 0 })
const queue = ref({ content: [], page: 0, totalPages: 0, totalElements: 0 })
const queueStatus = ref('PENDING')

const resolving = ref(null)
const resolution = reactive({ value: 'DISMISSED', note: '' })
const busy = ref(false)

const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`)

async function guard(fn) {
  loading.value = true
  try { await fn() } catch (e) { toast.error(messageOf(e)) } finally { loading.value = false }
}

const loadMetrics = () => guard(async () => { metrics.value = await adminApi.metrics() })
const loadFlags = (page = 0) => guard(async () => { flags.value = await adminApi.flags({ status: flagStatus.value, page, size: 10 }) })
const loadLog = (page = 0) => guard(async () => { log.value = await adminApi.moderationLog({ page, size: 15 }) })
const loadQueue = (page = 0) => guard(async () => { queue.value = await reportsApi.list({ status: queueStatus.value, sortBy: 'createdAt', direction: 'asc', page, size: 12 }) })

function openResolve(flag) {
  resolving.value = flag
  resolution.value = 'DISMISSED'
  resolution.note = ''
}

async function resolve() {
  busy.value = true
  try {
    await adminApi.resolveFlag(resolving.value.id, resolution.value, resolution.note.trim() || undefined)
    toast.success(t('admin.resolved'))
    resolving.value = null
    await loadFlags(flags.value.page)
  } catch (e) {
    toast.error(e.status === 409 ? t('admin.alreadyResolved') : messageOf(e))
  } finally { busy.value = false }
}

function switchTab(name) {
  tab.value = name
  ;({ metrics: loadMetrics, flags: loadFlags, log: loadLog, queue: loadQueue })[name]()
}

watch(flagStatus, () => loadFlags())
watch(queueStatus, () => loadQueue())
onMounted(loadMetrics)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>{{ $t('admin.title') }}</h1>
        <p>{{ $t('admin.subtitle') }}</p>
      </div>
    </div>

    <div class="tabs" role="tablist">
      <button v-for="k in ['metrics', 'flags', 'queue', 'log']" :key="k" class="tab" :class="{ active: tab === k }" role="tab" @click="switchTab(k)">{{ $t(`admin.tab.${k}`) }}</button>
    </div>

    <!-- Métricas -->
    <template v-if="tab === 'metrics'">
      <LoadingBlock v-if="!metrics" />
      <template v-else>
        <div class="stats">
          <div class="card stat"><span>{{ metrics.reports.total }}</span><small>{{ $t('admin.m.total') }}</small></div>
          <div class="card stat"><span>{{ pct(metrics.reports.verifiedRate) }}</span><small>{{ $t('admin.m.verifiedRate') }}</small></div>
          <div class="card stat"><span>{{ metrics.reports.averageAttentionHours == null ? '—' : metrics.reports.averageAttentionHours.toFixed(1) + ' h' }}</span><small>{{ $t('admin.m.attention') }}</small></div>
          <div class="card stat"><span>{{ metrics.flags.open }}</span><small>{{ $t('admin.m.openFlags') }}</small></div>
          <div class="card stat"><span>{{ pct(metrics.flags.actionRate) }}</span><small>{{ $t('admin.m.actionRate') }}</small></div>
        </div>
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))">
          <section class="card">
            <h3 class="card-title">{{ $t('admin.m.byStatus') }}</h3>
            <div v-for="s in REPORT_STATUSES" :key="s.value" class="bar-row">
              <span class="small">{{ $t(`report.status.${s.value}`) }}</span>
              <div class="bar"><i :style="{ width: (metrics.reports.total ? (metrics.reports.byStatus?.[s.value] || 0) / metrics.reports.total * 100 : 0) + '%', background: statusMeta[s.value].color }" /></div>
              <strong>{{ metrics.reports.byStatus?.[s.value] || 0 }}</strong>
            </div>
          </section>
          <section class="card">
            <h3 class="card-title">{{ $t('admin.m.community') }}</h3>
            <dl class="kv">
              <div><dt>{{ $t('admin.m.comments') }}</dt><dd>{{ metrics.community.comments }}</dd></div>
              <div><dt>{{ $t('admin.m.confirmations') }}</dt><dd>{{ metrics.community.confirmations }}</dd></div>
              <div><dt>{{ $t('admin.m.disputes') }}</dt><dd>{{ metrics.community.disputes }}</dd></div>
              <div><dt>{{ $t('admin.m.dismissed') }}</dt><dd>{{ metrics.flags.dismissed }}</dd></div>
              <div><dt>{{ $t('admin.m.actionTaken') }}</dt><dd>{{ metrics.flags.actionTaken }}</dd></div>
            </dl>
          </section>
        </div>
      </template>
    </template>

    <!-- Denuncias -->
    <template v-else-if="tab === 'flags'">
      <div class="row">
        <button v-for="s in FLAG_STATUSES" :key="s" class="chip" :class="{ active: flagStatus === s }" @click="flagStatus = s">{{ $t(`admin.flagStatus.${s}`) }}</button>
      </div>
      <LoadingBlock v-if="loading" />
      <EmptyState v-else-if="!flags.content.length" icon="pi-shield" :text="$t('admin.noFlags')" />
      <div v-else class="card table-wrap">
        <table class="table">
          <thead><tr><th>{{ $t('admin.target') }}</th><th>{{ $t('flag.reason') }}</th><th>{{ $t('flag.details') }}</th><th>{{ $t('admin.when') }}</th><th /></tr></thead>
          <tbody>
            <tr v-for="f in flags.content" :key="f.id">
              <td>
                <RouterLink v-if="f.targetType === 'REPORT'" :to="{ name: 'report-detail', params: { id: f.targetId } }">{{ $t('admin.report') }} #{{ f.targetId }}</RouterLink>
                <span v-else>{{ $t('admin.comment') }} #{{ f.targetId }}</span>
              </td>
              <td>{{ $t(`flag.reasons.${f.reason}`) }}</td>
              <td>{{ f.details || '—' }}<p v-if="f.resolutionNote" class="muted small">↳ {{ f.resolutionNote }}</p></td>
              <td class="small">{{ dateTime(f.createdAt) }}</td>
              <td><button v-if="f.status === 'OPEN'" class="btn btn-sm" @click="openResolve(f)">{{ $t('admin.resolve') }}</button><span v-else class="badge badge-soft">{{ $t(`admin.flagStatus.${f.status}`) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppPagination :page="flags.page" :total-pages="flags.totalPages" :total-elements="flags.totalElements" @change="loadFlags" />
    </template>

    <!-- Cola de reportes -->
    <template v-else-if="tab === 'queue'">
      <div class="row">
        <button v-for="s in ['PENDING', 'UNDER_REVIEW', 'VERIFIED']" :key="s" class="chip" :class="{ active: queueStatus === s }" @click="queueStatus = s">{{ $t(`report.status.${s}`) }}</button>
      </div>
      <p class="muted small">{{ $t('admin.queueHint') }}</p>
      <LoadingBlock v-if="loading" />
      <EmptyState v-else-if="!queue.content.length" icon="pi-check-circle" :text="$t('admin.noQueue')" />
      <div v-else class="grid"><ReportCard v-for="r in queue.content" :key="r.id" :report="r" /></div>
      <AppPagination :page="queue.page" :total-pages="queue.totalPages" :total-elements="queue.totalElements" @change="loadQueue" />
    </template>

    <!-- Historial -->
    <template v-else>
      <LoadingBlock v-if="loading" />
      <EmptyState v-else-if="!log.content.length" icon="pi-history" :text="$t('admin.noLog')" />
      <div v-else class="card table-wrap">
        <table class="table">
          <thead><tr><th>{{ $t('admin.action') }}</th><th>{{ $t('admin.target') }}</th><th>{{ $t('admin.note') }}</th><th>{{ $t('admin.when') }}</th></tr></thead>
          <tbody>
            <tr v-for="a in log.content" :key="a.id">
              <td><span class="badge badge-soft">{{ $t(`admin.logType.${a.type}`) }}</span></td>
              <td>{{ a.targetType === 'REPORT' ? $t('admin.report') : $t('admin.comment') }} #{{ a.targetId }}</td>
              <td>{{ a.note || '—' }}</td>
              <td class="small" :title="dateTime(a.createdAt)">{{ relative(a.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppPagination :page="log.page" :total-pages="log.totalPages" :total-elements="log.totalElements" @change="loadLog" />
    </template>

    <AppDialog :model-value="!!resolving" :title="$t('admin.resolveTitle')" width="460px" @update:model-value="resolving = null">
      <div class="stack">
        <div class="field">
          <label for="res-kind">{{ $t('admin.resolution') }}</label>
          <select id="res-kind" v-model="resolution.value" class="select">
            <option value="DISMISSED">{{ $t('admin.dismiss') }}</option>
            <option value="ACTION_TAKEN">{{ $t('admin.actionTake') }}</option>
          </select>
          <span class="hint">{{ resolution.value === 'ACTION_TAKEN' ? $t('admin.actionHint') : $t('admin.dismissHint') }}</span>
        </div>
        <div class="field">
          <label for="res-note">{{ $t('admin.note') }}</label>
          <textarea id="res-note" v-model="resolution.note" class="textarea" maxlength="255" />
        </div>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="resolving = null">{{ $t('common.cancel') }}</button>
        <button class="btn" :disabled="busy" @click="resolve">{{ $t('admin.resolve') }}</button>
      </template>
    </AppDialog>
  </div>
</template>

<style scoped>
.stats { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
.stat { display: flex; flex-direction: column; gap: 2px; }
.stat span { font-size: 1.8rem; font-weight: 800; color: var(--brand-700); }
.stat small { color: var(--text-muted); }
.bar-row { display: grid; grid-template-columns: 110px 1fr 36px; gap: 10px; align-items: center; padding: 5px 0; }
.bar { background: var(--brand-50); height: 10px; border-radius: 99px; overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 99px; }
.kv { margin: 0; }
.kv div { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--border); }
.kv dt { color: var(--text-muted); }
.kv dd { margin: 0; font-weight: 700; }
</style>
