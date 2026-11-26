import { beforeEach, expect, test, vi } from 'vitest'

vi.mock('@/api/auth.api.js', () => ({
    authApi: { signIn: vi.fn(), signInMfa: vi.fn(), signUp: vi.fn(), confirmEmail: vi.fn() }
}))
vi.mock('@/api/users.api.js', () => ({ usersApi: { me: vi.fn() } }))
vi.mock('@/api/alerts.api.js', () => ({ alertsApi: { unreadCount: vi.fn() } }))
vi.mock('@/api/contacts.api.js', () => ({ contactsApi: { incoming: vi.fn() } }))
vi.mock('@/router/index.js', () => ({ default: { currentRoute: { value: { meta: { requiresAuth: true } } }, replace: vi.fn() } }))

import { authApi } from '@/api/auth.api.js'
import { usersApi } from '@/api/users.api.js'
import { alertsApi } from '@/api/alerts.api.js'
import { contactsApi } from '@/api/contacts.api.js'
import router from '@/router/index.js'
import { setUnauthorizedHandler, tokenStore } from '@/api/http.js'
import { session } from '../session.js'
import { badges } from '../badges.js'

const profile = (role = 'CIUDADANO', extra = {}) => ({ id: 'u1', name: 'Ana', lastname: 'Paz', role, ...extra })

beforeEach(() => {
    vi.clearAllMocks()
    session.logout()
    localStorage.clear()
})

test('login without MFA stores the session and loads the profile', async () => {
    authApi.signIn.mockResolvedValue({ token: 'tok' })
    usersApi.me.mockResolvedValue(profile())
    expect(await session.login('  ANA@Mail.com ', 'x')).toBeNull()
    expect(authApi.signIn).toHaveBeenCalledWith('ana@mail.com', 'x')
    expect(session.isLoggedIn.value).toBe(true)
    expect(session.profileId.value).toBe('u1')
    expect(session.fullName.value).toBe('Ana Paz')
    expect(session.state.isAdmin).toBe(false)
    expect(tokenStore.get()).toBe('tok')
})

test('login with MFA returns the challenge and completeMfa finishes it', async () => {
    authApi.signIn.mockResolvedValue({ mfaToken: 'm1' })
    const challenge = await session.login('a@b.c', 'x')
    expect(challenge).toEqual({ mfaToken: 'm1', email: 'a@b.c' })
    expect(session.isLoggedIn.value).toBe(false)
    authApi.signInMfa.mockResolvedValue({ token: 'tok2' })
    usersApi.me.mockResolvedValue(profile('MODERADOR'))
    await session.completeMfa(challenge, '123456')
    expect(session.state.isAdmin).toBe(true)
})

test('register signs up and then logs in', async () => {
    authApi.signUp.mockResolvedValue({})
    authApi.signIn.mockResolvedValue({ token: 't' })
    usersApi.me.mockResolvedValue(profile())
    await session.register({ email: 'a@b.c', password: 'x' })
    expect(authApi.signUp).toHaveBeenCalled()
    expect(session.isLoggedIn.value).toBe(true)
})

test('verifyEmail swaps the token and refreshes the profile; unverified flag is exposed', async () => {
    authApi.confirmEmail.mockResolvedValue({ token: 'fresh' })
    usersApi.me.mockResolvedValue(profile('CIUDADANO', { emailVerified: false }))
    await session.verifyEmail('123456')
    expect(tokenStore.get()).toBe('fresh')
    expect(session.isVerified.value).toBe(false)
    usersApi.me.mockResolvedValue(profile())
    await session.refreshProfile()
    expect(session.isVerified.value).toBe(true)
    session.adoptToken('other')
    expect(session.state.token).toBe('other')
})

test('init restores the profile or clears the session when it fails', async () => {
    tokenStore.set('tok')
    authApi.signIn.mockResolvedValue({ token: 'tok' })
    usersApi.me.mockResolvedValue(profile())
    await session.login('a@b.c', 'x')
    await session.init()
    expect(session.state.ready).toBe(true)
    usersApi.me.mockRejectedValue(new Error('down'))
    await session.init()
    expect(session.isLoggedIn.value).toBe(false)
})

async function unauthorized() {
    let handler
    vi.resetModules()
    const http = await import('@/api/http.js')
    vi.spyOn(http, 'setUnauthorizedHandler').mockImplementation((fn) => { handler = fn })
    await import('../session.js?handler')
    return handler
}

test('a 401 on another endpoint keeps the session while the token is still valid', async () => {
    const handler = await unauthorized()
    const { usersApi: users } = await import('@/api/users.api.js')
    users.me.mockResolvedValue(profile())
    await handler()
    const { default: r } = await import('@/router/index.js')
    expect(r.replace).not.toHaveBeenCalled()
})

test('a confirmed 401 clears the session and redirects to login', async () => {
    const handler = await unauthorized()
    const { usersApi: users } = await import('@/api/users.api.js')
    users.me.mockRejectedValue(Object.assign(new Error('x'), { status: 401 }))
    await handler()
    const { default: r } = await import('@/router/index.js')
    expect(r.replace).toHaveBeenCalledWith({ name: 'login', query: { expired: '1' } })
})

test('non 401 failures while verifying do not log the user out', async () => {
    const handler = await unauthorized()
    const { usersApi: users } = await import('@/api/users.api.js')
    users.me.mockRejectedValue(Object.assign(new Error('x'), { status: 500 }))
    await handler()
    const { default: r } = await import('@/router/index.js')
    expect(r.replace).not.toHaveBeenCalled()
})

test('badges refresh counts alerts and incoming contacts and tolerate failures', async () => {
    alertsApi.unreadCount.mockResolvedValue({ count: 4 })
    contactsApi.incoming.mockResolvedValue([1, 2])
    await badges.refresh()
    expect(badges.state).toEqual({ alerts: 4, contacts: 2 })
    alertsApi.unreadCount.mockRejectedValue(new Error('x'))
    contactsApi.incoming.mockResolvedValue([])
    await badges.refresh()
    expect(badges.state.alerts).toBe(4)
    expect(badges.state.contacts).toBe(0)
})

test('badges polling starts immediately and stops cleanly', async () => {
    vi.useFakeTimers()
    alertsApi.unreadCount.mockResolvedValue({})
    contactsApi.incoming.mockResolvedValue([])
    badges.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(alertsApi.unreadCount).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(alertsApi.unreadCount).toHaveBeenCalledTimes(2)
    badges.stop()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(alertsApi.unreadCount).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
    void setUnauthorizedHandler
    void router
})
