import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { nextTick } from 'vue'
import { createHttpClient, useRepositoryHttp } from '../src/vue'
import RepositoryReadUpdate from './components/RepositoryReadUpdate.vue'

const fetchMock = createFetchMock(vi)

// Install a plugin onto VueWrapper
const httpClient = createHttpClient({
    prefixUrl: 'https://myapi.com/v1',
})

const component = {
    template: '<div />',
    setup: (_, { expose }) => {
        const { read } = useRepositoryHttp<{ id: string }>(':type')
        const { data, execute, isLoading, isError, error, abort, metadata }
			= read({
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
        const { data, execute, isLoading, isError, error, abort, metadata }
			= read({
			    type: 'alpha',
			    codes: ['col', 'pe', 'at'],
			})
        return { data, execute, isLoading, isError, error, abort, metadata }
    },
}

describe('vue useRepositoryHttp', () => {
    beforeEach(() => {
        fetchMock.enableMocks()
        fetchMock.resetMocks()
    })

    it('should read', async () => {
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
        expect((wrapper.vm as any).data[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toEqual(
            'https://myapi.com/v1/alpha?codes=col,pe,at',
        )
    })

    it('should read with httpClient V2', async () => {
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
        expect((wrapper.vm as any).data[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toEqual(
            'https://myapi.com/v2/alpha?codes=col,pe,at',
        )
    })

    it('should stop a read request', async () => {
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
		;(wrapper.vm as any).abort('Aborted')
        await flushPromises()
        expect(wrapper.vm.isLoading).toBe(false)
        expect(wrapper.vm.isError).toBe(false)
        expect(wrapper.vm.data).toBe(undefined)
    })
    it('should merge 2 equals read requests', async () => {
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
        ;(wrapper.vm as any).execute()
        await flushPromises()
        expect(wrapper.vm.isLoading).toBe(false)
        expect(wrapper.vm.isError).toBe(false)
        expect((wrapper.vm as any).data[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toEqual(
            'https://myapi.com/v1/alpha?codes=col,pe,at',
        )
    })
    it('should merge 2 equals read request, first aborted', async () => {
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
        ;(wrapper.vm as any).execute()
        ;(wrapper.vm as any).abort('Aborted')
        await flushPromises()
        expect(wrapper.vm.isLoading).toBe(false)
        expect(wrapper.vm.isError).toBe(false)
        expect((wrapper.vm as any).data[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toEqual(
            'https://myapi.com/v1/alpha?codes=col,pe,at',
        )
    })
    it('should merge 2 equals read request, second aborted', async () => {
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
        const { abort } = (wrapper.vm as any).execute()
        abort('Aborted')
        await flushPromises()
        expect(wrapper.vm.isLoading).toBe(false)
        expect(wrapper.vm.isError).toBe(false)
        expect((wrapper.vm as any).data[0].id).toBe('12345')
        expect(fetchMock.mock.calls.length).toBe(1)
        const request = fetchMock.mock.calls[0][0] as Request
        expect(request.url).toEqual(
            'https://myapi.com/v1/alpha?codes=col,pe,at',
        )
    })
    it('read and Update Component', async () => {
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
