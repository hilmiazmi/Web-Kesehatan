/**
 * Uji tulis-baca untuk lapisan admin: CRUD generik, inbox, akun, dan dasbor.
 *
 * Ini skrip sekali pakai, bukan bagian dari `bun run test`. Yang diuji di sini
 * butuh database, sedangkan `tests/` sengaja hanya berisi logika murni.
 */

import { sql } from "drizzle-orm";
import { closeDb, dbOrNull } from "@/server/db/client";
import { ApiError } from "@/server/api/error";
import { all, find, tableCount } from "@/server/admin/registry";
import {
  createRecord,
  deleteRecord,
  getRecord,
  listRecords,
  mustFind,
  updateRecord,
} from "@/server/admin/records";
import { allKinds, findByTicket, listInbox, looksLikeTicketCode, parseKind, updateStatus } from "@/server/admin/inbox";
import { appointmentsPerDay, loadStats, surveyByUnit } from "@/server/admin/stats";
import {
  changePassword,
  createAccount,
  credentialsByEmail,
  deleteAccount,
  findAccount,
  listAccounts,
  resetPassword,
  touchLogin,
  updateAccount,
} from "@/server/admin/accounts";

const db = dbOrNull();
if (!db) throw new Error("tidak ada koneksi database");

function lapis<T>(nama: string, fn: () => Promise<T>): Promise<T | string> {
  return fn().then(
    (v) => {
      console.log(`OK   ${nama}`);
      return v;
    },
    (e: unknown) => {
      const err = e as ApiError;
      console.log(`GAGAL ${nama}: [${err?.code ?? "?"}] ${err?.message ?? String(e)}`);
      return err?.message ?? String(e);
    },
  );
}

function harusGagal(nama: string, fn: () => Promise<unknown>, harapan?: string): Promise<void> {
  return fn().then(
    () => console.log(`BOCOR ${nama}: seharusnya ditolak`),
    (e: unknown) => {
      const err = e as ApiError;
      const ok = harapan === undefined || err?.message === harapan;
      console.log(
        `${ok ? "OK  " : "BOCOR"} ditolak ${nama}: [${err?.code ?? "?"}] ${err?.message}`,
      );
    },
  );
}

console.log(`\n== registri: ${tableCount()} tabel ==`);
console.log(all().map((t) => t.table).join(", "));
console.log("tabel asing:", find("users"), "| tabel tidak dikenal harus undefined:", find("pg_tables"));

// ---------------------------------------------------------------- CRUD generik
console.log("\n== CRUD generik: faqs ==");
const spesifikasi = mustFind("faqs");

const dibuat = await lapis("buat faq", () =>
  createRecord(db, spesifikasi, {
    question: "Apakah layanan ICU tersedia?",
    answer: "Ya, tersedia setiap hari.",
    category: "Layanan",
    sort_order: 999,
    is_active: true,
  }),
);
const id = (dibuat as { id?: string }).id;

await lapis("baca balik", async () => {
  const baris = await getRecord(db, spesifikasi, id!);
  if (baris?.question !== "Apakah layanan ICU tersedia?") {
    throw new Error(`isi berbeda: ${JSON.stringify(baris)}`);
  }
  return baris;
});

await lapis("daftar dengan pencarian", async () => {
  const hasil = await listRecords(db, spesifikasi, {
    page: 1,
    pageSize: 5,
    search: "layanan ICU",
  });
  if (Number(hasil.total) < 1) throw new Error("pencarian tidak menemukan baris uji");
  console.log(`     total=${hasil.total} pages=${hasil.pages} sort=${hasil.sort}`);
  return hasil;
});

await lapis("daftar tanpa kata kunci mengembalikan semua baris", async () => {
  const semua = await listRecords(db, spesifikasi, { page: 1, pageSize: 100 });
  const dengan = await listRecords(db, spesifikasi, { page: 1, pageSize: 100, search: "" });
  if (Number(semua.total) !== Number(dengan.total)) {
    throw new Error(`kata kunci kosong menyaring baris: ${semua.total} vs ${dengan.total}`);
  }
  console.log(`     total=${semua.total} (kalau 0 berarti klausa pencarian tidak sengaja aktif)`);
  return semua;
});

await lapis("daftar dengan pencarian yang mengandung wildcard", async () => {
  const hasil = await listRecords(db, spesifikasi, { page: 1, pageSize: 5, search: "%" });
  // Tanpa escapeLike, tanda persen jadi wildcard dan semua baris ikut terbawa.
  if (Number(hasil.total) !== 0) throw new Error(`wildcard tidak di-escape: ${hasil.total} baris`);
  return hasil;
});

await lapis("daftar dengan sort asing ditolak diam-diam", async () => {
  const hasil = await listRecords(db, spesifikasi, {
    page: 1,
    pageSize: 5,
    sort: "question; DROP TABLE faqs",
  });
  if (hasil.sort !== "sort_order") throw new Error(`sort asing diterima: ${hasil.sort}`);
  return hasil;
});

