import type { AxiosError } from 'axios';
import type { Store } from 'pinia';
import type { ComputedRef, Ref } from 'vue';

export const USE_RAW_QUERY_ERROR_REFRESH_MAX = 3;

/** Action à mener après une erreur, renvoyée par `onErrorCallback` */
export enum UseRawQueryOnErrorAction {
  /** Relancer la requête (ex. après un renouvellement de jeton) */
  REFRESH = 'REFRESH',
  /** Abandonner silencieusement : ni erreur exposée, ni état « error » dans le cache */
  CANCEL = 'CANCEL',
  /** Traiter l'erreur normalement */
  NOTHING = 'NOTHING',
}

/** Valeurs acceptées par `onErrorCallback` : l'enum ou sa chaîne ('REFRESH', 'CANCEL', 'NOTHING') */
export type UseRawQueryOnErrorActionType = UseRawQueryOnErrorAction | `${UseRawQueryOnErrorAction}`;

/** Relance automatique sur erreur serveur (pas de réponse, ou HTTP 500, 502, 503, 504) */
export type UseRetryOptions = {
  /** Nombre maximal de relances ; 0 désactive la relance */
  max: number;
  /** Délai en ms avant la relance n° `attempt` (1, 2, …) ; défaut : 1 s, 2 s, 4 s, puis 4 s */
  delay?: (attempt: number) => number;
  /** Appelé juste avant chaque relance (notification, état « serveur indisponible »…) */
  onRetry?: (attempt: number, error: AxiosError) => void;
};

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

export type ApiCacheStore = Store<'api-cache'> & {
  /** Accès direct au cache réactif (Pinia déballe la ref sur l'instance du store) */
  refCache: { [key: string]: ApiCache };

  /** Construit une clé unique à partir d'une liste de clés */
  buildKey: (key: ApiCacheKey[]) => string;

  /** Récupère une entrée brute du cache */
  getEntry: (key: ApiCacheKey[]) => ApiCache | undefined;

  /** Vérifie l'état exact d'une entrée */
  hasState: (key: ApiCacheKey[], state: ApiCacheState) => boolean;

  /** Vérifie que l'état est différent de celui fourni */
  notState: (key: ApiCacheKey[], state: ApiCacheState) => boolean;

  /** Vérifie si l'entrée est fraîche (non expirée) */
  isFresh: (entry: ApiCache) => boolean;

  /** Vérifie si une entrée est toujours valide */
  isValid: (key: ApiCacheKey[]) => boolean;

  /** Vérifie si une entrée a été supprimée */
  isDeleted: (key: ApiCacheKey[]) => boolean;

  /** Indique si une entrée est en cours de chargement */
  isLoading: (key: ApiCacheKey[]) => boolean;

  /** Récupère une entrée (alias de getEntry) */
  get: (key: ApiCacheKey[]) => ApiCache | undefined;

  /** Vérifie si une entrée existe (et n'est pas supprimée) */
  exist: (key: ApiCacheKey[]) => boolean;

  /** Met à jour (ou crée) une entrée du cache et la retourne */
  update: (key: ApiCacheKey[], data: unknown, state: ApiCacheState, duration?: number | null) => ApiCache | undefined;

  /** Rend une entrée invalide (avec options pour invalider les enfants) */
  invalid: (key: ApiCacheKey[], options?: ApiCacheInvalidOptions) => void;

  /** Supprime (ou marque comme supprimée) une entrée du cache */
  remove: (key: ApiCacheKey[]) => void;
};

export type UseBaseOptions = {
  key: ApiCacheKey[];
  minDelay?: number;
  cacheDuration?: number;
  authToken?: UseRawQueryHeaders | Ref<UseRawQueryHeaders> | ComputedRef<UseRawQueryHeaders>;
  onErrorCallback?: (error: AxiosError) => Promise<UseRawQueryOnErrorActionType>;
  /** Relance automatique sur erreur serveur ; désactivée par défaut */
  retry?: UseRetryOptions;
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

export type UseMutationOptions = Pick<
  UseRawMutationOptions,
  'minDelay' | 'cacheDuration' | 'authToken' | 'onErrorCallback' | 'retry'
>;

export type UseQueryOptions<T> = Pick<
  UseRawQueryOptions<T>,
  'fetchOnMount' | 'minDelay' | 'cacheDuration' | 'authToken' | 'headers' | 'onErrorCallback' | 'retry'
>;

export type UseRawMutationReturn = {
  isLoading: Ref<boolean, boolean>;
  isError: Ref<boolean, boolean>;
  /** Message de la dernière erreur (null si la dernière requête a réussi) */
  error: Ref<string | null>;
  /** Code HTTP de la dernière erreur, null si aucune ou erreur réseau */
  statusCode: Ref<number | null>;
  send: <T>(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    body: T | undefined,
    headers?: UseRawQueryHeaders,
  ) => Promise<void>;
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
  /** Message de la dernière erreur (null si la dernière requête a réussi) */
  error: Ref<string | null>;
  /** Code HTTP de la dernière erreur, null si aucune ou erreur réseau */
  statusCode: Ref<number | null>;
  /** Relance la requête sans condition */
  refetch: () => Promise<T | undefined>;
  /** Relance la requête seulement si le cache est invalide et qu'aucune requête n'est en cours */
  refresh: () => Promise<void>;
  data: ComputedRef<T | undefined>;
  cache: ApiCacheStore;
  setOptions: (_options: Partial<UseRawQueryOptions<T>>) => void;
};

export type UseQueryReturn<T> = UseRawQueryReturn<T> & {};
