<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/components/ui/AppDialog.vue'
import { FLAG_REASONS } from '@/config/domain.js'
import { communityApi } from '@/api/community.api.js'
import { useToast } from '@/composables/useToast.js'
import { useApiError } from '@/composables/useApiError.js'

// Denuncia un reporte o un comentario según `target.kind`.
const props = defineProps({ modelValue: Boolean, target: Object })
const emit = defineEmits(['update:modelValue', 'flagged'])

const { t } = useI18n()
const toast = useToast()
const { messageOf } = useApiError()
const reason = ref('SPAM')
const details = ref('')
const busy = ref(false)

watch(() => props.modelValue, (open) => {
  if (open) { reason.value = 'SPAM'; details.value = '' }
})

async function submit() {
  busy.value = true
  try {
    const call = props.target.kind === 'report' ? communityApi.flagReport : communityApi.flagComment
    await call(props.target.id, reason.value, details.value.trim() || undefined)
    toast.success(t('flag.sent'))
    emit('update:modelValue', false)
    emit('flagged')
  } catch (e) {
    toast.error(e.status === 409 ? t('flag.already') : messageOf(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AppDialog :model-value="modelValue" :title="$t('flag.title')" width="460px" @update:model-value="emit('update:modelValue', $event)">
    <form class="stack" @submit.prevent="submit">
      <div class="field">
        <label for="flag-reason">{{ $t('flag.reason') }}</label>
        <select id="flag-reason" v-model="reason" class="select">
          <option v-for="r in FLAG_REASONS" :key="r" :value="r">{{ $t(`flag.reasons.${r}`) }}</option>
        </select>
      </div>
      <div class="field">
        <label for="flag-details">{{ $t('flag.details') }}</label>
        <textarea id="flag-details" v-model="details" class="textarea" maxlength="255" />
      </div>
    </form>
    <template #footer>
      <button class="btn btn-secondary" @click="emit('update:modelValue', false)">{{ $t('common.cancel') }}</button>
      <button class="btn btn-danger" :disabled="busy" @click="submit">{{ $t('flag.submit') }}</button>
    </template>
  </AppDialog>
</template>
