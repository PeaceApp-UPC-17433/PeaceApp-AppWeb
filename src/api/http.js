import axios from 'axios'
import { env } from '@/config/env.js'

const TOKEN_KEY = 'authToken'

export const tokenStore = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (token) => localStorage.setItem(TOKEN_KEY, token),
    clear: () => localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
    constructor(message, status, errors = null, requestId = null, extra = {}) {
        super(message)
        this.status = status
        this.errors = errors
        this.requestId = requestId
        this.code = extra.code || null
        this.retryAfterSeconds = extra.retryAfterSeconds ?? null
    }
}

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

export const http = axios.create({ baseURL: env.apiUrl, timeout: 15000 })

const newRequestId = () => crypto.randomUUID()

http.interceptors.request.use((config) => {
    config.headers['X-Request-Id'] = newRequestId()
    const token = tokenStore.get()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

const fieldErrors = (errors) => {
    if (!Array.isArray(errors)) return errors && typeof errors === 'object' ? errors : null
    const parsed = {}
    errors.forEach((e) => {
        const [field, ...rest] = String(e).split(': ')
        parsed[field] = rest.join(': ') || String(e)
    })
    return parsed
}

http.interceptors.response.use(
    (res) => res,
    (error) => {
        const res = error.response
        if (!res) return Promise.reject(new ApiError('network', 0))
        const isAuthCall = res.config?.url?.startsWith('/auth/')
        if (res.status === 401 && !isAuthCall && tokenStore.get()) onUnauthorized()
        const data = res.data && typeof res.data === 'object' ? res.data : {}
        const requestId = res.headers?.['x-request-id'] || data.requestId || null
        if (data.code === 'EMAIL_NOT_VERIFIED') window.dispatchEvent(new CustomEvent('email-verification-required'))
        return Promise.reject(new ApiError(data.detail || data.message || `http_${res.status}`, res.status, fieldErrors(data.errors), requestId,
            { code: data.code, retryAfterSeconds: data.retryAfterSeconds }))
    }
)

export const unwrap = (promise) => promise.then((res) => res.data)

export const clean = (params = {}) =>
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
