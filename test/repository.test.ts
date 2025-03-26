import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { HttpClient, RepositoryHttp } from '../node'

const fetchMock = createFetchMock(vi)

describe('repositoryHttp', () => {
    beforeEach(() => {
        fetchMock.enableMocks()
        fetchMock.resetMocks()
    })

    it('should read', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
        const client = new HttpClient({
            prefixUrl: 'https://myapi.com/v1',
        })
        const repository = new RepositoryHttp<{ id: string }>(client, ':type')
        const { responsePromise } = repository.read({
            type: 'alpha',
            codes: ['col', 'pe', 'at'],
        })
        const { data, ok } = await responsePromise
        expect(ok).toBe(true)
        expect(data?.[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toEqual(
            'https://myapi.com/v1/alpha?codes=col,pe,at',
        )
    })
    it('should stop a read request', async () => {
        const client = new HttpClient({
            prefixUrl: 'https://myapi.com/v1',
        })
        const repository = new RepositoryHttp(client, ':type?')
        const { responsePromise, abort } = repository.read({})
        abort('Aborted')
        const { ok, abortReason } = await responsePromise
        expect(ok).toBe(false)
        expect(abortReason).toBe('Aborted')
    })
    it('should merge 2 equals read requests', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
        const client = new HttpClient({
            prefixUrl: 'https://myapi.com/v1',
        })
        const repository = new RepositoryHttp<{ id: string }>(client, ':type')
        const { responsePromise: responsePromise1 } = repository.read({
            type: 'alpha',
            codes: ['col', 'pe', 'at'],
        })
        const { responsePromise: responsePromise2 } = repository.read({
            type: 'alpha',
            codes: ['col', 'pe', 'at'],
        })
        const { data: data1, ok: ok1 } = await responsePromise1
        const { data: data2, ok: ok2 } = await responsePromise2
        expect(ok1).toBe(true)
        expect(ok2).toBe(true)
        expect(data1?.[0].id).toBe('12345')
        expect(data2?.[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toEqual(
            'https://myapi.com/v1/alpha?codes=col,pe,at',
        )
    })
    it('should merge 2 equals read request, first aborted', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
        const client = new HttpClient({
            prefixUrl: 'https://myapi.com/v1',
        })
        const repository = new RepositoryHttp<{ id: string }>(client, ':type')
        const { responsePromise: responsePromise1, abort } = repository.read({
            type: 'alpha',
            codes: ['col', 'pe', 'at'],
        })
        const { responsePromise: responsePromise2 } = repository.read({
            type: 'alpha',
            codes: ['col', 'pe', 'at'],
        })
        abort('Aborted')
        const { ok: ok1 } = await responsePromise1
        const { data: data2, ok: ok2 } = await responsePromise2
        expect(ok1).toBe(false)
        expect(ok2).toBe(true)
        expect(data2?.[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toEqual(
            'https://myapi.com/v1/alpha?codes=col,pe,at',
        )
    })
    it('should merge 2 equals read request, second aborted', async () => {
        fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
        const client = new HttpClient({
            prefixUrl: 'https://myapi.com/v1',
        })
        const repository = new RepositoryHttp<{ id: string }>(client, ':type')
        const { responsePromise: responsePromise1 } = repository.read({
            type: 'alpha',
            codes: ['col', 'pe', 'at'],
        })
        const { responsePromise: responsePromise2, abort } = repository.read({
            type: 'alpha',
            codes: ['col', 'pe', 'at'],
        })
        abort('Aborted')
        const { data: data1, ok: ok1 } = await responsePromise1
        const { ok: ok2 } = await responsePromise2
        expect(ok1).toBe(true)
        expect(ok2).toBe(false)
        expect(data1?.[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toEqual(
            'https://myapi.com/v1/alpha?codes=col,pe,at',
        )
    })
})
