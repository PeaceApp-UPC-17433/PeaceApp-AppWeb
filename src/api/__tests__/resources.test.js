import { beforeEach, expect, test, vi } from 'vitest'

vi.mock('../http.js', () => ({
    http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    unwrap: (promise) => promise.then((res) => res.data),
    clean: (p = {}) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null))
}))
vi.mock('axios', () => ({ default: { post: vi.fn(() => Promise.resolve({ data: { secure_url: 'https://img/x.jpg' } })) } }))

import axios from 'axios'
import { http } from '../http.js'
import { alertsApi } from '../alerts.api.js'
import { adminApi, communityApi } from '../community.api.js'
import { contactsApi } from '../contacts.api.js'
import { reportsApi } from '../reports.api.js'
import { usersApi } from '../users.api.js'
import { uploadImage } from '../cloudinary.api.js'

const ok = (data) => Promise.resolve({ data })

beforeEach(() => {
    vi.clearAllMocks()
    for (const m of ['get', 'post', 'put', 'delete']) http[m].mockImplementation(() => ok([]))
})

test('alerts list paginates and filters unread', async () => {
    http.get.mockImplementation(() => ok(Array.from({ length: 5 }, (_, i) => ({ id: String(i), title: 't', status: 'UNREAD' }))))
    const page = await alertsApi.list({ unread: true, page: 1, size: 2 })
    expect(http.get).toHaveBeenCalledWith('/alerts', { params: { status: 'UNREAD' } })
    expect(page).toMatchObject({ page: 1, size: 2, totalPages: 3, totalElements: 5 })
    expect(page.content).toHaveLength(2)
    expect((await alertsApi.list()).totalElements).toBe(5)
})

test('alerts actions hit the expected routes', async () => {
    http.get.mockImplementation(() => ok({ nearbyIncidents: true }))
    http.put.mockImplementation(() => ok({ nearbyIncidents: true }))
    await alertsApi.unreadCount()
    await alertsApi.markRead('1')
    await alertsApi.markAllRead()
    await alertsApi.remove('1')
    await alertsApi.removeAll()
    await alertsApi.getSettings()
    await alertsApi.saveSettings({ radiusMeters: 500 })
    await alertsApi.sendLocation(-12, -77)
    expect(http.put).toHaveBeenCalledWith('/alerts/settings/location', { latitude: -12, longitude: -77 })
    expect(http.delete).toHaveBeenCalledWith('/alerts')
})

test('users api resolves summaries without duplicates and skips empty lists', async () => {
    expect(await usersApi.summaries([null, ''])).toEqual(new Map())
    http.post.mockImplementation(() => ok([{ id: 'a', name: 'Ana' }]))
    const map = await usersApi.summaries(['a', 'a', null])
    expect(http.post).toHaveBeenCalledWith('/users/summaries', { ids: ['a'] })
    expect(map.get('a').name).toBe('Ana')
    http.get.mockImplementation(() => ok({ id: 'u1' }))
    expect(await usersApi.lookupId('a@b.c')).toBe('u1')
    await usersApi.remove()
    expect(http.delete).toHaveBeenCalledWith('/users/me')
})

test('users me and update map the profile', async () => {
    const profile = { id: 'u', email: 'a@b.c', name: 'A', lastname: 'B', role: 'CIUDADANO', phonenumber: '999999999' }
    http.get.mockImplementation(() => ok(profile))
    http.put.mockImplementation(() => ok(profile))
    expect((await usersApi.me()).id).toBe('u')
    expect((await usersApi.update('u', { name: 'X' })).id).toBe('u')
})

