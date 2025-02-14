import type { IStringifyOptions } from 'qs'
import type { ParamMap } from './types'
import qs from 'qs'

export type UrlBuilderOptions = IStringifyOptions

export interface UrlBuilderInstance {
    build: (
        template: string,
        params: ParamMap,
        options?: UrlBuilderOptions,
    ) => string
    query: (params: ParamMap, options?: UrlBuilderOptions) => string
    extend: (options: UrlBuilderOptions) => void
    clone: (options?: UrlBuilderOptions) => UrlBuilderInstance
}

export class UrlBuilder implements UrlBuilderInstance {
    private _options?: UrlBuilderOptions

    constructor(options?: UrlBuilderOptions) {
        this._options = options
    }

    public extend(options: UrlBuilderOptions) {
        this._options = { ...this._options, ...options }
    }

    public clone(options?: UrlBuilderOptions) {
        return new UrlBuilder({ ...this._options, ...options })
    }

    public build(
        template: string,
        params: ParamMap,
        options?: UrlBuilderOptions,
    ): string {
        return UrlBuilder.build(template, params, {
            ...this._options,
            ...options,
        })
    }

    public query(params: ParamMap, options?: UrlBuilderOptions): string {
        return UrlBuilder.query(params, { ...this._options, ...options })
    }

    public static build(
        template: string,
		params: ParamMap = {},
		options?: UrlBuilderOptions,
    ): string {
        const cleanParams = Object.keys(params)
            .filter(k => params[k] !== undefined)
            .reduce((result, k) => {
                result[k] = params[k]
                return result
            }, {} as ParamMap)
        const { renderedPath, remainingParams } = UrlBuilder.path(
            template,
            cleanParams,
        )
        const renderedQuery = UrlBuilder.query(remainingParams, options)
        return UrlBuilder._join(renderedPath, '?', renderedQuery)
    }

    public static query(params: ParamMap, options?: UrlBuilderOptions): string {
        if (Object.keys(params).length < 1) {
            return ''
        }
        const qsConfiguration: UrlBuilderOptions = {
            ...options,
            skipNulls: options?.skipNulls ?? true, // default to true
            format: options?.format ?? 'RFC1738', // default to RFC1738
            arrayFormat: options?.arrayFormat ?? 'comma', // default to comma
            encodeValuesOnly: options?.encodeValuesOnly ?? true, // default to true
        }
        return qs.stringify(params, qsConfiguration)
    }

    public static validatePathParam(params: ParamMap, key: string) {
        const allowedTypes = ['boolean', 'string', 'number']

        if (!Object.prototype.hasOwnProperty.call(params, key)) {
            return {
                valid: false,
                message: `Missing value for path parameter ${key}.`,
            }
        }
        if (!allowedTypes.includes(typeof params[key])) {
            return {
                valid: false,
                message:
					`Path parameter ${key} cannot be of type ${typeof params[
					    key
					]}. ` + `Allowed types are: ${allowedTypes.join(', ')}.`,
            }
        }
        if (typeof params[key] === 'string' && params[key].trim() === '') {
            return {
                valid: false,
                message: `Path parameter ${key} cannot be an empty string.`,
            }
        }
        return { valid: true }
    }

    public static path(template: string, params: ParamMap = {}) {
        const remainingParams = { ...params }

        const renderedPath = template.replace(
            /\/?:[_A-Z]\w*\??/gi,
            (p) => {
                if (p === null) {
                    return ''
                }
                // do not replace "::"
                const key = p.replace(/[:?/]/g, '')
                const { valid, message } = UrlBuilder.validatePathParam(
                    params,
                    key,
                )
                if (p.includes('?') && !valid) {
                    return ''
                }
                if (!valid) {
                    throw new Error(message)
                }
                delete remainingParams[key]
                const encoded = encodeURIComponent(params[key])
                return p?.startsWith('/') ? `/${encoded}` : encoded
            },
        )

        return { renderedPath, remainingParams }
    }

    private static _join(
        part1: string,
        separator: string,
        part2: string,
    ): string {
        const p1 = part1.endsWith(separator)
            ? part1.slice(0, -separator.length)
            : part1
        const p2 = part2.startsWith(separator)
            ? part2.slice(separator.length)
            : part2
        return p1 === '' || p2 === '' ? p1 + p2 : p1 + separator + p2
    }
}
