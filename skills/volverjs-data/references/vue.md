# Vue 3 integration reference

Import from `@volverjs/data/vue`. The integration registers one or more `HttpClient`
instances on the app and exposes composables that wrap requests in reactive state.

## Contents

- [Setup: createHttpClient](#setup-createhttpclient)
- [useHttpClient](#usehttpclient)
- [request helpers](#request-helpers)
- [useRepositoryHttp](#userepositoryhttp)
- [Reactive params and immediate](#reactive-params-and-immediate)
- [Scopes (multiple backends)](#scopes-multiple-backends)
- [Reactive state shape](#reactive-state-shape)

## Setup: createHttpClient

`createHttpClient(options?)` returns a Vue plugin **and** registers the client in an internal
map (default scope `'global'`). Install it once:

```typescript
import { createHttpClient } from '@volverjs/data/vue'
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
const httpClient = createHttpClient({ prefix: 'https://my.api.com' })
app.use(httpClient, { globalName: 'vvHttp' }) // optional; exposes $vvHttp in Options API
```

`options` are `HttpClientInstanceOptions` plus an optional `scope`. Creating a second client
with an existing scope throws (`httpClient with scope <scope> already exist`).

## useHttpClient

```typescript
const { client, request, requestGet, requestPost, requestPut, requestPatch, requestHead, requestDelete } = useHttpClient()
```

- `client` — the raw `HttpClient` (for manual, non-reactive calls).
- `request(method, url, options)` and the `request*` shortcuts return **reactive** request objects.

Throws `HttpClient instance not found` if no client was created for the scope. `useHttpClient('apiV2')` selects a named scope.

## request helpers

```vue
<script setup lang="ts">
import { useHttpClient } from '@volverjs/data/vue'

interface User { id: number, name: string }

const { requestGet } = useHttpClient()
const { isLoading, isError, isSuccess, error, data, execute } = requestGet<User>('users/1', { immediate: false })
</script>

<template>
  <button @click="execute()">Load</button>
  <p v-if="isLoading">Loading…</p>
  <p v-else-if="isError">{{ error }}</p>
  <p v-else-if="isSuccess">{{ data?.name }}</p>
</template>
```

POST/PUT with a body — pass `json`, and use a `computed` so the body stays reactive:

```vue
<script setup lang="ts">
import { useHttpClient } from '@volverjs/data/vue'
import { computed, ref } from 'vue'

const form = ref({ name: '' })
const { requestPost } = useHttpClient()
const { isLoading, isSuccess, error, execute } = requestPost('users',
  computed(() => ({ immediate: false, json: form.value })),
)
</script>
```

## useRepositoryHttp

```typescript
const { repository, read, create, update, remove } = useRepositoryHttp<User>('users/:id', options?)
```

- `repository` — the raw `RepositoryHttp` instance.
- `read`/`create`/`update`/`remove` — reactive wrappers returning the [state shape](#reactive-state-shape).

```vue
<script setup lang="ts">
import { useRepositoryHttp } from '@volverjs/data/vue'

interface User { id: number, name: string }

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

Read + update on the same item (deferred update, run on submit):

```vue
<script setup lang="ts">
import { useRepositoryHttp } from '@volverjs/data/vue'
import { computed } from 'vue'

interface User { id: number, name: string }

const { read, update } = useRepositoryHttp<User>('users/:id?')
const { isLoading: isReading, error: readError, item } = read({ id: 1 })
const { isLoading: isUpdating, error: updateError, execute } = update(item, { id: 1 }, { immediate: false })

const isLoading = computed(() => isReading.value || isUpdating.value)
const error = computed(() => updateError.value || readError.value)
</script>

<template>
  <form @submit.prevent="execute()">
    <input v-if="item" v-model="item.name">
    <button :disabled="isLoading" type="submit">Save</button>
  </form>
</template>
```

For server shapes that differ from your model, pass the second generic + `responseAdapter`
(now typed): `useRepositoryHttp<IUser, ApiUser>('users/:id', { responseAdapter: raw => [...] })`.

## Reactive params and immediate

- `{ immediate: true }` (default) runs the request when the composable is created. The reactive
  state (`isLoading`, `data`, …) is spread in immediately.
- `{ immediate: false }` defers it — call `execute()` to run.
- `execute(...overrides)` accepts positional overrides matching the method's args, so you can
  re-run with new params/payload: `read` → `execute(newParams, newOptions)`,
  `update` → `execute(newPayload, newParams, newOptions)`.
- `params`/`payload`/`options` may be refs or `computed` — they're unwrapped at execution time,
  so the latest values are used.

## Scopes (multiple backends)

```typescript
// Register a second API
createHttpClient({ scope: 'apiV2', prefix: 'https://my.api.com/v2' })

// Use it
const { requestGet } = useHttpClient('apiV2')
const { read } = useRepositoryHttp<User>('users/:id', { httpClientScope: 'apiV2' })

// Remove it (the 'global' scope cannot be removed)
removeHttpClient('apiV2')
```

The scope map is **not** reactive — a client used before `removeHttpClient` is not destroyed.

## Reactive state shape

`request*` helpers expose:

| Field | Type | Notes |
| --- | --- | --- |
| `isLoading` / `isError` / `isSuccess` | `ComputedRef<boolean>` | Mutually exclusive status flags. |
| `error` | readonly `Ref<HTTPError \| undefined>` | Populated on failure. |
| `response` | `Ref<Response \| undefined>` | Raw response. |
| `data` | `Ref<T \| undefined>` | Parsed `.json()` body. |
| `execute(url?, options?)` | function | Returns `{ responsePromise, abort, signal }`. |

`read`/`create`/`update`/`remove` expose `isLoading`/`isError`/`isSuccess`/`error`/`execute`, plus:

- `data: Ref<T[]>` and `metadata: Ref<ParamMap>` for `read`/`create`/`update`;
- `item: Ref<T>` (first item) for `read`;
- `remove` has no `data`/`item`/`metadata`.

`execute()` returns `{ responsePromise, abort, signal }` for manual cancellation.
