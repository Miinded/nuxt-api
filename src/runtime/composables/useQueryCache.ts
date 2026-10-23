import { apiCacheStore } from '../stores/api-cache.store';
import type { ApiCacheStore } from '../types/api-cache.type';

/** Accès au cache des requêtes (invalidation, lecture, mise à jour manuelle) */
export const useQueryCache = (): ApiCacheStore => apiCacheStore();
