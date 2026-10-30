<script setup>
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  title: String,
  width: { type: String, default: '520px' }
})
const emit = defineEmits(['update:modelValue'])
const close = () => emit('update:modelValue', false)
const onKey = (e) => e.key === 'Escape' && close()

watch(() => props.modelValue, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  open ? window.addEventListener('keydown', onKey) : window.removeEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dlg">
      <div v-if="modelValue" class="overlay" @mousedown.self="close">
        <div class="dialog" role="dialog" aria-modal="true" :style="{ maxWidth: width }">
          <header class="dialog-head">
            <h2>{{ title }}</h2>
            <button class="icon-btn" :aria-label="$t('common.close')" @click="close"><i class="pi pi-times" /></button>
          </header>
          <div class="dialog-body"><slot /></div>
          <footer v-if="$slots.footer" class="dialog-foot"><slot name="footer" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(18, 38, 52, 0.55); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 2000; }
.dialog { background: #fff; border-radius: 14px; width: 100%; max-height: calc(100vh - 32px); display: flex; flex-direction: column; box-shadow: var(--shadow-lg); }
.dialog-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.dialog-body { padding: 20px; overflow-y: auto; }
.dialog-foot { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; }
.dlg-enter-active, .dlg-leave-active { transition: opacity 0.2s; }
.dlg-enter-from, .dlg-leave-to { opacity: 0; }
</style>
