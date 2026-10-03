import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Route Handler wajib menerima argumen `request` dan `context` walaupun
      // tidak dipakai, jadi namanya diawali `_`. Tanpa `argsIgnorePattern`,
      // ESLint menandai 30 parameter itu sebagai dead code padahal menghapus
      // nama parameternya tidak mungkin: Next.js yang memanggilnya.
      //
      // `caughtErrors` ikut longgarkan karena pola `catch (err) { ... }` yang
      // sengaja mengabaikan errornya sangat umum di lapisan respons.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
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
