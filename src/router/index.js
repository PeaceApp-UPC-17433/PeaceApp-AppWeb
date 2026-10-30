import { createRouter, createWebHistory } from 'vue-router'
import { session } from '@/stores/session.js'

import AuthLayout from '@/layouts/AuthLayout.vue'
import AppLayout from '@/layouts/AppLayout.vue'

// Las vistas se cargan bajo demanda: el mapa (mapbox-gl) no pesa en el login.
const router = createRouter({
    history: createWebHistory(),
    scrollBehavior: () => ({ top: 0 }),
    routes: [
        // '/' no debe caer en ningún layout: ambos comparten el prefijo.
        { path: '/', redirect: '/map' },
        {
            path: '/',
            component: AuthLayout,
            meta: { guestOnly: true },
            children: [
                { path: 'login', name: 'login', component: () => import('@/views/LoginView.vue') },
                { path: 'register', name: 'register', component: () => import('@/views/RegisterView.vue') },
                { path: 'forgot-password', name: 'forgot-password', component: () => import('@/views/ForgotPasswordView.vue') },
                { path: 'reset-password', name: 'reset-password', component: () => import('@/views/ResetPasswordView.vue') }
            ]
        },
        {
            path: '/',
            component: AppLayout,
            meta: { requiresAuth: true },
            children: [
                { path: 'map', name: 'map', component: () => import('@/views/MapView.vue') },
                { path: 'reports', name: 'reports', component: () => import('@/views/ReportsView.vue') },
                { path: 'reports/new', name: 'report-new', component: () => import('@/views/ReportFormView.vue') },
                { path: 'reports/:id', name: 'report-detail', component: () => import('@/views/ReportDetailView.vue'), props: true },
                { path: 'reports/:id/edit', name: 'report-edit', component: () => import('@/views/ReportFormView.vue'), props: true },
                { path: 'alerts', name: 'alerts', component: () => import('@/views/AlertsView.vue') },
                { path: 'notifications', name: 'notifications', component: () => import('@/views/NotificationsView.vue') },
                { path: 'contacts', name: 'contacts', component: () => import('@/views/ContactsView.vue') },
                { path: 'profile', name: 'profile', component: () => import('@/views/ProfileView.vue') },
                { path: 'admin', name: 'admin', component: () => import('@/views/AdminView.vue'), meta: { requiresAdmin: true } }
            ]
        },
        { path: '/:pathMatch(.*)*', redirect: '/' }
    ]
})

router.beforeEach(async (to) => {
    if (!session.state.ready) await session.init()
    const logged = session.isLoggedIn.value

    if (to.matched.some((r) => r.meta.requiresAuth) && !logged) {
        return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
    }
    // Quien ya inició sesión no vuelve a las pantallas de acceso (salvo recuperar contraseña con token).
    if (to.matched.some((r) => r.meta.guestOnly) && logged && to.name !== 'reset-password') return { path: '/map' }
    if (to.meta.requiresAdmin && !session.state.isAdmin) return { path: '/map' }
})

export default router
