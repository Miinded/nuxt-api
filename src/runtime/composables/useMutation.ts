import { ref, type Ref } from 'vue';
import type { RuntimeConfig, PublicRuntimeConfig } from 'nuxt/schema';
import axios from 'axios';
import { apiCacheStore } from '../stores/api-cache.store';
import type { ApiCacheKey } from '../types/api-cache';
import { useRuntimeConfig } from '#imports';

export type UseMutationOptions = {
  key: ApiCacheKey[];
  minDelay?: number;
  cacheDuration?: number;
};

export const useMutation = (options: UseMutationOptions) => {
  options = { minDelay: 0, cacheDuration: 0, ...options };

  const error: Ref<string | null> = ref(null);
  const statusCode: Ref<number | null> = ref(null); // Ajouter une ref pour le code d'état HTTP

  const apiCache = apiCacheStore();

  const config = useRuntimeConfig() as RuntimeConfig & { public: PublicRuntimeConfig };

  const isLoading: Ref<boolean> = ref(false);
  const isError: Ref<boolean> = ref(false);
  const axiosInstance = axios.create();

  const send = async <T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', _url: string, body: T | undefined, headers?: Record<string, string>): Promise<void> => {
    const url = _url.match(/http?/) ? _url : config.public.BACKEND_URI + _url;

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
        apiCache.update(options.key, result.data, 'idle', options.cacheDuration);
      } else {
        apiCache.remove(options.key);
      }
    } catch (err: any) {
      console.error(err);
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

  const post = async <T>(url: string, body: T, headers?: Record<string, string>) => send<T>('POST', url, body, headers);
  const put = async <T>(url: string, body: T, headers?: Record<string, string>) => send<T>('PUT', url, body, headers);
  const patch = async <T>(url: string, body: T, headers?: Record<string, string>) => send<T>('PATCH', url, body, headers);
  const remove = async <T>(url: string, headers?: Record<string, string>) => send<T>('DELETE', url, undefined, headers);

  return {
    isLoading,
    isError,
    post,
    put,
    patch,
    remove,
  };
};
