<script setup>
import { useToast } from '@/composables/useToast.js'
const { toasts, dismiss } = useToast()
const icons = { success: 'pi-check-circle', error: 'pi-times-circle', info: 'pi-info-circle' }
</script>

<template>
  <div class="toast-host" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type" role="status">
        <i class="pi" :class="icons[t.type]" />
        <span>{{ t.message }}</span>
        <button class="icon-btn" :aria-label="$t('common.close')" @click="dismiss(t.id)"><i class="pi pi-times" /></button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host { position: fixed; right: 16px; bottom: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 3000; max-width: min(380px, calc(100vw - 32px)); }
.toast { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px; background: #fff; box-shadow: var(--shadow-lg); border-left: 4px solid var(--brand-600); font-size: 0.92rem; }
.toast.success { border-color: var(--success); }
.toast.success > .pi:first-child { color: var(--success); }
.toast.error { border-color: var(--danger); }
.toast.error > .pi:first-child { color: var(--danger); }
.toast span { flex: 1; }
.toast-enter-active, .toast-leave-active { transition: all 0.25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(30px); }
</style>
