import type { ParamMap } from './types'

export interface Repository<Type> {
    read: (
        params?: ParamMap,
        options?: { key?: string | number | boolean } & Record<string, unknown>,
    ) => {
        responsePromise: Promise<{
            ok: boolean
            aborted?: boolean
            abortReason?: string
            data?: Type[]
            item?: Type
            metadata?: ParamMap
        }>
        abort?: (reason?: string) => void
        signal?: AbortSignal
    }

    create: (
        payload?: Type | Type[],
        params?: ParamMap,
        options?: Record<string, unknown>,
    ) => {
        responsePromise: Promise<{
            ok: boolean
            aborted?: boolean
            abortReason?: string
            data?: Type[]
            item?: Type
            metadata?: ParamMap
        }>
        abort?: (reason?: string) => void
        signal?: AbortSignal
    }

    update: (
        payload?: Type | Type[],
        params?: ParamMap,
        options?: Record<string, unknown>,
    ) => {
        responsePromise: Promise<{
            ok: boolean
            aborted?: boolean
            abortReason?: string
            data?: Type[]
            item?: Type
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
