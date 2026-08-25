import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Generated files should not be checked by ESLint.
    ignores: ['dist/**', 'coverage/**'],
  },

  // Enables ESLint's standard recommended rules.
  eslint.configs.recommended,

  // Enables recommended TypeScript-specific rules.
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],

    languageOptions: {
      // Allows modern JavaScript syntax.
      ecmaVersion: 'latest',

      // Treats the source as ES modules.
      sourceType: 'module',

      // Recognizes browser variables such as window, document, and HTMLElement.
      globals: globals.browser,
    },

    rules: {
      // TypeScript can usually infer return types without explicitly writing them.
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
);
