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
export type HttpClientMethod = HttpMethod
export type HttpClientHeaders = KyHeadersInit
export type HttpClientRetryOptions = RetryOptions
export type HttpClientHooks = Hooks
export type HttpClientInput = Input
export type HttpClientUrlTemplate = {
	template: string
	params: ParamMap
}
export type HttpClientInputTemplate = Input | HttpClientUrlTemplate

export interface HttpClientInstance {
	get: (
		url: HttpClientInputTemplate,
		options?: HttpClientOptions,
	) => HttpClientResponsePromise
	post: (
		url: HttpClientInputTemplate,
		options?: HttpClientOptions,
	) => HttpClientResponsePromise
	put: (
		url: HttpClientInputTemplate,
		options?: HttpClientOptions,
	) => HttpClientResponsePromise
	delete: (
		url: HttpClientInputTemplate,
		options?: HttpClientOptions,
	) => HttpClientResponsePromise
	patch: (
		url: HttpClientInputTemplate,
		options?: HttpClientOptions,
	) => HttpClientResponsePromise
	head: (
		url: HttpClientInputTemplate,
		options?: HttpClientOptions,
	) => HttpClientResponsePromise
	extend: (options: HttpClientOptions) => void
	clone: (options?: HttpClientOptions) => HttpClientInstance
	fetch: (request: Request) => HttpClientResponsePromise
	request: (
		method: HttpClientMethod,
		url: HttpClientInputTemplate,
		options?: HttpClientOptions,
	) => {
		responsePromise: HttpClientResponsePromise
		abort: (reason?: string) => void
		signal: AbortSignal
	}
	setBearerToken: (token: string) => void
	buildUrl: (
		url: HttpClientInputTemplate,
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
		url: HttpClientInputTemplate,
		options: HttpClientOptions = {},
	) => {
		const { searchParams, ...clientOptions } = options
		return this._client.get(this.buildUrl(url, searchParams), clientOptions)
	}

	public post = (
		url: HttpClientInputTemplate,
		options: HttpClientOptions = {},
	) => {
		const { searchParams, ...clientOptions } = options
		return this._client.post(
			this.buildUrl(url, searchParams),
			clientOptions,
		)
	}

	public put = (
		url: HttpClientInputTemplate,
		options: HttpClientOptions = {},
	) => {
		const { searchParams, ...clientOptions } = options
		return this._client.put(this.buildUrl(url, searchParams), clientOptions)
	}

	public delete = (
		url: HttpClientInputTemplate,
		options: HttpClientOptions = {},
	) => {
		const { searchParams, ...clientOptions } = options
		return this._client.delete(
			this.buildUrl(url, searchParams),
			clientOptions,
		)
	}

	public patch = (
		url: HttpClientInputTemplate,
		options: HttpClientOptions = {},
	) => {
		const { searchParams, ...clientOptions } = options
		return this._client.patch(
			this.buildUrl(url, searchParams),
			clientOptions,
		)
	}

	public head = (
		url: HttpClientInputTemplate,
		options: HttpClientOptions = {},
	) => {
		const { searchParams, ...clientOptions } = options
		return this._client.head(
			this.buildUrl(url, searchParams),
			clientOptions,
		)
	}

	public request = (
		method: HttpClientMethod,
		url: HttpClientInputTemplate,
		options: HttpClientRequestOptions = {},
	) => {
		const { abortController, ...otherOptions } = options
		const { controller, signal } =
			HttpClient.createAbortController(abortController)
		return {
			responsePromise: this[method](url, { signal, ...otherOptions }),
			abort: (reason?: string) => controller.abort(reason),
			signal,
		}
	}

	public fetch = (request: Request) => {
		return this._client(request)
	}

	public extend = (options: HttpClientOptions = {}) => {
		const { searchParams, ...clientOptions } = options
		this._client = this._client.extend(clientOptions)
		this._urlBuilder.extend(searchParams ?? {})
	}

	public clone = (options: HttpClientOptions = {}) => {
		const { searchParams, ...clientOptions } = options
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
		url: HttpClientInputTemplate,
		options?: UrlBuilderOptions,
	): HttpClientInput {
		return HttpClient.buildUrl(url, options, this._urlBuilder)
	}

	public static buildUrl = (
		url: HttpClientInputTemplate,
		options?: UrlBuilderOptions,
		builder?: UrlBuilderInstance,
	) => {
		if (HttpClient.isUrlTemplate(url)) {
			const { template, params } = url as HttpClientUrlTemplate
			return builder
				? builder.build(template, params, options)
				: UrlBuilder.build(template, params, options)
		}
		return url as HttpClientInput
	}

	private static isUrlTemplate(url: HttpClientInputTemplate) {
		return (
			typeof url === 'object' &&
			url !== null &&
			((arrayOfKeys: string[]) =>
				['template', 'params'].every((key) =>
					arrayOfKeys.includes(key),
				))(Object.keys(url))
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
