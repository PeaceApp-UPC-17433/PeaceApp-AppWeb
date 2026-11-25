import { http, unwrap, clean } from './http.js'
import { fromAlertSettings, toAlert, toAlertSettings } from './mappers.js'

export const alertsApi = {
    list: async (params) => {
        const alerts = await unwrap(http.get('/alerts', { params: clean({ status: params?.unread ? 'UNREAD' : undefined }) }))
        const size = params?.size || alerts.length || 1
        const page = params?.page || 0
        const content = alerts.slice(page * size, (page + 1) * size).map(toAlert)
        return { content, page, size, totalPages: Math.max(1, Math.ceil(alerts.length / size)), totalElements: alerts.length }
    },
    unreadCount: () => unwrap(http.get('/alerts/unread-count')),
    markRead: (id) => unwrap(http.put(`/alerts/${id}/read`)),
    markAllRead: () => unwrap(http.put('/alerts/read-all')),
    remove: (id) => http.delete(`/alerts/${id}`),
    removeAll: () => http.delete('/alerts'),
    getSettings: () => unwrap(http.get('/alerts/settings')).then(toAlertSettings),
    saveSettings: (settings) => unwrap(http.put('/alerts/settings', fromAlertSettings(settings))).then(toAlertSettings),
    sendLocation: (latitude, longitude) => http.put('/alerts/settings/location', { latitude, longitude })
}
