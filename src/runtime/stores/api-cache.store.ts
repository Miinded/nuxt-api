import { defineStore } from 'pinia';
import { ref, toValue, type Ref, type ComputedRef } from 'vue';
export type ApiCacheState = 'loading' | 'idle' | 'error' | 'deleted';

export type ApiCacheKey = string | number | ComputedRef<string> | ComputedRef<number> | Ref<string> | Ref<number>;

export type ApiCacheInvalidOptions = {
  exact?: boolean;
};

export type ApiCache = {
  data: any;
  timestamp: number;
  duration: number;
  valid: boolean;
  state: ApiCacheState;
};

const API_CACHE_INVALIDATE_DURATION = 30 * 1000; //30s
const JOIN_STRING = '_:_';

export const apiCacheStore = defineStore('api-cache', () => {
  const refCache: Ref<{ [key: string]: ApiCache }> = ref({});

  const buildKey = (key: ApiCacheKey[]): string => {
    return key.map((k) => toValue(k)).join(JOIN_STRING);
  };

  const getEntry = (key: ApiCacheKey[]): ApiCache | undefined => {
    if (!key.length) return undefined;
    return toValue(refCache)[buildKey(key)];
  };

  const hasState = (key: ApiCacheKey[], state: ApiCacheState): boolean => {
    const entry = getEntry(key);
    return !!entry && entry.state === state;
  };
  
  const notState = (key: ApiCacheKey[], state: ApiCacheState): boolean => {
    const entry = getEntry(key);
    return !!entry && entry.state !== state;
  };

  const exist = (key: ApiCacheKey[]) => notState(key, 'deleted') && !!getEntry(key);


  const isLoading = (key: ApiCacheKey[]): boolean => hasState(key, 'loading');

  const isDeleted = (key: ApiCacheKey[]): boolean => hasState(key, 'deleted');

  const isFresh = (entry: ApiCache): boolean => entry.timestamp + entry.duration >= Date.now();

  const isValid = (key: ApiCacheKey[]): boolean => {
    const entry = getEntry(key);
    return !!entry && entry.valid && entry.state !== 'deleted' && isFresh(entry);
  };

  const get = (key: ApiCacheKey[]): ApiCache | undefined => getEntry(key);

  const setCache = (key: ApiCacheKey[], updater: (entry: ApiCache) => void) => {
    const entry = getEntry(key);
    if (entry) updater(entry);
  };

  const update = (
    key: ApiCacheKey[],
    data: any,
    state: ApiCacheState,
    duration: number | null = null
  ): ApiCache | undefined => {
    if (!key.length) return;

    const keyString = buildKey(key);
    if (duration === null) duration = API_CACHE_INVALIDATE_DURATION;

    const entry: ApiCache = {
      data,
      timestamp: Date.now(),
      valid: true,
      state,
      duration,
    };

    refCache.value[keyString] = entry;
    return entry;
  };

  const invalid = (key: ApiCacheKey[], options?: ApiCacheInvalidOptions) => {
    setCache(key, (e) => { e.valid = false; });

    // invalider les enfants si exact === false
    if (!options?.exact) {
      const parentKey = buildKey(key) + JOIN_STRING;
      for (const keyString in toValue(refCache)) {
        if (keyString.startsWith(parentKey)) {
          const child = toValue(refCache)[keyString];
          if (child) {
            child.valid = false;
          }
        }
      }
    }
  };

  const remove = (key: ApiCacheKey[]) => {
      setCache(key, (e) => { e.state = 'deleted'; });
  };

  return {
    refCache,
    buildKey,
    getEntry,
    hasState,
    notState,
    isFresh,
    isValid,
    isDeleted,
    isLoading,
    get,
    exist,
    update,
    invalid,
    remove,
  };
});
