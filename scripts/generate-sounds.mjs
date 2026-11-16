#!/usr/bin/env node
/**
 * Erzeugt die Standard-Soundeffekte der Vorlage als WAV-Dateien unter
 * `public/sounds/`. Reine Synthese (Sinus/Dreieck/Rechteck mit Hüllkurve) —
 * keine fremden Samples, keine Lizenzfrage, jede Datei unter 40 KB.
 *
 * WARUM DATEIEN UND NICHT WEBAUDIO-CODE: Ein Creator soll einen Klang
 * austauschen können, ohne Code zu lesen — Datei unter gleichem Namen ersetzen,
 * fertig. `src/lib/sounds.ts` kennt nur die Namen und Pfade.
 *
 * Lauf:  node scripts/generate-sounds.mjs     (npm run generate-sounds)
 *
 * Ereignisse (siehe `SoundName` in src/lib/sounds.ts):
 *   click    – Knopfdruck / Schritt in einer Session
 *   bet      – Einsatz abgeschickt
 *   reveal   – Ergebnis wird aufgedeckt (Münze, Würfel, Rad)
 *   win      – Runde gewonnen
 *   lose     – Runde verloren / Bust
 *   cashout  – Auszahlung einer laufenden Session
 *   error    – Fehler vom Server oder ungültige Eingabe
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sounds');
const RATE = 22050;

/** Grundwelle je Typ, Phase in [0,1). */
const wave = {
  sine: (p) => Math.sin(2 * Math.PI * p),
  triangle: (p) => 1 - 4 * Math.abs(Math.round(p - 0.25) - (p - 0.25)),
  square: (p) => (p < 0.5 ? 1 : -1),
};

/**
 * Ein Ton mit Attack/Decay-Hüllkurve. `freqTo` erlaubt ein Gleiten (Sweep).
 * Liefert ein Float-Array in [-1,1].
 */
function tone({ freq, freqTo = freq, dur, type = 'sine', attack = 0.005, gain = 1, decay = 1 }) {
  const n = Math.round(dur * RATE);
  const out = new Float64Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = freq + (freqTo - freq) * t;
    phase = (phase + f / RATE) % 1;
    const a = Math.min(1, i / (attack * RATE)); // Attack
    const d = Math.exp(-decay * 5 * t); // exponentieller Ausklang
    out[i] = wave[type](phase) * a * d * gain;
  }
  return out;
}

/** Mischt Töne an Startzeiten (Sekunden) zusammen. */
function mix(parts, totalDur, level = 0.8) {
  const n = Math.round(totalDur * RATE);
  const out = new Float64Array(n);
  for (const { at, buf } of parts) {
    const off = Math.round(at * RATE);
    for (let i = 0; i < buf.length && off + i < n; i++) out[off + i] += buf[i];
  }
  // Normalisieren auf `level` (Standard 0,8) und weich begrenzen — kein
  // Clipping, egal wie viele Stimmen sich überlagern. Ein kleinerer `level`
  // macht einen Klang leiser als die anderen (der Verlust, 16.11.2026).
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const k = peak > 0 ? level / peak : 1;
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * k * 1.2) / Math.tanh(1.2);
  return out;
}

/** 16-Bit-PCM-WAV, mono. */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); // PCM-Chunk-Länge
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28); // Bytes/s
  h.writeUInt16LE(2, 32); // Block-Align
  h.writeUInt16LE(16, 34); // Bits
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const SOUNDS = {
  // kurzer, trockener Tick
  click: () => mix([{ at: 0, buf: tone({ freq: 1400, freqTo: 900, dur: 0.05, type: 'triangle', decay: 3 }) }], 0.06),
  // zwei aufsteigende Blips: „Einsatz ist unterwegs"
  bet: () =>
    mix(
      [
        { at: 0, buf: tone({ freq: 440, dur: 0.09, type: 'sine', decay: 1.5 }) },
        { at: 0.07, buf: tone({ freq: 660, dur: 0.11, type: 'sine', decay: 1.5 }) },
      ],
      0.2,
    ),
  // Aufdecken: gleitender Ton nach oben mit leichtem Schimmer
  reveal: () =>
    mix(
      [
        { at: 0, buf: tone({ freq: 300, freqTo: 900, dur: 0.35, type: 'triangle', decay: 0.8 }) },
        { at: 0.2, buf: tone({ freq: 1200, dur: 0.2, type: 'sine', gain: 0.4, decay: 2 }) },
      ],
      0.45,
    ),
  // Gewinn: Dur-Arpeggio C5–E5–G5–C6
  win: () =>
    mix(
      [523.25, 659.25, 783.99, 1046.5].map((f, i) => ({
        at: i * 0.09,
        buf: tone({ freq: f, dur: 0.32, type: 'sine', decay: 1.2, gain: 0.8 }),
      })),
      0.65,
    ),
  // Verlust (16.11.2026): drei weiche, fallende Töne G5–D5–C5 — in derselben
  // Lage wie der Gewinn und leiser als er. Ein verlorener Einsatz ist ein
  // Ausgang, kein Fehler: nicht der tiefe, dumpfe Klang von früher, nichts
  // Bestrafendes (Wissen: klang-semantik, gefuehl-verluste).
  lose: () =>
    mix(
      [
        { at: 0, buf: tone({ freq: 783.99, dur: 0.16, type: 'sine', attack: 0.008, decay: 1.6, gain: 0.7 }) },
        { at: 0.12, buf: tone({ freq: 587.33, dur: 0.18, type: 'sine', attack: 0.008, decay: 1.6, gain: 0.7 }) },
        { at: 0.26, buf: tone({ freq: 523.25, dur: 0.34, type: 'sine', attack: 0.01, decay: 1.1, gain: 0.8 }) },
      ],
      0.62,
      0.4,
    ),
  // Cashout: Kassenklang — zwei helle Töne plus Glitzer
  cashout: () =>
    mix(
      [
        { at: 0, buf: tone({ freq: 784, dur: 0.12, type: 'sine', decay: 1.2 }) },
        { at: 0.1, buf: tone({ freq: 1046.5, dur: 0.25, type: 'sine', decay: 1 }) },
        { at: 0.16, buf: tone({ freq: 2093, dur: 0.18, type: 'sine', gain: 0.3, decay: 2 }) },
      ],
      0.45,
    ),
  // Fehler: zwei kurze, tiefe Brummer
  error: () =>
    mix(
      [
        { at: 0, buf: tone({ freq: 200, dur: 0.08, type: 'square', gain: 0.5, decay: 0.8 }) },
        { at: 0.11, buf: tone({ freq: 180, dur: 0.1, type: 'square', gain: 0.5, decay: 0.8 }) },
      ],
      0.25,
    ),
};

mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries(SOUNDS)) {
  const file = join(OUT, `${name}.wav`);
  const buf = wav(make());
  writeFileSync(file, buf);
  console.log(`${name.padEnd(8)} ${String(buf.length).padStart(6)} B  → public/sounds/${name}.wav`);
}
