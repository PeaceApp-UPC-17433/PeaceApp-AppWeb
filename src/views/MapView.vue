<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { env } from '@/config/env.js'
import { REPORT_TYPES, SEVERITIES, RISK_COLORS, typeMeta } from '@/config/domain.js'
import { reportsApi } from '@/api/reports.api.js'
import { currentOrFallback, locate } from '@/composables/useUserLocation.js'
import { useToast } from '@/composables/useToast.js'
import { useApiError } from '@/composables/useApiError.js'
import ReportBadges from '@/components/reports/ReportBadges.vue'

const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const { messageOf } = useApiError()

const mapEl = ref(null)
const map = shallowRef(null)
const mode = ref('markers') // 'markers' | 'heatmap'
const filters = reactive({ type: '', severity: '' })
const search = ref('')
const searching = ref(false)
const loading = ref(false)
const count = ref(0)
const selected = ref(null)
const selectedLoading = ref(false)
let markers = []
let loadTimer = null
let loadSeq = 0

const HEAT_SOURCE = 'heat-cells'

function boundsParams() {
  const b = map.value.getBounds()
  return { minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() }
}

// Mientras más cerca está el zoom, más fina es la cuadrícula del mapa de calor.
function cellSizeForZoom(zoom) {
  const size = 0.5 / Math.pow(2, zoom - 6)
  return Math.min(0.5, Math.max(0.0005, Number(size.toFixed(4))))
}

function clearMarkers() {
  markers.forEach((m) => m.remove())
  markers = []
}

function addMarker(p) {
  const el = document.createElement('button')
  el.className = 'pa-marker'
  el.setAttribute('aria-label', t(`report.type.${p.type}`))
  el.style.backgroundImage = `url('${(typeMeta[p.type] || typeMeta.OTHER).image}')`
  el.addEventListener('click', (ev) => { ev.stopPropagation(); select(p.id) })
  const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.longitude, p.latitude]).addTo(map.value)
  markers.push(marker)
}

async function load() {
  if (!map.value) return
  const seq = ++loadSeq
  loading.value = true
  try {
    const area = boundsParams()
    if (mode.value === 'markers') {
      const points = await reportsApi.map({ ...area, type: filters.type, severity: filters.severity, limit: 500 })
      if (seq !== loadSeq) return
      clearMarkers()
      points.forEach(addMarker)
      count.value = points.length
      setHeat([])
    } else {
      const cells = await reportsApi.heatmap({ ...area, cellSize: cellSizeForZoom(map.value.getZoom()) })
      if (seq !== loadSeq) return
      clearMarkers()
      setHeat(cells)
      count.value = cells.reduce((sum, c) => sum + c.count, 0)
    }
  } catch (e) {
    toast.error(messageOf(e))
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

const scheduleLoad = () => {
  clearTimeout(loadTimer)
  loadTimer = setTimeout(load, 350)
}

function setHeat(cells) {
  const src = map.value.getSource(HEAT_SOURCE)
  if (!src) return
  src.setData({
    type: 'FeatureCollection',
    features: cells.map((c) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
      properties: { count: c.count, risk: c.riskLevel }
    }))
  })
}

function setupHeatLayers() {
  map.value.addSource(HEAT_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.value.addLayer({
    id: 'heat-glow', type: 'heatmap', source: HEAT_SOURCE,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'count'], 1, 0.3, 10, 1],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 20, 16, 60],
      'heatmap-opacity': 0.75,
      'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(46,158,107,0)', 0.25, RISK_COLORS.LOW, 0.5, RISK_COLORS.MEDIUM, 0.75, RISK_COLORS.HIGH, 1, RISK_COLORS.CRITICAL]
    }
  })
  map.value.addLayer({
    id: 'heat-cells', type: 'circle', source: HEAT_SOURCE, minzoom: 13,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 8, 20, 22],
      'circle-color': ['match', ['get', 'risk'], 'LOW', RISK_COLORS.LOW, 'MEDIUM', RISK_COLORS.MEDIUM, 'HIGH', RISK_COLORS.HIGH, RISK_COLORS.CRITICAL],
      'circle-opacity': 0.35, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff'
    }
  })
}

async function select(id) {
  selectedLoading.value = true
  selected.value = { id }
  try {
    selected.value = await reportsApi.get(id)
  } catch (e) {
    selected.value = null
    toast.error(messageOf(e))
  } finally {
    selectedLoading.value = false
  }
}

