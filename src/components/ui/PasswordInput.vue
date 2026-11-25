<script setup>
import { ref } from 'vue'

defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, required: true },
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: 'current-password' },
  invalid: Boolean,
  required: Boolean,
  maxlength: { type: Number, default: 72 }
})
defineEmits(['update:modelValue'])

const visible = ref(false)
</script>

<template>
  <div class="password-wrap">
    <input
      :id="id"
      class="input"
      :class="{ invalid }"
      :type="visible ? 'text' : 'password'"
      :value="modelValue"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :maxlength="maxlength"
      :required="required"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <button
      type="button"
      class="toggle"
      :aria-controls="id"
      :aria-pressed="visible"
      :aria-label="$t(visible ? 'auth.hidePassword' : 'auth.showPassword')"
      @click="visible = !visible"
    >
      <Transition name="eye" mode="out-in">
        <i :key="visible" :class="visible ? 'pi pi-eye-slash' : 'pi pi-eye'" aria-hidden="true" />
      </Transition>
    </button>
  </div>
</template>

<style scoped>
.password-wrap { position: relative; }
.password-wrap .input { padding-right: 52px; }
.toggle {
  position: absolute; top: 0; right: 0; bottom: 0; width: 48px; min-height: 44px;
  display: grid; place-items: center; background: none; border: 0; border-radius: 0 9px 9px 0;
  color: #67808e; cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease);
}
.toggle:hover { color: var(--brand-700); background: var(--brand-50); }
.toggle:active { transform: scale(0.92); }
.toggle[aria-pressed='true'] { color: var(--brand-600); }
.eye-enter-active, .eye-leave-active { transition: opacity 100ms var(--ease), transform 100ms var(--ease); }
.eye-enter-from, .eye-leave-to { opacity: 0; transform: scale(0.7); }
</style>
