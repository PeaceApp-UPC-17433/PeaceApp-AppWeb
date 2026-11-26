<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { session } from '@/stores/session.js'
import { authApi } from '@/api/auth.api.js'
import { maskEmail } from '@/config/email.js'
import { useToast } from '@/composables/useToast.js'

const { t } = useI18n()
const toast = useToast()

const open = ref(true)
const code = ref('')
const busy = ref(false)
const error = ref('')
const done = ref(false)
const cooldown = ref(0)
const attempts = ref(0)
const pulse = ref(false)
const input = ref(null)
let timer = null

const visible = computed(() => !session.isVerified.value || done.value)
const email = computed(() => maskEmail(session.state.profile?.email || session.state.email))

function startCooldown(seconds) {
  clearInterval(timer)
  cooldown.value = seconds
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(timer)
  }, 1000)
}

function fail(message) {
  error.value = message
  attempts.value += 1
}

async function submit() {
  if (busy.value || code.value.length !== 6) return
  busy.value = true
  error.value = ''
  try {
    await session.verifyEmail(code.value)
    done.value = true
    setTimeout(() => { done.value = false }, 1600)
  } catch (e) {
    if (e.status === 409) await session.refreshProfile()
    fail(e.code === 'TOO_MANY_ATTEMPTS' ? t('verify.tooMany') : e.status === 409 ? t('verify.already') : t('verify.invalid'))
    code.value = ''
    await nextTick()
    input.value?.focus()
  } finally {
    busy.value = false
  }
}

function onInput(event) {
  code.value = event.target.value.replace(/\D/g, '').slice(0, 6)
  error.value = ''
  if (code.value.length === 6) submit().catch(() => {})
}

async function resend() {
  if (cooldown.value > 0) return
  error.value = ''
  try {
    await authApi.resendEmailCode()
    toast.success(t('verify.sent'))
    startCooldown(60)
  } catch (e) {
    if (e.status === 429 && e.retryAfterSeconds) startCooldown(e.retryAfterSeconds)
    else fail(e.status === 409 ? t('verify.already') : t('errors.generic'))
  }
}

function onRequired() {
  open.value = true
  pulse.value = true
  setTimeout(() => { pulse.value = false }, 900)
  nextTick(() => input.value?.focus()).catch(() => {})
}

onMounted(() => window.addEventListener('email-verification-required', onRequired))
onBeforeUnmount(() => {
  window.removeEventListener('email-verification-required', onRequired)
  clearInterval(timer)
})
</script>

<template>
  <div v-if="visible" class="verify-layer">
    <Transition name="pill">
      <button v-if="!open && !done" class="pill" type="button" @click="open = true">
        <span class="dot" aria-hidden="true" />
        <i class="pi pi-envelope" aria-hidden="true" />
        {{ $t('verify.pill') }}
      </button>
    </Transition>

    <Transition name="card">
      <section v-if="open" class="panel" :class="{ pulse, done }" aria-labelledby="verify-title">
        <Transition name="swap" mode="out-in">
          <div v-if="done" key="done" class="success" role="status">
            <span class="check"><i class="pi pi-check" aria-hidden="true" /></span>
            <strong>{{ $t('verify.success') }}</strong>
          </div>

          <div v-else key="form" class="body">
            <header>
              <span class="icon" aria-hidden="true"><i aria-hidden="true" class="pi pi-envelope" /></span>
              <div>
                <h2 id="verify-title">{{ $t('verify.title') }}</h2>
                <p class="muted">{{ $t('verify.body', { email }) }}</p>
              </div>
              <button class="close" type="button" :aria-label="$t('verify.later')" @click="open = false"><i class="pi pi-times" aria-hidden="true" /></button>
            </header>

            <div :key="attempts" class="field" :class="{ shake: error }">
              <label for="verify-code" class="sr-only">{{ $t('verify.label') }}</label>
              <input
                id="verify-code"
                ref="input"
                class="code"
                :class="{ invalid: error }"
                :value="code"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                :placeholder="$t('verify.placeholder')"
                :aria-invalid="!!error"
                aria-describedby="verify-error"
                :disabled="busy"
                @input="onInput"
              />
            </div>
            <p id="verify-error" class="error" role="alert">{{ error }}</p>

            <div class="actions">
              <button class="btn" type="button" :disabled="busy || code.length !== 6" @click="submit">
                <i v-if="busy" class="pi pi-spin pi-spinner" aria-hidden="true" />
                {{ $t('verify.confirm') }}
              </button>
              <button class="link" type="button" :disabled="cooldown > 0" @click="resend">
                {{ cooldown > 0 ? $t('verify.resendIn', { s: cooldown }) : $t('verify.resend') }}
              </button>
            </div>
          </div>
        </Transition>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.verify-layer { position: fixed; top: calc(var(--topbar-h) + 12px); left: 0; right: 0; z-index: 900; display: flex; justify-content: center; pointer-events: none; }
