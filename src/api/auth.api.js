import { http, unwrap } from './http.js'

export const authApi = {
    signIn: (email, password) => unwrap(http.post('/authentication/sign-in', { username: email, password })),
    signUp: (payload) => unwrap(http.post('/authentication/sign-up', payload)),
    changePassword: (currentPassword, newPassword) =>
        http.put('/authentication/change-password', { currentPassword, newPassword }),
    forgotPassword: (email) => http.post('/authentication/forgot-password', { email }),
    resetPassword: (token, newPassword) => http.post('/authentication/reset-password', { token, newPassword })
}
