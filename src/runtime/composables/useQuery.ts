import { computed, onMounted, ref, toValue, watch, type ComputedRef, type Ref } from 'vue';
import type { RuntimeConfig, PublicRuntimeConfig } from 'nuxt/schema';
import axios from 'axios';
import { apiCacheStore } from '../stores/api-cache.store';
import { storeToRefs } from 'pinia';
import { useRuntimeConfig } from '#imports';
import type { UseQueryOptions } from '../types/api-cache';

export const useQuery = <T>(options: UseQueryOptions<T>) => {
  options = { fetchOnMount: true, minDelay: 0, headers: {}, cacheDuration: 0, ...options };

  const isMounted = ref(false);
  const error: Ref<string | null> = ref(null);
  const statusCode: Ref<number | null> = ref(null); // Ajouter une ref pour le code d'état HTTP

  const apiCache = apiCacheStore();
  const { refCache } = storeToRefs(apiCache);

  const config = useRuntimeConfig() as RuntimeConfig & { public: PublicRuntimeConfig };
  const url = computed(() => (toValue(options.url).match(/http?/) ? toValue(options.url) : config.public.BACKEND_URI + toValue(options.url)));

  // on connect le cache au data pour garder la réactivé
  const data: ComputedRef<T | undefined> = computed(() => {
    // si le cache est invalid on retourne les données initial
    if (!apiCache.exist(options.key)) {
      return options.initialValue;
    }
    return toValue(refCache)[apiCache.buildKey(options.key)].data as T;
  });

  const isLoading: ComputedRef<boolean> = computed(() => {
    if (!apiCache.exist(options.key)) {
      return options.fetchOnMount ?? false;
    }
    return toValue(refCache)[apiCache.buildKey(options.key)].state === 'loading';
  });

  const isError: ComputedRef<boolean> = computed(() => {
    if (!apiCache.exist(options.key)) {
      return false;
    }
    return toValue(refCache)[apiCache.buildKey(options.key)].state === 'error';
  });

  const isInvalid: ComputedRef<boolean> = computed(() => {
    return apiCache.isValid(options.key);
  });

  const send = async (): Promise<T | undefined> => {
    statusCode.value = null;

    // on réup le cache actuel avec les valeur actuel
    apiCache.update(options.key, toValue(data), 'loading', options.cacheDuration);

    const startTime = Date.now();

    try {
      const result = await axios(toValue(url), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (options.minDelay && options.minDelay > 0) {
        const remainingTime = options.minDelay - (Date.now() - startTime);
        if (remainingTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }
      }

      // on met à jour le cache
      apiCache.update(options.key, result.data, 'idle', options.cacheDuration);
    } catch (err: any) {
      console.error(err);
      // Gérer les erreurs HTTP et extraire le statusCode
      if (err.response) {
        statusCode.value = err.response.status;
        error.value = err.response.statusText || 'Une erreur est survenue';
      } else {
        error.value = err.message || 'Une erreur inconnue est survenue';
      }

      apiCache.update(options.key, toValue(data), 'error');
    }

    return toValue(data);
  };

  onMounted(async () => {
    // si le fetchOnMount est false on fait rien on récupère juste le cache
    if (!options.fetchOnMount) {
      isMounted.value = true;
      return;
    }
    // si le cache est valid on fait rien
    if (apiCache.isValid(options.key)) {
      return;
    }
    // si le cache est invalide et que le fetchOnMount est true on refetch
    await send();

    isMounted.value = true;
  });

  watch([url, isInvalid], async () => {
    // si le cache est valid on fait rien
    if (apiCache.isValid(options.key) || apiCache.isDeleted(options.key) || !toValue(isMounted)) {
      return;
    }
    // si le cache est invalide et que le fetchOnMount est true on refetch
    await send();
  });

  return {
    isLoading,
    isError,
    refetch: send,
    data,
  };
};
