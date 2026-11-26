
// Valores del contrato del backend (README, fases 2 a 4). `color` alimenta badges y mapa.
// Los colores de severidad y estado van con texto blanco: todos cumplen contraste WCAG AA (>= 4.5:1).
// RISK_COLORS solo pinta el mapa de calor (sin texto encima) y conserva los tonos claros.
export const REPORT_TYPES = [
    { value: 'ROBO', icon: 'pi-wallet' },
    { value: 'HURTO', icon: 'pi-shopping-bag' },
    { value: 'ACCIDENTE_TRANSITO', icon: 'pi-car' },
    { value: 'AGRESION', icon: 'pi-exclamation-triangle' },
    { value: 'VANDALISMO', icon: 'pi-lightbulb' },
    { value: 'OTRO', icon: 'pi-ellipsis-h' }
]

export const SEVERITIES = [
    { value: 'LOW', color: '#1e7a52' },
    { value: 'MEDIUM', color: '#8a5a00' },
    { value: 'HIGH', color: '#c2410c' }
]

export const REPORT_STATUSES = [
    { value: 'PENDIENTE_VALIDACION', color: '#5b6878' },
    { value: 'EN_MODERACION', color: '#1f79aa' },
    { value: 'VALIDADO', color: '#1e7a52' },
    { value: 'DESCARTADO', color: '#b0504a' }
]

// Transiciones permitidas por el backend para el cambio de estado (solo admin).
export const STATUS_TRANSITIONS = {
    PENDIENTE_VALIDACION: ['EN_MODERACION', 'VALIDADO', 'DESCARTADO'],
    EN_MODERACION: ['VALIDADO', 'DESCARTADO'],
    VALIDADO: ['DESCARTADO'],
    DESCARTADO: []
}

export const FLAG_REASONS = ['SPAM', 'FALSE_INFORMATION', 'OFFENSIVE', 'DUPLICATE', 'OTHER']
export const FLAG_STATUSES = ['OPEN', 'DISMISSED', 'ACTION_TAKEN']
export const RISK_COLORS = { LOW: '#2e9e6b', MEDIUM: '#e0a100', HIGH: '#e8710a' }

const byValue = (list) => Object.fromEntries(list.map((i) => [i.value, i]))
export const typeMeta = byValue(REPORT_TYPES)
export const severityMeta = byValue(SEVERITIES)
export const statusMeta = byValue(REPORT_STATUSES)
