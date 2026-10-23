import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRawQuery } from '../src/runtime/composables/useRawQuery';

vi.mock('axios', () => {
  return {
    default: vi.fn(),
  };
});

const axiosMock = (await import('axios')).default as unknown as ReturnType<typeof vi.fn> & {
  mockResolvedValue: (v: any) => void;
  mockRejectedValue: (v: any) => void;
};

describe('useRawQuery', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('refetch récupère les données et met le cache à idle', async () => {
    axiosMock.mockResolvedValue({ data: { ok: true } });

    const q = useRawQuery<{ ok: boolean }>({
      key: ['users', 1],
      url: '/api/users/1',
      fetchOnMount: false,
    });

    expect(q.isLoading.value).toBe(false);
    const res = await q.refetch();
    expect(res).toEqual({ ok: true });
    expect(q.isLoading.value).toBe(false);
    expect(q.isError.value).toBe(false);
    const entry = q.cache.get(['users', 1])!;
    expect(entry.state).toBe('idle');
    expect(entry.data).toEqual({ ok: true });
  });

  it('respecte minDelay avant de finaliser', async () => {
    axiosMock.mockResolvedValue({ data: { slow: true } });
    const minDelay = 50;
    const start = Date.now();

    const q = useRawQuery<{ slow: boolean }>({
      key: ['slow'],
      url: '/slow',
      fetchOnMount: false,
      minDelay,
    });

    await q.refetch();
    expect(Date.now() - start).toBeGreaterThanOrEqual(minDelay);
  });

  it('fusionne headers et authToken', async () => {
    axiosMock.mockResolvedValue({ data: { ok: true } });

    const q = useRawQuery<{ ok: boolean }>({
      key: ['headers'],
      url: '/h',
      fetchOnMount: false,
      headers: { 'X-Custom': '1' },
      authToken: { Authorization: 'Bearer token' },
    });

    await q.refetch();
    expect(axiosMock).toHaveBeenCalledTimes(1);
    const call = axiosMock.mock.calls[0]!;
    expect(call[0]).toBe('/h');
    expect(call[1].headers['X-Custom']).toBe('1');
    expect(call[1].headers['Authorization']).toBe('Bearer token');
  });

  it('met le cache en erreur et conserve data initiale en cas d’échec', async () => {
    axiosMock.mockRejectedValue({ response: { status: 500, statusText: 'Server Error' } });

    const q = useRawQuery<{ ok: boolean }>({
      key: ['err'],
      url: '/err',
      fetchOnMount: false,
      initialValue: { ok: false },
    });

    const res = await q.refetch();
    expect(res).toEqual({ ok: false });
    expect(q.isError.value).toBe(true);
    const entry = q.cache.get(['err'])!;
    expect(entry.state).toBe('error');
    expect(entry.data).toEqual({ ok: false });
  });
});
