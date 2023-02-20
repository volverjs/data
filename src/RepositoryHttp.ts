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

type ReadPendingRequest<Type> = {
	response: Promise<{
		ok: boolean
		data?: Type[]
		metadata?: ParamMap
		abortReason?: string
	}>
	abort: (reason?: string) => void
	count: number
}

export type RepositoryHttpOptions<Type> = {
	prefixUrl?: string
	responseAdapter?: (raw: unknown) => Type[]
	requestAdapter?: (item: Type) => unknown
	metadataAdapter?: (response: Response) => ParamMap
	hashFunction?: (str: string) => number
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	class?: new (...args: any[]) => Type
}

export class RepositoryHttp<Type> implements Repository<Type> {
	private _client: HttpClientInstance
	private _template: string
	private _responseAdapter = (raw: unknown) =>
		Array.isArray(raw) ? raw : ([raw] as Type[])
	private _requestAdapter = (item: Type): unknown =>
		structuredClone(item) as unknown
	private _metadataAdapter = (response: Response): ParamMap | undefined => {
		if (response.headers.has('X-Total-Count')) {
			return { total: response.headers.get('X-Total-Count') }
		}
		return undefined
	}
	private _hashFunction: (str: string) => number = Hash.cyrb53
	private _readPendingRequests: Map<
		string | number,
		ReadPendingRequest<Type>
	> = new Map()
	private _prefixUrl?: string

	constructor(
		client: HttpClientInstance,
		template: string,
		options?: RepositoryHttpOptions<Type>,
	) {
		this._client = client
		this._template = template

		if (options?.prefixUrl) {
			this._prefixUrl = options.prefixUrl
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

	public read = (
		params: ParamMap,
		options: HttpClientRequestOptions & {
			key?: string | number | boolean
		} = {},
	) => {
		const { key: optionsKey, ...requestOptions } = options
		let key = optionsKey
		if (key !== false) {
			if (!key || typeof key === 'boolean') {
				key = this._hashFunction(JSON.stringify(params))
			}
			if (this._hasReadPendingRequest(key)) {
				return this._cloneReadPendingRequest(key)
			}
		}
		const { responsePromise, abort, signal } = this._client.request(
			'get',
			this._requestUrl(params),
			this._requestOptions(requestOptions),
		)
		const response = (async () => {
			try {
				const httpResponse = await responsePromise
				const raw = await httpResponse.json()
				const data = this._responseAdapter(raw)
				const metadata = this._metadataAdapter(httpResponse)
				if (key !== false) {
					this._deleteReadPendingRequest(key)
				}
				return { data, metadata, ok: httpResponse.ok }
			} catch (error) {
				if (key !== false) {
					this._deleteReadPendingRequest(key)
				}
				if (!signal?.aborted) {
					throw error as HTTPError
				}
				return { ok: false, abortReason: signal?.reason }
			}
		})()
		if (key === false) {
			return { response, abort }
		}
		return this._setReadPendingRequest(key, { response, abort })
	}

	public create = (
		params: ParamMap,
		item: Type,
		options?: HttpClientRequestOptions,
	) => {
		const { responsePromise, abort, signal } = this._client.request(
			'post',
			this._requestUrl(params),
			this._requestOptions(options, item),
		)
		const response = (async () => {
			try {
				const httpResponse = await responsePromise
				const raw = await httpResponse.json()
				const data = this._responseAdapter(raw)?.[0]
				const metadata = this._metadataAdapter(httpResponse)
				return { data, metadata, ok: httpResponse.ok }
			} catch (error) {
				if (!signal?.aborted) {
					throw error
				}
				return { ok: false, error }
			}
		})()
		return { abort, response }
	}

	public update = (
		params: ParamMap,
		item: Type,
		options?: HttpClientRequestOptions,
	) => {
		const { responsePromise, abort, signal } = this._client.request(
			'put',
			this._requestUrl(params),
			this._requestOptions(options, item),
		)
		const response = (async () => {
			try {
				const httpResponse = await responsePromise
				const raw = await httpResponse.json()
				const data = this._responseAdapter(raw)?.[0]
				const metadata = this._metadataAdapter(httpResponse)
				return { data, metadata, ok: httpResponse.ok }
			} catch (error) {
				if (!signal?.aborted) {
					throw error
				}
				return { ok: false, error }
			}
		})()
		return { abort, response }
	}

	public delete = (params: ParamMap, options?: HttpClientRequestOptions) => {
		const { responsePromise, abort, signal } = this._client.request(
			'delete',
			this._requestUrl(params),
			this._requestOptions(options),
		)
		const response = (async () => {
			try {
				const httpResponse = await responsePromise
				return { ok: httpResponse.ok }
			} catch (error) {
				if (!signal?.aborted) {
					throw error
				}
				return { ok: false, error }
			}
		})()
		return { abort, response }
	}

	private _hasReadPendingRequest = (key?: string | number) => {
		return key && this._readPendingRequests.has(key)
	}

	private _deleteReadPendingRequest = (key: string | number) => {
		return this._readPendingRequests.delete(key)
	}

	private _cloneReadPendingRequest = (
		key: string | number,
	): Omit<ReadPendingRequest<Type>, 'count'> => {
		const controller = new AbortController()
		const pendingRequest = this._readPendingRequests.get(
			key,
		) as ReadPendingRequest<Type>
		pendingRequest.count++
		return {
			response: new Promise((resolve, reject) => {
				controller.signal.addEventListener('abort', () => {
					pendingRequest.count--
					if (pendingRequest.count === 0) {
						pendingRequest.abort(controller.signal.reason)
					}
					resolve({
						ok: false,
						abortReason: controller.signal.reason,
					})
				})
				pendingRequest.response
					.then((...args) => {
						resolve(...args)
					})
					.catch((error) => {
						reject(error as HTTPError)
					})
			}),
			abort: (reason?: string) => controller.abort(reason),
		}
	}

	private _setReadPendingRequest = (
		key: string | number,
		{ abort, response }: Omit<ReadPendingRequest<Type>, 'count'>,
	): Omit<ReadPendingRequest<Type>, 'count'> => {
		this._readPendingRequests.set(key, { abort, response, count: 0 })
		return this._cloneReadPendingRequest(key)
	}

	private _requestUrl = (params: ParamMap): HttpClientUrlTemplate => {
		return { template: this._template, params }
	}

	private _requestOptions = (
		options?: HttpClientRequestOptions,
		item?: Type,
	): HttpClientOptions => {
		const toReturn: HttpClientOptions = { ...options }
		if (this._prefixUrl) {
			toReturn.prefixUrl = this._prefixUrl
		}
		if (item) {
			toReturn.json = this._requestAdapter(item)
		}
		return toReturn
	}
}
