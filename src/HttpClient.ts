import ky, {
	HTTPError,
	TimeoutError,
	type Hooks,
	type Options,
	type ResponsePromise,
} from 'ky'
import type { KyInstance } from 'ky/distribution/types/ky'
import type {
	Input,
	HttpMethod,
	KyHeadersInit,
	RetryOptions,
} from 'ky/distribution/types/options'
import {
	UrlBuilder,
	type UrlBuilderInstance,
	type UrlBuilderOptions,
} from './UrlBuilder'
import type { ParamMap } from './types'

export type HttpClientResponsePromise = ResponsePromise
export type HttpClientOptions = Omit<Options, 'searchParams'> & {
	searchParams?: UrlBuilderOptions
}
export type HttpClientRequestOptions = HttpClientOptions & {
	abortController?: AbortController
}
export type HttpClientInput = Input
export type HttpClientMethod = HttpMethod
export type HttpClientHeaders = KyHeadersInit
export type HttpClientRetryOptions = RetryOptions
export type HttpClientHooks = Hooks

export type HttpClientUrl = {
	template: string
	params: ParamMap
}

export interface HttpClientInstance {
	get: (
		url: HttpClientInput | HttpClientUrl,
		options?: HttpClientOptions,
	) => HttpClientResponsePromise
	post: (
		url: HttpClientInput | HttpClientUrl,
		options?: HttpClientOptions,
	) => HttpClientResponsePromise
	put: (
		url: HttpClientInput | HttpClientUrl,
		options?: HttpClientOptions,
	) => HttpClientResponsePromise
	delete: (
		url: HttpClientInput | HttpClientUrl,
		options?: HttpClientOptions,
	) => HttpClientResponsePromise
	patch: (
		url: HttpClientInput | HttpClientUrl,
		options?: HttpClientOptions,
	) => HttpClientResponsePromise
	head: (
		url: HttpClientInput | HttpClientUrl,
		options?: HttpClientOptions,
	) => HttpClientResponsePromise
	extend: (options: HttpClientOptions) => void
	clone: (options?: HttpClientOptions) => HttpClientInstance
	fetch: (request: Request) => HttpClientResponsePromise
	request: (
		method: HttpClientMethod,
		url: HttpClientInput | HttpClientUrl,
		options?: HttpClientOptions,
	) => {
		responsePromise: HttpClientResponsePromise
		abort: (reason?: string) => void
		signal: AbortSignal
	}
	setBearerToken: (token: string) => void
	buildUrl: (
		url: HttpClientInput | HttpClientUrl,
		options?: UrlBuilderOptions,
	) => HttpClientInput
}

export { HTTPError, TimeoutError }

export class HttpClient implements HttpClientInstance {
	private _client: KyInstance
	private _urlBuilder: UrlBuilderInstance

	constructor(
		options: HttpClientOptions & {
			client?: KyInstance
			urlBuilder?: UrlBuilderInstance
		} = {},
	) {
		const { client, urlBuilder, searchParams, ...clientOptions } = options
		this._client = client ?? ky.create(clientOptions)
		this._urlBuilder = urlBuilder ?? new UrlBuilder(searchParams)
	}

	public get = (
		url: HttpClientInput | HttpClientUrl,
		options?: HttpClientOptions,
	) => {
		const { searchParams, ...clientOptions } = options ?? {}
		url = this.buildUrl(url, searchParams)
		return this._client.get(url, clientOptions)
	}

	public post = (
		url: HttpClientInput | HttpClientUrl,
		options?: HttpClientOptions,
	) => {
		const { searchParams, ...clientOptions } = options ?? {}
		url = this.buildUrl(url, searchParams)
		return this._client.post(url, clientOptions)
	}

	public put = (
		url: HttpClientInput | HttpClientUrl,
		options?: HttpClientOptions,
	) => {
		const { searchParams, ...clientOptions } = options ?? {}
		url = this.buildUrl(url, searchParams)
		return this._client.put(url, clientOptions)
	}

	public delete = (
		url: HttpClientInput | HttpClientUrl,
		options?: HttpClientOptions,
	) => {
		const { searchParams, ...clientOptions } = options ?? {}
		url = this.buildUrl(url, searchParams)
		return this._client.delete(url, clientOptions)
	}

	public patch = (
		url: HttpClientInput | HttpClientUrl,
		options?: HttpClientOptions,
	) => {
		const { searchParams, ...clientOptions } = options ?? {}
		url = this.buildUrl(url, searchParams)
		return this._client.patch(url, clientOptions)
	}

	public head = (
		url: HttpClientInput | HttpClientUrl,
		options?: HttpClientOptions,
	) => {
		const { searchParams, ...clientOptions } = options ?? {}
		url = this.buildUrl(url, searchParams)
		return this._client.head(url, clientOptions)
	}

	public request = (
		method: HttpClientMethod,
		url: HttpClientInput | HttpClientUrl,
		options?: HttpClientRequestOptions,
	) => {
		const { searchParams, abortController, ...clientOptions } =
			options ?? {}
		url = this.buildUrl(url, searchParams)
		const { controller, signal } =
			HttpClient.createAbortController(abortController)
		return {
			responsePromise: this[method](url, { signal, ...clientOptions }),
			abort: (reason?: string) => controller.abort(reason),
			signal,
		}
	}

	public fetch = (request: Request) => {
		return this._client(request)
	}

	public extend = (options: HttpClientOptions) => {
		const { searchParams, ...clientOptions } = options ?? {}
		this._client = this._client.extend(clientOptions)
		this._urlBuilder.extend(searchParams ?? {})
	}

	public clone = (options?: HttpClientOptions) => {
		const { searchParams, ...clientOptions } = options ?? {}
		return new HttpClient({
			client: this._client.extend(clientOptions),
			urlBuilder: this._urlBuilder.clone(searchParams),
		})
	}

	public setBearerToken = (token: string | undefined | null) => {
		this.extend({
			headers: {
				Authorization: token ? `bearer ${token}` : undefined,
			},
		})
	}

	public get stop() {
		return this._client.stop
	}

	public buildUrl(
		url: HttpClientInput | HttpClientUrl,
		options?: UrlBuilderOptions,
	): HttpClientInput {
		if (HttpClient.validHttpClientUrl(url)) {
			const { template, params } = url as HttpClientUrl
			return this._urlBuilder.build(template, params, options)
		}
		return url as HttpClientInput
	}

	public static buildUrl = (
		url: HttpClientInput | HttpClientUrl,
		options?: UrlBuilderOptions,
	) => {
		if (HttpClient.validHttpClientUrl(url)) {
			const { template, params } = url as HttpClientUrl
			return UrlBuilder.build(template, params, options)
		}
		return url as HttpClientInput
	}

	private static validHttpClientUrl(url: HttpClientInput | HttpClientUrl) {
		return (
			typeof url !== 'string' &&
			!(url instanceof URL) &&
			!(url instanceof Request)
		)
	}

	public static createAbortController = (
		abortController?: AbortController,
	) => {
		const controller = abortController ?? new AbortController()
		const { signal } = controller
		return { controller, signal }
	}
}
