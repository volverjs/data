import type { ParamMap } from './types'

export interface Repository<Type> {
	read(
		params: ParamMap,
		options?: { key?: string | number | boolean; } & Record<string, unknown>,
	): {
		responsePromise: Promise<{
			ok: boolean
			aborted?: boolean
			abortReason?: string
			data?: Type[]
			metadata?: ParamMap
		}>
		abort?: (reason?: string) => void
		signal?: AbortSignal
	}

	create(
		item: Type,
		params?: ParamMap,
		options?:  Record<string, unknown>,
	): {
		responsePromise: Promise<{
			ok: boolean
			aborted?: boolean
			abortReason?: string
			data?: Type
			metadata?: ParamMap
		}>
		abort?: (reason?: string) => void
		signal?: AbortSignal
	}

	update(
		item: Type,
		params?: ParamMap,
		options?: Record<string, unknown>,
	): {
		responsePromise: Promise<{
			ok: boolean
			aborted?: boolean
			abortReason?: string
			data?: Type
			metadata?: ParamMap
		}>
		abort?: (reason?: string) => void
		signal?: AbortSignal
	}

	remove(
		params: ParamMap,
		options?: Record<string, unknown>,
	): {
		responsePromise: Promise<{
			ok: boolean
			aborted?: boolean
			abortReason?: string
		}>
		abort?: (reason?: string) => void
		signal?: AbortSignal
	}
}
