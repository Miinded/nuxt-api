import type { ComputedRef, Ref } from 'vue';

export type ApiCacheState = 'loading' | 'idle' | 'error' | 'deleted';

export type ApiCacheKey = string | number | ComputedRef<string> | ComputedRef<number> | Ref<string> | Ref<number>;

export type ApiCacheInvalidOptions = {
  exact?: boolean;
};

export type ApiCache = {
  // Il est préférable d'utiliser unknwon pour nous forcé à caster et récupérer le typage à la sortie.
  data: unknown;
  timestamp: number;
  duration: number;
  valid: boolean;
  state: ApiCacheState;
};

export type UseBaseOptions = {
  key: ApiCacheKey[];
  minDelay?: number;
  cacheDuration?: number;
};

export type UseMutationOptions = UseBaseOptions;

export type UseQueryOptions<T> = UseBaseOptions & {
  url: string | ComputedRef<string> | Ref<string>;
  fetchOnMount?: boolean;
  initialValue?: T;
  headers?: Record<string, string>; // Configuration des headers
};