.panel { pointer-events: auto; width: min(440px, calc(100vw - 24px)); background: #fff; border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow-lg); padding: 18px 18px 16px; }
.panel.pulse { animation: pulse 900ms var(--ease); }
.body { display: grid; gap: 12px; }
header { display: flex; align-items: flex-start; gap: 12px; }
.icon { flex: none; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 10px; background: var(--brand-50); color: var(--brand-600); }
h2 { font-size: 1.05rem; color: var(--brand-900); }
.muted { margin-top: 2px; font-size: 13px; line-height: 1.5; color: var(--text-muted); }
.close { margin-left: auto; flex: none; width: 36px; height: 36px; display: grid; place-items: center; border: 0; background: transparent; color: #67808e; border-radius: 8px; cursor: pointer; transition: background-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease); }
.close:hover { background: var(--brand-50); color: var(--brand-700); }
.code { width: 100%; min-height: 54px; text-align: center; font-size: 26px; font-weight: 700; letter-spacing: 12px; text-indent: 12px; color: var(--brand-900); background: #fff; border: 1.5px solid var(--border); border-radius: 10px; transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease); }
.code::placeholder { color: #c3d0da; }
.code:focus { outline: none; border-color: var(--brand-600); box-shadow: 0 0 0 3px rgba(31, 121, 170, 0.18); }
.code.invalid { border-color: var(--danger); }
.error { min-height: 18px; margin: -4px 0 0; font-size: 12.5px; color: var(--danger); }
.actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.link { border: 0; background: none; padding: 10px 4px; min-height: 44px; font: inherit; font-size: 13px; font-weight: 600; color: var(--brand-600); cursor: pointer; }
.link:disabled { color: var(--text-muted); cursor: default; }
.success { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 14px 0; color: #1b6b47; font-size: 1.05rem; }
.check { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; background: var(--success); color: #fff; animation: pop var(--dur-slow) var(--ease-pop); }
.pill { pointer-events: auto; position: absolute; right: 16px; top: 0; display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px; border: 1px solid #f1dc9a; border-radius: 999px; background: #fff8e1; color: #7a5b00; font: inherit; font-size: 13px; font-weight: 650; box-shadow: var(--shadow); cursor: pointer; }
.pill:hover { background: #fff3cc; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--warning); animation: ping 1.8s var(--ease) infinite; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.shake { animation: shake var(--dur-slow) var(--ease); }
.card-enter-active { transition: opacity var(--dur-base) var(--ease), transform var(--dur-base) var(--ease); }
.card-leave-active { transition: opacity var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease); }
.card-enter-from, .card-leave-to { opacity: 0; transform: translateY(-12px) scale(0.98); }
.pill-enter-active { transition: opacity var(--dur-base) var(--ease), transform var(--dur-base) var(--ease); }
.pill-leave-active { transition: opacity var(--dur-fast) var(--ease); }
.pill-enter-from, .pill-leave-to { opacity: 0; transform: translateY(-8px); }
.swap-enter-active, .swap-leave-active { transition: opacity var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease); }
.swap-enter-from { opacity: 0; transform: scale(0.96); }
.swap-leave-to { opacity: 0; transform: translateY(-4px); }
@keyframes pop { 0% { transform: scale(0); } 70% { transform: scale(1.12); } 100% { transform: scale(1); } }
@keyframes ping { 0% { box-shadow: 0 0 0 0 rgba(224, 161, 0, 0.5); } 70%, 100% { box-shadow: 0 0 0 8px rgba(224, 161, 0, 0); } }
@keyframes pulse { 0%, 100% { box-shadow: var(--shadow-lg); } 40% { box-shadow: 0 0 0 4px rgba(31, 121, 170, 0.35), var(--shadow-lg); } }
</style>
