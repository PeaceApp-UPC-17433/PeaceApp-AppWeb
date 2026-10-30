import axios from 'axios'
import { env } from '@/config/env.js'

// Subida sin firma con un upload preset público; devuelve la URL segura de la imagen.
export async function uploadImage(file) {
    const body = new FormData()
    body.append('file', file)
    body.append('upload_preset', env.cloudinaryPreset)
    const { data } = await axios.post(`https://api.cloudinary.com/v1_1/${env.cloudinaryCloud}/image/upload`, body)
    return data.secure_url
}
