const runtime = typeof window !== 'undefined' ? window.__PEACEAPP_CONFIG__ || {} : {}
const pick = (key, fallback) => runtime[key] || import.meta.env[`VITE_${key}`] || fallback

export const env = {
    mode: import.meta.env.MODE,
    apiUrl: pick('API_URL', '/api/v1'),
    mapboxToken: pick('MAPBOX_ACCESS_TOKEN', ''),
    cloudinaryCloud: pick('CLOUDINARY_CLOUD', 'dynfr1idx'),
    cloudinaryPreset: pick('CLOUDINARY_PRESET', 'peaceapppresset'),
    landingUrl: pick('LANDING_URL', 'https://peaceapp-landing-page.netlify.app'),
    badgePollMs: 60_000,
    locationPushMs: 5 * 60_000
}
