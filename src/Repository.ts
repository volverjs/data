import type { ParamMap } from './types'

export interface Repository<TRequest, TResponse = TRequest> {
    read: (
        params?: ParamMap,
        options?: { key?: string | number | boolean } & Record<string, unknown>,
    ) => {
        responsePromise: Promise<{
            ok: boolean
            aborted?: boolean
            abortReason?: string
            data?: TResponse[]
            item?: TResponse
            metadata?: ParamMap
        }>
        abort?: (reason?: string) => void
        signal?: AbortSignal
    }

    create: (
        payload?: TRequest | TRequest[],
        params?: ParamMap,
        options?: Record<string, unknown>,
    ) => {
        responsePromise: Promise<{
            ok: boolean
            aborted?: boolean
            abortReason?: string
            data?: TResponse[]
            item?: TResponse
            metadata?: ParamMap
        }>
        abort?: (reason?: string) => void
        signal?: AbortSignal
    }

    update: (
        payload?: TRequest | TRequest[],
        params?: ParamMap,
        options?: Record<string, unknown>,
    ) => {
        responsePromise: Promise<{
            ok: boolean
            aborted?: boolean
            abortReason?: string
            data?: TResponse[]
            item?: TResponse
            metadata?: ParamMap
        }>
        abort?: (reason?: string) => void
        signal?: AbortSignal
    }

    remove: (
        params?: ParamMap,
        options?: Record<string, unknown>,
    ) => {
        responsePromise: Promise<{
            ok: boolean
            aborted?: boolean
            abortReason?: string
        }>
        abort?: (reason?: string) => void
        signal?: AbortSignal
    }
}
