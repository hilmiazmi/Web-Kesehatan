// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import TextToSpeech from "@/components/ui/TextToSpeech";

describe("TextToSpeech", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  // Cleanup otomatis RTL hanya berjalan bila afterEach tersedia secara
  // global; config repo tidak menyalakannya, jadi dibersihkan manual.
  afterEach(() => {
    cleanup();
  });

  it("tidak me-render apapun jika speechSynthesis tidak didukung", () => {
    const original = window.speechSynthesis;
    // @ts-expect-error test unsupported
    delete window.speechSynthesis;

    const { container } = render(
      <TextToSpeech text="Halo dunia" title="Judul Berita" />,
    );
    expect(container.firstChild).toBeNull();

    // Pulihkan hanya bila properti itu benar-benar pernah ada. jsdom tidak
    // menyediakan speechSynthesis sama sekali, dan menugaskan undefined
    // justru menciptakan key bernilai kosong - cek in-window saat unmount
    // jadi keliru true dan efek cleanup membaca .cancel dari undefined.
    if (original !== undefined) {
      window.speechSynthesis = original;
    }
  });

  it("merender kontrol pemutar baca-nyaring saat didukung", () => {
    const mockSpeak = vi.fn();
    const mockCancel = vi.fn();
    const mockGetVoices = vi.fn().mockReturnValue([]);

    Object.defineProperty(window, "speechSynthesis", {
      writable: true,
      value: {
        speak: mockSpeak,
        cancel: mockCancel,
        pause: vi.fn(),
        resume: vi.fn(),
        getVoices: mockGetVoices,
      },
    });

    render(<TextToSpeech text="Isi berita penting" title="Judul Berita" />);

    expect(
      screen.getByRole("region", { name: "Pemutar audio baca-nyaring" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dengarkan artikel ini" })).toBeInTheDocument();
    expect(screen.getByText("Baca Nyaring")).toBeInTheDocument();
  });

  it("memanggil speechSynthesis.speak dengan bahasa id-ID saat tombol dengarkan diklik", () => {
    const capturedUtterances: SpeechSynthesisUtterance[] = [];
    const mockSpeak = vi.fn((utterance: SpeechSynthesisUtterance) => {
      capturedUtterances.push(utterance);
    });
    const mockCancel = vi.fn();
    const mockGetVoices = vi.fn().mockReturnValue([]);

    // Konstruktor SpeechSynthesisUtterance tidak disediakan jsdom 30.
    // Stubkan versi minimal supaya handlePlay bisa membuat objek utterance
    // sebelum mengirimnya ke speak; tanpa ini new ... melempar TypeError
    // "undefined is not a constructor" dan speak tak pernah dipanggil.
    class MockUtterance {
      text: string;
      lang = "";
      rate = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onpause: (() => void) | null = null;
      onresume: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      writable: true,
      configurable: true,
      value: MockUtterance,
    });

    Object.defineProperty(window, "speechSynthesis", {
      writable: true,
      value: {
        speak: mockSpeak,
        cancel: mockCancel,
        pause: vi.fn(),
        resume: vi.fn(),
        getVoices: mockGetVoices,
      },
    });

    render(<TextToSpeech text="Isi artikel kesehatan" title="Pola Hidup Sehat" />);

    const tombol = screen.getByRole("button", { name: "Dengarkan artikel ini" });
    fireEvent.click(tombol);

    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(capturedUtterances).toHaveLength(1);
    expect(capturedUtterances[0].lang).toBe("id-ID");
    expect(capturedUtterances[0].text).toContain("Pola Hidup Sehat");
    expect(capturedUtterances[0].text).toContain("Isi artikel kesehatan");
  });
});
