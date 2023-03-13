import { type App, type InjectionKey, inject } from 'vue'
import { HttpClient, type HttpClientInstanceOptions } from '../HttpClient'
import { type RepositoryHttpOptions, RepositoryHttp } from '../RepositoryHttp'

export const httpClientInjectionKey = Symbol() as InjectionKey<HttpClientVue>

export class HttpClientVue extends HttpClient {
	public install(app: App, { global = false } = {}) {
		if (global) {
			app.config.globalProperties.$vvHttp = this
		}
		app.provide(httpClientInjectionKey, this)
	}
}

export const createHttpClient = (options?: HttpClientInstanceOptions) => {
	return new HttpClientVue(options)
}

export const useHttpClient = (options?: HttpClientInstanceOptions) => {
	const client = inject(httpClientInjectionKey) ?? new HttpClientVue()
	if (options) {
		client.extend(options)
	}
	return client
}

export const useRepositoryHttp = <Type>(
	template: string,
	options?: RepositoryHttpOptions<Type>,
) => {
	const client = useHttpClient()
	return new RepositoryHttp<Type>(client, template, options)
}
