<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { contactsApi } from '@/api/contacts.api.js'
import { badges } from '@/stores/badges.js'
import { useToast } from '@/composables/useToast.js'
import { useApiError } from '@/composables/useApiError.js'
import { useFormat } from '@/composables/format.js'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingBlock from '@/components/ui/LoadingBlock.vue'

const { t } = useI18n()
const toast = useToast()
const { messageOf } = useApiError()
const { date } = useFormat()

const tab = ref('accepted')
const lists = reactive({ accepted: [], incoming: [], outgoing: [], blocked: [] })
const loading = ref(true)
const email = ref('')
const sending = ref(false)
const pending = ref(null) // { action, contact } a confirmar

const tabs = computed(() => ['accepted', 'incoming', 'outgoing', 'blocked'].map((k) => ({ key: k, count: lists[k].length })))

async function load() {
  loading.value = true
  try {
    const [accepted, incoming, outgoing, blocked] = await Promise.all([
      contactsApi.accepted(), contactsApi.incoming(), contactsApi.outgoing(), contactsApi.blocked()
    ])
    Object.assign(lists, { accepted, incoming, outgoing, blocked })
  } catch (e) { toast.error(messageOf(e)) }
  finally { loading.value = false }
}

async function sendRequest() {
  sending.value = true
  try {
    await contactsApi.request(email.value.trim().toLowerCase())
    toast.success(t('contacts.requestSent'))
    email.value = ''
    await load()
    tab.value = 'outgoing'
  } catch (e) {
    const known = { 404: 'contacts.errNotFound', 409: 'contacts.errExists' }
    toast.error(known[e.status] ? t(known[e.status]) : messageOf(e))
  } finally { sending.value = false }
}

// Ejecuta una acción sobre una relación y recarga las cuatro listas.
async function run(fn, c, okKey) {
  try {
    await fn(c.id)
    toast.success(t(okKey))
    await load()
    badges.refresh()
  } catch (e) { toast.error(messageOf(e)) }
}

const accept = (c) => run(contactsApi.accept, c, 'contacts.accepted')
const decline = (c) => run(contactsApi.decline, c, 'contacts.declined')

const confirmCopy = {
  block: { title: 'contacts.blockTitle', message: 'contacts.blockMessage', label: 'contacts.block' },
  remove: { title: 'contacts.removeTitle', message: 'contacts.removeMessage', label: 'common.delete' }
}

async function confirmAction() {
  const { action, contact } = pending.value
  pending.value = null
  await run(action === 'block' ? contactsApi.block : contactsApi.remove, contact, action === 'block' ? 'contacts.blocked' : 'contacts.removed')
}

onMounted(load)
</script>

<template>
  <div class="page page-narrow">
    <div class="page-header">
      <div>
        <h1>{{ $t('contacts.title') }}</h1>
        <p>{{ $t('contacts.subtitle') }}</p>
      </div>
    </div>

    <form class="card row" style="flex-wrap: nowrap" @submit.prevent="sendRequest">
      <input v-model="email" class="input" type="email" required :placeholder="$t('contacts.emailPlaceholder')" :aria-label="$t('contacts.emailPlaceholder')" />
      <button class="btn" :disabled="sending"><i class="pi pi-user-plus" /> {{ $t('contacts.add') }}</button>
    </form>

    <div class="tabs" role="tablist">
      <button v-for="tb in tabs" :key="tb.key" class="tab" :class="{ active: tab === tb.key }" role="tab" @click="tab = tb.key">
        {{ $t(`contacts.tab.${tb.key}`) }} <span v-if="tb.count" class="counter" :style="tb.key !== 'incoming' && { background: 'var(--brand-600)' }">{{ tb.count }}</span>
      </button>
    </div>

    <LoadingBlock v-if="loading" />
    <EmptyState v-else-if="!lists[tab].length" icon="pi-users" :text="$t(`contacts.empty.${tab}`)" />
    <ul v-else class="list">
      <li v-for="c in lists[tab]" :key="c.id" class="card item">
        <span class="avatar">{{ (c.name || c.email)[0].toUpperCase() }}</span>
        <div class="grow">
          <strong>{{ c.name }} {{ c.lastname }}</strong>
          <p class="muted small">{{ c.email }} · {{ date(c.respondedAt || c.createdAt) }}</p>
        </div>

        <template v-if="tab === 'incoming'">
          <button class="btn btn-sm" @click="accept(c)"><i class="pi pi-check" /> {{ $t('contacts.accept') }}</button>
          <button class="btn btn-secondary btn-sm" @click="decline(c)">{{ $t('contacts.decline') }}</button>
          <button class="icon-btn" :title="$t('contacts.block')" @click="pending = { action: 'block', contact: c }"><i class="pi pi-ban" /></button>
        </template>
        <template v-else-if="tab === 'accepted'">
          <button class="icon-btn" :title="$t('contacts.block')" @click="pending = { action: 'block', contact: c }"><i class="pi pi-ban" /></button>
          <button class="icon-btn" :title="$t('common.delete')" @click="pending = { action: 'remove', contact: c }"><i class="pi pi-trash" /></button>
        </template>
        <button v-else-if="tab === 'outgoing'" class="btn btn-secondary btn-sm" @click="run(contactsApi.remove, c, 'contacts.cancelled')">{{ $t('contacts.cancel') }}</button>
        <button v-else class="btn btn-secondary btn-sm" @click="run(contactsApi.remove, c, 'contacts.unblocked')">{{ $t('contacts.unblock') }}</button>
      </li>
    </ul>

    <ConfirmDialog
      :model-value="!!pending"
      :title="pending ? $t(confirmCopy[pending.action].title) : ''"
      :message="pending ? $t(confirmCopy[pending.action].message, { name: pending.contact.name }) : ''"
      :confirm-label="pending ? $t(confirmCopy[pending.action].label) : ''"
      danger
      @update:model-value="pending = null"
      @confirm="confirmAction"
    />
  </div>
</template>

<style scoped>
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; flex-wrap: wrap; }
.avatar { width: 42px; height: 42px; border-radius: 50%; background: var(--brand-100); color: var(--brand-700); display: grid; place-items: center; font-weight: 700; }
.tab .counter { margin-left: 4px; }
</style>
