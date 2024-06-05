import antfu from '@antfu/eslint-config'

export default antfu({
    typescript: {
        overrides: {
            'ts/consistent-type-definitions': 'off',
        },
    },
    vue: true,
    node: true,
    yaml: false,
    ignore: ['.vscode', 'dist', 'node_modules'],
    stylistic: {
        indent: 4,
        quotes: 'single',
        semi: false,
    },
    rules: {
        'style/no-tabs': 'off',
        'style/no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
        'sort-imports': 'off',
    },
})
