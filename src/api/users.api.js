import { http, unwrap } from './http.js'

export const usersApi = {
    getByEmail: (email) => unwrap(http.get(`/users/${encodeURIComponent(email)}`)),
    update: (id, payload) => unwrap(http.put(`/users/${id}`, payload)),
    remove: (id) => http.delete(`/users/${id}`)
}
