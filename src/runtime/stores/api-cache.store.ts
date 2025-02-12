import { defineStore } from 'pinia';
import { ref, toValue, type Ref } from 'vue';
import type { ApiCache, ApiCacheInvalidOptions, ApiCacheKey, ApiCacheState } from '../types/api-cache.type';

const API_CACHE_INVALIDATE_DURATION = 30 * 1000; //30s
const JOIN_STRING = '_:_';

export const apiCacheStore = defineStore('api-cache', () => {
  const refCache: Ref<{ [key: string]: ApiCache }> = ref({});

  const buildKey = (key: ApiCacheKey[]): string => {
    return key.map((k) => toValue(k)).join(JOIN_STRING);
  };

  const exist = (key: ApiCacheKey[]): boolean => {
    if (!key.length || !toValue(refCache)[buildKey(key)] || toValue(refCache)[buildKey(key)].state === 'deleted') {
      return false;
    }
    return true;
  };
  const isDeleted = (key: ApiCacheKey[]): boolean => {
    if (key.length && toValue(refCache)[buildKey(key)] && toValue(refCache)[buildKey(key)].state === 'deleted') {
      return true;
    }
    return false;
  };

  const isValid = (key: ApiCacheKey[]): boolean => {
    if (!key.length) {
      return false;
    }
    const keyString = buildKey(key);
    if (
      //
      !toValue(refCache)[keyString] ||
      !toValue(refCache)[keyString].valid ||
      toValue(refCache)[keyString].state === 'deleted' ||
      toValue(refCache)[keyString].timestamp + toValue(refCache)[keyString].duration < Date.now()
    ) {
      return false;
    }
    return true;
  };

  const update = (key: ApiCacheKey[], data: any, state: ApiCacheState, duration?: number) => {
    if (!key.length) {
      return;
    }

    if (!duration || duration < 0) {
      duration = API_CACHE_INVALIDATE_DURATION;
    }

    refCache.value[buildKey(key)] = {
      data,
      timestamp: Date.now(),
      valid: true,
      state,
      duration,
    };
  };

  const invalid = (key: ApiCacheKey[], options?: ApiCacheInvalidOptions) => {
    if (!key.length) {
      return;
    }

    if (exist(key)) {
      refCache.value[buildKey(key)].valid = false;
    }

    if (!options?.exact) {
      // invalidate childs
      for (const keyString in toValue(refCache)) {
        if (keyString.startsWith(buildKey(key) + JOIN_STRING)) {
          refCache.value[keyString].valid = false;
        }
      }
    }
  };

  const remove = (key: ApiCacheKey[]) => {
    if (!key.length) {
      return;
    }

    if (!exist(key)) {
      return;
    }
    refCache.value[buildKey(key)].state = 'deleted';
  };

  return {
    refCache,
    buildKey,
    isValid,
    isDeleted,
    exist,
    update,
    invalid,
    remove,
  };
});
