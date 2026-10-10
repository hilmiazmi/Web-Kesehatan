# Referensi API `/api/v1`

Dokumen ini punya dua bagian dengan sumber berbeda:

- **Tabel endpoint** dihasilkan otomatis dari berkas `route.ts` oleh
  `scripts/gen-api-doc.py`. Jangan diedit tangan; jalankan ulang skripnya.
- **Konvensi, body formulir, dan contoh** ditulis tangan dari kode di
  `src/server/` dan `src/app/api/v1/`. Kalau ragu, kode yang benar.

Cara memperbarui tabel (dari root repo):

```bash
python3 scripts/gen-api-doc.py --tulis
```

- `python3`: menjalankan skrip Python 3.
- `scripts/gen-api-doc.py`: skripnya, memindai semua `route.ts` di `src/app/api/v1/`.
- `--tulis`: mengganti blok di antara penanda `BEGIN:endpoint-otomatis` dan
  `END:endpoint-otomatis` di berkas ini. Tanpa flag ini skrip hanya mencetak
  tabel ke layar dan tidak mengubah berkas apa pun.

Rute di luar yang terdaftar dibalas **404** oleh catcher `[...path]/route.ts`
(semua metode), bukan oleh 404 bawaan Next.js.

---

## 1. Endpoint (otomatis)

<!-- BEGIN:endpoint-otomatis -->
| Path | Metode | Akses | Catatan |
| --- | --- | --- | --- |
| `/api/v1/*` | GET, POST, PUT, PATCH, DELETE | publik | - |
| `/api/v1/admin/appointments-per-day` | GET | sesi | - |
| `/api/v1/admin/beds` | GET, PATCH | GET: sesi, PATCH: editor+ | - |
| `/api/v1/admin/inbox/[kind]/[id]` | PATCH | sesi | - |
| `/api/v1/admin/inbox/[kind]` | GET | sesi | - |
| `/api/v1/admin/records/[table]/[id]` | GET, PATCH, DELETE | GET: editor+, PATCH: editor+, DELETE: super_admin | - |
| `/api/v1/admin/records/[table]` | GET, POST | editor+ | - |
| `/api/v1/admin/settings` | GET, PUT | editor+ | - |
| `/api/v1/admin/stats` | GET | sesi | - |
| `/api/v1/admin/survey-by-unit` | GET | sesi | - |
| `/api/v1/admin/tables` | GET | sesi | - |
| `/api/v1/admin/users/[id]/password` | POST | super_admin | - |
| `/api/v1/admin/users/[id]/reset-password` | POST | super_admin | - |
| `/api/v1/admin/users/[id]` | PATCH, DELETE | super_admin | - |
| `/api/v1/admin/users` | GET, POST | super_admin | - |
| `/api/v1/admissions` | GET, POST | publik | form: rate limit + honeypot + tulis DB |
| `/api/v1/appointments` | POST | publik | form: rate limit + honeypot + tulis DB |
| `/api/v1/articles/[slug]` | GET | publik | baca DB atau snapshot |
| `/api/v1/articles` | GET | publik | baca DB atau snapshot |
| `/api/v1/auth/login` | POST | publik | - |
| `/api/v1/auth/logout` | POST | publik | - |
| `/api/v1/auth/session` | GET | publik | - |
| `/api/v1/beds` | GET | publik | baca DB atau snapshot |
| `/api/v1/doctors/[id]/schedules` | GET | publik | baca DB atau snapshot |
| `/api/v1/doctors` | GET | publik | baca DB atau snapshot |
| `/api/v1/documents/[slug]` | GET | publik | baca DB atau snapshot |
| `/api/v1/documents` | GET | publik | baca DB atau snapshot |
| `/api/v1/feedbacks` | POST | publik | form: rate limit + honeypot + tulis DB |
| `/api/v1/health` | GET | publik | - |
| `/api/v1/home` | GET | publik | baca DB atau snapshot |
| `/api/v1/jobs/[slug]` | GET | publik | baca DB atau snapshot |
| `/api/v1/jobs` | GET | publik | baca DB atau snapshot |
| `/api/v1/mcu-registrations` | POST | publik | form: rate limit + honeypot + tulis DB |
| `/api/v1/mcu/packages/[slug]` | GET | publik | baca DB atau snapshot |
| `/api/v1/mcu/packages` | GET | publik | baca DB atau snapshot |
| `/api/v1/pages/[slug]` | GET | publik | baca DB atau snapshot |
| `/api/v1/polyclinics` | GET | publik | baca DB atau snapshot |
| `/api/v1/schedules` | GET | publik | - |
| `/api/v1/services/[slug]` | GET | publik | baca DB atau snapshot |
| `/api/v1/services` | GET | publik | baca DB atau snapshot |
| `/api/v1/settings/public` | GET | publik | baca DB atau snapshot |
| `/api/v1/specialties` | GET | publik | baca DB atau snapshot |
| `/api/v1/survey-responses` | POST | publik | form: rate limit + honeypot + tulis DB |
| `/api/v1/tickets/[kind]/[code]` | GET | publik | rate limit |
| `/api/v1/wbs-reports` | POST | publik | form: rate limit + honeypot + tulis DB |

