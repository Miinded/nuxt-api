import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRawMutation } from '../src/runtime/composables/useRawMutation';
import { UseRawQueryOnErrorAction } from '../src/runtime/types/api-cache.type';

const request = vi.fn();

vi.mock('axios', () => ({
  default: { create: () => request },
}));

const httpError = (status: number, data?: unknown) => ({ response: { status, data, statusText: `HTTP ${status}` } });

describe('useRawMutation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    request.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('envoie le corps et les en-têtes, puis met la réponse en cache', async () => {
    request.mockResolvedValue({ data: { id: 1, title: 'Drop' } });
    const mutation = useRawMutation({ key: ['drop', 1], authToken: ref({ Authorization: 'Bearer token' }) });

    await mutation.send('POST', 'https://api.example.test/drop', { title: 'Drop' }, { 'X-Trace': 'abc' });

    expect(request).toHaveBeenCalledWith('https://api.example.test/drop', {
      method: 'POST',
      data: { title: 'Drop' },
      headers: { 'Content-Type': 'application/json', 'X-Trace': 'abc', Authorization: 'Bearer token' },
    });
    expect(mutation.cache.get(['drop', 1])).toMatchObject({ state: 'idle', data: { id: 1, title: 'Drop' } });
    expect(mutation.isLoading.value).toBe(false);
    expect(mutation.isError.value).toBe(false);
  });

  it("marque l'entrée supprimée après un DELETE", async () => {
    request.mockResolvedValue({ data: null });
    const mutation = useRawMutation({ key: ['drop', 1] });
    mutation.cache.update(['drop', 1], { id: 1 }, 'idle');

    await mutation.send('DELETE', '/drop/1', undefined);

    expect(mutation.cache.isDeleted(['drop', 1])).toBe(true);
  });

  it("expose l'échec : isError, statusCode et message du backend", async () => {
    request.mockRejectedValue(httpError(422, { message: 'Slug déjà utilisé' }));
    const mutation = useRawMutation({ key: ['collection'] });

    await mutation.send('PUT', '/collection/1', { slug: 'poc' });

    expect(mutation.isError.value).toBe(true);
    expect(mutation.statusCode.value).toBe(422);
    expect(mutation.error.value).toBe('Slug déjà utilisé');
    expect(mutation.isLoading.value).toBe(false);
  });

  it("remet l'erreur à zéro à la requête suivante", async () => {
    request.mockRejectedValueOnce(httpError(500)).mockResolvedValueOnce({ data: {} });
    const mutation = useRawMutation({ key: ['collection'] });

    await mutation.send('POST', '/collection', {});
    await mutation.send('POST', '/collection', {});

    expect(mutation.isError.value).toBe(false);
    expect(mutation.error.value).toBeNull();
    expect(mutation.statusCode.value).toBeNull();
  });

  it('relance une erreur serveur avec backoff quand retry est activé', async () => {
    request
      .mockRejectedValueOnce(httpError(503))
      .mockRejectedValueOnce({ message: 'Network Error' })
      .mockResolvedValue({ data: { ok: true } });
    const onRetry = vi.fn<(attempt: number) => void>();
    const delay = vi.fn((_attempt: number) => 0);
    const mutation = useRawMutation({ key: ['ok'], retry: { max: 3, delay, onRetry } });

    await mutation.send('POST', '/ok', {});

    expect(request).toHaveBeenCalledTimes(3);
    expect(onRetry.mock.calls.map(([attempt]) => attempt)).toEqual([1, 2]);
    expect(delay.mock.calls.map(([attempt]) => attempt)).toEqual([1, 2]);
    expect(mutation.isError.value).toBe(false);
  });

  it('abandonne après le nombre maximal de relances', async () => {
    request.mockRejectedValue(httpError(502));
    const mutation = useRawMutation({ key: ['ko'], retry: { max: 2, delay: () => 0 } });

    await mutation.send('POST', '/ko', {});

    expect(request).toHaveBeenCalledTimes(3);
    expect(mutation.isError.value).toBe(true);
    expect(mutation.statusCode.value).toBe(502);
  });

  it("ne relance ni les erreurs client, ni sans l'option retry", async () => {
    request.mockRejectedValue(httpError(400));
    await useRawMutation({ key: ['a'], retry: { max: 3, delay: () => 0 } }).send('POST', '/a', {});
    expect(request).toHaveBeenCalledTimes(1);

    request.mockReset().mockRejectedValue(httpError(503));
    await useRawMutation({ key: ['b'] }).send('POST', '/b', {});
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('rejoue la requête quand onErrorCallback demande REFRESH (chaîne ou enum)', async () => {
    request.mockRejectedValueOnce(httpError(401)).mockRejectedValueOnce(httpError(401)).mockResolvedValue({ data: {} });
    const onErrorCallback = vi
      .fn()
      .mockResolvedValueOnce('REFRESH')
      .mockResolvedValueOnce(UseRawQueryOnErrorAction.REFRESH);
    const mutation = useRawMutation({ key: ['me'], onErrorCallback });

    await mutation.send('PATCH', '/me', { nickname: 'admin' }, { 'X-Trace': 'abc' });

    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls[2]![1].headers['X-Trace']).toBe('abc');
    expect(mutation.isError.value).toBe(false);
  });

  it("abandonne sans exposer d'erreur quand onErrorCallback demande CANCEL", async () => {
    request.mockRejectedValue(httpError(401));
    const mutation = useRawMutation({ key: ['me'], onErrorCallback: async () => 'CANCEL' });

    await mutation.send('POST', '/me', {});

    expect(mutation.isError.value).toBe(false);
    expect(mutation.isLoading.value).toBe(false);
  });

  it('traite normalement l’erreur quand onErrorCallback répond NOTHING', async () => {
    request.mockRejectedValue(httpError(403));
    const mutation = useRawMutation({ key: ['me'], onErrorCallback: async () => UseRawQueryOnErrorAction.NOTHING });

    await mutation.send('POST', '/me', {});

    expect(mutation.isError.value).toBe(true);
    expect(mutation.statusCode.value).toBe(403);
  });

  it('limite les rejeux demandés par onErrorCallback', async () => {
    request.mockRejectedValue(httpError(401));
    const onErrorCallback = vi.fn(async () => 'REFRESH' as const);
    const mutation = useRawMutation({ key: ['loop'], onErrorCallback });

    await mutation.send('POST', '/loop', {});

    expect(onErrorCallback).toHaveBeenCalledTimes(3);
    expect(request).toHaveBeenCalledTimes(4);
    expect(mutation.isError.value).toBe(true);
  });

  it('respecte minDelay et setOptions', async () => {
    request.mockResolvedValue({ data: {} });
    const mutation = useRawMutation({ key: ['slow'] });
    mutation.setOptions({ minDelay: 40 });

    const start = Date.now();
    await mutation.send('POST', '/slow', {});

    expect(Date.now() - start).toBeGreaterThanOrEqual(35);
  });
});
