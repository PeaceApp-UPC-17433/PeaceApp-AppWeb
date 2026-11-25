import { http, unwrap } from './http.js'
import { toContact } from './mappers.js'
import { usersApi } from './users.api.js'

const withProfiles = async (list) => {
    const summaries = await usersApi.summaries(list.map((c) => c.userId))
    return list.map((c) => toContact(c, summaries))
}

export const contactsApi = {
    accepted: async () => withProfiles(await unwrap(http.get('/contacts'))),
    incoming: async () => withProfiles(await unwrap(http.get('/contacts/requests/incoming'))),
    outgoing: async () => withProfiles(await unwrap(http.get('/contacts/requests/outgoing'))),
    blocked: async () => withProfiles(await unwrap(http.get('/contacts/blocked'))),
    request: async (email) => {
        const addresseeId = await usersApi.lookupId(email)
        return unwrap(http.post('/contacts/requests', { addresseeId }))
    },
    accept: (id) => http.put(`/contacts/${id}/accept`),
    decline: (id) => http.delete(`/contacts/${id}`),
    block: (id) => http.put(`/contacts/${id}/block`),
    remove: (id) => http.delete(`/contacts/${id}`)
}
