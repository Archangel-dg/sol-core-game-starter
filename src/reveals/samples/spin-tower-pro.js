// Fixtures for the spin-tower-pro reveal — the transcript `lib/reveal-session.ts` builds from a SessionView.
const TOWERS = [
  { levels: 3, multipliersBps: [5000, 12000, 25000] },
  { levels: 4, multipliersBps: [4000, 9000, 16000, 30000] },
  { levels: 2, multipliersBps: [8000, 20000] },
];
const RESET = { towers: TOWERS, failMode: 'reset', maxSpins: 20 };
const STEPDOWN = { towers: TOWERS, failMode: 'stepdown', maxSpins: 20 };
const S = (id, cfg, spins, rest) => ({ sessionId: id, betLamports: '100000000', engineConfig: cfg, spins, ...rest });
const sp = (kind, tower, levels, securedBps, potBps) => ({ outcome: kind === 'tower' ? { kind, tower } : { kind }, levels, securedBps, potBps });
export const samples = [
  { name: 'Joker fills the board · cash-out', outcome: S('x1', RESET, [sp('tower', 0, [1, 0, 0], 0, 5000), sp('tower', 1, [1, 1, 0], 0, 9000), sp('tower', 0, [2, 1, 0], 0, 16000), sp('joker', null, [3, 2, 1], 0, 42000)], { status: 'cashed_out', potBps: 42000, securedBps: 0, payoutLamports: '420000000', win: true }) },
  { name: 'FAIL on spin 3 · reset, busted', outcome: S('x2', RESET, [sp('tower', 2, [0, 0, 1], 0, 8000), sp('nothing', null, [0, 0, 1], 0, 8000), sp('fail', null, [0, 0, 0], 0, 0)], { status: 'busted', potBps: 0, securedBps: 0, payoutLamports: '0', win: false }) },
  { name: 'Tower 3 maxed and secured · FAIL after', outcome: S('x3', RESET, [sp('tower', 2, [0, 0, 1], 0, 8000), sp('tower', 2, [0, 0, 2], 0, 20000), sp('tower', 2, [0, 0, 2], 20000, 20000), sp('tower', 1, [0, 1, 2], 20000, 24000), sp('fail', null, [0, 0, 0], 20000, 0)], { status: 'busted', potBps: 0, securedBps: 20000, payoutLamports: '200000000', win: true }) },
  { name: 'Stepdown FAIL · cash-out', outcome: S('x4', STEPDOWN, [sp('tower', 0, [1, 0, 0], 0, 5000), sp('tower', 0, [2, 0, 0], 0, 12000), sp('tower', 1, [2, 1, 0], 0, 16000), sp('fail', null, [1, 0, 0], 0, 5000), sp('tower', 2, [1, 0, 1], 0, 13000), sp('tower', 1, [1, 1, 1], 0, 17000)], { status: 'cashed_out', potBps: 17000, securedBps: 0, payoutLamports: '85000000', win: true }) },
  { name: 'Spin cap · cash-out', outcome: S('x5', { towers: TOWERS, failMode: 'reset', maxSpins: 3 }, [sp('tower', 0, [1, 0, 0], 0, 5000), sp('nothing', null, [1, 0, 0], 0, 5000), sp('tower', 1, [1, 1, 0], 0, 9000)], { status: 'cashed_out', endReason: 'max_spins', potBps: 9000, securedBps: 0, payoutLamports: '90000000', win: true }) },
];
export const configs = [
  { name: 'reset', engineConfig: RESET },
  { name: 'stepdown', engineConfig: STEPDOWN },
];
export const incremental = [
  { name: 'second spin after the first', from: 1, first: S('xi1', RESET, [sp('tower', 0, [1, 0, 0], 0, 5000)], { status: 'active', potBps: 5000, securedBps: 0, win: false }), then: S('xi1', RESET, [sp('tower', 0, [1, 0, 0], 0, 5000), sp('tower', 1, [1, 1, 0], 0, 9000)], { status: 'active', potBps: 9000, securedBps: 0, win: false }) },
  { name: 'FAIL after two spins', from: 2, first: S('xi2', RESET, [sp('tower', 2, [0, 0, 1], 0, 8000), sp('nothing', null, [0, 0, 1], 0, 8000)], { status: 'active', potBps: 8000, securedBps: 0, win: false }), then: S('xi2', RESET, [sp('tower', 2, [0, 0, 1], 0, 8000), sp('nothing', null, [0, 0, 1], 0, 8000), sp('fail', null, [0, 0, 0], 0, 0)], { status: 'busted', potBps: 0, securedBps: 0, payoutLamports: '0', win: false }) },
  { name: 'cash-out after one spin', from: 1, first: S('xi3', RESET, [sp('tower', 0, [1, 0, 0], 0, 5000)], { status: 'active', potBps: 5000, securedBps: 0, win: false }), then: S('xi3', RESET, [sp('tower', 0, [1, 0, 0], 0, 5000)], { status: 'cashed_out', potBps: 5000, securedBps: 0, payoutLamports: '50000000', win: true }) },
];
// The board prints its multipliers before the first step (ladder rungs / tower blocks) —
// they are the game's config, not a result. The check script must not read them as a leak.
export const multVisibleEarly = true;
