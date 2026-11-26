<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import PasswordInput from '@/components/ui/PasswordInput.vue'
import { mfaApi } from '@/api/mfa.api.js'
import { session } from '@/stores/session.js'
import { useToast } from '@/composables/useToast.js'
import { useApiError } from '@/composables/useApiError.js'

const { t } = useI18n()
const toast = useToast()
const { messageOf } = useApiError()

const enabled = computed(() => session.state.profile?.mfaEnabled === true)
const remaining = ref(0)
const phase = ref('idle')
const busy = ref(false)
const error = ref('')
const code = ref('')
const password = ref('')
const setup = ref(null)
const qr = ref('')
const recoveryCodes = ref([])
const saved = ref(false)
const action = ref('')
const codeInput = ref(null)

const groupedSecret = computed(() => setup.value?.secret.match(/.{1,4}/g)?.join(' ') || '')
const isStaff = computed(() => ['MODERADOR', 'ADMINISTRADOR'].includes(session.state.profile?.role))

async function loadStatus() {
  if (!enabled.value) return
  try {
    remaining.value = (await mfaApi.status()).recoveryCodesRemaining
  } catch {
    remaining.value = 0
  }
}

async function start() {
  busy.value = true
  error.value = ''
  try {
    setup.value = await mfaApi.setup()
    qr.value = await QRCode.toDataURL(setup.value.otpauthUri, { margin: 1, width: 192, errorCorrectionLevel: 'M' })
    code.value = ''
    phase.value = 'setup'
    await nextTick()
    codeInput.value?.focus()
  } catch (e) {
    toast.error(messageOf(e))
  } finally {
    busy.value = false
  }
}

async function confirm() {
  if (busy.value || code.value.length !== 6) return
  busy.value = true
  error.value = ''
  try {
    const result = await mfaApi.enable(code.value)
    session.adoptToken(result.token)
    await session.refreshProfile()
    recoveryCodes.value = result.recoveryCodes
    saved.value = false
    setup.value = null
    qr.value = ''
    phase.value = 'codes'
  } catch (e) {
    error.value = messageOf(e)
    code.value = ''
    await nextTick()
    codeInput.value?.focus()
  } finally {
    busy.value = false
  }
}

function onCode(event) {
  code.value = event.target.value.replace(/\D/g, '').slice(0, 6)
  error.value = ''
  if (code.value.length === 6) confirm().catch(() => {})
}

function cancel() {
  phase.value = 'idle'
  setup.value = null
  qr.value = ''
  code.value = ''
  password.value = ''
  error.value = ''
}

function openAction(kind) {
  action.value = kind
  phase.value = 'confirm'
  code.value = ''
  password.value = ''
  error.value = ''
}

async function submitAction() {
  if (busy.value || !password.value || code.value.length < 6) return
  busy.value = true
  error.value = ''
  try {
    if (action.value === 'disable') {
      await mfaApi.disable(password.value, code.value)
      await session.refreshProfile()
      toast.success(t('mfa.disabled'))
      cancel()
    } else {
      recoveryCodes.value = await mfaApi.regenerateRecoveryCodes(password.value, code.value)
      saved.value = false
      phase.value = 'codes'
      remaining.value = recoveryCodes.value.length
    }
  } catch (e) {
    error.value = e.status === 400 && e.code !== 'INVALID_MFA_CODE' ? t('profile.wrongCurrent') : messageOf(e)
  } finally {
    busy.value = false
  }
}

async function copyCodes() {
  try {
    await navigator.clipboard.writeText(recoveryCodes.value.join('\n'))
    toast.success(t('mfa.copied'))
  } catch {
    toast.error(t('errors.generic'))
  }
}

