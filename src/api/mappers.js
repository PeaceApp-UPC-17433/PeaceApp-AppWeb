export const UNKNOWN_SIZE_BYTES = 0

export const toReport = (incident) => ({
    id: incident.id,
    idUser: incident.authorId ?? null,
    title: incident.title || '',
    detail: incident.description || '',
    type: incident.type,
    severity: incident.severity,
    status: incident.status,
    address: incident.address || '',
    latitude: incident.latitude,
    longitude: incident.longitude,
    occurredAt: incident.occurredAt,
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
    image: incident.evidences?.find((e) => e.mediaType === 'FOTO')?.url || ''
})

export const fromReportForm = (form) => ({
    type: form.type,
    title: form.title,
    description: form.detail,
    address: form.address,
    occurredAt: form.occurredAt,
    latitude: form.latitude,
    longitude: form.longitude,
    ...(form.image ? { evidences: [{ mediaType: 'FOTO', url: form.image, sizeBytes: UNKNOWN_SIZE_BYTES }] } : {})
})

export const toPage = (page, mapItem = (x) => x) => ({
    content: (page.content || []).map(mapItem),
    page: page.page ?? 0,
    size: page.size ?? (page.content || []).length,
    totalPages: page.totalPages ?? 1,
    totalElements: page.totalElements ?? (page.content || []).length
})

export const toAlert = (alert) => ({
    id: alert.id,
    reportId: alert.incidentId,
    title: '',
    type: alert.category,
    severity: alert.severity,
    latitude: alert.latitude,
    longitude: alert.longitude,
    distanceMeters: alert.distanceMeters,
    status: alert.status,
    readAt: alert.readAt,
    createdAt: alert.createdAt
})

export const toAlertSettings = (settings) => ({
    radiusMeters: settings.radiusMeters,
    minSeverity: settings.minSeverity,
    ignoredTypes: settings.ignoredCategories || [],
    mutedUntil: settings.mutedUntil,
    latitude: settings.lastLatitude,
    longitude: settings.lastLongitude,
    locationUpdatedAt: settings.locationUpdatedAt
})

export const fromAlertSettings = (settings) => ({
    radiusMeters: settings.radiusMeters,
    minSeverity: settings.minSeverity,
    ignoredCategories: settings.ignoredTypes || [],
    mutedUntil: settings.mutedUntil || null
})

export const toProfile = (me) => ({
    id: me.id,
    email: me.email,
    role: me.role,
    name: me.firstName || '',
    lastname: me.lastName || '',
    phonenumber: me.phoneNumber || '',
    profile_image: me.avatarUrl || ''
})

export const fromProfilePatch = (patch) => {
    const body = {}
    if (patch.name !== undefined) body.firstName = patch.name
    if (patch.lastname !== undefined) body.lastName = patch.lastname
    if (patch.phonenumber !== undefined) body.phoneNumber = patch.phonenumber
    if (patch.profile_image !== undefined) body.avatarUrl = patch.profile_image
    if (patch.email !== undefined) body.email = patch.email
    return body
}

export const fromSignUp = (form) => ({
    email: form.email,
    password: form.password,
    firstName: form.name,
    lastName: form.lastname,
    phoneNumber: form.phonenumber
})

const FLAG_TARGETS = { INCIDENT: 'REPORT', COMMENT: 'COMMENT' }

export const toFlag = (flag) => ({ ...flag, targetType: FLAG_TARGETS[flag.targetType] || flag.targetType })

export const toModerationAction = (action) => ({ ...action, targetType: FLAG_TARGETS[action.targetType] || action.targetType })

export const splitDisplayName = (displayName = '') => {
    const [name, ...rest] = displayName.split(' ')
    return { name: name || '', lastname: rest.join(' ') }
}

export const toContact = (contact, summaries = new Map()) => {
    const summary = summaries.get(contact.userId)
    const { name, lastname } = splitDisplayName(summary?.displayName)
    return {
        id: contact.id,
        profileId: contact.userId,
        status: contact.status,
        name,
        lastname,
        email: '',
        profile_image: summary?.avatarUrl || '',
        respondedAt: contact.since,
        createdAt: contact.since
    }
}

export const toComment = (comment, summaries = new Map()) => ({
    id: comment.id,
    reportId: comment.incidentId,
    authorId: comment.authorId,
    authorName: summaries.get(comment.authorId)?.displayName || '',
    text: comment.text,
    createdAt: comment.createdAt
})

export const toVoteSummary = (summary) => ({ ...summary, verificationThreshold: summary.threshold })

export const toMetrics = (stats, community) => {
    const flagsTotal = community.dismissedFlags + community.actionTakenFlags
    return {
        reports: {
            total: stats.total,
            verifiedRate: stats.verifiedRate,
            averageAttentionHours: null,
            byStatus: stats.byStatus
        },
        community: { comments: community.comments, confirmations: community.confirmations, disputes: community.disputes },
        flags: {
            open: community.openFlags,
            dismissed: community.dismissedFlags,
            actionTaken: community.actionTakenFlags,
            actionRate: flagsTotal ? community.actionTakenFlags / flagsTotal : 0
        }
    }
}

export const toHeatCell = (cell) => ({ latitude: cell.latitude, longitude: cell.longitude, count: cell.count, riskLevel: cell.risk })
