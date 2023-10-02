import { mount, flushPromises } from '@vue/test-utils'
import createFetchMock from 'vitest-fetch-mock'
import { describe, beforeEach, vi, it, expect } from 'vitest'
import { createHttpClient, useRepositoryHttp } from '../src/vue'
import RepositoryReadUpdate from './components/RepositoryReadUpdate.vue'
import { nextTick } from 'vue'

const fetchMock = createFetchMock(vi)

// Install a plugin onto VueWrapper
const httpClient = createHttpClient({
	prefixUrl: 'https://myapi.com/v1',
})

const component = {
	template: '<div />',
	setup: (_, { expose }) => {
		const { read } = useRepositoryHttp<{ id: string }>(':type')
		const { data, execute, isLoading, isError, error, abort, metadata } =
			read({
				type: 'alpha',
				codes: ['col', 'pe', 'at'],
			})
		expose({ data, execute, isLoading, isError, error, abort, metadata })
		return { data, execute, isLoading, isError, error, abort, metadata }
	},
}

const componentHttpClientV2 = {
	template: '<div />',
	setup: () => {
		createHttpClient({
			prefixUrl: 'https://myapi.com/v2',
			scope: 'v2',
		})
		const { read } = useRepositoryHttp<{ id: string }>(':type', {
			httpClientScope: 'v2',
		})
		const { data, execute, isLoading, isError, error, abort, metadata } =
			read({
				type: 'alpha',
				codes: ['col', 'pe', 'at'],
			})
		return { data, execute, isLoading, isError, error, abort, metadata }
	},
}

