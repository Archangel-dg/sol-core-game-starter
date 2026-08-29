'use client';
import { useT } from '@/lib/i18n';

// ★ DESIGN-ZONE — dieses Bar-Race ist bewusst schlicht. Baue hier deine
// eigene Reveal-Animation (Pferderennen, Autorennen, Raketenstart, …).
//
// Regeln für Designer (bindend, siehe docs/CUSTOMIZE.md):
//   1. Die Animation ist eine PURE Funktion aus (resultIndex, revealProgress,
//      outcomes) — kein Math.random(), kein eigener Timer-Zufall. Nur so
//      zeigt jeder Skin desselben Streams deterministisch dasselbe Rennen
//      mit demselben Sieger.
//   2. Der Sieger darf frühestens gegen Ende erkennbar sein und MUSS bei
//      revealProgress = 1 feststehen. Die Animation endet spätestens dann.
//   3. Das Ergebnis kommt ausschließlich aus den Props — niemals raten,
//      niemals clientseitig ziehen.

export interface LiveResultViewProps {
  outcomes: { index: number; label: string; oddsBps: number }[];
  /** Sieger-Index — null solange die Runde läuft (betting/drawing). */
  resultIndex: number | null;
  phase: 'betting' | 'drawing' | 'revealing' | 'settled';
  /** 0..1 innerhalb des Reveal-Fensters (settled = 1). */
  revealProgress: number;
  myBets: { outcomeIndex: number; betLamports: string; status: string }[];
}

/** Deterministischer Pseudo-Wert 0..1 aus (roundIdx, salt) — KEIN Zufall,
 * nur Streuung, damit die Verlierer-Balken unterschiedlich weit kommen. */
function spread(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Balken-Fortschritt 0..1 — pure Funktion, deterministisches Replay. */
function laneProgress(index: number, resultIndex: number | null, t: number): number {
  if (resultIndex === null) return 0;
  const isWinner = index === resultIndex;
  // Verlierer enden gestreut zwischen 62% und 94%; der Sieger zieht auf den
  // letzten ~25% vorbei und trifft bei t=1 exakt die Ziellinie.
  const laneEnd = isWinner ? 1 : 0.62 + 0.32 * spread(index, resultIndex);
  // Leichtes „Wackeln" während des Rennens — ebenfalls deterministisch.
  const wobble = Math.sin(t * 9 + index * 2.1) * 0.03 * (1 - t);
  const eased = 1 - Math.pow(1 - t, 2); // ease-out
  return Math.max(0, Math.min(1, eased * laneEnd + wobble * (t > 0.05 && t < 0.95 ? 1 : 0)));
}

export function LiveResultView({
  outcomes,
  resultIndex,
  phase,
  revealProgress,
  myBets,
}: LiveResultViewProps) {
  // `t` ist in dieser Datei bereits der Animations-Fortschritt (Systemvertrag:
  // die Reveal-Mathematik). Der Uebersetzer heisst hier deshalb `tr` — die
  // Formel anzufassen, nur um einen Namen frei zu bekommen, waere die
  // riskantere Aenderung.
  const tr = useT();
  const racing = phase === 'revealing' || phase === 'settled';
  const t = phase === 'settled' ? 1 : revealProgress;
  const winnerKnown = phase === 'settled' || (phase === 'revealing' && revealProgress >= 1);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="space-y-2">
        {outcomes.map((o) => {
          const progress = racing ? laneProgress(o.index, resultIndex, t) : 0;
          const isWinner = winnerKnown && resultIndex === o.index;
          const mine = myBets.some(
            (b) => b.outcomeIndex === o.index && b.status !== 'rejected' && b.status !== 'refunded',
          );
          return (
            <div key={o.index}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className={isWinner ? 'font-bold text-accent' : 'text-white/70'}>
                  #{o.index + 1} {o.label}
                  {mine ? ' ·•' : ''}
                  {isWinner ? ' 🏁' : ''}
                </span>
                <span className="tabular-nums text-white/40">
                  {(o.oddsBps / 10000).toFixed(2)}×
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full transition-[width] duration-100 ${
                    isWinner ? 'bg-accent' : mine ? 'bg-white/50' : 'bg-white/25'
                  }`}
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {phase === 'betting' && (
        <p className="mt-3 text-center text-xs text-white/40">{tr('live.lineup')}</p>
      )}
      {phase === 'drawing' && (
        <p className="mt-3 text-center text-xs text-white/40">{tr('live.startingSoon')}</p>
      )}
      {winnerKnown && resultIndex !== null && (
        <p className="mt-3 text-center text-sm font-semibold text-accent">
          #{resultIndex + 1} {outcomes[resultIndex]?.label ?? ''} gewinnt!
        </p>
      )}
    </div>
  );
}
