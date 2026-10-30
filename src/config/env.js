// Toda la configuración de entorno pasa por aquí (variables VITE_* con valores por defecto de desarrollo).
export const env = {
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
    mapboxToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '',
    cloudinaryCloud: import.meta.env.VITE_CLOUDINARY_CLOUD || 'dynfr1idx',
    cloudinaryPreset: import.meta.env.VITE_CLOUDINARY_PRESET || 'peaceapppresset',
    landingUrl: import.meta.env.VITE_LANDING_URL || 'https://peaceapp-landing-page.netlify.app',
    // Cada cuánto se refrescan los contadores de no leídos y se reenvía la ubicación (ms).
    badgePollMs: 60_000,
    locationPushMs: 5 * 60_000
}
