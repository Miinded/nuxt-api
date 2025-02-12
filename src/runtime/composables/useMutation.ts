import { useRawMutation } from '../composables/useRawMutation';
import type { ApiCacheKey, UseMutationOptions, UseMutationReturn, UseRawQueryHeaders } from '../types/api-cache.type';
import type { RuntimeConfig } from 'nuxt/schema';
import { useRuntimeConfig } from '#imports';

export const useMutation = (key: ApiCacheKey[], options: UseMutationOptions = {}): UseMutationReturn => {
  const config: RuntimeConfig = useRuntimeConfig();

  const rawMutation = useRawMutation({
    key,
    ...options,
  });

  const buildUrl = (_url: string) => (_url.match(/http?/) ? _url : config.public.BACKEND_URI + _url);

  const post = <T>(url: string, body: T, headers: UseRawQueryHeaders = {}) => {
    return rawMutation.send<T>('POST', buildUrl(url), body, headers);
  };

  const put = <T>(url: string, body: T, headers: UseRawQueryHeaders = {}) => {
    return rawMutation.send<T>('PUT', buildUrl(url), body, headers);
  };

  const patch = <T>(url: string, body: T, headers: UseRawQueryHeaders = {}) => {
    return rawMutation.send<T>('PATCH', buildUrl(url), body, headers);
  };

  const remove = async <T>(url: string, headers: UseRawQueryHeaders = {}) => {
    return rawMutation.send<T>('DELETE', buildUrl(url), undefined, headers);
  };

  return {
    ...rawMutation,
    post,
    put,
    patch,
    remove,
  };
};
