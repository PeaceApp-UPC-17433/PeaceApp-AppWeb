<script setup>
import { ref } from 'vue'
import LanguageSwitch from '@/components/ui/LanguageSwitch.vue'
import LegalDialog from '@/components/ui/LegalDialog.vue'
import logo from '@/assets/PeaceApp.png'
import { env } from '@/config/env.js'

const legal = ref(null)
</script>

<template>
  <div class="auth">
    <aside class="hero">
      <div class="hero-top"><LanguageSwitch /></div>
      <div class="hero-body">
        <img :src="logo" alt="PeaceApp" class="logo" />
        <h2>{{ $t('auth.tagline') }}</h2>
        <ul>
          <li><i class="pi pi-map" /> {{ $t('auth.feature1') }}</li>
          <li><i class="pi pi-bell" /> {{ $t('auth.feature2') }}</li>
          <li><i class="pi pi-users" /> {{ $t('auth.feature3') }}</li>
        </ul>
        <a :href="env.landingUrl" class="btn btn-secondary" target="_blank" rel="noopener">{{ $t('auth.more') }}</a>
      </div>
    </aside>
    <main class="panel">
      <div class="panel-inner"><RouterView /></div>
      <footer class="links">
        <a href="#" @click.prevent="legal = 'faq'">{{ $t('footer.questions') }}</a>
        <a href="#" @click.prevent="legal = 'terms'">{{ $t('footer.terms') }}</a>
      </footer>
    </main>
    <LegalDialog :model-value="!!legal" :kind="legal || 'faq'" @update:model-value="legal = null" />
  </div>
</template>

<style scoped>
.auth { min-height: 100vh; display: grid; grid-template-columns: minmax(320px, 5fr) 6fr; }
.hero { background: linear-gradient(160deg, var(--brand-900), var(--brand-600)); color: #fff; padding: 20px 32px; display: flex; flex-direction: column; }
.hero-top { display: flex; justify-content: flex-end; }
.hero-body { margin: auto 0; display: flex; flex-direction: column; gap: 22px; align-items: flex-start; max-width: 420px; }
.hero h2 { color: #fff; font-size: 1.7rem; }
.hero ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.hero li { display: flex; gap: 12px; align-items: center; color: rgba(255, 255, 255, 0.9); }
.hero li i { background: rgba(255, 255, 255, 0.16); border-radius: 50%; padding: 9px; }
.logo { width: 200px; filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.25)); }
.panel { display: flex; flex-direction: column; padding: 24px; background: var(--bg); }
.panel-inner { margin: auto; width: 100%; max-width: 460px; }
.links { display: flex; gap: 20px; justify-content: center; font-size: 0.85rem; padding-top: 16px; }
@media (max-width: 860px) {
  .auth { grid-template-columns: 1fr; }
  .hero { padding: 14px 20px 22px; }
  .hero-body { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 12px; margin: 0; }
  .hero ul, .hero h2, .hero .btn { display: none; }
  .logo { width: 130px; }
}
</style>
