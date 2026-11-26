<script setup>
const mark = '/images/auth/mark.webp'
</script>
<template>
  <div class="auth-brand" aria-label="PeaceApp">
    <img :src="mark" alt="" width="42" height="42" />
    <span>Peace<span class="brand-light">App</span></span>
  </div>
</template>
<style scoped>
.auth-brand { display: flex; align-items: center; gap: 10px; color: var(--brand-900); font-size: 29px; font-weight: 750; letter-spacing: -1.2px; }
.auth-brand img { width: 42px; height: 42px; object-fit: contain; }
.brand-light { font-weight: 450; }
</style>
