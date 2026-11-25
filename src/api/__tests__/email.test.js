import test from 'node:test'
import assert from 'node:assert/strict'
import { maskEmail } from '../../config/email.js'

test('maskEmail keeps two characters and the domain', () => {
    assert.equal(maskEmail('ana.quispe@example.com'), 'an***@example.com')
    assert.equal(maskEmail('a@b.co'), 'a***@b.co')
    assert.equal(maskEmail(''), '')
    assert.equal(maskEmail('sin-arroba'), 'sin-arroba')
})
