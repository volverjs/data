# Volver Data Skill for Claude Code

Agent skill that helps Claude Code consume REST APIs with [@volverjs/data](https://github.com/volverjs/data), the repository-pattern data layer built on a tiny `fetch`/`ky` HTTP client, a `qs`-powered URL builder, and a Vue 3 integration.

## Installation

```bash
npx skills add volverjs/data
```

This adds the skill to your Claude Code configuration.

## What This Skill Covers

The skill is specialized for real `@volverjs/data` implementation patterns:

- **HttpClient**: a thin `ky`/`fetch` wrapper — verb methods (`get`/`post`/`put`/`patch`/`delete`/`head`), URL templates, JSON bodies, `setBearerToken`, request cancellation, `extend`/`clone`, hooks, retry, and timeouts.
- **RepositoryHttp**: repository-pattern CRUD (`read`/`create`/`update`/`remove`), typed `TRequest`/`TResponse` generics, `class` and `responseAdapter`/`requestAdapter`/`metadataAdapter` mapping, and concurrent-read de-duplication.
- **UrlBuilder**: template syntax (`:required`, `:optional?`), query-string encoding via `qs`, and array formats.
- **Hash**: `cyrb53` / `djb2` helpers for cache keys and request de-duplication.
- **Vue 3 Integration**: `createHttpClient`, `useHttpClient`, `useRepositoryHttp`, reactive `isLoading`/`isError`/`error`/`data` state, deferred vs immediate execution, reactive params, and multi-backend scopes.
- **Migration awareness**: v3 renamed `prefixUrl` → `prefix` and upgraded to `ky` 2.x.

## Usage

Once installed, Claude Code should automatically use this skill when you ask to:

- Make HTTP requests against a REST API using `HttpClient`.
- Build a typed repository for a resource and run CRUD operations.
- Construct URLs with path placeholders and encoded query strings.
- Wire reactive API calls into Vue 3 components with the composables.
- Configure auth, cancellation, retries, adapters, or multiple API backends.

### Example Prompts

```text
Create an HttpClient pointing at https://my.api.com and fetch the user with id 1 as a typed User.
```

```text
Build a RepositoryHttp<User> for the `users/:id?` endpoint and add read, create, update and delete helpers.
```

```text
Map the server's { firstname, lastname } response into a User model with a responseAdapter.
```

```text
In this Vue component, load a list of products reactively with useRepositoryHttp and show loading/error state.
```

```text
Build a URL for `users/:id` with id=42 and a `tags` query param encoded as repeated keys.
```

```text
Set up two API backends (global + a v2 scope) and use the v2 one in a component.
```

## Source of Truth

When coding, verify implementation details directly from the library source:

- `src/HttpClient.ts` — client, options, request/cancel, auth
- `src/RepositoryHttp.ts` — repository CRUD, adapters, read de-duplication
- `src/UrlBuilder.ts` — template parsing and query encoding
- `src/Hash.ts` — hash helpers
- `src/vue/index.ts` — `createHttpClient`, `useHttpClient`, `useRepositoryHttp`

## Documentation

- [Volver Data Repository](https://github.com/volverjs/data)
- [Skill Specification](./SKILL.md)
- [ky](https://github.com/sindresorhus/ky) and [qs](https://github.com/ljharb/qs) (underlying libraries)

## License

MIT
