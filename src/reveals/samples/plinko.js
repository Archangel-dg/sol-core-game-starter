// Fixtures for the plinko reveal — exact server shapes (result of POST /api/game/bet
// plus betLamports and, where relevant, engineConfig). Used by the check script and
// never imported by the game.
export const samples = [
  { name: 'Centre bucket · loss', outcome: { win: false, multiplierBps: 3468, payoutLamports: '34680000', roll: null, betLamports: '100000000', details: { rows: 12, base: 1.8, path: '011010100101', slot: 6, paytableBps: [117959, 65533, 36407, 20226, 11237, 6243, 3468, 6243, 11237, 20226, 36407, 65533, 117959], balls: 1, results: [{ slot: 6, multiplierBps: 3468 }] } } },
  { name: 'Slot 4 of 12 · win', outcome: { win: true, multiplierBps: 11237, payoutLamports: '112370000', roll: null, betLamports: '100000000', details: { rows: 12, base: 1.8, path: '100100100100', slot: 4, paytableBps: [117959, 65533, 36407, 20226, 11237, 6243, 3468, 6243, 11237, 20226, 36407, 65533, 117959], balls: 1, results: [{ slot: 4, multiplierBps: 11237 }] } } },
  { name: 'All right · edge bucket win', outcome: { win: true, multiplierBps: 79464, payoutLamports: '397320000', roll: null, betLamports: '50000000', details: { rows: 8, base: 2.3, path: '11111111', slot: 8, paytableBps: [79464, 34550, 15022, 6531, 2840, 6531, 15022, 34550, 79464], balls: 1, results: [{ slot: 8, multiplierBps: 79464 }] } } },
  { name: 'Low risk · 0.86× loss', outcome: { win: false, multiplierBps: 8633, payoutLamports: '172660000', roll: null, betLamports: '200000000', details: { rows: 10, base: 1.35, path: '0101001010', slot: 4, paytableBps: [28675, 21241, 15734, 11655, 8633, 6395, 8633, 11655, 15734, 21241, 28675], balls: 1, results: [{ slot: 4, multiplierBps: 8633 }] } } },
  { name: '16 rows high · 104× jackpot', outcome: { win: true, multiplierBps: 1040492, payoutLamports: '2080984000', roll: null, betLamports: '20000000', details: { rows: 16, base: 2.3, path: '0000000000000000', slot: 0, paytableBps: [1040492, 452388, 196690, 85518, 37182, 16166, 7029, 3056, 1329, 3056, 7029, 16166, 37182, 85518, 196690, 452388, 1040492], balls: 1, results: [{ slot: 0, multiplierBps: 1040492 }] } } },
];
/** Idle geometry fixtures: what /api/meta echoes for this engine. */
export const configs = [
  { name: '8 rows', engineConfig: { rows: 8, maxBalls: 1 } },
  { name: '16 rows · custom table', engineConfig: { rows: 16, maxBalls: 3, base: 2.3, paytableBps: [1040492, 452388, 196690, 85518, 37182, 16166, 7029, 3056, 1329, 3056, 7029, 16166, 37182, 85518, 196690, 452388, 1040492] } },
];
