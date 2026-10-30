<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { notificationsApi } from '@/api/notifications.api.js'
import { NOTIFICATION_KINDS } from '@/config/domain.js'
import { badges } from '@/stores/badges.js'
import { useToast } from '@/composables/useToast.js'
import { useApiError } from '@/composables/useApiError.js'
import { useFormat } from '@/composables/format.js'
import AppPagination from '@/components/ui/AppPagination.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBlock from '@/components/ui/LoadingBlock.vue'

const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const { messageOf } = useApiError()
const { relative } = useFormat()

const tab = ref('list')
const unreadOnly = ref(false)
const data = ref({ content: [], page: 0, totalPages: 0, totalElements: 0 })
const loading = ref(true)
const prefs = reactive({ inAppEnabled: true, pushEnabled: true, disabledKinds: [] })
const prefsLoading = ref(false)
const saving = ref(false)

const kindIcon = { PROXIMITY_ALERT: 'pi-exclamation-triangle', CONTACT_REQUEST: 'pi-user-plus', CONTACT_ACCEPTED: 'pi-check-circle' }

async function load(page = 0) {
  loading.value = true
  try { data.value = await notificationsApi.list({ unread: unreadOnly.value || undefined, page, size: 15 }) }
  catch (e) { toast.error(messageOf(e)) }
  finally { loading.value = false }
}

// Cada tipo de aviso lleva a su pantalla: alertas y reportes, o la de contactos.
async function open(n) {
  if (!n.read) {
    try { await notificationsApi.markRead(n.id); n.read = true; badges.refresh() } catch { /* se navega igual */ }
  }
  if (n.kind === 'PROXIMITY_ALERT' && n.referenceId) router.push({ name: 'report-detail', params: { id: n.referenceId } })
  else if (n.kind.startsWith('CONTACT')) router.push({ name: 'contacts' })
}

async function readAll() {
  try { await notificationsApi.markAllRead(); await load(data.value.page); badges.refresh() }
  catch (e) { toast.error(messageOf(e)) }
}

async function remove(n) {
  try { await notificationsApi.remove(n.id); await load(data.value.page); badges.refresh() }
  catch (e) { toast.error(messageOf(e)) }
}

async function loadPrefs() {
  prefsLoading.value = true
  try { Object.assign(prefs, await notificationsApi.getPreferences()) }
  catch (e) { toast.error(messageOf(e)) }
  finally { prefsLoading.value = false }
}

const kindEnabled = (k) => !prefs.disabledKinds.includes(k)
function toggleKind(k) {
  const i = prefs.disabledKinds.indexOf(k)
  i >= 0 ? prefs.disabledKinds.splice(i, 1) : prefs.disabledKinds.push(k)
}

async function savePrefs() {
  saving.value = true
  try {
    Object.assign(prefs, await notificationsApi.savePreferences({
      inAppEnabled: prefs.inAppEnabled, pushEnabled: prefs.pushEnabled, disabledKinds: prefs.disabledKinds
    }))
    toast.success(t('notifications.saved'))
  } catch (e) { toast.error(messageOf(e)) }
  finally { saving.value = false }
}

function switchTab(name) {
  tab.value = name
  if (name === 'prefs') loadPrefs()
}

onMounted(() => load())
</script>

<template>
  <div class="page page-narrow">
    <div class="page-header">
      <div>
        <h1>{{ $t('notifications.title') }}</h1>
        <p>{{ $t('notifications.subtitle') }}</p>
      </div>
    </div>

    <div class="tabs" role="tablist">
      <button class="tab" :class="{ active: tab === 'list' }" role="tab" @click="switchTab('list')">{{ $t('notifications.tabList') }}</button>
      <button class="tab" :class="{ active: tab === 'prefs' }" role="tab" @click="switchTab('prefs')">{{ $t('notifications.tabPrefs') }}</button>
    </div>

    <template v-if="tab === 'list'">
      <div class="row row-between">
        <div class="row" style="gap: 6px">
          <button class="chip" :class="{ active: !unreadOnly }" @click="unreadOnly = false; load()">{{ $t('common.all') }}</button>
          <button class="chip" :class="{ active: unreadOnly }" @click="unreadOnly = true; load()">{{ $t('common.unread') }}</button>
        </div>
        <button class="btn btn-secondary btn-sm" @click="readAll"><i class="pi pi-check-circle" /> {{ $t('common.markAllRead') }}</button>
      </div>

      <LoadingBlock v-if="loading" />
      <EmptyState v-else-if="!data.content.length" icon="pi-bell" :text="$t('notifications.empty')" />
      <ul v-else class="list">
        <li v-for="n in data.content" :key="n.id" class="card item" :class="{ unread: !n.read }">
          <i class="pi kind" :class="kindIcon[n.kind] || 'pi-bell'" />
          <button class="body" @click="open(n)">
            <strong>{{ n.title }}</strong>
            <span class="muted">{{ n.body }}</span>
            <span class="muted small">{{ relative(n.createdAt) }}</span>
          </button>
          <button class="icon-btn" :title="$t('common.delete')" @click="remove(n)"><i class="pi pi-trash" /></button>
        </li>
      </ul>
      <AppPagination :page="data.page" :total-pages="data.totalPages" :total-elements="data.totalElements" @change="load" />
    </template>

    <template v-else>
      <LoadingBlock v-if="prefsLoading" />
      <form v-else class="stack" @submit.prevent="savePrefs">
        <section class="card">
          <h3 class="card-title">{{ $t('notifications.channels') }}</h3>
          <label class="switch-row"><span>{{ $t('notifications.inApp') }}</span><input v-model="prefs.inAppEnabled" type="checkbox" /></label>
          <label class="switch-row"><span>{{ $t('notifications.push') }}</span><input v-model="prefs.pushEnabled" type="checkbox" /></label>
          <p class="hint">{{ $t('notifications.pushHint') }}</p>
        </section>
        <section class="card">
          <h3 class="card-title">{{ $t('notifications.kinds') }}</h3>
          <label v-for="k in NOTIFICATION_KINDS" :key="k" class="switch-row">
            <span>{{ $t(`notifications.kind.${k}`) }}</span>
            <input type="checkbox" :checked="kindEnabled(k)" @change="toggleKind(k)" />
          </label>
        </section>
        <div><button class="btn" :disabled="saving">{{ $t('common.save') }}</button></div>
      </form>
    </template>
  </div>
</template>

<style scoped>
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.item { display: flex; align-items: center; gap: 14px; padding: 12px 16px; }
.item.unread { border-left: 4px solid var(--brand-600); background: var(--brand-50); }
.kind { background: var(--brand-100); color: var(--brand-700); padding: 10px; border-radius: 50%; }
.body { flex: 1; display: flex; flex-direction: column; gap: 2px; text-align: left; background: none; border: none; font: inherit; color: inherit; cursor: pointer; padding: 0; }
input[type='checkbox'] { width: 20px; height: 20px; accent-color: var(--brand-600); }
</style>
