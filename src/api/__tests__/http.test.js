import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError, clean, http, setUnauthorizedHandler, tokenStore, unwrap } from '../http.js'

const respond = (status, data = {}, headers = {}) => (config) =>
    Promise.reject({ response: { status, data, headers, config } })

const run = (adapter, config = {}) => http.request({ url: '/x', adapter, ...config })

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

test('request interceptor adds request id and bearer token', async () => {
    tokenStore.set('tok')
    let seen
    await run((config) => { seen = config; return Promise.resolve({ data: {}, status: 200, config, headers: {} }) })
    expect(seen.headers.Authorization).toBe('Bearer tok')
    expect(seen.headers['X-Request-Id']).toMatch(/^[0-9a-f-]{36}$/)
})

test('request without a token has no authorization header', async () => {
    let seen
    await run((config) => { seen = config; return Promise.resolve({ data: {}, status: 200, config, headers: {} }) })
    expect(seen.headers.Authorization).toBeUndefined()
})

test('network failures become ApiError with status 0', async () => {
    const error = await run(() => Promise.reject({})).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
})

test('field errors in list format are parsed', async () => {
    const error = await run(respond(400, { detail: 'invalido', errors: ['email: no valido', 'name: requerido'] }, { 'x-request-id': 'r1' })).catch((e) => e)
    expect(error.message).toBe('invalido')
    expect(error.errors).toEqual({ email: 'no valido', name: 'requerido' })
    expect(error.requestId).toBe('r1')
})

test('field errors in object format are kept and code metadata is exposed', async () => {
    const error = await run(respond(429, { code: 'MFA_LOCKED', retryAfterSeconds: 30, errors: { code: 'bloqueado' } })).catch((e) => e)
    expect(error.errors).toEqual({ code: 'bloqueado' })
    expect(error.code).toBe('MFA_LOCKED')
    expect(error.retryAfterSeconds).toBe(30)
})

test('unknown error bodies fall back to http_<status>', async () => {
    const error = await run(respond(502, 'oops')).catch((e) => e)
    expect(error.message).toBe('http_502')
    expect(error.errors).toBeNull()
})

test('401 outside auth calls triggers the unauthorized handler only with a token', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    await run(respond(401, {}, {}, { url: '/x' })).catch(() => {})
    expect(handler).not.toHaveBeenCalled()
    tokenStore.set('tok')
    await run(respond(401)).catch(() => {})
    expect(handler).toHaveBeenCalledTimes(1)
    await run(respond(401), { url: '/auth/login' }).catch(() => {})
    expect(handler).toHaveBeenCalledTimes(1)
})

test('email verification required is announced to the window', async () => {
    const listener = vi.fn()
    window.addEventListener('email-verification-required', listener)
    await run(respond(403, { code: 'EMAIL_NOT_VERIFIED' })).catch(() => {})
    expect(listener).toHaveBeenCalled()
    window.removeEventListener('email-verification-required', listener)
})

test('unwrap returns the response data and clean drops empty values', async () => {
    expect(await unwrap(Promise.resolve({ data: { a: 1 } }))).toEqual({ a: 1 })
    expect(clean({ a: 1, b: '', c: null, d: undefined, e: 0 })).toEqual({ a: 1, e: 0 })
    expect(clean()).toEqual({})
})

test('token store round trip', () => {
    tokenStore.set('abc')
    expect(tokenStore.get()).toBe('abc')
    tokenStore.clear()
    expect(tokenStore.get()).toBeNull()
})
