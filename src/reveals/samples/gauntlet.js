// Fixtures for the gauntlet reveal — the transcript `lib/reveal-session.ts` builds from a TournamentRunView.
// A tournament has no multiplier/won/lost readout; `expect` names the catalog texts the final frame must show
// (and must NOT show while the run is still animating).
const R = (id, history, rest) => ({ runId: id, betLamports: '100000000', entryLamports: '100000000', maxSteps: 30, history, ...rest });
const h = (step, risk, roll, survived, points) => ({ step, risk, roll, survived, points });
export const samples = [
  { name: 'Safe, medium, risky, safe · banked 65 pts', outcome: R('g1', [h(0, 'safe', 23.41, true, 10), h(1, 'medium', 41.07, true, 15), h(2, 'risky', 12.88, true, 30), h(3, 'safe', 71.5, true, 10)], { status: 'stopped', score: 65, bestScore: 65 }), expect: [['reveal.gauntlet.bankedPts', { pts: ['reveal.gauntlet.pts', { n: 65 }] }]] },
  { name: 'Risky on step 5 · bust', outcome: R('g2', [h(0, 'safe', 8.19, true, 10), h(1, 'safe', 64.02, true, 10), h(2, 'medium', 33.7, true, 15), h(3, 'medium', 57.96, true, 15), h(4, 'risky', 84.2, false, 0)], { status: 'busted', score: 0 }), expect: [['reveal.gauntlet.bustStep', { n: 5 }]] },
  { name: 'Risky streak · banked 120 pts', outcome: R('g3', [h(0, 'risky', 4.1, true, 30), h(1, 'risky', 27.93, true, 30), h(2, 'risky', 19.35, true, 30), h(3, 'risky', 8.66, true, 30)], { status: 'stopped', score: 120 }), expect: [['reveal.gauntlet.bankedPts', { pts: ['reveal.gauntlet.pts', { n: 120 }] }]] },
  { name: 'First step risky · bust', outcome: R('g4', [h(0, 'risky', 55.03, false, 0)], { status: 'busted', score: 0 }), expect: [['reveal.gauntlet.bustStep', { n: 1 }]] },
  { name: 'Full track · auto-banked 100 pts', outcome: { ...R('g5', Array.from({ length: 10 }, (_, i) => h(i, 'safe', [12.5, 45.31, 3.08, 88.74, 27.6, 61.19, 9.92, 74.05, 36.4, 52.87][i], true, 10)), { status: 'stopped', score: 100 }), maxSteps: 10 }, expect: [['reveal.gauntlet.bankedPts', { pts: ['reveal.gauntlet.pts', { n: 100 }] }]] },
];
export const configs = [
  { name: '30 steps', engineConfig: { maxSteps: 30 } },
  { name: '10 steps', engineConfig: { maxSteps: 10 } },
];
export const incremental = [
  { name: 'second step after the first', from: 1, first: R('gi1', [h(0, 'safe', 23.41, true, 10)], { status: 'active', score: 10 }), then: R('gi1', [h(0, 'safe', 23.41, true, 10), h(1, 'medium', 41.07, true, 15)], { status: 'active', score: 25 }) },
  { name: 'bust on the third step', from: 2, first: R('gi2', [h(0, 'safe', 8.19, true, 10), h(1, 'safe', 64.02, true, 10)], { status: 'active', score: 20 }), then: R('gi2', [h(0, 'safe', 8.19, true, 10), h(1, 'safe', 64.02, true, 10), h(2, 'risky', 84.2, false, 0)], { status: 'busted', score: 0 }), expect: [['reveal.gauntlet.bustStep', { n: 3 }]] },
  { name: 'bank after two steps', from: 2, first: R('gi3', [h(0, 'safe', 8.19, true, 10), h(1, 'safe', 64.02, true, 10)], { status: 'active', score: 20 }), then: R('gi3', [h(0, 'safe', 8.19, true, 10), h(1, 'safe', 64.02, true, 10)], { status: 'stopped', score: 20, bestScore: 20 }), expect: [['reveal.gauntlet.bankedPts', { pts: ['reveal.gauntlet.pts', { n: 20 }] }]] },
];
