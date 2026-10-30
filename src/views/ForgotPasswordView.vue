<script setup>
import { ref } from 'vue'
import { authApi } from '@/api/auth.api.js'
import { useApiError } from '@/composables/useApiError.js'

const { messageOf } = useApiError()
const email = ref('')
const busy = ref(false)
const sent = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  busy.value = true
  try {
    // El backend responde 202 exista o no el correo, para no revelar qué cuentas hay.
    await authApi.forgotPassword(email.value.trim().toLowerCase())
    sent.value = true
  } catch (e) {
    error.value = messageOf(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="card stack">
    <div>
      <h1>{{ $t('auth.recoverTitle') }}</h1>
      <p class="muted">{{ $t('auth.recoverSubtitle') }}</p>
    </div>

    <template v-if="sent">
      <p class="alert-box success">{{ $t('auth.recoverSent') }}</p>
      <RouterLink to="/reset-password" class="btn btn-block">{{ $t('auth.haveToken') }}</RouterLink>
    </template>
    <form v-else class="stack" @submit.prevent="submit">
      <div class="field">
        <label for="fp-email">{{ $t('auth.email') }}</label>
        <input id="fp-email" v-model="email" class="input" type="email" required />
      </div>
      <p v-if="error" class="alert-box error" role="alert">{{ error }}</p>
      <button class="btn btn-block" :disabled="busy">{{ $t('auth.sendLink') }}</button>
    </form>
    <RouterLink to="/login" class="small">{{ $t('auth.backToLogin') }}</RouterLink>
  </div>
</template>
