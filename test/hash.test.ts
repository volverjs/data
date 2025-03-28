import { describe, expect, it } from 'vitest'
import { Hash } from '../src/Hash'

describe('hash', () => {
    it('should create a 53-bit hash from a string', () => {
        expect(Hash.cyrb53('test')).toBe(8713769735217609)
    })
})
