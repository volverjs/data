import type { ParamMap } from 'src/types'
import type { App, Ref } from 'vue'
import type { HttpClientInputTemplate, HttpClientInstanceOptions, HttpClientMethod, HttpClientRequestOptions, HttpClientResponse, HttpClientUrlTemplate, HTTPError } from '../HttpClient'
import type { RepositoryHttpOptions, RepositoryHttpReadOptions } from '../RepositoryHttp'
import { computed, readonly, ref, unref } from 'vue'
import {
    HttpClient,

} from '../HttpClient'
import {
    RepositoryHttp,

} from '../RepositoryHttp'

export enum HttpRequestStatus {
    loading = 'loading',
    error = 'error',
    success = 'success',
    idle = 'idle',
}

function defineHttpRequestStatus() {
    const status = ref<HttpRequestStatus>(HttpRequestStatus.idle)
    const isLoading = computed(() => status.value === HttpRequestStatus.loading)
    const isError = computed(() => status.value === HttpRequestStatus.error)
    const isSuccess = computed(() => status.value === HttpRequestStatus.success)
    return {
        status,
        isLoading,
        isError,
        isSuccess,
    }
}

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
const GLOBAL_SCOPE = 'global'

class HttpClientPlugin extends HttpClient {
    private _scope: string

    constructor(options: HttpClientInstanceOptions & { scope: string }) {
        super(options)
        this._scope = options.scope
    }

    get scope() {
        return this._scope
    }

    public install(app: App, { globalName = 'vvHttp' } = {}) {
        if (app.config.globalProperties[`$${globalName}`]) {
            throw new Error(`globalName already exist: ${globalName}`)
        }
        app.config.globalProperties[`$${globalName}`] = this
    }
}

/**
 * Create a new instance of a HttpClientPlugin.
 * @param options - The options for the http client {@link HttpClientInstanceOptions HttpClientInstanceOptions & { scope: string }}
 * @param options.scope - The scope (name) of the HttpClient instance
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
 *
 * Multiple instances with `scope`
 * ```typescript
 * import { createApp } from 'vue'
 * import { createHttpClient } from '@volverjs/data/vue'
 * import App from './App.vue'
 *
 * const app = createApp(App)
 * const client = createHttpClient({
 *  prefixUrl: 'https://my.api-v2.com',
 *  scope: 'apiV2'
 * })
 *
 * app.use(client, { globalName: 'httpClientV2' })
 *
 * const { requestPost } = useHttpClient('apiV2')
 * const { isLoading, isError, error, execute } = requestPost<User>(
 * 	'user',
 * 	computed(() => ({ immediate: false, json: data.value })),
 * )
 * ```
 */
export function createHttpClient({
    scope = GLOBAL_SCOPE,
    ...options
}: HttpClientInstanceOptions & { scope?: string } = {}) {
    if (httpClientInstances.has(scope)) {
        throw new Error(`httpClient with scope ${scope} already exist`)
    }

    const client = new HttpClientPlugin({ ...options, scope })
    httpClientInstances.set(scope, client)
    return client
}

/**
 * Use the composition API to remove an existing HttpClient instance (remove of http global instance is not permitted)
 * @param scope - The scope (name) of the HttpClient instance to remove
 * @returns - Boolean success or not
 */
export function removeHttpClient(scope: string): boolean {
    if (scope === GLOBAL_SCOPE) {
        throw new Error('You cannot remove httpClient global instance')
    }
    if (!httpClientInstances.has(scope)) {
        throw new Error(`httpClient with scope ${scope} not exist`)
    }
    return httpClientInstances.delete(scope)
}

/**
 * Use the composition API to get the HttpClient instance and reactive methods.
 * @remarks
 * If `HttpClientPlugin` is not created with `createHttpClient` and installed first, `useHttpClient` throw the error "HttpClient instance not found".
 * @param scope - The scope (name) of the HttpClient instance
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
 * const { isLoading, isSuccess, isError, error, execute } = requestPost<User>(
 * 	'user',
 * 	computed(() => ({ immediate: false, json: data.value })),
 * )
 * </script>
 * ```
 */
