<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { communityApi } from '@/api/community.api.js'
import { session } from '@/stores/session.js'
import { useToast } from '@/composables/useToast.js'
import { useApiError } from '@/composables/useApiError.js'
import { useFormat } from '@/composables/format.js'
import AppPagination from '@/components/ui/AppPagination.vue'
import FlagDialog from './FlagDialog.vue'

const props = defineProps({ reportId: Number })
const { t } = useI18n()
const toast = useToast()
const { messageOf } = useApiError()
const { relative } = useFormat()

const data = ref({ content: [], page: 0, totalPages: 0, totalElements: 0 })
const text = ref('')
const loading = ref(true)
const sending = ref(false)
const flagTarget = ref(null)
const flagOpen = ref(false)

async function load(page = 0) {
  loading.value = true
  try { data.value = await communityApi.comments(props.reportId, { page, size: 10 }) }
  catch (e) { toast.error(messageOf(e)) }
  finally { loading.value = false }
}

async function send() {
  if (!text.value.trim()) return
  sending.value = true
  try {
    await communityApi.addComment(props.reportId, text.value.trim())
    text.value = ''
    // Los comentarios van del más antiguo al más nuevo: se salta a la última página.
    const first = await communityApi.comments(props.reportId, { page: 0, size: 10 })
    await load(Math.max(first.totalPages - 1, 0))
  } catch (e) {
    toast.error(messageOf(e))
  } finally {
    sending.value = false
  }
}

async function remove(c) {
  try {
    await communityApi.deleteComment(c.id)
    toast.success(t('comments.removed'))
    await load(data.value.page)
  } catch (e) { toast.error(messageOf(e)) }
}

const canDelete = (c) => session.state.isAdmin || c.authorId === session.profileId.value
const canFlag = (c) => c.authorId !== session.profileId.value

function flag(c) {
  flagTarget.value = { kind: 'comment', id: c.id }
  flagOpen.value = true
}

onMounted(() => load())
</script>

<template>
  <section class="card">
    <h3 class="card-title">{{ $t('comments.title') }} ({{ data.totalElements }})</h3>

    <form class="row" style="align-items: flex-start" @submit.prevent="send">
      <textarea v-model="text" class="textarea grow" rows="2" maxlength="500" :placeholder="$t('comments.placeholder')" />
      <button class="btn" :disabled="sending || !text.trim()"><i class="pi pi-send" /> {{ $t('comments.send') }}</button>
    </form>

    <div v-if="loading" class="loading"><span class="spinner" /></div>
    <p v-else-if="!data.content.length" class="muted" style="padding: 16px 0">{{ $t('comments.empty') }}</p>
    <ul v-else class="list">
      <li v-for="c in data.content" :key="c.id">
        <div class="row row-between">
          <span class="muted small">
            <i class="pi pi-user" />
            {{ c.authorId === session.profileId.value ? $t('comments.you') : $t('comments.neighbor', { id: c.authorId }) }}
            · {{ relative(c.createdAt) }}
          </span>
          <span>
            <button v-if="canFlag(c)" class="icon-btn" :title="$t('flag.title')" @click="flag(c)"><i class="pi pi-flag" /></button>
            <button v-if="canDelete(c)" class="icon-btn" :title="$t('common.delete')" @click="remove(c)"><i class="pi pi-trash" /></button>
          </span>
        </div>
        <p>{{ c.text }}</p>
      </li>
    </ul>
    <AppPagination :page="data.page" :total-pages="data.totalPages" :total-elements="data.totalElements" @change="load" />
    <FlagDialog v-model="flagOpen" :target="flagTarget" />
  </section>
</template>

<style scoped>
.list { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; }
.list li { padding: 12px 0; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; }
.list li p { white-space: pre-wrap; word-break: break-word; }
</style>
