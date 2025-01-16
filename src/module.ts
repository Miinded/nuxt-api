import { defineNuxtModule } from '@nuxt/kit';
import type { MiindedApiModuleOptions } from './types';

// Module options TypeScript interface definition

export default defineNuxtModule<MiindedApiModuleOptions>({
  meta: {
    name: 'miinded-api',
    configKey: 'miindedApi',
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  setup(_options, _nuxt) {
    // const resolver = createResolver(import.meta.url);
    _nuxt.options.runtimeConfig.public.BACKEND_URI = process.env.MIINDED_API_BACKEND_URI || _options.backendUri;
  },
});
