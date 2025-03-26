import type { HttpClientInstance, HttpClientOptions, HttpClientRequestOptions, HttpClientUrlTemplate } from './HttpClient'
import type { Repository } from './Repository'
import type { ParamMap } from './types'
import { Hash } from './Hash'
import {
    HTTPError,
} from './HttpClient'

type RepositoryHttpReadPendingRequest<Type> = {
    responsePromise: Promise<{
        ok: boolean
        aborted?: boolean
        abortReason?: string
        data?: Type[]
        item?: Type
        metadata?: ParamMap
    }>
    abort: (reason?: string) => void
    signal: AbortSignal
    count: number
}

export type RepositoryHttpReadOptions = HttpClientRequestOptions & {
    key?: string | number | boolean
}

export type RepositoryHttpOptions<Type, TResponse = unknown> = {
    /**
     * The httpClient instance scope (name)
     * @default undefined
     * @example
     * ```typescript
     * addHttpClient('v2', { prefixUrl: 'https://myapi.com/v2' })
     * const { read } = useRepositoryHttp<{ id: string }>('users/?:id', { httpClientScope: 'v2' })
     * read({ id: 1 })
     * //=> GET https://myapi.com/v2/?id=1
     * ```
     */
    httpClientScope?: string
    /**
     * The prefix url to use for all requests.
     * @default undefined
     * @example
     * ```typescript
     * const repository = new RepositoryHttp(client, 'users/?:id', { httpClientOptions: { prefixUrl: 'https://example.com' } })
     * repository.read({ id: 1 })
     * //=> GET https://example.com/?id=1
     * ```
     */
    httpClientOptions?: HttpClientRequestOptions
    /**
     * A function to transform the raw response data into the expected data type.
     * @remarks
     * Must return an array of items.
     * @default
     * `(raw: unknown) => Array.isArray(raw) ? raw : ([raw] as Type[])`
     * @example
     * ```typescript
     * const responseAdapter = (raw) => [new Type(raw)]
     * const repository = new RepositoryHttp(client, 'users/?:id', { responseAdapter })
     * ```
     */
    responseAdapter?: (raw: TResponse) => Type[]
    /**
     * A function to transform the request data into the expected data type.
     * @default
     * `(item: Type): unknown => item`
     * @example
     * ```typescript
     * const requestAdapter = (item) => ({ ...item, foo: 'bar' })
     * const repository = new RepositoryHttp(client, 'users/?:id', { requestAdapter })
     * ```
     */
    requestAdapter?: (item: Type) => unknown
    /**
     * A function to extract metadata from the response.
     * @default
     * `(response: Response): ParamMap | undefined => {
     *  	let toReturn = undefined
     * 		if (response.headers.has('Content-Language')) {
     * 			toReturn = {
     * 				contentLanguage: response.headers.get('Content-Language'),
     * 			}
     * 		}
     * 		if (response.headers.has('Accept-Language')) {
     * 			toReturn = {
     * 				acceptLanguage: response.headers.get('Accept-Language'),
     * 			}
     * 		}
     * 		if (response.headers.has('X-Total-Count')) {
     * 			toReturn = {
     * 				...toReturn,
     * 				total: response.headers.get('X-Total-Count'),
     * 			}
     * 		}
     * 	return toReturn
     * }`
     * @example
     * ```typescript
     * 	const metadataAdapter = (response) => {
     * 		if (response.headers.has('X-Pagination')) {
     * 			return JSON.parse(response.headers.get('X-Pagination'))
     * 		}
     * 	return undefined
     * }
     * const repository = new RepositoryHttp(client, 'users/?:id', { metadataAdapter })
     * ```
     */
    metadataAdapter?: (response: Response) => ParamMap
    /**
     * A function to generate a key for the request.
     * @default
     * `(str: string) => Hash.cyrb53(str)`
     * @example
     * ```typescript
     * const repository = new RepositoryHttp(client, 'users/?:id', { hashFunction: Hash.djb2 })
     * ```
     */
    hashFunction?: (str: string) => number
    /**
     * The class to apply to the items. An alternative to `responseAdapter`.
     * @default undefined
     * @example
     * ```typescript
     * const repository = new RepositoryHttp(client, 'users/?:id', { class: Type })
     * ```
     */
    class?: new (...args: any[]) => Type
}

