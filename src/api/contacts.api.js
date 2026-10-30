import { http, unwrap } from './http.js'

export const contactsApi = {
    accepted: () => unwrap(http.get('/contacts')),
    incoming: () => unwrap(http.get('/contacts/requests/incoming')),
    outgoing: () => unwrap(http.get('/contacts/requests/outgoing')),
    blocked: () => unwrap(http.get('/contacts/blocked')),
    request: (email) => unwrap(http.post('/contacts/requests', { email })),
    accept: (id) => http.put(`/contacts/${id}/accept`),
    decline: (id) => http.put(`/contacts/${id}/decline`),
    block: (id) => http.put(`/contacts/${id}/block`),
    remove: (id) => http.delete(`/contacts/${id}`)
}
