import { test } from 'vitest'
import assert from 'node:assert/strict'
import { isStrongPassword, PASSWORD_RULES } from '../../config/password.js'

test('accepts passwords that meet every rule', () => {
    assert.equal(isStrongPassword('Clave12345'), true)
    assert.equal(isStrongPassword('aB3' + 'x'.repeat(69)), true)
})

test('rejects passwords that break a rule', () => {
    for (const weak of ['clave12345', 'CLAVE12345', 'ClaveClave', 'Cl1', 'Clave1' + 'x'.repeat(70), '', undefined]) {
        assert.equal(isStrongPassword(weak), false, String(weak))
    }
})

test('every rule can be evaluated independently for the checklist', () => {
    const met = PASSWORD_RULES.filter((r) => r.test('abc')).map((r) => r.key)
    assert.deepEqual(met, ['lower'])
})
