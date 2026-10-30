<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { alertsApi } from '@/api/alerts.api.js'
import { REPORT_TYPES, SEVERITIES } from '@/config/domain.js'
import { badges } from '@/stores/badges.js'
import { locate } from '@/composables/useUserLocation.js'
import { useToast } from '@/composables/useToast.js'
import { useApiError } from '@/composables/useApiError.js'
import { useFormat } from '@/composables/format.js'
import ReportBadges from '@/components/reports/ReportBadges.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBlock from '@/components/ui/LoadingBlock.vue'

const { t } = useI18n()
const toast = useToast()
const { messageOf } = useApiError()
const { relative, distance, dateTime } = useFormat()

const tab = ref('list')
const unreadOnly = ref(false)
const data = ref({ content: [], page: 0, totalPages: 0, totalElements: 0 })
const loading = ref(true)
const confirmAll = ref(false)

// ---------- Lista ----------
async function load(page = 0) {
  loading.value = true
  try { data.value = await alertsApi.list({ unread: unreadOnly.value || undefined, page, size: 12 }) }
  catch (e) { toast.error(messageOf(e)) }
  finally { loading.value = false }
}

async function open(a) {
  if (a.status !== 'UNREAD') return
  try { await alertsApi.markRead(a.id); a.status = 'READ'; badges.refresh() } catch { /* no bloquea la navegación */ }
}

async function readAll() {
  try { await alertsApi.markAllRead(); await load(data.value.page); badges.refresh() }
  catch (e) { toast.error(messageOf(e)) }
}

async function remove(a) {
  try { await alertsApi.remove(a.id); await load(data.value.page); badges.refresh() }
  catch (e) { toast.error(messageOf(e)) }
}

async function removeAll() {
  try {
    await alertsApi.removeAll()
    confirmAll.value = false
    await load()
    badges.refresh()
  } catch (e) { toast.error(messageOf(e)) }
}

// ---------- Configuración ----------
const settings = reactive({ radiusMeters: 1000, minSeverity: 'LOW', ignoredTypes: [], mutedUntil: null, latitude: null, longitude: null, locationUpdatedAt: null })
const muteChoice = ref('keep')
const settingsLoading = ref(false)
const saving = ref(false)
const locating = ref(false)

const isMuted = computed(() => settings.mutedUntil && new Date(settings.mutedUntil) > new Date())

async function loadSettings() {
  settingsLoading.value = true
  try { Object.assign(settings, await alertsApi.getSettings()) }
  catch (e) { toast.error(messageOf(e)) }
  finally { settingsLoading.value = false }
}

function toggleType(type) {
  const i = settings.ignoredTypes.indexOf(type)
  i >= 0 ? settings.ignoredTypes.splice(i, 1) : settings.ignoredTypes.push(type)
}

async function saveSettings() {
  saving.value = true
  // PUT reemplaza todo: el silencio se calcula aquí a partir de la opción elegida.
  let mutedUntil = isMuted.value ? settings.mutedUntil : null
  if (muteChoice.value === 'off') mutedUntil = null
  else if (muteChoice.value !== 'keep') mutedUntil = new Date(Date.now() + Number(muteChoice.value) * 3600_000).toISOString()
  try {
    Object.assign(settings, await alertsApi.saveSettings({
      radiusMeters: Number(settings.radiusMeters), minSeverity: settings.minSeverity,
      ignoredTypes: settings.ignoredTypes, mutedUntil
    }))
    muteChoice.value = 'keep'
    toast.success(t('alerts.saved'))
  } catch (e) { toast.error(messageOf(e)) }
  finally { saving.value = false }
}

async function updateLocation() {
  locating.value = true
  try {
    const pos = await locate()
    if (!pos) return toast.error(t('map.locationDenied'))
    await alertsApi.sendLocation(pos.lat, pos.lng)
    await loadSettings()
    toast.success(t('alerts.locationUpdated'))
  } catch (e) { toast.error(messageOf(e)) }
  finally { locating.value = false }
}

function switchTab(name) {
  tab.value = name
  if (name === 'settings') loadSettings()
}

onMounted(() => load())
</script>

