<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { env } from '@/config/env.js'
import { REPORT_TYPES, SEVERITIES, RISK_COLORS, typeMeta, severityMeta } from '@/config/domain.js'
import { reportsApi } from '@/api/reports.api.js'
import { currentOrFallback, locate, userLocation } from '@/composables/useUserLocation.js'
import { useToast } from '@/composables/useToast.js'
import { useApiError } from '@/composables/useApiError.js'
import ReportBadges from '@/components/reports/ReportBadges.vue'
import { useCountUp } from '@/composables/useCountUp.js'
import {
  HEAT_LEGEND_GRADIENT, cellSizeForZoom, heatColorExpression, heatIntensityExpression, heatOpacity,
  heatRadiusExpression, heatWeightExpression, hottestOf, toFeatureCollection, totalOf, easeOutCubic
} from '@/map/heatmapModel.js'

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
const hotspot = ref(0)
const { shown: shownCount, to: countTo, stop: countStop } = useCountUp(400)
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Capa de calor: aparece con fundido (400 ms) y luego "respira" muy poco (ambiente).
let heatRaf = 0
let heatFade = 0
let heatTarget = 0
let heatStart = 0
let heatLast = 0
function heatLoop(now) {
  const m = map.value
  if (!m || !m.getLayer('heat-glow')) { heatRaf = 0; return }
  const dir = heatTarget > heatFade ? 1 : -1
  heatFade = Math.min(1, Math.max(0, heatFade + dir * ((now - (heatLast || now)) / 400)))
  heatLast = now
  if (heatTarget === 0 && heatFade === 0) {
    m.setPaintProperty('heat-glow', 'heatmap-opacity', 0)
    heatRaf = 0
    return
  }
  m.setPaintProperty('heat-glow', 'heatmap-opacity', heatOpacity(easeOutCubic(heatFade), now - heatStart, reduceMotion()))
  heatRaf = requestAnimationFrame(heatLoop)
}
function showHeat(on) {
  heatTarget = on ? 1 : 0
  heatLast = 0
  if (!heatRaf) { heatStart = performance.now(); heatRaf = requestAnimationFrame(heatLoop) }
}

function boundsParams(pad = 0) {
  const b = map.value.getBounds()
  const dLat = (b.getNorth() - b.getSouth()) * pad
  const dLng = (b.getEast() - b.getWest()) * pad
  return { minLat: b.getSouth() - dLat, maxLat: b.getNorth() + dLat, minLng: b.getWest() - dLng, maxLng: b.getEast() + dLng }
}

// Se piden datos de un area 40 % mas grande que la pantalla. Asi, al mover el mapa un poco, la zona nueva ya esta
// cargada y no aparece vacia (un vacio momentaneo se leeria como "no hay reportes").
const FETCH_PAD = 0.4
let lastHeatFetch = null
const covers = (box, view) => box && view.minLat >= box.minLat && view.maxLat <= box.maxLat && view.minLng >= box.minLng && view.maxLng <= box.maxLng
const loadError = ref(false)

function clearMarkers() {
  markers.forEach((m) => m.remove())
  markers = []
}

function addMarker(p) {
  const el = document.createElement('button')
  el.className = 'pa-marker'
  el.setAttribute('aria-label', t(`report.type.${p.type}`))
  el.style.setProperty('--pin', (severityMeta[p.severity] || severityMeta.MEDIUM).color)
  el.innerHTML = `<span class="pin"><svg viewBox="0 0 34 44" width="34" height="44" aria-hidden="true"><path d="M17 43C17 43 3 28.5 3 16.5a14 14 0 0 1 28 0C31 28.5 17 43 17 43z" fill="currentColor" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg><i class="pi ${(typeMeta[p.type] || typeMeta.OTRO).icon}"></i></span>`
  el.addEventListener('click', (ev) => { ev.stopPropagation(); select(p.id).catch(() => {}) })
  const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.longitude, p.latitude]).addTo(map.value)
  markers.push(marker)
}

