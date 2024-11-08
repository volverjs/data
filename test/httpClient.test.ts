import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { HttpClient } from '../node'

const fetchMock = createFetchMock(vi)

describe('httpClient', () => {
    beforeEach(() => {
        fetchMock.enableMocks()
        fetchMock.resetMocks()
    })

    it('should make a GET request', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
        const client = new HttpClient()
        const data = (await client.get('https://myapi.com/v1').json()) as {
            id: string
        }[]
        expect(data[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.method).toEqual('GET')
        expect(request.url).toEqual('https://myapi.com/v1')
    })
    it('should make a GET request with template parameters', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
        const client = new HttpClient()
        const data = (await client
            .get({
                template: 'https://myapi.com/v1/:name',
                params: { name: 'example' },
            })
            .json()) as {
            id: string
        }[]
        expect(data[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toEqual('https://myapi.com/v1/example')
    })
    it('should make a GET request with template and query parameters', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
        const client = new HttpClient()
        const data = (await client
            .get({
                template: 'https://myapi.com/v1/:type',
                params: { type: 'alpha', codes: ['col', 'pe', 'at'] },
            })
            .json()) as {
            id: string
        }[]
        expect(data[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toEqual(
            'https://myapi.com/v1/alpha?codes=col,pe,at',
        )
    })
    it('should make a GET request with template and query parameters and prefix url', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
        const client = new HttpClient({
            prefixUrl: 'https://myapi.com/v1',
        })
        const data = (await client
            .get({
                template: ':type',
                params: { type: 'alpha', codes: ['col', 'pe', 'at'] },
            })
            .json()) as {
            id: string
        }[]
        expect(data[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toEqual(
            'https://myapi.com/v1/alpha?codes=col,pe,at',
        )
    })
    it('should make a GET request with error', async () => {
        fetchMock.mockResponseOnce(() => ({ status: 404 }))
        const client = new HttpClient({
            prefixUrl: 'https://myapi.com/v1',
        })
        try {
            await client
                .get({
                    template: ':type',
                    params: { type: 'alpha', codes: ['col', 'pe', 'at'] },
                })
                .json()
        }
        catch (error) {
            expect(error.response.status).toBe(404)
        }
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toEqual(
            'https://myapi.com/v1/alpha?codes=col,pe,at',
        )
    })
    it('should abort a GET request', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
        const client = new HttpClient({
            prefixUrl: 'https://myapi.com/v1',
        })
        const { responsePromise, abort, signal } = client.request(
            'get',
            'alpha',
        )
        try {
            await responsePromise
        }
        catch (error) {
            signal.aborted && expect(error.message).toBe('Aborted')
        }
        abort('Aborted')
    })
})
