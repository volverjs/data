import type { HttpClientUrlTemplate } from '../HttpClient'
import {
	HTTPError,
	HttpClient,
	type HttpClientInputTemplate,
	type HttpClientInstanceOptions,
	type HttpClientMethod,
	type HttpClientRequestOptions,
	type HttpClientResponse,
} from '../HttpClient'
import type { RepositoryHttpOptions } from '../RepositoryHttp'
import type { RepositoryHttpReadOptions } from '../RepositoryHttp'
import { RepositoryHttp } from '../RepositoryHttp'
import type { ParamMap } from 'src/types'
import { type App, type Ref, ref, unref, readonly, computed } from 'vue'

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

const httpClientInstances: Map<string, HttpClient> = new Map()
const GLOBAL = 'global'

export class HttpClientPlugin {
	globalOptions?: HttpClientInstanceOptions

	constructor(options?: HttpClientInstanceOptions) {
		this.globalOptions = options
	}

	public install(app: App, { global = false } = {}) {
		const globalHttpClient = new HttpClient(this.globalOptions)

		httpClientInstances.set(GLOBAL, globalHttpClient)

		if (global) {
			app.config.globalProperties.$vvHttp = globalHttpClient
		}
	}
}

/**
 * Create a new instance of a HttpClientPlugin.
 * @param options - The options for the http client {@link HttpClientInstanceOptions}
 * @returns The instance of the HttpClientPlugin, see {@link HttpClientPlugin}
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
 * Use the composition API to add an HttpClient instance and get it.
 * @remarks
 * If `addHttpClient` is called on an existing scope instance an error is throwed.
 * @param optionsOrInstance - Create new instance with this options, extends the options of an existing one {@link HttpClientInstanceOptions} or could be directly an HttpClient instance {@link HttpClient}
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
 * import { addHttpClient } from '@volverjs/data/vue'
 *
 * const { client } = addHttpClient('v2Api', { prefixUrl: 'https://my.api.com/v2' })
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
 * import { addHttpClient, useHttpClient } from '@volverjs/data/vue'
 *
 * type User = {
 * 	id: number,
 * 	name: string
 * }
 *
 * addHttpClient('v2Api', { prefixUrl: 'https://my.api.com/v2' })
 *
 * const { requestGet } = useHttpClient('v2Api')
 * const {
 * 	isLoading,
 *	isError,
 * 	error,
 * 	data,
 * 	execute,
 * } = requestGet<User>('user/1', { immediate: false })
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
 * import { addHttpClient, useHttpClient } from '@volverjs/data/vue'
 *
 * type User = {
 * 	id: number
 * 	name: string
 * }
 *
 * const data = ref<Partial<User>>({ name: '' })
 *
 * addHttpClient('v2Api', { prefixUrl: 'https://my.api.com/v2' })
 *
 * const { requestPost } = useHttpClient('v2Api')
 * const { isLoading, isError, error, execute } = requestPost<User>(
 * 	'user',
 * 	computed(() => ({ immediate: false, json: data.value })),
 * )
 * </script>
 * ```
 */
export const addHttpClient = (
	scope: string,
	optionsOrInstance?: HttpClientInstanceOptions | HttpClient,
) => {
	if (httpClientInstances.has(scope)) {
		throw new Error(`httpClient with scope ${scope} already exist`)
	}

	if (optionsOrInstance instanceof HttpClient) {
		const client = optionsOrInstance
		httpClientInstances.set(scope, client)
		return { client }
	}

	const client = new HttpClient(optionsOrInstance)
	httpClientInstances.set(scope, client)
	return { client }
}

/**
 * Use the composition API to remove an existing HttpClient instance (remove of http global instance is not permitted)
 * @param scope - The scope (name) of the HttpClient instance to remove
 * @returns - Boolean success or not
 */
export const removeHttpClient = (scope: string): boolean => {
	if (scope === GLOBAL) {
		throw new Error('You cannot remove httpClient global instance')
	}
	return httpClientInstances.delete(scope)
}

/**
 * Use the composition API to get the HttpClient instance and reactive methods.
 * @remarks
 * If `HttpClientPlugin` is not created with `createHttpClient` and installed first, `useHttpClient` throw the error "HttpClient instance not found".
 * @param options - Extends the options of the client {@link HttpClientInstanceOptions}
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
 * const { requestGet } = useHttpClient()
 * const {
 * 	isLoading,
 *	isError,
 * 	error,
 * 	data,
 * 	execute,
 * } = requestGet<User>('user/1', { immediate: false })
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
 * const { requestPost } = useHttpClient()
 * const { isLoading, isError, error, execute } = requestPost<User>(
 * 	'user',
 * 	computed(() => ({ immediate: false, json: data.value })),
 * )
 * </script>
 * ```
 */
export const useHttpClient = (scope = GLOBAL) => {
	const client = httpClientInstances.get(scope)

	if (!client) {
		throw new Error('HttpClient instance not found')
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
 * If `HttpClientPlugin` is not created with `createHttpClient` and installed first, `useRepositoryHttp` throw the error "HttpClient instance not found".
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
	template: string | HttpClientUrlTemplate,
	options?: RepositoryHttpOptions<Type>,
) => {
	const { client } = useHttpClient(options?.httpClientScope)
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
