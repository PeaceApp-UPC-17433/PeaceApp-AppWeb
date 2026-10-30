<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { session } from '@/stores/session.js'
import { useApiError } from '@/composables/useApiError.js'
import LegalDialog from '@/components/ui/LegalDialog.vue'

const router = useRouter()
const { messageOf, fieldErrors } = useApiError()

const form = reactive({ name: '', lastname: '', email: '', phonenumber: '', password: '' })
const confirm = ref('')
const accepted = ref(false)
const busy = ref(false)
const error = ref('')
const errors = ref({})
const showTerms = ref(false)

const mismatch = computed(() => confirm.value && confirm.value !== form.password)

async function submit() {
  error.value = ''
  errors.value = {}
  if (mismatch.value) return
  busy.value = true
  try {
    // Se envían solo los campos que el backend acepta; el teléfono es opcional.
    const payload = { ...form, email: form.email.trim().toLowerCase(), phonenumber: form.phonenumber.trim() || undefined }
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
    <div>
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
          <input id="reg-email" v-model="form.email" class="input" :class="{ invalid: errors.email }" type="email" maxlength="50" required autocomplete="email" />
          <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
        </div>
        <div class="field">
          <label for="phone">{{ $t('auth.phone') }} <span class="muted">({{ $t('common.optional') }})</span></label>
          <input id="phone" v-model="form.phonenumber" class="input" :class="{ invalid: errors.phonenumber }" type="tel" maxlength="20" autocomplete="tel" />
          <span v-if="errors.phonenumber" class="field-error">{{ errors.phonenumber }}</span>
        </div>
        <div class="field">
          <label for="reg-pass">{{ $t('auth.password') }}</label>
          <input id="reg-pass" v-model="form.password" class="input" :class="{ invalid: errors.password }" type="password" minlength="8" maxlength="72" required autocomplete="new-password" />
          <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
          <span v-else class="hint">{{ $t('auth.passwordHint') }}</span>
        </div>
        <div class="field">
          <label for="reg-confirm">{{ $t('auth.confirmPassword') }}</label>
          <input id="reg-confirm" v-model="confirm" class="input" :class="{ invalid: mismatch }" type="password" required autocomplete="new-password" />
          <span v-if="mismatch" class="field-error">{{ $t('auth.mismatch') }}</span>
        </div>
      </div>

      <label class="checkbox">
        <input v-model="accepted" type="checkbox" required />
        <span>{{ $t('auth.accept') }} <a href="#" @click.prevent="showTerms = true">{{ $t('footer.terms') }}</a></span>
      </label>

      <p v-if="error && !Object.keys(errors).length" class="alert-box error" role="alert">{{ error }}</p>
      <button class="btn btn-block" :disabled="busy || !accepted">{{ busy ? $t('common.loading') : $t('auth.signUpAction') }}</button>
    </form>

    <span class="small muted">{{ $t('auth.haveAccount') }} <RouterLink to="/login">{{ $t('auth.login') }}</RouterLink></span>
    <LegalDialog v-model="showTerms" kind="terms" />
  </div>
</template>
