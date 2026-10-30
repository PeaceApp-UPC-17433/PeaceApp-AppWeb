import { http, unwrap, clean } from './http.js'

export const alertsApi = {
    list: (params) => unwrap(http.get('/alerts', { params: clean(params) })),
    unreadCount: () => unwrap(http.get('/alerts/unread-count')),
    markRead: (id) => unwrap(http.put(`/alerts/${id}/read`)),
    markAllRead: () => unwrap(http.put('/alerts/read-all')),
    remove: (id) => http.delete(`/alerts/${id}`),
    removeAll: () => http.delete('/alerts'),
    getSettings: () => unwrap(http.get('/alerts/settings')),
    saveSettings: (payload) => unwrap(http.put('/alerts/settings', payload)),
    // Sin ubicación guardada el usuario no recibe alertas por proximidad.
    sendLocation: (latitude, longitude) => http.put('/alerts/settings/location', { latitude, longitude })
}
