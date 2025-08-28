import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'test/**/*.test.{ts,js}'
    ],
    coverage: {
      enabled: false,
    },
    globals: true,
    reporters: ['default'],
  },
});


