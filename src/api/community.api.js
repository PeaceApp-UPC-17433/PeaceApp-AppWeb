import { http, unwrap, clean } from './http.js'

export const communityApi = {
    comments: (reportId, params) => unwrap(http.get(`/reports/${reportId}/comments`, { params: clean(params) })),
    addComment: (reportId, text) => unwrap(http.post(`/reports/${reportId}/comments`, { text })),
    deleteComment: (commentId) => http.delete(`/comments/${commentId}`),
    votes: (reportId) => unwrap(http.get(`/reports/${reportId}/votes`)),
    vote: (reportId, type) => unwrap(http.put(`/reports/${reportId}/vote`, { type })),
    retractVote: (reportId) => unwrap(http.delete(`/reports/${reportId}/vote`)),
    flagReport: (reportId, reason, details) => unwrap(http.post(`/reports/${reportId}/flag`, { reason, details })),
    flagComment: (commentId, reason, details) => unwrap(http.post(`/comments/${commentId}/flag`, { reason, details }))
}

export const adminApi = {
    flags: (params) => unwrap(http.get('/admin/flags', { params: clean(params) })),
    resolveFlag: (id, resolution, note) => unwrap(http.put(`/admin/flags/${id}/resolve`, { resolution, note })),
    moderationLog: (params) => unwrap(http.get('/admin/moderation-log', { params: clean(params) })),
    metrics: () => unwrap(http.get('/admin/metrics'))
}
