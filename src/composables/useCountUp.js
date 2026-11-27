import { ref } from 'vue'
import { easeOutCubic } from '@/map/heatmapModel.js'

// Numero que sube hasta su valor final en ~400 ms (decelera al llegar). Sin movimiento si el usuario lo pidio.
export function useCountUp(duration = 400) {
  const shown = ref(0)
  let raf = 0
  const reduce = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  function to(target) {
    cancelAnimationFrame(raf)
    if (reduce() || typeof requestAnimationFrame === 'undefined') {
      shown.value = target
      return
    }
    const from = shown.value
    const start = performance.now()
    const step = (now) => {
      const p = easeOutCubic((now - start) / duration)
      shown.value = Math.round(from + (target - from) * p)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }

  const stop = () => cancelAnimationFrame(raf)
  return { shown, to, stop }
}
