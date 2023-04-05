import { flushPromises } from '@vue/test-utils'
import createFetchMock from 'vitest-fetch-mock'
import { describe, beforeEach, vi, it, expect } from 'vitest'
import { useHttpClient } from '../src/vue'

const fetchMock = createFetchMock(vi)

describe('HttpClient', () => {
	beforeEach(() => {
		fetchMock.enableMocks()
		fetchMock.resetMocks()
	})

	it('Should make a GET request', async () => {
		fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
		const { client } = useHttpClient()
		const data = await client.get('https://myapi.com/v1').json()
		expect(data[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		const request = fetchMock.mock.calls[0][0] as Request
		expect(request.method).toEqual('GET')
		expect(request.url).toEqual('https://myapi.com/v1')
	})
	it('Should make a GET request with template parameters', async () => {
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
		expect(data.value[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		const request = fetchMock.mock.calls[0][0] as Request
		expect(request.method).toEqual('GET')
		expect(request.url).toEqual('https://myapi.com/v1/example')
	})
	it('Should make a GET request with template and query parameters', async () => {
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
		expect(data.value[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		const request = fetchMock.mock.calls[0][0] as Request
		expect(request.method).toEqual('GET')
		expect(request.url).toEqual(
			'https://myapi.com/v1/alpha?codes=col,pe,at',
		)
	})
	it('Should make a GET request with template and query parameters and prefix url', async () => {
		fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
		const { requestGet } = useHttpClient({
			prefixUrl: 'https://myapi.com/v1',
		})
		const { data, isLoading, isError } = requestGet({
			template: ':type',
			params: { type: 'alpha', codes: ['col', 'pe', 'at'] },
		})
		expect(isLoading.value).toBe(true)
		expect(isError.value).toBe(false)
		await flushPromises()
		expect(isLoading.value).toBe(false)
		expect(isError.value).toBe(false)
		expect(data.value[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		const request = fetchMock.mock.calls[0][0] as Request
		expect(request.method).toEqual('GET')
		expect(request.url).toEqual(
			'https://myapi.com/v1/alpha?codes=col,pe,at',
		)
	})
	it('Should make a GET request with error', async () => {
		fetchMock.mockResponseOnce(() => ({ status: 404 }))
		const { requestGet } = useHttpClient({
			prefixUrl: 'https://myapi.com/v1',
		})
		const { isLoading, isError, error } = requestGet({
			template: ':type',
			params: { type: 'alpha', codes: ['col', 'pe', 'at'] },
		})
		expect(isLoading.value).toBe(true)
		expect(isError.value).toBe(false)
		await flushPromises()
		expect(isLoading.value).toBe(false)
		expect(isError.value).toBe(true)
		expect(error.value.response.status).toBe(404)
		expect(fetchMock.mock.calls.length).toBe(1)
		const request = fetchMock.mock.calls[0][0] as Request
		expect(request.url).toEqual(
			'https://myapi.com/v1/alpha?codes=col,pe,at',
		)
	})
	it('Should abort a GET request', async () => {
		fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
		const { request } = useHttpClient({
			prefixUrl: 'https://myapi.com/v1',
		})
		const { responsePromise, abort, signal } = request('get', 'alpha')
		try {
			await responsePromise
		} catch (error) {
			signal.aborted && expect(error.message).toBe('Aborted')
		}
		abort('Aborted')
	})
})
