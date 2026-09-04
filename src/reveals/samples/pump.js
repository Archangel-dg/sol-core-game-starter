// Fixtures for the pump reveal — the transcript `lib/reveal-session.ts` builds from a SessionView.
const P = [11500, 13225, 15209, 17490, 20114, 23131, 26600, 30590, 35179, 40456, 46524, 53503, 61528, 70757, 81371, 93576, 107613, 123755, 142318, 163665];
const pumps = (n) => P.slice(0, n).map((multiplierBps) => ({ multiplierBps }));
const S = (id, n, rest) => ({ sessionId: id, betLamports: '100000000', pumps: pumps(n), ...rest });
export const samples = [
  { name: 'Three pumps · cash-out', outcome: S('p1', 3, { status: 'cashed_out', multiplierBps: 15209, payoutLamports: '152090000', win: true }) },
  { name: 'Burst on the fourth pump · bust', outcome: S('p2', 3, { status: 'busted', burstMultiplierBps: 16340, multiplierBps: 0, payoutLamports: '0', win: false }) },
  { name: 'Burst on the first pump · bust', outcome: S('p3', 0, { status: 'busted', burstMultiplierBps: 10820, multiplierBps: 0, payoutLamports: '0', win: false }) },
  { name: 'Twelve pumps · 5.35× cash-out', outcome: S('p4', 12, { status: 'cashed_out', multiplierBps: 53503, payoutLamports: '1337575000', win: true }) },
  { name: 'Twenty pumps · 16.37× auto cash-out', outcome: S('p5', 20, { status: 'cashed_out', multiplierBps: 163665, payoutLamports: '818325000', win: true }) },
];
export const configs = [{ name: 'default', engineConfig: { maxPumps: 20 } }];
export const incremental = [
  { name: 'second pump after the first', from: 1, first: S('pi1', 1, { status: 'active', multiplierBps: 11500, win: false }), then: S('pi1', 2, { status: 'active', multiplierBps: 13225, win: false }) },
  { name: 'burst on the third pump', from: 2, first: S('pi2', 2, { status: 'active', multiplierBps: 13225, win: false }), then: S('pi2', 2, { status: 'busted', burstMultiplierBps: 14100, multiplierBps: 0, payoutLamports: '0', win: false }) },
  { name: 'cash-out after two pumps', from: 2, first: S('pi3', 2, { status: 'active', multiplierBps: 13225, win: false }), then: S('pi3', 2, { status: 'cashed_out', multiplierBps: 13225, payoutLamports: '132250000', win: true }) },
];
