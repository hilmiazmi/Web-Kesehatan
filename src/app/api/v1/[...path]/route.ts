import { NextResponse } from "next/server";

/**
 * Bentuk 404 untuk endpoint yang tidak dikenal.
 *
 * Route handler di bawah `/api/v1` yang tidak dikenali akan sampai ke sini.
 * Tanpa file ini, Next.js menjawab 404 dengan halaman HTML, sehingga klien
 * yang baca JSON akan gagal dengan `Unexpected token <` alih-alih membaca
 * `error.code`.
 *
 * Berkas ini juga menjadi penjaga: setiap endpoint yang tidak sengaja dihapus
 * akan kelihatan sebagai 404 berbentuk JSON, bukan sebagai galat kompilasi
 * atau proxy yang meneruskan ke mana saja.
 */

type Konteks = { params: Promise<{ path?: string[] }> };

async function balas(): Promise<NextResponse> {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message: "Endpoint tidak ditemukan." } },
    { status: 404 },
  );
}

export async function GET(_request: Request, _context: Konteks): Promise<NextResponse> {
  return balas();
}
export async function POST(_request: Request, _context: Konteks): Promise<NextResponse> {
  return balas();
}
export async function PUT(_request: Request, _context: Konteks): Promise<NextResponse> {
  return balas();
}
export async function PATCH(_request: Request, _context: Konteks): Promise<NextResponse> {
  return balas();
}
export async function DELETE(_request: Request, _context: Konteks): Promise<NextResponse> {
  return balas();
}
export async function OPTIONS(_request: Request, _context: Konteks): Promise<NextResponse> {
  return balas();
}