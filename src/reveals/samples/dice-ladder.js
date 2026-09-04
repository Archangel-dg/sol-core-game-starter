// Fixtures for the dice-ladder reveal — the transcript `lib/reveal-session.ts` builds from a SessionView.
const S = (id, startThrow, steps, rest) => ({ sessionId: id, betLamports: '100000000', dice: startThrow.length, startThrow, steps, ...rest });
export const samples = [
  { name: 'Three steps · cash-out', outcome: S('d1', [3, 4], [{ guess: 'higher', fromSum: 7, throw: [5, 6], toSum: 11, correct: true, multiplierBps: 23280 }, { guess: 'lower', fromSum: 11, throw: [2, 3], toSum: 5, correct: true, multiplierBps: 24634 }, { guess: 'higher', fromSum: 5, throw: [4, 5], toSum: 9, correct: true, multiplierBps: 33085 }], { status: 'cashed_out', multiplierBps: 33085, payoutLamports: '330850000', win: true }) },
  { name: 'Bust on step 3', outcome: S('d2', [6, 5], [{ guess: 'lower', fromSum: 11, throw: [2, 4], toSum: 6, correct: true, multiplierBps: 10582 }, { guess: 'higher', fromSum: 6, throw: [3, 6], toSum: 9, correct: true, multiplierBps: 17596 }, { guess: 'higher', fromSum: 9, throw: [4, 1], toSum: 5, correct: false, multiplierBps: 17596 }], { status: 'busted', multiplierBps: 0, payoutLamports: '0', win: false }) },
  { name: 'Tie on 7 · lost', outcome: S('d3', [2, 5], [{ guess: 'higher', fromSum: 7, throw: [3, 4], toSum: 7, correct: false, multiplierBps: 10000 }], { status: 'busted', multiplierBps: 0, payoutLamports: '0', win: false }) },
  { name: 'Double six · 27.04×', outcome: S('d4', [3, 4], [{ guess: 'higher', fromSum: 7, throw: [4, 6], toSum: 10, correct: true, multiplierBps: 23280 }, { guess: 'higher', fromSum: 10, throw: [6, 6], toSum: 12, correct: true, multiplierBps: 270979 }, { guess: 'lower', fromSum: 12, throw: [2, 3], toSum: 5, correct: true, multiplierBps: 270360 }], { status: 'cashed_out', multiplierBps: 270360, payoutLamports: '1351800000', win: true }) },
  { name: 'Three dice · first throw bust', outcome: S('d5', [4, 4, 2], [{ guess: 'lower', fromSum: 10, throw: [6, 4, 3], toSum: 13, correct: false, multiplierBps: 10000 }], { status: 'busted', multiplierBps: 0, payoutLamports: '0', win: false }) },
];
export const configs = [
  { name: 'two dice', engineConfig: { diceCount: 2, faces: 6, maxSteps: 10 } },
  { name: 'three dice', engineConfig: { diceCount: 3, faces: 6, maxSteps: 10 } },
];
export const incremental = [
  { name: 'start throw, then the first guess', from: 0, first: S('di1', [3, 4], [], { status: 'active', multiplierBps: 10000, win: false }), then: S('di1', [3, 4], [{ guess: 'higher', fromSum: 7, throw: [5, 6], toSum: 11, correct: true, multiplierBps: 23280 }], { status: 'active', multiplierBps: 23280, win: false }) },
  { name: 'second guess busts', from: 1, first: S('di2', [6, 5], [{ guess: 'lower', fromSum: 11, throw: [2, 4], toSum: 6, correct: true, multiplierBps: 10582 }], { status: 'active', multiplierBps: 10582, win: false }), then: S('di2', [6, 5], [{ guess: 'lower', fromSum: 11, throw: [2, 4], toSum: 6, correct: true, multiplierBps: 10582 }, { guess: 'lower', fromSum: 6, throw: [3, 6], toSum: 9, correct: false, multiplierBps: 10582 }], { status: 'busted', multiplierBps: 0, payoutLamports: '0', win: false }) },
];
