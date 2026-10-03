import type { CSSProperties, ReactNode } from "react";

/**
 * Avatar anime tahun 1990-an untuk kisi manajemen.
 *
 * Gambar digambar sendiri sebagai SVG di dalam komponen, bukan berkas di
 * `public/`. Alasannya dua:
 *
 * 1. `next/image` menolak SVG kecuali `dangerouslyAllowSVG` diaktifkan di
 *    `next.config`, dan mengaktifkannya melemahkan keamanan seluruh situs.
 * 2. Dengan SVG inline, semua avatar dijamin satu gaya dan tidak ada aset
 *    yang bisa hilang.
 *
 * Ciri yang ditiru dari anime 1990-an: mata besar dengan pantulan putih,
 * warna datar tanpa gradasi, dan silang rambut bersudut tajam.
 *
 * Seluruh gambar orisinal dan tidak diambil dari karya berhak cipta mana
 * pun, sesuai PRD bagian 12 dan 13.
 *
 * Bangun ulang bila perlu: python3 /tmp/opencode/gen-avatar.py
 */

/**
 * Satu elemen per varian.
 *
 * Dipilih lewat indeks, bukan digambar semua sekaligus: SVG hanya boleh punya
 * satu akar di JSX, dan menumpuk kedelapan varian membuat gambar terakhir
 * menutupi yang lain.
 */
