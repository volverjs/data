import type { ParamMap } from 'src/types'
import {
	type App,
	type InjectionKey,
	type Ref,
	inject,
	ref,
	unref,
	readonly,
	computed,
} from 'vue'
import {
	HttpClient,
	type HttpClientInputTemplate,
	type HttpClientMethod,
	type HttpClientRequestOptions,
	type HttpClientResponse,
	type HttpClientInstanceOptions,
	type HTTPError,
} from '../HttpClient'
import {
	RepositoryHttp,
	type RepositoryHttpOptions,
	type RepositoryHttpReadOptions,
} from '../RepositoryHttp'

type HttpClientRequestOptionsWithImmediate = HttpClientRequestOptions & {
	immediate?: boolean
}
type HttpClientComposableRequestOptions =
	| HttpClientRequestOptionsWithImmediate
	| Ref<HttpClientRequestOptionsWithImmediate>
type HttpClientComposableInputTemplate =
	| HttpClientInputTemplate
	| Ref<HttpClientInputTemplate>
type RepositoryHttpReadOptionsWithImmediate = RepositoryHttpReadOptions & {
	immediate?: boolean
}
type RepositoryHttpComposableReadOptions =
	| RepositoryHttpReadOptionsWithImmediate
	| Ref<RepositoryHttpReadOptionsWithImmediate>

export const httpClientInjectionKey = Symbol() as InjectionKey<HttpClientPlugin>

export class HttpClientPlugin extends HttpClient {
	public install(app: App, { global = false } = {}) {
		if (global) {
			app.config.globalProperties.$vvHttp = this
		}
		app.provide(httpClientInjectionKey, this)
	}
}

/**
 * Create a new instance of a HttpClient.
 * @param options - The options for the client {@link HttpClientInstanceOptions}
 * @returns The instance of the HttpClient, see {@link HttpClient}
 * @example
 * ```typescript
 * import { createApp } from 'vue'
 * import { createHttpClient } from '@volverjs/data/vue'
 * import App from './App.vue'
 *
 * const app = createApp(App)
 * const client = createHttpClient({
 *  prefixUrl: 'https://my.api.com'
 * })
 * app.use(client)
 * ```
 */
export const createHttpClient = (options?: HttpClientInstanceOptions) =>
	new HttpClientPlugin(options)

/**
 * Use the composition API to get the HttpClient instance and reactive methods.
 * @remarks
 * If `useHttpClient` is not called in the setup function of a component,
 * or if the `HttpClient` instance has not been installed, a new instance will be created.
 * @param options - The options for the client {@link HttpClientInstanceOptions}
 * @example
 * ```html
 * <template>
 *  <div>
 *  	<button @click="execute()">Execute</button>
 *   	<div v-if="isLoading">Loading...</div>
 *  	<div v-if="isError">{{ error }}</div>
 * 		<div v-if="data">{{ data.name }}</div>
 * 	</div>
 * </template>
 *
 * <script lang="ts" setup>
 * import { ref, computed } from 'vue'
 * import { useHttpClient } from '@volverjs/data/vue'
 *
 * const { client } = useHttpClient()
 * const isLoading = ref(false)
 * const isError = computed(() => error.value !== undefined)
 * const error = ref()
 * const data = ref<User>()
 *
 * type User = {
 * 	id: number,
 * 	name: string
 * }
 *
 * const execute = async () => {
 * 	isLoading.value = true
 * 	try {
 * 		const response = await client.get('user/1')
 * 		data.value = await response.json<User>()
 * 	} catch (e) {
 * 		error.value = e.message
 * 	} finally {
 * 		isLoading.value = false
 * 	}
 * }
 * </script>
 * ```
 * @example
 * ```html
 * <template>
 *  <div>
 *  	<button @click="execute()">Execute</button>
 *   	<div v-if="isLoading">Loading...</div>
 *  	<div v-if="isError">{{ error }}</div>
 * 		<div v-if="data">{{ data.name }}</div>
 * 	</div>
 * </template>
 *
 * <script setup>
 * import { useHttpClient } from '@volverjs/data/vue'
 *
 * type User = {
 * 	id: number,
 * 	name: string
 * }
 *
 * const { get } = useHttpClient()
 * const {
 * 	isLoading,
 *	isError,
 * 	error,
 * 	data,
 * 	execute,
 * } = get<User>('user/1', { immediate: false })
 * </script>
 * ```
 * @example
 * ```html
 * <template>
 *  <form @submit.prevent="execute()">
 *   	<div v-if="isLoading">Loading...</div>
 *  	<div v-if="isError">{{ error }}</div>
 * 		<input type="text" v-model="data.name" />
 *  	<button type="submit">Submit</button>
 * 	</form>
 * </template>
 *
 * <script lang="ts" setup>
 * import { useHttpClient } from '@volverjs/data/vue'
 *
 * type User = {
 * 	id: number
 * 	name: string
 * }
 *
 * const data = ref<Partial<User>>({ name: '' })
 *
 * const { post } = useHttpClient()
 * const { isLoading, isError, error, execute } = post<User>(
 * 	'user',
 * 	computed(() => ({ immediate: false, json: data.value })),
 * )
 * </script>
 * ```
 */