describe('RepositoryHttp', () => {
	beforeEach(() => {
		fetchMock.enableMocks()
		fetchMock.resetMocks()
	})

	it('Should read', async () => {
		fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
		const wrapper = mount(component, {
			global: {
				plugins: [httpClient],
			},
		})
		expect(wrapper.vm.isLoading).toBe(true)
		await flushPromises()
		expect(wrapper.vm.isLoading).toBe(false)
		expect(wrapper.vm.isError).toBe(false)
		// eslint-disable-next-line
		expect((wrapper.vm as any).data[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		const request = fetchMock.mock.calls[0][0] as Request
		expect(request.url).toEqual(
			'https://myapi.com/v1/alpha?codes=col,pe,at',
		)
	})

	it('Should read with httpClient V2', async () => {
		fetchMock.mockResponseOnce(JSON.stringify([{ id: '12345' }]))
		const wrapper = mount(componentHttpClientV2, {
			global: {
				plugins: [httpClient],
			},
		})
		expect(wrapper.vm.isLoading).toBe(true)
		await flushPromises()
		expect(wrapper.vm.isLoading).toBe(false)
		expect(wrapper.vm.isError).toBe(false)
		// eslint-disable-next-line
		expect((wrapper.vm as any).data[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		const request = fetchMock.mock.calls[0][0] as Request
		expect(request.url).toEqual(
			'https://myapi.com/v2/alpha?codes=col,pe,at',
		)
	})

	it('Should stop a read request', async () => {
		fetchMock.mockResponseOnce(() => {
			return {
				body: JSON.stringify([{ id: '12345' }]),
				delay: 1000,
			}
		})
		const wrapper = mount(component, {
			global: {
				plugins: [httpClient],
			},
		})
		// eslint-disable-next-line
		;(wrapper.vm as any).abort('Aborted')
		await flushPromises()
		expect(wrapper.vm.isLoading).toBe(false)
		expect(wrapper.vm.isError).toBe(false)
		expect(wrapper.vm.data).toBe(undefined)
	})
	it('Should merge 2 equals read requests', async () => {
		fetchMock.mockResponseOnce(() => {
			return {
				body: JSON.stringify([{ id: '12345' }]),
				delay: 1000,
			}
		})
		const wrapper = mount(component, {
			global: {
				plugins: [httpClient],
			},
		})
		expect(wrapper.vm.isLoading).toBe(true)
		// eslint-disable-next-line
		;(wrapper.vm as any).execute()
		await flushPromises()
		expect(wrapper.vm.isLoading).toBe(false)
		expect(wrapper.vm.isError).toBe(false)
		// eslint-disable-next-line
		expect((wrapper.vm as any).data[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		const request = fetchMock.mock.calls[0][0] as Request
		expect(request.url).toEqual(
			'https://myapi.com/v1/alpha?codes=col,pe,at',
		)
	})
	it('Should merge 2 equals read request, first aborted', async () => {
		fetchMock.mockResponseOnce(() => {
			return {
				body: JSON.stringify([{ id: '12345' }]),
				delay: 1000,
			}
		})
		const wrapper = mount(component, {
			global: {
				plugins: [httpClient],
			},
		})
		expect(wrapper.vm.isLoading).toBe(true)
		// eslint-disable-next-line
		;(wrapper.vm as any).execute()
		// eslint-disable-next-line
		;(wrapper.vm as any).abort('Aborted')
		await flushPromises()
		expect(wrapper.vm.isLoading).toBe(false)
		expect(wrapper.vm.isError).toBe(false)
		// eslint-disable-next-line
		expect((wrapper.vm as any).data[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		const request = fetchMock.mock.calls[0][0] as Request
		expect(request.url).toEqual(
			'https://myapi.com/v1/alpha?codes=col,pe,at',
		)
	})
	it('Should merge 2 equals read request, second aborted', async () => {
		fetchMock.mockResponseOnce(() => {
			return {
				body: JSON.stringify([{ id: '12345' }]),
				delay: 1000,
			}
		})
		const wrapper = mount(component, {
			global: {
				plugins: [httpClient],
			},
		})
		expect(wrapper.vm.isLoading).toBe(true)
		// eslint-disable-next-line
		const { abort } = (wrapper.vm as any).execute()
		abort('Aborted')
		await flushPromises()
		expect(wrapper.vm.isLoading).toBe(false)
		expect(wrapper.vm.isError).toBe(false)
		// eslint-disable-next-line
		expect((wrapper.vm as any).data[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		const request = fetchMock.mock.calls[0][0] as Request
		expect(request.url).toEqual(
			'https://myapi.com/v1/alpha?codes=col,pe,at',
		)
	})
	it('Read and Update Component', async () => {
		const wrapper = mount(RepositoryReadUpdate, {
			global: {
				plugins: [httpClient],
			},
		})

		// Read
		fetchMock.mockResponseOnce(
			JSON.stringify([{ id: '12345', name: 'John' }]),
		)
		expect(wrapper.text()).toContain('Loading...')
		await flushPromises()
		await nextTick()
		expect(wrapper.text()).not.toContain('Loading...')
		expect(wrapper.text()).toContain('Submit')
		const getRequest = fetchMock.mock.calls[0][0] as Request
		expect(getRequest.url).toEqual('https://myapi.com/v1/users/1')
		expect(getRequest.method).toEqual('GET')

		// Set new value
		expect(
			(wrapper.find('[data-test="input"]').element as HTMLInputElement)
				.value,
		).toBe('John')

		// Update
		fetchMock.mockResponseOnce(() => ({
			body: JSON.stringify([{ id: '12345', name: 'John Doe' }]),
			delay: 1000,
		}))
		await wrapper.find('[data-test="input"]').setValue('John Doe')
		await wrapper.find('[data-test="form"]').trigger('submit.prevent')
		await nextTick()
		expect(wrapper.text()).toContain('Loading...')
		await flushPromises()
		await nextTick()
		expect(wrapper.text()).not.toContain('Loading...')
		expect(fetchMock.mock.calls.length).toBe(2)
		const putRequest = fetchMock.mock.calls[1][0] as Request
		expect(putRequest.url).toEqual('https://myapi.com/v1/users/1')
		expect(putRequest.method).toEqual('PUT')
	})
})