const AVATARS: ReactNode[] = [
  <>
      <rect width="200" height="200" fill="#dce9f7"/>
      <path d="M52 200 Q56 154 84 146 L116 146 Q144 154 148 200 Z" fill="#2c4964"/>
      <path d="M84 146 L100 166 L116 146 L106 143 L100 152 L94 143 Z" fill="#ffffff"/>
      <rect x="90" y="120" width="20" height="28" fill="#f6d3b4"/>
      <ellipse cx="58" cy="100" rx="7" ry="10" fill="#f6d3b4"/>
      <ellipse cx="142" cy="100" rx="7" ry="10" fill="#f6d3b4"/>
      <path d="M52 94 Q52 30 100 30 Q148 30 148 94 L158 90 L150 104 L159 112 L146 116 L152 128 L138 126 L62 126 L48 128 L54 116 L41 112 L50 104 L42 90 Z" fill="#2b2b3a"/>
      <ellipse cx="100" cy="92" rx="42" ry="47" fill="#f6d3b4"/>
      <path d="M68 76 L86 73" stroke="#2b2b3a" strokeWidth="3" strokeLinecap="round"/>
      <path d="M114 73 L132 76" stroke="#2b2b3a" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="80" cy="98" r="8.5" fill="#4a6fa5"/>
      <circle cx="80" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="80" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="76.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="83.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="120" cy="98" r="8.5" fill="#4a6fa5"/>
      <circle cx="120" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="120" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="116.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="123.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <path d="M100 106 L97 112 L103 112" fill="none" stroke="#c99a76" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M92 121 Q100 127 108 121" fill="none" stroke="#b5715f" strokeWidth="2" strokeLinecap="round"/>
      <rect x="50" y="34" width="100" height="46" rx="20" fill="#2b2b3a"/>
      <path d="M52 74 L84 74 L68 94 Z" fill="#2b2b3a"/>
      <path d="M78 74 L110 74 L94 104 Z" fill="#2b2b3a"/>
      <path d="M106 74 L138 74 L122 104 Z" fill="#2b2b3a"/>
      <path d="M126 74 L150 74 L138 94 Z" fill="#2b2b3a"/>
      <rect x="50" y="34" width="100" height="24" rx="12" fill="#000000" opacity="0.1"/>
  </>,
  <>
      <rect width="200" height="200" fill="#e7f0e4"/>
      <path d="M52 200 Q56 154 84 146 L116 146 Q144 154 148 200 Z" fill="#3f6b52"/>
      <path d="M84 146 L100 166 L116 146 L106 143 L100 152 L94 143 Z" fill="#ffffff"/>
      <rect x="90" y="120" width="20" height="28" fill="#f2c9a0"/>
      <ellipse cx="58" cy="100" rx="7" ry="10" fill="#f2c9a0"/>
      <ellipse cx="142" cy="100" rx="7" ry="10" fill="#f2c9a0"/>
      <path d="M48 92 Q48 28 100 28 Q152 28 152 92 L160 176 L128 176 Q138 120 132 96 Q120 60 100 60 Q80 60 68 96 Q62 120 72 176 L40 176 Z" fill="#6b3f2a"/>
      <ellipse cx="100" cy="92" rx="42" ry="47" fill="#f2c9a0"/>
      <path d="M68 76 L86 73" stroke="#6b3f2a" strokeWidth="3" strokeLinecap="round"/>
      <path d="M114 73 L132 76" stroke="#6b3f2a" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="80" cy="98" r="8.5" fill="#5a7d4a"/>
      <circle cx="80" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="80" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="76.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="83.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="120" cy="98" r="8.5" fill="#5a7d4a"/>
      <circle cx="120" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="120" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="116.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="123.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <path d="M100 106 L97 112 L103 112" fill="none" stroke="#c99a76" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M92 121 Q100 127 108 121" fill="none" stroke="#b5715f" strokeWidth="2" strokeLinecap="round"/>
      <path d="M50 90 L50 60 Q50 34 100 34 Q150 34 150 60 L150 90 L132 90 Q132 66 100 66 Q68 66 68 90 Z" fill="#6b3f2a"/>
      <path d="M68 90 L58 110 L82 92 Z" fill="#000000" opacity="0.12"/>
      <path d="M132 90 L142 110 L118 92 Z" fill="#000000" opacity="0.12"/>
  </>,
  <>
      <rect width="200" height="200" fill="#f2e8f5"/>
      <path d="M52 200 Q56 154 84 146 L116 146 Q144 154 148 200 Z" fill="#5a4a7a"/>
      <path d="M84 146 L100 166 L116 146 L106 143 L100 152 L94 143 Z" fill="#ffffff"/>
      <rect x="90" y="120" width="20" height="28" fill="#e8bd94"/>
      <ellipse cx="58" cy="100" rx="7" ry="10" fill="#e8bd94"/>
      <ellipse cx="142" cy="100" rx="7" ry="10" fill="#e8bd94"/>
      <path d="M52 94 Q52 30 100 30 Q148 30 148 94 L158 90 L150 104 L159 112 L146 116 L152 128 L138 126 L62 126 L48 128 L54 116 L41 112 L50 104 L42 90 Z" fill="#1f1f1f"/>
      <ellipse cx="100" cy="92" rx="42" ry="47" fill="#e8bd94"/>
      <path d="M68 76 L86 73" stroke="#1f1f1f" strokeWidth="3" strokeLinecap="round"/>
      <path d="M114 73 L132 76" stroke="#1f1f1f" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="80" cy="98" r="8.5" fill="#6b5b8a"/>
      <circle cx="80" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="80" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="76.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="83.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="120" cy="98" r="8.5" fill="#6b5b8a"/>
      <circle cx="120" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="120" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="116.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="123.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <path d="M100 106 L97 112 L103 112" fill="none" stroke="#c99a76" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M92 121 Q100 127 108 121" fill="none" stroke="#b5715f" strokeWidth="2" strokeLinecap="round"/>
      <rect x="50" y="34" width="100" height="46" rx="20" fill="#1f1f1f"/>
      <path d="M52 74 L84 74 L68 94 Z" fill="#1f1f1f"/>
      <path d="M78 74 L110 74 L94 104 Z" fill="#1f1f1f"/>
      <path d="M106 74 L138 74 L122 104 Z" fill="#1f1f1f"/>
      <path d="M126 74 L150 74 L138 94 Z" fill="#1f1f1f"/>
      <rect x="50" y="34" width="100" height="24" rx="12" fill="#000000" opacity="0.1"/>
  </>,
  <>
      <rect width="200" height="200" fill="#f7ecdc"/>
      <path d="M52 200 Q56 154 84 146 L116 146 Q144 154 148 200 Z" fill="#7a5a2f"/>
      <path d="M84 146 L100 166 L116 146 L106 143 L100 152 L94 143 Z" fill="#ffffff"/>
      <rect x="90" y="120" width="20" height="28" fill="#f6d3b4"/>
      <ellipse cx="58" cy="100" rx="7" ry="10" fill="#f6d3b4"/>
      <ellipse cx="142" cy="100" rx="7" ry="10" fill="#f6d3b4"/>
      <path d="M46 96 Q46 30 100 30 Q154 30 154 96 Q154 128 146 140 L54 140 Q46 128 46 96 Z" fill="#4a2f1f"/>
      <ellipse cx="100" cy="92" rx="42" ry="47" fill="#f6d3b4"/>
      <path d="M68 76 L86 73" stroke="#4a2f1f" strokeWidth="3" strokeLinecap="round"/>
      <path d="M114 73 L132 76" stroke="#4a2f1f" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="80" cy="98" r="8.5" fill="#7a5a3a"/>
      <circle cx="80" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="80" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="76.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="83.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="120" cy="98" r="8.5" fill="#7a5a3a"/>
      <circle cx="120" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="120" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="116.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="123.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <path d="M100 106 L97 112 L103 112" fill="none" stroke="#c99a76" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M92 121 Q100 127 108 121" fill="none" stroke="#b5715f" strokeWidth="2" strokeLinecap="round"/>
      <path d="M52 88 L52 62 Q52 34 100 34 Q148 34 148 62 L148 88 Q148 74 126 74 Q100 82 74 74 Q52 74 52 88 Z" fill="#4a2f1f"/>
  </>,
  <>
      <rect width="200" height="200" fill="#e2eef2"/>
      <path d="M52 200 Q56 154 84 146 L116 146 Q144 154 148 200 Z" fill="#2f5a6b"/>
      <path d="M84 146 L100 166 L116 146 L106 143 L100 152 L94 143 Z" fill="#ffffff"/>
      <rect x="90" y="120" width="20" height="28" fill="#e0b088"/>
      <ellipse cx="58" cy="100" rx="7" ry="10" fill="#e0b088"/>
      <ellipse cx="142" cy="100" rx="7" ry="10" fill="#e0b088"/>
      <path d="M52 94 Q52 30 100 30 Q148 30 148 94 L158 90 L150 104 L159 112 L146 116 L152 128 L138 126 L62 126 L48 128 L54 116 L41 112 L50 104 L42 90 Z" fill="#2b2b3a"/>
      <ellipse cx="100" cy="92" rx="42" ry="47" fill="#e0b088"/>
      <path d="M68 76 L86 73" stroke="#2b2b3a" strokeWidth="3" strokeLinecap="round"/>
      <path d="M114 73 L132 76" stroke="#2b2b3a" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="80" cy="98" r="8.5" fill="#3a5a6a"/>
      <circle cx="80" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="80" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="76.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="83.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="120" cy="98" r="8.5" fill="#3a5a6a"/>
      <circle cx="120" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="120" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="116.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="123.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <path d="M100 106 L97 112 L103 112" fill="none" stroke="#c99a76" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M92 121 Q100 127 108 121" fill="none" stroke="#b5715f" strokeWidth="2" strokeLinecap="round"/>
      <rect x="50" y="34" width="100" height="46" rx="20" fill="#2b2b3a"/>
      <path d="M52 74 L84 74 L68 94 Z" fill="#2b2b3a"/>
      <path d="M78 74 L110 74 L94 104 Z" fill="#2b2b3a"/>
      <path d="M106 74 L138 74 L122 104 Z" fill="#2b2b3a"/>
      <path d="M126 74 L150 74 L138 94 Z" fill="#2b2b3a"/>
      <rect x="50" y="34" width="100" height="24" rx="12" fill="#000000" opacity="0.1"/>
  </>,
  <>
      <rect width="200" height="200" fill="#f2e4ea"/>
      <path d="M52 200 Q56 154 84 146 L116 146 Q144 154 148 200 Z" fill="#6b3f5a"/>
      <path d="M84 146 L100 166 L116 146 L106 143 L100 152 L94 143 Z" fill="#ffffff"/>
      <rect x="90" y="120" width="20" height="28" fill="#f6d3b4"/>
      <ellipse cx="58" cy="100" rx="7" ry="10" fill="#f6d3b4"/>
      <ellipse cx="142" cy="100" rx="7" ry="10" fill="#f6d3b4"/>
      <path d="M48 92 Q48 28 100 28 Q152 28 152 92 L160 176 L128 176 Q138 120 132 96 Q120 60 100 60 Q80 60 68 96 Q62 120 72 176 L40 176 Z" fill="#5a3a2a"/>
      <ellipse cx="100" cy="92" rx="42" ry="47" fill="#f6d3b4"/>
      <path d="M68 76 L86 73" stroke="#5a3a2a" strokeWidth="3" strokeLinecap="round"/>
      <path d="M114 73 L132 76" stroke="#5a3a2a" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="80" cy="98" r="8.5" fill="#6a4a6a"/>
      <circle cx="80" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="80" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="76.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="83.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="120" cy="98" r="8.5" fill="#6a4a6a"/>
      <circle cx="120" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="120" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="116.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="123.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <path d="M100 106 L97 112 L103 112" fill="none" stroke="#c99a76" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M92 121 Q100 127 108 121" fill="none" stroke="#b5715f" strokeWidth="2" strokeLinecap="round"/>
      <path d="M50 90 L50 60 Q50 34 100 34 Q150 34 150 60 L150 90 L132 90 Q132 66 100 66 Q68 66 68 90 Z" fill="#5a3a2a"/>
      <path d="M68 90 L58 110 L82 92 Z" fill="#000000" opacity="0.12"/>
      <path d="M132 90 L142 110 L118 92 Z" fill="#000000" opacity="0.12"/>
  </>,
  <>
      <rect width="200" height="200" fill="#e8e8ec"/>
      <path d="M52 200 Q56 154 84 146 L116 146 Q144 154 148 200 Z" fill="#3a3a4a"/>
      <path d="M84 146 L100 166 L116 146 L106 143 L100 152 L94 143 Z" fill="#ffffff"/>
      <rect x="90" y="120" width="20" height="28" fill="#d9a878"/>
      <ellipse cx="58" cy="100" rx="7" ry="10" fill="#d9a878"/>
      <ellipse cx="142" cy="100" rx="7" ry="10" fill="#d9a878"/>
      <path d="M46 96 Q46 30 100 30 Q154 30 154 96 Q154 128 146 140 L54 140 Q46 128 46 96 Z" fill="#1f1f1f"/>
      <ellipse cx="100" cy="92" rx="42" ry="47" fill="#d9a878"/>
      <path d="M68 76 L86 73" stroke="#1f1f1f" strokeWidth="3" strokeLinecap="round"/>
      <path d="M114 73 L132 76" stroke="#1f1f1f" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="80" cy="98" r="8.5" fill="#4a4a5a"/>
      <circle cx="80" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="80" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="76.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="83.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="120" cy="98" r="8.5" fill="#4a4a5a"/>
      <circle cx="120" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="120" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="116.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="123.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <path d="M100 106 L97 112 L103 112" fill="none" stroke="#c99a76" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M92 121 Q100 127 108 121" fill="none" stroke="#b5715f" strokeWidth="2" strokeLinecap="round"/>
      <path d="M52 88 L52 62 Q52 34 100 34 Q148 34 148 62 L148 88 Q148 74 126 74 Q100 82 74 74 Q52 74 52 88 Z" fill="#1f1f1f"/>
  </>,
  <>
      <rect width="200" height="200" fill="#eaf2e4"/>
      <path d="M52 200 Q56 154 84 146 L116 146 Q144 154 148 200 Z" fill="#4a6b3f"/>
      <path d="M84 146 L100 166 L116 146 L106 143 L100 152 L94 143 Z" fill="#ffffff"/>
      <rect x="90" y="120" width="20" height="28" fill="#f2c9a0"/>
      <ellipse cx="58" cy="100" rx="7" ry="10" fill="#f2c9a0"/>
      <ellipse cx="142" cy="100" rx="7" ry="10" fill="#f2c9a0"/>
      <path d="M52 94 Q52 30 100 30 Q148 30 148 94 L158 90 L150 104 L159 112 L146 116 L152 128 L138 126 L62 126 L48 128 L54 116 L41 112 L50 104 L42 90 Z" fill="#7a4a2a"/>
      <ellipse cx="100" cy="92" rx="42" ry="47" fill="#f2c9a0"/>
      <path d="M68 76 L86 73" stroke="#7a4a2a" strokeWidth="3" strokeLinecap="round"/>
      <path d="M114 73 L132 76" stroke="#7a4a2a" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="80" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="80" cy="98" r="8.5" fill="#4a7a5a"/>
      <circle cx="80" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="80" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="76.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="83.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="#ffffff"/>
      <ellipse cx="120" cy="96" rx="12" ry="14" fill="none" stroke="#2a2a35" strokeWidth="2"/>
      <circle cx="120" cy="98" r="8.5" fill="#4a7a5a"/>
      <circle cx="120" cy="98" r="8.5" fill="none" stroke="#2a2a35" strokeWidth="1.4"/>
      <circle cx="120" cy="98" r="4" fill="#1b1b22"/>
      <circle cx="116.5" cy="93.5" r="3.2" fill="#ffffff"/>
      <circle cx="123.5" cy="102" r="1.6" fill="#ffffff" opacity="0.8"/>
      <path d="M100 106 L97 112 L103 112" fill="none" stroke="#c99a76" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M92 121 Q100 127 108 121" fill="none" stroke="#b5715f" strokeWidth="2" strokeLinecap="round"/>
      <rect x="50" y="34" width="100" height="46" rx="20" fill="#7a4a2a"/>
      <path d="M52 74 L84 74 L68 94 Z" fill="#7a4a2a"/>
      <path d="M78 74 L110 74 L94 104 Z" fill="#7a4a2a"/>
      <path d="M106 74 L138 74 L122 104 Z" fill="#7a4a2a"/>
      <path d="M126 74 L150 74 L138 94 Z" fill="#7a4a2a"/>
      <rect x="50" y="34" width="100" height="24" rx="12" fill="#000000" opacity="0.1"/>
  </>,
];

export default function AnimeAvatar({
  variant,
  className = "",
  style,
}: {
  /** Indeks varian. Nilai di luar rentang dibungkus ke rentang yang valid. */
  variant: number;
  className?: string;
  style?: CSSProperties;
}) {
  // Pakai panjang array, bukan angka literal, supaya menambah avatar
  // tidak diam-diam membuat indeks meluber.
  const i = ((variant % AVATARS.length) + AVATARS.length) % AVATARS.length;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={{ width: "100%", height: "100%", objectFit: "cover", ...style }}
      // Avatar ini dekoratif. `aria-hidden` dipakai tanpa `role="img"`,
      // karena yang kedua menimpa yang pertama dan hasilnya role
      // generik yang tidak pernah diumumkan pembaca layar.
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      <g>{AVATARS[i]}</g>
    </svg>
  );
}
