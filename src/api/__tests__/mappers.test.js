import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
    fromAlertSettings, fromProfilePatch, fromReportForm, fromSignUp, toAlert, toAlertSettings, toContact, toFlag,
    toMetrics, toPage, toProfile, toReport, toVoteSummary
} from '../mappers.js'

test('toReport maps backend incident to the shape the views use', () => {
    const report = toReport({
        id: '1', authorId: 'u1', type: 'ROBO', severity: 'HIGH', title: 'Robo', description: 'detalle', address: 'Av 1',
        latitude: -12, longitude: -77, status: 'VALIDADO', occurredAt: 'x', createdAt: 'y',
        evidences: [{ mediaType: 'FOTO', url: 'https://img/1.jpg' }]
    })
    assert.equal(report.idUser, 'u1')
    assert.equal(report.detail, 'detalle')
    assert.equal(report.image, 'https://img/1.jpg')
})

test('toReport keeps anonymous authors hidden and tolerates missing optional fields', () => {
    const report = toReport({ id: '1', authorId: null, type: 'OTRO', status: 'PENDIENTE_VALIDACION' })
    assert.equal(report.idUser, null)
    assert.equal(report.title, '')
    assert.equal(report.image, '')
})

test('fromReportForm sends the photo as evidence with unknown size', () => {
    const body = fromReportForm({ type: 'ROBO', title: 't', detail: 'd', address: 'a', occurredAt: 'z', latitude: 1, longitude: 2, image: 'https://img' })
    assert.equal(body.description, 'd')
    assert.deepEqual(body.evidences, [{ mediaType: 'FOTO', url: 'https://img', sizeBytes: 0 }])
    assert.equal(fromReportForm({ type: 'ROBO', title: 't', latitude: 1, longitude: 2 }).evidences, undefined)
})

test('toPage fills defaults for list endpoints without pagination data', () => {
    const page = toPage({ content: [1, 2] }, (x) => x * 2)
    assert.deepEqual(page.content, [2, 4])
    assert.equal(page.totalPages, 1)
    assert.equal(page.totalElements, 2)
})

test('alert and settings mappers translate category names', () => {
    assert.equal(toAlert({ id: 'a', incidentId: 'i', category: 'ROBO', severity: 'HIGH' }).type, 'ROBO')
    assert.deepEqual(toAlertSettings({ radiusMeters: 500, minSeverity: 'LOW', ignoredCategories: ['OTRO'] }).ignoredTypes, ['OTRO'])
    assert.deepEqual(fromAlertSettings({ radiusMeters: 500, minSeverity: 'LOW', ignoredTypes: ['OTRO'], mutedUntil: '' }),
        { radiusMeters: 500, minSeverity: 'LOW', ignoredCategories: ['OTRO'], mutedUntil: null })
})

test('profile mappers translate between UI and backend names', () => {
    const profile = toProfile({ id: '1', email: 'a@b.c', role: 'MODERADOR', firstName: 'Ana', lastName: 'Q', phoneNumber: '9', avatarUrl: 'u' })
    assert.deepEqual([profile.name, profile.lastname, profile.phonenumber, profile.profile_image], ['Ana', 'Q', '9', 'u'])
    assert.equal(profile.emailVerified, true)
    assert.equal(toProfile({ id: '2', emailVerified: false }).emailVerified, false)
    assert.deepEqual(fromProfilePatch({ name: 'Bea', profile_image: 'x' }), { firstName: 'Bea', avatarUrl: 'x' })
    assert.deepEqual(fromSignUp({ email: 'e', password: 'p', name: 'n', lastname: 'l', phonenumber: 't', locale: 'en' }),
        { email: 'e', password: 'p', firstName: 'n', lastName: 'l', phoneNumber: 't', locale: 'en' })
})

test('toFlag renames INCIDENT target to REPORT for the admin screen', () => {
    assert.equal(toFlag({ targetType: 'INCIDENT' }).targetType, 'REPORT')
    assert.equal(toFlag({ targetType: 'COMMENT' }).targetType, 'COMMENT')
})

test('toContact uses the user summary for names', () => {
    const summaries = new Map([['u2', { displayName: 'Ana Q.', avatarUrl: 'a.png' }]])
    const contact = toContact({ id: 'c1', userId: 'u2', status: 'ACCEPTED', since: 's' }, summaries)
    assert.deepEqual([contact.name, contact.lastname, contact.profile_image], ['Ana', 'Q.', 'a.png'])
})

test('toVoteSummary exposes the threshold under the legacy name', () => {
    assert.equal(toVoteSummary({ threshold: 3 }).verificationThreshold, 3)
})

test('toMetrics combines incident stats and community metrics', () => {
    const metrics = toMetrics({ total: 10, verifiedRate: 0.3, byStatus: { VALIDADO: 3 } },
        { comments: 5, confirmations: 4, disputes: 1, openFlags: 2, dismissedFlags: 1, actionTakenFlags: 3 })
    assert.equal(metrics.reports.total, 10)
    assert.equal(metrics.flags.open, 2)
    assert.equal(metrics.flags.actionRate, 0.75)
})

test('fromReportForm sends the stored evidence size when known', () => {
    const body = fromReportForm({ type: 'ROBO', title: 't', latitude: 1, longitude: 2, image: 'https://s/a.jpg', imageSize: 2048 })
    assert.equal(body.evidences[0].sizeBytes, 2048)
})
