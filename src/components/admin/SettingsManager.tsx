"use client";

import { useEffect, useState } from "react";
import type { ApiFailure, HasilSimpan } from "@/components/admin/types";
import type { SettingBundle, SocialLink } from "@/server/db/repo/content";

/**
 * Ubah pengaturan umum situs: nama, kontak, jam layanan, dan catatan kaki.
 *
 * Bentuk layar ini tidak memakai `FormBaris` seperti `RecordManager`, karena
 * pengaturan situs bukan baris tabel. Setiap field punya label dan tata letak
 * sendiri, dan tiga di antaranya punya aturan yang tidak bisa dijawab dari
 * skema kolom: nama tidak boleh kosong, surel harus berbentuk surel, dan
 * tautan peta harus berupa alamat web.
 *
 * Perhatikan bahwa `PUT /api/v1/admin/settings` tidak memvalidasi per field.
 * Server hanya menyalin key yang dikenal dan melempar 400 kalau tidak ada satu
 * pun key yang cocok. Jadi semua aturan di bawah ini **wajib** ada di sisi
 * klien: kalau tidak, satu Savesalah akan tersimpan tanpa complaint apa pun.
 */

/** Field teks biasa. Semua punya label dan petunjuk singkat. */
const TEKS: readonly {
  key: Exclude<keyof SettingBundle, "social_links">;
  label: string;
  petunjuk: string;
  wajib: boolean;
  panjang: number;
  multibaris: boolean;
}[] = [
  {
    key: "hospital_name",
    label: "Nama rumah sakit",
    petunjuk: "Muncul di header, footer, dan judul halaman.",
    wajib: true,
    panjang: 120,
    multibaris: false,
  },
  {
    key: "tagline",
    label: "Tagline",
    petunjuk: "Kalimat pendek di bawah nama.",
    wajib: true,
    panjang: 160,
    multibaris: false,
  },
  {
    key: "hospital_type",
    label: "Jenis rumah sakit",
    petunjuk: "Misalnya Rumah Sakit Umum Daerah Tipe B.",
    wajib: true,
    panjang: 120,
    multibaris: false,
  },
  {
    key: "address",
    label: "Alamat",
    petunjuk: "Alamat lengkap, satu atau dua baris.",
    wajib: true,
    panjang: 240,
    multibaris: true,
  },
  {
    key: "phone",
    label: "Telepon",
    petunjuk: "Nomor yang bisa dihubungi.",
    wajib: true,
    panjang: 40,
    multibaris: false,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    petunjuk: "Format internasional tanpa tanda hubung, diawali plus.",
    wajib: true,
    panjang: 40,
    multibaris: false,
  },
  {
    key: "email",
    label: "Email",
    petunjuk: "Alamat email yang bisa dihubungi.",
    wajib: true,
    panjang: 120,
    multibaris: false,
  },
  {
    key: "outpatient_hours",
    label: "Jam layanan jalan",
    petunjuk: "Contoh: Senin sampai Jumat, 07.30 sampai 14.00.",
    wajib: true,
    panjang: 160,
    multibaris: false,
  },
  {
    key: "emergency_note",
    label: "Keterangan gawat darurat",
    petunjuk: "Teks pendek di blok layanan 24 jam.",
    wajib: true,
    panjang: 160,
    multibaris: false,
  },
  {
    key: "footer_note",
    label: "Catatan kaki halaman",
    petunjuk: "Penanda bahwa situs ini demo.",
    wajib: true,
    panjang: 240,
    multibaris: true,
  },
];

/** Field yang boleh kosong, tapi kalau diisi harus berbentuk alamat web. */
const OPSIONAL: readonly { key: "map_embed_url"; label: string; petunjuk: string }[] = [
  {
    key: "map_embed_url",
    label: "Alamat tautan peta",
    petunjuk: "Kosongkan kalau belum ada. Harus diawali http:// atau https://.",
  },
];

