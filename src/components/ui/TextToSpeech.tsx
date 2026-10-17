"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type SpeechState = "idle" | "playing" | "paused";

interface TextToSpeechProps {
  /** Teks utama yang akan dibacakan (misal ringkasan atau isi artikel). */
  text: string;
  /** Judul opsional yang dibacakan sebelum teks utama. */
  title?: string;
  className?: string;
}

const emptySubscribe = () => () => {};

/**
 * Komponen Aksesibilitas Baca-Nyaring (Text-to-Speech).
 *
 * Menggunakan Web Speech API bawaan peramban (`window.speechSynthesis`) tanpa
 * dependensi pustaka pihak ketiga eksternal, sehingga ringan, cepat, dan
 * menjaga privasi pengunjung.
 *
 * Mendukung pembacaan dalam bahasa Indonesia (`id-ID`), tombol Putar, Jeda,
 * dan Berhenti, serta ramah pembaca layar (menggunakan ARIA live region).
 */
export default function TextToSpeech({
  text,
  title,
  className = "",
}: TextToSpeechProps) {
  const isSupported = useSyncExternalStore(
    emptySubscribe,
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false,
  );

  const [state, setState] = useState<SpeechState>("idle");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isSupported) return null;

  const handlePlay = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (state === "paused") {
      window.speechSynthesis.resume();
      setState("playing");
      return;
    }

    window.speechSynthesis.cancel();

    const konten = title ? `${title}. ${text}` : text;
    const utterance = new SpeechSynthesisUtterance(konten);
    utterance.lang = "id-ID";
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(
      (v) => v.lang === "id-ID" || v.lang.startsWith("id"),
    );
    if (idVoice) utterance.voice = idVoice;

    utterance.onend = () => setState("idle");
    utterance.onerror = () => setState("idle");
    utterance.onpause = () => setState("paused");
    utterance.onresume = () => setState("playing");

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setState("playing");
  };

  const handlePause = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    setState("paused");
  };

  const handleStop = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setState("idle");
  };

  return (
    <div
      className={`tts-player d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill my-3 ${className}`.trim()}
      role="region"
      aria-label="Pemutar audio baca-nyaring"
    >
      <span
        className="tts-icon d-flex align-items-center text-primary"
        aria-hidden="true"
      >
        <i
          className={`bi ${state === "playing" ? "bi-volume-up-fill" : "bi-volume-up"} fs-5`}
        />
      </span>

      <span className="tts-label small fw-semibold text-secondary">
        {state === "playing"
          ? "Sedang dibacakan"
          : state === "paused"
            ? "Dijeda"
            : "Baca Nyaring"}
      </span>

      <div className="d-flex align-items-center gap-1">
        {state === "idle" ? (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 d-flex align-items-center gap-1"
            onClick={handlePlay}
            aria-label="Dengarkan artikel ini"
          >
            <i className="bi bi-play-fill" aria-hidden="true" />
            <span className="small">Dengarkan</span>
          </button>
        ) : (
          <>
            {state === "playing" ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-pill px-2 py-1"
                onClick={handlePause}
                aria-label="Jeda baca nyaring"
                title="Jeda"
              >
                <i className="bi bi-pause-fill" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary rounded-pill px-2 py-1"
                onClick={handlePlay}
                aria-label="Lanjutkan baca nyaring"
                title="Lanjutkan"
              >
                <i className="bi bi-play-fill" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              className="btn btn-sm btn-outline-danger rounded-pill px-2 py-1"
              onClick={handleStop}
              aria-label="Hentikan baca nyaring"
              title="Berhenti"
            >
              <i className="bi bi-stop-fill" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <span className="visually-hidden" aria-live="polite">
        {state === "playing"
          ? "Fitur baca nyaring aktif membacakan isi artikel."
          : state === "paused"
            ? "Pembacaan artikel dijeda."
            : "Pembacaan artikel berhenti."}
      </span>
    </div>
  );
}