export const useHttpClient = (options?: HttpClientInstanceOptions) => {
	const client = inject(httpClientInjectionKey) ?? new HttpClientPlugin()
	if (options) {
		client.extend(options)
	}
	const request = <Type = unknown>(
		method: HttpClientMethod,
		url: HttpClientComposableInputTemplate,
		options: HttpClientComposableRequestOptions = {},
	) => {
		const immediate = unref(options).immediate ?? true
		const isLoading = ref(false)
		const isError = computed(() => error.value !== undefined)
		const error = ref<HTTPError>()
		const data = ref<Type>()
		const response = ref<HttpClientResponse>()
		const execute = (
			newUrl: HttpClientInputTemplate = unref(url),
			newOptions: HttpClientRequestOptions = unref(options),
		) => {
			isLoading.value = true
			error.value = undefined
			const { responsePromise, abort, signal } = client.request(
				method,
				newUrl,
				newOptions,
			)
			responsePromise
				.then((result) => {
					response.value = result
					return result.json<Type>()
				})
				.then((parsed) => {
					data.value = parsed
				})
				.catch((e) => {
					if (!signal.aborted) {
						error.value = e as HTTPError
					}
				})
				.finally(() => {
					isLoading.value = false
				})
			return { responsePromise, abort, signal }
		}
		return {
			execute,
			isLoading: readonly(isLoading),
			isError,
			error: readonly(error),
			data,
			response,
			...(immediate ? execute() : {}),
		}
	}
	return {
		client,
		request,
		requestGet: <Type>(
			url: HttpClientComposableInputTemplate,
			options: HttpClientComposableRequestOptions = {},
		) => request<Type>('get', url, options),
		requestPost: <Type>(
			url: HttpClientComposableInputTemplate,
			options: HttpClientComposableRequestOptions = {},
		) => request<Type>('post', url, options),
		requestPut: <Type>(
			url: HttpClientComposableInputTemplate,
			options: HttpClientComposableRequestOptions = {},
		) => request<Type>('put', url, options),
		requestDelete: <Type>(
			url: HttpClientComposableInputTemplate,
			options: HttpClientComposableRequestOptions = {},
		) => request<Type>('delete', url, options),
		requestHead: <Type>(
			url: HttpClientComposableInputTemplate,
			options: HttpClientComposableRequestOptions = {},
		) => request<Type>('head', url, options),
		requestPatch: <Type>(
			url: HttpClientComposableInputTemplate,
			options: HttpClientComposableRequestOptions = {},
		) => request<Type>('patch', url, options),
	}
}

/**
 * Use the composition API to get a new instance of a RepositoryHttp.
 * @remarks
 * If `useRepositoryHttp` is not called in the setup function of a component,
 * or if the `HttpClient` instance has not been installed, a new instance will be created.
 * @param template - The template string for the repository
 * @param options - The options for the repository {@link RepositoryHttpOptions}
 * @returns The instance of the RepositoryHttp, see {@link RepositoryHttp}
 * @example
 * ```html
 * <template>
 * 	<div>
 * 		<button @click="execute">Execute</button>
 * 		<div v-if="isLoading">Loading...</div>
 * 		<div v-if="isError">{{ error }}</div>
 * 		<div v-if="data">{{ data.name }}</div>
 * 	</div>
 * </template>
 *
 * <script lang="ts" setup>
 * import { ref, computed } from 'vue'
 * import { useRepositoryHttp } from '@volverjs/data/vue'
 *
 * type User = {
 * 	id: number,
 * 	name: string
 * }
 *
 * const { repository } = useRepositoryHttp<User>('users/:id')
 * const isLoading = ref(false)
 * const isError = computed(() => error.value !== undefined)
 * const error = ref()
 * const data = ref()
 *
 * const execute = async () => {
 * 	isLoading.value = true
 * 	try {
 * 		const { request } = repository.read({ id: 1 })
 * 		const response = await request
 * 		data.value = response.data
 * 	} catch (e) {
 * 		error.value = e.message
 * 	} finally {
 * 		isLoading.value = false
 * 	}
 * }
 * </script>
 * ```
 * @example
 * ```html
 * <template>
 * 	<div>
 * 		<button @click="execute">Execute</button>
 * 		<div v-if="isLoading">Loading...</div>
 * 		<div v-if="isError">{{ error }}</div>
 * 		<div v-if="data">{{ data.name }}</div>
 * 	</div>
 * </template>
 *
 * <script lang="ts" setup>
 * import { useRepositoryHttp } from '@volverjs/data/vue'
 *
 * type User = {
 * 	id: number,
 * 	name: string
 * }
 *
 * const { read } = useRepositoryHttp<User>('users/:id')
 * const { isLoading, isError, error, data, execute } = read(
 * 	{ id: 1 },
 * 	{ immediate: false }
 * )
 * </script>
 * ```
 */
