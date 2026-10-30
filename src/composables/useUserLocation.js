import { reactive } from 'vue'
import { alertsApi } from '@/api/alerts.api.js'
import { env } from '@/config/env.js'

// Última posición conocida, compartida entre vistas (mapa, formulario de reporte).
export const userLocation = reactive({ lat: null, lng: null, denied: false })
const FALLBACK = { lat: -12.0464, lng: -77.0428 } // Lima

let timer = null

export function currentOrFallback() {
    return userLocation.lat != null ? { lat: userLocation.lat, lng: userLocation.lng } : FALLBACK
}

export function locate() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userLocation.lat = pos.coords.latitude
                userLocation.lng = pos.coords.longitude
                userLocation.denied = false
                resolve({ lat: userLocation.lat, lng: userLocation.lng })
            },
            () => {
                userLocation.denied = true
                resolve(null)
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 }
        )
    })
}

async function push() {
    const pos = await locate()
    if (pos) alertsApi.sendLocation(pos.lat, pos.lng).catch(() => {})
}

// El backend solo alerta a quien tiene una ubicación de menos de 24 h: se reenvía periódicamente.
export function startLocationSync() {
    stopLocationSync()
    push()
    timer = setInterval(push, env.locationPushMs)
}

export function stopLocationSync() {
    clearInterval(timer)
    timer = null
}
