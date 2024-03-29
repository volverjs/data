import { flushPromises, mount } from '@vue/test-utils'
import createFetchMock from 'vitest-fetch-mock'
import { describe, beforeEach, vi, it, expect } from 'vitest'
import { useHttpClient, createHttpClient, removeHttpClient } from '../src/vue'

const fetchMock = createFetchMock(vi)
const httpClient = createHttpClient()

const component = {
	template: '<div />',
}

describe('HttpClient', () => {
	beforeEach(() => {
		fetchMock.enableMocks()
		fetchMock.resetMocks()
	})

	mount(component, {
		global: {
			plugins: [httpClient],
		},
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
		expect(error.value.response.status).toBe(404)
		expect(fetchMock.mock.calls.length).toBe(1)
		const request = fetchMock.mock.calls[0][0] as Request
		expect(request.url).toEqual(
			'https://myapi.com/v2/alpha?codes=col,pe,at',
		)
	})
	it('Should abort a GET request', async () => {
		fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
		const { request } = useHttpClient()
		const { responsePromise, abort, signal } = request('get', 'alpha')
		try {
			await responsePromise
		} catch (error) {
			signal.aborted && expect(error.message).toBe('Aborted')
		}
		abort('Aborted')
	})

	it('Should use a new httpClient', async () => {
		fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))

		createHttpClient({
			prefixUrl: 'https://myapi.com/v2',
			scope: 'myApiV2',
		})

		const { requestGet } = useHttpClient('myApiV2')
		requestGet('alpha')
		await flushPromises()
		const request = fetchMock.mock.calls[0][0] as Request

		expect(request.url).toEqual('https://myapi.com/v2/alpha')
	})

	it('Should catch error httpClient instance not found', async () => {
		fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))

		createHttpClient({
			prefixUrl: 'https://myapi.com/v3',
			scope: 'myApiV3',
		})

		try {
			const { requestGet } = useHttpClient('myApiV4')
			requestGet('alpha')
		} catch (error) {
			expect(error.message).toBe('HttpClient instance not found')
		}
	})

	it('Should throw error httpClient instance already exist', async () => {
		fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))

		createHttpClient({
			prefixUrl: 'https://myapi.com/v4',
			scope: 'myApiV4',
		})

		const { requestGet } = useHttpClient('myApiV4')
		requestGet('alpha')

		await flushPromises()
		const request = fetchMock.mock.calls[0][0] as Request

		expect(request.url).toEqual('https://myapi.com/v4/alpha')

		try {
			createHttpClient({
				prefixUrl: 'https://myapi.com/v5',
				scope: 'myApiV4',
			})
		} catch (error) {
			expect(error.message).toBe(
				'httpClient with scope myApiV4 already exist',
			)
		}
	})

	it('Should throw error after removeHttpClient', async () => {
		fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))

		createHttpClient({
			prefixUrl: 'https://myapi.com/v6',
			scope: 'myApiV6',
		})

		const { requestGet } = useHttpClient('myApiV6')
		requestGet('alpha')

		await flushPromises()
		const request = fetchMock.mock.calls[0][0] as Request

		expect(request.url).toEqual('https://myapi.com/v6/alpha')

		removeHttpClient('myApiV6')
		try {
			useHttpClient('myApiV6')
		} catch (error) {
			expect(error.message).toBe('HttpClient instance not found')
		}

		requestGet('alpha')

		await flushPromises()
		const request2 = fetchMock.mock.calls[1][0] as Request

		expect(request2.url).toEqual('https://myapi.com/v6/alpha')
	})
})
