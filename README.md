# @miinded/nuxt-api

[![npm version](https://img.shields.io/npm/v/@miinded/nuxt-api.svg)](https://www.npmjs.com/package/@miinded/nuxt-api)
[![license](https://img.shields.io/npm/l/@miinded/nuxt-api.svg)](./LICENSE)
[![Quality](https://github.com/Miinded/nuxt-api/actions/workflows/quality.yml/badge.svg)](https://github.com/Miinded/nuxt-api/actions/workflows/quality.yml)
[![codecov](https://codecov.io/gh/Miinded/nuxt-api/graph/badge.svg)](https://codecov.io/gh/Miinded/nuxt-api)
[![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt.js)](https://nuxt.com)

A [Nuxt](https://nuxt.com) module that provides typed composables to **query and mutate a REST API** with a shared,
reactive request cache backed by [Pinia](https://pinia.vuejs.org).

Every request is stored under a **cache key**. Components that use the same key share the same data, loading and
error state; invalidating a key (or a key prefix) refetches every mounted query that depends on it.

## Features

- `useQuery` / `useRawQuery` — GET requests with a reactive cache, fetch on mount and automatic refetch on invalidation.
- `useMutation` / `useRawMutation` — POST, PUT, PATCH and DELETE that write their result into the cache.
- Hierarchical cache keys (`['collection', id, 'drop']`) with exact or prefix invalidation, made of strings, numbers or
  refs.
- Relative URLs resolved against `runtimeConfig.public.BACKEND_URI`.
- Error state (`isError`, `statusCode`, backend `message`), token renewal hook (`onErrorCallback`) and optional retries
  with exponential backoff on server errors.
- `minDelay` to avoid flashes of loading states on fast responses.

## Requirements

| Package | Version |
| ------- | ------- |
| Node.js | `>= 24` |
| Nuxt    | `4`     |
| Vue     | `3.5`   |
| Pinia   | `3`     |

## Installation

```bash
pnpm add @miinded/nuxt-api pinia
# or
npm install @miinded/nuxt-api pinia
```

`@pinia/nuxt` is installed with the module; it must be declared in `modules` (the module refuses to start in
development without it):

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', '@miinded/nuxt-api'],
  runtimeConfig: {
    public: {
      // prefix of every relative URL given to useQuery / useMutation
      BACKEND_URI: process.env.NUXT_PUBLIC_BACKEND_URI,
    },
  },
  miindedApi: {
    enableLogs: false, // log the module's internal steps in the console
  },
});
```

The composables and the `UseRawQueryOnErrorAction` enum are auto-imported.

## Usage

### Fetching data

```vue
<script setup lang="ts">
type Collection = { id: string; name: string };

const route = useRoute();
const id = computed(() => route.params.id as string);

// GET {BACKEND_URI}/collection/:id, cached under ['collection', id]
const { data, isLoading, isError, error, refetch } = useQuery<Collection>(
  computed(() => `/collection/${id.value}`),
  ['collection', id],
);
</script>

<template>
  <p v-if="isLoading">Loading…</p>
  <p v-else-if="isError">{{ error }}</p>
  <h1 v-else-if="data">{{ data.name }}</h1>
</template>
```

`useQuery(url, key, initialValue?, options?)` fetches on mount unless the cache entry is still valid
(`fetchOnMount: false` disables it). `data` returns `initialValue` until the first response.

### Mutating data

```ts
const { put, remove, isLoading: isSaving, isError, error } = useMutation(['collection', id]);

await put(`/collection/${id.value}`, { name: 'New name' }); // response stored under ['collection', id]
await remove(`/collection/${id.value}`); // entry marked as deleted
```

`post`, `put` and `patch` take `(url, body, headers?)`; `remove` takes `(url, headers?)`.

### Cache keys and invalidation

```ts
const cache = useQueryCache();

cache.invalid(['collection']); // the entry and all its children (['collection', '42'], ['collection', '42', 'drop']…)
cache.invalid(['collection'], { exact: true }); // only ['collection']
```

Mounted queries whose entry becomes invalid refetch automatically. A cache entry expires after 30 seconds by default
(`cacheDuration`, in milliseconds).

### Errors, token renewal and retries

```ts
const { data } = useQuery('/me', ['me'], undefined, {
  authToken: computed(() => ({ Authorization: `Bearer ${session.value.accessToken}` })),

  // called on any error, at most 3 times in a row
  onErrorCallback: async (error) => {
    if (error.response?.status === 401) {
      await renewToken();
      return UseRawQueryOnErrorAction.REFRESH; // replay the request ('REFRESH' also works)
    }
    return UseRawQueryOnErrorAction.NOTHING; // handle the error normally; CANCEL drops it silently
  },

  // replay network errors and HTTP 500/502/503/504, 1 s, 2 s then 4 s apart
  retry: {
    max: 3,
    onRetry: (attempt, error) => console.warn(`Server unavailable, retry #${attempt}`, error.message),
  },
});
```

On failure, `isError` is `true`, `statusCode` holds the HTTP status (`null` for network errors) and `error` holds the
`message` returned by the backend, or the HTTP status text.

### Raw composables

`useRawQuery` and `useRawMutation` are the building blocks of `useQuery` and `useMutation`: they take absolute URLs and
do not read `BACKEND_URI`.

```ts
const query = useRawQuery<Drop>({ key: ['drop', slug], url: 'https://api.example.com/drop/poc/status' });
const mutation = useRawMutation({ key: ['drop', slug] });
await mutation.send('POST', 'https://api.example.com/drop', { name: 'poc' });
```

## API

### Query options (`useQuery`, `useRawQuery`)

| Option            | Type                                               | Default | Description                                                |
| ----------------- | -------------------------------------------------- | ------- | ---------------------------------------------------------- |
| `fetchOnMount`    | `boolean`                                          | `true`  | Fetch when the component mounts if the cache is stale      |
| `minDelay`        | `number` (ms)                                      | `0`     | Minimum duration of a request                              |
| `cacheDuration`   | `number` (ms)                                      | `30000` | Lifetime of the cache entry                                |
| `headers`         | `Record<string, string>` or ref                    | `{}`    | Extra request headers                                      |
| `authToken`       | `Record<string, string>` or ref                    | —       | Authorization headers, merged into every request           |
| `onErrorCallback` | `(error) => Promise<UseRawQueryOnErrorActionType>` | —       | `REFRESH`, `CANCEL` or `NOTHING`, at most 3 in a row       |
| `retry`           | `{ max, delay?, onRetry? }`                        | —       | Retries on server and network errors (disabled by default) |

`useMutation` accepts the same options except `fetchOnMount` and `headers`.

### Query return (`useQuery`, `useRawQuery`)

| Property     | Type                            | Description                                                   |
| ------------ | ------------------------------- | ------------------------------------------------------------- |
| `data`       | `ComputedRef<T \| undefined>`   | Cached data, or `initialValue`                                |
| `isLoading`  | `ComputedRef<boolean>`          | A request is in progress for this key                         |
| `isError`    | `ComputedRef<boolean>`          | The last request for this key failed                          |
| `error`      | `Ref<string \| null>`           | Message of the last error                                     |
| `statusCode` | `Ref<number \| null>`           | HTTP status of the last error                                 |
| `refetch`    | `() => Promise<T \| undefined>` | Send the request unconditionally                              |
| `refresh`    | `() => Promise<void>`           | Send it only if the cache is stale and nothing is in progress |
| `cache`      | `ApiCacheStore`                 | The shared cache store                                        |
| `setOptions` | `(options) => void`             | Update the options of this query                              |

### Mutation return (`useMutation`, `useRawMutation`)

`isLoading`, `isError`, `error`, `statusCode` (refs), `cache`, `setOptions`, `send(method, url, body, headers?)`, and
for `useMutation`: `post`, `put`, `patch`, `remove`.

## Migrating from 0.x

- Nuxt 4 is required; `nuxt`, `vue` and `pinia` are now **peer dependencies**.
- `ApiCacheStore['refCache']` is typed as the plain object exposed by Pinia (it was wrongly typed as a `Ref`).
- `UseRawQueryOnErrorAction` is an auto-imported enum; the string values (`'REFRESH'`, `'CANCEL'`, `'NOTHING'`) are
  still accepted.
- A URL is considered absolute only when it starts with `http://` or `https://` (any URL containing `htt` was).
- `useRawMutation` now sets `isError` and exposes `error` and `statusCode`; `useRawQuery` exposes `error`, `statusCode`
  and `refresh`.
- A query mounted on a still valid cache entry now refetches when that entry is invalidated.
- Published on npm: remove the GitLab registry lines (`@miinded:registry=…`) from your `.npmrc`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
