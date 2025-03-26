import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { createHttpClient, removeHttpClient, useHttpClient } from '../src/vue'

const fetchMock = createFetchMock(vi)
const httpClient = createHttpClient()

const component = {
    template: '<div />',
}

describe('vue useHttpClient', () => {
    beforeEach(() => {
        fetchMock.enableMocks()
        fetchMock.resetMocks()
    })

    mount(component, {
        global: {
            plugins: [httpClient],
        },
    })

    it('should make a GET request', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
        const { client } = useHttpClient()
        const data = await client.get('https://myapi.com/v1').json()
        expect(data[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.method).toEqual('GET')
        expect(request.url).toEqual('https://myapi.com/v1')
    })
    it('should make a GET request with template parameters', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
        const { requestGet } = useHttpClient()
        const { data, isLoading, isError } = requestGet({
            template: 'https://myapi.com/v1/:name',
            params: { name: 'example' },
        })
        expect(isLoading.value).toBe(true)
        expect(isError.value).toBe(false)
        await flushPromises()
        expect(isLoading.value).toBe(false)
        expect(isError.value).toBe(false)
        expect(data.value?.[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.method).toEqual('GET')
        expect(request.url).toEqual('https://myapi.com/v1/example')
    })
    it('should make a GET request with template and query parameters', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
        const { requestGet } = useHttpClient()
        const { data, isLoading, isError } = requestGet({
            template: 'https://myapi.com/v1/:type',
            params: { type: 'alpha', codes: ['col', 'pe', 'at'] },
        })
        expect(isLoading.value).toBe(true)
        expect(isError.value).toBe(false)
        await flushPromises()
        expect(isLoading.value).toBe(false)
        expect(isError.value).toBe(false)
        expect(data.value?.[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.method).toEqual('GET')
        expect(request.url).toEqual(
            'https://myapi.com/v1/alpha?codes=col,pe,at',
        )
    })
    it('should make a GET request with template and query parameters and prefix url', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
        createHttpClient({
            prefixUrl: 'https://myapi.com/v1',
            scope: 'myApi',
        })
        const { requestGet } = useHttpClient('myApi')
        const { data, isLoading, isError } = requestGet({
            template: ':type',
            params: { type: 'alpha', codes: ['col', 'pe', 'at'] },
        })
        expect(isLoading.value).toBe(true)
        expect(isError.value).toBe(false)
        await flushPromises()
        expect(isLoading.value).toBe(false)
        expect(isError.value).toBe(false)
        expect(data.value?.[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.method).toEqual('GET')
        expect(request.url).toEqual(
            'https://myapi.com/v1/alpha?codes=col,pe,at',
        )
    })
    it('should make a GET request with error', async () => {
        fetchMock.mockResponseOnce(() => ({ status: 404 }))
        createHttpClient({
            prefixUrl: 'https://myapi.com/v2',
            scope: 'myApi2',
        })
        const { requestGet } = useHttpClient('myApi2')
        const { isLoading, isError, error } = requestGet({
            template: ':type',
            params: { type: 'alpha', codes: ['col', 'pe', 'at'] },
        })
        expect(isLoading.value).toBe(true)
        expect(isError.value).toBe(false)
        await flushPromises()
        expect(isLoading.value).toBe(false)
        expect(isError.value).toBe(true)
        expect(error.value?.response.status).toBe(404)
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toEqual(
            'https://myapi.com/v2/alpha?codes=col,pe,at',
        )
    })
    it('should abort a GET request', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
        createHttpClient({
            prefixUrl: 'https://myapi.com/v3',
            scope: 'myApi3',
        })
        const { request } = useHttpClient('myApi3')
        const { responsePromise, abort, signal } = request('get', 'alpha')
        try {
            await responsePromise
        }
        catch (error) {
            signal?.aborted && expect(error.message).toBe('Aborted')
        }
        abort?.('Aborted')
    })

    it('should use a new httpClient', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))

        createHttpClient({
            prefixUrl: 'https://myapi.com/v4',
            scope: 'myApi4',
        })

        const { requestGet } = useHttpClient('myApi4')
        requestGet('alpha')
        await flushPromises()
        const request = fetchMock.mock.calls[0][0] as Request

        expect(request.url).toEqual('https://myapi.com/v4/alpha')
    })

    it('should catch error httpClient instance not found', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))

        createHttpClient({
            prefixUrl: 'https://myapi.com/v5',
            scope: 'myApi5',
        })

        try {
            const { requestGet } = useHttpClient('myApi5')
            requestGet('alpha')
        }
        catch (error) {
            expect(error.message).toBe('HttpClient instance not found')
        }
    })

    it('should throw error httpClient instance already exist', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))

        createHttpClient({
            prefixUrl: 'https://myapi.com/v6',
            scope: 'myApi6',
        })

        const { requestGet } = useHttpClient('myApi6')
        requestGet('alpha')

        await flushPromises()
        const request = fetchMock.mock.calls[0][0] as Request

        expect(request.url).toEqual('https://myapi.com/v6/alpha')

        try {
            createHttpClient({
                prefixUrl: 'https://myapi.com/v6',
                scope: 'myApi6',
            })
        }
        catch (error) {
            expect(error.message).toBe(
                'httpClient with scope myApi6 already exist',
            )
        }
    })

    it('should throw error after removeHttpClient', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))

        createHttpClient({
            prefixUrl: 'https://myapi.com/v7',
            scope: 'myApi7',
        })

        const { requestGet } = useHttpClient('myApi7')
        requestGet('alpha')

        await flushPromises()
        const request = fetchMock.mock.calls[0][0] as Request

        expect(request.url).toEqual('https://myapi.com/v7/alpha')

        removeHttpClient('myApi7')
        try {
            useHttpClient('myApi7')
        }
        catch (error) {
            expect(error.message).toBe('HttpClient instance not found')
        }

        requestGet('alpha')

        await flushPromises()
        const request2 = fetchMock.mock.calls[1][0] as Request

        expect(request2.url).toEqual('https://myapi.com/v7/alpha')
    })
})
