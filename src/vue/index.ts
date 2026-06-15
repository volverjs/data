import type { App, Ref } from 'vue'
import type { HttpClientInputTemplate, HttpClientInstanceOptions, HttpClientMethod, HttpClientRequestOptions, HttpClientResponse, HttpClientUrlTemplate, HTTPError } from '../HttpClient'
import type { RepositoryHttpOptions, RepositoryHttpReadOptions } from '../RepositoryHttp'
import type { ParamMap } from '../types'
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
type HttpClientComposableRequestOptions
    = | HttpClientRequestOptionsWithImmediate
        | Ref<HttpClientRequestOptionsWithImmediate>
type HttpClientComposableInputTemplate
    = | HttpClientInputTemplate
        | Ref<HttpClientInputTemplate>
type RepositoryHttpReadOptionsWithImmediate = RepositoryHttpReadOptions & {
    immediate?: boolean
}
type RepositoryHttpComposableReadOptions
    = | RepositoryHttpReadOptionsWithImmediate
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
    const request = <TRequest = unknown>(
        method: HttpClientMethod,
        url: HttpClientComposableInputTemplate,
        options: HttpClientComposableRequestOptions = {},
    ) => {
        const { status, isLoading, isError, isSuccess }
            = defineHttpRequestStatus()
        const immediate = unref(options).immediate ?? true
        const error = ref<HTTPError>()
        const data = ref<TRequest>()
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
                    return result.json<TRequest>()
                })
                .then((parsed) => {
                    data.value = parsed
                    status.value = HttpRequestStatus.success
                })
                .catch((e: unknown) => {
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
        requestGet: <TRequest>(
            url: HttpClientComposableInputTemplate,
            options: HttpClientComposableRequestOptions = {},
        ) => request<TRequest>('get', url, options),
        requestPost: <TRequest>(
            url: HttpClientComposableInputTemplate,
            options: HttpClientComposableRequestOptions = {},
        ) => request<TRequest>('post', url, options),
        requestPut: <TRequest>(
            url: HttpClientComposableInputTemplate,
            options: HttpClientComposableRequestOptions = {},
        ) => request<TRequest>('put', url, options),
        requestDelete: <TRequest>(
            url: HttpClientComposableInputTemplate,
            options: HttpClientComposableRequestOptions = {},
        ) => request<TRequest>('delete', url, options),
        requestHead: <TRequest>(
            url: HttpClientComposableInputTemplate,
            options: HttpClientComposableRequestOptions = {},
        ) => request<TRequest>('head', url, options),
        requestPatch: <TRequest>(
            url: HttpClientComposableInputTemplate,
            options: HttpClientComposableRequestOptions = {},
        ) => request<TRequest>('patch', url, options),
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
export function useRepositoryHttp<TRequest = unknown, TResponse = TRequest>(template: string | HttpClientUrlTemplate,	options?: RepositoryHttpOptions<TRequest, TResponse>) {
    const { client } = useHttpClient(options?.httpClientScope)
    const repository = new RepositoryHttp<TRequest, TResponse>(
        client,
        template,
        options,
    )

    /**
     * Shared reactive wrapper for the repository operations. It manages the
     * request status, error, optional `data`/`item`/`metadata` refs and the
     * `immediate` execution, delegating the actual call to `perform`.
     * @param immediate - Whether to execute the request on creation.
     * @param resolveArgs - Resolves (and unwraps) the default arguments at call time.
     * @param perform - Runs the repository operation with the resolved arguments.
     * @param withData - Whether the operation returns `data`/`item`/`metadata` (false for `remove`).
     */
    const defineRepositoryRequest = <TArgs extends unknown[]>(
        immediate: boolean,
        resolveArgs: () => TArgs,
        perform: (...args: TArgs) => {
            abort: (reason?: string) => void
            responsePromise: Promise<{
                ok: boolean
                aborted?: boolean
                abortReason?: string
                data?: TResponse[]
                item?: TResponse
                metadata?: ParamMap
            }>
        },
        withData = true,
    ) => {
        const { status, isLoading, isError, isSuccess }
            = defineHttpRequestStatus()
        const error = ref<HTTPError>()
        const data = ref<TResponse[]>()
        const item = ref<TResponse>()
        const metadata = ref<ParamMap>()

        const execute = (...overrides: Partial<TArgs>) => {
            status.value = HttpRequestStatus.loading
            error.value = undefined
            if (withData) {
                data.value = undefined
                item.value = undefined
            }
            const args = resolveArgs().map((value, index) =>
                overrides[index] === undefined ? value : overrides[index],
            ) as TArgs
            const { abort, responsePromise } = perform(...args)
            responsePromise
                .then((result) => {
                    if (withData) {
                        data.value = result.data
                        item.value = result.item
                        metadata.value = result.metadata
                    }
                    status.value = result.aborted
                        ? HttpRequestStatus.idle
                        : HttpRequestStatus.success
                })
                .catch((e: unknown) => {
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
            ...(withData ? { data, item, metadata } : {}),
            ...(immediate ? execute(...([] as unknown as Partial<TArgs>)) : {}),
        }
    }

    const create = (
        payload: TRequest | Ref<TRequest> | TRequest[] | Ref<TRequest[]> | undefined,
        params: ParamMap = {},
        options: HttpClientComposableRequestOptions = {},
    ) => defineRepositoryRequest(
        unref(options).immediate ?? true,
        () => [unref(payload), unref(params), unref(options)] as [
            TRequest | TRequest[] | undefined,
            ParamMap,
            HttpClientRequestOptions,
        ],
        (newPayload, newParams, newOptions) =>
            repository.create(newPayload, newParams, newOptions),
    )

    const read = (
        params: ParamMap | Ref<ParamMap>,
        options: RepositoryHttpComposableReadOptions = {},
    ) => defineRepositoryRequest(
        unref(options).immediate ?? true,
        () => [unref(params), unref(options)] as [ParamMap, RepositoryHttpReadOptions],
        (newParams, newOptions) => repository.read(newParams, newOptions),
    )

    const update = (
        payload: TRequest | Ref<TRequest> | TRequest[] | Ref<TRequest[]> | undefined,
        params: ParamMap = {},
        options: HttpClientComposableRequestOptions = {},
    ) => defineRepositoryRequest(
        unref(options).immediate ?? true,
        () => [unref(payload), unref(params), unref(options)] as [
            TRequest | TRequest[] | undefined,
            ParamMap,
            HttpClientRequestOptions,
        ],
        (newPayload, newParams, newOptions) =>
            repository.update(newPayload, newParams, newOptions),
    )

    const remove = (
        params: ParamMap | Ref<ParamMap>,
        options: HttpClientComposableRequestOptions = {},
    ) => defineRepositoryRequest(
        unref(options).immediate ?? true,
        () => [unref(params), unref(options)] as [ParamMap, HttpClientRequestOptions],
        (newParams, newOptions) => repository.remove(newParams, newOptions),
        false,
    )

    return {
        repository,
        read,
        create,
        update,
        remove,
    }
}
