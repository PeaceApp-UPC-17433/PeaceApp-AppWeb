<script setup>
import AppDialog from './AppDialog.vue'

defineProps({
  modelValue: Boolean,
  title: String,
  message: String,
  confirmLabel: String,
  danger: Boolean,
  busy: Boolean
})
const emit = defineEmits(['update:modelValue', 'confirm'])
</script>

<template>
  <AppDialog :model-value="modelValue" :title="title" width="440px" @update:model-value="emit('update:modelValue', $event)">
    <p>{{ message }}</p>
    <template #footer>
      <button class="btn btn-secondary" :disabled="busy" @click="emit('update:modelValue', false)">{{ $t('common.cancel') }}</button>
      <button class="btn" :class="{ 'btn-danger': danger }" :disabled="busy" @click="emit('confirm')">
        {{ confirmLabel || $t('common.confirm') }}
      </button>
    </template>
  </AppDialog>
</template>
