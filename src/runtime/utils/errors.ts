import type { AxiosError } from 'axios';

const SERVER_ERROR_STATUSES = [500, 502, 503, 504];

/** Erreur côté serveur ou réseau : aucune réponse, ou HTTP 500, 502, 503, 504 */
export const isServerError = (error: AxiosError): boolean =>
  !error.response || SERVER_ERROR_STATUSES.includes(error.response.status);

/** Backoff exponentiel : 1 s, 2 s, 4 s, puis plafonné à 4 s */
export const defaultRetryDelay = (attempt: number): number => Math.min(1000 * 2 ** (attempt - 1), 4000);

/** Code HTTP et message lisible d'une erreur ; le message renvoyé par le backend est prioritaire */
export const describeError = (
  error: AxiosError<{ message?: string }>,
): { statusCode: number | null; message: string } => {
  if (error.response) {
    return {
      statusCode: error.response.status,
      message: error.response.data?.message || error.response.statusText || 'Une erreur est survenue',
    };
  }
  return { statusCode: null, message: error.message || 'Une erreur inconnue est survenue' };
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
