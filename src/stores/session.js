import { reactive, computed } from 'vue'
import { authApi } from '@/api/auth.api.js'
import { usersApi } from '@/api/users.api.js'
import { tokenStore, setUnauthorizedHandler } from '@/api/http.js'

const EMAIL_KEY = 'userEmail'

const state = reactive({
    token: tokenStore.get() || '',
    email: localStorage.getItem(EMAIL_KEY) || '',
    profile: null,
    isAdmin: false,
    ready: false
})

const MODERATION_ROLES = ['ADMINISTRADOR', 'MODERADOR']

async function startSession(token, email) {
    tokenStore.set(token)
    state.token = token
    localStorage.setItem(EMAIL_KEY, email)
    state.email = email
    await loadProfile()
}

async function loadProfile() {
    state.profile = await usersApi.me()
    state.isAdmin = MODERATION_ROLES.includes(state.profile.role)
}

function clear() {
    tokenStore.clear()
    localStorage.removeItem(EMAIL_KEY)
    state.token = ''
    state.email = ''
    state.profile = null
    state.isAdmin = false
}

export const session = {
    state,
    isLoggedIn: computed(() => !!state.token && !!state.email),
    profileId: computed(() => state.profile?.id ?? null),
    isVerified: computed(() => state.profile?.emailVerified !== false),
    fullName: computed(() => `${state.profile?.name || ''} ${state.profile?.lastname || ''}`.trim()),

    // Restaura la sesión al arrancar la app.
    async init() {
        if (tokenStore.get() && state.email) {
            // Sin perfil las vistas no pueden funcionar: ante cualquier fallo se vuelve al login.
            try {
                await loadProfile()
            } catch {
                clear()
            }
        }
        state.ready = true
    },

    async login(email, password) {
        const normalized = email.trim().toLowerCase()
        const result = await authApi.signIn(normalized, password)
        if (result.mfaToken) return { mfaToken: result.mfaToken, email: normalized }
        await startSession(result.token, normalized)
        return null
    },

    async completeMfa(challenge, code) {
        const { token } = await authApi.signInMfa(challenge.mfaToken, code)
        await startSession(token, challenge.email)
    },

    adoptToken(token) {
        tokenStore.set(token)
        state.token = token
    },

    // El registro unificado crea cuenta y perfil; después se inicia sesión con las mismas credenciales.
    async register(payload) {
        await authApi.signUp(payload)
        await this.login(payload.email, payload.password)
    },

    async verifyEmail(code) {
        const { token } = await authApi.confirmEmail(code)
        tokenStore.set(token)
        state.token = token
        await loadProfile()
    },

    async refreshProfile() {
        await loadProfile()
    },

    logout() {
        clear()
    }
}

// Un token vencido o inválido en cualquier llamada cierra la sesión y manda al login.
// Ojo: el backend a veces enmascara un error interno de un endpoint como 401. Antes de cerrar la
// sesión se comprueba el token contra un endpoint estable (el perfil propio).
let verifying = false
setUnauthorizedHandler(async () => {
    if (verifying) return
    verifying = true
    try {
        await usersApi.me()
        return // el token sigue siendo válido: el 401 era de otro endpoint
    } catch (e) {
        if (e.status !== 401) return
    } finally {
        verifying = false
    }
    clear()
    const { default: router } = await import('@/router/index.js')
    if (router.currentRoute.value.meta.requiresAuth) {
        router.replace({ name: 'login', query: { expired: '1' } })
    }
})
