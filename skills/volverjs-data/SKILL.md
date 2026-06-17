---
name: volverjs-data
description: >-
  Write code that consumes REST APIs with @volverjs/data — the repository-pattern
  data layer built on a tiny fetch/ky HttpClient. Use this skill whenever the user
  is building HTTP/API access in a project that depends on @volverjs/data, or
  mentions HttpClient, RepositoryHttp, UrlBuilder, Hash, or the Vue composables
  useHttpClient / useRepositoryHttp / createHttpClient. Trigger it for tasks like
  "fetch users from the API", "create a repository for this resource", "build a
  URL with query params", "do CRUD against my REST endpoint", "set the bearer
  token", or "make this request reactive in my Vue component" — even when the
  library is not named explicitly but the project already uses it.
---

# @volverjs/data

`@volverjs/data` is a small data-access layer for REST APIs. It exports four classes
and a Vue 3 integration:

| Class | Purpose |
| --- | --- |
| `HttpClient` | Thin wrapper around [`ky`](https://github.com/sindresorhus/ky) (fetch). Makes requests and builds URLs. |
| `RepositoryHttp` | Repository-pattern CRUD layer over `HttpClient` (`read`/`create`/`update`/`remove`). |
| `UrlBuilder` | Builds URLs from a template + params, encoding the query string with [`qs`](https://github.com/ljharb/qs). |
| `Hash` | Static string-hash helpers (`cyrb53`, `djb2`). Used internally for request de-duplication. |

```typescript
import { Hash, HttpClient, HTTPError, RepositoryHttp, TimeoutError, UrlBuilder } from '@volverjs/data'
```

Vue 3 helpers live in a separate subpath:

```typescript
import { createHttpClient, removeHttpClient, useHttpClient, useRepositoryHttp } from '@volverjs/data/vue'
```

## Choosing the right tool

- **One-off request, or a request not shaped like a CRUD resource** → use `HttpClient` directly.
- **A REST resource you read/create/update/delete repeatedly** → wrap it in a `RepositoryHttp`. It maps responses to typed items, manages metadata, and de-duplicates concurrent reads.
- **Just need a URL string** (e.g. for a link, a `<form action>`, or a third-party fetch) → use `UrlBuilder`.
- **Inside a Vue 3 component** → use the composables (`useHttpClient`, `useRepositoryHttp`). They return reactive `isLoading`/`isError`/`error`/`data` refs so you don't hand-roll request state.

When the task is non-trivial or you need exact option names, read the matching file in `references/` — the tables there are the source of truth. Don't guess option names; `@volverjs/data` v3 renamed several (see "Common pitfalls").

## HttpClient — quick start

```typescript
import { HttpClient } from '@volverjs/data'

const client = new HttpClient({ prefix: 'https://my.api.com' })

// Plain string URL (resolved against `prefix`)
const res = await client.get('users/1')
const user = await res.json<User>()

// Template + params: path placeholders are filled, leftover keys become the query string
const res2 = await client.get({
  template: ':endpoint/:id',
  params: { endpoint: 'users', id: 1, _limit: 10, _page: 1 },
})
// → GET https://my.api.com/users/1?_limit=10&_page=1
```

Key things to know:

- Verb methods: `get`, `post`, `put`, `patch`, `delete`, `head`. Each takes `(url, options?)` and returns a ky `ResponsePromise` — call `.json<T>()`, `.text()`, `.blob()` on the awaited response (or directly on the promise: `await client.get('users').json<User[]>()`).
- Send a JSON body with the `json` option: `client.post('users', { json: { name: 'Ada' } })`. Don't `JSON.stringify` it yourself.
- `client.request(method, url, options)` returns `{ responsePromise, abort, signal }` — use it when you need to **cancel** a request.
- Auth: `client.setBearerToken(token)` sets `Authorization: Bearer <token>` on every subsequent request. Pass `null`/`undefined` to clear it.
- Errors throw by default (`throwHttpErrors: true`). A non-2xx response throws `HTTPError`; a timeout throws `TimeoutError`. Catch them, or set `throwHttpErrors: false` to inspect the response yourself.
- `extend(options)` mutates the client in place; `clone(options)` returns a new independent client.

Full option reference (all ky + qs options, hooks, retry, timeout, progress): **read [references/http-client.md](references/http-client.md)**.

## UrlBuilder — quick start

```typescript
import { UrlBuilder } from '@volverjs/data'

UrlBuilder.build(':resource/:id?', { resource: 'users', id: 1, q: 'ada' })
// → 'users/1?q=ada'

UrlBuilder.build(':resource/:id?', { resource: 'users', q: 'ada' })
// → 'users?q=ada'   (optional :id? is dropped when missing)
```

Template rules:

- `:name` is a **required** path parameter — throws if the value is missing/empty.
- `:name?` is **optional** — silently omitted when the param is absent.
- Any param **not** consumed by a placeholder is appended to the **query string** (encoded with `qs`).
- Query defaults: `arrayFormat: 'comma'`, `skipNulls: true`, `encodeValuesOnly: true`, `format: 'RFC1738'`. Override per call or per instance.

Use the static `UrlBuilder.build(...)` for one-offs, or `new UrlBuilder(options)` when you want shared query-encoding options. Details and qs options: **[references/url-builder.md](references/url-builder.md)**.

## RepositoryHttp — quick start

```typescript
import { HttpClient, RepositoryHttp } from '@volverjs/data'

const client = new HttpClient({ prefix: 'https://my.api.com' })

interface User { id: number, name: string }

const usersRepo = new RepositoryHttp<User>(client, 'users/:id?')

// READ a list (no id) — params beyond the template become query params
const { responsePromise } = usersRepo.read({ _page: 1 })
const { ok, data, item, metadata } = await responsePromise
// data: User[]   item: data[0]   metadata: e.g. { total } from X-Total-Count

// READ one
const { item: one } = await usersRepo.read({ id: 1 }).responsePromise

// CREATE / UPDATE pass the payload first, params second
await usersRepo.create({ name: 'Ada' }).responsePromise
await usersRepo.update({ name: 'Ada L.' }, { id: 1 }).responsePromise

// DELETE
await usersRepo.remove({ id: 1 }).responsePromise
```

Every method returns `{ responsePromise, abort, signal }`. The resolved value is
`{ ok, data?, item?, metadata?, aborted?, abortReason? }` (`remove` resolves to `{ ok }`).

Essentials:

- **`read` de-duplicates concurrent identical requests** by hashing the params. Two `read({ id: 1 })` calls in flight share one network request. Pass `{ key: false }` to opt out, or a custom `key` to control the cache bucket.
- **Map raw responses to a class** with `{ class: User }`, or to anything with `{ responseAdapter: raw => [...] }` (must return an array). Use `responseAdapter` when the server's shape differs from your model — type the second generic: `RepositoryHttp<User, ApiUser>`.
- Transform outgoing bodies with `requestAdapter`; extract custom pagination/metadata with `metadataAdapter`.
- The template follows `UrlBuilder` rules — `users/:id?` handles both the collection and the single item.

Full options table (adapters, `class`, `httpClientScope`, `httpClientOptions`, `hashFunction`, abort/cancel): **[references/repository-http.md](references/repository-http.md)**.

## Vue 3 integration

Register a client once at app start, then consume it reactively in components.

```typescript
// main.ts
import { createHttpClient } from '@volverjs/data/vue'
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.use(createHttpClient({ prefix: 'https://my.api.com' }))
```

```vue
<script setup lang="ts">
import { useRepositoryHttp } from '@volverjs/data/vue'

interface User { id: number, name: string }

// Reactive CRUD — no manual loading/error refs
const { read } = useRepositoryHttp<User>('users/:id')
const { isLoading, isError, error, item, execute } = read({ id: 1 }, { immediate: false })
</script>

<template>
  <button @click="execute()">Load</button>
  <p v-if="isLoading">Loading…</p>
  <p v-else-if="isError">{{ error }}</p>
  <p v-else-if="item">{{ item.name }}</p>
</template>
```

The composables (`useHttpClient`, `useRepositoryHttp`) return reactive helpers
(`requestGet`/`requestPost`/… and `read`/`create`/`update`/`remove`) that each expose
`{ isLoading, isError, isSuccess, error, data, execute, ... }`. Requests run immediately
unless you pass `{ immediate: false }` and call `execute()` yourself. Multiple named API
backends are supported via `scope`. Full patterns (immediate vs deferred, reactive params,
`responseAdapter` typing, scopes): **[references/vue.md](references/vue.md)**.

## Common pitfalls

- **`prefix`, not `prefixUrl`.** v3 renamed the base-URL option to `prefix` (and upgraded to ky 2.x). Older snippets using `prefixUrl` are wrong for current versions.
- **With a `prefix`, use relative paths** (`'users/1'`, not `'/users/1'`). A leading slash is stripped, but write paths relative to the prefix to be safe.
- **`searchParams` is qs config, not the params themselves.** In `@volverjs/data` you pass query values inside the URL template's `params` (or as extra repository params); the `searchParams` option only configures *how* the query is encoded.
- **Responses throw on HTTP errors by default.** Wrap calls in `try/catch` for `HTTPError`, or check `ok` only after setting `throwHttpErrors: false`.
- **`create`/`update` take the payload first**, then params: `repo.update(payload, { id })`. Easy to flip.
- **Don't pre-stringify JSON bodies.** Pass an object to the `json` option and let the client serialize it.
