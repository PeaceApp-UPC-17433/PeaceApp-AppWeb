import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useCountUp } from '../useCountUp.js'

const setReducedMotion = (reduced) => {
  window.matchMedia = vi.fn(() => ({ matches: reduced }))
}

// requestAnimationFrame controlado: cada llamada a `tick(ms)` avanza el reloj y ejecuta el cuadro pendiente.
let frame = null
let clock = 0
const tick = (ms) => {
  clock += ms
  const cb = frame
  frame = null
  cb?.(clock)
}

beforeEach(() => {
  clock = 0
  frame = null
  vi.stubGlobal('requestAnimationFrame', (cb) => { frame = cb; return 1 })
  vi.stubGlobal('cancelAnimationFrame', () => { frame = null })
  vi.spyOn(performance, 'now').mockImplementation(() => clock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('el numero sube hasta el valor final y se detiene', () => {
  setReducedMotion(false)
  const { shown, to } = useCountUp(400)
  to(100)
  expect(shown.value).toBe(0)
  tick(200)
  expect(shown.value).toBeGreaterThan(50) // decelera: a mitad de tiempo ya paso la mitad
  expect(shown.value).toBeLessThan(100)
  tick(250)
  expect(shown.value).toBe(100)
  expect(frame).toBeNull() // al llegar no pide mas cuadros
})

test('parte desde el valor que ya se mostraba, no desde cero', () => {
  setReducedMotion(false)
  const { shown, to } = useCountUp(400)
  to(50)
  tick(500)
  expect(shown.value).toBe(50)
  to(80)
  tick(100)
  expect(shown.value).toBeGreaterThan(50)
  tick(400)
  expect(shown.value).toBe(80)
})

test('un nuevo destino cancela la animacion anterior', () => {
  setReducedMotion(false)
  const { shown, to } = useCountUp(400)
  to(100)
  tick(100)
  to(10)
  tick(500)
  expect(shown.value).toBe(10)
})

test('sin movimiento el valor cambia al instante', () => {
  setReducedMotion(true)
  const { shown, to } = useCountUp(400)
  to(77)
  expect(shown.value).toBe(77)
  expect(frame).toBeNull()
})

test('stop detiene la animacion en curso', () => {
  setReducedMotion(false)
  const { shown, to, stop } = useCountUp(400)
  to(100)
  tick(100)
  const partial = shown.value
  stop()
  tick(500)
  expect(shown.value).toBe(partial)
})
