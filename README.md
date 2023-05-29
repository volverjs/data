[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=volverjs_data&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=volverjs_data) [![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=volverjs_data&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=volverjs_data) [![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=volverjs_data&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=volverjs_data) [![Depfu](https://badges.depfu.com/badges/c83e840404329198d06ce36a5c33f9fd/status.svg)](https://depfu.com) [![Depfu](https://badges.depfu.com/badges/c83e840404329198d06ce36a5c33f9fd/overview.svg)](https://depfu.com/github/volverjs/data?project_id=38575)

<div align="center">
  
[![volverjs](docs/static/volverjs-data.svg)](https://volverjs.github.io/data)

## @volverjs/data

`repository` `http-client` `url-builder` `fetch`

<br>

#### proudly powered by

<br>

[![24/Consulting](docs/static/24consulting.svg)](https://24consulting.it)

<br>

</div>

## Install

```bash
# pnpm
pnpm add @volverjs/data

# yarn
yarn add @volverjs/data

# npm
npm install @volverjs/data --save
```

## Usage

This library exports four main classes: `Hash`, `UrlBuilder`, `HttpClient` and `RepositoryHttp`.

```typescript
import { Hash, UrlBuilder, HttpClient, RepositoryHttp } from '@volverjs/data'
```

### Hash

The `Hash` class provides some static functions to generate hashes.

```typescript
import { Hash } from '@volverjs/data'
const hash = Hash.cyrb53('hello world')
```

### UrlBuilder

The `UrlBuilder` class provides a way to build URLs with template parameters and query string.

```typescript
import { UrlBuilder } from '@volverjs/data'

const urlBuilder = new UrlBuilder({
  encodeValuesOnly: false
})
const url = urlBuilder.build('https://my.api.com/:endpoint', {
  endpoint: 'users',
  _limit: 10,
  _page: 1
})
// url = 'https://my.api.com/users?_limit=10&_page=1'
```

Instead of `URLSearchParams`, the query parameters are automatically encoded using [`qs`](https://github.com/ljharb/qs) library.
Please refer to the `UrlBuilder` [`docs`](/docs/UrlBuilder.md) for more informations.

### HttpClient

The `HttpClient` class is a wrapper around [`ky`](https://github.com/sindresorhus/ky), a client based on `fetch` API . It provides a simple interface to make HTTP requests and uses `UrlBuilder` to build URLs.

```typescript
import { HttpClient } from '@volverjs/data'

const client = new HttpClient({
  prefixUrl: 'https://my.api.com'
})
const response = await client.get({
  template: ':endpoint/:action?/:id',
  params: {
    endpoint: 'users',
    id: 1,
    _limit: 10,
    _page: 1
  }
})
// fetch('https://my.api.com/users/1?_limit=10&_page=1', { method: 'GET' })
```

Please refer to the `HttpClient` [`docs`](/docs/HttpClient.md) for more informations.

### RepositoryHttp

The `RepositoryHttp` class is an implementation of the `Repository` interface for http requests using `HttpClient`. It was designed with the repository pattern in mind to provide a simple way to make CRUD operations on a REST API.

```typescript
import { HttpClient, RepositoryHttp } from '@volverjs/data'

class User {
  id: number
  name: string
  surname: string
  constructor(data: { id: number; name: string; surname: string }) {
    this.id = data.id
    this.name = data.name
    this.email = data.email
  }
  get fullName() {
    return `${this.name} ${this.surname}`
  }
}

const client = new HttpClient({
  prefixUrl: 'https://my.api.com'
})

const repository = new RepositoryHttp<User>(client, 'users/:group?/:id?', {
  class: User
})

const getAdminUsers: User[] = async () => {
  try {
    const { responsePromise } = repository.read({
      group: 'admin'
    })
    const { data } = await responsePromise
    return data
  } catch (error) {
    throw error
  }
}
```

Please refer to the `RepositoryHttp` [`docs`](/docs/RepositoryHttp.md) for more informations.

## Vue

You can use this library with Vue 3 with `@volverjs/data/vue`.

### Plugin

The `createHttpClient` function returns a plugin that can be installed in a Vue app and has a property with the `global` `httpClient` instance: `httpClientPlugin.globalInstance`.

```typescript
import { createApp } from 'vue'
import { createHttpClient } from '@volverjs/data/vue'
import App from './App.vue'

const app = createApp(App)
const httpClientPlugin = createHttpClient({
  prefixUrl: 'https://my.api.com'
})

app.use(httpClientPlugin, {
  globalName: 'vvHttp' // (optional) default: 'vvHttp'
})
```

With `app.use(httpClientPlugin)` the `HttpClient` instance will be available in all components as `$vvHttp` with Options API.
Use `globalName` to change the name `vvHttp`.

### Composition API

Alternatively, you can use the `useHttpClient()` and `useRepositoryHttp()` composables to get the `HttpClient` instance in a specific component.

#### `useHttpClient()`

If `HttpClientPlugin` is not created with `createHttpClient()` or the `httpClient` scope requested not exist (ex: `useHttpClient('instanceNotExist')`), then `useHttpClient()` throw the error `HttpClient instance not found`.

```vue
<script lang="ts">
  import { createHttpClient } from '@volverjs/data/vue'

  createHttpClient({
    prefixUrl: 'https://my.api.com'
  })
</script>

<script lang="ts" setup>
  import { ref, computed } from 'vue'
  import { useHttpClient } from '@volverjs/data/vue'

  const { client } = useHttpClient()
  const isLoading = ref(false)
  const isError = computed(() => error.value !== undefined)
  const error = ref()
  const data = ref<Data>()

  type User = {
    id: number
    name: string
  }

  const execute = async () => {
    isLoading.value = true
    error.value = undefined
    try {
      const response = await client.get('users/1')
      data.value = await response.json<User>()
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }
</script>

<template>
  <div>
    <button @click="execute()">Execute</button>
    <div v-if="isLoading">Loading...</div>
    <div v-if="isError">{{ error }}</div>
    <div v-if="data">{{ data.name }}</div>
  </div>
</template>
```

`useHttpClient()` also exposes `request()`, `requestGet()`, `requestPost()`, `requestPut()`, `requestPatch()` and `requestDelete()` methods. These methods are wrappers around the `HttpClient` methods with reactivity.

```vue
<script lang="ts" setup>
  import { useHttpClient } from '@volverjs/data/vue'

  type User = {
    id: number
    name: string
  }
  const { requestGet } = useHttpClient()
  const { isLoading, isError, isSuccess, error, data, execute } =
    requestGet<User>('users/1', {
      immediate: false
    })
</script>

<template>
  <div>
    <button @click="execute()">Execute</button>
    <div v-if="isLoading">Loading...</div>
    <div v-if="isError">{{ error }}</div>
    <div v-if="isSuccess">{{ data.name }}</div>
  </div>
</template>
```

Each method returns an object with the following properties:

- `isLoading`: a `computed` that indicates if the request is loading;
- `isError`: a `computed` that indicates if the request has failed;
- `isSuccess`: a `computed` that indicates if the request has succeeded;
- `error`: a readonly `ref` that contains the error message;
- `response`: a `ref` that contains the response;
- `data`: a `ref` that contains the response data (`.json()` function);
- `execute()`: a function that executes the request.

The request can be executed later by setting the `immediate` option to `false` (default: `true`).

```vue
<script lang="ts" setup>
  import { useHttpClient } from '@volverjs/data/vue'

  type User = {
    id: number
    name: string
  }

  const data = ref<Partial<User>>({ name: '' })

  const { requestPost } = useHttpClient()
  const { isLoading, isError, isSuccess, error, execute } = requestPost<User>(
    'users',
    computed(() => ({ immediate: false, json: data.value }))
  )
</script>

<template>
  <form @submit.prevent="execute()">
    <div v-if="isLoading">Loading...</div>
    <div v-if="isError">{{ error }}</div>
    <div v-if="isSuccess">Success!</div>
    <input type="text" v-model="data.name" />
    <button type="submit">Submit</button>
  </form>
</template>
```

The `execute()` function returns an object with the following properties:

- `responsePromise`: a `Promise` that resolves with the response;
- `abort`: a function that aborts the request;
- `signal`: an `AbortSignal` that can be used to check if the request has been aborted.

#### `useRepositoryHttp()`

To create a `RepositoryHttp` instance, you can use the `useRepositoryHttp()` composable.

##### Parameters

- `template`: `string | HttpClientUrlTemplate`,
- `options?`: `RepositoryHttpOptions`<Type>

##### Example 1

```vue
<script lang="ts" setup>
  import { ref, computed } from 'vue'
  import { useRepositoryHttp } from '@volverjs/data/vue'

  type User = {
    id: number
    name: string
  }

  const { repository } = useRepositoryHttp<User>('users/:id')
  const isLoading = ref(false)
  const isError = computed(() => error.value !== undefined)
  const error = ref()
  const data = ref()

  const execute = async () => {
    isLoading.value = true
    try {
      const { responsePromise } = repository.read({ id: 1 })
      const response = await responsePromise
      data.value = response.data
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }
</script>

<template>
  <div>
    <button @click="execute">Execute</button>
    <div v-if="isLoading">Loading...</div>
    <div v-if="isError">{{ error }}</div>
    <div v-if="data">{{ data.name }}</div>
  </div>
</template>
```

##### Example 2 - Typing server response for `responseAdapter`

```vue
<script lang="ts" setup>
  import { ref, computed } from 'vue'
  import { useRepositoryHttp } from '@volverjs/data/vue'

  interface IUser {
    id: number
    name: string
  }

  type UserResponse = {
    id: number
    firtname: string
    lastname: string
  }

  class User implements IUser {
    id: number
    name: string

    constructor(data: UserResponse) {
      this.id = data.id
      this.name = `${data.firtname} ${data.lastname}`
    }
  }

  const { repository } = useRepositoryHttp<IUser, UserResponse>('users/:id', {
    responseAdapter: (raw) => [new User(raw)] // -----> raw is type of UserResponse instead of "unknown"
  })
  const isLoading = ref(false)
  const isError = computed(() => error.value !== undefined)
  const error = ref()
  const data = ref()

  const execute = async () => {
    isLoading.value = true
    try {
      const { responsePromise } = repository.read({ id: 1 })
      const response = await responsePromise
      data.value = response.data
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }
</script>

<template>
  <div>
    <button @click="execute">Execute</button>
    <div v-if="isLoading">Loading...</div>
    <div v-if="isError">{{ error }}</div>
    <div v-if="data">{{ data.name }}</div>
  </div>
</template>
```

`useRepositoryHttp()` also exposes `create()`, `read()`, `update()` and `remove()` methods. These methods are wrappers around the `RepositoryHttp` methods with reactivity.

```vue
<script lang="ts" setup>
  import { useRepositoryHttp } from '@volverjs/data/vue'

  type User = {
    id: number
    name: string
  }

  const { read } = useRepositoryHttp<User>('users/:id')
  const { isLoading, isError, error, data, execute } = read(
    { id: 1 },
    { immediate: false }
  )
</script>

<template>
  <div>
    <button @click="execute">Execute</button>
    <div v-if="isLoading">Loading...</div>
    <div v-if="isError">{{ error }}</div>
    <div v-if="data">{{ data.name }}</div>
  </div>
</template>
```

Each method returns an object with the following properties:

- `isLoading`: a `computed` that indicates if the request is loading;
- `isSuccess`: a `computed` that indicates if the request has succeeded;
- `isError`: a `computed` that indicates if the request has failed;
- `error`: a readonly `ref` that contains the error message;
- `execute()`: a function that executes the request.

`create()`, `read()`, `update()` also return:

- `data` a `ref` that contains the response data;
- `metadata` a `ref` that contains the response metadata;

`read()` also returns:

- `item` a `ref` that contains the first item of the response data;

The request can be executed later by setting the `immediate` option to `false` (default: `true`).

```vue
<script lang="ts" setup>
  import { useRepositoryHttp } from '@volverjs/data/vue'
  import { computed } from 'vue'

  type User = {
    id: number
    name: string
  }

  const { read, update } = useRepositoryHttp<User>('users/:id?')
  const { isLoading: isReading, error: readError, item } = read({ id: 1 })
  const {
    isLoading: isUpdating,
    error: updateError,
    execute
  } = update(item, { id: 1 }, { immediate: false })

  const isLoading = computed(() => isReading.value || isUpdating.value)
  const error = computed(() => updateError.value || readError.value)
</script>

<template>
  <form @submit.prevent="execute()">
    <div v-if="isLoading">Loading...</div>
    <div v-if="error">{{ error }}</div>
    <template v-if="item">
      <input type="text" v-model="item.name" />
      <button :disabled="isLoading" type="submit">Submit</button>
    </template>
  </form>
</template>
```

The `execute()` function returns an object with the following properties:

- `responsePromise`: a `Promise` that resolves with the response;
- `abort`: a function that aborts the request;
- `signal`: an `AbortSignal` that can be used to check if the request has been aborted.

## Advanced usage

`HttpClientPlugin` manage most of use cases (ex: micro-frontend with different httpClient, a SPA with authenticated API calls and public API calls, etc..).
The `HttpClientPlugin` can manage a `Map` of `httpClient` instances.

### createHttpClient( ) with `scope` parameter

With `scope` parameter on `createHttpClient()` multiple `httpClient` instances can be created. If the `httpClient` `scope` instance already exist an error is throwed: `httpClient with scope ${scope} already exist`.

##### Parameters:

`options?`: `HttpClientInstanceOptions & { scope: string }`

##### Example:

```vue
<script lang="ts" setup>
  import { createHttpClient } from '@volverjs/data/vue'

  createHttpClient({ scope: 'v2Api', prefixUrl: 'https://my.api.com/v2' })

  const { requestGet } = useHttpClient('v2Api')

  const { isLoading, isError, data } = requestGet<User>('users')
</script>
```

### removeHttpClient( )

With this composable the `httpClient` instance can be removed from Map instances.
The `global` `httpClient` instance cannot be removed.

##### Parameters:

`scope`: `string`,

##### Example:

```vue
<script lang="ts" setup>
  import { addHttpClient, removeHttpClient } from '@volverjs/data/vue'

  createHttpClient('v2Api', { prefixUrl: 'https://my.api.com/v2' })

  const { requestGet } = useHttpClient('v2Api')

  const { isLoading, isError, data } = requestGet<User>('users')

  removeHttpClient('v2Api')
</script>
```

Note: The `httpClient` Map instances is NOT reactive, so after the `removeHttpClient`, the `httpClient` used before will NOT be destroyed.

## Acknoledgements

The `UrlBuilder` class is inspired by [`urlcat`](https://github.com/balazsbotond/urlcat).

## License

[MIT](http://opensource.org/licenses/MIT)
