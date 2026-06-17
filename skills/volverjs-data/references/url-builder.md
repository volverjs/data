# UrlBuilder reference

`UrlBuilder` turns a template + params into a URL, filling path placeholders and encoding the
remaining params as a query string with [`qs`](https://github.com/ljharb/qs). It is used
internally by `HttpClient`, but you can use it standalone for links, form actions, etc.

## Contents

- [Static vs instance](#static-vs-instance)
- [Template syntax](#template-syntax)
- [Query encoding defaults](#query-encoding-defaults)
- [query() helper](#query-helper)
- [Validation rules](#validation-rules)

## Static vs instance

```typescript
import { UrlBuilder } from '@volverjs/data'

// One-off — static
const url = UrlBuilder.build(':resource/:id?', { resource: 'users', id: 1, q: 'ada' })
// → 'users/1?q=ada'

// Shared encoding options — instance
const builder = new UrlBuilder({ encodeValuesOnly: false, arrayFormat: 'brackets' })
builder.build('https://api.com/:resource', { resource: 'users', tags: ['a', 'b'] })
```

Instance methods: `build(template, params, options?)`, `query(params, options?)`,
`extend(options)` (merge options in place), `clone(options?)` (new builder with merged options).

## Template syntax

Placeholders are matched by `/?:[A-Za-z_]\w*\??/`:

| Token | Meaning |
| --- | --- |
| `:name` | **Required** path param. Missing/empty value → throws. |
| `:name?` | **Optional** path param. Omitted (including its leading `/`) when absent. |
| (any leftover param) | Appended to the query string. |

```typescript
UrlBuilder.build('users/:id', { id: 1 })                  // 'users/1'
UrlBuilder.build('users/:id?', {})                        // 'users'
UrlBuilder.build('users/:id?', { id: 1, _page: 2 })       // 'users/1?_page=2'
UrlBuilder.build(':a/:b?/:c', { a: 'x', c: 'z' })         // 'x/z'  (optional b dropped)
```

Path values are passed through `encodeURIComponent`. `::` is left untouched (not treated as a param).

## Query encoding defaults

When encoding the query, these defaults are applied (override per call/instance):

| Option | Default |
| --- | --- |
| `arrayFormat` | `'comma'` (e.g. `tags=a,b`) |
| `skipNulls` | `true` |
| `encodeValuesOnly` | `true` |
| `format` | `'RFC1738'` |

Other `qs` options (`delimiter`, `allowDots`, `indices`, `sort`, `serializeDate`,
`charset`, `addQueryPrefix`, `strictNullHandling`, `filter`, `encoder`, …) are supported.

```typescript
UrlBuilder.build('search', { tags: ['a', 'b'] })                          // 'search?tags=a,b'
UrlBuilder.build('search', { tags: ['a', 'b'] }, { arrayFormat: 'repeat' }) // 'search?tags=a&tags=b'
```

`undefined` params are stripped before building; `null` params are dropped by `skipNulls` unless you disable it.

## query() helper

Build just the query string (no path):

```typescript
UrlBuilder.query({ _page: 1, _limit: 10 })        // '_page=1&_limit=10'
new UrlBuilder({ addQueryPrefix: true }).query({ q: 'x' })   // '?q=x'
```

Returns `''` for an empty param object.

## Validation rules

Path params must be `string`, `number`, or `boolean`. A required `:name` with a missing key,
a non-primitive value, or an empty/whitespace string throws an `Error`. Optional `:name?`
params silently drop instead of throwing.
