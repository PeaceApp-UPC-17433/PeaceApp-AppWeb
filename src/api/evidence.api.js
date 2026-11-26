import axios from 'axios'
import { http, unwrap } from './http.js'

export async function uploadEvidence(file) {
    const target = await unwrap(http.post('/evidences/upload-url', { sizeBytes: file.size }))
    await axios.put(target.uploadUrl, file, {
        headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': file.type || 'application/octet-stream' }
    })
    return { url: target.evidenceUrl, sizeBytes: file.size }
}
