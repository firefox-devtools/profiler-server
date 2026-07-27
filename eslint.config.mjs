import babelParser from '@babel/eslint-parser';
import typescriptParser from '@typescript-eslint/parser';
import babelPlugin from '@babel/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2017,
      sourceType: 'module',
      globals: { ...globals.node },
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { presets: ['@babel/preset-env'] },
        ecmaFeatures: { experimentalObjectRestSpread: true },
      },
    },
    plugins: {
      import: importPlugin,
      '@babel': babelPlugin,
    },
    settings: {
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Plugin rules
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'error',
      'import/no-default-export': 'error',
      'import/named': 'error',
      // Overriding recommended rules
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-console': ['error', { allow: ['log', 'warn', 'error'] }],
      'require-atomic-updates': 0,
      // Possible errors
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
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@babel/no-invalid-this': 'error',
    },
  },
  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      // TypeScript handles this and it's recommended by TypeScript to turn
      // this off.
      'no-undef': 'off',
    },
  },
  // Test files
  {
    files: ['test/**/*.js', 'test/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  // TypeScript declaration files
  {
    files: ['**/*.d.ts'],
    rules: {
      'import/no-default-export': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  // Apply prettier config to disable conflicting rules
  prettier,
];
