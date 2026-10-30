import axios from 'axios'
import { env } from '@/config/env.js'

const TOKEN_KEY = 'authToken'

export const tokenStore = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (token) => localStorage.setItem(TOKEN_KEY, token),
    clear: () => localStorage.removeItem(TOKEN_KEY)
}

// Error uniforme: el backend responde { message, errors? } (README, convenciones generales).
export class ApiError extends Error {
    constructor(message, status, errors = null) {
        super(message)
        this.status = status
        this.errors = errors
    }
}

// La sesión registra aquí qué hacer ante un 401 (evita dependencia circular con el store).
let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

export const http = axios.create({ baseURL: env.apiUrl, timeout: 15000 })

http.interceptors.request.use((config) => {
    const token = tokenStore.get()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

http.interceptors.response.use(
    (res) => res,
    (error) => {
        const res = error.response
        if (!res) return Promise.reject(new ApiError('network', 0))
        const isAuthCall = res.config?.url?.startsWith('/authentication/')
        if (res.status === 401 && !isAuthCall && tokenStore.get()) onUnauthorized()
        const data = res.data && typeof res.data === 'object' ? res.data : {}
        return Promise.reject(new ApiError(data.message || `http_${res.status}`, res.status, data.errors || null))
    }
)

// Atajo: devuelve directamente el cuerpo.
export const unwrap = (promise) => promise.then((res) => res.data)

// Elimina parámetros vacíos antes de armar el query string.
export const clean = (params = {}) =>
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