<template>
  <div class="page page-narrow">
    <div class="page-header">
      <div>
        <h1>{{ $t('alerts.title') }}</h1>
        <p>{{ $t('alerts.subtitle') }}</p>
      </div>
    </div>

    <div class="tabs" role="tablist">
      <button class="tab" :class="{ active: tab === 'list' }" role="tab" @click="switchTab('list')">{{ $t('alerts.tabList') }}</button>
      <button class="tab" :class="{ active: tab === 'settings' }" role="tab" @click="switchTab('settings')">{{ $t('alerts.tabSettings') }}</button>
    </div>

    <!-- Lista -->
    <template v-if="tab === 'list'">
      <div class="row row-between">
        <div class="row" style="gap: 6px">
          <button class="chip" :class="{ active: !unreadOnly }" @click="unreadOnly = false; load()">{{ $t('common.all') }}</button>
          <button class="chip" :class="{ active: unreadOnly }" @click="unreadOnly = true; load()">{{ $t('common.unread') }}</button>
        </div>
        <div class="row" style="gap: 6px">
          <button class="btn btn-secondary btn-sm" @click="readAll"><i class="pi pi-check-circle" /> {{ $t('common.markAllRead') }}</button>
          <button class="btn btn-ghost btn-sm" :disabled="!data.totalElements" @click="confirmAll = true"><i class="pi pi-trash" /> {{ $t('alerts.deleteAll') }}</button>
        </div>
      </div>

      <LoadingBlock v-if="loading" />
      <EmptyState v-else-if="!data.content.length" icon="pi-bell" :text="unreadOnly ? $t('alerts.emptyUnread') : $t('alerts.empty')" />
      <ul v-else class="list">
        <li v-for="a in data.content" :key="a.id" class="card item" :class="{ unread: a.status === 'UNREAD' }">
          <RouterLink :to="{ name: 'report-detail', params: { id: a.reportId } }" class="grow link" @click="open(a)">
            <ReportBadges :type="a.type" :severity="a.severity" />
            <h3>{{ a.title }}</h3>
            <p class="muted small">
              <i class="pi pi-compass" /> {{ $t('alerts.away', { distance: distance(a.distanceMeters) }) }}
              · <span :title="dateTime(a.createdAt)">{{ relative(a.createdAt) }}</span>
            </p>
          </RouterLink>
          <button class="icon-btn" :title="$t('common.delete')" @click="remove(a)"><i class="pi pi-trash" /></button>
        </li>
      </ul>
      <AppPagination :page="data.page" :total-pages="data.totalPages" :total-elements="data.totalElements" @change="load" />
    </template>

    <!-- Configuración -->
    <template v-else>
      <LoadingBlock v-if="settingsLoading" />
      <form v-else class="stack" @submit.prevent="saveSettings">
        <section class="card stack">
          <h3>{{ $t('alerts.location') }}</h3>
          <p v-if="settings.latitude != null" class="muted small">
            {{ settings.latitude.toFixed(5) }}, {{ settings.longitude.toFixed(5) }} · {{ relative(settings.locationUpdatedAt) }}
          </p>
          <p v-else class="alert-box info">{{ $t('alerts.noLocation') }}</p>
          <div><button type="button" class="btn btn-secondary" :disabled="locating" @click="updateLocation"><i class="pi pi-compass" /> {{ $t('alerts.updateLocation') }}</button></div>
        </section>

        <section class="card stack">
          <h3>{{ $t('alerts.radius') }}: {{ settings.radiusMeters >= 1000 ? (settings.radiusMeters / 1000).toFixed(1) + ' km' : settings.radiusMeters + ' m' }}</h3>
          <input v-model.number="settings.radiusMeters" type="range" min="100" max="20000" step="100" :aria-label="$t('alerts.radius')" />
          <div class="field">
            <label for="al-sev">{{ $t('alerts.minSeverity') }}</label>
            <select id="al-sev" v-model="settings.minSeverity" class="select">
              <option v-for="s in SEVERITIES" :key="s.value" :value="s.value">{{ $t(`report.severity.${s.value}`) }}</option>
            </select>
          </div>
        </section>

        <section class="card stack">
          <h3>{{ $t('alerts.ignoredTypes') }}</h3>
          <p class="muted small">{{ $t('alerts.ignoredHint') }}</p>
          <div class="row">
            <button v-for="ty in REPORT_TYPES" :key="ty.value" type="button" class="chip" :class="{ active: settings.ignoredTypes.includes(ty.value) }" @click="toggleType(ty.value)">
              <i class="pi" :class="ty.icon" /> {{ $t(`report.type.${ty.value}`) }}
            </button>
          </div>
        </section>

        <section class="card stack">
          <h3>{{ $t('alerts.mute') }}</h3>
          <p v-if="isMuted" class="alert-box info">{{ $t('alerts.mutedUntil', { date: dateTime(settings.mutedUntil) }) }}</p>
          <select v-model="muteChoice" class="select" :aria-label="$t('alerts.mute')">
            <option value="keep">{{ isMuted ? $t('alerts.keepMute') : $t('alerts.notMuted') }}</option>
            <option v-if="isMuted" value="off">{{ $t('alerts.unmute') }}</option>
            <option value="1">{{ $t('alerts.hours', 1) }}</option>
            <option value="8">{{ $t('alerts.hours', 8) }}</option>
            <option value="24">{{ $t('alerts.hours', 24) }}</option>
            <option value="168">{{ $t('alerts.week') }}</option>
          </select>
        </section>

        <div><button class="btn" :disabled="saving">{{ $t('common.save') }}</button></div>
      </form>
    </template>

    <ConfirmDialog v-model="confirmAll" :title="$t('alerts.deleteAll')" :message="$t('alerts.deleteAllMessage')" danger :confirm-label="$t('common.delete')" @confirm="removeAll" />
  </div>
</template>

<style scoped>
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.item { display: flex; align-items: center; gap: 10px; padding: 14px 16px; }
.item.unread { border-left: 4px solid var(--brand-600); background: var(--brand-50); }
.link { color: inherit; display: flex; flex-direction: column; gap: 4px; text-decoration: none; }
.link:hover { text-decoration: none; }
input[type='range'] { width: 100%; accent-color: var(--brand-600); }
</style>
