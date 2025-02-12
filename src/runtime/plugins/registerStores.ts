import { defineNuxtPlugin } from '#app';
import { createPinia, setActivePinia, type Pinia } from 'pinia';

// Importer les stores à enregistrer
import { apiCacheStore } from '../stores/api-cache.store';
import { log } from '../../utils/logger';

export default defineNuxtPlugin((nuxtApp) => {
  let pinia: Pinia;

  // Vérifier si l'instance de Pinia existe déjà
  if (nuxtApp.$pinia) {
    pinia = nuxtApp.$pinia as Pinia;
    log(`Pinia détecté, utilisation de l'instance existante.`);
  } else {
    log(`Aucune instance Pinia détectée, création d'une nouvelle instance...`);
    pinia = createPinia();
    nuxtApp.vueApp.use(pinia); // Installer Pinia dans Vue
  }

  // Définir Pinia comme instance active
  setActivePinia(pinia);

  // Enregistrer les stores dans Pinia
  apiCacheStore(pinia);

  log(`Stores enregistrés dans Pinia`);
});
