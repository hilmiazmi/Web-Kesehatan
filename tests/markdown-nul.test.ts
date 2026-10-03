import { describe, expect, it } from "vitest";
import { safeUrl } from "@/server/markdown";

describe("safeUrl menormalkan karakter kontrol", () => {
  it("membuang tab dan newline yang menyamarkan javascript:", () => {
    expect(safeUrl("java\tscript:alert(1)")).toBeNull();
    expect(safeUrl("java\nscript:alert(1)")).toBeNull();
    expect(safeUrl("java\rscript:alert(1)")).toBeNull();
  });

  it("membuang byte NUL dan DEL", () => {
    expect(safeUrl("java\u0000script:alert(1)")).toBeNull();
    expect(safeUrl("javascript\u007f:alert(1)")).toBeNull();
  });

  it("menolak skema yang tidak ada di daftar putih", () => {
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeUrl("vbscript:msgbox(1)")).toBeNull();
  });

  it("menerima skema yang diizinkan dan path relatif", () => {
    expect(safeUrl("https://contoh.test/a")).toBe("https://contoh.test/a");
    expect(safeUrl("mailto:halo@contoh.test")).toBe("mailto:halo@contoh.test");
    expect(safeUrl("#bagian")).toBe("#bagian");
    expect(safeUrl("/pelayanan")).toBe("/pelayanan");
    expect(safeUrl("halaman/kontak")).toBe("halaman/kontak");
  });
});
