<script setup>
import { nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { session } from '@/stores/session.js'
import { useApiError } from '@/composables/useApiError.js'
import { useI18n } from 'vue-i18n'
import PasswordInput from '@/components/ui/PasswordInput.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { messageOf } = useApiError()

const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const challenge = ref(null)
const code = ref('')
const recovery = ref(false)
const codeInput = ref(null)
const shakes = ref(0)

function finish() {
  router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/map').catch(() => {})
}

async function submit() {
  if (busy.value) return
  error.value = ''
  busy.value = true
  try {
    challenge.value = await session.login(email.value, password.value)
    if (!challenge.value) return finish()
    await nextTick()
    codeInput.value?.focus()
  } catch (e) {
    error.value = e.status === 401 ? t('auth.badCredentials') : messageOf(e)
  } finally {
    busy.value = false
  }
}

async function submitCode() {
  const ready = recovery.value ? code.value.replace(/[^a-z0-9]/gi, '').length >= 10 : code.value.length === 6
  if (busy.value || !ready) return
  error.value = ''
  busy.value = true
  try {
    await session.completeMfa(challenge.value, code.value)
    finish()
  } catch (e) {
    error.value = messageOf(e)
    shakes.value += 1
    if (e.code === 'MFA_CHALLENGE_EXPIRED') backToCredentials()
    else {
      code.value = ''
      await nextTick()
      codeInput.value?.focus()
    }
  } finally {
    busy.value = false
  }
}

function onCode(event) {
  code.value = recovery.value ? event.target.value.slice(0, 11) : event.target.value.replace(/\D/g, '').slice(0, 6)
  error.value = ''
  if (!recovery.value && code.value.length === 6) submitCode().catch(() => {})
}

async function toggleRecovery() {
  recovery.value = !recovery.value
  code.value = ''
  error.value = ''
  await nextTick()
  codeInput.value?.focus()
}

function backToCredentials() {
  challenge.value = null
  code.value = ''
  recovery.value = false
  password.value = ''
}
</script>

<template>
  <div class="login-form">
    <Transition name="step" mode="out-in">
    <div v-if="challenge" key="mfa" class="mfa-step">
      <div class="login-heading">
        <p class="eyebrow">{{ $t('mfa.step') }}</p>
        <h1>{{ recovery ? $t('mfa.recoveryTitle') : $t('mfa.loginTitle') }}</h1>
        <p class="muted">{{ recovery ? $t('mfa.recoveryHint') : $t('mfa.loginHint') }}</p>
      </div>
      <form class="stack login-fields" :aria-busy="busy" @submit.prevent="submitCode">
        <div :key="shakes" class="field" :class="{ shake: error }">
          <label for="mfa-code" class="sr-only">{{ $t('mfa.codeLabel') }}</label>
          <input
            id="mfa-code"
            ref="codeInput"
            class="input code-input"
            :class="{ invalid: error, recovery }"
            :value="code"
            :inputmode="recovery ? 'text' : 'numeric'"
            :autocomplete="recovery ? 'off' : 'one-time-code'"
            :maxlength="recovery ? 11 : 6"
            :placeholder="recovery ? 'xxxxx-xxxxx' : '000000'"
            :aria-invalid="!!error"
            :disabled="busy"
            autocapitalize="off"
            spellcheck="false"
            @input="onCode"
          />
        </div>
        <p v-if="error" class="alert-box error" role="alert">{{ error }}</p>
        <button type="submit" class="btn btn-block login-submit" :disabled="busy || !code"><i v-if="busy" class="pi pi-spin pi-spinner" aria-hidden="true" />{{ busy ? $t('common.loading') : $t('mfa.verify') }}</button>
      </form>
      <div class="mfa-links">
        <button type="button" class="link-btn" @click="toggleRecovery">{{ recovery ? $t('mfa.useApp') : $t('mfa.useRecovery') }}</button>
        <button type="button" class="link-btn" @click="backToCredentials"><i class="pi pi-arrow-left" aria-hidden="true" /> {{ $t('mfa.back') }}</button>
      </div>
    </div>

    <div v-else key="credentials">
    <div class="login-heading">
      <p class="eyebrow">{{ $t('auth.accessLabel') }}</p>
      <h1>{{ $t('auth.welcome') }}</h1>
      <p class="muted">{{ $t('auth.loginSubtitle') }}</p>
    </div>
    <p v-if="route.query.expired" class="alert-box info">{{ $t('auth.sessionExpired') }}</p>
    <p v-if="route.query.reset" class="alert-box success">{{ $t('auth.passwordChanged') }}</p>

    <form class="stack login-fields" :aria-busy="busy" @submit.prevent="submit">
      <div class="field">
        <label for="email">{{ $t('auth.email') }}</label>
        <input id="email" v-model="email" class="input" type="email" autocomplete="username" :placeholder="$t('auth.emailPlaceholder')" required />
      </div>
      <div class="field">
        <div class="password-label"><label for="password">{{ $t('auth.password') }}</label><RouterLink to="/forgot-password">{{ $t('auth.forgot') }}</RouterLink></div>
        <PasswordInput id="password" v-model="password" :placeholder="$t('auth.passwordPlaceholder')" required />
      </div>
      <p v-if="error" class="alert-box error" role="alert">{{ error }}</p>
      <button type="submit" class="btn btn-block login-submit" :disabled="busy"><i v-if="busy" class="pi pi-spin pi-spinner" aria-hidden="true" />{{ busy ? $t('common.loading') : $t('auth.login') }}<i v-if="!busy" class="pi pi-arrow-right" aria-hidden="true" /></button>
    </form>

    <div class="register-link">
      <span class="muted">{{ $t('auth.noAccount') }} <RouterLink to="/register">{{ $t('auth.signUp') }}</RouterLink></span>
    </div>
    <p class="access-note"><i class="pi pi-lock" aria-hidden="true" />{{ $t('auth.privateAccess') }}</p>
    </div>
    </Transition>
  </div>
</template>

<style scoped>
.login-heading { margin-bottom: 32px; }
.eyebrow { color: var(--brand-600); font-size: 10px; letter-spacing: .16em; text-transform: uppercase; font-weight: 700; margin-bottom: 14px; }
h1 { color: var(--brand-900); font-size: clamp(29px, 2.6vw, 38px); line-height: 1.15; letter-spacing: -.045em; font-weight: 650; }
.login-heading .muted { margin-top: 12px; font-size: 14px; line-height: 1.7; }
.login-fields { gap: 22px; }
.field { gap: 9px; }
.field label { font-size: 13px; font-weight: 600; }
.password-label { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.password-label a { font-size: 12px; }
.login-submit { min-height: 50px; font-size: 14px; border-radius: 9px; gap: 12px; background: var(--brand-700); }
.login-submit:hover { background: var(--brand-900); }
.register-link { margin-top: 26px; text-align: center; font-size: 13px; }
.register-link a { font-weight: 650; margin-left: 4px; }
.access-note { display: flex; align-items: center; justify-content: center; gap: 7px; padding-top: 24px; margin-top: 30px; border-top: 1px solid #e9eef2; color: var(--text-muted); font-size: 12px; }
.access-note i { font-size: 11px; }
.login-form > .alert-box { margin-bottom: 20px; }
.code-input { min-height: 58px; text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 12px; text-indent: 12px; }
.code-input.recovery { font-size: 20px; letter-spacing: 3px; text-indent: 3px; font-weight: 600; }
.code-input::placeholder { color: #c3d0da; }
.mfa-links { display: flex; justify-content: space-between; gap: 12px; margin-top: 22px; }
.link-btn { border: 0; background: none; padding: 10px 2px; min-height: 44px; font: inherit; font-size: 13px; font-weight: 600; color: var(--brand-600); cursor: pointer; }
.link-btn:hover { color: var(--brand-900); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.shake { animation: shake var(--dur-slow) var(--ease); }
.step-enter-active { transition: opacity var(--dur-base) var(--ease), transform var(--dur-base) var(--ease); }
.step-leave-active { transition: opacity var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease); }
.step-enter-from { opacity: 0; transform: translateX(16px); }
.step-leave-to { opacity: 0; transform: translateX(-12px); }
@media (max-width: 380px) { .password-label a { font-size: 11px; } }
</style>
