import { describe, expect, it } from "vitest";
import { createRecord, updateRecord } from "@/server/admin/records";
import { find } from "@/server/admin/registry";
import { ApiError } from "@/server/api/error";
import type { Db } from "@/server/db/client";

/**
 * Validasi kolom di `createRecord` dan `updateRecord`.
 *
 * Fungsi-fungsi ini adalah satu-satunya tempat nilai dari panel diperiksa
 * sebelum masuk ke SQL. Kalau sebuah nilai lolos, ia sampai ke `UPDATE` atau
 * `INSERT` apa adanya, dan setelah itu tidak ada tempat lain yang memeriksa.
 *
 * Yang diuji di sini bukan query-nya, tapi keputusan menolak.
 *
 * `dbMustahil` di bawah sengaja melempar galat setiap kali menyentuh apa pun,
 * jadi setiap tes yang mengharapkan penolakan sekaligus membuktikan
 * penolakan itu terjadi sebelum query apa pun dikirim. Kalau suatu saat
 * validasi ditambahkan setelah query, tes ini gagal.
 *
 * Kolom terkunci juga diuji. `locked` dibaca `updateRecord` untuk melewati
 * kolom yang tidak boleh diubah dari panel; kalau cek itu hilang, nomor
 * praktik dokter bisa ditulis ulang lewat panel, dan keunikan nomor itu
 * bisa rusak.
 */

/**
 * Database yang mustahil dipakai.
 *
 * `createRecord` dan `updateRecord` memvalidasi seluruh body sebelum menyusun
 * SQL. Jadi pada jalur yang ditolak, fungsi ini tidak akan pernah dipanggil,
 * dan tes yang memanggil dengan body ilegal akan gagal dengan pesan ini kalau
 * penolakannya hilang.
 */
const dbMustahil = new Proxy(
  {},
  {
    get(_target, nama) {
      throw new Error(`Database shouldn't be touched (${String(nama)}).`);
    },
  },
) as unknown as Db;

/**
 * Isi per kolom dari galat validasi, atau `null` kalau galatnya bukan
 * validasi.
 *
 * `ApiError` menaruh peta kolom di `fields`, bukan di `detail`. `detail` dipakai
 * untuk pesan internal yang tidak pernah dikirim ke klien, jadi membacanya di
 * sini selalu `undefined` dan pemeriksaannya gagal untuk alasan yang salah.
 */
function fieldsOf(err: unknown): Record<string, string> | null {
  if (!(err instanceof ApiError) || err.code !== "VALIDATION_FAILED") return null;
  return err.fields ?? {};
}

/**
 * Kode galat yang dilempar, atau `TIDAK-DITOLAK` kalau jalurnya justru berhasil.
 *
 * `BUKAN-API-ERROR` muncul kalau yang dilempar bukan `ApiError`. Itu kegagalan
 * tes, bukan hasil yang diharapkan, jadi seruan itsinya membuat penyebabnya
 * kelihatan tanpa harus menggali `toString`.
 */
async function kode(jalan: Promise<unknown>): Promise<string> {
  try {
    await jalan;
    return "TIDAK-DITOLAK";
  } catch (e) {
    return e instanceof ApiError ? e.code : `BUKAN-API-ERROR:${String(e)}`;
  }
}

async function fields(jalan: Promise<unknown>): Promise<Record<string, string> | null> {
  try {
    await jalan;
    return null;
  } catch (e) {
    return fieldsOf(e);
  }
}

function wajibkan(table: string) {
  const spesifikasi = find(table);
  if (spesifikasi === undefined) throw new Error(`Tabel ${table} tidak ada di registry.`);
  return spesifikasi;
}

/**
 * Nama kolom pertama pada tabel yang punya jenis kolom tertentu.
 *
 * diambil dari registry, bukan ditulis tangan, supaya tes ini ikut gagal kalau
 * tabelnya berubah nama kolom dan tidak ada lagi kolom sejenis. Menulis nama
 * kolom secara langsung berisiko membuat tes diam tetapi tidak menguji apa pun.
 */
