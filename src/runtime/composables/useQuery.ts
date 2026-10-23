import { computed, toValue, type ComputedRef, type Ref } from 'vue';
import { useRawQuery } from '../composables/useRawQuery';
import type { ApiCacheKey, UseQueryOptions, UseQueryReturn } from '../types/api-cache.type';
import { useRuntimeConfig } from '#imports';
import { resolveUrl } from '../utils/url';

export const useQuery = <T>(
  _url: string | Ref<string> | ComputedRef<string>,
  key: ApiCacheKey[],
  initialValue?: T,
  _options: UseQueryOptions<T> = {},
): UseQueryReturn<T> => {
  const options: UseQueryOptions<T> = {
    fetchOnMount: true,
    minDelay: 0,
    headers: {},
    cacheDuration: undefined,
    ..._options,
  };

  const config = useRuntimeConfig();
  const url = computed(() => resolveUrl(toValue(_url), config.public.BACKEND_URI as string | undefined));

  const rawQuery = useRawQuery({
    key: key,
    url: url,
    initialValue,
    ...options,
  });

  return {
    ...rawQuery,
  };
};