/**
 * Periksa satu nilai sebelum dikirim.
 *
 * Mengembalikan pesan galat, atau string kosong kalau nilainya benar. Fungsi
 * ini sengaja murni dan diekspor supaya aturannya bisa diuji tanpa merender
 * komponen: validasi yang hanya bisa dibuktikan lewat klik di peramban akan
 * mudah bocor.
 */
export function validasi(
  key: string,
  nilai: string,
): string {
  const trim = nilai.trim();

  if (trim === "") {
    return "Wajib diisi. Nilai kosong akan kembali ke bawaan di server.";
  }

  if (key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trim)) {
    return "Bentuknya bukan surel. Contoh: info@contoh-sehat.test";
  }

  if (key === "map_embed_url" && !/^https?:\/\/\S+$/.test(trim)) {
    return "Harus diawali http:// atau https://, tanpa spasi.";
  }

  return "";
}

/** Validasi seluruh isian, dikembalikan sebagai peta key ke pesan. */
export function validasiSemua(nilai: Record<string, string>): Record<string, string> {
  const galat: Record<string, string> = {};
  for (const f of TEKS) {
    const pesan = validasi(f.key, nilai[f.key] ?? "");
    if (pesan !== "") galat[f.key] = pesan;
  }
  return galat;
}

/**
 * Buang tautan sosial yang URL-nya kosong.
 *
 * Server sudah melakukan hal yang sama saat membaca: entri tanpa `url` dibuang
 * oleh `flatMap`. Disaring di sini supaya baris yang memang dibuang tidak
 * pernah dikirim dan tidak dihitung sebagai "tidak bisa disimpan".
 */
export function buangTanpaUrl(links: readonly SocialLink[]): SocialLink[] {
  return links.filter((l) => l.url.trim() !== "");
}

