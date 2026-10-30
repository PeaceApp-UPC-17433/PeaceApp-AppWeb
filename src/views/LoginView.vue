<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { session } from '@/stores/session.js'
import { useApiError } from '@/composables/useApiError.js'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { messageOf } = useApiError()

const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await session.login(email.value, password.value)
    router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/map')
  } catch (e) {
    error.value = e.status === 401 ? t('auth.badCredentials') : messageOf(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="card stack form">
    <div>
      <h1>{{ $t('auth.welcome') }}</h1>
      <p class="muted">{{ $t('auth.loginSubtitle') }}</p>
    </div>
    <p v-if="route.query.expired" class="alert-box info">{{ $t('auth.sessionExpired') }}</p>
    <p v-if="route.query.reset" class="alert-box success">{{ $t('auth.passwordChanged') }}</p>

    <form class="stack" @submit.prevent="submit">
      <div class="field">
        <label for="email">{{ $t('auth.email') }}</label>
        <input id="email" v-model="email" class="input" type="email" autocomplete="username" required />
      </div>
      <div class="field">
        <label for="password">{{ $t('auth.password') }}</label>
        <input id="password" v-model="password" class="input" type="password" autocomplete="current-password" required />
      </div>
      <p v-if="error" class="alert-box error" role="alert">{{ error }}</p>
      <button class="btn btn-block" :disabled="busy">{{ busy ? $t('common.loading') : $t('auth.login') }}</button>
    </form>

    <div class="stack small" style="gap: 4px">
      <RouterLink to="/forgot-password">{{ $t('auth.forgot') }}</RouterLink>
      <span class="muted">{{ $t('auth.noAccount') }} <RouterLink to="/register">{{ $t('auth.signUp') }}</RouterLink></span>
    </div>
  </div>
</template>