function kolomDengan(table: string, jenis: string): string {
  const spesifikasi = wajibkan(table);
  for (const f of spesifikasi.fields) {
    if (f.kind.type === jenis) return f.column;
  }
  throw new Error(`Tabel ${table} tidak punya kolom jenis ${jenis}.`);
}

describe("tolak nilai yang tidak boleh masuk database", () => {
  it("menolak url dengan javascript:", async () => {
    const kolom = kolomDengan("hero_slides", "url");
    // Nilai ini akan ikut masuk ke atribut src atau href di halaman publik,
    // jadi diterima berarti skrip milik panel berjalan di browser
    // pengunjung.
    const fields2 = await fields(
      createRecord(dbMustahil, wajibkan("hero_slides"), { [kolom]: "javascript:alert(1)" }),
    );
    expect(fields2).not.toBeNull();
    expect(Object.keys(fields2!)).toContain(kolom);
  });

  it("menolak url dengan javascript: huruf besar dan spasi di depan", async () => {
    const kolom = kolomDengan("hero_slides", "url");
    // Pemeriksaan ini hanya berhasil kalau perbandingan dilakukan pada teks
    // yang sudah dibersihkan. Kalau hanya `startsWith` tanpa `toLowerCase`,
    // huruf besar lolos.
    for (const nilai of ["JavaScript:alert(1)", "JAVASCRIPT:alert(1)", "  javascript:alert(1)  "]) {
      const f = await fields(createRecord(dbMustahil, wajibkan("hero_slides"), { [kolom]: nilai }));
      expect(f, `harus menolak: ${nilai}`).not.toBeNull();
    }
  });

  it("menerima url http dan https serta path relatif", async () => {
    // Kebalikannya juga harus diuji. Penolakan yang berlebihan sama saja
    // merusak: admin tidak bisa menyimpan gambar yang memang benar.
    const kolom = kolomDengan("hero_slides", "url");
    const seen: unknown[] = [];
    const dbRekam = {
      execute: (...args: unknown[]) => {
        seen.push(args);
        return Promise.resolve([{ row: { id: "x" } }]);
      },
    } as unknown as Db;

    for (const nilai of ["http://contoh.test/a.jpg", "https://contoh.test/a.jpg", "/internal/a.jpg"]) {
      await createRecord(dbRekam, wajibkan("hero_slides"), { [kolom]: nilai, title: "Judul Sah" });
    }
    expect(seen.length).toBeGreaterThan(0);
  });

  it("menolak slug dengan spasi, garis bawah, dan garis miring", async () => {
    const kolom = kolomDengan("services", "slug");
    // `isSlug` menerima garis hubung berulang karena polanya `/^[a-z0-9-]+$/`
    // tidak pernah menghitung jumlah garis. Itu keputusan kode yang sudah berjalan,
    // jadi yang diuji di sini hanya yang benar-benar ditolak.
    for (const nilai of ["Ada Spasi", "Ada_Garis_Bawah", "/leading", "trailing/", "a/b"]) {
      const f = await fields(createRecord(dbMustahil, wajibkan("services"), { [kolom]: nilai }));
      expect(f, `harus menolak: ${nilai}`).not.toBeNull();
    }
  });

  it("menormalkan slug jadi huruf kecil", async () => {
    // Slug dibuat ke huruf kecil sebelum diperiksa, jadi isian huruf besar tidak
    // ditolak — ia diterjemahkan. Menolaknya akan membuat admin mengetik ulang
    // slug yang sebenarnya tidak salah.
    const kolom = kolomDengan("services", "slug");
    const dbRekam = {
      execute: () => Promise.resolve([{ row: { id: "x" } }]),
    } as unknown as Db;
    const hasil = await createRecord(dbRekam, wajibkan("services"), {
      [kolom]: "Layanan-SBp",
      title: "Layanan Sah",
    });
    expect(hasil).toBeTruthy();
  });

  it("menolak tanggal yang tidak ada di kalender", async () => {
    const kolom = kolomDengan("articles", "date");
    // `2026-02-30` lolos pola YYYY-MM-DD tapi bukan tanggal yang ada. Kalau
    // hanya pola yang diperiksa, database akan menerima atau diam-diam
    // menyimpan apa pun.
    const f = await fields(createRecord(dbMustahil, wajibkan("articles"), { [kolom]: "2026-02-30" }));
    expect(f).not.toBeNull();
  });

  it("menerima tanggal yang memang ada, termasuk 29 Februari pada tahun kabisat", async () => {
    const kolom = kolomDengan("articles", "date");
    const dbRekam = { execute: () => Promise.resolve([{ row: { id: "x" } }]) } as unknown as Db;
    for (const nilai of ["2026-10-03", "2024-02-29", "2000-02-29"]) {
      await createRecord(dbRekam, wajibkan("articles"), {
        [kolom]: nilai,
        title: "Judul Sah",
      });
    }
    // 1900 bukan tahun kabisat, jadi 29 Februari di tahun itu tidak ada.
    const f = await fields(
      createRecord(dbMustahil, wajibkan("articles"), { [kolom]: "1900-02-29" }),
    );
    expect(f).not.toBeNull();
  });

  it("menolak bilangan bulat yang bukan angka", async () => {
    const kolom = kolomDengan("doctor_schedules", "integer");
    for (const nilai of ["bukan angka", "3,5", "1e3", {}]) {
      const f = await fields(
        createRecord(dbMustahil, wajibkan("doctor_schedules"), { [kolom]: nilai }),
      );
      expect(f, `harus menolak: ${JSON.stringify(nilai)}`).not.toBeNull();
    }
  });

  it("menerima angka bulat yang ditulis sebagai teks panel", async () => {
    // Panel mengirim nilai form sebagai teks. Menolaknya karena tipenya string
    // akan membuat seluruh formulir tidak bisa disimpan.
    const kolom = kolomDengan("doctor_schedules", "integer");
    const dbRekam = { execute: () => Promise.resolve([{ row: { id: "x" } }]) } as unknown as Db;
    // `quota` dan `day_of_week` punya nilai bawaan, jadi cukup kirim kolom
    // yang diuji saja. `start_time` dan `end_time` tidak wajib.
    await createRecord(dbRekam, wajibkan("doctor_schedules"), { [kolom]: "12" });
  });

  it("menolak uang yang bukan angka positif", async () => {
    const kolom = kolomDengan("mcu_packages", "money");
    for (const nilai of ["gratis", "100rb", -50]) {
      const f = await fields(createRecord(dbMustahil, wajibkan("mcu_packages"), { [kolom]: nilai }));
      expect(f, `harus menolak: ${nilai}`).not.toBeNull();
    }
  });

  it("menolak pilihan di luar daftar yang diizinkan", async () => {
    const spesifikasi = wajibkan("services");
    const f = spesifikasi.fields.find((x) => x.kind.type === "choice");
    if (!f) throw new Error("services tidak punya kolom choice.");
    const keluar = f.kind.type === "choice" ? f.kind.allowed[0] + "-tidak-ada" : "";
    const hasil = await fields(
      createRecord(dbMustahil, spesifikasi, { [f.column]: keluar, title: "Nama Sah" }),
    );
    expect(hasil).not.toBeNull();
    expect(Object.keys(hasil!)).toContain(f.column);
  });

  it("menolak surel yang tidak valid", async () => {
    const kolom = kolomDengan("management_members", "email");
    const f = await fields(
      createRecord(dbMustahil, wajibkan("management_members"), {
        [kolom]: "bukan-surel",
        name: "Nama Sah",
      }),
    );
    expect(f).not.toBeNull();
  });

  it("menolak kolom wajib yang diisi null", async () => {
    const spesifikasi = wajibkan("services");
    const wajib = spesifikasi.fields.find((x) => x.required);
    if (!wajib) throw new Error("services tidak punya kolom wajib.");
    const f = await fields(
      createRecord(dbMustahil, spesifikasi, { [wajib.column]: null }),
    );
    expect(f).not.toBeNull();
    expect(f![wajib.column]).toContain("wajib diisi");
  });

  it("melaporkan semua kolom yang salah sekaligus", async () => {
    // Kalau validasinya berhenti di kolom pertama, admin harus menekan simpan
    // berulang kali untuk menemukan sisa kesalahan.
    //
    // Dua kesalahan dipilih yang memang ditolak: slug dengan spasi dan `type`
    // di luar daftar. `textOptional` hanya menolak yang terlalu panjang, bukan
    // yang terlalu pendek, jadi `title` pendek tidak bisa dipakai sebagai
    // galat kedua.
    //
    // Kolom choice di `services` bernama `type`. `category` milik
    // `mcu_packages`, dan memakai nama yang salah akan membuat tes ini diam
    // tetapi tidak menguji apa pun.
    const hasil = await fields(
      createRecord(dbMustahil, wajibkan("services"), {
        slug: "Ada Spasi",
        type: "jenis-tidak-ada",
      }),
    );
    expect(hasil).not.toBeNull();
    expect(Object.keys(hasil!).sort()).toEqual(["slug", "type"]);
  });

  it("menolak body yang tidak mengubah apa pun", async () => {
    // Kalau tidak ada kolom yang bisa diubah, kueri akan jadi `SET` kosong dan
    // itu galat sintaks di database, bukan 400 yang bisa dibaca panel.
    const kode2 = await kode(
      updateRecord(dbMustahil, wajibkan("services"), "00000000-0000-4000-8000-000000000000", {
        kolom_yang_tidak_ada: "apa saja",
      }),
    );
    expect(kode2).toBe("BAD_REQUEST");
  });
});

