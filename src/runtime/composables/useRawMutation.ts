import { computed, ref, toValue, type Ref } from 'vue';
import axios from 'axios';
import type { UseRawMutationOptions, UseRawMutationOptionsKeys, UseRawQueryHeaders } from '../types/api-cache';
import { USE_RAW_QUERY_ERROR_REFRESH_MAX, UseRawQueryOnErrorAction } from '../types/api-cache';
import { apiCacheStore } from '../stores/api-cache.store';

export const useRawMutation = (_options: UseRawMutationOptions) => {
  const options: UseRawMutationOptions = { minDelay: 0, cacheDuration: undefined, ..._options };
  const authToken = computed(() => toValue(options.authToken ?? {}));

  const error: Ref<string | null> = ref(null);
  const statusCode: Ref<number | null> = ref(null); // Ajouter une ref pour le code d'état HTTP

  const cache = apiCacheStore();

  const isLoading: Ref<boolean> = ref(false);
  const isError: Ref<boolean> = ref(false);
  const axiosInstance = axios.create();

  let errorCounts = 0;

  const send = async <T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, body: T | undefined, headers: UseRawQueryHeaders = {}): Promise<void> => {
    isLoading.value = true;
    isError.value = false;
    statusCode.value = null;

    const startTime = Date.now();

    try {
      const result = await axiosInstance<T>(url, {
        method,
        data: body,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...toValue(authToken),
        },
      });

      if (options.minDelay && options.minDelay > 0) {
        const remainingTime = options.minDelay - (Date.now() - startTime);
        if (remainingTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }
      }

      // on met à jour le cache
      if (method !== 'DELETE') {
        cache.update(options.key, result.data, 'idle', options.cacheDuration);
      } else {
        cache.remove(options.key);
      }
      errorCounts = 0;
    } catch (err: any) {
      console.error(err);
      if (options.onErrorCallback) {
        if (errorCounts < USE_RAW_QUERY_ERROR_REFRESH_MAX) {
          errorCounts++;
          const action = await options.onErrorCallback(err);

          switch (action) {
            case UseRawQueryOnErrorAction.REFRESH:
              await send(method, url, body, toValue(headers));
              return;
            case UseRawQueryOnErrorAction.CANCEL:
              return;
            case UseRawQueryOnErrorAction.NOTHING:
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
    } finally {
      isLoading.value = false;
    }
  };

  const setOptions = (_options: Partial<UseRawMutationOptions>) => {
    for (const key in _options) {
      (options[key as unknown as UseRawMutationOptionsKeys] as unknown) = _options[key as UseRawMutationOptionsKeys];
    }
  };

  return {
    isLoading,
    isError,
    send,
    cache,
    setOptions,
  };
};
