// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { formatIDR } from "@/lib/format";
import { DetailBody } from "@/components/pelayanan/DetailLayout";
import { ClinicDetailBody } from "@/components/pelayanan/ClinicDetailBody";
import { McuPackageDetail } from "@/components/pelayanan/McuPackageDetail";

/**
 * Foto halaman detail lewat next/image, yang butuh mesin ukur gambar yang
 * tidak ada di jsdom; ditukar dengan img polos supaya render cukup berjalan.
 */
vi.mock("next/image", async () => {
  const { createElement } = await import("react");
  return {
    default: (props: { src: string; alt?: string }) =>
      createElement("img", { src: props.src, alt: props.alt ?? "" }),
  };
});

// Formulir MCU memakai state dan fetch; yang diuji urutan teks
// baca-nyaringnya, bukan formulirnya.
vi.mock("@/components/forms/mcu-form", () => ({ default: () => null }));

/**
 * Pasang tiruan Web Speech di window sebelum render. jsdom tidak menyediakan
 * SpeechSynthesisUtterance; pola stubnya sama dengan text-to-speech.test.tsx.
 * Hasilnya: daftar utterance yang dibawa ke speak().
 */
function pasangSynthesis(): SpeechSynthesisUtterance[] {
  const tangkap: SpeechSynthesisUtterance[] = [];
  class UtteranceTiruan {
    text: string;
    lang = "";
    rate = 1;
    voice: SpeechSynthesisVoice | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onpause: (() => void) | null = null;
    onresume: (() => void) | null = null;
    onmark: SpeechSynthesisUtterance["onmark"] | null = null;
    onstart: (() => void) | null = null;
    onboundary: SpeechSynthesisUtterance["onboundary"] | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }

  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    writable: true,
    configurable: true,
    value: UtteranceTiruan,
  });
  Object.defineProperty(window, "speechSynthesis", {
    writable: true,
    configurable: true,
    value: {
      speak: vi.fn((u: SpeechSynthesisUtterance) => tangkap.push(u)),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
    },
  });
  return tangkap;
}

function tekanDengarkan() {
  fireEvent.click(screen.getByRole("button", { name: "Dengarkan artikel ini" }));
}

describe("teks baca-nyaring halaman detail", () => {
  afterEach(() => {
    cleanup();
  });

  it("DetailBody membacakan deskripsi, penutup, judul bagian, dan butirnya", () => {
    const tangkap = pasangSynthesis();
    render(
      <DetailBody
        title="Instalasi Gawat Darurat"
        description="Layanan gawat darurat dua puluh empat jam."
        introTail="Kalimat penutup halaman detail."
        points={["Bed gawat darurat", "Antrean ambulans"]}
        photoSrc="/img/igd.jpg"
        photoAlt="Igd"
      />,
    );
    tekanDengarkan();
    expect(tangkap).toHaveLength(1);
    expect(tangkap[0].text).toBe(
      [
        "Instalasi Gawat Darurat. Layanan gawat darurat dua puluh empat jam.",
        "Kalimat penutup halaman detail.",
        "Layanan",
        "Bed gawat darurat",
        "Antrean ambulans",
      ].join("\n"),
    );
  });

  it("ClinicDetailBody membacakan deskripsi, layanan, dan jam tanpa daftar dokter", () => {
    const tangkap = pasangSynthesis();
    render(
      <ClinicDetailBody
        detail={{
          slug: "gizi-klinik",
          name: "GIZI KLINIK",
          description: "Konseling pola makan untuk pasien rawat jalan.",
          services: ["Konseling Pola Makan", "Evaluasi Gizi"],
          hours: "Senin sampai Jumat, 07.30 sampai 14.00.",
          clinicSlug: "gizi-klinik",
          clinicName: "GIZI KLINIK",
        }}
      />,
    );
    tekanDengarkan();
    expect(tangkap).toHaveLength(1);
    expect(tangkap[0].text).toBe(
      [
        "GIZI KLINIK. Konseling pola makan untuk pasien rawat jalan.",
        "Layanan",
        "Konseling Pola Makan",
        "Evaluasi Gizi",
        "Senin sampai Jumat, 07.30 sampai 14.00.",
      ].join("\n"),
    );
  });

  it("McuPackageDetail membacakan harga, pengantar, rincian, dan syarat", () => {
    const tangkap = pasangSynthesis();
    render(
      <McuPackageDetail
        pkg={{
          slug: "paket-a",
          title: "Paket A",
          price: 250000,
          items: ["Pemeriksaan darah lengkap", "Pemeriksaan urin"],
        }}
        index={0}
        siblings={[
          { slug: "paket-a", title: "Paket A", price: 250000, items: [] },
        ]}
        basePath="/pelayanan/mcu/reguler"
        photos={["/img/mcu.jpg"]}
      />,
    );
    tekanDengarkan();
    expect(tangkap).toHaveLength(1);
    // formatIDR dipanggil ulang di ekspektasi supaya pemisah ribuannya
    // tetap sama; urutan dan kelengkapan fragmen yang dikunci, bukan
    // output Intl.
    expect(tangkap[0].text).toBe(
      [
        `Paket A. ${formatIDR(250000)}`,
        "Paket medical check up untuk membantu Anda mengenali kondisi kesehatan sejak dini.",
        "Rincian Pemeriksaan",
        "Pemeriksaan darah lengkap",
        "Pemeriksaan urin",
        "Syarat dan Ketentuan",
        "Pesanan minimal 2 hari sebelum pemeriksaan.",
        "Puasa 8 sampai 10 jam sebelum pemeriksaan.",
        "Bawa surat rujukan bila memakai BPJS Kesehatan.",
        "Hasil pemeriksaan berlaku selama 30 hari.",
      ].join("\n"),
    );
  });
});
