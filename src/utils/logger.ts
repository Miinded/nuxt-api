import { useRuntimeConfig } from '#imports';
import pkg from '../../package.json';

export const log = (message: string) => {
  const config = useRuntimeConfig();

  const { enableLogs } = config.public.miindedApi || { enableLogs: false };

  if (enableLogs) {
    console.log(`[${pkg.name}] ${message}`);
  }
};

export const logWarn = (message: string) => {
  console.warn(`[${pkg.name}] ${message}`);
};

export const logError = (message: string) => {
  console.error(`[${pkg.name}] ${message}`);
};
