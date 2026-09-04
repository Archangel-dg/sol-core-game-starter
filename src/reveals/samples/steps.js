// Fixtures for the steps reveal — the transcript `lib/reveal-session.ts` builds from a SessionView.
const CFG = { ladderBps: [12000, 15500, 20500, 27500, 37500, 52000, 73000, 105000], checkpoints: [3, 6], lives: 2 };
const S = (id, climbs, rest) => ({ sessionId: id, betLamports: '100000000', engineConfig: CFG, climbs, ...rest });
const up = (r, lives) => ({ fromRung: r, toRung: r + 1, survived: true, livesLeft: lives });
export const samples = [
  { name: 'Four rungs · cash-out', outcome: S('s1', [up(0, 2), up(1, 2), up(2, 2), up(3, 2)], { status: 'cashed_out', multiplierBps: 27500, payoutLamports: '275000000', win: true }) },
  { name: 'Fall to checkpoint · cash-out', outcome: S('s2', [up(0, 2), up(1, 2), up(2, 2), up(3, 2), { fromRung: 4, toRung: 3, survived: false, livesLeft: 1 }, up(3, 1), up(4, 1)], { status: 'cashed_out', multiplierBps: 37500, payoutLamports: '375000000', win: true }) },
  { name: 'Two falls · bust', outcome: S('s3', [up(0, 2), up(1, 2), up(2, 2), up(3, 2), { fromRung: 4, toRung: 3, survived: false, livesLeft: 1 }, { fromRung: 3, toRung: 3, survived: false, livesLeft: 0 }, { fromRung: 3, toRung: 0, survived: false, livesLeft: 0 }], { status: 'busted', multiplierBps: 0, payoutLamports: '0', win: false }) },
  { name: 'Top rung · 10.5× auto cash-out', outcome: S('s4', [up(0, 2), up(1, 2), up(2, 2), up(3, 2), up(4, 2), up(5, 2), up(6, 2), up(7, 2)], { status: 'cashed_out', multiplierBps: 105000, payoutLamports: '1050000000', win: true }) },
  { name: 'No lives (failMode lose) · first climb busts', outcome: { ...S('s5', [{ fromRung: 0, toRung: 0, survived: false, livesLeft: 0 }], { status: 'busted', multiplierBps: 0, payoutLamports: '0', win: false }), engineConfig: { ladderBps: CFG.ladderBps, checkpoints: [], lives: 0 } } },
];
export const configs = [
  { name: 'checkpoints + lives', engineConfig: CFG },
  { name: 'lose mode', engineConfig: { ladderBps: [15000, 22000, 33000, 50000, 75000], checkpoints: [], lives: 0 } },
];
export const incremental = [
  { name: 'second climb after the first', from: 1, first: S('si1', [up(0, 2)], { status: 'active', multiplierBps: 12000, win: false }), then: S('si1', [up(0, 2), up(1, 2)], { status: 'active', multiplierBps: 15500, win: false }) },
  { name: 'fall to the checkpoint', from: 4, first: S('si2', [up(0, 2), up(1, 2), up(2, 2), up(3, 2)], { status: 'active', multiplierBps: 27500, win: false }), then: S('si2', [up(0, 2), up(1, 2), up(2, 2), up(3, 2), { fromRung: 4, toRung: 3, survived: false, livesLeft: 1 }], { status: 'active', multiplierBps: 20500, win: false }) },
  { name: 'cash-out on rung 2', from: 2, first: S('si3', [up(0, 2), up(1, 2)], { status: 'active', multiplierBps: 15500, win: false }), then: S('si3', [up(0, 2), up(1, 2)], { status: 'cashed_out', multiplierBps: 15500, payoutLamports: '155000000', win: true }) },
];
// The board prints its multipliers before the first step (ladder rungs / tower blocks) —
// they are the game's config, not a result. The check script must not read them as a leak.
export const multVisibleEarly = true;
