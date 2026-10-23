import { createPinia, getActivePinia, setActivePinia, type Pinia } from 'pinia';
import { afterEach, describe, expect, it, vi } from 'vitest';
import plugin, { log } from '../src/runtime/plugins/registerStores';
import { runtimeConfig } from './stubs/imports';

type FakeNuxtApp = { $pinia?: Pinia; vueApp: { use: ReturnType<typeof vi.fn> } };
const runPlugin = plugin as unknown as (nuxtApp: FakeNuxtApp) => void;

describe('plugin registerStores', () => {
  afterEach(() => {
    runtimeConfig.public.miindedApi.enableLogs = false;
    vi.restoreAllMocks();
  });

  it("réutilise l'instance Pinia de l'application", () => {
    const pinia = createPinia();
    const nuxtApp: FakeNuxtApp = { $pinia: pinia, vueApp: { use: vi.fn() } };

    runPlugin(nuxtApp);

    expect(nuxtApp.vueApp.use).not.toHaveBeenCalled();
    expect(getActivePinia()).toBe(pinia);
  });

  it("crée et installe Pinia quand l'application n'en a pas", () => {
    setActivePinia(undefined);
    const nuxtApp: FakeNuxtApp = { vueApp: { use: vi.fn() } };

    runPlugin(nuxtApp);

    expect(nuxtApp.vueApp.use).toHaveBeenCalledTimes(1);
    expect(getActivePinia()).toBe(nuxtApp.vueApp.use.mock.calls[0]![0]);
  });

  it("n'écrit dans la console que si enableLogs est activé", () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    log('silencieux');
    expect(consoleLog).not.toHaveBeenCalled();

    runtimeConfig.public.miindedApi.enableLogs = true;
    log('visible');
    expect(consoleLog).toHaveBeenCalledWith('[@miinded/nuxt-api] visible');
  });
});
