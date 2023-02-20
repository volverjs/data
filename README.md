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
const url = urlBuilder.build('https://api.com/:endpoint', {
  endpoint: 'users',
  _limit: 10,
  _page: 1
})
// url = 'https://api.com/users?_limit=10&_page=1'
```

Instead of `URLSearchParams`, the query parameters are automatically encoded using [`qs`](https://github.com/ljharb/qs) library.
Please refer to the `UrlBuilder` [`docs`](/docs/UrlBuilder.md) for more informations.

### HttpClient

The `HttpClient` class is a wrapper around [`ky`](https://github.com/sindresorhus/ky), a client based on `fetch` API . It provides a simple interface to make HTTP requests and uses `UrlBuilder` to build URLs.

```typescript
import { HttpClient } from '@volverjs/data'

const client = new HttpClient({
  prefixUrl: 'https://api.com'
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
// fetch('https://api.com/users/1?_limit=10&_page=1', { method: 'GET' })
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
  prefixUrl: 'https://api.com'
})

const repository = new RepositoryHttp<User>(client, 'users/:group?/:id?', {
  class: User
})

const getAdminUsers: User[] = async () => {
  try {
    const { response } = repository.read({
      group: 'admin'
    })
    const { data } = await response
    return data
  } catch (error) {
    throw error
  }
}
```

Please refer to the `RepositoryHttp` [`docs`](/docs/RepositoryHttp.md) for more informations.

## Acknoledgements

The `UrlBuilder` class is inspired by [`urlcat`](https://github.com/balazsbotond/urlcat).

## License

[MIT](http://opensource.org/licenses/MIT)
