const ABSOLUTE_URL = /^https?:\/\//i;

/** Préfixe une URL relative par l'URI du backend ; une URL absolue (http/https) est renvoyée telle quelle. */
export const resolveUrl = (url: string, backendUri: string | undefined): string =>
  ABSOLUTE_URL.test(url) ? url : (backendUri ?? '') + url;
