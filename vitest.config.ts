import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const stub = (file: string) => fileURLToPath(new URL(`./test/stubs/${file}`, import.meta.url));

export default defineConfig({
  resolve: {
    // Imports virtuels de Nuxt, indisponibles hors d'une application Nuxt
    alias: {
      '#imports': stub('imports.ts'),
      '#app': stub('app.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,js}'],
    globals: true,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/runtime/types/**'],
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      // Seuils minimaux : la CI échoue si la couverture régresse
      thresholds: { statements: 90, branches: 80, functions: 85, lines: 90 },
    },
  },
});
