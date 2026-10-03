"""Tulis route handler publik untuk backend Bun.

Semua logika ada di `src/server/db/repo` dan `src/server/api`, sehingga file
yang dihasilkan hanya menyusun parameter dan mengembalikan respons.

Jalankan ulang setiap kali bentuk respons berubah, lalu periksa hasilnya dengan
`git diff`. Hasil generate yang berbeda dari yang di-commit berarti ada yang
lupa ditulis ulang.
"""

import io
import os

AKAR = 'src/app/api/v1'


def tulis(path: str, isi: str):
    penuh = os.path.join(AKAR, path)
    os.makedirs(os.path.dirname(penuh), exist_ok=True)
    with io.open(penuh, 'w', encoding='utf-8') as f:
        f.write(isi)


# --------------------------------------------------------------- sederhana
# Rute tanpa segmen dinamis: kunci snapshot-nya tetap.

def statis(path: str, impor_repo: str, panggil: str, kunci: str, doc: str = ''):
    tulis(path, f'''{doc}import {{ NextResponse }} from "next/server";
import {{ handle, ok }} from "@/server/api/respond";
import {{ denganSnapshot }} from "@/server/api/snapshot";
{impor_repo}

export const dynamic = "force-dynamic";

export function GET(): Promise<NextResponse> {{
  return handle(async () => ok(await denganSnapshot({panggil}, "{kunci}")));
}}
''')


def dengan_params(path: str, impor_repo: str, badan: str, kunci: str, doc: str = ''):
    tulis(path, f'''{doc}import type {{ NextRequest }} from "next/server";
import {{ NextResponse }} from "next/server";
import {{ handle, ok }} from "@/server/api/respond";
import {{ denganSnapshot }} from "@/server/api/snapshot";
{impor_repo}

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<NextResponse> {{
  return handle(async () => {{
{badan}  }});
}}
''')


# ------------------------------------------------------------------ katalog

statis(
    'home/route.ts',
    'import { loadHome } from "@/server/db/repo/content";',
    '(db) => loadHome(db)',
    '/home',
)

statis(
    'specialties/route.ts',
    'import { listSpecialties } from "@/server/db/repo/content";',
    '(db) => listSpecialties(db)',
    '/specialties',
)

statis(
    'polyclinics/route.ts',
    'import { listPolyclinics } from "@/server/db/repo/content";',
    '(db) => listPolyclinics(db)',
    '/polyclinics',
)

statis(
    'beds/route.ts',
    'import { loadBeds } from "@/server/db/repo/beds";',
    '(db) => loadBeds(db)',
    '/beds',
)

statis(
    'jobs/route.ts',
    'import { listJobs } from "@/server/db/repo/content";',
    '(db) => listJobs(db)',
    '/jobs',
)

statis(
    'settings/public/route.ts',
    'import { loadSettings } from "@/server/db/repo/content";',
    '(db) => loadSettings(db)',
    '/settings/public',
)

dengan_params(
    'doctors/route.ts',
    'import { teks } from "@/server/api/params";\n'
    'import { listDoctors } from "@/server/db/repo/content";',
    '''    const spesialis = teks(request.nextUrl.searchParams, "specialty");

    return ok(
      await denganSnapshot(
        (db) => listDoctors(db, { specialty: spesialis }),
        "/doctors",
      ),
    );''',
    'doctors',
)

dengan_params(
    'services/route.ts',
    'import { teks } from "@/server/api/params";\n'
    'import { listServices } from "@/server/db/repo/content";',
    '''    const params = request.nextUrl.searchParams;
    const jenis = teks(params, "type");
    const section = teks(params, "section");

    return ok(
      await denganSnapshot(
        (db) => listServices(db, { type: jenis, section }),
        "/services",
      ),
    );''',
    'services',
)

dengan_params(
    'mcu/packages/route.ts',
    'import { teks } from "@/server/api/params";\n'
    'import { listMcuPackages } from "@/server/db/repo/content";',
    '''    const kategori = teks(request.nextUrl.searchParams, "category");

    return ok(
      await denganSnapshot((db) => listMcuPackages(db, kategori), "/mcu/packages"),
    );
''',
    'mcu__packages',
)

dengan_params(
    'documents/route.ts',
    'import { teks } from "@/server/api/params";\n'
    'import { listDocuments } from "@/server/db/repo/content";',
    '''    const kategori = teks(request.nextUrl.searchParams, "category");

    return ok(
      await denganSnapshot((db) => listDocuments(db, kategori), "/documents"),
    );''',
    'documents',
)


