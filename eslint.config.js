import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import { defineConfig } from "eslint/config";

export default defineConfig([
  stylistic.configs.customize({
    semi:        true,
    indent:      2,
    quotes:      "double",
    commaDangle: "only-multiline",
    severity:    "warn",
    braceStyle:  "1tbs",
  }),
  {
    rules: {
      "@stylistic/space-unary-ops": ["warn", {
        nonwords:  false,
        words:     true,
        overrides: {
          typeof: false,
        },
      }],
      "@stylistic/indent":                      ["warn", 2, { VariableDeclarator: "first" }],
      "@stylistic/space-before-function-paren": ["warn", "never"],
      "@stylistic/key-spacing":                 ["warn", { align: "value" }],
      // "@stylistic/key-spacing"                : ["warn", { align: "colon" }],
      // "@stylistic/key-spacing": ["warn", { align: {
      //   beforeColon: true,
      //   afterColon: true,
      //   on: "colon",
      // } }],
      // "@stylistic/no-multi-spaces":             ["warn", { exceptions: { VariableDeclarator: true } }],
      "@stylistic/no-multi-spaces":             ["off", { exceptions: { VariableDeclarator: true } }],
      // "@stylistic/type-annotation-spacing"    : ["warn", { before: false, after: true }],
    },
  },
  {
    rules: {
      "@stylistic/max-statements-per-line": ["warn", {
        ignoredNodes: [
          // "BreakStatement",
          // "ClassDeclaration",
          // "ContinueStatement",
          // "DebuggerStatement",
          // "DoWhileStatement",
          // "ExpressionStatement",
          // "ForInStatement",
          // "ForOfStatement",
          // "ForStatement",
          "FunctionDeclaration",
          // "IfStatement",
          // "ImportDeclaration",
          // "LabeledStatement",
          // "ReturnStatement",
          // "SwitchStatement",
          // "ThrowStatement",
          // "TryStatement",
          // "VariableDeclaration",
          // "WhileStatement",
          // "WithStatement",
          // "ExportNamedDeclaration",
          // "ExportDefaultDeclaration",
          // "ExportAllDeclaration"
        ],
      }],
    },
  },
  {
    rules: {
      "@stylistic/function-paren-newline": ["warn", "multiline-arguments"],
    },
  },
  {
    files:           ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    // plugins: { js, "@stylistic": stylistic },
    plugins:         { js },
    // extends: ["js/recommended", stylistic.configs.recommended],
    extends:         ["js/recommended"],
    languageOptions: { globals: globals.browser },
    // rules: {
    //   semi: ["warn", "always"],
    //   quotes: ["warn", "double"],
    // }
  },
  tseslint.configs.recommended,
  // {
  //   rules: {
  //     "no-unused-vars": ["warn", {
  //       vars: "all",
  //       args: "after-used",
  //       caughtErrors: "all",
  //       ignoreRestSiblings: false,
  //       ignoreUsingDeclarations: false,
  //       reportUsedIgnorePattern: false,
  //     }],
  //   },
  // },
  {
    rules: {
      "no-unused-vars": "off",
      "no-debugger":    "warn",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        vars:                    "all",
        args:                    "after-used",
        caughtErrors:            "all",
        ignoreRestSiblings:      false,
        ignoreUsingDeclarations: false,
        reportUsedIgnorePattern: false,
      }],
    },
  },
]);
