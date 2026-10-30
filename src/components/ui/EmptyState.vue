<script setup>
defineProps({ icon: { type: String, default: 'pi-inbox' }, text: String })
</script>

<template>
  <div class="empty">
    <i class="pi" :class="icon" />
    <p>{{ text }}</p>
    <slot />
  </div>
</template>
