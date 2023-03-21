import { defineConfig } from 'vitest/config'
import ESLint from 'vite-plugin-eslint'
import path from 'path'

// https://vitejs.dev/config/
export default () => {
	return defineConfig({
		test: {
			globals: true,
			environment: 'happy-dom',
		},
		build: {
			lib: {
				name: '@volverjs/data',
				formats: ['es'],
				entry: {
					index: path.resolve(__dirname, 'src/index.ts'),
					Hash: path.resolve(__dirname, 'src/Hash.ts'),
					HttpClient: path.resolve(__dirname, 'src/HttpClient.ts'),
					RepositoryHttp: path.resolve(
						__dirname,
						'src/RepositoryHttp.ts',
					),
					UrlBuilder: path.resolve(__dirname, 'src/UrlBuilder.ts'),
					'vue/index': path.resolve(__dirname, 'src/vue/index.ts'),
				},
				fileName: (format, entryName) => `${entryName}.js`,
			},
			rollupOptions: {
				external: ['vue', 'ky', 'node-fetch', 'qs'],
				output: {
					exports: 'named',
					globals: {
						vue: 'Vue',
						ky: 'ky',
						qs: 'qs',
						'node-fetch': 'fetch',
					},
				},
			},
		},
		plugins: [ESLint()],
	})
}