async function load(force = false) {
  if (!map.value) return
  const view = boundsParams()
  const cellSize = cellSizeForZoom(map.value.getZoom())
  // Mapa de calor: si lo que se ve ya esta dentro de lo cargado (mismo zoom), no se vuelve a pedir ni parpadea.
  if (mode.value === 'heatmap' && !force && !loadError.value && lastHeatFetch?.cellSize === cellSize && covers(lastHeatFetch.box, view)) return
  const seq = ++loadSeq
  loading.value = true
  try {
    if (mode.value === 'markers') {
      const points = await reportsApi.map({ ...view, type: filters.type, severity: filters.severity, limit: 500 })
      if (seq !== loadSeq) return
      clearMarkers()
      points.forEach(addMarker)
      count.value = points.length
      setHeat([])
      showHeat(false)
      lastHeatFetch = null
    } else {
      const box = boundsParams(FETCH_PAD)
      const cells = await reportsApi.heatmap({ ...box, cellSize })
      if (seq !== loadSeq) return
      clearMarkers()
      setHeat(cells)
      showHeat(true)
      lastHeatFetch = { box, cellSize }
      count.value = totalOf(cells)
      hotspot.value = hottestOf(cells)?.count || 0
      countTo(count.value)
    }
    loadError.value = false
  } catch (e) {
    // Ante un fallo se conserva lo que ya se veia y se avisa de forma persistente: un mapa vacio por error no debe parecer "sin reportes".
    if (seq === loadSeq) { loadError.value = true; lastHeatFetch = null }
    toast.error(messageOf(e))
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

const scheduleLoad = () => {
  clearTimeout(loadTimer)
  loadTimer = setTimeout(() => load().catch(() => {}), 350)
}

function setHeat(cells) {
  const src = map.value.getSource(HEAT_SOURCE)
  if (!src) return
  src.setData(toFeatureCollection(cells))
}

function setupHeatLayers() {
  const m = map.value
  m.addSource(HEAT_SOURCE, { type: 'geojson', data: toFeatureCollection([]) })
  // Por debajo de las etiquetas del mapa, para que calles y nombres sigan legibles sobre el calor.
  const firstLabel = m.getStyle().layers.find((l) => l.type === 'symbol')?.id
  m.addLayer({
    id: 'heat-glow', type: 'heatmap', source: HEAT_SOURCE,
    paint: {
      'heatmap-weight': heatWeightExpression(),
      'heatmap-radius': heatRadiusExpression(),
      'heatmap-intensity': heatIntensityExpression(),
      'heatmap-opacity': 0,
      'heatmap-color': heatColorExpression()
    }
  }, firstLabel)
  // Con zoom cercano se ven las celdas con su cantidad, y al tocarlas el mapa se acerca.
  m.addLayer({
    id: 'heat-cells', type: 'circle', source: HEAT_SOURCE, minzoom: 14,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 11, 20, 24],
      'circle-color': ['match', ['get', 'risk'], 'LOW', RISK_COLORS.LOW, 'MEDIUM', RISK_COLORS.MEDIUM, 'HIGH', RISK_COLORS.HIGH, RISK_COLORS.HIGH],
      'circle-opacity': 0.9, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff'
    }
  })
  m.addLayer({
    id: 'heat-count', type: 'symbol', source: HEAT_SOURCE, minzoom: 14,
    layout: { 'text-field': ['to-string', ['get', 'count']], 'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'], 'text-size': 12, 'text-allow-overlap': true },
    paint: { 'text-color': '#ffffff' }
  })
  m.on('mouseenter', 'heat-cells', () => { m.getCanvas().style.cursor = 'pointer' })
  m.on('mouseleave', 'heat-cells', () => { m.getCanvas().style.cursor = '' })
  m.on('click', 'heat-cells', (e) => {
    const f = e.features?.[0]
    if (f) m.flyTo({ center: f.geometry.coordinates, zoom: Math.min(m.getZoom() + 2, 18), duration: reduceMotion() ? 0 : 600, essential: true })
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

function reportHere() {
  const c = map.value.getCenter()
  router.push({ name: 'report-new', query: { lat: c.lat.toFixed(6), lng: c.lng.toFixed(6) } }).catch(() => {})
}

watch(mode, () => load(true))
watch(filters, () => load(true))

onMounted(async () => {
  mapboxgl.accessToken = env.mapboxToken
  const start = (await locate()) || currentOrFallback()
  map.value = new mapboxgl.Map({
    container: mapEl.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [start.lng, start.lat],
    zoom: 14,
    locale: {
      'GeolocateControl.FindMyLocation': t('map.myLocation'),
      'GeolocateControl.LocationNotAvailable': t('map.locationDenied')
    }
  })
  map.value.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
  const geolocate = new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true,
    showAccuracyCircle: true,
    fitBoundsOptions: { maxZoom: 16 }
  })
  map.value.addControl(geolocate, 'bottom-right')
  geolocate.on('geolocate', (e) => {
    userLocation.lat = e.coords.latitude
    userLocation.lng = e.coords.longitude
    userLocation.denied = false
  })
  geolocate.on('error', () => { userLocation.denied = true })
  map.value.on('load', () => { setupHeatLayers(); load().catch(() => {}); geolocate.trigger() })
  map.value.on('moveend', scheduleLoad)
  map.value.on('click', () => (selected.value = null))
})

