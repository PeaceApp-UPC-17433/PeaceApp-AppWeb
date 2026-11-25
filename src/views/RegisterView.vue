<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { session } from '@/stores/session.js'
import { useApiError } from '@/composables/useApiError.js'
import LegalDialog from '@/components/ui/LegalDialog.vue'
import PasswordInput from '@/components/ui/PasswordInput.vue'
import PasswordRules from '@/components/auth/PasswordRules.vue'
import { isStrongPassword } from '@/config/password.js'

const router = useRouter()
const { locale } = useI18n()
const { messageOf, fieldErrors } = useApiError()

const form = reactive({ name: '', lastname: '', email: '', phonenumber: '', password: '' })
const confirm = ref('')
const accepted = ref(false)
const busy = ref(false)
const error = ref('')
const errors = ref({})
const showTerms = ref(false)

const mismatch = computed(() => confirm.value && confirm.value !== form.password)
const matches = computed(() => !!confirm.value && confirm.value === form.password)
const canSubmit = computed(() => accepted.value && isStrongPassword(form.password) && matches.value)

async function submit() {
  error.value = ''
  errors.value = {}
  if (!canSubmit.value) return
  busy.value = true
  try {
    // Se envían solo los campos que el backend acepta; el teléfono es opcional.
    const payload = { ...form, locale: locale.value, email: form.email.trim().toLowerCase(), phonenumber: form.phonenumber.trim() || undefined }
    await session.register(payload)
    router.replace('/map')
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = messageOf(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="card stack">
    <div class="auth-heading">
      <p class="eyebrow">{{ $t('auth.registerLabel') }}</p>
      <h1>{{ $t('auth.createAccount') }}</h1>
      <p class="muted">{{ $t('auth.registerSubtitle') }}</p>
    </div>

    <form class="stack" @submit.prevent="submit">
      <div class="form-grid">
        <div class="field">
          <label for="name">{{ $t('auth.name') }}</label>
          <input id="name" v-model="form.name" class="input" :class="{ invalid: errors.name }" maxlength="50" required autocomplete="given-name" />
          <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
        </div>
        <div class="field">
          <label for="lastname">{{ $t('auth.lastname') }}</label>
          <input id="lastname" v-model="form.lastname" class="input" :class="{ invalid: errors.lastname }" maxlength="50" required autocomplete="family-name" />
          <span v-if="errors.lastname" class="field-error">{{ errors.lastname }}</span>
        </div>
        <div class="field">
          <label for="reg-email">{{ $t('auth.email') }}</label>
          <input id="reg-email" v-model="form.email" class="input" :class="{ invalid: errors.email }" type="email" maxlength="50" required autocomplete="email" :placeholder="$t('auth.emailPlaceholder')" />
          <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
        </div>
        <div class="field">
          <label for="phone">{{ $t('auth.phone') }} <span class="muted">({{ $t('common.optional') }})</span></label>
          <input id="phone" v-model="form.phonenumber" class="input" :class="{ invalid: errors.phonenumber }" type="tel" maxlength="20" autocomplete="tel" />
          <span v-if="errors.phonenumber" class="field-error">{{ errors.phonenumber }}</span>
        </div>
        <div class="field">
          <label for="reg-pass">{{ $t('auth.password') }}</label>
          <PasswordInput id="reg-pass" v-model="form.password" :invalid="!!errors.password" autocomplete="new-password" required />
          <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
        </div>
        <div class="field">
          <label for="reg-confirm">{{ $t('auth.confirmPassword') }}</label>
          <PasswordInput id="reg-confirm" v-model="confirm" :invalid="!!mismatch" autocomplete="new-password" required />
          <Transition name="note" mode="out-in">
            <span v-if="mismatch" key="no" class="field-error">{{ $t('auth.mismatch') }}</span>
            <span v-else-if="matches" key="yes" class="field-ok"><i class="pi pi-check" aria-hidden="true" /> {{ $t('auth.match') }}</span>
          </Transition>
        </div>
        <div class="full"><PasswordRules :value="form.password" /></div>
      </div>

      <label class="checkbox">
        <input v-model="accepted" type="checkbox" required />
        <span>{{ $t('auth.accept') }} <a href="#" @click.prevent="showTerms = true">{{ $t('footer.terms') }}</a></span>
      </label>

      <p v-if="error && !Object.keys(errors).length" class="alert-box error" role="alert">{{ error }}</p>
      <button class="btn btn-block" :disabled="busy || !canSubmit">{{ busy ? $t('common.loading') : $t('auth.signUpAction') }}</button>
    </form>

    <div class="alt-link">
      <span class="muted">{{ $t('auth.haveAccount') }} <RouterLink to="/login">{{ $t('auth.login') }}</RouterLink></span>
    </div>
    <LegalDialog v-model="showTerms" kind="terms" />
  </div>
</template>

<style scoped>
.full { grid-column: 1 / -1; }
.field-ok { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #1b6b47; }
.field-ok i { font-size: 10px; }
.note-enter-active, .note-leave-active { transition: opacity var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease); }
.note-enter-from, .note-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
