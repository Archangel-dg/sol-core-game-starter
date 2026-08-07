// ⚠ Nicht ändern — Systemvertrag.
import { NextResponse } from 'next/server';
import { playerTokenFrom, pvpLobbyState, SolcoreError } from '@/lib/solcore';

/**
 * Lobby-Raum-State (1-s-Poll): Mitglieder + Ready + Stake + Status + Match +
 * Chat-Delta (?since=<id>) + serverTime.
 *
 * WICHTIG (Sicherheits-Vertrag): dieser State ist serverseitig
 * MITGLIEDSCHAFTS-geprüft — ein Nicht-Mitglied erhält API-700. Der Poll ist
 * deshalb KEIN token-freier Read: das Spieler-Token MUSS durchgereicht werden
 * (`playerTokenFrom(req)`). Der Client ruft die Route über einen
 * authentifizierten Fetch auf (usePlayerAuth().authFetch), der das Bearer-Token
 * trägt (aus create/join). Ohne Token schlägt der Poll bewusst fehl.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const since = new URL(req.url).searchParams.get('since') ?? undefined;
    return NextResponse.json(await pvpLobbyState(params.id, since, playerTokenFrom(req)));
  } catch (err) {
    if (err instanceof SolcoreError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, reason: err.reason } }, { status: err.status });
    }
    return NextResponse.json({ error: { code: 'API-500', message: (err as Error).message } }, { status: 500 });
  }
}
