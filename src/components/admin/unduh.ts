/**
 * Unduh berkas CSV dari peramban.
 *
 * Dipisah dari komponen supaya inbox dan records memakai satu cara yang sama,
 * dan supaya bagian yang bisa diuji (`keCsv`) tetap murni di `src/lib/csv.ts`.
 *
 * Berkas ini sengaja tidak punya tes: yang dikerjakan di sini adalah membuat
 * `Blob` dan mengklik tautan, dan itu tidak bisa diperiksa tanpa DOM. Apa yang
 * penting justru sudah dikunci tes: isi berkasnya.
 */
import { namaBerkasCsv } from "@/lib/csv";

export function unduhCsv(awalanNama: string, isi: string): void {
  const berkas = new Blob([isi], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(berkas);

  const tautan = document.createElement("a");
  tautan.href = url;
  tautan.download = namaBerkasCsv(awalanNama);

  // Tautan harus berada di dokumen supaya bisa diklik di semua peramban;
  // setelah diklik langsung dilepas lagi.
  document.body.appendChild(tautan);
  tautan.click();
  tautan.remove();

  URL.revokeObjectURL(url);
}
