import { http, unwrap, clean } from './http.js'

export const reportsApi = {
    list: (params) => unwrap(http.get('/reports', { params: clean(params) })),
    get: (id) => unwrap(http.get(`/reports/${id}`)),
    create: (payload) => unwrap(http.post('/reports', payload)),
    update: (id, payload) => unwrap(http.put(`/reports/${id}`, payload)),
    changeStatus: (id, status) => unwrap(http.put(`/reports/${id}/status`, { status })),
    remove: (id) => http.delete(`/reports/${id}`),
    map: (params) => unwrap(http.get('/reports/map', { params: clean(params) })),
    heatmap: (params) => unwrap(http.get('/reports/heatmap', { params: clean(params) }))
}
