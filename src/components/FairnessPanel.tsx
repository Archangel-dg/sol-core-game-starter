'use client';

/**
 * Provably-Fair-Panel: zeigt den Seed-Hash VOR der Runde und den Verify-Link
 * DANACH. Der Verify-Endpunkt ist öffentlich (ohne Key, direkt aus dem Browser).
 */
export function FairnessPanel({
  apiUrl,
  serverSeedHash,
  roundId,
  demo = false,
}: {
  apiUrl: string;
  serverSeedHash: string | null;
  roundId: string | null;
  demo?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
      <div className="mb-1 uppercase tracking-wide text-white/50">Provably Fair</div>
      <div className="break-all text-white/60">
        Seed-Hash: <span className="text-white/80">{serverSeedHash ?? '—'}</span>
      </div>
      {roundId && (
        <a
          href={`${apiUrl}/api/game/${demo ? 'demo/verify' : 'verify'}/${roundId}`}
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
