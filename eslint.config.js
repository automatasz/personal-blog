// @ts-check

import eslintPluginAstro from 'eslint-plugin-astro';
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import svelte from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';
import svelteConfig from './svelte.config.js';
import globals from 'globals';

export default defineConfig([  
  eslint.configs.recommended,
  {
    ignores: [
      "node_modules/",
      ".vscode/",
      ".github/",
      ".astro/",
      "dist/",
    ],
  },
  {
    files: ['**/*.astro'],
    extends: [eslintPluginAstro.configs.all],
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    extends: [svelte.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'], // Add support for additional file extensions, such as .svelte
        parser: tseslint.parser,
        svelteConfig
      }
    },
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
  {
    files: ['**/*.js'],
    extends: [eslint.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    }
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
  }
]);
