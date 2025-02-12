import type { AxiosError } from 'axios';
import type { ComputedRef, Ref } from 'vue';
import type { UseRawQueryOnErrorAction } from './api-cache.enum';

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
  authToken?: UseRawQueryHeaders | Ref<UseRawQueryHeaders> | ComputedRef<UseRawQueryHeaders>;
  onErrorCallback?: (error: AxiosError) => Promise<UseRawQueryOnErrorActionType>;
};

export type UseRawQueryHeaders = { [key: string]: string };

export type UseRawQueryOptions<T> = UseBaseOptions & {
  url: string | Ref<string> | ComputedRef<string>;
  fetchOnMount?: boolean;
  initialValue?: T;
  headers?: UseRawQueryHeaders | Ref<UseRawQueryHeaders> | ComputedRef<UseRawQueryHeaders>;
};

export type UseRawQueryOptionsKeys<T> = keyof UseRawQueryOptions<T>;

export type UseRawMutationOptions = UseBaseOptions;

export type UseRawMutationOptionsKeys = keyof UseRawMutationOptions;

export type UseMutationOptions = Pick<UseRawMutationOptions, 'minDelay' | 'cacheDuration' | 'authToken' | 'onErrorCallback'>;

export type UseQueryOptions<T> = Pick<UseRawQueryOptions<T>, 'fetchOnMount' | 'minDelay' | 'cacheDuration' | 'authToken' | 'headers' | 'onErrorCallback'>;

export type UseRawQueryOnErrorActionType = keyof typeof UseRawQueryOnErrorAction;
