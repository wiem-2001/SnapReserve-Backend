import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig({
  ignores: ["src/generated/**"],  // <--- ignore this path globally
  overrides: [
    {
      files: ["**/*.{js,mjs,cjs}"],
      plugins: { js },
      extends: ["js/recommended"],
      rules: {
        "no-unused-vars": "warn",
        "no-console": "warn",
        "eqeqeq": "error",
        "curly": "error",
        "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
        "no-eval": "error",
        "no-implied-eval": "error",
        "no-new-func": "error",
        "prefer-const": "warn",
        "no-constant-condition": "warn",
        "max-len": ["error", { "code": 300 }],
        "max-lines": ["error", { "max": 500 }],
        "no-duplicate-imports": "error",
      },
    },
    {
      files: ["**/*.{js,mjs,cjs}"],
      languageOptions: { globals: globals.node },
    },
  ],
});
