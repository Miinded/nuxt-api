import { addImportsDir, addPlugin, addTypeTemplate, createResolver, defineNuxtModule } from '@nuxt/kit';
import pkg from '../package.json';

export { UseRawQueryOnErrorAction } from './runtime/types/api-cache.type';
export * from './runtime/types/api-cache.type';
export interface ModuleOptions {
  enableLogs: boolean;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'miinded-api',
    configKey: 'miindedApi',
    compatibility: {
      nuxt: '>=3',
      bridge: false,
    },
  },
  defaults: {
    enableLogs: false,
  },
  setup(options: ModuleOptions, nuxt: any) {
    const resolver = createResolver(import.meta.url);

    nuxt.options.runtimeConfig.public.miindedApi = options;

    // Ajouter le dossier des stores au projet Nuxt

    addPlugin(resolver.resolve('runtime/plugins/registerStores'));

    // Ajouter les composables au projet Nuxt
    addImportsDir(resolver.resolve('runtime/composables'));

    addTypeTemplate({
      filename: 'types/miinded-api.d.ts',
      getContents: () => `
    declare module '#imports' {
      export * from '${resolver.resolve('./runtime/composables')}';
    }
    export {};
    `,
    });

    // nuxt.hook('prepare:types', ({ references }: any) => {
    //   references.push({ path: resolver.resolve('./runtime/types.d.ts') });
    //   references.push({ path: resolver.resolve('./runtime/types/cache.ts') });
    // });

    nuxt.hook('ready', () => {
      if (nuxt.options.dev) {
        const hasPinia = nuxt.options.modules.includes('@pinia/nuxt') || nuxt.options.build.transpile.includes('pinia');
        if (!hasPinia) {
          // Affiche une erreur si Pinia n'est pas trouvé
          throw new Error(`Le module "${pkg.name}" nécessite Pinia. Assurez-vous d'installer et d'ajouter "@pinia/nuxt" dans nuxt.config.ts.`);
        }

        const backendUri = nuxt.options.runtimeConfig.public.BACKEND_URI;
        if (!backendUri) {
          throw new Error(`Le module "${pkg.name}" nécessite la configuration \`BACKEND_URI\` dans \`nuxt.config.ts\`. Exemple : \`BACKEND_URI: "https://mon-backend.nftprojects.fr"\``);
        }
      }
    });
  },
});
