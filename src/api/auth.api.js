import { http, unwrap } from './http.js'
import { fromSignUp } from './mappers.js'

export const authApi = {
    signIn: async (email, password) => {
        const { accessToken } = await unwrap(http.post('/auth/login', { email, password }))
        return { token: accessToken }
    },
    signUp: (payload) => http.post('/auth/register', fromSignUp(payload)),
    changePassword: (currentPassword, newPassword) => http.put('/users/me/password', { currentPassword, newPassword }),
    forgotPassword: (email) => http.post('/auth/forgot-password', { email }),
    resetPassword: (token, newPassword) => http.post('/auth/reset-password', { token, newPassword })
}
