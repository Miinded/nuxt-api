import { addImportsDir, createResolver, defineNuxtModule } from '@nuxt/kit';

export type ModuleOptions = object;

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'miinded-api',
    configKey: 'miindedApi',
  },
  setup(_options, _nuxt) {
    const resolver = createResolver(import.meta.url);
    addImportsDir(resolver.resolve('./runtime/composables'));
  },
});
