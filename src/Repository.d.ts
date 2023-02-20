import type { ParamMap } from './types'

export interface Repository<Type> {
	read(
		params: ParamMap,
		options?: { key?: string; [string]: unknown },
	): {
		response: Promise<{
			ok: boolean
			data?: Type[]
			metadata?: ParamMap
		}>
		abort?: (reason?: string) => void
	}

	create(
		params: ParamMap,
		item: Type,
		options?: { [string]: unknown },
	): {
		response: Promise<{
			ok: boolean
			data?: Type
			metadata?: ParamMap
		}>
		abort?: (reason?: string) => void
	}

	update(
		params: ParamMap,
		item: Type,
		options?: { [string]: unknown },
	): {
		response: Promise<{
			ok: boolean
			data?: Type
			metadata?: ParamMap
		}>
		abort?: (reason?: string) => void
	}

	delete(
		params: ParamMap,
		options?: { [string]: unknown },
	): {
		response: Promise<{
			ok: boolean
		}>
		abort?: (reason?: string) => void
	}
}
