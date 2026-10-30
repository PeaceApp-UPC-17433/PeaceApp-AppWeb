<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { session } from '@/stores/session.js'
import { usersApi } from '@/api/users.api.js'
import { authApi } from '@/api/auth.api.js'
import { uploadImage } from '@/api/cloudinary.api.js'
import { useToast } from '@/composables/useToast.js'
import { useApiError } from '@/composables/useApiError.js'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const { messageOf, fieldErrors } = useApiError()

const profile = computed(() => session.state.profile)
const form = reactive({
  name: profile.value.name || '',
  lastname: profile.value.lastname || '',
  email: profile.value.email || '',
  phonenumber: profile.value.phonenumber || ''
})
const errors = ref({})
const saving = ref(false)
const uploading = ref(false)

const pass = reactive({ current: '', next: '', confirm: '' })
const passBusy = ref(false)
const passError = ref('')
const passMismatch = computed(() => pass.confirm && pass.confirm !== pass.next)

const deleteOpen = ref(false)
const deleting = ref(false)

async function saveProfile() {
  errors.value = {}
  saving.value = true
  const emailChanged = form.email.trim().toLowerCase() !== profile.value.email
  // Actualización parcial: solo viajan los campos que cambiaron.
  const patch = {}
  for (const key of ['name', 'lastname', 'phonenumber']) {
    if (form[key] !== (profile.value[key] || '') && form[key] !== '') patch[key] = form[key].trim()
  }
  if (emailChanged) patch.email = form.email.trim().toLowerCase()
  try {
    if (!Object.keys(patch).length) return toast.info(t('profile.noChanges'))
    await usersApi.update(profile.value.id, patch)
    if (emailChanged) {
      // El correo es la identidad del token: hay que volver a entrar.
      session.logout()
      toast.success(t('profile.emailChanged'))
      return router.replace({ name: 'login' })
    }
    await session.refreshProfile()
    toast.success(t('profile.saved'))
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) toast.error(e.status === 409 ? t('profile.emailInUse') : messageOf(e))
  } finally { saving.value = false }
}

async function onPhoto(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const url = await uploadImage(file)
    await usersApi.update(profile.value.id, { profile_image: url })
    await session.refreshProfile()
    toast.success(t('profile.photoUpdated'))
  } catch (err) {
    toast.error(err.status ? messageOf(err) : t('reportForm.uploadFailed'))
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

async function changePassword() {
  if (passMismatch.value) return
  passError.value = ''
  passBusy.value = true
  try {
    await authApi.changePassword(pass.current, pass.next)
    Object.assign(pass, { current: '', next: '', confirm: '' })
    toast.success(t('profile.passwordChanged'))
  } catch (e) {
    passError.value = e.status === 400 && !e.errors ? t('profile.wrongCurrent') : messageOf(e)
  } finally { passBusy.value = false }
}

async function deleteAccount() {
  deleting.value = true
  try {
    await usersApi.remove(profile.value.id)
    session.logout()
    router.replace({ name: 'login' })
    toast.success(t('profile.deleted'))
  } catch (e) {
    toast.error(messageOf(e))
    deleting.value = false
    deleteOpen.value = false
  }
}
</script>

<template>
  <div class="page page-narrow">
    <div class="page-header"><h1>{{ $t('profile.title') }}</h1></div>

    <section class="card head">
      <div class="avatar">
        <img v-if="profile.profile_image" :src="profile.profile_image" alt="" />
        <i v-else class="pi pi-user" />
      </div>
      <div class="grow">
        <h2>{{ session.fullName.value }}</h2>
        <p class="muted">{{ profile.email }}</p>
      </div>
      <label class="btn btn-secondary" :class="{ disabled: uploading }">
        <i class="pi" :class="uploading ? 'pi-spin pi-spinner' : 'pi-camera'" /> {{ $t('profile.changePhoto') }}
        <input type="file" accept="image/*" hidden :disabled="uploading" @change="onPhoto" />
      </label>
    </section>

    <form class="card stack" @submit.prevent="saveProfile">
      <h3>{{ $t('profile.personal') }}</h3>
      <div class="form-grid">
        <div class="field">
          <label for="p-name">{{ $t('auth.name') }}</label>
          <input id="p-name" v-model="form.name" class="input" :class="{ invalid: errors.name }" maxlength="50" required />
          <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
        </div>
        <div class="field">
          <label for="p-last">{{ $t('auth.lastname') }}</label>
          <input id="p-last" v-model="form.lastname" class="input" :class="{ invalid: errors.lastname }" maxlength="50" required />
          <span v-if="errors.lastname" class="field-error">{{ errors.lastname }}</span>
        </div>
        <div class="field">
          <label for="p-mail">{{ $t('auth.email') }}</label>
          <input id="p-mail" v-model="form.email" class="input" :class="{ invalid: errors.email }" type="email" maxlength="50" required />
          <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
          <span v-else class="hint">{{ $t('profile.emailWarning') }}</span>
        </div>
        <div class="field">
          <label for="p-phone">{{ $t('auth.phone') }}</label>
          <input id="p-phone" v-model="form.phonenumber" class="input" :class="{ invalid: errors.phonenumber }" type="tel" maxlength="20" />
          <span v-if="errors.phonenumber" class="field-error">{{ errors.phonenumber }}</span>
        </div>
      </div>
      <div><button class="btn" :disabled="saving">{{ $t('common.save') }}</button></div>
    </form>

    <form class="card stack" @submit.prevent="changePassword">
      <h3>{{ $t('profile.security') }}</h3>
      <div class="form-grid">
        <div class="field full">
          <label for="pw-current">{{ $t('profile.currentPassword') }}</label>
          <input id="pw-current" v-model="pass.current" class="input" type="password" required autocomplete="current-password" />
        </div>
        <div class="field">
          <label for="pw-new">{{ $t('auth.newPassword') }}</label>
          <input id="pw-new" v-model="pass.next" class="input" type="password" minlength="8" maxlength="72" required autocomplete="new-password" />
          <span class="hint">{{ $t('auth.passwordHint') }}</span>
        </div>
        <div class="field">
          <label for="pw-confirm">{{ $t('auth.confirmPassword') }}</label>
          <input id="pw-confirm" v-model="pass.confirm" class="input" :class="{ invalid: passMismatch }" type="password" required autocomplete="new-password" />
          <span v-if="passMismatch" class="field-error">{{ $t('auth.mismatch') }}</span>
        </div>
      </div>
      <p v-if="passError" class="alert-box error" role="alert">{{ passError }}</p>
      <div><button class="btn" :disabled="passBusy">{{ $t('profile.updatePassword') }}</button></div>
    </form>

    <section class="card stack danger-zone">
      <h3>{{ $t('profile.dangerZone') }}</h3>
      <p class="muted">{{ $t('profile.deleteWarning') }}</p>
      <div><button class="btn btn-danger" @click="deleteOpen = true"><i class="pi pi-trash" /> {{ $t('profile.deleteAccount') }}</button></div>
    </section>

    <ConfirmDialog v-model="deleteOpen" :title="$t('profile.deleteAccount')" :message="$t('profile.deleteConfirm')" danger :busy="deleting" :confirm-label="$t('profile.deleteAccount')" @confirm="deleteAccount" />
  </div>
</template>

<style scoped>
.head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.avatar { width: 76px; height: 76px; border-radius: 50%; background: var(--brand-100); color: var(--brand-600); display: grid; place-items: center; font-size: 2rem; overflow: hidden; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.danger-zone { border-color: #f1c4c0; }
label.btn.disabled { opacity: 0.6; pointer-events: none; }
</style>
