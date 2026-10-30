<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { session } from '@/stores/session.js'
import { badges } from '@/stores/badges.js'
import { startLocationSync, stopLocationSync } from '@/composables/useUserLocation.js'
import LanguageSwitch from '@/components/ui/LanguageSwitch.vue'
import LegalDialog from '@/components/ui/LegalDialog.vue'
import logo from '@/assets/PeaceApp.png'

const router = useRouter()
const legal = ref(null)
const menuOpen = ref(false)

const links = computed(() => [
  { to: '/map', icon: 'pi-map', label: 'nav.map' },
  { to: '/reports', icon: 'pi-file', label: 'nav.reports' },
  { to: '/alerts', icon: 'pi-exclamation-triangle', label: 'nav.alerts', badge: badges.state.alerts },
  { to: '/notifications', icon: 'pi-bell', label: 'nav.notifications', badge: badges.state.notifications },
  { to: '/contacts', icon: 'pi-users', label: 'nav.contacts' },
  ...(session.state.isAdmin ? [{ to: '/admin', icon: 'pi-shield', label: 'nav.admin' }] : [])
])

function logout() {
  session.logout()
  router.replace({ name: 'login' })
}

const onDocClick = () => (menuOpen.value = false)

onMounted(() => {
  badges.start()
  startLocationSync()
  document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  badges.stop()
  stopLocationSync()
  document.removeEventListener('click', onDocClick)
})
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <RouterLink to="/map" class="brand"><img :src="logo" alt="PeaceApp" /></RouterLink>

      <nav class="nav" :aria-label="$t('nav.main')">
        <RouterLink v-for="l in links" :key="l.to" :to="l.to" class="nav-link">
          <i class="pi" :class="l.icon" />
          <span class="nav-label">{{ $t(l.label) }}</span>
          <span v-if="l.badge" class="counter">{{ l.badge > 99 ? '99+' : l.badge }}</span>
        </RouterLink>
      </nav>

      <div class="right">
        <LanguageSwitch />
        <div class="user" @click.stop>
          <button class="avatar-btn" :aria-label="$t('nav.account')" @click="menuOpen = !menuOpen">
            <img v-if="session.state.profile?.profile_image" :src="session.state.profile.profile_image" alt="" />
            <i v-else class="pi pi-user" />
          </button>
          <div v-if="menuOpen" class="menu">
            <p class="menu-name">{{ session.fullName.value }}</p>
            <p class="menu-mail">{{ session.state.email }}</p>
            <RouterLink to="/profile" class="menu-item" @click="menuOpen = false"><i class="pi pi-id-card" /> {{ $t('nav.profile') }}</RouterLink>
            <a href="#" class="menu-item" @click.prevent="legal = 'faq'; menuOpen = false"><i class="pi pi-question-circle" /> {{ $t('footer.questions') }}</a>
            <a href="#" class="menu-item" @click.prevent="legal = 'terms'; menuOpen = false"><i class="pi pi-book" /> {{ $t('footer.terms') }}</a>
            <a href="#" class="menu-item danger" @click.prevent="logout"><i class="pi pi-sign-out" /> {{ $t('nav.logout') }}</a>
          </div>
        </div>
      </div>
    </header>

    <main class="content"><RouterView :key="$route.fullPath" /></main>
    <LegalDialog :model-value="!!legal" :kind="legal || 'faq'" @update:model-value="legal = null" />
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; }
.topbar { position: sticky; top: 0; z-index: 1000; height: var(--topbar-h); background: var(--brand-700); color: #fff; display: flex; align-items: center; gap: 18px; padding: 0 20px; box-shadow: 0 2px 10px rgba(18, 62, 87, 0.25); }
.brand img { height: 44px; display: block; }
.nav { display: flex; gap: 2px; flex: 1; }
.nav-link { position: relative; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; color: rgba(255, 255, 255, 0.85); font-weight: 600; font-size: 0.92rem; text-decoration: none; }
.nav-link:hover { background: rgba(255, 255, 255, 0.12); text-decoration: none; }
.nav-link.router-link-active { background: rgba(255, 255, 255, 0.2); color: #fff; }
.nav-link .counter { position: absolute; top: 0; right: 0; }
.right { display: flex; align-items: center; gap: 14px; }
.user { position: relative; }
.avatar-btn { width: 40px; height: 40px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.7); background: var(--brand-600); color: #fff; cursor: pointer; overflow: hidden; display: grid; place-items: center; padding: 0; margin: 0; }
.avatar-btn img { width: 100%; height: 100%; object-fit: cover; }
.menu { position: absolute; right: 0; top: 50px; width: 250px; background: #fff; color: var(--text); border-radius: 12px; box-shadow: var(--shadow-lg); padding: 8px; }
.menu-name { font-weight: 700; padding: 6px 10px 0; }
.menu-mail { color: var(--text-muted); font-size: 0.82rem; padding: 0 10px 8px; border-bottom: 1px solid var(--border); margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; }
.menu-item { display: flex; gap: 10px; align-items: center; padding: 9px 10px; border-radius: 8px; color: var(--text); font-size: 0.92rem; text-decoration: none; }
.menu-item:hover { background: var(--brand-50); text-decoration: none; }
.menu-item.danger { color: var(--danger); }

@media (max-width: 860px) {
  .topbar { padding: 0 12px; gap: 8px; }
  .brand img { height: 36px; }
  /* La navegación pasa a una barra inferior fija, como en una app móvil. */
  .nav { position: fixed; left: 0; right: 0; bottom: 0; background: var(--brand-700); justify-content: space-around; padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); box-shadow: 0 -2px 10px rgba(18, 62, 87, 0.25); flex: none; }
  .nav-link { flex-direction: column; gap: 2px; font-size: 0.68rem; padding: 4px 8px; }
  .nav-link i { font-size: 1.15rem; }
  .nav-link .counter { top: -2px; right: 2px; }
  .right { margin-left: auto; }
  .content { padding-bottom: 70px; }
}
</style>
