/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(),  tailwindcss(),],
  server: {
    port: 5174
  },
  // @ts-ignore - test property is added by vitest
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    testTimeout: 10000, // 10 seconds timeout per test
    hookTimeout: 10000, // 10 seconds timeout for hooks
    teardownTimeout: 5000, // 5 seconds timeout for teardown
    bail: 0, // Don't bail on failures, run all tests
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        minThreads: 1,
        maxThreads: 2, // Reduced from 4 to 2 to prevent memory issues
      },
    },
    exclude: [
      'node_modules/',
      'dist/',
      'e2e/**',
      '**/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/e2e/**',
      ],
    },
  },
})
