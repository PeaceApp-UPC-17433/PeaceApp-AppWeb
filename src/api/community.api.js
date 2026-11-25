import { http, unwrap, clean } from './http.js'
import { toComment, toFlag, toMetrics, toModerationAction, toVoteSummary } from './mappers.js'
import { usersApi } from './users.api.js'

const wrapPage = (items) => ({ content: items, page: 0, size: items.length, totalPages: 1, totalElements: items.length })

export const communityApi = {
    comments: async (reportId) => {
        const comments = await unwrap(http.get(`/incidents/${reportId}/comments`))
        const summaries = await usersApi.summaries(comments.map((c) => c.authorId))
        return wrapPage(comments.map((c) => toComment(c, summaries)))
    },
    addComment: (reportId, text) => unwrap(http.post(`/incidents/${reportId}/comments`, { text })).then((c) => toComment(c)),
    deleteComment: (commentId) => http.delete(`/comments/${commentId}`),
    votes: (reportId) => unwrap(http.get(`/incidents/${reportId}/votes`)).then(toVoteSummary),
    vote: (reportId, type) => unwrap(http.put(`/incidents/${reportId}/vote`, { type })).then(toVoteSummary),
    retractVote: (reportId) => unwrap(http.delete(`/incidents/${reportId}/vote`)).then(toVoteSummary),
    flagReport: (reportId, reason, details) => unwrap(http.post(`/incidents/${reportId}/flag`, { reason, details })).then(toFlag),
    flagComment: (commentId, reason, details) => unwrap(http.post(`/comments/${commentId}/flag`, { reason, details })).then(toFlag)
}

export const adminApi = {
    flags: async (params) => wrapPage((await unwrap(http.get('/admin/flags', { params: clean({ status: params?.status }) }))).map(toFlag)),
    resolveFlag: (id, resolution, note) => unwrap(http.put(`/admin/flags/${id}/resolve`, { resolution, note })).then(toFlag),
    moderationLog: async (params) => wrapPage((await unwrap(http.get('/admin/moderation-log', { params: clean({ limit: params?.size }) }))).map(toModerationAction)),
    metrics: async () => {
        const [stats, community] = await Promise.all([unwrap(http.get('/incidents/stats')), unwrap(http.get('/admin/metrics'))])
        return toMetrics(stats, community)
    }
}