Jumlah berkas `route.ts`: 45.
<!-- END:endpoint-otomatis -->

Arti kolom **Akses**:

| Nilai | Arti |
| --- | --- |
| `publik` | Tanpa sesi |
| `sesi` | Wajib cookie `rsud_session` yang sah (`requireSession()`) |
| `editor+` | Sesi dengan `canEditContent`: `super_admin` atau `editor` (`front_office` ditolak 403) |
| `super_admin` | Sesi dengan `canManageUsers`: hanya `super_admin` |

Skrip membaca penjaga **per metode** dari argumen `requireSession(...)` di tiap
fungsi `GET`/`POST`/dst., jadi `GET: editor+, DELETE: super_admin` pada satu
route memang beda per metode. Yang tidak bisa dibaca skrip: aturan di dalam
fungsi pembantu (mis. penjaga akun di `src/server/admin/accounts.ts`).

---

## 2. Konvensi

### Amplop

Sukses:

```json
{ "data": { } }
```

Galat:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Periksa kembali isian formulir.", "fields": { "phone": "..." } } }
```

`fields` hanya ada pada galat validasi. Galat berstatus 500 ke atas dicatat di
log server dengan detail; **detail tidak dikirim ke klien**.

### Kode galat

Sumber: `src/server/api/error.ts`.

| Kode | Status | Kapan |
| --- | --- | --- |
| `VALIDATION_FAILED` | 422 | Isian formulir tidak sah; `fields` memetakan nama field → pesan |
| `BAD_REQUEST` | 400 | Permintaan salah bentuk; pendaftaran rawat jalan ganda `(phone, schedule_id)` |
| `UNAUTHORIZED` | 401 | Sesi tidak ada, kedaluwarsa, atau dicabut; login salah |
| `FORBIDDEN` | 403 | Sesi sah tetapi peran tidak boleh |
| `NOT_FOUND` | 404 | Sumber daya atau rute tidak ada |
| `PAYLOAD_TOO_LARGE` | 413 | Body melebihi `BODY_LIMIT_BYTES` (bawaan 262144) |
| `RATE_LIMITED` | 429 | Melewati batas; header `Retry-After` berisi detik |
| `READ_ONLY_MODE` | 503 | `API_MODE=snapshot` (tulis dan login ditolak) |
| `INTERNAL_ERROR` | 500 | Galat tak terduga |
| `DATABASE_ERROR` | 500 | Pelanggaran constraint/format dari PostgreSQL yang dipetakan generik (detail tidak dikirim ke klien) |
| `CONFIG_ERROR` | - | Ada di enum `ApiErrorCode` tetapi tidak dipakai pemetaan mana pun (diverifikasi dengan pencarian di `src/server/api/`) |

### Rate limit

- Bawaan **5 permintaan per 60 detik** per alamat IP **per endpoint**
  (`RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS`).
- Alamat klien diambil dari entri **paling kanan** `x-forwarded-for` (yang
  ditambahkan proxy tepercaya), lalu `x-real-ip`.
- Disimpan di memori proses, jadi tidak dibagi antar instance.
- Endpoint formulir menyetel ulang penghitung hanya setelah data berhasil
  tersimpan; permintaan gagal validasi tetap menghabiskan jatah.
- Endpoint cek tiket juga dibatasi (kunci `tickets`) tetapi tidak menyetel ulang.

### Honeypot

Semua formulir publik menerima field `website` (kolom perangkap bot). Jika
terisi, server membalas seolah berhasil dengan kode tiket palsu
`{ "ticket_code": "...", "status": "received" }` dan **tidak** menyimpan apa pun.
Klien sungguhan harus mengirim `website` kosong atau tidak mengirimnya.

### Mode snapshot

Pada `API_MODE=snapshot` endpoint baca menjawab dari `snapshot/*.json`
(filter dan paginasi diabaikan; lihat `ARCHITECTURE.md` bagian 3), sementara
endpoint tulis dan `auth/login` menjawab `503 READ_ONLY_MODE`.

---

## 3. Endpoint baca publik

Semua `GET`, tanpa sesi, berbasis `denganSnapshot` kecuali dicatat lain.

| Path | Query | Catatan |
| --- | --- | --- |
| `/health` | - | `{status, version, api_prefix, time, database, mode}`. Mode snapshot tetap 200 dengan `database: "tidak terhubung"`. Versi PostgreSQL sengaja tidak dibocorkan. |
| `/home` | - | Muatan beranda |
| `/pages/{slug}` | - | Halaman konten |
| `/doctors` | `specialty` | Daftar dokter |
| `/doctors/{id}/schedules` | - | Jadwal satu dokter |
| `/schedules` | `doctor` (UUID), `date` (tanggal) | Slot jadwal; tanpa snapshot (`dbOrNull`) |
| `/specialties`, `/polyclinics` | - | Referensi |
| `/services`, `/services/{slug}` | `type`, `section` | Layanan |
| `/mcu/packages`, `/mcu/packages/{slug}` | `category` | Paket MCU |
| `/articles`, `/articles/{slug}` | `category` | Berita |
| `/documents`, `/documents/{slug}` | `category` | Dokumen PPID |
| `/jobs`, `/jobs/{slug}` | - | Lowongan |
| `/beds` | - | Kapasitas bed |
| `/settings/public` | - | Pengaturan situs yang boleh publik |
| `/admissions` | - | **Bukan data pasien.** Mengembalikan `{classes: [{kelas, biaya}], max_nights}` untuk mengisi formulir rawat inap. |
| `/tickets/{kind}/{code}` | - | Cek status tiket; lihat bagian 5 |

`kind` pada tiket adalah salah satu slug inbox: `appointments`, `admissions`,
`mcu-registrations`, `feedbacks`, `wbs-reports`, `survey-responses`.

---

## 4. Formulir publik (`POST`, mengembalikan `201`)

Urutan pemrosesan ada di `ARCHITECTURE.md` bagian 4.1. Tanpa database
(`snapshot`) semuanya `503`.

### 4.1 `POST /api/v1/appointments` (rawat jalan)

| Field | Wajib | Aturan |
| --- | --- | --- |
| `patient_name` | ya | 3 sampai 160 karakter |
| `nik` | ya | tepat 16 digit; **divalidasi tetapi tidak disimpan** (diganti angka nol) |
| `phone` | ya | format nomor Indonesia (`phoneId`) |
| `visit_date` | ya | tanggal ISO, dalam rentang `MIN_LEAD_DAYS` sampai `MAX_LEAD_DAYS` (bawaan 0 sampai 90 hari) |
| `schedule_id` | ya | UUID jadwal dokter (dari `GET /schedules`); tidak ada → 404 |
| `payment_type` | tidak | `general` (bawaan), `bpjs`, `insurance` |
| `email`, `address` (maks 500), `complaint` (maks 1000), `birth_date` | tidak | |

Pendaftaran kedua dengan `(phone, schedule_id)` yang sama ditolak `400`
("Nomor ini sudah terdaftar untuk jadwal itu"). `doctor_id` dan `polyclinic_id`
diturunkan dari jadwal, tidak dikirim klien.

### 4.2 `POST /api/v1/admissions` (rawat inap)

| Field | Wajib | Aturan |
| --- | --- | --- |
| `patient_name`, `nik`, `phone` | ya | sama dengan di atas |
| `entry_date` | ya | tanggal ISO dalam rentang lead days |
| `estimated_nights` | ya | bilangan bulat 1 sampai 30; tidak ada nilai bawaan |
| `requested_class` | ya | `intensive`, `intermediate`, `regular`, `private` |
| `payment_type` | tidak | `general` (bawaan), `bpjs`, `insurance` |
| `email`, `address`, `complaint`, `referral_source` | tidak | |

### 4.3 Formulir lain

Field diekstrak dari route; **aturan rinci (wajib/panjang) BELUM DIVERIFIKASI di
dokumen ini**, baca `route.ts` terkait sebelum mengujinya.

| Endpoint | Field |
| --- | --- |
| `POST /mcu-registrations` | `name`, `email`, `phone`, `gender`, `birth_date`, `company_name`, `package`, `participant_count`, `preferred_date`, `notes` |
| `POST /feedbacks` | `name`, `email`, `phone`, `feedback_type`, `service_unit`, `subject`, `message` |
| `POST /wbs-reports` | `subject`, `description`, `severity`, `incident_date`, `location`, `involved_unit`, `is_anonymous`, `reporter_name`, `reporter_email`, `reporter_phone` |
| `POST /survey-responses` | `respondent_name`, `respondent_email`, `service_unit`, `overall_score`, `comment` |

Nilai enum yang ada di skema: `feedback_type` = `suggestion`, `complaint`,
`praise`, `question`; `wbs_severity` = `low`, `medium`, `high`.

### Contoh

```bash
curl -s -X POST http://localhost:3000/api/v1/feedbacks \
  -H 'Content-Type: application/json' \
  -d '{"name":"Budi","feedback_type":"suggestion","subject":"Parkir","message":"Mohon tambah area parkir."}'
```

- `curl`: klien HTTP baris perintah.
- `-s`: mode senyap, menyembunyikan progress bar sehingga hanya JSON yang tercetak.
- `-X POST`: memakai metode POST (default `curl` adalah GET).
- `-H 'Content-Type: application/json'`: header yang memberi tahu server bahwa
  body berformat JSON; tanpa ini `readJsonBody` bisa menolaknya.
- `-d '...'`: isi body request. Memakai `-d` juga membuat `curl` mengirim body.

Contoh di atas hanya ilustrasi bentuk permintaan; kelengkapan field wajibnya
**belum diverifikasi**. Respons sukses `201 {"data": {...}}` memuat kode tiket;
bentuk lengkap `data` per endpoint BELUM DIVERIFIKASI dari kode.

---

## 5. Tiket

`GET /api/v1/tickets/{kind}/{code}`

- Bentuk kode diperiksa dulu (`looksLikeTicketCode`); salah bentuk → `422`.
- Tidak ditemukan → `404`. Mode snapshot → `503`.
- Respons hanya memuat **empat kolom**: `ticket_code`, `status`, `created_at`,
  `updated_at`. Nama, telepon, surel, dan isi laporan tidak pernah dikembalikan.
- Awalan kode: `EP` rawat jalan, `RI` rawat inap, `MCU`, `KS` kritik-saran,
  `WBS`, `SKM`; sisanya 8 karakter acak dari alfabet 32 huruf
  (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`) lewat `randomInt`.

---

## 6. Autentikasi

| Endpoint | Fungsi |
| --- | --- |
| `POST /auth/login` | Body `email`, `password` (8 sampai 200 karakter), `website` (honeypot; bila terisi, server membalas `200 {"data":{"status":"received"}}` tanpa memproses login). Sukses: `data.user {id, email, name, role}` dan `data.expires_at`, plus cookie `rsud_session`. |
| `POST /auth/logout` | Menghapus cookie di peramban. **Tidak mencabut token** yang sudah tersalin; token sah sampai kedaluwarsa atau sampai password/peran akun berubah. |
| `GET /auth/session` | Sesi saat ini |

Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` bila `ADMIN_ORIGIN` diawali `https://`,
umur `SESSION_MAX_AGE_SECONDS` (bawaan 28800). Login salah atau akun tidak aktif
membalas `401` yang sama.

Peran (enum `user_role`): `super_admin`, `editor`, `front_office`.

---

## 7. Endpoint admin (`/admin/*`)

Semua memanggil `requireSession()`; setiap permintaan memeriksa
`session_version` dan `is_active` ke database.

| Path | Fungsi | Parameter query |
| --- | --- | --- |
| `/admin/tables` | Daftar tabel yang bisa dikelola (17, dari `registry.ts`) | - |
| `/admin/records/{table}` | Daftar / buat baris (editor+) | `q` (cari), `sort` |
| `/admin/records/{table}/{id}` | Baca / ubah (editor+); **hapus hanya `super_admin`** | - |
| `/admin/inbox/{kind}` | Daftar pengajuan | `status`, `q` |
| `/admin/inbox/{kind}/{id}` | Ubah status dan catatan admin | - |
| `/admin/beds` | Baca / ubah kapasitas bed | - |
| `/admin/settings` | Baca / ubah pengaturan situs | - |
| `/admin/stats`, `/admin/survey-by-unit`, `/admin/appointments-per-day` | Statistik dasbor | - |
| `/admin/users`, `/admin/users/{id}` | Kelola akun (hanya `super_admin`) | - |
| `/admin/users/{id}/password` | Ganti password; wajib `current_password` + `new_password` (`super_admin`; lihat catatan) | - |
| `/admin/users/{id}/reset-password` | Reset password (hanya `super_admin`) | - |

Status inbox untuk `appointments`: `pending`, `confirmed`, `cancelled`,
`no_show`. Enum `submission_status` (`new`, `in_progress`, `resolved`,
`rejected`) dan `admission_status` (`pending`, `confirmed`, `cancelled`) ada di
skema; pemetaan tepatnya per jenis inbox ada di `src/server/admin/inbox.ts`.

Aturan penjaga akun (menolak `400`): tidak bisa mengubah peran/status aktif akun
sendiri, tidak bisa menurunkan `super_admin` aktif terakhir, tidak bisa
menghapus akun yang sedang dipakai. Rincian di `SECURITY.md`.

Tabel yang bisa dikelola lewat `/admin/records/{table}` (17):
`services`, `articles`, `pages`, `mcu_packages`, `specialties`, `polyclinics`,
`doctors`, `doctor_schedules`, `hero_slides`, `awards`, `gallery_items`,
`testimonials`, `insurance_partners`, `faqs`, `documents`, `management_members`,
`job_vacancies`. Tabel `users` dikelola lewat `/admin/users`.

> **Catatan penjaga peran (temuan, bukan keputusan):** `POST
> /admin/users/{id}/password` dan seluruh `/admin/users*` memakai `canManageUsers`,
> sehingga hanya `super_admin` yang bisa memanggilnya. Komentar di route
> password menyebut "saat admin mengubah akunnya sendiri", tetapi `editor` dan
> `front_office` ditolak 403 oleh penjaga itu. Apakah mereka memang tidak
> boleh mengganti password sendiri adalah keputusan produk yang belum
> tercatat; periksa dulu sebelum menganggapnya bug.
>
> Catatan: `/admin/records/{table}` untuk tabel yang tidak ada di daftar putih
> ditolak. Nama tabel dari URL tidak pernah dirakit langsung ke SQL.