/** Baca pengaturan saat ini dari server. */
async function ambilPengaturan(): Promise<SettingBundle> {
  const res = await fetch("/api/v1/admin/settings", {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as ApiFailure & {
    data?: Partial<SettingBundle>;
  };
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Pengaturan gagal dimuat.");
  }

  // Field yang belum ada dijawab dengan string kosong, bukan `undefined`.
  // `undefined` di `<input value>` membuat React memperingatkan controlled
  // input, dan Kotak kosong lebih mudah ditangani daripada nilai yang hilang.
  const hasil = { ...(body.data as SettingBundle) };
  for (const f of [...TEKS, ...OPSIONAL]) {
    if (typeof hasil[f.key] !== "string") {
      (hasil as Record<string, unknown>)[f.key] = "";
    }
  }
  if (!Array.isArray(hasil.social_links)) hasil.social_links = [];

  return hasil;
}

export default function SettingsManager() {
  const [nilai, setNilai] = useState<Record<string, string>>({});
  const [sosial, setSosial] = useState<SocialLink[]>([]);
  const [galat, setGalat] = useState("");
  const [pesan, setPesan] = useState("");
  const [galatField, setGalatField] = useState<Record<string, string>>({});
  const [sibuk, setSibuk] = useState(false);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    let hidup = true;

    ambilPengaturan()
      .then((data) => {
        if (!hidup) return;
        const teks: Record<string, string> = {};
        for (const f of [...TEKS, ...OPSIONAL]) {
          const v = data[f.key];
          teks[f.key] = v === null || v === undefined ? "" : String(v);
        }
        setNilai(teks);
        setSosial(data.social_links);
        setSiap(true);
      })
      .catch((err: unknown) => {
        if (!hidup) return;
        setGalat(err instanceof Error ? err.message : "Pengaturan gagal dimuat.");
        setSiap(true);
      });

    return () => {
      hidup = false;
    };
  }, []);

  /** Kirim seluruh pengaturan. */
  async function simpan(): Promise<HasilSimpan> {
    const galatBaru = validasiSemua(nilai);
    setGalatField(galatBaru);
    if (Object.keys(galatBaru).length > 0) {
      return { ok: false, pesan: "Ada isian yang belum benar. Periksa yang ditandai." };
    }

    const bersih = buangTanpaUrl(sosial);

    const body: Record<string, unknown> = { social_links: bersih };
    for (const f of TEKS) body[f.key] = nilai[f.key].trim();
    // `map_embed_url` boleh kosong, jadi tidak ikut aturan wajib di atas.
    const peta = nilai.map_embed_url?.trim() ?? "";
    body.map_embed_url = peta === "" ? null : peta;

    const res = await fetch("/api/v1/admin/settings", {
      method: "PUT",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });

    const bal = (await res.json().catch(() => ({}))) as ApiFailure & {
      data?: Partial<SettingBundle>;
    };
    if (!res.ok || !bal.data) {
      return { ok: false, pesan: bal.error?.message ?? "Pengaturan gagal disimpan." };
    }

    // Server membalas bundel yang sudah tersimpan, jadi tampilkan yang
    // kembali dari server, bukan yang dikirim klien. Kalau server menormalisasi
    // sesuatu, alasannya ada di tempat yang salah, bukan di layar.
    const data = bal.data as SettingBundle;
    const teks: Record<string, string> = {};
    for (const f of [...TEKS, ...OPSIONAL]) {
      const v = data[f.key];
      teks[f.key] = v === null || v === undefined ? "" : String(v);
    }
    setNilai(teks);
    setSosial(Array.isArray(data.social_links) ? data.social_links : []);

    return { ok: true, pesan: "Pengaturan tersimpan." };
  }

  async function kirim(): Promise<void> {
    setSibuk(true);
    setGalat("");
    setPesan("");
    try {
      const hasil = await simpan();
      if (hasil.ok) setPesan(hasil.pesan);
      else setGalat(hasil.pesan);
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setSibuk(false);
    }
  }

  function ubah(key: string, v: string): void {
    setNilai((sebelumnya) => ({ ...sebelumnya, [key]: v }));
  }

  if (!siap) {
    return (
      <div className="admin-table-wrap">
        <table className="table admin-table">
          <tbody>
            <tr>
              <td className="admin-empty">Memuat pengaturan...</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      {galat !== "" ? (
        <div className="admin-alert admin-alert-gagal mb-3" role="alert">
          {galat}
        </div>
      ) : null}
      {pesan !== "" ? (
        <div className="admin-alert admin-alert-sukses mb-3" role="status">
          {pesan}
        </div>
      ) : null}

      <form
        className="admin-panel admin-form"
        onSubmit={(e) => {
          e.preventDefault();
          void kirim();
        }}
      >
        <div className="admin-form-grid">
          {TEKS.map((f) =>
            f.multibaris ? (
              <Area
                key={f.key}
                id={f.key}
                label={f.label}
                petunjuk={f.petunjuk}
                galat={galatField[f.key]}
                nilai={nilai[f.key] ?? ""}
                panjang={f.panjang}
                sibuk={sibuk}
                onUbah={(v) => ubah(f.key, v)}
              />
            ) : (
              <Kolom
                key={f.key}
                id={f.key}
                label={f.label}
                petunjuk={f.petunjuk}
                galat={galatField[f.key]}
                wajib={f.wajib}
              >
                <input
                  className="form-control"
                  id={f.key}
                  name={f.key}
                  type="text"
                  maxLength={f.panjang}
                  value={nilai[f.key] ?? ""}
                  disabled={sibuk}
                  onChange={(e) => ubah(f.key, e.target.value)}
                />
              </Kolom>
            ),
          )}

          {OPSIONAL.map((f) => (
            <Kolom
              key={f.key}
              id={f.key}
              label={f.label}
              petunjuk={f.petunjuk}
              galat={galatField[f.key]}
              wajib={false}
              lebar
            >
              <input
                className="form-control"
                id={f.key}
                name={f.key}
                type="url"
                value={nilai[f.key] ?? ""}
                disabled={sibuk}
                onChange={(e) => ubah(f.key, e.target.value)}
              />
            </Kolom>
          ))}
        </div>

        <h2 className="mt-4">Tautan media sosial</h2>
        <p className="halaman-keterangan">
          Baris yang alamatnya kosong dibuang saat disimpan. Isi alamatnya kalau
          tautan itu benar-benar mau tampil di halaman publik.
        </p>

        {sosial.length === 0 ? (
          <p className="admin-empty">Belum ada tautan sosial.</p>
        ) : (
          sosial.map((s, i) => (
            <div className="admin-form-grid mb-2" key={`sosial-${i}`}>
              <Kolom id={`sosial-${i}-network`} label="Jaringan" petunjuk="Misalnya instagram." wajib={false}>
                <input
                  className="form-control"
                  type="text"
                  value={s.network}
                  disabled={sibuk}
                  onChange={(e) =>
                    setSosial((sebelumnya) =>
                      sebelumnya.map((x, j) =>
                        j === i ? { ...x, network: e.target.value } : x,
                      ),
                    )
                  }
                />
              </Kolom>
              <Kolom id={`sosial-${i}-url`} label="Alamat" petunjuk="Alamat web penuh." wajib={false}>
                <input
                  className="form-control"
                  type="url"
                  value={s.url}
                  disabled={sibuk}
                  onChange={(e) =>
                    setSosial((sebelumnya) =>
                      sebelumnya.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                    )
                  }
                />
              </Kolom>
              <div className="d-flex align-items-end">
                <button
                  className="btn btn-outline-danger btn-sm"
                  type="button"
                  disabled={sibuk}
                  onClick={() =>
                    setSosial((sebelumnya) => sebelumnya.filter((_, j) => j !== i))
                  }
                >
                  Hapus tautan
                </button>
              </div>
            </div>
          ))
        )}

        <button
          className="btn btn-outline-secondary btn-sm mb-3"
          type="button"
          disabled={sibuk}
          onClick={() =>
            setSosial((sebelumnya) => [
              ...sebelumnya,
              { network: "", url: "", label: "" },
            ])
          }
        >
          Tambah tautan
        </button>

        <button className="btn btn-primary" type="submit" disabled={sibuk}>
          {sibuk ? "Menyimpan..." : "Simpan pengaturan"}
        </button>
      </form>
    </>
  );
}

