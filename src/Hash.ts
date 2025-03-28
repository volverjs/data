export class Hash {
    public static readonly cyrb53 = (str: string, seed = 0) => {
        let h1 = 0xDEADBEEF ^ seed
        let h2 = 0x41C6CE57 ^ seed
        for (let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i)
            h1 = Math.imul(h1 ^ ch, 2654435761)
            h2 = Math.imul(h2 ^ ch, 1597334677)
        }
        h1
			= Math.imul(h1 ^ (h1 >>> 16), 2246822507)
			    ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
        h2
			= Math.imul(h2 ^ (h2 >>> 16), 2246822507)
			    ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
        return 4294967296 * (2097151 & h2) + (h1 >>> 0)
    }

    public static readonly djb2 = (str: string, seed = 5381) => {
        let h = seed

        for (let i = 0; i < str.length; i++) {
            h = (h * 33) ^ str.charCodeAt(i)
        }
        return h >>> 0
    }
}
