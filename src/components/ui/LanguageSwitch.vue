<script setup>
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const options = [{ code: 'es', label: 'ES' }, { code: 'en', label: 'EN' }]

function change(code) {
  locale.value = code
  localStorage.setItem('language', code)
  document.documentElement.lang = code
}
</script>

<template>
  <div class="lang" role="group" :aria-label="$t('common.language')">
    <button v-for="o in options" :key="o.code" :class="{ on: locale === o.code }" @click="change(o.code)">{{ o.label }}</button>
  </div>
</template>

<style scoped>
.lang { display: inline-flex; background: rgba(255, 255, 255, 0.16); border-radius: 8px; padding: 2px; }
.lang button { background: transparent; border: none; color: #fff; font-weight: 700; font-size: 0.78rem; padding: 4px 9px; border-radius: 6px; cursor: pointer; width: auto; height: auto; margin: 0; }
.lang button.on { background: #fff; color: var(--brand-700); }
</style>
