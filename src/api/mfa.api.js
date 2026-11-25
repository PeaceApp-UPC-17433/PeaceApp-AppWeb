import { http, unwrap } from './http.js'

export const mfaApi = {
    status: () => unwrap(http.get('/users/me/mfa')),
    setup: () => unwrap(http.post('/users/me/mfa/setup')),
    enable: async (code) => {
        const { accessToken, recoveryCodes } = await unwrap(http.post('/users/me/mfa/enable', { code }))
        return { token: accessToken, recoveryCodes }
    },
    disable: (password, code) => http.post('/users/me/mfa/disable', { password, code }),
    regenerateRecoveryCodes: async (password, code) => {
        const { recoveryCodes } = await unwrap(http.post('/users/me/mfa/recovery-codes', { password, code }))
        return recoveryCodes
    }
}