test('contacts load profiles for every list and manage requests', async () => {
    http.get.mockImplementation(() => ok([{ id: 'c1', userId: 'a', status: 'ACCEPTED' }]))
    http.post.mockImplementation(() => ok([{ id: 'a', name: 'Ana' }]))
    for (const list of ['accepted', 'incoming', 'outgoing', 'blocked']) {
        expect(await contactsApi[list]()).toHaveLength(1)
    }
    http.get.mockImplementation(() => ok({ id: 'target' }))
    http.post.mockImplementation(() => ok({ id: 'req' }))
    await contactsApi.request('a@b.c')
    expect(http.post).toHaveBeenLastCalledWith('/contacts/requests', { addresseeId: 'target' })
    await contactsApi.accept('1')
    await contactsApi.decline('1')
    await contactsApi.block('1')
    await contactsApi.remove('1')
    expect(http.put).toHaveBeenCalledWith('/contacts/1/block')
})

test('reports api maps pages and reports', async () => {
    const incident = { id: '1', authorId: 'u', type: 'ROBO', severity: 'HIGH', title: 't', description: 'd', status: 'VALIDADO', evidences: [] }
    http.get.mockImplementation(() => ok({ content: [incident], number: 0, size: 10, totalPages: 1, totalElements: 1 }))
    expect((await reportsApi.list({ q: 'x', empty: '' })).content).toHaveLength(1)
    http.get.mockImplementation(() => ok(incident))
    http.put.mockImplementation(() => ok(incident))
    http.post.mockImplementation(() => ok(incident))
    const form = { type: 'ROBO', severity: 'HIGH', title: 't', description: 'd', address: 'a', latitude: -12, longitude: -77, imageUrl: '' }
    expect((await reportsApi.get('1')).id).toBe('1')
    await reportsApi.create(form)
    await reportsApi.update('1', form)
    await reportsApi.changeStatus('1', 'VALIDADO')
    await reportsApi.remove('1')
    http.get.mockImplementation(() => ok([{ latitude: -12, longitude: -77, count: 3 }]))
    await reportsApi.map({ type: 'ROBO' })
    expect(await reportsApi.heatmap({})).toHaveLength(1)
})

test('community api reads and writes comments, votes and flags', async () => {
    http.get.mockImplementation(() => ok([{ id: 'c', authorId: 'a', text: 'hola' }]))
    http.post.mockImplementation((url) => ok(url.includes('summaries') ? [{ id: 'a', name: 'Ana' }] : { id: 'c', text: 'x', status: 'OPEN' }))
    http.put.mockImplementation(() => ok({ confirmations: 1, disputes: 0 }))
    http.delete.mockImplementation(() => ok({ confirmations: 0, disputes: 0 }))
    expect((await communityApi.comments('r1')).content).toHaveLength(1)
    await communityApi.addComment('r1', 'x')
    await communityApi.deleteComment('c')
    http.get.mockImplementation(() => ok({ confirmations: 2, disputes: 1 }))
    await communityApi.votes('r1')
    await communityApi.vote('r1', 'CONFIRM')
    await communityApi.retractVote('r1')
    await communityApi.flagReport('r1', 'FALSO', 'detalle')
    await communityApi.flagComment('c', 'SPAM', null)
    expect(http.put).toHaveBeenCalledWith('/incidents/r1/vote', { type: 'CONFIRM' })
})

test('admin api lists flags, log and metrics', async () => {
    http.get.mockImplementation((url) => ok(url === '/incidents/stats' ? { total: 3, byStatus: {}, byType: {} } : url === '/admin/metrics' ? { flagsOpen: 1 } : []))
    http.put.mockImplementation(() => ok({ id: 'f', status: 'RESOLVED' }))
    expect((await adminApi.flags({ status: 'OPEN' })).content).toEqual([])
    expect((await adminApi.moderationLog({ size: 5 })).content).toEqual([])
    await adminApi.resolveFlag('f', 'UPHOLD', 'nota')
    expect(await adminApi.metrics()).toBeTruthy()
})

test('cloudinary upload returns the secure url', async () => {
    expect(await uploadImage(new File(['a'], 'a.png'))).toBe('https://img/x.jpg')
    expect(axios.post.mock.calls[0][0]).toContain('/image/upload')
})