function downloadCodes() {
  const blob = new Blob([`PeaceApp\n${session.state.email}\n\n${recoveryCodes.value.join('\n')}\n`], { type: 'text/plain' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'peaceapp-recovery-codes.txt'
  link.click()
  URL.revokeObjectURL(link.href)
}

function finishCodes() {
  recoveryCodes.value = []
  remaining.value = Math.max(remaining.value, 8)
  phase.value = 'idle'
  loadStatus().catch(() => {})
}

onMounted(loadStatus)
</script>

<template>
  <section class="card stack mfa" aria-labelledby="mfa-title">
    <header class="mfa-head">
      <span class="shield" :class="{ on: enabled }" aria-hidden="true"><i aria-hidden="true" class="pi" :class="enabled ? 'pi-shield' : 'pi-lock'" /></span>
      <div class="grow">
        <h3 id="mfa-title">{{ $t('mfa.title') }}</h3>
        <p class="muted">{{ enabled ? $t('mfa.onHint', { n: remaining }) : $t('mfa.offHint') }}</p>
      </div>
      <span class="status" :class="{ on: enabled }">{{ enabled ? $t('mfa.on') : $t('mfa.off') }}</span>
    </header>

    <Transition name="phase" mode="out-in">
      <div v-if="phase === 'idle'" key="idle" class="row">
        <button v-if="!enabled" class="btn" type="button" :disabled="busy" @click="start">
          <i class="pi" :class="busy ? 'pi-spin pi-spinner' : 'pi-mobile'" aria-hidden="true" /> {{ $t('mfa.enable') }}
        </button>
        <template v-else>
          <button class="btn btn-secondary" type="button" @click="openAction('regenerate')"><i class="pi pi-refresh" aria-hidden="true" /> {{ $t('mfa.regenerate') }}</button>
          <button v-if="!isStaff" class="btn btn-secondary" type="button" @click="openAction('disable')">{{ $t('mfa.disable') }}</button>
        </template>
      </div>

      <div v-else-if="phase === 'setup'" key="setup" class="setup">
        <ol class="steps">
          <li>{{ $t('mfa.step1') }}</li>
          <li>{{ $t('mfa.step2') }}</li>
          <li>{{ $t('mfa.step3') }}</li>
        </ol>
        <div class="qr-row">
          <img class="qr" :src="qr" :alt="$t('mfa.qrAlt')" width="192" height="192" />
          <div class="manual">
            <p class="muted">{{ $t('mfa.manual') }}</p>
            <code class="secret">{{ groupedSecret }}</code>
          </div>
        </div>
        <div class="field">
          <label for="mfa-enable-code">{{ $t('mfa.codeLabel') }}</label>
          <input id="mfa-enable-code" ref="codeInput" class="input code" :class="{ invalid: error }" :value="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" :disabled="busy" @input="onCode" />
          <span v-if="error" class="field-error" role="alert">{{ error }}</span>
        </div>
        <div class="row">
          <button class="btn" type="button" :disabled="busy || code.length !== 6" @click="confirm"><i v-if="busy" class="pi pi-spin pi-spinner" aria-hidden="true" /> {{ $t('mfa.activate') }}</button>
          <button class="btn btn-secondary" type="button" @click="cancel">{{ $t('common.cancel') }}</button>
        </div>
      </div>

      <form v-else-if="phase === 'confirm'" key="confirm" class="stack" @submit.prevent="submitAction">
        <p class="muted">{{ action === 'disable' ? $t('mfa.disableHint') : $t('mfa.regenerateHint') }}</p>
        <div class="field">
          <label for="mfa-pw">{{ $t('profile.currentPassword') }}</label>
          <PasswordInput id="mfa-pw" v-model="password" required />
        </div>
        <div class="field">
          <label for="mfa-action-code">{{ $t('mfa.codeLabel') }}</label>
          <input id="mfa-action-code" v-model="code" class="input" autocomplete="one-time-code" maxlength="11" autocapitalize="off" spellcheck="false" required />
        </div>
        <p v-if="error" class="alert-box error" role="alert">{{ error }}</p>
        <div class="row">
          <button type="submit" class="btn" :class="{ 'btn-danger': action === 'disable' }" :disabled="busy || !password || code.length < 6"><i v-if="busy" class="pi pi-spin pi-spinner" aria-hidden="true" /> {{ action === 'disable' ? $t('mfa.disable') : $t('mfa.regenerate') }}</button>
          <button class="btn btn-secondary" type="button" @click="cancel">{{ $t('common.cancel') }}</button>
        </div>
      </form>

      <div v-else key="codes" class="codes">
        <p class="alert-box info"><i class="pi pi-info-circle" aria-hidden="true" /> {{ $t('mfa.codesHint') }}</p>
        <ul class="code-grid">
          <li v-for="(c, i) in recoveryCodes" :key="c" :style="{ '--i': i }"><code>{{ c }}</code></li>
        </ul>
        <div class="row">
          <button class="btn btn-secondary" type="button" @click="copyCodes"><i class="pi pi-copy" aria-hidden="true" /> {{ $t('mfa.copy') }}</button>
          <button class="btn btn-secondary" type="button" @click="downloadCodes"><i class="pi pi-download" aria-hidden="true" /> {{ $t('mfa.download') }}</button>
        </div>
        <label class="check"><input v-model="saved" type="checkbox" /> {{ $t('mfa.saved') }}</label>
        <div><button class="btn" type="button" :disabled="!saved" @click="finishCodes">{{ $t('mfa.done') }}</button></div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.mfa-head { display: flex; align-items: flex-start; gap: 14px; }
.shield { flex: none; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 10px; background: #eef2f5; color: #67808e; transition: background-color var(--dur-base) var(--ease), color var(--dur-base) var(--ease); }
.shield.on { background: #e3f5ec; color: #1b6b47; }
.status { flex: none; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 650; background: #eef2f5; color: #52687a; }
.status.on { background: #e3f5ec; color: #1b6b47; }
.row { display: flex; flex-wrap: wrap; gap: 10px; }
.steps { margin: 0; padding-left: 20px; display: grid; gap: 6px; font-size: 14px; color: var(--text-muted); }
.setup { display: grid; gap: 16px; }
.qr-row { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; }
.qr { border: 1px solid var(--border); border-radius: 12px; padding: 8px; background: #fff; }
.manual { display: grid; gap: 8px; min-width: 0; }
.secret { display: inline-block; padding: 8px 12px; border-radius: 8px; background: #f2f6f9; color: var(--brand-900); font-size: 14px; letter-spacing: 1px; word-break: break-all; }
.code { max-width: 220px; text-align: center; font-size: 22px; font-weight: 700; letter-spacing: 8px; text-indent: 8px; }
.codes { display: grid; gap: 14px; }
.code-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.code-grid li { padding: 10px 12px; border-radius: 8px; background: #f2f6f9; text-align: center; animation: rise var(--dur-base) var(--ease) both; animation-delay: calc(var(--i) * 35ms); }
.code-grid code { font-size: 15px; font-weight: 650; letter-spacing: 1.5px; color: var(--brand-900); }
.check { display: flex; align-items: center; gap: 10px; min-height: 44px; font-size: 14px; cursor: pointer; }
.check input { width: 18px; height: 18px; }
.phase-enter-active { transition: opacity var(--dur-base) var(--ease), transform var(--dur-base) var(--ease); }
.phase-leave-active { transition: opacity var(--dur-fast) var(--ease); }
.phase-enter-from { opacity: 0; transform: translateY(8px); }
.phase-leave-to { opacity: 0; }
@keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (max-width: 480px) { .code-grid { grid-template-columns: 1fr; } }
</style>
