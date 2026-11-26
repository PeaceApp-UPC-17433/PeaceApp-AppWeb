<script setup>
defineProps({ icon: { type: String, default: 'pi-inbox' }, text: String })
</script>

<template>
  <div class="empty">
    <i aria-hidden="true" class="pi" :class="icon" />
    <p>{{ text }}</p>
    <slot />
  </div>
</template>
