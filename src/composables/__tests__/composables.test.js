import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const state = { locale: 'es', messages: {} }
vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        locale: { value: state.locale },
        t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key),
        te: (key) => key in state.messages
    })
}))
vi.mock('@/api/alerts.api.js', () => ({ alertsApi: { sendLocation: vi.fn(() => Promise.resolve()) } }))

import { alertsApi } from '@/api/alerts.api.js'
import { useApiError } from '../useApiError.js'
import { useFormat } from '../format.js'
import { useToast } from '../useToast.js'
import {
    currentOrFallback, locate, startLocationSync, stopLocationSync, userLocation
} from '../useUserLocation.js'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

const err = (props) => Object.assign(new Error(props.message ?? ''), props)

test('messageOf covers the known error codes and statuses', () => {
    const { messageOf, fieldErrors } = useApiError()
    expect(messageOf(null)).toBe('errors.generic')
    expect(messageOf(err({ status: 0 }))).toBe('errors.network')
    expect(messageOf(err({ code: 'EMAIL_NOT_VERIFIED' }))).toBe('verify.required')
    expect(messageOf(err({ code: 'INVALID_MFA_CODE' }))).toBe('mfa.invalid')
    expect(messageOf(err({ code: 'MFA_LOCKED', retryAfterSeconds: 120 }))).toBe('mfa.locked:{"s":2}')
    expect(messageOf(err({ code: 'MFA_LOCKED' }))).toBe('mfa.locked:{"s":1}')
    expect(messageOf(err({ code: 'MFA_CHALLENGE_EXPIRED' }))).toBe('mfa.expired')
    expect(messageOf(err({ code: 'MFA_REQUIRED' }))).toBe('mfa.requiredForStaff')
    expect(messageOf(err({ errors: { a: 'uno', b: 'dos' } }))).toBe('uno. dos')
    expect(messageOf(err({ status: 403 }))).toBe('errors.forbidden')
    expect(messageOf(err({ status: 404 }))).toBe('errors.notFound')
    expect(messageOf(err({ status: 503 }))).toBe('errors.server')
    expect(messageOf(err({ status: 400, message: 'texto del backend' }))).toBe('texto del backend')
    expect(messageOf(err({ status: 418, message: 'http_418' }))).toBe('errors.generic')
    state.messages = { 'errors.http_418': 'x' }
    expect(messageOf(err({ status: 418, message: 'http_418' }))).toBe('errors.http_418')
    state.messages = {}
    expect(fieldErrors(err({ errors: { a: 'x' } }))).toEqual({ a: 'x' })
    expect(fieldErrors(null)).toEqual({})
})

test('format helpers handle empty values, distances and relative time', () => {
    const f = useFormat()
    expect(f.dateTime('')).toBe('')
    expect(f.date(null)).toBe('')
    expect(f.dateTime('2026-01-01T10:00:00Z')).not.toBe('')
    expect(f.date('2026-01-01T10:00:00Z')).not.toBe('')
    expect(f.distance(null)).toBe('')
    expect(f.distance(250)).toBe('250 m')
    expect(f.distance(1500)).toBe('1.5 km')
    expect(f.relative('')).toBe('')
    const now = Date.now()
    for (const delta of [10, 120, 7200, 3 * 86400, 60 * 86400, 800 * 86400]) {
        expect(f.relative(new Date(now - delta * 1000).toISOString())).not.toBe('')
    }
})

test('toasts are queued and dismissed after their timeout', () => {
    vi.useFakeTimers()
    const toast = useToast()
    toast.success('ok'); toast.error('mal'); toast.info('fyi')
    expect(toast.toasts.map((t) => t.type)).toEqual(['success', 'error', 'info'])
    vi.advanceTimersByTime(4600)
    expect(toast.toasts.map((t) => t.type)).toEqual(['error'])
    vi.advanceTimersByTime(2000)
    expect(toast.toasts).toHaveLength(0)
    toast.dismiss(999)
})

const geolocation = (impl) => Object.defineProperty(navigator, 'geolocation', { value: impl, configurable: true })

test('locate resolves with the position or null when denied or unavailable', async () => {
    geolocation(undefined)
    expect(await locate()).toBeNull()
    geolocation({ getCurrentPosition: (ok) => ok({ coords: { latitude: -12.1, longitude: -77.1 } }) })
    expect(await locate()).toEqual({ lat: -12.1, lng: -77.1 })
    expect(currentOrFallback()).toEqual({ lat: -12.1, lng: -77.1 })
    geolocation({ getCurrentPosition: (_ok, fail) => fail() })
    expect(await locate()).toBeNull()
    expect(userLocation.denied).toBe(true)
})

test('fallback location is used before any fix', () => {
    userLocation.lat = null
    expect(currentOrFallback().lat).toBeCloseTo(-12.0464)
})

test('location sync pushes immediately and on every interval until stopped', async () => {
    vi.useFakeTimers()
    geolocation({ getCurrentPosition: (ok) => ok({ coords: { latitude: 1, longitude: 2 } }) })
    startLocationSync()
    await vi.advanceTimersByTimeAsync(0)
    expect(alertsApi.sendLocation).toHaveBeenCalledWith(1, 2)
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(alertsApi.sendLocation).toHaveBeenCalledTimes(2)
    stopLocationSync()
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(alertsApi.sendLocation).toHaveBeenCalledTimes(2)
})
