# HttpClient

## Usage

```typescript
import { HttpClient } from '@volverjs/data'

const options: HttpClientOptions = {
  headers: {
    'Content-Type': 'application/json'
  },
  searchParams: {
    skipNulls: false
  }
}
const client = new HttpClient(options)
```

## Options

`HttpClient` accepts the following options:

```typescript
type HttpClientOptions = {
  /**
   *  ky options
   */
  method?: HttpClientMethod
  headers?: HttpClientHeaders
  json?: unknown
  parseJson?: (text: string) => unknown // default: JSON.parse()
  prefixUrl?: URL | string
  retry?: HttpClientRetryOptions | number
  timeout?: number | false // default: 10000
  hooks?: HttpClientHooks
  throwHttpErrors?: boolean // default: true
  onDownloadProgress?: downloadFn
  fetch?: fetchFn //default: window.fetch
  /**
   *  qs options
   */
  searchParams?: {
    delimiter?: string // default: &
    strictNullHandling?: boolean
    skipNulls?: boolean // default: true
    encode?: boolean // default: true
    encoder?: encoderFn
    filter?: filterFn
    arrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma' // default: comma
    indices?: boolean // default: true
    sort?: (a: any, b: any) => number
    serializeDate?: (d: Date) => string
    format?: 'RFC1738' | 'RFC3986' // default: RFC1738
    encodeValuesOnly?: boolean // default: true
    addQueryPrefix?: boolean
    allowDots?: boolean
    charset?: 'utf-8' | 'iso-8859-1' // default: utf-8
    charsetSentinel?: boolean
  }
}

type downloadFn = (progress: DownloadProgress, chunk: Uint8Array) => void
type fetchFn = (input: RequestInfo, init?: RequestInit) => Promise<Response>
type encoderFn = (
  str: any,
  defaultEncoder: (str: any, defaultEncoder?: any, charset?: string) => string,
  charset: string,
  type: 'key' | 'value'
) => string
type filterFn = Array<string | number> | ((prefix: string, value: any) => any)
```

Please refer to the [`ky`](https://github.com/sindresorhus/ky) and [`qs`](https://github.com/ljharb/qs) for more information about the options.
