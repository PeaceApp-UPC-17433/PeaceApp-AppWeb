import { reactive } from 'vue'
import { alertsApi } from '@/api/alerts.api.js'
import { notificationsApi } from '@/api/notifications.api.js'
import { env } from '@/config/env.js'

const state = reactive({ alerts: 0, notifications: 0 })
let timer = null

async function refresh() {
    const [a, n] = await Promise.allSettled([alertsApi.unreadCount(), notificationsApi.unreadCount()])
    if (a.status === 'fulfilled') state.alerts = a.value.count ?? 0
    if (n.status === 'fulfilled') state.notifications = n.value.count ?? 0
}

export const badges = {
    state,
    refresh,
    start() {
        this.stop()
        refresh()
        timer = setInterval(refresh, env.badgePollMs)
    },
    stop() {
        clearInterval(timer)
        timer = null
        state.alerts = 0
        state.notifications = 0
    }
}
