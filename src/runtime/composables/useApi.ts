import { ref, computed } from 'vue';

export function useApi<U = any>(baseURL: string) {
  const error = ref<string | null>(null);
  const isLoading = ref(false);
  const isFetching = ref(false);
  const isError = ref(false);
  const statusCode = ref<number | null>(null); // Ajouter une ref pour le code d'état HTTP

  // Fonction générique pour les requêtes
  const send = async <T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    params?: U,
    options?: {
      headers?: Record<string, string>; // Configuration des headers
      minDelay?: number; // Délai minimal (défaut : 250 ms)
    },
  ): Promise<T | null> => {
    const { headers = {}, minDelay = 0 } = options || {};
    const data = ref<T | null>(null);

    isLoading.value = true;
    isFetching.value = true;
    isError.value = false;
    statusCode.value = null;

    const startTime = performance.now();
    try {
      const result = await $fetch<T>(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        baseURL,
        body: params ? JSON.stringify(params) : undefined, // Pour POST/PUT
      });

      data.value = result;
    } catch (err: any) {
      isError.value = true;
      // Gérer les erreurs HTTP et extraire le statusCode
      if (err.response) {
        statusCode.value = err.response.status;
        error.value = err.response.statusText || 'Une erreur est survenue';
      } else {
        error.value = err.message || 'Une erreur inconnue est survenue';
      }
    } finally {
      if (minDelay > 0) {
        const elapsedTime = performance.now() - startTime;
        const remainingTime = minDelay - elapsedTime;
        if (remainingTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }
      }

      isFetching.value = false;
      isLoading.value = false;
    }

    return data.value;
  };

  // Méthodes spécifiques pour chaque type de requête
  const get = <T>(url: string, params?: U, options?: { headers?: Record<string, string>; minDelay?: number }) => send<T>('GET', url, params, options);
  const post = <T>(url: string, params?: U, options?: { headers?: Record<string, string>; minDelay?: number }) => send<T>('POST', url, params, options);
  const put = <T>(url: string, params?: U, options?: { headers?: Record<string, string>; minDelay?: number }) => send<T>('PUT', url, params, options);
  const del = <T>(url: string, params?: U, options?: { headers?: Record<string, string>; minDelay?: number }) => send<T>('DELETE', url, params, options);

  return {
    error: computed(() => ({
      statusMessage: error.value,
      statusCode: statusCode.value,
    })),
    isLoading: computed(() => isLoading.value),
    isFetching: computed(() => isFetching.value),
    isError: computed(() => isError.value),
    get,
    post,
    put,
    del,
  };
}
