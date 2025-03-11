import eslintPluginAstro from "eslint-plugin-astro";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...eslintPluginAstro.configs.recommended,
  {
    rules: {
      "eol-last": [
        "error",
        "always",
      ],
      "semi": [
        "error",
        "always",
      ],
      "quotes": [
        "error",
        "double",
      ],
      // override/add rules settings here, such as:
      // "astro/no-set-html-directive": "error"
    },
  },
  globalIgnores([
    ".astro/*",
    "dist/*",
  ]),
]);
