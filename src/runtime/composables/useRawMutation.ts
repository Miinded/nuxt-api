import { computed, ref, toValue, type Ref } from 'vue';
import axios, { type AxiosError } from 'axios';
import type {
  UseRawMutationOptions,
  UseRawMutationOptionsKeys,
  UseRawMutationReturn,
  UseRawQueryHeaders,
} from '../types/api-cache.type';
import { USE_RAW_QUERY_ERROR_REFRESH_MAX, UseRawQueryOnErrorAction } from '../types/api-cache.type';
import { apiCacheStore } from '../stores/api-cache.store';
import { defaultRetryDelay, describeError, isServerError, sleep } from '../utils/errors';

export const useRawMutation = (_options: UseRawMutationOptions): UseRawMutationReturn => {
  const options: UseRawMutationOptions = { minDelay: 0, cacheDuration: undefined, ..._options };
  const authToken = computed(() => toValue(options.authToken ?? {}));

  const error: Ref<string | null> = ref(null);
  const statusCode: Ref<number | null> = ref(null);

  const cache = apiCacheStore();

  const isLoading: Ref<boolean> = ref(false);
  const isError: Ref<boolean> = ref(false);
  const axiosInstance = axios.create();

  let errorCounts = 0;
  let retryCount = 0;

  const send = async <T>(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    body: T | undefined,
    headers: UseRawQueryHeaders = {},
  ): Promise<void> => {
    isLoading.value = true;
    isError.value = false;
    statusCode.value = null;
    error.value = null;

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
          await sleep(remainingTime);
        }
      }

      // on met à jour le cache
      if (method !== 'DELETE') {
        cache.update(options.key, result.data, 'idle', options.cacheDuration);
      } else {
        cache.remove(options.key);
      }
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
        return send(method, url, body, headers);
      }

      // Callback personnalisé (pour un 401 : renouvellement du jeton, etc.)
      if (options.onErrorCallback) {
        if (errorCounts < USE_RAW_QUERY_ERROR_REFRESH_MAX) {
          errorCounts++;
          const action = await options.onErrorCallback(axiosError);
          switch (action) {
            case UseRawQueryOnErrorAction.REFRESH:
              return send(method, url, body, headers);
            case UseRawQueryOnErrorAction.CANCEL:
              return;
            case UseRawQueryOnErrorAction.NOTHING:
              break;
          }
        } else {
          console.error(`Max error refresh call: ${errorCounts}/${USE_RAW_QUERY_ERROR_REFRESH_MAX}`);
        }
      }

      const described = describeError(axiosError);
      isError.value = true;
      statusCode.value = described.statusCode;
      error.value = described.message;
      retryCount = 0;
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
    error,
    statusCode,
    send,
    cache,
    setOptions,
  };
};
