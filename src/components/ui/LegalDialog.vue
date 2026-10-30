<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from './AppDialog.vue'

// Preguntas frecuentes y términos de servicio (textos en el i18n: faq.* y terms.*).
const props = defineProps({ modelValue: Boolean, kind: { type: String, default: 'faq' } })
const emit = defineEmits(['update:modelValue'])
const { t, tm, rt, locale } = useI18n()

const faq = computed(() => [1, 2, 3].map((n) => ({ q: t(`faq.q${n}`), a: t(`faq.a${n}`) })))
const sections = computed(() =>
    tm('terms.sections').map((s) => ({
      title: rt(s.title),
      content: s.content ? rt(s.content) : null,
      items: (s.items || []).map((i) => rt(i))
    }))
)
const updated = computed(() => new Date().toLocaleDateString(locale.value, { dateStyle: 'long' }))
</script>

<template>
  <AppDialog :model-value="modelValue" :title="kind === 'faq' ? $t('footer.questions') : $t('footer.terms')" width="640px" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="kind === 'faq'" class="stack">
      <div v-for="item in faq" :key="item.q">
        <h3>{{ item.q }}</h3>
        <p class="muted">{{ item.a }}</p>
      </div>
    </div>
    <div v-else class="stack">
      <section v-for="s in sections" :key="s.title">
        <h3>{{ s.title }}</h3>
        <p v-if="s.content" class="muted">{{ s.content }}</p>
        <ul v-if="s.items.length" class="muted"><li v-for="i in s.items" :key="i">{{ i }}</li></ul>
      </section>
      <p class="small muted">{{ $t('terms.lastUpdate') }}: {{ updated }}</p>
    </div>
  </AppDialog>
</template>