async function searchPlace() {
  if (!search.value.trim()) return
  searching.value = true
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(search.value)}.json?limit=1&access_token=${env.mapboxToken}`
    const data = await (await fetch(url)).json()
    const hit = data.features?.[0]
    if (hit) map.value.flyTo({ center: hit.center, zoom: 15 })
    else toast.info(t('map.notFound'))
  } catch {
    toast.error(t('errors.network'))
  } finally {
    searching.value = false
  }
}

async function goToMe() {
  const pos = await locate()
  if (pos) map.value.flyTo({ center: [pos.lng, pos.lat], zoom: 15 })
  else toast.info(t('map.locationDenied'))
}

function reportHere() {
  const c = map.value.getCenter()
  router.push({ name: 'report-new', query: { lat: c.lat.toFixed(6), lng: c.lng.toFixed(6) } })
}

watch(mode, load)
watch(filters, load)

onMounted(async () => {
  mapboxgl.accessToken = env.mapboxToken
  const start = (await locate()) || currentOrFallback()
  map.value = new mapboxgl.Map({
    container: mapEl.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [start.lng, start.lat],
    zoom: 14
  })
  map.value.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
  map.value.on('load', () => { setupHeatLayers(); load() })
  map.value.on('moveend', scheduleLoad)
  map.value.on('click', () => (selected.value = null))
})

onBeforeUnmount(() => {
  clearTimeout(loadTimer)
  clearMarkers()
  map.value?.remove()
})
</script>

<template>
  <div class="map-page">
    <div ref="mapEl" class="map" />

    <div class="toolbar card">
      <form class="row" style="flex-wrap: nowrap" @submit.prevent="searchPlace">
        <input v-model="search" class="input" :placeholder="$t('map.searchPlaceholder')" :aria-label="$t('map.searchPlaceholder')" />
        <button class="btn" :disabled="searching" :aria-label="$t('common.search')"><i class="pi pi-search" /></button>
      </form>

      <div class="row" style="gap: 6px">
        <button class="chip" :class="{ active: mode === 'markers' }" @click="mode = 'markers'"><i class="pi pi-map-marker" /> {{ $t('map.markers') }}</button>
        <button class="chip" :class="{ active: mode === 'heatmap' }" @click="mode = 'heatmap'"><i class="pi pi-sun" /> {{ $t('map.heatmap') }}</button>
      </div>

      <div v-if="mode === 'markers'" class="row">
        <select v-model="filters.type" class="select" :aria-label="$t('report.typeLabel')">
          <option value="">{{ $t('report.allTypes') }}</option>
          <option v-for="ty in REPORT_TYPES" :key="ty.value" :value="ty.value">{{ $t(`report.type.${ty.value}`) }}</option>
        </select>
        <select v-model="filters.severity" class="select" :aria-label="$t('report.severityLabel')">
          <option value="">{{ $t('report.allSeverities') }}</option>
          <option v-for="s in SEVERITIES" :key="s.value" :value="s.value">{{ $t(`report.severity.${s.value}`) }}</option>
        </select>
      </div>
      <div v-else class="legend small">
        <span v-for="(color, risk) in RISK_COLORS" :key="risk"><i :style="{ background: color }" />{{ $t(`map.risk.${risk}`) }}</span>
      </div>

      <p class="muted small">
        <span v-if="loading" class="spinner" style="width: 14px; height: 14px; border-width: 2px" />
        {{ mode === 'markers' ? $t('map.countMarkers', { n: count }) : $t('map.countHeat', { n: count }) }}
      </p>
    </div>

    <div class="actions">
      <button class="btn btn-secondary" :title="$t('map.myLocation')" @click="goToMe"><i class="pi pi-compass" /></button>
      <button class="btn" @click="reportHere"><i class="pi pi-plus" /> {{ $t('map.reportHere') }}</button>
    </div>

    <aside v-if="selected" class="detail card" aria-live="polite">
      <button class="icon-btn close" :aria-label="$t('common.close')" @click="selected = null"><i class="pi pi-times" /></button>
      <div v-if="selectedLoading || !selected.title" class="loading"><span class="spinner" /></div>
      <template v-else>
        <img v-if="selected.image" :src="selected.image" :alt="selected.title" class="photo" />
        <ReportBadges :type="selected.type" :severity="selected.severity" :status="selected.status" />
        <h3>{{ selected.title }}</h3>
        <p v-if="selected.detail" class="muted">{{ selected.detail }}</p>
        <p class="small muted"><i class="pi pi-map-marker" /> {{ selected.address }}</p>
        <RouterLink :to="{ name: 'report-detail', params: { id: selected.id } }" class="btn btn-block">{{ $t('map.viewDetail') }}</RouterLink>
      </template>
    </aside>
  </div>
</template>

<style>
.pa-marker { width: 42px; height: 42px; border: none; padding: 0; background: transparent center / contain no-repeat; cursor: pointer; filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35)); transition: transform 0.15s; }
.pa-marker:hover { transform: scale(1.15); }
</style>

<style scoped>
.map-page { position: relative; height: calc(100vh - var(--topbar-h)); }
.map { position: absolute; inset: 0; }
.toolbar { position: absolute; top: 14px; left: 14px; width: min(360px, calc(100% - 28px)); display: flex; flex-direction: column; gap: 10px; padding: 12px; z-index: 5; }
.toolbar .select { flex: 1; min-width: 0; }
.legend { display: flex; gap: 12px; flex-wrap: wrap; }
.legend span { display: inline-flex; align-items: center; gap: 5px; }
.legend i { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
.actions { position: absolute; right: 14px; top: 14px; display: flex; gap: 8px; z-index: 5; }
.detail { position: absolute; left: 14px; bottom: 14px; width: min(360px, calc(100% - 28px)); max-height: 60%; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; z-index: 6; }
.detail .close { position: absolute; top: 8px; right: 8px; background: rgba(255, 255, 255, 0.9); }
.photo { width: 100%; height: 150px; object-fit: cover; border-radius: 8px; }
@media (max-width: 860px) {
  .map-page { height: calc(100vh - var(--topbar-h) - 58px); }
  .toolbar { width: calc(100% - 28px); }
  .actions { top: auto; bottom: 14px; }
  .detail { bottom: 70px; }
}
</style>
