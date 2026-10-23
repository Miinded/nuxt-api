// Remplace l'import virtuel `#app` de Nuxt : un plugin Nuxt est une simple fonction (nuxtApp) => void
export const defineNuxtPlugin = <T>(plugin: T): T => plugin;