await lapis("ubah", async () => {
  const baris = await updateRecord(db, spesifikasi, id!, { answer: "Tersedia setiap hari kerja." });
  if (baris.answer !== "Tersedia setiap hari kerja.") throw new Error("tidak berubah");
  return baris;
});

await harusGagal("ubah tanpa kolom yang bisa diubah", () =>
  updateRecord(db, spesifikasi, id!, { field_asing: "x" }),
"Tidak ada kolom yang bisa diubah.");

await harusGagal(
  "field terkunci tidak ditulis",
  () => updateRecord(db, mustFind("doctors"), "00000000-0000-0000-0000-000000000000", {}),
);

await harusGagal("kategori di luar daftar", () =>
  updateRecord(db, mustFind("documents"), id!, { category: "kategori_hantu" }),
);

await harusGagal("surel tidak valid", () =>
  createRecord(db, mustFind("management_members"), { name: "Uji", position: "Uji", email: "bukan-surel" }),
);

await harusGagal("URL javascript ditolak", () =>
  createRecord(db, mustFind("hero_slides"), {
    title: "Uji",
    image_url: "javascript:alert(1)",
  }),
);

await harusGagal("slug huruf besar ditolak", () =>
  createRecord(db, mustFind("articles"), {
    slug: "Slug huruf besar",
    title: "Uji",
    published_at: "2026-01-01",
  }),
);

await harusGagal("tanggal tidak nyata ditolak", () =>
  createRecord(db, mustFind("articles"), {
    slug: "uji-tanggal",
    title: "Uji",
    published_at: "2026-02-31",
  }),
);

await lapis("kolom tak dikenal diabaikan", async () => {
  const baris = await updateRecord(db, spesifikasi, id!, {
    tak_ada: 1,
    answer: "Masih bisa diubah.",
  });
  if (baris.answer !== "Masih bisa diubah.") throw new Error("kolom dikenal ikut tersimpan");
  return baris;
});

await lapis("hapus", async () => {
  await deleteRecord(db, spesifikasi, id!);
  const baris = await getRecord(db, spesifikasi, id!);
  if (baris !== null) throw new Error("baris masih ada setelah dihapus");
  return baris;
});

await harusGagal("hapus baris yang tidak ada", () =>
  deleteRecord(db, spesifikasi, "00000000-0000-0000-0000-000000000000"),
);

// ---------------------------------------------------------------------- inbox
console.log("\n== inbox ==");
console.log("jenis:", allKinds().map((k) => k.slug).join(", "));
console.log("jenis asing harus undefined:", parseKind("users"), parseKind("survey_responses; DROP TABLE users"));

const feedbacks = parseKind("feedbacks")!;
const inbox1 = await lapis("daftar inbox kritik", async () => {
  const hasil = await listInbox(db, feedbacks, { page: 1, pageSize: 5 });
  console.log(`     total=${hasil.total} kind=${hasil.kind}`);
  return hasil;
});
void inbox1;

await lapis("daftar inbox tanpa kata kunci mengembalikan semua baris", async () => {
  const semua = await listInbox(db, feedbacks, { page: 1, pageSize: 100 });
  const dengan = await listInbox(db, feedbacks, { page: 1, pageSize: 100, search: "" });
  if (Number(semua.total) !== Number(dengan.total)) {
    throw new Error(`kata kunci kosong menyaring baris: ${semua.total} vs ${dengan.total}`);
  }
  return semua;
});

await harusGagal(
  "status di luar allowlist ditolak",
  () => listInbox(db, feedbacks, { page: 1, pageSize: 5, status: "selesai" }),
  "Status tidak dikenal.",
);

await harusGagal(
  "status milik jenis lain ditolak",
  () => listInbox(db, feedbacks, { page: 1, pageSize: 5, status: "pending" }),
  "Status tidak dikenal.",
);

const survei = parseKind("survey-responses")!;
await lapis("survei tidak punya kolom status", async () => {
  const hasil = await listInbox(db, survei, { page: 1, pageSize: 5, status: "new" });
  return hasil;
});
await harusGagal(
  "ubah status survei ditolak dengan pesan khusus",
  () => updateStatus(db, survei, "00000000-0000-0000-0000-000000000000", "new", null),
);

await lapis("cari tiket", async () => {
  const kode = (
    await db.execute(sql`SELECT ticket_code FROM feedbacks ORDER BY created_at DESC LIMIT 1`)
  )[0] as { ticket_code: string };
  const baris = await findByTicket(db, feedbacks, kode.ticket_code.toLowerCase());
  console.log("     ", JSON.stringify(baris));
  if (!baris) throw new Error("tiket tidak ditemukan");
  return baris;
});

console.log("bentuk tiket:", ["EP-ABCD1234", "WBS-00000000", "MCU-ABCDEFGH", "X-ABCD1234", "EP-ABCD123", "EP-ABCDEFGH", "EP-ABC1DEFG"].map((c) => `${c}=${looksLikeTicketCode(c)}`).join(" "));

