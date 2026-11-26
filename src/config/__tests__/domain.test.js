import { expect, test } from 'vitest'
import { REPORT_STATUSES, SEVERITIES, severityMeta, statusMeta } from '../domain.js'

// Las insignias de severidad y estado llevan texto blanco (4.4.5 del informe, WCAG 2.2 1.4.3).
function luminance(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrastWithWhite = (hex) => 1.05 / (luminance(hex) + 0.05)

test.each([...SEVERITIES, ...REPORT_STATUSES])('$value con texto blanco cumple contraste AA', ({ color }) => {
    expect(contrastWithWhite(color)).toBeGreaterThanOrEqual(4.5)
})

test('los metadatos se buscan por valor', () => {
    expect(severityMeta.HIGH.color).toBe(SEVERITIES.find((s) => s.value === 'HIGH').color)
    expect(statusMeta.VALIDADO.color).toBe(REPORT_STATUSES.find((s) => s.value === 'VALIDADO').color)
})
