import { http, unwrap, clean } from './http.js'
import { fromReportForm, toHeatCell, toPage, toReport } from './mappers.js'

export const reportsApi = {
    list: (params) => unwrap(http.get('/incidents', { params: clean(params) })).then((page) => toPage(page, toReport)),
    get: (id) => unwrap(http.get(`/incidents/${id}`)).then(toReport),
    create: (form) => unwrap(http.post('/incidents', fromReportForm(form))).then(toReport),
    update: (id, form) => unwrap(http.put(`/incidents/${id}`, fromReportForm(form))).then(toReport),
    changeStatus: (id, status) => unwrap(http.put(`/incidents/${id}/status`, { status })).then(toReport),
    remove: (id) => http.delete(`/incidents/${id}`),
    map: (params) => unwrap(http.get('/incidents/map', { params: clean(params) })),
    heatmap: (params) => unwrap(http.get('/incidents/heatmap', { params: clean(params) })).then((cells) => cells.map(toHeatCell))
}
