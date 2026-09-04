const TABLE = [
  { id: 'cherry', multiplierBps: 20000, pairMultiplierBps: 5000 }, { id: 'lemon', multiplierBps: 40000, pairMultiplierBps: 12000 },
  { id: 'bell', multiplierBps: 100000, pairMultiplierBps: 20000 }, { id: 'seven', multiplierBps: 250000, pairMultiplierBps: 24000 },
  { id: 'diamond', multiplierBps: 1000000, pairMultiplierBps: 50000 },
];
export const samples = [
  { name: 'Cherry triple · win', outcome: { win: true, multiplierBps: 20000, payoutLamports: '200000000', roll: null, betLamports: '100000000', engineConfig: { symbolTable: TABLE }, details: { line: ['cherry', 'cherry', 'cherry'], outcome: 'triple' } } },
  { name: 'Lemon pair · win', outcome: { win: true, multiplierBps: 12000, payoutLamports: '120000000', roll: null, betLamports: '100000000', engineConfig: { symbolTable: TABLE }, details: { line: ['lemon', 'bell', 'lemon'], outcome: 'pair' } } },
  { name: 'No match · loss', outcome: { win: false, multiplierBps: 0, payoutLamports: '0', roll: null, betLamports: '250000000', engineConfig: { symbolTable: TABLE }, details: { line: ['seven', 'cherry', 'bell'], outcome: 'none' } } },
  { name: 'Diamond triple · big win', outcome: { win: true, multiplierBps: 1000000, payoutLamports: '5000000000', roll: null, betLamports: '50000000', engineConfig: { symbolTable: TABLE }, details: { line: ['diamond', 'diamond', 'diamond'], outcome: 'triple' } } },
  { name: 'Custom symbols · pair', outcome: { win: true, multiplierBps: 24000, payoutLamports: '480000000', roll: null, betLamports: '200000000', engineConfig: { symbolTable: [{ id: 'coin', multiplierBps: 30000, pairMultiplierBps: 8000 }, { id: 'gem', multiplierBps: 80000, pairMultiplierBps: 24000 }, { id: 'crown', multiplierBps: 400000, pairMultiplierBps: 60000 }] }, details: { line: ['gem', 'gem', 'coin'], outcome: 'pair' } } },
];
export const configs = [
  { name: 'default symbols', engineConfig: { symbolTable: TABLE } },
  { name: 'three custom symbols', engineConfig: { symbolTable: [{ id: 'coin', multiplierBps: 30000, pairMultiplierBps: 8000 }, { id: 'gem', multiplierBps: 80000, pairMultiplierBps: 24000 }, { id: 'crown', multiplierBps: 400000, pairMultiplierBps: 60000 }] } },
];
