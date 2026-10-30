<script setup>
import { reactive, ref, computed, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { env } from '@/config/env.js'
import { REPORT_TYPES, SEVERITIES } from '@/config/domain.js'
import { reportsApi } from '@/api/reports.api.js'
import { uploadImage } from '@/api/cloudinary.api.js'
import { session } from '@/stores/session.js'
import { currentOrFallback, locate } from '@/composables/useUserLocation.js'
import { useToast } from '@/composables/useToast.js'
import { useApiError } from '@/composables/useApiError.js'
import LoadingBlock from '@/components/ui/LoadingBlock.vue'

// Sirve para crear (/reports/new) y editar (/reports/:id/edit).
const props = defineProps({ id: String })
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const { messageOf, fieldErrors } = useApiError()

const editing = computed(() => !!props.id)
const loading = ref(editing.value)
const busy = ref(false)
const uploading = ref(false)
const errors = ref({})
const mapEl = ref(null)
const map = shallowRef(null)
let geoSeq = 0

const form = reactive({
  title: '', detail: '', type: '', severity: 'MEDIUM', occurredAt: '', address: '', image: '', latitude: null, longitude: null
})

// <input type="datetime-local"> trabaja en hora local, el backend en ISO-8601.
const toLocalInput = (iso) => {
  const d = iso ? new Date(iso) : new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const nowInput = ref(toLocalInput())

async function reverseGeocode(lng, lat) {
  const seq = ++geoSeq
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?limit=1&access_token=${env.mapboxToken}`
    const data = await (await fetch(url)).json()
    if (seq !== geoSeq) return
    form.address = (data.features?.[0]?.place_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`).slice(0, 100)
  } catch {
    if (seq === geoSeq) form.address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`.slice(0, 100)
  }
}

function setPosition(lng, lat, geocode = true) {
  form.longitude = lng
  form.latitude = lat
  if (geocode) reverseGeocode(lng, lat)
}

function initMap(lng, lat) {
  mapboxgl.accessToken = env.mapboxToken
  map.value = new mapboxgl.Map({ container: mapEl.value, style: 'mapbox://styles/mapbox/streets-v12', center: [lng, lat], zoom: 16 })
  map.value.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
  // El pin fijo en el centro marca el punto: se mueve el mapa, no el pin.
  map.value.on('moveend', () => {
    const c = map.value.getCenter()
    setPosition(c.lng, c.lat)
  })
}

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    form.image = await uploadImage(file)
  } catch {
    toast.error(t('reportForm.uploadFailed'))
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

async function submit() {
  errors.value = {}
  if (form.latitude == null) return toast.error(t('reportForm.needLocation'))
  busy.value = true
  const payload = {
    title: form.title.trim(),
    detail: form.detail.trim() || undefined,
    type: form.type,
    severity: form.severity,
    occurredAt: new Date(form.occurredAt).toISOString(),
    latitude: form.latitude,
    longitude: form.longitude,
    address: form.address.trim(),
    image: form.image || undefined
  }
  try {
    const saved = editing.value ? await reportsApi.update(props.id, payload) : await reportsApi.create(payload)
    toast.success(t(editing.value ? 'reportForm.updated' : 'reportForm.created'))
    router.replace({ name: 'report-detail', params: { id: saved.id } })
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) toast.error(messageOf(e))
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  let center
  if (editing.value) {
    try {
      const r = await reportsApi.get(props.id)
      if (r.idUser !== session.profileId.value && !session.state.isAdmin) return router.replace({ name: 'report-detail', params: { id: props.id } })
      Object.assign(form, {
        title: r.title, detail: r.detail || '', type: r.type, severity: r.severity, address: r.address,
        image: r.image || '', occurredAt: toLocalInput(r.occurredAt), latitude: r.latitude, longitude: r.longitude
      })
      center = { lat: r.latitude, lng: r.longitude }
    } catch (e) {
      toast.error(messageOf(e))
      return router.replace({ name: 'reports' })
    }
    loading.value = false
  } else {
    form.occurredAt = toLocalInput()
    const qLat = parseFloat(route.query.lat)
    const qLng = parseFloat(route.query.lng)
    center = !isNaN(qLat) && !isNaN(qLng) ? { lat: qLat, lng: qLng } : (await locate()) || currentOrFallback()
  }
  // El contenedor del mapa existe solo cuando termina la carga.
  await new Promise((r) => setTimeout(r))
  initMap(center.lng, center.lat)
  if (!editing.value) setPosition(center.lng, center.lat)
})

onBeforeUnmount(() => map.value?.remove())
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>{{ editing ? $t('reportForm.editTitle') : $t('reportForm.title') }}</h1>
        <p>{{ $t('reportForm.subtitle') }}</p>
      </div>
    </div>

    <LoadingBlock v-if="loading" />
    <form v-show="!loading" class="layout" @submit.prevent="submit">
      <div class="card stack">
        <div class="form-grid">
          <div class="field">
            <label for="rf-type">{{ $t('report.typeLabel') }}</label>
            <select id="rf-type" v-model="form.type" class="select" :class="{ invalid: errors.type }" required>
              <option value="" disabled>{{ $t('reportForm.selectType') }}</option>
              <option v-for="ty in REPORT_TYPES" :key="ty.value" :value="ty.value">{{ $t(`report.type.${ty.value}`) }}</option>
            </select>
            <span v-if="errors.type" class="field-error">{{ errors.type }}</span>
          </div>
          <div class="field">
            <label for="rf-sev">{{ $t('report.severityLabel') }}</label>
            <select id="rf-sev" v-model="form.severity" class="select">
              <option v-for="s in SEVERITIES" :key="s.value" :value="s.value">{{ $t(`report.severity.${s.value}`) }}</option>
            </select>
          </div>
          <div class="field full">
            <label for="rf-title">{{ $t('reportForm.titleLabel') }}</label>
            <input id="rf-title" v-model="form.title" class="input" :class="{ invalid: errors.title }" maxlength="50" required />
            <span v-if="errors.title" class="field-error">{{ errors.title }}</span>
          </div>
          <div class="field full">
            <label for="rf-detail">{{ $t('reportForm.detail') }} <span class="muted">({{ $t('common.optional') }})</span></label>
            <textarea id="rf-detail" v-model="form.detail" class="textarea" :class="{ invalid: errors.detail }" maxlength="255" />
            <span class="hint">{{ form.detail.length }}/255</span>
          </div>
          <div class="field full">
            <label for="rf-when">{{ $t('reportForm.occurredAt') }}</label>
            <input id="rf-when" v-model="form.occurredAt" class="input" :class="{ invalid: errors.occurredAt }" type="datetime-local" :max="nowInput" required />
            <span v-if="errors.occurredAt" class="field-error">{{ errors.occurredAt }}</span>
          </div>
          <div class="field full">
            <label for="rf-address">{{ $t('reportForm.address') }}</label>
            <input id="rf-address" v-model="form.address" class="input" :class="{ invalid: errors.address }" maxlength="100" required />
            <span class="hint">{{ $t('reportForm.addressHint') }}</span>
          </div>
          <div class="field full">
            <span class="label">{{ $t('reportForm.evidence') }} <span class="muted">({{ $t('common.optional') }})</span></span>
            <div class="row">
              <label class="btn btn-secondary" :class="{ disabled: uploading }">
                <i class="pi" :class="uploading ? 'pi-spin pi-spinner' : 'pi-upload'" /> {{ $t('reportForm.upload') }}
                <input type="file" accept="image/*" hidden :disabled="uploading" @change="onFile" />
              </label>
              <button v-if="form.image" type="button" class="btn btn-ghost" @click="form.image = ''"><i class="pi pi-times" /> {{ $t('common.remove') }}</button>
            </div>
            <img v-if="form.image" :src="form.image" alt="" class="preview" />
          </div>
        </div>
      </div>

      <div class="card stack sticky">
        <span class="label">{{ $t('reportForm.location') }}</span>
        <div class="map-box"><div ref="mapEl" class="map" /><div class="pin"><i class="pi pi-map-marker" /></div></div>
        <p class="hint">{{ $t('reportForm.mapHint') }}</p>
        <div class="row">
          <button class="btn grow" :disabled="busy || uploading">{{ busy ? $t('common.loading') : editing ? $t('common.save') : $t('reportForm.send') }}</button>
          <button type="button" class="btn btn-secondary" @click="router.back()">{{ $t('common.cancel') }}</button>
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: 3fr 2fr; gap: 20px; align-items: start; }
.sticky { position: sticky; top: calc(var(--topbar-h) + 16px); }
.map-box { position: relative; height: 320px; border-radius: 10px; overflow: hidden; }
.map { position: absolute; inset: 0; }
/* Punta del pin sobre el centro exacto del mapa. */
.pin { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -100%); color: var(--danger); font-size: 2.2rem; pointer-events: none; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); line-height: 1; }
.preview { max-height: 200px; border-radius: 10px; object-fit: cover; align-self: flex-start; }
label.btn.disabled { opacity: 0.6; pointer-events: none; }
@media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .sticky { position: static; } }
</style>
