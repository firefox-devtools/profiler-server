// @flow
module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parser: '@babel/eslint-parser',
  extends: [
    'eslint:recommended',
    'plugin:flowtype/recommended',
    // This works with the prettier plugin, this needs to be at the end always.
    // Replace it with the "prettier" config if we remove the plugin.
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: '2017',
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
    sourceType: 'module',
  },
  plugins: ['@babel', 'flowtype', 'import', 'prettier'],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  rules: {
    // Plugin rules:
    'import/no-duplicates': 'error',
    'import/no-unresolved': 'error',
    'import/no-default-export': 'error',
    'import/named': 'error',
    'flowtype/require-valid-file-annotation': [
      'error',
      'always',
      { annotationStyle: 'line' },
    ],
    // no-dupe-keys crashes with recent eslint. See
    // https://github.com/gajus/eslint-plugin-flowtype/pull/266 and
    // https://github.com/gajus/eslint-plugin-flowtype/pull/302
    // 'flowtype/no-dupe-keys': 'error',

    // overriding recommended rules
    'no-constant-condition': ['error', { checkLoops: false }],
    'no-console': ['error', { allow: ['log', 'warn', 'error'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // This rule gets confused with async functions and setting the
    // ctx for route responses.
    'require-atomic-updates': 0,

    // possible errors
    'array-callback-return': 'error',
    'consistent-return': 'error',
    'default-case': 'error',
    'dot-notation': 'error',
    eqeqeq: 'error',
    'for-direction': 'error',
    'no-alert': 'error',
    'no-caller': 'error',
    'no-eval': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-extra-label': 'error',
    'no-implied-eval': 'error',
    // We use the version from the babel plugin so that `this` in a function
    // class property doesn't give a false positive.
    '@babel/no-invalid-this': 'error',
    'no-return-await': 'error',
    'no-self-compare': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    // We use the version from the flowtype plugin so that flow assertions don't
    // output an error.
    'flowtype/no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-concat': 'error',
    'no-useless-constructor': 'error',
    'no-useless-rename': 'error',
    'no-useless-return': 'error',
    'no-var': 'error',
    'no-void': 'error',
    'no-with': 'error',
    'prefer-const': 'error',
    'prefer-promise-reject-errors': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    'no-else-return': 'error',
  },
  overrides: [
    {
      // TypeScript linting
      files: ['**/*.{ts,tsx}'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
      },
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        // FIXME: This should be uncommented once we have stricter types.
        // 'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
