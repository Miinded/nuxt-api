import type { AxiosError } from 'axios';
import type { Store } from 'pinia';
import type { ComputedRef, Ref } from 'vue';

export const USE_RAW_QUERY_ERROR_REFRESH_MAX = 3;

export type UseRawQueryOnErrorAction = 'REFRESH' | 'CANCEL' | 'NOTHING';

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

export type ApiCacheStore = Store<'api-cache'>;

//  {
//   /** Référence réactive contenant le cache des requêtes */
//   refCache: Ref<{ [key: string]: ApiCache }>;

//   /** Construit une clé unique à partir d'une liste de clés */
//   buildKey: (key: ApiCacheKey[]) => string;

//   /** Vérifie si une entrée existe dans le cache */
//   exist: (key: ApiCacheKey[]) => boolean;

//   /** Vérifie si une entrée a été supprimée */
//   isDeleted: (key: ApiCacheKey[]) => boolean;

//   /** Vérifie si une entrée est toujours valide */
//   isValid: (key: ApiCacheKey[]) => boolean;

//   /** Met à jour une entrée du cache */
//   update: (key: ApiCacheKey[], data: any, state: ApiCacheState, duration?: number) => void;

//   /** Rend une entrée invalide (avec options pour invalider les enfants) */
//   invalid: (key: ApiCacheKey[], options?: ApiCacheInvalidOptions) => void;

//   /** Supprime (ou marque comme supprimée) une entrée du cache */
//   remove: (key: ApiCacheKey[]) => void;
// };

export type UseBaseOptions = {
  key: ApiCacheKey[];
  minDelay?: number;
  cacheDuration?: number;
  authToken?: UseRawQueryHeaders | Ref<UseRawQueryHeaders> | ComputedRef<UseRawQueryHeaders>;
  onErrorCallback?: (error: AxiosError) => Promise<UseRawQueryOnErrorAction>;
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

export type UseRawMutationReturn = {
  isLoading: Ref<boolean, boolean>;
  isError: Ref<boolean, boolean>;
  send: <T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, body: T | undefined, headers?: UseRawQueryHeaders) => Promise<void>;
  cache: ApiCacheStore;
  setOptions: (_options: Partial<UseRawMutationOptions>) => void;
};

export type UseMutationReturn = UseRawMutationReturn & {
  post: <T>(url: string, body: T, headers?: UseRawQueryHeaders) => Promise<void>;
  put: <T>(url: string, body: T, headers?: UseRawQueryHeaders) => Promise<void>;
  patch: <T>(url: string, body: T, headers?: UseRawQueryHeaders) => Promise<void>;
  remove: (url: string, headers?: UseRawQueryHeaders) => Promise<void>;
};

export type UseRawQueryReturn<T> = {
  isLoading: ComputedRef<boolean>;
  isError: ComputedRef<boolean>;
  refetch: () => Promise<T | undefined>;
  data: ComputedRef<T | undefined>;
  cache: ApiCacheStore;
  setOptions: (_options: Partial<UseRawQueryOptions<T>>) => void;
};

export type UseQueryReturn<T> = UseRawQueryReturn<T> & {};
