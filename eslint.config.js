import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ["dist"],
  },
  {
    rules: {
      "no-constant-condition": ["error", { checkLoops: "allExceptWhileTrue" }],
      "no-irregular-whitespace": "off",
    },
  },
);
