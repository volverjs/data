import { type App, type InjectionKey, getCurrentInstance } from 'vue'
import {
	HttpClient,
	type HttpClientOptions,
	type HttpClientInstanceOptions,
} from '../HttpClient'

export type HttpClientPluginOptions =
	| HttpClientInstanceOptions
	| { instance: HttpClient }

export const useHttpClient = (options?: HttpClientOptions) => {
	const root = getCurrentInstance()
	const client =
		root?.appContext.config.globalProperties.$vvHttp ?? new HttpClient()
	if (options) {
		client.extend(options)
	}
	return client
}

export const httpClientInjectionKey = Symbol() as InjectionKey<HttpClient>

export default {
	install(app: App, options?: HttpClientPluginOptions) {
		app.config.globalProperties.$vvHttp =
			(options && 'instance' in options ? options.instance : undefined) ??
			new HttpClient(options as HttpClientOptions)
		app.provide(httpClientInjectionKey, app.config.globalProperties.$vvHttp)
	},
}