def artikel(path: str):
    """Daftar berita, dengan batas ukuran halaman."""
    tulis(path, '''import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { denganSnapshot } from "@/server/api/snapshot";
import { bilangan, bilanganTerbatas, teks } from "@/server/api/params";
import { listArticles } from "@/server/db/repo/content";

export const dynamic = "force-dynamic";

/**
 * Batas atas ukuran halaman berita.
 *
 * Tanpa batas, satu permintaan `?limit=100000` membuat server mengirim seluruh
 * tabel dalam satu respons dan memakai RAM yang tidak tersedia di VPS kecil ini.
 */
const UKURAN_MAKS = 24;

export function GET(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const halaman = Math.max(1, bilangan(params, "page", 1));
    const ukuran = bilanganTerbatas(params, "limit", 9, 1, UKURAN_MAKS);
    const kategori = teks(params, "category");

    const hasil = await denganSnapshot(
      (db) =>
        listArticles(db, {
          limit: ukuran,
          offset: (halaman - 1) * ukuran,
          category: kategori,
        }),
      "/articles",
    );

    const total = hasil.total;
    return ok({
      items: hasil.items,
      total,
      page: halaman,
      page_size: ukuran,
      pages: ukuran > 0 ? Math.ceil(total / ukuran) : 0,
    });
  });
}
''')


artikel('articles/route.ts')


# ------------------------------------------------------------------ dinamis
# Nama berkas dihitung `snapshotKey()` dari path API yang ditulis di sini, jadi
# path itu harus sama persis dengan yang dipakai `scripts/db-snapshot.ts` saat
# menulis manifest.

def detail(path: str, segmen: str, rute: str, panggil: str, tidak_ada: str, impor: str):
    tulis(path, f'''import type {{ NextRequest }} from "next/server";
import {{ NextResponse }} from "next/server";
import {{ handle, ok }} from "@/server/api/respond";
import {{ ApiError }} from "@/server/api/error";
import {{ denganSnapshot }} from "@/server/api/snapshot";
{impor}

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: {{ params: Promise<{{ {segmen}: string }}> }},
): Promise<NextResponse> {{
  return handle(async () => {{
    const {{ {segmen} }} = await context.params;
    const baris = await denganSnapshot((db) => {panggil}, `{rute}`);

    if (baris === null) throw ApiError.notFound("{tidak_ada}");
    return ok(baris);
  }});
}}
''')


detail(
    'services/[slug]/route.ts', 'slug', '/services/${slug}', 'findService(db, slug)', 'layanan',
    'import { findService } from "@/server/db/repo/content";',
)
detail(
    'mcu/packages/[slug]/route.ts', 'slug', '/mcu/packages/${slug}', 'findMcuPackage(db, slug)', 'paket MCU',
    'import { findMcuPackage } from "@/server/db/repo/content";',
)
detail(
    'articles/[slug]/route.ts', 'slug', '/articles/${slug}', 'findArticle(db, slug)', 'berita',
    'import { findArticle } from "@/server/db/repo/content";',
)
detail(
    'pages/[slug]/route.ts', 'slug', '/pages/${slug}', 'findPage(db, slug)', 'halaman',
    'import { findPage } from "@/server/db/repo/content";',
)
detail(
    'jobs/[slug]/route.ts', 'slug', '/jobs/${slug}', 'findJob(db, slug)', 'lowongan',
    'import { findJob } from "@/server/db/repo/content";',
)

# Jadwal satu dokter.
tulis('doctors/[id]/schedules/route.ts', '''import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { uuid } from "@/server/api/params";
import { denganSnapshot } from "@/server/api/snapshot";
import { listSchedules } from "@/server/db/repo/content";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  return handle(async () => {
    const { id } = await context.params;
    const dokter = uuid(id, "doctor");

    // Dokter yang tidak ada dan dokter tanpa jadwal sama-sama menghasilkan
    // daftar kosong di sini. Keduanya dibedakan di `GET /doctors`, yang
    // menjawab 404 kalau dokter-nya memang tidak ada.
    return ok(
      await denganSnapshot(
        (db) => listSchedules(db, { doctorId: dokter }),
        `/doctors/${dokter}/schedules`,
      ),
    );
  });
}
''')

print('selesai')