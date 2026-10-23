// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRawQuery } from '../src/runtime/composables/useRawQuery';
import type { UseRawQueryOptions, UseRawQueryReturn } from '../src/runtime/types/api-cache.type';

vi.mock('axios', () => ({ default: vi.fn() }));
const axiosMock = vi.mocked((await import('axios')).default) as unknown as ReturnType<typeof vi.fn>;

const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

/** Monte un composant qui appelle useRawQuery, pour exécuter onMounted et les watchers */
const mountQuery = <T>(options: UseRawQueryOptions<T>) => {
  let query!: UseRawQueryReturn<T>;
  mount(
    defineComponent({
      setup() {
        query = useRawQuery<T>(options);
        return () => h('div');
      },
    }),
  );
  return query;
};

describe('useRawQuery (cycle de vie)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    axiosMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('charge les données au montage', async () => {
    axiosMock.mockResolvedValue({ data: [{ id: 1 }] });

    const query = mountQuery({ key: ['drops'], url: '/drops' });
    expect(query.isLoading.value).toBe(true);
    await flush();

    expect(axiosMock).toHaveBeenCalledTimes(1);
    expect(query.data.value).toEqual([{ id: 1 }]);
    expect(query.isLoading.value).toBe(false);
  });

  it('ne charge rien au montage si fetchOnMount est false', async () => {
    const query = mountQuery({ key: ['drops'], url: '/drops', fetchOnMount: false, initialValue: [] });
    await flush();

    expect(axiosMock).not.toHaveBeenCalled();
    expect(query.data.value).toEqual([]);
  });

  it('se recharge après invalidation, même monté sur un cache encore valide', async () => {
    axiosMock.mockResolvedValue({ data: 'v1' });
    const first = mountQuery({ key: ['shared'], url: '/shared' });
    await flush();
    expect(first.data.value).toBe('v1');

    // second consommateur monté alors que le cache est valide : pas de requête au montage
    const second = mountQuery({ key: ['shared'], url: '/shared' });
    await flush();
    expect(axiosMock).toHaveBeenCalledTimes(1);

    axiosMock.mockResolvedValue({ data: 'v2' });
    second.cache.invalid(['shared']);
    await flush();

    expect(second.data.value).toBe('v2');
  });

  it('refresh ne relance pas une requête déjà en cours ni un cache valide', async () => {
    let resolve!: (value: unknown) => void;
    axiosMock.mockImplementation(() => new Promise((r) => (resolve = r)));
    const query = mountQuery({ key: ['slow'], url: '/slow' });
    await flush();
    expect(query.cache.isLoading(['slow'])).toBe(true);

    await query.refresh();
    expect(axiosMock).toHaveBeenCalledTimes(1);

    resolve({ data: 'done' });
    await flush();
    await query.refresh();
    expect(axiosMock).toHaveBeenCalledTimes(1);
  });

  it("passe l'entrée en erreur avec le message du backend", async () => {
    axiosMock.mockRejectedValue({ response: { status: 404, data: { message: 'Collection not found' } } });
    const query = mountQuery({ key: ['missing'], url: '/missing' });
    await flush();

    expect(query.isError.value).toBe(true);
    expect(query.statusCode.value).toBe(404);
    expect(query.error.value).toBe('Collection not found');
  });

  it('relance une erreur serveur puis réussit, quand retry est activé', async () => {
    axiosMock.mockRejectedValueOnce({ response: { status: 503 } }).mockResolvedValue({ data: 'ok' });
    const onRetry = vi.fn();
    const query = mountQuery({ key: ['flaky'], url: '/flaky', retry: { max: 2, delay: () => 0, onRetry } });
    await flush();

    expect(axiosMock).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(1, expect.objectContaining({ response: { status: 503 } }));
    expect(query.data.value).toBe('ok');
    expect(query.isError.value).toBe(false);
  });

  it('suit les actions de onErrorCallback', async () => {
    axiosMock.mockRejectedValueOnce({ response: { status: 401 } }).mockResolvedValue({ data: 'renewed' });
    const refreshed = mountQuery({ key: ['me'], url: '/me', onErrorCallback: async () => 'REFRESH' });
    await flush();
    expect(refreshed.data.value).toBe('renewed');

    axiosMock.mockReset().mockRejectedValue({ response: { status: 401 } });
    const cancelled = mountQuery({ key: ['other'], url: '/other', onErrorCallback: async () => 'CANCEL' });
    await flush();
    expect(cancelled.isError.value).toBe(false);
    expect(cancelled.error.value).toBeNull();
  });
});
