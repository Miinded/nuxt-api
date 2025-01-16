import { defineNuxtModule } from '@nuxt/kit';
export interface ModuleOptions {
  backendUri: string;
}

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    backendUri: string;
  }
}

// Module options TypeScript interface definition

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'miinded-api',
    configKey: 'miindedApi',
  },
  // Default configuration options of the Nuxt module
  defaults: {
    backendUri: '',
  },
  setup(_options, _nuxt) {
    const runtimeConfig = _nuxt.options.runtimeConfig;
    runtimeConfig.public.backendUri = process.env.MIINDED_API_BACKEND_URI || process.env.BACKEND_URI || _options.backendUri;
  },
});
