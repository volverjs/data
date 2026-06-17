# Hash reference

`Hash` provides two static, fast, non-cryptographic string-hash functions. They return a
`number`. They are **not** for security — use them for cache keys, change detection, or
request de-duplication (which is what `RepositoryHttp` uses them for internally).

```typescript
import { Hash } from '@volverjs/data'

Hash.cyrb53('hello world')        // → e.g. 5211024121371232
Hash.cyrb53('hello world', 42)    // seeded variant

Hash.djb2('hello world')          // → e.g. 894552257
Hash.djb2('hello world', 5381)    // custom seed (default 5381)
```

| Function | Signature | Notes |
| --- | --- | --- |
| `Hash.cyrb53` | `(str: string, seed = 0) => number` | 53-bit hash, very low collision rate. Default hash for `RepositoryHttp` read de-dup. |
| `Hash.djb2` | `(str: string, seed = 5381) => number` | Classic djb2, 32-bit. Faster, more collisions. |

Use as a custom repository key function:

```typescript
const repo = new RepositoryHttp<User>(client, 'users/:id?', { hashFunction: Hash.djb2 })
```