// ------------------------------------------------------------------------ akun
console.log("\n== akun ==");
const emailUji = `uji-${Date.now()}@contoh.test`;
const akun = await lapis("buat akun", () =>
  createAccount(db, {
    email: emailUji,
    name: "Akun Uji",
    role: "editor",
    password: "SandiUji123!",
  }),
);

await harusGagal("surel ganda ditolak dengan pesan jelas", () =>
  createAccount(db, { email: emailUji, name: "Duplikat", role: "editor", password: "SandiUji123!" }),
  "Surel itu sudah dipakai akun lain.",
);

await lapis("kredensial hanya untuk akun aktif", async () => {
  const cred = await credentialsByEmail(db, emailUji.toUpperCase());
  if (!cred) throw new Error("surel case-insensitive tidak cocok");
  if (cred.password_hash.length < 20) throw new Error("hash tidak tersimpan");
  return { role: cred.role, hash_prefix: cred.password_hash.slice(0, 7) };
});

await lapis("catat login", async () => {
  await touchLogin(db, (akun as { id: string }).id);
  const row = await findAccount(db, (akun as { id: string }).id);
  if (!row?.last_login_at) throw new Error("last_login_at tidak terisi");
  console.log("     ", row.last_login_at);
  return row;
});

const akunLain = await lapis("buat akun pemanggil lain", () =>
  createAccount(db, {
    email: `uji-pemanggil-${Date.now()}@contoh.test`,
    name: "Pemanggil Uji",
    role: "super_admin",
    password: "SandiUji123!",
  }),
);

await lapis("ubah profil", async () => {
  const row = await updateAccount(
    db,
    (akun as { id: string }).id,
    (akunLain as { id: string }).id,
    { name: "Akun Uji Diubah" },
  );
  if (row.name !== "Akun Uji Diubah") throw new Error("nama tidak berubah");
  return row;
});

// Menonaktifkan akun sendiri adalah jalan mengunci diri sendiri: sesi ikut
// mati pada saat yang sama, dan `credentialsByEmail` menyaring `AND is_active`
// sehingga login berikutnya mustahil. Peran sendiri punya masalah serupa.
await harusGagal(
  "menonaktifkan akun sendiri",
  () =>
    updateAccount(db, (akun as { id: string }).id, (akun as { id: string }).id, {
      is_active: false,
    }),
  "Peran dan status aktif akun sendiri tidak bisa diubah dari sini.",
);

await harusGagal(
  "menurunkan peran sendiri",
  () =>
    updateAccount(db, (akun as { id: string }).id, (akun as { id: string }).id, {
      role: "front_office",
    }),
  "Peran dan status aktif akun sendiri tidak bisa diubah dari sini.",
);

// Mengubah nama sendiri tetap boleh, karena tidak menyentuh hak akses.
await lapis("ubah nama akun sendiri tetap boleh", async () => {
  const row = await updateAccount(db, (akun as { id: string }).id, (akun as { id: string }).id, {
    name: "Akun Uji Diubah",
  });
  if (row.name !== "Akun Uji Diubah") throw new Error("nama tidak berubah");
  return row;
});

await harusGagal("password lama salah memakai 401", () =>
  changePassword(db, (akun as { id: string }).id, "SalahSekali", "SandiBaru123!"),
);

await lapis("ubah password dengan password lama yang benar", async () => {
  await changePassword(db, (akun as { id: string }).id, "SandiUji123!", "SandiBaru456!");
  return true;
});

await lapis("setel ulang password", async () => {
  await resetPassword(db, (akun as { id: string }).id, "SandiReset789!");
  return true;
});

await lapis("daftar akun tanpa hash", async () => {
  const semua = await listAccounts(db);
  if (Object.keys(semua[0]).includes("password_hash")) throw new Error("hash ikut terkirim");
  console.log(`     ${semua.length} akun, kolom: ${Object.keys(semua[0]).join(", ")}`);
  return semua;
});

await harusGagal("akun sendiri tidak bisa dihapus", () =>
  deleteAccount(db, (akun as { id: string }).id, (akun as { id: string }).id),
  "Akun yang sedang dipakai tidak bisa dihapus.",
);

await lapis("hapus akun uji", async () => {
  await deleteAccount(db, (akun as { id: string }).id, "00000000-0000-0000-0000-000000000000");
  const row = await findAccount(db, (akun as { id: string }).id);
  if (row !== null) throw new Error("akun masih ada");
  return row;
});

// --------------------------------------------------------------------- dasbor
console.log("\n== dasbor ==");
const statistik = await lapis("loadStats", async () => {
  const s = await loadStats(db);
  console.log("     ", JSON.stringify(s));
  return s;
});
void statistik;

await lapis("survei per unit", async () => {
  const baris = await surveyByUnit(db);
  console.log("     ", JSON.stringify(baris));
  return baris;
});

await lapis("pendaftaran per hari (14 hari, tanpa celah)", async () => {
  const baris = await appointmentsPerDay(db);
  if (baris.length !== 14) throw new Error(`harusnya 14 baris, ada ${baris.length}`);
  console.log("     ", baris[0]?.date, "sampai", baris[13]?.date);
  return baris;
});

await closeDb();
console.log("\nselesai");