export class RepositoryHttp<Type, TResponse = unknown>
implements Repository<Type> {
    private _client: HttpClientInstance
    private _template: string | HttpClientUrlTemplate
    private _responseAdapter = (raw: TResponse): Type[] =>
        (Array.isArray(raw) ? raw : [raw]) as Type[]

    private _requestAdapter = (item: Type): unknown => item
    private _metadataAdapter = (response: Response): ParamMap | undefined => {
        let toReturn
        if (response.headers.has('Content-Language')) {
            toReturn = {
                contentLanguage: response.headers.get('Content-Language'),
            }
        }
        if (response.headers.has('Accept-Language')) {
            toReturn = {
                acceptLanguage: response.headers.get('Accept-Language'),
            }
        }
        if (response.headers.has('X-Total-Count')) {
            toReturn = {
                ...toReturn,
                total: response.headers.get('X-Total-Count'),
            }
        }
        return toReturn
    }

    private _hashFunction: (str: string) => number = Hash.cyrb53
    private _readPendingRequests: Map<
		string | number,
        Omit<RepositoryHttpReadPendingRequest<Type>, 'signal'>
    > = new Map()

    private _httpClientOptions?: HttpClientRequestOptions

    /**
     * @param client The HTTP client to use.
     * @param template The URL template to use for requests.
     * @param options The options to use.
     */
    constructor(
        client: HttpClientInstance,
        template: string | HttpClientUrlTemplate,
        options?: RepositoryHttpOptions<Type, TResponse>,
    ) {
        this._client = client
        this._template = template

        if (options?.httpClientOptions) {
            this._httpClientOptions = options.httpClientOptions
        }
        if (options?.class && !options?.responseAdapter) {
            const OptionsClass = options.class as new (...args: any[]) => Type
            this._responseAdapter = (raw) => {
                return Array.isArray(raw)
                    ? raw.map(rawItem => new OptionsClass(rawItem))
                    : [new OptionsClass(raw)]
            }
        }
        if (options?.responseAdapter) {
            this._responseAdapter = options.responseAdapter
        }
        if (options?.requestAdapter) {
            this._requestAdapter = options.requestAdapter
        }
        if (options?.metadataAdapter) {
            this._metadataAdapter = options.metadataAdapter
        }
        if (options?.hashFunction) {
            this._hashFunction = options.hashFunction
        }
    }

    /**
     * @params params - The parameters to use in the request template URL or query.
     * @params options - The HTTP Client request options.
     * @returns A an object with the response promise and a function to abort the request.
     * @example
     * ```typescript
     * const repository = new RepositoryHttp(client, 'users/:type')
     * const { response, abort } = repository.read({ type: 'admin', page: 1 })
     * const { data, item, metadata, ok } = await response
     * //=> GET /users/admin?page=1
     * ```
     */
    public read = (
        params: ParamMap = {},
        options: RepositoryHttpReadOptions = {},
    ) => {
        const { key: optionsKey, ...requestOptions } = options
        let key = optionsKey
        if (key !== false) {
            if (!key || typeof key === 'boolean') {
                key = this._hashFunction(JSON.stringify(params))
            }
            if (this._hasRepositoryHttpReadPendingRequest(key)) {
                return this._cloneRepositoryHttpReadPendingRequest(key)
            }
        }
        const {
            responsePromise: httpResponsePromise,
            abort,
            signal,
        } = this._client.request(
            'get',
            this._requestUrl(params),
            this._requestOptions(requestOptions),
        )
        const responsePromise = (async () => {
            try {
                const httpResponse = await httpResponsePromise
                const raw = await httpResponse.json<TResponse>()
                const data = this._responseAdapter(raw)
                const metadata = this._metadataAdapter(httpResponse)
                if (key !== false) {
                    this._deleteRepositoryHttpReadPendingRequest(key)
                }
                return { data, item: data?.[0], metadata, ok: httpResponse.ok }
            }
            catch (error) {
                if (key !== false) {
                    this._deleteRepositoryHttpReadPendingRequest(key)
                }
                if (!signal.aborted && error instanceof HTTPError) {
                    throw error
                }
                return { ok: false, aborted: true, abortReason: signal.reason }
            }
        })()
        if (key === false) {
            return { abort, responsePromise, signal }
        }
        return this._setRepositoryHttpReadPendingRequest(key, {
            abort,
            responsePromise,
        })
    }

    /**
     * @params payload - The payload to use in the request body.
     * @params params - The parameters to use in the request template URL or query.
     * @params options - The HTTP Client request options.
     * @returns A an object with the response promise and a function to abort the request.
     * @example
     * ```typescript
     * const repository = new RepositoryHttp(client, 'users/:type')
     * const payload = { name: 'John' }
     * const { response, abort } = repository.create(payload, { type: 'admin' })
     * const { data, item, metadata, ok } = await response
     * //=> POST /users/admin
     * ```
     */
    public create = (
        payload?: Type | Type[],
        params?: ParamMap,
        options?: HttpClientRequestOptions,
    ) => {
        const {
            responsePromise: httpResponsePromise,
            abort,
            signal,
        } = this._client.request(
            'post',
            this._requestUrl(params),
            this._requestOptions(options, payload),
        )
        const responsePromise = (async () => {
            try {
                const httpResponse = await httpResponsePromise
                const raw = await httpResponse.json<TResponse>()
                const data = this._responseAdapter(raw)
                const metadata = this._metadataAdapter(httpResponse)
                return { data, item: data?.[0], metadata, ok: httpResponse.ok }
            }
            catch (error) {
                if (!signal.aborted) {
                    throw error
                }
                return { ok: false, aborted: true, abortReason: signal.reason }
            }
        })()
        return { abort, responsePromise, signal }
    }

    /**
     * @params payload - The payload to use in the request body.
     * @params params - The parameters to use in the request template URL or query.
     * @params options - The HTTP Client request options.
     * @returns A an object with the response promise and a function to abort the request.
     * @example
     * ```typescript
     * const repository = new RepositoryHttp(client, 'users/:type/?:id')
     * const payload = { id: 1, name: 'John' }
     * const { response, abort } = repository.update(payload, { type: 'admin', id: 1 })
     * const { data, item, metadata, ok } = await response
     * //=> PUT /users/admin/1
     * ```
     */
    public update = (
        payload?: Type | Type[],
        params?: ParamMap,
        options?: HttpClientRequestOptions,
    ) => {
        const {
            responsePromise: httpResponsePromise,
            abort,
            signal,
        } = this._client.request(
            'put',
            this._requestUrl(params),
            this._requestOptions(options, payload),
        )
        const responsePromise = (async () => {
            try {
                const httpResponse = await httpResponsePromise
                const raw = await httpResponse.json<TResponse>()
                const data = this._responseAdapter(raw)
                const metadata = this._metadataAdapter(httpResponse)
                return { data, item: data?.[0], metadata, ok: httpResponse.ok }
            }
            catch (error) {
                if (!signal.aborted) {
                    throw error
                }
                return { ok: false, aborted: true, abortReason: signal.reason }
            }
        })()
        return { abort, responsePromise, signal }
    }

    /**
     * @params params - The parameters to use in the request template URL or query.
     * @params options - The HTTP Client request options.
     * @returns A an object with the response promise and a function to abort the request.
     * @example
     * ```typescript
     * const repository = new RepositoryHttp(client, 'users/:type/?:id')
     * const { response, abort } = repository.delete({ type: 'admin', id: 1 })
     * const { ok } = await response
     * //=> DELETE /users/admin/1
     * ```
     */
    public remove = (params?: ParamMap, options?: HttpClientRequestOptions) => {
        const requestOptions = this._requestOptions(options)
        const {
            responsePromise: httpResponsePromise,
            abort,
            signal,
        } = this._client.request(
            'delete',
            this._requestUrl(params),
            requestOptions,
        )
        const responsePromise = (async () => {
            try {
                const httpResponse = await httpResponsePromise
                return { ok: httpResponse.ok }
            }
            catch (error) {
                if (!signal.aborted) {
                    throw error
                }
                return { ok: false, aborted: true, abortReason: signal.reason }
            }
        })()
        return { abort, responsePromise, signal }
    }

    private _hasRepositoryHttpReadPendingRequest = (key?: string | number) => {
        return key && this._readPendingRequests.has(key)
    }

    private _deleteRepositoryHttpReadPendingRequest = (
        key: string | number,
    ) => {
        return this._readPendingRequests.delete(key)
    }

    private _cloneRepositoryHttpReadPendingRequest = (
        key: string | number,
    ): Omit<RepositoryHttpReadPendingRequest<Type>, 'count'> => {
        const controller = new AbortController()
        const pendingRequest = this._readPendingRequests.get(
            key,
        ) as RepositoryHttpReadPendingRequest<Type>
        pendingRequest.count++
        return {
            responsePromise: new Promise((resolve, reject) => {
                controller.signal.addEventListener('abort', () => {
                    pendingRequest.count--
                    if (pendingRequest.count === 0) {
                        pendingRequest.abort(controller.signal.reason)
                    }
                    resolve({
                        ok: false,
                        aborted: true,
                        abortReason: controller.signal.reason,
                    })
                })
                pendingRequest.responsePromise
                    .then((...args) => {
                        resolve(...args)
                    })
                    .catch((error) => {
                        if (error instanceof HTTPError) {
                            reject(error)
                        }
                    })
            }),
            abort: (reason?: string) => controller.abort(reason),
            signal: controller.signal,
        }
    }

    private _setRepositoryHttpReadPendingRequest = (
        key: string | number,
        {
            abort,
            responsePromise,
        }: Omit<RepositoryHttpReadPendingRequest<Type>, 'count' | 'signal'>,
    ): Omit<RepositoryHttpReadPendingRequest<Type>, 'count'> => {
        this._readPendingRequests.set(key, { abort, responsePromise, count: 0 })
        return this._cloneRepositoryHttpReadPendingRequest(key)
    }

    private _requestUrl = (params: ParamMap = {}): HttpClientUrlTemplate => {
        if (typeof this._template === 'string') {
            return { template: this._template, params }
        }
        return {
            ...this._template,
            params: { ...this._template.params, ...params },
        }
    }

    private _requestOptions = (
        options?: HttpClientRequestOptions,
        payload?: Type | Type[],
    ): HttpClientOptions => {
        const toReturn: HttpClientOptions = {
            ...this._httpClientOptions,
            ...options,
        }
        if (!payload) {
            return toReturn
        }
        if (Array.isArray(payload)) {
            toReturn.json = payload.map(item => this._requestAdapter(item))
            return toReturn
        }
        toReturn.json = this._requestAdapter(payload)
        return toReturn
    }
}
