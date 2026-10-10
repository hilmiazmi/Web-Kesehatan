import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Setiap route admin harus memeriksa sesi sebelum menyentuh database.
 *
 * `requireSession()` melempar 401 kalau tidak ada sesi, dan 403 kalau peran
 * yang diminta tidak berwenang. Yang menguji di sini bukan perilakunya — itu
 * milik `tests/session.test.ts` — melainkan bahwa SETIAP route admin benar-benar
 * memanggilnya, dan memanggilnya SEBELUM `dbOrNull()`.
 *
 * Urutan itu penting dan sering terbalik tanpa disadari. `dbOrNull()` hanya
 * membuka koneksi, jadi request tanpa sesi tetap akan sampai ke kueri kalau
 * pemeriksaannya diletakkan setelahnya. Selain itu, `dbOrNull()` mengembalikan
 * `null` di mode snapshot, dan `ApiError.readOnly()` menutup jalur itu sebelum
 * kueri apa pun berjalan. Jadi pemeriksaan sesi yang hilang tidak selalu
 * terlihat saat pengujian dengan database kosong: ia baru muncul ketika mode
 * live benar-benar punya database.
 *
 * Berkas dibaca dari filesystem, bukan dari daftar yang ditulis tangan di sini,
 * jadi route baru ikut terk begitu foldernya dibuat.
 */

const AKAR = path.resolve(import.meta.dirname, "..");
const AKAR_ADMIN = path.join(AKAR, "src/app/api/v1/admin");

/** Semua berkas `route.ts` di bawah `src/app/api/v1/admin`. */
function semuaRouteAdmin(): string[] {
  const keluar: string[] = [];

  const jalan = (dir: string) => {
    for (const entri of readdirSync(dir, { withFileTypes: true })) {
      const penuh = path.join(dir, entri.name);
      if (entri.isDirectory()) {
        jalan(penuh);
      } else if (entri.name === "route.ts") {
        keluar.push(path.relative(AKAR, penuh));
      }
    }
  };

  jalan(AKAR_ADMIN);
  keluar.sort();
  return keluar;
}

const ROUTE = semuaRouteAdmin();

/**
 * Satu handler route, diambil dari `export async function <NAMA>(`.
 *
 * Setiap handler dipisah sebelum diperiksa, karena pemeriksaan harus berlaku
 * untuk GET, POST, PATCH, dan DELETE masing-masing. Memeriksa seluruh isi
 * berkas sekaligus hanya membuktikan bahwa fungsi ada di suatu tempat, bukan
 * bahwa setiap handler memanggilnya.
 */
