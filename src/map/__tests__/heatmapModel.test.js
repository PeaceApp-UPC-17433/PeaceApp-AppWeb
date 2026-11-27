import { describe, expect, it } from 'vitest'
import {
  HEAT_LEGEND_GRADIENT, cellSizeForZoom, heatOpacity, hottestOf, toFeatureCollection, totalOf
} from '../heatmapModel.js'

const cells = [
  { latitude: -12.1, longitude: -77.0, count: 3, riskLevel: 'LOW' },
  { latitude: -12.2, longitude: -77.1, count: 12, riskLevel: 'HIGH' }
]

describe('heatmapModel', () => {
  it('la cuadricula se afina con el zoom y respeta los limites', () => {
    expect(cellSizeForZoom(6)).toBe(0.25)
    expect(cellSizeForZoom(12)).toBeLessThan(cellSizeForZoom(9))
    expect(cellSizeForZoom(22)).toBe(0.001)
    expect(cellSizeForZoom(0)).toBe(0.25)
  })

  it('convierte celdas en puntos GeoJSON con longitud primero', () => {
    const fc = toFeatureCollection(cells)
    expect(fc.features).toHaveLength(2)
    expect(fc.features[1].geometry.coordinates).toEqual([-77.1, -12.2])
    expect(fc.features[1].properties).toEqual({ count: 12, risk: 'HIGH' })
  })

  it('suma el total y encuentra el punto mas activo', () => {
    expect(totalOf(cells)).toBe(15)
    expect(hottestOf(cells).count).toBe(12)
    expect(hottestOf([])).toBeNull()
  })

  it('la opacidad aparece con el fundido y respira poco', () => {
    expect(heatOpacity(0, 1000, false)).toBe(0)
    const v = heatOpacity(1, 1250, false)
    expect(v).toBeGreaterThan(0.84)
    expect(v).toBeCloseTo(0.95, 3)
  })

  it('sin movimiento la opacidad es fija', () => {
    expect(heatOpacity(1, 100, true)).toBe(heatOpacity(1, 3000, true))
  })

  it('la leyenda es un degradado de izquierda a derecha', () => {
    expect(HEAT_LEGEND_GRADIENT.startsWith('linear-gradient(90deg')).toBe(true)
    expect(HEAT_LEGEND_GRADIENT).toContain('#991b1b 100%')
  })
})
