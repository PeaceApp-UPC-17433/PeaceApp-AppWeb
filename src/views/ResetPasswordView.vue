<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '@/api/auth.api.js'
import { useApiError } from '@/composables/useApiError.js'
import { useI18n } from 'vue-i18n'
import PasswordInput from '@/components/ui/PasswordInput.vue'
import PasswordRules from '@/components/auth/PasswordRules.vue'
import { isStrongPassword } from '@/config/password.js'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { messageOf } = useApiError()

// El token llega en el enlace (?token=...) o se pega a mano.
const token = ref(typeof route.query.token === 'string' ? route.query.token : '')
const password = ref('')
const confirm = ref('')
const busy = ref(false)
const error = ref('')

const mismatch = computed(() => confirm.value && confirm.value !== password.value)
const canSubmit = computed(() => isStrongPassword(password.value) && !!confirm.value && !mismatch.value)

async function submit() {
  if (!canSubmit.value) return
  error.value = ''
  busy.value = true
  try {
    await authApi.resetPassword(token.value.trim(), password.value)
    router.replace({ name: 'login', query: { reset: '1' } }).catch(() => {})
  } catch (e) {
    error.value = e.status === 400 ? t('auth.tokenInvalid') : messageOf(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="card stack">
    <div class="auth-heading">
      <p class="eyebrow">{{ $t('auth.recoverLabel') }}</p>
      <h1>{{ $t('auth.resetTitle') }}</h1>
      <p class="muted">{{ $t('auth.resetSubtitle') }}</p>
    </div>
    <form class="stack" @submit.prevent="submit">
      <div class="field">
        <label for="rp-token">{{ $t('auth.token') }}</label>
        <input id="rp-token" v-model="token" class="input" required autocomplete="off" />
      </div>
      <div class="field">
        <label for="rp-pass">{{ $t('auth.newPassword') }}</label>
        <PasswordInput id="rp-pass" v-model="password" autocomplete="new-password" required />
        <PasswordRules :value="password" />
      </div>
      <div class="field">
        <label for="rp-confirm">{{ $t('auth.confirmPassword') }}</label>
        <PasswordInput id="rp-confirm" v-model="confirm" :invalid="!!mismatch" autocomplete="new-password" required />
        <span v-if="mismatch" class="field-error">{{ $t('auth.mismatch') }}</span>
      </div>
      <p v-if="error" class="alert-box error" role="alert">{{ error }}</p>
      <button type="submit" class="btn btn-block" :disabled="busy || !canSubmit">{{ $t('common.save') }}</button>
    </form>
    <RouterLink to="/login" class="small">{{ $t('auth.backToLogin') }}</RouterLink>
  </div>
</template>
