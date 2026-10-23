import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMutation } from '../src/runtime/composables/useMutation';
import { useQuery } from '../src/runtime/composables/useQuery';
import { useQueryCache } from '../src/runtime/composables/useQueryCache';

const request = vi.fn();
vi.mock('axios', () => {
  const axios = vi.fn();
  return { default: Object.assign(axios, { create: () => request }) };
});
const axiosMock = vi.mocked((await import('axios')).default) as unknown as ReturnType<typeof vi.fn>;

describe('useQuery', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    axiosMock.mockReset();
  });

  it('préfixe les URL relatives par BACKEND_URI et accepte des clés réactives', async () => {
    axiosMock.mockResolvedValue({ data: { id: 7 } });
    const id = ref(7);

    const query = useQuery<{ id: number }>('/collection/7', ['collection', id], undefined, { fetchOnMount: false });
    await query.refetch();

    expect(axiosMock.mock.calls[0]![0]).toBe('https://api.example.test/collection/7');
    expect(query.cache.get(['collection', 7])?.data).toEqual({ id: 7 });
  });

  it('garde les URL absolues et renvoie la valeur initiale tant que le cache est vide', () => {
    const query = useQuery(
      'https://cdn.example.test/meta.json',
      ['meta'],
      { name: 'initial' },
      { fetchOnMount: false },
    );

    expect(query.data.value).toEqual({ name: 'initial' });
  });
});

describe('useMutation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    request.mockReset().mockResolvedValue({ data: { ok: true } });
  });

  it.each([
    ['post', 'POST'],
    ['put', 'PUT'],
    ['patch', 'PATCH'],
  ] as const)('%s envoie un %s sur BACKEND_URI', async (name, method) => {
    const mutation = useMutation(['drop']);

    await mutation[name]('/drop', { title: 'x' }, { 'X-Trace': '1' });

    expect(request).toHaveBeenCalledWith('https://api.example.test/drop', {
      method,
      data: { title: 'x' },
      headers: { 'Content-Type': 'application/json', 'X-Trace': '1' },
    });
  });

  it('remove envoie un DELETE sans corps et garde les URL absolues', async () => {
    const mutation = useMutation(['drop', 1]);

    await mutation.remove('https://other.example.test/drop/1');

    expect(request).toHaveBeenCalledWith('https://other.example.test/drop/1', {
      method: 'DELETE',
      data: undefined,
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('useQueryCache', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('donne accès au cache partagé par les requêtes', async () => {
    axiosMock.mockResolvedValue({ data: 'shared' });
    const query = useQuery('/shared', ['shared'], undefined, { fetchOnMount: false });
    await query.refetch();

    const cache = useQueryCache();
    expect(cache.get(['shared'])?.data).toBe('shared');

    cache.invalid(['shared']);
    expect(query.cache.isValid(['shared'])).toBe(false);
  });
});
