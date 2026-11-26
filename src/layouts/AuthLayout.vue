<script setup>
import { ref } from 'vue'
import LanguageSwitch from '@/components/ui/LanguageSwitch.vue'
import LegalDialog from '@/components/ui/LegalDialog.vue'
import AuthBrand from '@/components/auth/AuthBrand.vue'
import AuthCarousel from '@/components/auth/AuthCarousel.vue'
const legal = ref(null)
</script>
<template>
  <div class="auth">
    <aside class="hero"><AuthCarousel /></aside>
    <main class="panel">
      <header class="panel-top"><div class="mobile-brand"><AuthBrand /></div><LanguageSwitch /></header>
      <div class="panel-inner">
        <RouterView v-slot="{ Component, route }">
          <Transition name="auth-view" mode="out-in"><component :is="Component" :key="route.path" /></Transition>
        </RouterView>
      </div>
      <footer class="links">
        <button type="button" @click="legal = 'faq'">{{ $t('footer.questions') }}</button>
        <span aria-hidden="true">·</span>
        <button type="button" @click="legal = 'terms'">{{ $t('footer.terms') }}</button>
      </footer>
    </main>
    <LegalDialog :model-value="!!legal" :kind="legal || 'faq'" @update:model-value="legal = null" />
  </div>
</template>
<style scoped>
.auth { --field-h: 50px; --stack-gap: 18px; height: 100dvh; overflow: hidden; display: grid; grid-template-columns: minmax(0, 1.04fr) minmax(0, .96fr); gap: 20px; padding: 20px; background: #fff; }
.hero { height: 100%; min-height: 0; }
.panel { min-width: 0; min-height: 0; display: flex; flex-direction: column; padding: 8px clamp(24px, 4.5vw, 76px) 12px; }
.panel-top { display: flex; justify-content: flex-end; min-height: 44px; align-items: center; }
.mobile-brand { display: none; }
.panel-inner { width: 100%; max-width: 460px; margin: auto; padding-block: 8px; }
.panel-inner :deep(.eyebrow) { color: var(--brand-600); font-size: 10px; letter-spacing: .16em; text-transform: uppercase; font-weight: 700; margin-bottom: 14px; }
.panel-inner :deep(h1) { color: var(--brand-900); font-size: clamp(29px, 2.6vw, 38px); line-height: 1.15; letter-spacing: -.045em; font-weight: 650; }
.panel-inner :deep(.auth-heading) { margin-bottom: 28px; }
.panel-inner :deep(.auth-heading .muted) { margin-top: 12px; font-size: 14px; line-height: 1.7; }
.panel-inner :deep(.field) { gap: 9px; }
.panel-inner :deep(.field label) { font-size: 13px; font-weight: 600; }
.panel-inner :deep(.input) { min-height: var(--field-h); padding: 12px 14px; border-radius: 9px; font-size: 14px; }
.panel-inner :deep(.input::placeholder) { color: #81909d; }
.panel-inner :deep(.form-grid) { gap: var(--stack-gap) 14px; }
.panel-inner :deep(.stack) { gap: var(--stack-gap); }
.panel-inner :deep(.btn-block) { min-height: var(--field-h); font-size: 14px; border-radius: 9px; background: var(--brand-700); }
.panel-inner :deep(.btn-block:hover:not(:disabled)) { background: var(--brand-900); }
.panel-inner :deep(.btn-block:disabled) { background: var(--brand-700); opacity: .45; }
.panel-inner :deep(.alt-link) { margin-top: 26px; text-align: center; font-size: 13px; }
.panel-inner :deep(.alt-link a) { font-weight: 650; margin-left: 4px; }
.panel-inner :deep(.card) { border: 0; box-shadow: none; border-radius: 0; padding: 0; background: transparent; }
.panel-top :deep(.lang) { background: #f0f5f8; }
.panel-top :deep(.lang button) { color: #587080; min-width: 40px; min-height: 36px; }
.panel-top :deep(.lang button.on) { color: var(--brand-900); box-shadow: 0 1px 4px #123e5710; }
.links { display: flex; gap: 14px; align-items: center; justify-content: center; color: #9aabb5; flex-wrap: wrap; }
.links button { border: 0; background: none; padding: 8px 0; color: #5f7081; font: inherit; font-size: 12px; cursor: pointer; }
.links button:hover { color: var(--brand-700); text-decoration: underline; }
@media (max-width: 1023px) { .auth { display: block; padding: 0; } .hero { display: none; } .panel { min-height: 100dvh; padding: 24px; } .panel-top { justify-content: space-between; gap: 12px; } .mobile-brand { display: block; } .panel-inner { padding-block: 48px; } }
@media (max-width: 380px) { .panel { padding: 20px; } .mobile-brand :deep(.auth-brand) { font-size: 24px; gap: 6px; } .mobile-brand :deep(img) { width: 34px; height: 34px; } }
@media (min-width: 1024px) and (max-height: 860px) { .auth { --field-h: 44px; --stack-gap: 12px; padding: 14px; } .panel-inner :deep(.auth-heading), .panel-inner :deep(.login-heading) { margin-bottom: 18px; } .panel-inner :deep(.eyebrow) { margin-bottom: 8px; } .panel-inner :deep(.login-submit) { min-height: 44px; } }
@media (min-width: 1024px) and (max-height: 760px) { .panel-inner :deep(.eyebrow), .panel-inner :deep(.auth-heading .muted), .panel-inner :deep(.login-heading .muted) { display: none; } .panel-inner :deep(h1) { font-size: 26px; } .panel-top { min-height: 36px; } }
@media (max-width: 1023px) { .auth { height: auto; min-height: 100dvh; overflow: visible; } }
.auth-view-enter-active { transition: opacity var(--dur-base) var(--ease), transform var(--dur-base) var(--ease); }
.auth-view-leave-active { transition: opacity var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease); }
.auth-view-enter-from { opacity: 0; transform: translateY(12px); }
.auth-view-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
