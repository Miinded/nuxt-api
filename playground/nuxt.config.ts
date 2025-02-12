export default defineNuxtConfig({
  modules: ['../src/module', '@pinia/nuxt'],
  devtools: { enabled: true },
  compatibilityDate: '2025-01-16',
  runtimeConfig: {
    public: {
      BACKEND_URI: 'https://66aa4426613eced4eba83c35.mockapi.io',
    },
  },
  miindedApi: {
    enableLogs: false,
  },
});
