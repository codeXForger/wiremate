import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const COVERAGE_THRESHOLD = 85

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@': resolve(__dirname, 'src/renderer/src'),
      '@monaco-editor/react': resolve(__dirname, 'src/renderer/test/monaco-mock.tsx'),
      'react-resizable-panels': resolve(__dirname, 'src/renderer/test/resizable-mock.tsx')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/renderer/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/renderer/src/**/*.{ts,tsx}', 'src/shared/**/*.ts'],
      exclude: [
        'src/renderer/src/main.tsx',
        'src/renderer/src/lib/monaco-setup.ts',
        'src/renderer/src/components/ui/**',
        'src/shared/types/**',
        '**/*.test.{ts,tsx}',
        '**/*.d.ts'
      ],
      thresholds: {
        lines: COVERAGE_THRESHOLD,
        branches: COVERAGE_THRESHOLD,
        functions: COVERAGE_THRESHOLD,
        statements: COVERAGE_THRESHOLD
      }
    }
  }
})
