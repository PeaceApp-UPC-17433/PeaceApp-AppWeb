import { reactive } from 'vue'
import { alertsApi } from '@/api/alerts.api.js'
import { contactsApi } from '@/api/contacts.api.js'
import { env } from '@/config/env.js'

const state = reactive({ alerts: 0, contacts: 0 })
let timer = null

async function refresh() {
    const [a, c] = await Promise.allSettled([alertsApi.unreadCount(), contactsApi.incoming()])
    if (a.status === 'fulfilled') state.alerts = a.value.count ?? 0
    if (c.status === 'fulfilled') state.contacts = c.value.length
}

export const badges = {
    state,
    refresh,
    start() {
        this.stop()
        refresh().catch(() => {})
        timer = setInterval(refresh, env.badgePollMs)
    },
    stop() {
        clearInterval(timer)
        timer = null
        state.alerts = 0
        state.contacts = 0
    }
}
