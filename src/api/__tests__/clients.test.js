import { beforeEach, expect, test, vi } from 'vitest'

vi.mock('../http.js', () => ({
    http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    unwrap: (promise) => promise.then((res) => res.data)
}))
vi.mock('axios', () => ({ default: { put: vi.fn(() => Promise.resolve({})) } }))

import axios from 'axios'
import { http } from '../http.js'
import { authApi } from '../auth.api.js'
import { mfaApi } from '../mfa.api.js'
import { uploadEvidence } from '../evidence.api.js'

beforeEach(() => vi.clearAllMocks())

test('signIn returns the token or the MFA challenge', async () => {
    http.post.mockResolvedValueOnce({ data: { accessToken: 't1' } })
    expect(await authApi.signIn('a@b.c', 'x')).toEqual({ token: 't1' })
    http.post.mockResolvedValueOnce({ data: { mfaRequired: true, mfaToken: 'm1' } })
    expect(await authApi.signIn('a@b.c', 'x')).toEqual({ mfaToken: 'm1' })
})

test('auth endpoints use the expected routes', async () => {
    http.post.mockResolvedValue({ data: { accessToken: 't2' } })
    expect(await authApi.signInMfa('m', '123456')).toEqual({ token: 't2' })
    expect(await authApi.confirmEmail('111111')).toEqual({ token: 't2' })
    await authApi.resendEmailCode()
    await authApi.forgotPassword('a@b.c')
    await authApi.resetPassword('tok', 'Nueva-1234')
    await authApi.signUp({ email: 'a@b.c', password: 'Abcdef12', name: 'A', lastname: 'B', phonenumber: '999999999' })
    http.put.mockResolvedValue({})
    await authApi.changePassword('a', 'b')
    const urls = http.post.mock.calls.map((c) => c[0])
    expect(urls).toEqual(expect.arrayContaining(['/auth/login/mfa', '/users/me/email-verification/confirm',
        '/users/me/email-verification/resend', '/auth/forgot-password', '/auth/reset-password', '/auth/register']))
    expect(http.put).toHaveBeenCalledWith('/users/me/password', { currentPassword: 'a', newPassword: 'b' })
})

test('mfa endpoints map their responses', async () => {
    http.get.mockResolvedValue({ data: { enabled: true } })
    expect(await mfaApi.status()).toEqual({ enabled: true })
    http.post.mockResolvedValueOnce({ data: { secret: 's' } })
    expect(await mfaApi.setup()).toEqual({ secret: 's' })
    http.post.mockResolvedValueOnce({ data: { accessToken: 't', recoveryCodes: ['a'] } })
    expect(await mfaApi.enable('123456')).toEqual({ token: 't', recoveryCodes: ['a'] })
    http.post.mockResolvedValueOnce({ data: { recoveryCodes: ['b'] } })
    expect(await mfaApi.regenerateRecoveryCodes('pw', '123456')).toEqual(['b'])
    http.post.mockResolvedValueOnce({})
    await mfaApi.disable('pw', '123456')
    expect(http.post).toHaveBeenLastCalledWith('/users/me/mfa/disable', { password: 'pw', code: '123456' })
})

test('uploadEvidence asks for a SAS URL and uploads the file to blob storage', async () => {
    http.post.mockResolvedValue({ data: { uploadUrl: 'https://blob/up', evidenceUrl: 'https://blob/ev.jpg' } })
    const file = new File(['abc'], 'a.jpg', { type: 'image/jpeg' })
    const result = await uploadEvidence(file)
    expect(http.post).toHaveBeenCalledWith('/evidences/upload-url', { sizeBytes: 3 })
    expect(axios.put).toHaveBeenCalledWith('https://blob/up', file, {
        headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': 'image/jpeg' }
    })
    expect(result).toEqual({ url: 'https://blob/ev.jpg', sizeBytes: 3 })
})

test('uploadEvidence falls back to octet-stream', async () => {
    http.post.mockResolvedValue({ data: { uploadUrl: 'u', evidenceUrl: 'e' } })
    await uploadEvidence(new File(['x'], 'a'))
    expect(axios.put.mock.calls[0][2].headers['Content-Type']).toBe('application/octet-stream')
})
