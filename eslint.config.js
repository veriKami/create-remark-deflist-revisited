//: eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "node_modules/",
      "**/*copy*",
      "**/__*",
      "templates",
      "remark-*",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.node
    },
    rules: {
      "no-empty": "warn",
      "no-unused-vars": "warn",
      "quotes": ["warn", "double"],
    }
  }
]);
