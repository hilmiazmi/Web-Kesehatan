#!/usr/bin/env python3
"""
Hasilkan tabel endpoint untuk docs/API.md dari berkas route.ts.

Yang dibaca dari kode (bukan ditulis tangan):
  - path, dari lokasi berkas di src/app/api/v1/
  - metode HTTP yang diekspor (GET, POST, PATCH, PUT, DELETE)
  - penjaga akses PER METODE: requireSession() polos, atau dengan
    canEditContent / canManageUsers sebagai argumen
  - pembatas permintaan: limitRequest atau jalankanForm
  - sumber data baca: denganSnapshot (mengenal mode snapshot)

Yang TIDAK bisa disimpulkan dari kode dan tetap ditulis tangan di API.md:
isi body, contoh respons, dan alasan di balik aturan.

Pemakaian (dari root repo):

    python3 scripts/gen-api-doc.py            # cetak tabel ke layar
    python3 scripts/gen-api-doc.py --tulis    # ganti blok antara penanda di docs/API.md

Penanda di API.md:  <!-- BEGIN:endpoint-otomatis -->  ...  <!-- END:endpoint-otomatis -->
"""
from __future__ import annotations

import glob
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API_DIR = ROOT / "src" / "app" / "api" / "v1"
BEGIN = "<!-- BEGIN:endpoint-otomatis -->"
END = "<!-- END:endpoint-otomatis -->"


METODE_URUT = ["GET", "POST", "PUT", "PATCH", "DELETE"]
POLA_EKSPOR = re.compile(
    r"export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b"
)


def akses_blok(blok: str) -> str:
    """Penjaga akses satu fungsi metode, dibaca dari argumen requireSession."""
    m = re.search(r"requireSession\(\s*(\w*)\s*\)", blok)
    if not m:
        return "publik"
    arg = m.group(1)
    if arg == "canManageUsers":
        return "super_admin"
    if arg == "canEditContent":
        return "editor+"
    return "sesi"


def baca(berkas: str) -> tuple[str, list[str], list[str]]:
    teks = Path(berkas).read_text(encoding="utf-8")
    rel = berkas[len(str(API_DIR)):].replace("\\", "/")
    path = "/api/v1" + rel[: -len("/route.ts")]
    path = path.replace("/[...path]", "/*")

    # Potong berkas per fungsi metode supaya penjaga dibaca per metode.
    cocok = list(POLA_EKSPOR.finditer(teks))
    per_metode: dict[str, str] = {}
    for i, m in enumerate(cocok):
        selesai = cocok[i + 1].start() if i + 1 < len(cocok) else len(teks)
        per_metode[m.group(1)] = akses_blok(teks[m.start():selesai])
    metode = sorted(per_metode, key=METODE_URUT.index)

    nilai = set(per_metode.values())
    if len(nilai) <= 1:
        penjaga = [nilai.pop()] if nilai else ["publik"]
    else:
        penjaga = [f"{m}: {per_metode[m]}" for m in metode]

    catatan: list[str] = []
    if "jalankanForm" in teks and "/auth/" not in path:
        catatan.append("form: rate limit + honeypot + tulis DB")
    if "limitRequest" in teks and "jalankanForm" not in teks:
        catatan.append("rate limit")
    if "denganSnapshot" in teks:
        catatan.append("baca DB atau snapshot")
    return path, metode, penjaga, catatan


def tabel() -> str:
    baris = []
    for berkas in sorted(glob.glob(str(API_DIR / "**" / "route.ts"), recursive=True)):
        path, metode, penjaga, catatan = baca(berkas)
        baris.append(
            f"| `{path}` | {', '.join(metode) or '-'} | {', '.join(penjaga)} | {'; '.join(catatan) or '-'} |"
        )
    kepala = [
        "| Path | Metode | Akses | Catatan |",
        "| --- | --- | --- | --- |",
    ]
    return "\n".join(kepala + baris) + f"\n\nJumlah berkas `route.ts`: {len(baris)}."


def main() -> int:
    hasil = tabel()
    if "--tulis" not in sys.argv:
        print(hasil)
        return 0

    sasaran = ROOT / "docs" / "API.md"
    isi = sasaran.read_text(encoding="utf-8")
    if BEGIN not in isi or END not in isi:
        print("Penanda tidak ditemukan di docs/API.md", file=sys.stderr)
        return 1
    awal = isi.index(BEGIN) + len(BEGIN)
    akhir = isi.index(END)
    sasaran.write_text(isi[:awal] + "\n" + hasil + "\n" + isi[akhir:], encoding="utf-8")
    print(f"docs/API.md diperbarui ({hasil.splitlines()[-1]})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
