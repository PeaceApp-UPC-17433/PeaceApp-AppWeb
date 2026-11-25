<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import AuthBrand from './AuthBrand.vue'
const slides = ['report', 'map', 'community']
const active = ref(0)
const paused = ref(false)
const hovering = ref(false)
const focused = ref(false)
const reducedMotion = ref(false)
let timer
let motion
const onMotion = () => { reducedMotion.value = motion.matches; if (motion.matches) paused.value = true }
function select(index) { active.value = index; paused.value = true }
onMounted(() => {
  motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  onMotion()
  motion.addEventListener('change', onMotion)
  timer = window.setInterval(() => {
    if (!paused.value && !reducedMotion.value && !hovering.value && !focused.value && !document.hidden && window.matchMedia('(min-width: 1024px)').matches) active.value = (active.value + 1) % slides.length
  }, 6500)
})
onUnmounted(() => { window.clearInterval(timer); motion?.removeEventListener('change', onMotion) })
</script>
<template>
  <section class="benefits" :aria-label="$t('auth.carousel.label')" aria-roledescription="carousel" @mouseenter="hovering = true" @mouseleave="hovering = false" @focusin="focused = true" @focusout="focused = false">
    <AuthBrand />
    <div class="slides" :aria-live="paused ? 'polite' : 'off'">
      <article v-for="(slide, index) in slides" :key="slide" class="slide" :class="{ active: active === index }" :aria-hidden="active !== index" aria-roledescription="slide" :aria-label="`${index + 1} / 3`">
        <div class="art"><img :src="`/images/auth/${slide}.webp`" alt="" width="1536" height="1024" :fetchpriority="index === 0 ? 'high' : 'auto'" /></div>
        <div class="copy">
          <p class="eyebrow">{{ $t('auth.carousel.eyebrow') }}</p>
          <h2>{{ $t(`auth.carousel.${slide}.title`) }}<br /><span>{{ $t(`auth.carousel.${slide}.accent`) }}</span></h2>
          <p class="description">{{ $t(`auth.carousel.${slide}.description`) }}</p>
        </div>
      </article>
    </div>
    <div class="controls" role="group" :aria-label="$t('auth.carousel.controls')">
      <button v-for="(slide, index) in slides" :key="slide" type="button" class="selector" :aria-label="$t(`auth.carousel.${slide}.title`)" :aria-current="active === index ? 'true' : undefined" @click="select(index)"><span /></button>
    </div>
  </section>
</template>
<style scoped>
.benefits { background: #eef6fa; border: 1px solid #e0edf4; border-radius: 22px; padding: clamp(24px, 4vh, 44px) clamp(24px, 3.3vw, 56px) 20px; height: 100%; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; }
.slides { display: grid; min-height: 0; }
.slide { grid-area: 1 / 1; display: grid; grid-template-rows: minmax(0, 1fr) auto; min-height: 0; opacity: 0; visibility: hidden; transform: translateX(8px); transition: opacity 450ms ease, transform 450ms ease, visibility 450ms; text-align: center; }
.slide.active { opacity: 1; visibility: visible; transform: none; }
.art { min-height: 0; display: grid; place-items: center; padding: 14px 0; }
.art img { width: 100%; height: 100%; min-height: 0; max-height: 420px; object-fit: contain; }
.copy { padding-bottom: 18px; }
.eyebrow { color: var(--brand-700); font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; margin-bottom: 16px; }
h2 { color: var(--brand-900); font-size: clamp(30px, 3.1vw, 46px); line-height: 1.12; font-weight: 650; letter-spacing: -.045em; }
h2 span { color: var(--brand-600); }
.description { max-width: 355px; margin: 18px auto 0; color: #526b7a; font-size: 14px; line-height: 1.75; }
.controls { display: flex; justify-content: center; align-items: center; }
.controls button { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 0; background: transparent; cursor: pointer; color: var(--brand-700); border-radius: 8px; }
.selector span { width: 16px; height: 5px; background: #b7cedb; border-radius: 9px; transition: width 200ms, background 200ms; }
.selector[aria-current] span { width: 32px; background: var(--brand-600); }
@media (max-height: 760px) { .benefits { padding-block: 24px 12px; } h2 { font-size: 32px; } .eyebrow { margin-bottom: 10px; } .description { margin-top: 12px; } .copy { padding-bottom: 6px; } }
@media (prefers-reduced-motion: reduce) { .slide, .selector span { transition: none; transform: none; } }
</style>
