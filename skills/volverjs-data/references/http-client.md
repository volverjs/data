# HttpClient reference

`HttpClient` wraps [`ky`](https://github.com/sindresorhus/ky) (a `fetch`-based client) and
uses `UrlBuilder` to turn URL templates into final URLs.

## Contents

- [Constructing](#constructing)
- [Options](#options)
- [Request methods](#request-methods)
- [Reading the response](#reading-the-response)
- [Cancelling a request](#cancelling-a-request)
- [Authentication](#authentication)
- [extend vs clone](#extend-vs-clone)
- [Errors](#errors)
- [Hooks, retry, timeout, progress](#hooks-retry-timeout-progress)

## Constructing

```typescript
import { HttpClient } from '@volverjs/data'

const client = new HttpClient({
  prefix: 'https://my.api.com',          // base URL for relative paths
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,                        // ms; default 10000, `false` disables
  searchParams: { skipNulls: false },    // qs encoding config (NOT the query values)
})
```

`HttpClientInstanceOptions` also accepts `client` (a pre-built ky instance) and
`urlBuilder` (a pre-built `UrlBuilder`) for advanced composition — rarely needed.

## Options

`HttpClientOptions` = all `ky` options (except `searchParams`, repurposed) plus a
`searchParams` object of `qs` stringify options.

### ky options

| Option | Type | Notes |
| --- | --- | --- |
| `method` | `HttpClientMethod` | Usually set by the verb method. |
| `headers` | object / `Headers` | Per-request or per-client. A header set to `undefined` is removed. |
| `json` | `unknown` | Request body, serialized to JSON automatically. |
| `body` | `BodyInit` | Raw body (use instead of `json` for FormData, blobs, etc.). |
| `prefix` | `string \| URL` | Base URL. **Renamed from `prefixUrl` in v3.** |
| `parseJson` | `(text) => unknown` | Custom JSON parser; default `JSON.parse`. |
| `retry` | `number \| RetryOptions` | Retry policy (see ky docs). |
| `timeout` | `number \| false` | ms; default `10000`. |
| `hooks` | `Hooks` | `beforeRequest`, `afterResponse`, `beforeRetry`, `beforeError`. |
| `throwHttpErrors` | `boolean` | Default `true`. When `false`, non-2xx responses resolve instead of throwing. |
| `onDownloadProgress` | `(progress, chunk) => void` | Download progress callback. |
| `fetch` | `fetchFn` | Custom fetch implementation (SSR, mocking). |
| `signal` | `AbortSignal` | Cancellation signal. |

### searchParams (qs) options

Configure how the query string is encoded. Defaults applied by the library:
`skipNulls: true`, `encode: true`, `arrayFormat: 'comma'`, `format: 'RFC1738'`,
`encodeValuesOnly: true`. Other useful keys: `delimiter`, `strictNullHandling`,
`encoder`, `filter`, `indices`, `sort`, `serializeDate`, `addQueryPrefix`,
`allowDots`, `charset`, `charsetSentinel`. See [`qs`](https://github.com/ljharb/qs).

## Request methods

```typescript
client.get(url, options?)
client.post(url, options?)
client.put(url, options?)
client.patch(url, options?)
client.delete(url, options?)
client.head(url, options?)
```

`url` is a `HttpClientInputTemplate`:

- a **string** (`'users/1'`) — resolved against `prefix`;
- a **template object** `{ template, params }` — path placeholders filled, extra params become the query string;
- a `Request` / `URL` — passed through.

```typescript
// Template form
client.get({
  template: ':endpoint/:action?/:id',
  params: { endpoint: 'users', id: 1, _limit: 10 },
})
// → GET <prefix>/users/1?_limit=10
```

`buildUrl(url, options?)` returns the resolved URL without making a request.

## Reading the response

Verb methods return a ky `ResponsePromise`. You can chain body parsers directly:

```typescript
const users = await client.get('users').json<User[]>()
const text = await client.get('readme.txt').text()
const blob = await client.get('avatar.png').blob()
```

Or await the response and call the parser:

```typescript
const res = await client.get('users/1')
if (res.ok) {
  const user = await res.json<User>()
}
```

## Cancelling a request

`request()` exposes an abort handle:

```typescript
const { responsePromise, abort, signal } = client.request('get', 'long-task')

// later…
abort('user navigated away')

try {
  const res = await responsePromise
}
catch (e) {
  if (signal.aborted) {
    // request was cancelled — signal.reason holds the reason
  }
}
```

You can also pass your own controller: `client.request('get', url, { abortController })`,
or pass a `signal` to any verb method.

## Authentication

```typescript
client.setBearerToken('my-jwt')      // sets Authorization: Bearer my-jwt on all requests
client.setBearerToken(null)          // clears it

// Custom header / prefix
client.setBearerToken(token, { headerName: 'X-Auth-Token', prefix: 'Token' })
```

`setBearerToken` works by calling `extend`, so it mutates the client instance.

## extend vs clone

- `client.extend(options)` — mutate this client in place (merges headers, updates prefix, etc.). Returns `void`.
- `client.clone(options)` — return a **new** independent `HttpClient` with the options applied. The original is unchanged.

Use `clone` for a variant client (e.g. a different `Accept` header) without affecting the shared instance.

## Errors

With the default `throwHttpErrors: true`:

```typescript
import { HTTPError, TimeoutError } from '@volverjs/data'

try {
  const user = await client.get('users/1').json<User>()
}
catch (e) {
  if (e instanceof HTTPError) {
    // e.response is the Response; e.response.status, etc.
    const status = e.response.status
  }
  else if (e instanceof TimeoutError) {
    // request exceeded the timeout
  }
}
```

Set `throwHttpErrors: false` to handle status codes manually via `res.ok` / `res.status`.

## Hooks, retry, timeout, progress

These are ky features passed straight through:

```typescript
const client = new HttpClient({
  prefix: 'https://my.api.com',
  retry: { limit: 2, methods: ['get'] },
  timeout: 5000,
  hooks: {
    beforeRequest: [req => req.headers.set('X-Trace', 'abc')],
    afterResponse: [(_req, _opts, res) => res],
  },
  onDownloadProgress: (progress, _chunk) => {
    console.log(`${Math.round(progress.percent * 100)}%`)
  },
})
```

See the [ky documentation](https://github.com/sindresorhus/ky) for the full semantics of hooks and retry.
