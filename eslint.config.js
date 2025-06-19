import eslintPluginAstro from "eslint-plugin-astro";
import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import svelte from "eslint-plugin-svelte";
import tseslint from "typescript-eslint";
import svelteConfig from "./svelte.config.js";
import globals from "globals";
import stylistic from "@stylistic/eslint-plugin";

export default defineConfig([
  {
    ignores: [
      "node_modules/",
      ".vscode/",
      ".github/",
      ".astro/",
      "dist/",
    ],
  },
  // Common recommended rules
  eslint.configs.recommended,

  {
    rules: {
      "no-multiple-empty-lines": ["error", { max: 1 }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "eol-last": 1,
    },
  },
  {
    files: ["**/*.astro"],
    plugins: { astro: eslintPluginAstro },
    extends: [eslintPluginAstro.configs.all],
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    extends: [svelte.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"], // Add support for additional file extensions, such as .svelte
        parser: tseslint.parser,
        svelteConfig,
      },
    },
  },
  {
    files: ["**/*.ts"],
    extends: [tseslint.configs.strict, tseslint.configs.stylistic, stylistic.configs.customize({
      indent: 2,
      quotes: "double",
      semi: true,
      commaDangle: "always-multiline",
      jsx: false,
    })],
    rules: {
      "@stylistic/object-property-newline": 1,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]);
