import { vi } from 'vitest';

// Remplace l'import virtuel `#imports` de Nuxt dans les tests unitaires (cf. vitest.config.ts)
export const runtimeConfig = { public: { BACKEND_URI: 'https://api.example.test', miindedApi: { enableLogs: false } } };
export const useRuntimeConfig = vi.fn(() => runtimeConfig);
