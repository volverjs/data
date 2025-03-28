import antfu from '@antfu/eslint-config'

export default antfu({
    type: 'lib',
    typescript: {
        overrides: {
            'ts/explicit-function-return-type': 'off',
            'ts/consistent-type-definitions': 'off',
        },
    },
    vue: true,
    node: true,
    yaml: false,
    stylistic: {
        indent: 4,
        quotes: 'single',
        semi: false,
    },
    rules: {
        'antfu/no-top-level-await': 'off',
        'style/no-tabs': 'off',
        'style/no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
        'sort-imports': 'off',
    },
}, {
    ignores: ['.vscode', 'dist', 'node_modules'],
})
