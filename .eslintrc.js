module.exports = {
    env: {
        node: true,
        es2021: true,
        jest: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:node/recommended',
        'prettier',
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    plugins: ['node', 'prettier'],
    rules: {
        // Code Quality
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        'no-unused-vars': ['error', {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            ignoreRestSiblings: true
        }],
        'no-var': 'error',
        'prefer-const': 'error',
        'prefer-arrow-callback': 'warn',
        'prefer-template': 'warn',
        'no-duplicate-imports': 'error',
        'no-useless-return': 'error',
        'no-useless-catch': 'error',
        'no-return-await': 'error',
        'require-await': 'error',

        // Best Practices
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'no-throw-literal': 'error',
        'no-implicit-coercion': 'error',
        'no-param-reassign': ['error', { props: false }],
        'no-nested-ternary': 'warn',
        'no-unneeded-ternary': 'error',
        'no-lonely-if': 'error',
        'prefer-destructuring': ['warn', {
            array: false,
            object: true,
        }],

        // Error Prevention
        'no-await-in-loop': 'warn',
        'no-promise-executor-return': 'error',
        'require-atomic-updates': 'error',
        'no-async-promise-executor': 'error',

        // Code Style (delegated to Prettier mostly)
        'prettier/prettier': ['error', {
            endOfLine: 'auto',
        }],
        'max-len': ['warn', {
            code: 120,
            ignoreComments: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
        }],
        'max-depth': ['warn', 4],
        'max-nested-callbacks': ['warn', 3],
        'complexity': ['warn', 15],

        // Node.js Specific
        'node/no-unpublished-require': 'off',
        'node/no-missing-require': 'error',
        'node/no-extraneous-require': 'error',
        'node/exports-style': ['error', 'module.exports'],
        'node/file-extension-in-import': 'off',
        'node/prefer-global/buffer': ['error', 'always'],
        'node/prefer-global/console': ['error', 'always'],
        'node/prefer-global/process': ['error', 'always'],
        'node/prefer-promises/dns': 'error',
        'node/prefer-promises/fs': 'error',
        'node/no-unsupported-features/es-syntax': 'off',

        // Security
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        'no-script-url': 'error',

        // Comments
        'spaced-comment': ['warn', 'always', {
            markers: ['/'],
        }],

        // Async/Await
        'no-async-promise-executor': 'error',
        'prefer-promise-reject-errors': 'error',
    },
    overrides: [
        {
            files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
            env: {
                jest: true,
                mocha: true,
            },
            rules: {
                'no-console': 'off',
                'max-nested-callbacks': 'off',
            },
        },
        {
            files: ['scripts/**/*.js'],
            rules: {
                'no-console': 'off',
            },
        },
    ],
    ignorePatterns: [
        'node_modules/',
        'dist/',
        'build/',
        'coverage/',
        'logs/',
        'uploads/',
        'generated/',
        '*.min.js',
    ],
};