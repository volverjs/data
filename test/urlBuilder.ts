import { UrlBuilder } from '../src/UrlBuilder'

describe('UrlBuilder', () => {
	it('Returns empty string if the template is empty and there are no params', () => {
		const expected = ''
		const actual = UrlBuilder.build('', {})
		expect(actual).toBe(expected)
	})

	it('Returns query string if the template is empty but a param is passed', () => {
		const expected = 'p=1'
		const actual = UrlBuilder.build('', { p: 1 })
		expect(actual).toBe(expected)
	})

	it('Substitutes all params present in the object passed', () => {
		const expected = '/1/a/false'
		const actual = UrlBuilder.build('/:p/:q/:r', { p: 1, q: 'a', r: false })
		expect(actual).toBe(expected)
	})

	it('Substitutes all params present in the object passed with conditional', () => {
		const expected = '/1/false'
		const actual = UrlBuilder.build('/:p/:q?/:r', { p: 1, r: false })
		expect(actual).toBe(expected)
	})

	it('Substitutes all params present in the object passed with conditional at the end', () => {
		const expected = '/1/a'
		const actual = UrlBuilder.build('/:p/:q/:r?', { p: 1, q: 'a' })
		expect(actual).toBe(expected)
	})

	it('Substitutes all params present in the object passed with many conditional', () => {
		const expected = '/1'
		const actual = UrlBuilder.build('/:p/:q?/:r?', { p: 1 })
		expect(actual).toBe(expected)
	})

	it('Allows parameters at the beginning of the template', () => {
		const expected = '42'
		const actual = UrlBuilder.build(':p', { p: 42 })
		expect(actual).toBe(expected)
	})

	it('Renders boolean (true) params', () => {
		const expected = 'true'
		const actual = UrlBuilder.build(':p', { p: true })
		expect(actual).toBe(expected)
	})

	it('Renders boolean (false) params', () => {
		const expected = 'false'
		const actual = UrlBuilder.build(':p', { p: false })
		expect(actual).toBe(expected)
	})

	it('Renders string params', () => {
		const expected = 'test'
		const actual = UrlBuilder.build(':p', { p: 'test' })
		expect(actual).toBe(expected)
	})

	it('Renders conditional string params', () => {
		const expected = ''
		const actual = UrlBuilder.build(':p?')
		expect(actual).toBe(expected)
	})

	it('Renders number params', () => {
		const expected = '234'
		const actual = UrlBuilder.build(':p', { p: 234 })
		expect(actual).toBe(expected)
	})

	it('Throws if a param is an array', () => {
		expect(() => UrlBuilder.build(':p', { p: [] })).toThrowError(
			'Path parameter p cannot be of type object. Allowed types are: boolean, string, number.',
		)
	})

	it('Throws if a param is an object', () => {
		expect(() => UrlBuilder.build(':p', { p: {} })).toThrowError(
			'Path parameter p cannot be of type object. Allowed types are: boolean, string, number.',
		)
	})

	it('Throws if a param is a symbol', () => {
		expect(() => UrlBuilder.build(':p', { p: Symbol() })).toThrowError(
			'Path parameter p cannot be of type symbol. Allowed types are: boolean, string, number.',
		)
	})

	it('Throws if a param is missing', () => {
		expect(() => UrlBuilder.build(':p', {})).toThrow()
	})
})