export function useHttpClient(scope = GLOBAL_SCOPE) {
    const client = httpClientInstances.get(scope)

    if (!client) {
        throw new Error('HttpClient instance not found')
    }
    const request = <T = unknown>(
        method: HttpClientMethod,
        url: HttpClientComposableInputTemplate,
        options: HttpClientComposableRequestOptions = {},
    ) => {
        const { status, isLoading, isError, isSuccess }
			= defineHttpRequestStatus()
        const immediate = unref(options).immediate ?? true
        const error = ref<HTTPError>()
        const data = ref<T>()
        const response = ref<HttpClientResponse>()
        const execute = (
            newUrl: HttpClientInputTemplate = unref(url),
            newOptions: HttpClientRequestOptions = unref(options),
        ) => {
            status.value = HttpRequestStatus.loading
            error.value = undefined
            data.value = undefined
            const { responsePromise, abort, signal } = client.request(
                method,
                newUrl,
                newOptions,
            )
            responsePromise
                .then((result) => {
                    response.value = result
                    return result.json<T>()
                })
                .then((parsed) => {
                    data.value = parsed
                    status.value = HttpRequestStatus.success
                })
                .catch((e) => {
                    if (!signal.aborted) {
                        error.value = e as HTTPError
                        status.value = HttpRequestStatus.error
                        return
                    }
                    status.value = HttpRequestStatus.idle
                })
            return { responsePromise, abort, signal }
        }
        return {
            execute,
            isLoading,
            isSuccess,
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
        requestGet: <T>(
            url: HttpClientComposableInputTemplate,
            options: HttpClientComposableRequestOptions = {},
        ) => request<T>('get', url, options),
        requestPost: <T>(
            url: HttpClientComposableInputTemplate,
            options: HttpClientComposableRequestOptions = {},
        ) => request<T>('post', url, options),
        requestPut: <T>(
            url: HttpClientComposableInputTemplate,
            options: HttpClientComposableRequestOptions = {},
        ) => request<T>('put', url, options),
        requestDelete: <T>(
            url: HttpClientComposableInputTemplate,
            options: HttpClientComposableRequestOptions = {},
        ) => request<T>('delete', url, options),
        requestHead: <T>(
            url: HttpClientComposableInputTemplate,
            options: HttpClientComposableRequestOptions = {},
        ) => request<T>('head', url, options),
        requestPatch: <T>(
            url: HttpClientComposableInputTemplate,
            options: HttpClientComposableRequestOptions = {},
        ) => request<T>('patch', url, options),
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
 * 		<div v-if="data?.[0]">{{ data?.[0].name }}</div>
 * 	</div>
 * </template>
 *
 * <script lang="ts" setup>
 * import { ref, computed } from 'vue'
 * import { useRepositoryHttp, type HTTPError } from '@volverjs/data/vue'
 *
 * type User = {
 * 	id: number,
 * 	name: string
 * }
 *
 * const { repository } = useRepositoryHttp<User>('users/:id')
 * const isLoading = ref(false)
 * const isError = computed(() => error.value !== undefined)
 * const error = ref<HTTPError>()
 * const item = ref<User>()
 *
 * const execute = async () => {
 * 	isLoading.value = true
 * 	try {
 * 		const { request } = repository.read({ id: 1 })
 * 		const response = await request
 * 		item.value = response.item
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
 * 		<div v-if="item">{{ item.name }}</div>
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
 * const { isLoading, isSuccess, isError, error, item, execute } = read(
 * 	{ id: 1 },
 * 	{ immediate: false }
 * )
 * </script>
 * ```
 */
export function useRepositoryHttp<T = unknown, TResponse = unknown>(template: string | HttpClientUrlTemplate,	options?: RepositoryHttpOptions<T, TResponse>) {
    const { client } = useHttpClient(options?.httpClientScope)
    const repository = new RepositoryHttp<T, TResponse>(
        client,
        template,
        options,
    )

    const create = (
        payload: T | Ref<T> | T[] | Ref<T[]> | undefined,
        params: ParamMap = {},
        options: HttpClientComposableRequestOptions = {},
    ) => {
        const { status, isLoading, isError, isSuccess }
			= defineHttpRequestStatus()
        const immediate = unref(options).immediate ?? true
        const error = ref<HTTPError>()
        const data = ref<T[]>()
        const item = ref<T>()
        const metadata = ref<ParamMap>()

        const execute = (
            newPayload = unref(payload),
            newParams: ParamMap = unref(params),
            newOptions: RepositoryHttpReadOptions = unref(options),
        ) => {
            status.value = HttpRequestStatus.loading
            error.value = undefined
            item.value = undefined
            data.value = undefined
            const { abort, responsePromise } = repository.create(
                newPayload,
                newParams,
                newOptions,
            )
            responsePromise
                .then((result) => {
                    data.value = result.data
                    item.value = result.item
                    metadata.value = result.metadata
                    if (result.aborted) {
                        status.value = HttpRequestStatus.idle
                        return
                    }
                    status.value = HttpRequestStatus.success
                })
                .catch((e) => {
                    error.value = e as HTTPError
                    status.value = HttpRequestStatus.error
                })
            return { abort, responsePromise }
        }
        return {
            execute,
            isLoading,
            isSuccess,
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
        const { status, isLoading, isError, isSuccess }
			= defineHttpRequestStatus()
        const immediate = unref(options).immediate ?? true
        const error = ref<HTTPError>()
        const data = ref<T[]>()
        const item = ref<T>()
        const metadata = ref<ParamMap>()

        const execute = (
            newParams: ParamMap = unref(params),
            newOptions: RepositoryHttpReadOptions = unref(options),
        ) => {
            status.value = HttpRequestStatus.loading
            error.value = undefined
            item.value = undefined
            data.value = undefined
            const { abort, responsePromise } = repository.read(
                newParams,
                newOptions,
            )
            responsePromise
                .then((result) => {
                    data.value = result.data
                    item.value = result.item
                    metadata.value = result.metadata
                    if (result.aborted) {
                        status.value = HttpRequestStatus.idle
                        return
                    }
                    status.value = HttpRequestStatus.success
                })
                .catch((e) => {
                    error.value = e as HTTPError
                    status.value = HttpRequestStatus.error
                })
            return { abort, responsePromise }
        }
        return {
            execute,
            isLoading,
            isSuccess,
            isError,
            error: readonly(error),
            data,
            item,
            metadata,
            ...(immediate ? execute() : {}),
        }
    }

    const update = (
        payload: T | Ref<T> | T[] | Ref<T[]> | undefined,
        params: ParamMap = {},
        options: HttpClientComposableRequestOptions = {},
    ) => {
        const { status, isLoading, isError, isSuccess }
			= defineHttpRequestStatus()
        const immediate = unref(options).immediate ?? true
        const error = ref<HTTPError>()
        const data = ref<T[]>()
        const item = ref<T>()
        const metadata = ref<ParamMap>()

        const execute = (
            newPayload = unref(payload),
            newParams: ParamMap = unref(params),
            newOptions: RepositoryHttpReadOptions = unref(options),
        ) => {
            status.value = HttpRequestStatus.loading
            error.value = undefined
            item.value = undefined
            data.value = undefined
            const { abort, responsePromise } = repository.update(
                newPayload,
                newParams,
                newOptions,
            )
            responsePromise
                .then((result) => {
                    data.value = result.data
                    item.value = result.item
                    metadata.value = result.metadata
                    if (result.aborted) {
                        status.value = HttpRequestStatus.idle
                        return
                    }
                    status.value = HttpRequestStatus.success
                })
                .catch((e) => {
                    error.value = e as HTTPError
                    status.value = HttpRequestStatus.error
                })
            return { abort, responsePromise }
        }
        return {
            execute,
            isLoading,
            isSuccess,
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
        const { status, isLoading, isError, isSuccess }
			= defineHttpRequestStatus()
        const immediate = unref(options).immediate ?? true
        const error = ref<HTTPError>()

        const execute = (
            newParams: ParamMap = unref(params),
            newOptions: RepositoryHttpReadOptions = unref(options),
        ) => {
            status.value = HttpRequestStatus.loading
            error.value = undefined
            const { abort, responsePromise } = repository.remove(
                newParams,
                newOptions,
            )
            responsePromise
                .then((result) => {
                    if (result.aborted) {
                        status.value = HttpRequestStatus.idle
                        return
                    }
                    status.value = HttpRequestStatus.success
                })
                .catch((e) => {
                    error.value = e as HTTPError
                    status.value = HttpRequestStatus.error
                })
            return { abort, responsePromise }
        }
        return {
            execute,
            isLoading,
            isSuccess,
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
