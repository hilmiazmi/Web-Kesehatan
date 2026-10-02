import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Kode arsip versi lama: bukan buatan repo ini dan tidak lagi dikerjakan,
    // jadi jangan ikut dilinting. Lihat README bagian Struktur.
    "archive/**",
    "docs/**",
  ]),
]);

export default eslintConfig;
