import { mount, flushPromises } from '@vue/test-utils'
import createFetchMock from 'vitest-fetch-mock'
import { describe, beforeEach, vi, it, expect } from 'vitest'
import { createHttpClient, useRepositoryHttp } from '../src/vue'
import { nextTick } from 'vue'

const fetchMock = createFetchMock(vi)

// Install a plugin onto VueWrapper
const httpClient = createHttpClient({
	prefixUrl: 'https://myapi.com/v1',
})

const component = {
	template: '<div />',
	setup: () => {
		const { read } = useRepositoryHttp<{ id: string }>(':type')
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
		expect(wrapper.vm.data[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		const request = fetchMock.mock.calls[0][0] as Request
		expect(request.url).toEqual(
			'https://myapi.com/v1/alpha?codes=col,pe,at',
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
		wrapper.vm.abort('Aborted')
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
		wrapper.vm.execute()
		await flushPromises()
		expect(wrapper.vm.isLoading).toBe(false)
		expect(wrapper.vm.isError).toBe(false)
		expect(wrapper.vm.data[0].id).toBe('12345')
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
		wrapper.vm.execute()
		wrapper.vm.abort('Aborted')
		await flushPromises()
		expect(wrapper.vm.isLoading).toBe(false)
		expect(wrapper.vm.isError).toBe(false)
		expect(wrapper.vm.data[0].id).toBe('12345')
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
		const { abort } = wrapper.vm.execute()
		abort('Aborted')
		await flushPromises()
		expect(wrapper.vm.isLoading).toBe(false)
		expect(wrapper.vm.isError).toBe(false)
		expect(wrapper.vm.data[0].id).toBe('12345')
		expect(fetchMock.mock.calls.length).toBe(1)
		const request = fetchMock.mock.calls[0][0] as Request
		expect(request.url).toEqual(
			'https://myapi.com/v1/alpha?codes=col,pe,at',
		)
	})
})
