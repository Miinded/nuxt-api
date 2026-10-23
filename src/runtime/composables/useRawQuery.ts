import { computed, onMounted, ref, toValue, watch, type ComputedRef, type Ref } from 'vue';
import axios, { type AxiosError, type AxiosHeaders } from 'axios';
import { storeToRefs } from 'pinia';
import type { UseRawQueryOptions, UseRawQueryOptionsKeys, UseRawQueryReturn } from '../types/api-cache.type';
import { USE_RAW_QUERY_ERROR_REFRESH_MAX, UseRawQueryOnErrorAction } from '../types/api-cache.type';
import { apiCacheStore } from '../stores/api-cache.store';
import { defaultRetryDelay, describeError, isServerError, sleep } from '../utils/errors';

export const useRawQuery = <T>(_options: UseRawQueryOptions<T>): UseRawQueryReturn<T> => {
  const options: UseRawQueryOptions<T> = {
    fetchOnMount: true,
    minDelay: 0,
    headers: {},
    cacheDuration: undefined,
    ..._options,
  };
  const headers = computed(() => ({
    ...toValue(options.authToken),
    ...(options.headers ?? {}),
  }));

  const isMounted = ref(false);
  const error: Ref<string | null> = ref(null);
  const statusCode: Ref<number | null> = ref(null);

  const cache = apiCacheStore();
  const { refCache } = storeToRefs(cache);

  let errorCounts = 0;
  let retryCount = 0;

  // on connect le cache au data pour garder la réactivé
  const data: ComputedRef<T | undefined> = computed(() => {
    // si le cache est invalid on retourne les données initial
    if (!cache.exist(options.key)) {
      return options.initialValue;
    }
    return toValue(refCache)[cache.buildKey(options.key)]?.data as T;
  });

  const isLoading: ComputedRef<boolean> = computed(() => {
    if (!cache.exist(options.key)) {
      return options.fetchOnMount || false;
    }
    return toValue(refCache)[cache.buildKey(options.key)]?.state === 'loading';
  });

  const isError: ComputedRef<boolean> = computed(() => {
    if (!cache.exist(options.key)) {
      return false;
    }
    return toValue(refCache)[cache.buildKey(options.key)]?.state === 'error';
  });

  const isInvalid: ComputedRef<boolean> = computed(() => {
    return cache.isValid(options.key);
  });

  const send = async (): Promise<T | undefined> => {
    statusCode.value = null;
    error.value = null;

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
          await sleep(remainingTime);
        }
      }

      // on met à jour le cache
      cache.update(options.key, result.data, 'idle', options.cacheDuration);
      errorCounts = 0;
      retryCount = 0;
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ message?: string }>;
      console.error(axiosError);

      // Erreur serveur ou réseau : relance automatique avec backoff, si activée
      if (options.retry && isServerError(axiosError) && retryCount < options.retry.max) {
        retryCount++;
        options.retry.onRetry?.(retryCount, axiosError);
        await sleep((options.retry.delay ?? defaultRetryDelay)(retryCount));
        return send();
      }

      // Callback personnalisé (pour un 401 : renouvellement du jeton, etc.)
      if (options.onErrorCallback) {
        if (errorCounts < USE_RAW_QUERY_ERROR_REFRESH_MAX) {
          errorCounts++;
          const action = await options.onErrorCallback(axiosError);

          switch (action) {
            case UseRawQueryOnErrorAction.REFRESH:
              return send();
            case UseRawQueryOnErrorAction.CANCEL:
              return undefined;
            case UseRawQueryOnErrorAction.NOTHING:
              break;
          }
        } else {
          console.error(`Max error refresh call: ${errorCounts}/${USE_RAW_QUERY_ERROR_REFRESH_MAX}`);
        }
      }

      const described = describeError(axiosError);
      statusCode.value = described.statusCode;
      error.value = described.message;
      retryCount = 0;

      cache.update(options.key, toValue(data), 'error');
    }

    return toValue(data);
  };

  const refresh = async (): Promise<void> => {
    // rien à faire si le cache est valide, supprimé ou déjà en cours de chargement
    if (
      cache.isValid(options.key) ||
      cache.isDeleted(options.key) ||
      cache.isLoading(options.key) ||
      !toValue(isMounted)
    ) {
      return;
    }
    await send();
  };

  onMounted(async () => {
    // si le fetchOnMount est false, ou si le cache est valide, on récupère juste le cache
    if (!options.fetchOnMount || cache.isValid(options.key)) {
      isMounted.value = true;
      return;
    }
    // si le cache est invalide et que le fetchOnMount est true on refetch
    await send();

    isMounted.value = true;
  });

  watch([() => options.url, isInvalid], refresh);

  const setOptions = (_options: Partial<UseRawQueryOptions<T>>) => {
    for (const key in _options) {
      (options[key as unknown as UseRawQueryOptionsKeys<T>] as unknown) = _options[key as UseRawQueryOptionsKeys<T>];
    }
  };

  return {
    isLoading,
    isError,
    error,
    statusCode,
    refetch: send,
    refresh,
    data,
    cache,
    setOptions,
  };
};
