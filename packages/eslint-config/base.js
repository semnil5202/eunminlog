import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import-x';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'import-x': importPlugin,
    },
    settings: {
      'import-x/resolver': {
        typescript: true,
      },
    },
    rules: {
      'no-duplicate-imports': 'error',
      'import-x/no-cycle': ['error', { maxDepth: 1, ignoreExternal: true }],
      'no-console': ['warn', { allow: ['warn', 'error', 'table'] }],
      'no-extra-boolean-cast': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-redeclare': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettier,
  {
    ignores: ['node_modules/', 'dist/', '.next/', '.astro/', '.turbo/'],
  },
];
