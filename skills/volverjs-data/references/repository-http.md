# RepositoryHttp reference

`RepositoryHttp<TRequest, TResponse = TRequest>` implements the repository pattern over an
`HttpClient`. It centralizes CRUD for one REST resource, maps raw responses to typed items,
extracts metadata, and de-duplicates concurrent reads.

## Contents

- [Constructing](#constructing)
- [Generics](#generics)
- [Options](#options)
- [Methods](#methods)
- [The resolved result](#the-resolved-result)
- [Read de-duplication and keys](#read-de-duplication-and-keys)
- [Adapters](#adapters)
- [Cancelling](#cancelling)

## Constructing

```typescript
import { HttpClient, RepositoryHttp } from '@volverjs/data'

const client = new HttpClient({ prefix: 'https://my.api.com' })
const repo = new RepositoryHttp<User>(client, 'users/:id?', options)
```

- `client` — an `HttpClientInstance`.
- `template` — a string or `{ template, params }`, following `UrlBuilder` rules. `users/:id?` serves both the collection (`read({})`) and a single item (`read({ id })`).
- `options` — `RepositoryHttpOptions` (all optional, below).

## Generics

```typescript
RepositoryHttp<TRequest, TResponse = TRequest>
```

- `TRequest` — your model / the shape you send and work with.
- `TResponse` — the raw server shape, when it differs. Set it so `responseAdapter`'s `raw` argument is typed:

```typescript
interface IUser { id: number, name: string }
interface ApiUser { id: number, firstname: string, lastname: string }

const repo = new RepositoryHttp<IUser, ApiUser>(client, 'users/:id', {
  responseAdapter: raw => [{ id: raw.id, name: `${raw.firstname} ${raw.lastname}` }],
})
```

## Options

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `class` | `new (...args) => TResponse` | — | Instantiate each raw item as a class. Shortcut for a `responseAdapter`. Ignored if `responseAdapter` is also set. |
| `responseAdapter` | `(raw: TResponse) => TResponse[]` | wrap-in-array | Map the raw response to an **array** of items. |
| `requestAdapter` | `(item: TRequest) => unknown` | identity | Transform each payload item before sending. |
| `metadataAdapter` | `(response: Response) => ParamMap` | reads `Content-Language`, `Accept-Language`, `X-Total-Count` → `total` | Extract metadata (e.g. pagination) from response headers. |
| `hashFunction` | `(str: string) => number` | `Hash.cyrb53` | Hash used to build read de-dup keys. |
| `httpClientScope` | `string` | — | (Vue) name of a registered client scope to use. |
| `httpClientOptions` | `HttpClientRequestOptions` | — | Options merged into every request this repo makes (e.g. a per-resource `prefix` or headers). |

## Methods

```typescript
repo.read(params?, options?)               // GET
repo.create(payload?, params?, options?)   // POST
repo.update(payload?, params?, options?)   // PUT
repo.remove(params?, options?)             // DELETE
```

- `params` fills the URL template; leftover keys become the query string.
- `payload` (create/update) is the request body — a single item or an array. **Payload comes first**, params second.
- `options` are `HttpClientRequestOptions`. Override the HTTP method with `{ method: 'patch' }` if needed (e.g. partial update via `update(payload, params, { method: 'patch' })`).
- `read` also accepts `{ key }` (see de-dup below).

Each returns `{ responsePromise, abort, signal }`.

```typescript
// List with query params
const { responsePromise } = repo.read({ _page: 1, _limit: 20 })
const { data, metadata } = await responsePromise   // data: User[], metadata.total from X-Total-Count

// Single item
const { item } = await repo.read({ id: 1 }).responsePromise

// Create one / many
await repo.create({ name: 'Ada' }).responsePromise
await repo.create([{ name: 'Ada' }, { name: 'Alan' }]).responsePromise

// Update
await repo.update({ name: 'Ada L.' }, { id: 1 }).responsePromise

// Delete
const { ok } = await repo.remove({ id: 1 }).responsePromise
```

## The resolved result

`read`/`create`/`update` resolve to:

```typescript
{
  ok: boolean
  data?: TResponse[]      // adapted items
  item?: TResponse        // data[0] — convenient for single-item reads
  metadata?: ParamMap     // from metadataAdapter
  aborted?: boolean       // true if the request was cancelled
  abortReason?: string
}
```

`remove` resolves to `{ ok }` (plus `aborted`/`abortReason` if cancelled).

Note on errors: an `HTTPError` (non-2xx) **rejects** `responsePromise` — catch it. An
**abort** does not reject; it resolves with `{ ok: false, aborted: true, abortReason }`.

## Read de-duplication and keys

`read` caches in-flight requests by a key derived from the params (via `hashFunction`).
Identical concurrent `read`s share a single network request and resolve together — useful
when several components request the same resource at once.

```typescript
repo.read({ id: 1 })            // fires the request
repo.read({ id: 1 })            // reuses the in-flight one — no second request

repo.read({ id: 1 }, { key: false })   // opt out: always a fresh request
repo.read({ id: 1 }, { key: 'user-1' }) // custom cache bucket
```

Each cloned caller gets its own `abort`; the underlying request is only aborted when **all**
sharers abort. Pass `{ key: false }` when you explicitly need an independent, always-fresh call.

## Adapters

```typescript
// class: instantiate a model per item
const repo = new RepositoryHttp<User>(client, 'users/:id?', { class: User })

// responseAdapter: full control; MUST return an array
const repo2 = new RepositoryHttp<User, ApiUser>(client, 'users/:id?', {
  responseAdapter: raw => (Array.isArray(raw) ? raw : [raw]).map(u => new User(u)),
})

// requestAdapter: reshape outgoing payload
const repo3 = new RepositoryHttp<User>(client, 'users/:id?', {
  requestAdapter: user => ({ ...user, updatedAt: Date.now() }),
})

// metadataAdapter: custom pagination header
const repo4 = new RepositoryHttp<User>(client, 'users', {
  metadataAdapter: res => res.headers.has('X-Pagination')
    ? JSON.parse(res.headers.get('X-Pagination')!)
    : {},
})
```

## Cancelling

```typescript
const { responsePromise, abort, signal } = repo.read({ _page: 1 })
abort('navigated away')
const result = await responsePromise   // { ok: false, aborted: true, abortReason: 'navigated away' }
```
