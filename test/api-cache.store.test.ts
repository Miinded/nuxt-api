import { setActivePinia, createPinia } from 'pinia';
import { ref, computed } from 'vue';
import { apiCacheStore, type ApiCacheKey } from '../src/runtime/stores/api-cache.store';

describe('api-cache.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const makeKeys = (): ApiCacheKey[] => [
    'users',
    1,
    ref('details'),
    computed(() => 2024),
  ];

  it('buildKey concatène correctement les clés', () => {
    const store = apiCacheStore();
    const key = store.buildKey(['a', 1, 'b' as const]);
    expect(key).toBe('a_:_1_:_b');
  });

  it('update crée une entrée valide et isValid retourne true si fraîche', () => {
    const store = apiCacheStore();
    const key = makeKeys();
    store.update(key, { id: 1 }, 'idle', 1000);
    expect(store.isValid(key)).toBe(true);
    const entry = store.get(key)!;
    expect(entry.state).toBe('idle');
    expect(entry.valid).toBe(true);
  });

  it('isFresh devient false quand la durée est dépassée', async () => {
    const store = apiCacheStore();
    const key = ['products'];
    store.update(key, { id: 2 }, 'idle', 1);
    await new Promise((r) => setTimeout(r, 5));
    const entry = store.get(key)!;
    expect(store.isFresh(entry)).toBe(false);
    expect(store.isValid(key)).toBe(false);
  });

  it('invalid invalide la clé exacte et ses enfants quand exact=false', () => {
    const store = apiCacheStore();
    const parent = ['users'];
    const child = ['users', 1];
    store.update(parent, {}, 'idle', 10_000);
    store.update(child, {}, 'idle', 10_000);
    expect(store.isValid(parent)).toBe(true);
    expect(store.isValid(child)).toBe(true);
    store.invalid(parent, { exact: false });
    expect(store.get(parent)!.valid).toBe(false);
    expect(store.get(child)!.valid).toBe(false);
  });

  it('remove marque une entrée comme deleted', () => {
    const store = apiCacheStore();
    const key = ['orders'];
    store.update(key, {}, 'idle', 1000);
    store.remove(key);
    expect(store.isDeleted(key)).toBe(true);
    expect(store.exist(key)).toBe(false);
  });
});


