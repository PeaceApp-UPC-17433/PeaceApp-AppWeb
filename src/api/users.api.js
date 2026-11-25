import { http, unwrap } from './http.js'
import { fromProfilePatch, toProfile } from './mappers.js'

export const usersApi = {
    me: () => unwrap(http.get('/users/me')).then(toProfile),
    update: (_id, patch) => unwrap(http.put('/users/me', fromProfilePatch(patch))).then(toProfile),
    remove: () => http.delete('/users/me'),
    lookupId: (email) => unwrap(http.get('/users/lookup', { params: { email } })).then((r) => r.id),
    summaries: async (ids) => {
        const unique = [...new Set(ids.filter(Boolean))]
        if (!unique.length) return new Map()
        const list = await unwrap(http.post('/users/summaries', { ids: unique }))
        return new Map(list.map((s) => [s.id, s]))
    }
}
