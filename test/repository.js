import fetchMock from 'jest-fetch-mock'
import { RepositoryHttp, HttpClient } from '../node'

describe('RepositoryHttp', () => {
	beforeEach(() => {
		fetchMock.enableMocks()
		fetchMock.resetMocks()
	})

	it('Should read', async () => {
		fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
		const client = new HttpClient({
			prefixUrl: 'https://myapi.com/v1',
		})
		const repository = new RepositoryHttp(client, ':type')
		const { response } = repository.read({
			type: 'alpha',
			codes: ['col', 'pe', 'at'],
		})
		const { data, ok } = await response
		expect(ok).toBe(true)
		expect(data[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		expect(fetchMock.mock.calls[0][0].url).toEqual(
			'https://myapi.com/v1/alpha?codes=col,pe,at',
		)
	})
	it('Should stop a read request', async () => {
		const client = new HttpClient({
			prefixUrl: 'https://myapi.com/v1',
		})
		const repository = new RepositoryHttp(client, ':type?')
		const { response, abort } = repository.read({})
		abort('Aborted')
		const { ok, abortReason } = await response
		expect(ok).toBe(false)
		expect(abortReason).toBe('Aborted')
	})
	it('Should merge 2 equals read requests', async () => {
		fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
		const client = new HttpClient({
			prefixUrl: 'https://myapi.com/v1',
		})
		const repository = new RepositoryHttp(client, ':type')
		const { response: response1 } = repository.read({
			type: 'alpha',
			codes: ['col', 'pe', 'at'],
		})
		const { response: response2 } = repository.read({
			type: 'alpha',
			codes: ['col', 'pe', 'at'],
		})
		const { data: data1, ok: ok1 } = await response1
		const { data: data2, ok: ok2 } = await response2
		expect(ok1).toBe(true)
		expect(ok2).toBe(true)
		expect(data1[0].id).toBe('12345')
		expect(data2[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		expect(fetchMock.mock.calls[0][0].url).toEqual(
			'https://myapi.com/v1/alpha?codes=col,pe,at',
		)
	})
	it('Should merge 2 equals read request, first aborted', async () => {
		fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
		const client = new HttpClient({
			prefixUrl: 'https://myapi.com/v1',
		})
		const repository = new RepositoryHttp(client, ':type')
		const { response: response1, abort } = repository.read({
			type: 'alpha',
			codes: ['col', 'pe', 'at'],
		})
		const { response: response2 } = repository.read({
			type: 'alpha',
			codes: ['col', 'pe', 'at'],
		})
		abort('Aborted')
		const { ok: ok1 } = await response1
		const { data: data2, ok: ok2 } = await response2
		expect(ok1).toBe(false)
		expect(ok2).toBe(true)
		expect(data2[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		expect(fetchMock.mock.calls[0][0].url).toEqual(
			'https://myapi.com/v1/alpha?codes=col,pe,at',
		)
	})
	it('Should merge 2 equals read request, second aborted', async () => {
		fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
		const client = new HttpClient({
			prefixUrl: 'https://myapi.com/v1',
		})
		const repository = new RepositoryHttp(client, ':type')
		const { response: response1 } = repository.read({
			type: 'alpha',
			codes: ['col', 'pe', 'at'],
		})
		const { response: response2, abort } = repository.read({
			type: 'alpha',
			codes: ['col', 'pe', 'at'],
		})
		abort('Aborted')
		const { data: data1, ok: ok1 } = await response1
		const { ok: ok2 } = await response2
		expect(ok1).toBe(true)
		expect(ok2).toBe(false)
		expect(data1[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		expect(fetchMock.mock.calls[0][0].url).toEqual(
			'https://myapi.com/v1/alpha?codes=col,pe,at',
		)
	})
})
