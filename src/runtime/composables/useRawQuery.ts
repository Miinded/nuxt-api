import { computed, onMounted, ref, toValue, watch, type ComputedRef, type Ref } from 'vue';
import axios, { type AxiosHeaders } from 'axios';
import { storeToRefs } from 'pinia';
import type { UseRawQueryOptions, UseRawQueryOptionsKeys, UseRawQueryReturn } from '../types/api-cache.type';
import { USE_RAW_QUERY_ERROR_REFRESH_MAX } from '../types/api-cache.type';
import { apiCacheStore } from '../stores/api-cache.store';

export const useRawQuery = <T>(_options: UseRawQueryOptions<T>): UseRawQueryReturn<T> => {
  const options: UseRawQueryOptions<T> = { fetchOnMount: true, minDelay: 0, headers: {}, cacheDuration: undefined, ..._options };
  const headers = computed(() => ({
    ...toValue(options.authToken),
    ...(options.headers ?? {}),
  }));

  const isMounted = ref(false);
  const error: Ref<string | null> = ref(null);
  const statusCode: Ref<number | null> = ref(null); // Ajouter une ref pour le code d'état HTTP

  const cache = apiCacheStore();
  const { refCache } = storeToRefs(cache);

  let errorCounts = 0;

  // on connect le cache au data pour garder la réactivé
  const data: ComputedRef<T | undefined> = computed(() => {
    // si le cache est invalid on retourne les données initial
    if (!cache.exist(options.key)) {
      return options.initialValue;
    }
    return toValue(refCache)[cache.buildKey(options.key)].data as T;
  });

  const isLoading: ComputedRef<boolean> = computed(() => {
    if (!cache.exist(options.key)) {
      return options.fetchOnMount || false;
    }
    return toValue(refCache)[cache.buildKey(options.key)].state === 'loading';
  });

  const isError: ComputedRef<boolean> = computed(() => {
    if (!cache.exist(options.key)) {
      return false;
    }
    return toValue(refCache)[cache.buildKey(options.key)].state === 'error';
  });

  const isInvalid: ComputedRef<boolean> = computed(() => {
    return cache.isValid(options.key);
  });

  const send = async (): Promise<T | undefined> => {
    statusCode.value = null;

    // on réup le cache actuel avec les valeur actuel
    cache.update(options.key, toValue(data), 'loading', options.cacheDuration);

    const startTime = Date.now();

    try {
      const result = await axios(toValue(options.url), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...toValue(headers),
        } as unknown as AxiosHeaders,
      });

      if (options.minDelay && options.minDelay > 0) {
        const remainingTime = options.minDelay - (Date.now() - startTime);
        if (remainingTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }
      }

      // on met à jour le cache
      cache.update(options.key, result.data, 'idle', options.cacheDuration);
      errorCounts = 0;
    } catch (err: any) {
      console.error(err);
      if (options.onErrorCallback) {
        if (errorCounts < USE_RAW_QUERY_ERROR_REFRESH_MAX) {
          errorCounts++;
          const action = await options.onErrorCallback(err);

          switch (action) {
            case 'REFRESH':
              await send();
              return;
            case 'CANCEL':
              return;
            case 'NOTHING':
              break;
          }
        } else {
          console.error(`Max error refresh call: ${errorCounts}/${USE_RAW_QUERY_ERROR_REFRESH_MAX}`);
        }
      }

      // Gérer les erreurs HTTP et extraire le statusCode
      if (err.response) {
        statusCode.value = err.response.status;
        error.value = err.response.statusText || 'Une erreur est survenue';
      } else {
        error.value = err.message || 'Une erreur inconnue est survenue';
      }

      cache.update(options.key, toValue(data), 'error');
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
    if (cache.isValid(options.key)) {
      return;
    }
    // si le cache est invalide et que le fetchOnMount est true on refetch
    await send();

    isMounted.value = true;
  });

  watch([() => options.url, isInvalid], async () => {
    // si le cache est valid on fait rien
    if (cache.isValid(options.key) || cache.isDeleted(options.key) || !toValue(isMounted)) {
      return;
    }
    // si le cache est invalide et que le fetchOnMount est true on refetch
    await send();
  });

  const setOptions = (_options: Partial<UseRawQueryOptions<T>>) => {
    for (const key in _options) {
      (options[key as unknown as UseRawQueryOptionsKeys<T>] as unknown) = _options[key as UseRawQueryOptionsKeys<T>];
    }
  };

  return {
    isLoading,
    isError,
    refetch: send,
    data,
    cache,
    setOptions,
  };
};