/**
 * Satu kolom form beserta label, petunjuk, dan pesan galatnya.
 *
 * `wajib` hanya controlling tanda bintang. `lebar` terpisah karena dua hal itu
 * tidak berkaitan: field wajib bisa muat di kolom sempit, dan field opsional
 * tetap boleh selebar dua kolom. Kalau keduanya digabung jadi satu prop, orang
 * yang baca nanti mengira "opsional berarti otomatis memenuhi baris".
 */
function Kolom({
  id,
  label,
  petunjuk,
  galat,
  wajib,
  lebar,
  children,
}: {
  id: string;
  label: string;
  petunjuk: string;
  galat?: string;
  wajib: boolean;
  lebar?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={lebar === true ? "admin-span-2" : ""}>
      <label htmlFor={id}>
        {label}
        {wajib ? <span className="admin-required"> *</span> : null}
      </label>
      {petunjuk !== "" ? <small className="d-block text-body-secondary mb-1">{petunjuk}</small> : null}
      {children}
      {galat !== undefined && galat !== "" ? (
        <small className="text-danger d-block mt-1">{galat}</small>
      ) : null}
    </div>
  );
}

/** Kolom textarea untuk field yang boleh beberapa baris. */
function Area({
  id,
  label,
  petunjuk,
  galat,
  nilai,
  panjang,
  sibuk,
  onUbah,
}: {
  id: string;
  label: string;
  petunjuk: string;
  galat?: string;
  nilai: string;
  panjang: number;
  sibuk: boolean;
  onUbah: (v: string) => void;
}) {
  return (
    <Kolom id={id} label={label} petunjuk={petunjuk} galat={galat} wajib>
      <textarea
        className="form-control"
        id={id}
        name={id}
        rows={3}
        maxLength={panjang}
        value={nilai}
        disabled={sibuk}
        onChange={(e) => onUbah(e.target.value)}
      />
    </Kolom>
  );
}