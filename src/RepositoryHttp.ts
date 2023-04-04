import type {
	HttpClientInstance,
	HttpClientOptions,
	HttpClientRequestOptions,
	HttpClientUrlTemplate,
	HTTPError,
} from './HttpClient'
import type { Repository } from './Repository'
import { Hash } from './Hash'
import type { ParamMap } from './types'

type RepositoryHttpReadPendingRequest<Type> = {
	responsePromise: Promise<{
		ok: boolean
		aborted?: boolean
		abortReason?: string
		data?: Type[]
		metadata?: ParamMap
	}>
	abort: (reason?: string) => void
	signal: AbortSignal
	count: number
}

export type RepositoryHttpReadOptions = HttpClientRequestOptions & {
	key?: string | number | boolean
}

export type RepositoryHttpOptions<Type> = {
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
	responseAdapter?: (raw: unknown) => Type[]
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	class?: new (...args: any[]) => Type
}

export class RepositoryHttp<Type> implements Repository<Type> {
	private _client: HttpClientInstance
	private _template: string | HttpClientUrlTemplate
	private _responseAdapter = (raw: unknown): Type[] =>
		Array.isArray(raw) ? raw : [raw]
	private _requestAdapter = (item: Type): unknown => item
	private _metadataAdapter = (response: Response): ParamMap | undefined => {
		let toReturn = undefined
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
		options?: RepositoryHttpOptions<Type>,
	) {
		this._client = client
		this._template = template

		if (options?.httpClientOptions) {
			this._httpClientOptions = options.httpClientOptions
		}
		if (options?.class && !options?.responseAdapter) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const optionsClass = options.class as new (...args: any[]) => Type
			this._responseAdapter = (raw) => {
				return Array.isArray(raw)
					? raw.map((rawItem) => new optionsClass(rawItem))
					: [new optionsClass(raw)]
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
	 * const { data, metadata, ok } = await response
	 * //=> GET /users/admin?page=1
	 * ```
	 */
	public read = (
		params: ParamMap,
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
				const raw = await httpResponse.json()
				const data = this._responseAdapter(raw)
				const metadata = this._metadataAdapter(httpResponse)
				if (key !== false) {
					this._deleteRepositoryHttpReadPendingRequest(key)
				}
				return { data, metadata, ok: httpResponse.ok }
			} catch (error) {
				if (key !== false) {
					this._deleteRepositoryHttpReadPendingRequest(key)
				}
				if (!signal.aborted) {
					throw error as HTTPError
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
	 * @params item - The item to create.
	 * @params params - The parameters to use in the request template URL or query.
	 * @params options - The HTTP Client request options.
	 * @returns A an object with the response promise and a function to abort the request.
	 * @example
	 * ```typescript
	 * const repository = new RepositoryHttp(client, 'users/:type')
	 * const item = { name: 'John' }
	 * const { response, abort } = repository.create(item, { type: 'admin' })
	 * const { data, metadata, ok } = await response
	 * //=> POST /users/admin
	 * ```
	 */
	public create = (
		item: Type,
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
			this._requestOptions(options, item),
		)
		const responsePromise = (async () => {
			try {
				const httpResponse = await httpResponsePromise
				const raw = await httpResponse.json()
				const data = this._responseAdapter(raw)?.[0]
				const metadata = this._metadataAdapter(httpResponse)
				return { data, metadata, ok: httpResponse.ok }
			} catch (error) {
				if (!signal.aborted) {
					throw error
				}
				return { ok: false, aborted: true, abortReason: signal.reason }
			}
		})()
		return { abort, responsePromise, signal }
	}

	/**
	 * @params item - The item to update.
	 * @params params - The parameters to use in the request template URL or query.
	 * @params options - The HTTP Client request options.
	 * @returns A an object with the response promise and a function to abort the request.
	 * @example
	 * ```typescript
	 * const repository = new RepositoryHttp(client, 'users/:type/?:id')
	 * const item = { id: 1, name: 'John' }
	 * const { response, abort } = repository.update(item, { type: 'admin', id: 1 })
	 * const { data, metadata, ok } = await response
	 * //=> PUT /users/admin/1
	 * ```
	 */
	public update = (
		item: Type,
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
			this._requestOptions(options, item),
		)
		const responsePromise = (async () => {
			try {
				const httpResponse = await httpResponsePromise
				const raw = await httpResponse.json()
				const data = this._responseAdapter(raw)?.[0]
				const metadata = this._metadataAdapter(httpResponse)
				return { data, metadata, ok: httpResponse.ok }
			} catch (error) {
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
	 * const { data, metadata, ok } = await response
	 * //=> DELETE /users/admin/1
	 * ```
	 */
	public delete = (params: ParamMap, options?: HttpClientRequestOptions) => {
		const {
			responsePromise: httpResponsePromise,
			abort,
			signal,
		} = this._client.request(
			'delete',
			this._requestUrl(params),
			this._requestOptions(options),
		)
		const responsePromise = (async () => {
			try {
				const httpResponse = await httpResponsePromise
				return { ok: httpResponse.ok }
			} catch (error) {
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
						reject(error as HTTPError)
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
		item?: Type,
	): HttpClientOptions => {
		const toReturn: HttpClientOptions = {
			...this._httpClientOptions,
			...options,
		}
		if (item) {
			toReturn.json = this._requestAdapter(item)
		}
		return toReturn
	}
}
