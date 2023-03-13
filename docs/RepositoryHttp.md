# RepositoryHttp

## Usage

```typescript
import { HttpClient, RepositoryHttp } from '@volverjs/data'

class User {
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
  prefixUrl: 'https://api.example.com'
})

const repository = new RepositoryHttp<User>(client, 'users/:group?/:id?', {
  class: User
})
```
