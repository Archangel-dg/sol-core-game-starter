'use client';

/**
 * Provably-Fair-Panel: zeigt den Seed-Hash VOR der Runde und den Verify-Link
 * DANACH.
 *
 * Echt-Runden verlinken auf den Sol-Core Verifier (`verifierUrl`/verify/…) —
 * die menschenlesbare Seite, die die Runde IM BROWSER des Spielers nachrechnet.
 * Demo-Runden liegen in `demo_rounds` (nicht `creator_rounds`), die der Verifier
 * nicht kennt — daher bleiben sie beim rohen, öffentlichen Demo-Endpunkt.
 */
export function FairnessPanel({
  apiUrl,
  verifierUrl,
  serverSeedHash,
  roundId,
  demo = false,
}: {
  apiUrl: string;
  verifierUrl: string;
  serverSeedHash: string | null;
  roundId: string | null;
  demo?: boolean;
}) {
  const href = demo
    ? `${apiUrl}/api/game/demo/verify/${roundId}`
    : `${verifierUrl}/verify/${roundId}`;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
      <div className="mb-1 uppercase tracking-wide text-white/50">Provably Fair</div>
      <div className="break-all text-white/60">
        Seed-Hash: <span className="text-white/80">{serverSeedHash ?? '—'}</span>
      </div>
      {roundId && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-accent underline underline-offset-2"
        >
          Runde verifizieren →
        </a>
      )}
    </div>
  );
}
