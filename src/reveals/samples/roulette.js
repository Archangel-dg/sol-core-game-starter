// Fixtures for the roulette reveal — exact server shapes (easy: betType/value/color,
// pro: chips[] with the server's per-chip settlement). Used by the check script only.
const EU = { pocketCount: 37, proBetsEnabled: 0 };
const US = { pocketCount: 38, proBetsEnabled: 0 };
export const samples = [
  { name: 'Red · win', outcome: { win: true, multiplierBps: 20000, payoutLamports: '200000000', roll: 32, betLamports: '100000000', engineConfig: EU, details: { pocket: 32, betType: 'red', value: 0, color: 'red' } } },
  { name: 'Black · loss on zero', outcome: { win: false, multiplierBps: 0, payoutLamports: '0', roll: 0, betLamports: '250000000', engineConfig: EU, details: { pocket: 0, betType: 'black', value: 0, color: 'green' } } },
  { name: 'Straight 17 · 36× win', outcome: { win: true, multiplierBps: 360000, payoutLamports: '1800000000', roll: 17, betLamports: '50000000', engineConfig: EU, details: { pocket: 17, betType: 'straight', value: 17, color: 'black' } } },
  { name: 'Split 7/10 · 18× win', outcome: { win: true, multiplierBps: 180000, payoutLamports: '1800000000', roll: 10, betLamports: '100000000', engineConfig: EU, details: { pocket: 10, betType: 'split', value: 30, color: 'black' } } },
  { name: '2nd dozen · loss', outcome: { win: false, multiplierBps: 0, payoutLamports: '0', roll: 5, betLamports: '200000000', engineConfig: EU, details: { pocket: 5, betType: 'dozen', value: 2, color: 'red' } } },
  { name: 'American · 00 · straight loss', outcome: { win: false, multiplierBps: 0, payoutLamports: '0', roll: 37, betLamports: '100000000', engineConfig: US, details: { pocket: '00', betType: 'straight', value: 5, color: 'green' } } },
  { name: 'Pro · 2 chips · partial win', outcome: { win: true, multiplierBps: 12000, payoutLamports: '360000000', roll: 14, betLamports: '300000000', engineConfig: { pocketCount: 37, proBetsEnabled: 1 }, details: { pocket: 14, color: 'red', chips: [
    { betType: 'red', value: 0, stakeLamports: '180000000', coveredCount: 18, oddsBps: 20000, win: true, payoutLamports: '360000000' },
    { betType: 'straight', value: 7, stakeLamports: '120000000', coveredCount: 1, oddsBps: 360000, win: false, payoutLamports: '0' },
  ] } } },
];
export const configs = [
  { name: 'european', engineConfig: EU },
  { name: 'american', engineConfig: US },
];
