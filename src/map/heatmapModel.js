// Modelo puro del mapa de calor: sin Vue ni Mapbox, solo datos y reglas.
// La vista (MapView.vue) es el adaptador que lo dibuja; aqui vive lo que se puede probar solo.

// Paleta continua de frio a calido (azul -> verde -> amarillo -> naranja -> rojo oscuro).
// Se lee sin depender solo del color: la leyenda muestra "Bajo" y "Alto" con texto.
export const HEAT_STOPS = [
  [0, 'rgba(59, 130, 246, 0)'],
  [0.12, 'rgba(59, 130, 246, 0.45)'],
  [0.3, '#22c55e'],
  [0.5, '#facc15'],
  [0.7, '#f97316'],
  [0.88, '#ef4444'],
  [1, '#991b1b']
]

export const HEAT_LEGEND_GRADIENT = `linear-gradient(90deg, ${HEAT_STOPS.slice(1).map(([at, c]) => `${c} ${Math.round(at * 100)}%`).join(', ')})`

export const heatColorExpression = () => ['interpolate', ['linear'], ['heatmap-density'], ...HEAT_STOPS.flat()]

// Mientras mas cerca esta el zoom, mas fina es la cuadricula. El backend impone un minimo de 0.001 grados.
export function cellSizeForZoom(zoom) {
  const size = 0.25 / Math.pow(2, zoom - 6)
  return Math.min(0.25, Math.max(0.001, Number(size.toFixed(4))))
}

// Peso de una celda segun su cantidad de reportes. Calibrado para que se lea como una escala de riesgo:
// 1-2 reportes -> azul, ~5 -> verde/amarillo, ~10 -> naranja, 20 o mas -> rojo.
export const heatWeightExpression = () => ['interpolate', ['linear'], ['get', 'count'], 1, 0.3, 5, 0.8, 10, 1.4, 20, 2.2, 40, 3]

// El radio crece con el zoom para que las celdas vecinas se fundan en una sola superficie continua.
export const heatRadiusExpression = () => ['interpolate', ['linear'], ['zoom'], 9, 20, 12, 44, 14, 76, 16, 130]

export const heatIntensityExpression = () => ['interpolate', ['linear'], ['zoom'], 9, 0.7, 13, 1.25, 16, 2]

export function toFeatureCollection(cells) {
  return {
    type: 'FeatureCollection',
    features: cells.map((c) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
      properties: { count: c.count, risk: c.riskLevel }
    }))
  }
}

export const totalOf = (cells) => cells.reduce((sum, c) => sum + c.count, 0)

export function hottestOf(cells) {
  return cells.reduce((best, c) => (!best || c.count > best.count ? c : best), null)
}

// Opacidad de la capa: aparece con fundido y luego "respira" muy poco, para que la zona caliente se sienta viva.
export function heatOpacity(fade, elapsedMs, reduceMotion) {
  if (reduceMotion) return 0.92 * fade
  return fade * (0.9 + 0.05 * Math.sin((elapsedMs / 5000) * Math.PI * 2))
}

export const easeOutCubic = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3)
