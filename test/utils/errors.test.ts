import type { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { defaultRetryDelay, describeError, isServerError } from '../../src/runtime/utils/errors';
import { resolveUrl } from '../../src/runtime/utils/url';

const httpError = (status: number, data?: unknown, statusText = '') =>
  ({ response: { status, data, statusText }, message: `Request failed with status code ${status}` }) as AxiosError<{
    message?: string;
  }>;
const networkError = (message = 'Network Error') => ({ message }) as AxiosError<{ message?: string }>;

describe('isServerError', () => {
  it.each([500, 502, 503, 504])('considère HTTP %i comme une erreur serveur', (status) => {
    expect(isServerError(httpError(status))).toBe(true);
  });

  it('considère une erreur sans réponse (réseau) comme une erreur serveur', () => {
    expect(isServerError(networkError())).toBe(true);
  });

  it.each([400, 401, 403, 404, 409, 422, 501])('ne relance pas HTTP %i', (status) => {
    expect(isServerError(httpError(status))).toBe(false);
  });
});

describe('defaultRetryDelay', () => {
  it('double le délai à chaque tentative et plafonne à 4 s', () => {
    expect([1, 2, 3, 4, 10].map(defaultRetryDelay)).toEqual([1000, 2000, 4000, 4000, 4000]);
  });
});

describe('describeError', () => {
  it('privilégie le message renvoyé par le backend', () => {
    expect(describeError(httpError(422, { message: 'Slug déjà utilisé' }, 'Unprocessable Entity'))).toEqual({
      statusCode: 422,
      message: 'Slug déjà utilisé',
    });
  });

  it('se rabat sur le statusText, puis sur un message générique', () => {
    expect(describeError(httpError(404, undefined, 'Not Found'))).toEqual({ statusCode: 404, message: 'Not Found' });
    expect(describeError(httpError(500))).toEqual({ statusCode: 500, message: 'Une erreur est survenue' });
  });

  it("renvoie le message de l'erreur réseau, sans code HTTP", () => {
    expect(describeError(networkError('timeout of 5000ms exceeded'))).toEqual({
      statusCode: null,
      message: 'timeout of 5000ms exceeded',
    });
    expect(describeError(networkError(''))).toEqual({ statusCode: null, message: 'Une erreur inconnue est survenue' });
  });
});

describe('resolveUrl', () => {
  it("préfixe une URL relative par l'URI du backend", () => {
    expect(resolveUrl('/collections', 'https://api.example.test')).toBe('https://api.example.test/collections');
  });

  it('laisse une URL absolue intacte, quelle que soit la casse du schéma', () => {
    expect(resolveUrl('https://cdn.example.test/a.png', 'https://api.example.test')).toBe(
      'https://cdn.example.test/a.png',
    );
    expect(resolveUrl('HTTP://legacy.example.test', 'https://api.example.test')).toBe('HTTP://legacy.example.test');
  });

  it('ne confond pas une route relative contenant « http » avec une URL absolue', () => {
    expect(resolveUrl('/proxy/http-logs', 'https://api.example.test')).toBe('https://api.example.test/proxy/http-logs');
  });

  it("garde l'URL relative si aucun backend n'est configuré", () => {
    expect(resolveUrl('/collections', undefined)).toBe('/collections');
  });
});
