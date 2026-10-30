import robTag from '@/assets/rob_tag.png'
import carTag from '@/assets/car_tag.png'
import illumTag from '@/assets/illumination_tag.png'
import acosoTag from '@/assets/acoso_tag.png'
import redMarker from '@/assets/red_marker.png'

// Valores del contrato del backend (README, fases 2 a 4). `color` alimenta badges y mapa.
export const REPORT_TYPES = [
    { value: 'THEFT', icon: 'pi-wallet', image: robTag },
    { value: 'ACCIDENT', icon: 'pi-car', image: carTag },
    { value: 'LIGHTING', icon: 'pi-lightbulb', image: illumTag },
    { value: 'HARASSMENT', icon: 'pi-exclamation-triangle', image: acosoTag },
    { value: 'EMERGENCY', icon: 'pi-bolt', image: redMarker },
    { value: 'OTHER', icon: 'pi-ellipsis-h', image: redMarker }
]

export const SEVERITIES = [
    { value: 'LOW', color: '#2e9e6b' },
    { value: 'MEDIUM', color: '#e0a100' },
    { value: 'HIGH', color: '#e8710a' },
    { value: 'CRITICAL', color: '#d93025' }
]

export const REPORT_STATUSES = [
    { value: 'PENDING', color: '#6b7a8c' },
    { value: 'UNDER_REVIEW', color: '#1f79aa' },
    { value: 'VERIFIED', color: '#2e9e6b' },
    { value: 'DISCARDED', color: '#b0504a' },
    { value: 'RESOLVED', color: '#5b6ee1' }
]

// Transiciones permitidas por el backend para el cambio de estado (solo admin).
export const STATUS_TRANSITIONS = {
    PENDING: ['UNDER_REVIEW', 'VERIFIED', 'DISCARDED'],
    UNDER_REVIEW: ['VERIFIED', 'DISCARDED'],
    VERIFIED: ['RESOLVED', 'DISCARDED'],
    DISCARDED: [],
    RESOLVED: []
}

export const FLAG_REASONS = ['SPAM', 'FALSE_INFORMATION', 'OFFENSIVE', 'DUPLICATE', 'OTHER']
export const FLAG_STATUSES = ['OPEN', 'DISMISSED', 'ACTION_TAKEN']
export const NOTIFICATION_KINDS = ['PROXIMITY_ALERT', 'CONTACT_REQUEST', 'CONTACT_ACCEPTED']
export const RISK_COLORS = { LOW: '#2e9e6b', MEDIUM: '#e0a100', HIGH: '#e8710a', CRITICAL: '#d93025' }

const byValue = (list) => Object.fromEntries(list.map((i) => [i.value, i]))
export const typeMeta = byValue(REPORT_TYPES)
export const severityMeta = byValue(SEVERITIES)
export const statusMeta = byValue(REPORT_STATUSES)