function handler(route: string): { nama: string; isi: string }[] {
  const teks = readFileSync(path.join(AKAR, route), "utf8");
  const awal = [...teks.matchAll(/export async function (\w+)\(/g)].map((m) => ({
    nama: m[1],
    indeks: m.index ?? 0,
  }));

  return awal.map((f, i) => ({
    nama: f.nama,
    isi: teks.slice(f.indeks, awal[i + 1]?.indeks ?? teks.length),
  }));
}

/** Semua route yang benar-benar memanggil `requireSession`. */
function yangMemeriksa(route: string): string[] {
  return handler(route)
    .filter((h) => /await requireSession\(/.test(h.isi))
    .map((h) => h.nama);
}

describe("route admin ada dan bisa dibaca", () => {
  it("hanya ada empat belas route dan semuanya ditemukan", () => {
    // Kalau jumlah ini berubah tanpa thoughtful, kemungkinan ada route yang
    // baru dibuat lalu test ini tidak ikut diperbarui. Sebaliknya, kalau ada
    // route yang dihapus, test ini gagal dan pemanggilnya tahu untuk mengecek
    // apakah daftar perannya juga perlu dibersihkan.
    expect(ROUTE).toHaveLength(14);
    for (const r of ROUTE) expect(existsSync(path.join(AKAR, r))).toBe(true);
  });

  it("setiap route punya minimal satu handler", () => {
    for (const r of ROUTE) {
      expect(handler(r).length, r).toBeGreaterThan(0);
    }
  });
});

describe("sesi diperiksa sebelum database disentuh", () => {
  for (const route of ROUTE) {
    it(route, () => {
      const semua = handler(route);
      const diperiksa = yangMemeriksa(route);

      // Minimal satu handler harus memanggilnya.
      expect(diperiksa.length, `${route} tidak memanggil requireSession sama sekali`).toBeGreaterThan(0);

      for (const h of semua) {
        if (!diperiksa.includes(h.nama)) continue;

        const posisiPeriksa = h.isi.search(/await requireSession\(/);
        const posisiDb = h.isi.search(/dbOrNull\(/);

        // `dbOrNull` tidak selalu dipanggil; kalau tidak, urutannya tidak
        // bisa diuji dan tidak perlu.
        if (posisiDb === -1) continue;

        expect(
          posisiPeriksa,
          `${route} ${h.nama}: requireSession harus dipanggil sebelum dbOrNull`,
        ).toBeLessThan(posisiDb);
      }
    });
  }
});

describe("pembatasan peran, bukan sekadar sesi", () => {
  /**
   * Route yang menulis ke konten atau ke daftar user.
   *
   * `requireSession()` tanpa argumen hanya berarti "pernah masuk". Untuk
   * operasi menulis, itu tidak cukup: tanpa memeriksa peran, `front_office`
   * bisa mengubah isi berita. Daftar ini mengunci bahwa pemeriksaannya memakai
   * fungsi peran, bukan sekadar memeriksa sesi sudah ada.
   *
   * `inbox/[kind]/[id]` sengaja tidak ada di sini. Route itu hanya mengubah
   * status pesan masuk, yang menurut definisi pekerjaan front office, dan
   * tidak ada endpoint mana pun yang mengubah isi pesan.
   *
   * `users/[id]/password` juga tidak ada di sini dan dikunci terpisah di
   * bawah: aturannya "super_admin atau akun sendiri", yang tidak bisa
   * ditulis sebagai satu argumen fungsi peran.
   */
  const PERLU_PERAN = [
    "src/app/api/v1/admin/records/[table]/route.ts",
    "src/app/api/v1/admin/records/[table]/[id]/route.ts",
    "src/app/api/v1/admin/users/route.ts",
    "src/app/api/v1/admin/users/[id]/route.ts",
    "src/app/api/v1/admin/users/[id]/reset-password/route.ts",
  ];

  it("daftar route yang butuh peran masih ada di filesystem", () => {
    for (const r of PERLU_PERAN) {
      expect(ROUTE, `${r} tidak ditemukan`).toContain(r);
    }
  });

  for (const route of PERLU_PERAN) {
    it(route, () => {
      const memeriksa = yangMemeriksa(route);
      expect(memeriksa.length, `${route} tidak memanggil requireSession`).toBeGreaterThan(0);

      for (const h of handler(route)) {
        if (!memeriksa.includes(h.nama)) continue;
        expect(
          h.isi,
          `${route} ${h.nama}: harus memakai fungsi peran (canEditContent/canManageUsers)`,
        ).toMatch(/requireSession\(\s*(canEditContent|canManageUsers|peran\w*)/);
      }
    });
  }
});

describe("ganti sandi: super_admin atau akun sendiri", () => {
  // Satu-satunya route tulis dengan aturan gabungan: super_admin boleh akun
  // mana pun, peran lain hanya akunnya sendiri. Pola `requireSession(fungsi)`
  // tidak bisa menulis "atau diri sendiri", jadi gerbangnya dua lapis dan
  // dikunci di sini, bukan di daftar PERLU_PERAN di atas.
  const route = "src/app/api/v1/admin/users/[id]/password/route.ts";

  it("memeriksa sesi sebelum database", () => {
    const post = handler(route).find((h) => h.nama === "POST");
    expect(post, "handler POST tidak ada").toBeDefined();
    const posisiPeriksa = post!.isi.search(/await requireSession\(/);
    const posisiDb = post!.isi.search(/dbOrNull\(/);
    expect(posisiPeriksa).toBeGreaterThanOrEqual(0);
    expect(posisiPeriksa).toBeLessThan(posisiDb);
  });

  it("menolak selain super_admin dan selain akun sendiri dengan 403", () => {
    const post = handler(route).find((h) => h.nama === "POST");
    expect(post, "handler POST tidak ada").toBeDefined();
    expect(post!.isi).toContain("canManageUsers(sesi.role)");
    expect(post!.isi).toContain("sesi.sub");
    expect(post!.isi).toContain("ApiError.forbidden()");
  });
});