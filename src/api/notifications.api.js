import { http, unwrap, clean } from './http.js'

export const notificationsApi = {
    list: (params) => unwrap(http.get('/notifications', { params: clean(params) })),
    unreadCount: () => unwrap(http.get('/notifications/unread-count')),
    markRead: (id) => unwrap(http.put(`/notifications/${id}/read`)),
    markAllRead: () => unwrap(http.put('/notifications/read-all')),
    remove: (id) => http.delete(`/notifications/${id}`),
    getPreferences: () => unwrap(http.get('/notifications/preferences')),
    savePreferences: (payload) => unwrap(http.put('/notifications/preferences', payload)),
    registerDevice: (token, platform = 'WEB') => unwrap(http.post('/notifications/devices', { token, platform })),
    removeDevice: (token) => http.delete('/notifications/devices', { params: { token } })
}