describe("kolom terkunci tidak bisa diubah dari panel", () => {
  it("mengabaikan kolom terkunci pada update", async () => {
    const spesifikasi = wajibkan("doctors");
    const terkunci = spesifikasi.fields.find((x) => x.locked);
    if (!terkunci) throw new Error("doctors tidak punya kolom terkunci.");

    const sqlTercatat: string[] = [];
    const dbRekam = {
      execute: (...args: unknown[]) => {
        sqlTercatat.push(JSON.stringify(args));
        return Promise.resolve([{ row: { id: "x" } }]);
      },
    } as unknown as Db;

    await updateRecord(dbRekam, spesifikasi, "00000000-0000-4000-8000-000000000000", {
      [terkunci.column]: "NOMOR-BARU",
      full_name: "Nama Lengkap Sah",
    });

    // Nilai terkunci tidak boleh muncul di kueri. Kalau muncul, panel bisa
    // menulis ulang nomor praktik yang seharusnya dijaga di server.
    const seluruh = sqlTercatat.join("\n");
    expect(sqlTercatat.length).toBeGreaterThan(0);
    expect(seluruh).not.toContain("NOMOR-BARU");
  });

  it("membuang kolom terkunci saat membuat baris baru", async () => {
    // `createRecord` menelusuri `writable()`, bukan seluruh kolom, jadi kolom
    // terkunci tidak pernah masuk ke INSERT. Beda dengan `updateRecord` yang
    // melompatinya per kolom.
    //
    // Konsekuensinya ada cara lain untuk mengisi kolom ini. Untuk
    // `practice_number` itu memang disengaja: komentar di registry menyebut
    // nomor praktik hanya diisi sekali lewat data awal.
    const spesifikasi = wajibkan("doctors");
    const terkunci = spesifikasi.fields.find((x) => x.locked);
    if (!terkunci) throw new Error("doctors tidak punya kolom terkunci.");

    let sqlTercatat = "";
    const dbRekam = {
      execute: (...args: unknown[]) => {
        sqlTercatat = JSON.stringify(args);
        return Promise.resolve([{ row: { id: "x" } }]);
      },
    } as unknown as Db;

    await createRecord(dbRekam, spesifikasi, {
      [terkunci.column]: "NOMOR-PRAKTIK",
      full_name: "Nama Lengkap Sah",
    });

    expect(sqlTercatat).not.toBe("");
    expect(sqlTercatat).not.toContain("NOMOR-PRAKTIK");
    expect(sqlTercatat).not.toContain(terkunci.column);
  });
});