onBeforeUnmount(() => {
  clearTimeout(loadTimer)
  cancelAnimationFrame(heatRaf)
  countStop()
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
        <button type="submit" class="btn" :disabled="searching" :aria-label="$t('common.search')"><i class="pi pi-search" /></button>
      </form>

      <div class="row" style="gap: 6px">
        <button type="button" class="chip" :class="{ active: mode === 'markers' }" @click="mode = 'markers'"><i class="pi pi-map-marker" /> {{ $t('map.markers') }}</button>
        <button type="button" class="chip" :class="{ active: mode === 'heatmap' }" @click="mode = 'heatmap'"><i class="pi pi-sun" /> {{ $t('map.heatmap') }}</button>
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
      <div v-else class="heat-legend" role="img" :aria-label="`${$t('map.risk.LOW')} - ${$t('map.risk.HIGH')}`">
        <div class="bar" :style="{ background: HEAT_LEGEND_GRADIENT }" />
        <div class="ends small"><span>{{ $t('map.risk.LOW') }}</span><span>{{ $t('map.risk.HIGH') }}</span></div>
      </div>

      <p class="muted small">
        <span v-if="loading" class="spinner" style="width: 14px; height: 14px; border-width: 2px" />
        {{ mode === 'markers' ? $t('map.countMarkers', { n: count }) : $t('map.countHeat', { n: shownCount }) }}
      </p>
      <p v-if="mode === 'heatmap' && hotspot && !loadError" class="hotspot small"><i class="pi pi-bolt" /> {{ $t('map.hotspot', { n: hotspot }) }}</p>
      <div v-if="loadError" class="notice error small" role="alert">
        <span><i class="pi pi-exclamation-triangle" /> {{ $t('map.loadError') }}</span>
        <button type="button" class="btn btn-sm" :disabled="loading" @click="load(true)">{{ $t('map.retry') }}</button>
      </div>
      <p v-else-if="!loading && count === 0" class="muted small" role="status"><i class="pi pi-info-circle" /> {{ $t('map.empty') }}</p>
    </div>

    <div class="actions">
      <button type="button" class="btn" @click="reportHere"><i class="pi pi-plus" /> {{ $t('map.reportHere') }}</button>
    </div>

    <aside v-if="selected" class="detail card" aria-live="polite">
      <button type="button" class="icon-btn close" :aria-label="$t('common.close')" @click="selected = null"><i class="pi pi-times" /></button>
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
.pa-marker { width: 34px; height: 44px; padding: 0; border: 0; background: none; cursor: pointer; }
.pa-marker .pin { position: relative; display: block; width: 34px; height: 44px; color: var(--pin, #e0a100); filter: drop-shadow(0 3px 3px rgba(10, 40, 60, 0.32)); transform-origin: 50% 100%; animation: pin-drop var(--dur-base, 250ms) var(--ease-pop, ease-out) both; transition: transform var(--dur-fast, 150ms) var(--ease, ease-out); }
.pa-marker:hover .pin, .pa-marker:focus-visible .pin { transform: translateY(-3px) scale(1.08); }
.pa-marker:focus-visible { outline: none; }
.pa-marker .pin i { position: absolute; top: 9px; left: 0; width: 100%; text-align: center; font-size: 14px; line-height: 16px; color: #fff; }
@keyframes pin-drop { from { opacity: 0; transform: translateY(-10px) scale(0.8); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .pa-marker .pin { animation: none; } }
</style>

<style scoped>
.map-page { position: relative; height: calc(100vh - var(--topbar-h)); }
.map { position: absolute; inset: 0; }
.toolbar { position: absolute; top: 14px; left: 14px; width: min(360px, calc(100% - 28px)); display: flex; flex-direction: column; gap: 10px; padding: 12px; z-index: 5; }
.toolbar .select { flex: 1; min-width: 0; }
.heat-legend { animation: legend-in var(--dur-base, 250ms) var(--ease, ease-out) both; }
.heat-legend .bar { height: 10px; border-radius: 999px; box-shadow: inset 0 0 0 1px rgba(18, 62, 87, 0.12); }
.heat-legend .ends { display: flex; justify-content: space-between; margin-top: 4px; color: var(--muted, #5b7283); }
.hotspot { display: inline-flex; align-items: center; gap: 6px; color: #b42318; font-weight: 600; animation: legend-in var(--dur-base, 250ms) var(--ease, ease-out) 80ms both; }
.notice.error { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: var(--radius-sm, 8px); background: #fef3f2; color: #b42318; border: 1px solid #fecdca; animation: legend-in var(--dur-base, 250ms) var(--ease, ease-out) both; }
@keyframes legend-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .heat-legend, .hotspot { animation: none; } }
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
