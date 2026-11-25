import robTag from '@/assets/rob_tag.png'
import carTag from '@/assets/car_tag.png'
import illumTag from '@/assets/illumination_tag.png'
import acosoTag from '@/assets/acoso_tag.png'
import redMarker from '@/assets/red_marker.png'

// Valores del contrato del backend (README, fases 2 a 4). `color` alimenta badges y mapa.
export const REPORT_TYPES = [
    { value: 'ROBO', icon: 'pi-wallet', image: robTag },
    { value: 'HURTO', icon: 'pi-shopping-bag', image: robTag },
    { value: 'ACCIDENTE_TRANSITO', icon: 'pi-car', image: carTag },
    { value: 'AGRESION', icon: 'pi-exclamation-triangle', image: acosoTag },
    { value: 'VANDALISMO', icon: 'pi-lightbulb', image: illumTag },
    { value: 'OTRO', icon: 'pi-ellipsis-h', image: redMarker }
]

export const SEVERITIES = [
    { value: 'LOW', color: '#2e9e6b' },
    { value: 'MEDIUM', color: '#e0a100' },
    { value: 'HIGH', color: '#e8710a' }
]

export const REPORT_STATUSES = [
    { value: 'PENDIENTE_VALIDACION', color: '#6b7a8c' },
    { value: 'EN_MODERACION', color: '#1f79aa' },
    { value: 'VALIDADO', color: '#2e9e6b' },
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
