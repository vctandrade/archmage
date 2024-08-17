import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist", "node_modules"],
    rules: {
      "no-constant-condition": ["error", { checkLoops: "allExceptWhileTrue" }],
      "no-irregular-whitespace": "off",
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  eslintConfigPrettier,
);