export const useRepositoryHttp = <Type = unknown>(
	template: string,
	options?: RepositoryHttpOptions<Type>,
	httpClientOptions?: HttpClientInstanceOptions,
) => {
	const { client } = useHttpClient(httpClientOptions)
	const repository = new RepositoryHttp<Type>(client, template, options)

	const create = (
		item: Type | Ref<Type>,
		params: ParamMap = {},
		options: HttpClientComposableRequestOptions = {},
	) => {
		const immediate = unref(options).immediate ?? true
		const isLoading = ref(false)
		const isError = computed(() => error.value !== undefined)
		const error = ref<HTTPError>()
		const data = ref<Type>()
		const metadata = ref<ParamMap>()

		const execute = (
			newItem: Type = unref(item),
			newParams: ParamMap = unref(params),
			newOptions: RepositoryHttpReadOptions = unref(options),
		) => {
			isLoading.value = true
			error.value = undefined
			const { abort, responsePromise } = repository.create(
				newItem,
				newParams,
				newOptions,
			)
			responsePromise
				.then((result) => {
					data.value = result.data
					metadata.value = result.metadata
				})
				.catch((e) => {
					error.value = e as HTTPError
				})
				.finally(() => {
					isLoading.value = false
				})
			return { abort, responsePromise }
		}
		return {
			execute,
			isLoading: readonly(isLoading),
			isError,
			error: readonly(error),
			data,
			metadata,
			...(immediate ? execute() : {}),
		}
	}

	const read = (
		params: ParamMap | Ref<ParamMap>,
		options: RepositoryHttpComposableReadOptions = {},
	) => {
		const immediate = unref(options).immediate ?? true
		const isLoading = ref(false)
		const isError = computed(() => error.value !== undefined)
		const error = ref<HTTPError>()
		const data = ref<Type[]>()
		const item = ref<Type>()
		const metadata = ref<ParamMap>()

		const execute = (
			newParams: ParamMap = unref(params),
			newOptions: RepositoryHttpReadOptions = unref(options),
		) => {
			isLoading.value = true
			error.value = undefined
			const { abort, responsePromise } = repository.read(
				newParams,
				newOptions,
			)
			responsePromise
				.then((result) => {
					data.value = result.data
					item.value = result.data?.[0]
					metadata.value = result.metadata
				})
				.catch((e) => {
					error.value = e as HTTPError
				})
				.finally(() => {
					isLoading.value = false
				})
			return { abort, responsePromise }
		}
		return {
			execute,
			isLoading: readonly(isLoading),
			isError,
			error: readonly(error),
			data,
			item,
			metadata,
			...(immediate ? execute() : {}),
		}
	}

	const update = (
		item: Type | Ref<Type>,
		params: ParamMap = {},
		options: HttpClientComposableRequestOptions = {},
	) => {
		const immediate = unref(options).immediate ?? true
		const isLoading = ref(false)
		const isError = computed(() => error.value !== undefined)
		const error = ref<HTTPError>()
		const data = ref<Type>()
		const metadata = ref<ParamMap>()

		const execute = (
			newItem: Type = unref(item),
			newParams: ParamMap = unref(params),
			newOptions: RepositoryHttpReadOptions = unref(options),
		) => {
			isLoading.value = true
			error.value = undefined
			const { abort, responsePromise } = repository.update(
				newItem,
				newParams,
				newOptions,
			)
			responsePromise
				.then((result) => {
					data.value = result.data
					metadata.value = result.metadata
				})
				.catch((e) => {
					error.value = e as HTTPError
				})
				.finally(() => {
					isLoading.value = false
				})
			return { abort, responsePromise }
		}
		return {
			execute,
			isLoading: readonly(isLoading),
			isError,
			error: readonly(error),
			data,
			metadata,
			...(immediate ? execute() : {}),
		}
	}

	const remove = (
		params: ParamMap | Ref<ParamMap>,
		options: HttpClientComposableRequestOptions = {},
	) => {
		const immediate = unref(options).immediate ?? true
		const isLoading = ref(false)
		const isError = computed(() => error.value !== undefined)
		const error = ref<HTTPError>()

		const execute = (
			newParams: ParamMap = unref(params),
			newOptions: RepositoryHttpReadOptions = unref(options),
		) => {
			isLoading.value = true
			error.value = undefined
			const { abort, responsePromise } = repository.remove(
				newParams,
				newOptions,
			)
			responsePromise
				.catch((e) => {
					error.value = e as HTTPError
				})
				.finally(() => {
					isLoading.value = false
				})
			return { abort, responsePromise }
		}
		return {
			execute,
			isLoading: readonly(isLoading),
			isError,
			error: readonly(error),
			...(immediate ? execute() : {}),
		}
	}

	return {
		repository,
		read,
		create,
		update,
		remove,
	}
}
