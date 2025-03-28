import AbortController from 'abort-controller'
import fetch, { Headers, Request, Response } from 'node-fetch'

const TEN_MEGABYTES = 1000 * 1000 * 10

if (!globalThis.fetch) {
    globalThis.fetch = (url, options) =>
        fetch(url, { highWaterMark: TEN_MEGABYTES, ...options })
}

if (!globalThis.Headers) {
    globalThis.Headers = Headers
}

if (!globalThis.Request) {
    globalThis.Request = Request
}

if (!globalThis.Response) {
    globalThis.Response = Response
}

if (!globalThis.AbortController) {
    globalThis.AbortController = AbortController
}

if (!globalThis.ReadableStream) {
    try {
        globalThis.ReadableStream = await import(
            'web-streams-polyfill/polyfill'
        )
    }
    catch {}
}

const { HttpClient, HTTPError, TimeoutError } = await import(
    '../dist/HttpClient'
)

const { Hash } = await import('../dist/Hash')
const { RepositoryHttp } = await import('../dist/RepositoryHttp')
const { UrlBuilder } = await import('../dist/UrlBuilder')

export { Hash, HttpClient, HTTPError, RepositoryHttp, TimeoutError, UrlBuilder }
