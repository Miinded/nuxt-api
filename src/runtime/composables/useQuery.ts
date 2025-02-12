import { computed, toValue, type ComputedRef, type Ref } from 'vue';
import { useRawQuery } from '../composables/useRawQuery';
import type { UseQueryOptions, UseQueryReturn } from '../types/api-cache.type';
// import type { RuntimeConfig } from 'nuxt/schema';
import { useRuntimeConfig } from '#imports';

export const useQuery = <T>(_url: string | Ref<string> | ComputedRef<string>, key: string[], initialValue?: T, _options: UseQueryOptions<T> = {}): UseQueryReturn<T> => {
  const options: UseQueryOptions<T> = { fetchOnMount: true, minDelay: 0, headers: {}, cacheDuration: undefined, ..._options };

  const config = useRuntimeConfig();
  const url = computed(() => (toValue(_url).match(/http?/) ? toValue(_url) : config.public.BACKEND_URI + toValue(_url)));

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
