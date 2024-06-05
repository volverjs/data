import { describe, it, expect } from 'vitest'
import { Hash } from '../src/Hash'

describe('configure', () => {
    it('should create a 53-bit hash from a string', () => {
        expect(Hash.cyrb53('test')).toBe(8713769735217609)
    })
})
