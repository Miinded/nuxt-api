import { addImportsDir, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit';
import pkg from '../package.json';
import fs from 'fs';
import path from 'path';

export type ModuleOptions = object;

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'miinded-api',
    configKey: 'miindedApi',
    compatibility: {
      nuxt: '>=3',
      bridge: false,
    },
  },
  setup(_options: any, nuxt: any) {
    const resolver = createResolver(import.meta.url);

    // nuxt.hook('prepare:types', ({ references }: any) => {
    //   references.push({ path: resolver.resolve('./runtime/types.d.ts') });
    //   references.push({ path: resolver.resolve('./runtime/types/cache.ts') });
    // });

    const copyFiles = (file: string, folder: string, finalName: string) => {
      // Spécifier le chemin du fichier source dans le module
      const sourceFilePath = path.resolve(__dirname, '../src/runtime', file);
      const targetDir = path.resolve(nuxt.options.srcDir, folder); // Par exemple dans le répertoire 'static'
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.copyFileSync(sourceFilePath, path.resolve(targetDir, finalName));
    };
    copyFiles('stores/api-cache.store.ts', 'stores', 'api-cache.store.ts');
    copyFiles('composables/useMutation.ts', 'composables', 'useMutation.ts');
    copyFiles('composables/useQuery.ts', 'composables', 'useQuery.ts');
    copyFiles('composables/useQueryCache.ts', 'composables', 'useQueryCache.ts');
    copyFiles('types/api-cache.ts', 'types', 'api-cache.ts');

    // nuxt.hook('prepare:store', (store: any) => {
    //   // Charger dynamiquement le store à partir du fichier
    //   store.apiCacheStore = require(resolver.resolve('./stores/api-cache.store')).apiCacheStore;
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
