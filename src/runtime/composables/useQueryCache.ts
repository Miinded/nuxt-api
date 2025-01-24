import { apiCacheStore } from '../stores/api-cache.store';

export const useQueryCache = () => {
  return apiCacheStore();
};
