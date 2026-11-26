<script setup>
import { computed } from 'vue'
import { PASSWORD_RULES } from '@/config/password.js'

const props = defineProps({ value: { type: String, default: '' } })

const results = computed(() => PASSWORD_RULES.map((rule) => ({ key: rule.key, ok: rule.test(props.value) })))
const score = computed(() => results.value.filter((r) => r.ok).length)
const level = computed(() => (props.value ? ['weak', 'weak', 'fair', 'good', 'strong'][score.value] : 'idle'))
</script>

<template>
  <div class="rules" :data-level="level">
    <div class="meter-row">
      <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="4" :aria-valuenow="score" :aria-label="$t('auth.strength.label')">
        <span v-for="n in 4" :key="n" :class="{ on: n <= score }" />
      </div>
      <p class="level" aria-live="polite">{{ $t(`auth.strength.${level}`) }}</p>
    </div>
    <ul>
      <li v-for="r in results" :key="r.key" :class="{ ok: r.ok }">
        <span class="tick" aria-hidden="true"><i aria-hidden="true" class="pi pi-check" /></span>
        <span>{{ $t(`auth.rules.${r.key}`) }}</span>
        <span class="sr-only">{{ r.ok ? $t('auth.rules.met') : $t('auth.rules.pending') }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.rules { --bar: #c3d0da; display: grid; gap: 10px; }
.rules[data-level='weak'] { --bar: var(--danger); }
.rules[data-level='fair'] { --bar: var(--warning); }
.rules[data-level='good'] { --bar: var(--brand-600); }
.rules[data-level='strong'] { --bar: var(--success); }
.meter-row { display: flex; align-items: center; gap: 12px; }
.meter { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
.meter span { height: 5px; border-radius: 3px; background: #e6edf2; position: relative; overflow: hidden; }
.meter span::after {
  content: ''; position: absolute; inset: 0; background: var(--bar); border-radius: inherit;
  transform: scaleX(0); transform-origin: left;
  transition: transform var(--dur-base) var(--ease), background-color var(--dur-base) var(--ease);
}
.meter span.on::after { transform: scaleX(1); }
.level { min-width: 92px; text-align: right; font-size: 12px; font-weight: 650; color: var(--text-muted); transition: color var(--dur-base) var(--ease); }
ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
li { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-muted); transition: color var(--dur-base) var(--ease); }
li.ok { color: var(--text); }
.tick {
  width: 18px; height: 18px; flex: none; border-radius: 50%; display: grid; place-items: center;
  border: 1.5px solid #c3d0da; background: transparent; color: #fff;
  transition: background-color var(--dur-base) var(--ease), border-color var(--dur-base) var(--ease);
}
.tick i { font-size: 9px; font-weight: 700; transform: scale(0); transition: transform var(--dur-base) var(--ease-pop); }
li.ok .tick { background: var(--success); border-color: var(--success); }
li.ok .tick i { transform: scale(1); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
