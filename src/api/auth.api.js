import { http, unwrap } from './http.js'
import { fromSignUp } from './mappers.js'

export const authApi = {
    signIn: async (email, password) => {
        const { accessToken, mfaRequired, mfaToken } = await unwrap(http.post('/auth/login', { email, password }))
        return mfaRequired ? { mfaToken } : { token: accessToken }
    },
    signInMfa: async (mfaToken, code) => {
        const { accessToken } = await unwrap(http.post('/auth/login/mfa', { mfaToken, code }))
        return { token: accessToken }
    },
    signUp: (payload) => http.post('/auth/register', fromSignUp(payload)),
    changePassword: (currentPassword, newPassword) => http.put('/users/me/password', { currentPassword, newPassword }),
    confirmEmail: async (code) => {
        const { accessToken } = await unwrap(http.post('/users/me/email-verification/confirm', { code }))
        return { token: accessToken }
    },
    resendEmailCode: () => http.post('/users/me/email-verification/resend'),
    forgotPassword: (email) => http.post('/auth/forgot-password', { email }),
    resetPassword: (token, newPassword) => http.post('/auth/reset-password', { token, newPassword })
}
