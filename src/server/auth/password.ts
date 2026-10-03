import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { Errors } from "../validation";

/**
 * Hashing dan verifikasi password admin.
 *
 * Memakai `scrypt` dari `node:crypto`, bukan argon2 atau bcrypt. Alasannya
 * soal ketersediaan paket, bukan soal kecepatannya:
 *
 * * Route handler Next.js selalu berjalan di Node.js, termasuk saat dipanggil
 *   lewat `bun run dev`, karena `next dev` menjalankan Node di belakang.
 *   `Bun.password` karena itu tidak bisa dipakai di sini.
 * * argon2 butuh paket native. Setiap paket native baru adalah satu sumber
 *   kegagalan build di VPS maupun di Vercel, dan sering gagal bukan karena
 *   kode salah melainkan karena libc berbeda.
 * * scrypt sudah jadi bagian dari Node sejak versi 10, jadi tidak ada
 *   dependensi yang bisa rusak.
 *
 * scrypt adalah fungsi memory-hard seperti bcrypt dan argon2, dan dengan
 * parameter di bawah jauh lebih berat daripada bcrypt dengan biaya setara.
 * Yang hilang memang format argon2id, sehingga hash dari backend Rust yang
 * diarsipkan tidak akan terbaca di sini; itu tidak menjadi masalah karena
 * kedua backend memakai database dan seed masing-masing.
 */

/** Panjang hash dalam byte. 64 byte adalah output scrypt normal. */
const KEY_LENGTH = 64;

/**
 * Parameter biaya.
 *
 * N=16384 memakai sekitar 16 MiB per hash. Di VPS dengan RAM terbatas ini
 * jumlah admin masih handful, jadi menaikkan N tidak memberi kompromi yang
 * nyata, sedangkan N yang rendah membuat kamus jauh lebih murah dijalankan.
 */
const COST_N = 16_384;
const COST_R = 8;
const COST_P = 1;

/**
 * Panggil `scrypt` dengan bentuk promise.
 *
 * `promisify` tidak bisa dipakai di sini: tipe built-in `scrypt` hanya
 * menerima tiga argumen, sehingga opsi `N`, `r`, dan `p` akan dianggap tidak
 * ada dan diam-diam memakai bawaan.
 */
function derive(
  password: string,
  salt: Buffer,
  N: number,
  r: number,
  p: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N, r, p }, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
}

/**
 * Hash password. Hasilnya disimpan apa adanya di kolom `users.password_hash`.
 *
 * Bentuknya `scrypt$N$r$p$salt$hash` dengan salt dan hash di base64. Versi
 * ditulis di dalam string supaya parameter bisa dinaikkan di kemudian hari
 * tanpa membuat hash lama otomatis tidak terbaca.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(plain.normalize("NFKC"), salt, COST_N, COST_R, COST_P);

  return [
    "scrypt",
    COST_N,
    COST_R,
    COST_P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

/**
 * Verifikasi password.
 *
 * Password salah adalah hal yang diharapkan, jadi hasilnya `false`, bukan
 * error. Hash yang rusak atau dari format lain juga dianggap tidak cocok: itu
 * jalur yang dipakai kalau baris admin dibuat di luar aplikasi, dan
 * menggagalkan login di sana lebih berguna daripada melempar 500.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    console.warn("[auth] hash password tidak terbaca, dianggap tidak cocok");
    return false;
  }

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  const expected = Buffer.from(parts[5], "base64");
  if (expected.length !== KEY_LENGTH) return false;

  let actual: Buffer;
  try {
    actual = await derive(
      plain.normalize("NFKC"),
      Buffer.from(parts[4], "base64"),
      N,
      r,
      p,
    );
  } catch {
    return false;
  }

  // Panjang sudah dipastikan sama di atas, jadi timingSafeEqual tidak akan
  // melempar karena panjang berbeda.
  return timingSafeEqual(actual, expected);
}

/**
 * Batas panjang kata sandi yang diterima.
 *
 * Panjang minimum 10, bukan 8: ini untuk akun admin, yang jumlahnya sedikit dan
 * tidak pernah dibagikan. Aturan ini sengaja tidak menuntut kombinasi huruf
 * besar, angka, dan simbol. Yang diwajibkan adalah panjang minimum, karena bagi
 * pengguna, kata sandi acak panjang jauh lebih berguna daripada "Rahasia123!"
 * yang sama dipakai di mana saja. Server juga membatasi percobaan login, sehingga
 * menebak kata sandi pendek tetap lambat.
 */
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;

/**
 * Periksa kata sandi baru.
 *
 * Mengembalikan pesan galat, bukan melempar, supaya bisa dipanggil di antara
 * pemeriksaan field lain dan digabung ke satu respons validasi. Panel menampilkan
 * semua pesan sekaligus; melempar di tengah pemeriksaan lain akan mengembalikan
 * hanya satu pesan dan membuat pengguna memperbaikinya satu per satu.
 */
export function periksaKataSandi(
  errors: Errors,
  password: string,
): string | null {
  const panjang = [...password].length;

  if (panjang < PASSWORD_MIN) {
    errors.add("password", `Kata sandi minimal ${PASSWORD_MIN} karakter.`);
    return null;
  }

  if (panjang > PASSWORD_MAX) {
    errors.add("password", `Kata sandi maksimal ${PASSWORD_MAX} karakter.`);
    return null;
  }

  if (password.trim() === "") {
    errors.add("password", "Kata sandi tidak boleh hanya spasi.");
    return null;
  }

  return password;
}

/*
 * Catatan untuk pemanggil berikutnya: kedua fungsi di atas `async` dan hasilnya
 * harus selalu di-`await`. Promise selalu bernilai benar, jadi
 * `if (!verifyPassword(a, b))` tidak pernah menolak apa pun dan
 * `verifyPassword(a, b) === false` juga tidak pernah benar. Kesalahannya tidak
 * muncul sebagai galat, tapi sebagai-password yang salah tetap diterima.
 *
 * Diperiksa ulang di `tests/password.test.ts`.
 */