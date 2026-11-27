import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/__tests__/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/api/**', 'src/stores/**', 'src/composables/**', 'src/config/**', 'src/map/**'],
      exclude: ['**/__tests__/**']
    }
  }
})
