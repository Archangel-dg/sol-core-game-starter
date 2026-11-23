// Fixtures for the holdem-dealer reveal — the transcript `lib/reveal-session.ts`
// (`holdemDealerOutcome`) builds from a HoldemDealerView. Cards are 0..51: rank k % 13 + 1
// (1 = ace … 13 = king), suit ⌊k / 13⌋ (0 ♠, 1 ♥, 2 ♦, 3 ♣); nine per round: 0–1 you, 2–3 dealer,
// 4–6 flop, 7 turn, 8 river. Every hand, qualification and result below is what the server's
// evaluator (`holdemDealerAuswerten`, table `standard`) says for these cards. Ante 0.1 SOL, fees
// 7 % per debit (ante 0.107, call 0.214): `win` is the net verdict against both debits,
// `multiplierBps` is payout ÷ total stake (ante + call), like the server's round record.
//
// `blind` (fold fixtures): the same round WITHOUT the cards that were not played — what
// `holdemDealerOutcome` really hands over after a fold. The `outcome`/`then` of those fixtures
// deliberately carries all nine cards and the seven-card hands, as the server's answer does:
// check-reveals wants the SAME final DOM for both, and never one of the `unplayed` faces in the
// DOM (written the way this module writes a card: rank + suit).
const ANTE = '100000000';
const CARDS = (k) => ({ player: [k[0], k[1]], dealer: [k[2], k[3]], flop: [k[4], k[5], k[6]], turn: k[7], river: k[8] });
const DEAL = (id, k, flopHand) => ({
  sessionId: id, betLamports: ANTE, status: 'active', player: [k[0], k[1]], flop: [k[4], k[5], k[6]], turn: null, river: null,
  dealer: [null, null], flopHand, action: null, result: null, playerHand: null, dealerHand: null, dealerQualified: null,
  multiplierBps: 0, payoutLamports: '0', win: false, hit: false, capped: false, timedOut: false,
});
const CALLED = (id, k, flopHand, playerHand, dealerHand, dealerQualified, result, money) => ({
  sessionId: id, betLamports: ANTE, status: 'settled', ...CARDS(k), flopHand, action: 'call', result,
  playerHand, dealerHand, dealerQualified, capped: false, timedOut: false, ...money,
});
// After a fold: what the adapter hands over — nothing of turn, river, the dealer or the seven-card hands.
const FOLDED = (id, k, flopHand, rest) => ({
  ...DEAL(id, k, flopHand), status: 'settled', action: 'fold', result: 'fold', ...rest,
});
// The same fold with everything the server's answer carries (for the proof page only).
const FOLDED_RAW = (id, k, flopHand, playerHand, dealerHand, dealerQualified, rest) => ({
  ...FOLDED(id, k, flopHand, rest), ...CARDS(k), playerHand, dealerHand, dealerQualified,
});
const WIN = (multiplierBps, payoutLamports) => ({ multiplierBps, payoutLamports, win: true, hit: true });
const LOSS = { multiplierBps: 0, payoutLamports: '0', win: false, hit: false };

// K♥ Q♠ · dealer 9♣ 9♦ · flop K♣ 8♦ 4♠ · turn Q♣ · river 2♥ — two pair beats the dealer's nines, ante 1:1 + call 1:1.
const R1 = [25, 11, 47, 34, 51, 33, 3, 50, 14];
// A♠ A♥ · dealer J♣ 3♦ · flop 9♠ 6♥ 2♦ · turn K♦ · river 7♣ — the dealer has king high: not qualified, ante 1:1, call back.
const R2 = [0, 13, 49, 28, 8, 18, 27, 38, 45];
// 2♣ 3♦ · dealer 4♣ 5♥ · flop 10♠ J♥ Q♦ · turn K♣ · river A♥ — both play the board's straight: tie, both stakes back.
const R3 = [40, 28, 42, 17, 9, 23, 37, 51, 13];
// 7♠ 7♦ · dealer A♣ A♦ · flop 2♠ 9♥ J♣ · turn 4♦ · river K♠ — the dealer's aces beat the sevens.
const R4 = [6, 32, 39, 26, 1, 21, 49, 29, 12];
// 2♥ 7♣ · flop K♠ 9♦ 4♥ — folded. Unplayed: dealer Q♥ Q♣, turn 7♦, river 2♠ (two pair "would have come").
const R5 = [14, 45, 24, 50, 12, 34, 16, 32, 1];
// 5♠ 5♥ · flop 10♦ 3♣ 8♠ — no decision for 15 minutes: folded. Unplayed: dealer 6♦ J♠, turn 5♣, river Q♥.
const R6 = [4, 17, 31, 10, 35, 41, 7, 43, 24];
// A♥ 8♥ · dealer 9♦ 6♠ · flop K♥ 4♥ 9♣ · turn 2♥ · river J♠ — the flush beats the dealer's nines, ante 2:1.
const R7 = [13, 20, 34, 5, 25, 16, 47, 14, 10];
// A♠ K♠ · dealer 8♣ 8♦ · flop Q♠ J♠ 3♦ · turn 10♠ · river 7♥ — royal flush (10.5 SOL), paid at a 5 SOL payout cap.
const R8 = [0, 12, 46, 33, 11, 10, 28, 9, 19];

export const samples = [
  { name: 'Call · two pair beats a pair', outcome: CALLED('h1', R1, 'pair', 'twoPair', 'pair', true, 'win', WIN(20000, '600000000')), expect: [['reveal.won', { amount: '0.6' }], ['reveal.holdem.result.win'], ['hd.hand.twoPair']] },
  { name: 'Call · dealer does not qualify', outcome: CALLED('h2', R2, 'pair', 'pair', 'highCard', false, 'noQualify', WIN(13333, '400000000')), expect: [['reveal.won', { amount: '0.4' }], ['reveal.holdem.result.noQualify'], ['reveal.holdem.notQualified']] },
  { name: 'Call · tie on the board · stakes back', outcome: CALLED('h3', R3, 'highCard', 'straight', 'straight', true, 'tie', { multiplierBps: 10000, payoutLamports: '300000000', win: false, hit: true }), expect: [['result.back', { amount: '0.3' }], ['reveal.holdem.result.tie'], ['hd.hand.straight']] },
  { name: 'Call · the dealer has the better pair', outcome: CALLED('h4', R4, 'pair', 'pair', 'pair', true, 'loss', LOSS), expect: [['result.lost'], ['reveal.holdem.result.loss']] },
  {
    name: 'Fold · only what was played',
    outcome: FOLDED_RAW('h5', R5, 'highCard', 'twoPair', 'pair', true),
    blind: FOLDED('h5', R5, 'highCard'),
    unplayed: ['Q♥', 'Q♣', '7♦', '2♠'],
    expect: [['reveal.holdem.folded'], ['hd.hand.highCard']],
  },
  {
    name: 'Time-out · folded for the player',
    outcome: FOLDED_RAW('h6', R6, 'pair', 'threeOfAKind', 'highCard', false, { timedOut: true }),
    blind: FOLDED('h6', R6, 'pair', { timedOut: true }),
    unplayed: ['6♦', 'J♠', '5♣', 'Q♥'],
    expect: [['reveal.holdem.folded'], ['hd.hand.pair'], ['reveal.holdem.timedOut']],
  },
  { name: 'Call · flush pays the ante 2:1', outcome: CALLED('h7', R7, 'highCard', 'flush', 'pair', true, 'win', WIN(23333, '700000000')), expect: [['reveal.won', { amount: '0.7' }], ['hd.hand.flush']] },
  { name: 'Call · royal flush at the payout cap', outcome: CALLED('h8', R8, 'highCard', 'royalFlush', 'pair', true, 'win', { ...WIN(166666, '5000000000'), capped: true }), expect: [['reveal.won', { amount: '5' }], ['hd.hand.royalFlush'], ['reveal.capped']] },
];

const ANTE_STANDARD = { highCard: 10000, pair: 10000, twoPair: 10000, threeOfAKind: 10000, straight: 10000, flush: 20000, fullHouse: 30000, fourOfAKind: 100000, straightFlush: 200000, royalFlush: 1000000 };
export const configs = [
  {
    name: 'standard table (royal 100:1)',
    engineConfig: { engineVersion: 1, tabelle: 'standard', anteBps: ANTE_STANDARD, callFaktor: 2, dealerQualifiziertAb: { kategorie: 'pair', rang: 4 }, maxRueckflussBps: 1050000, rtpBps: 9784 },
  },
  {
    name: 'einsteiger table (royal 90:1)',
    engineConfig: { engineVersion: 1, tabelle: 'einsteiger', anteBps: { ...ANTE_STANDARD, royalFlush: 900000 }, callFaktor: 2, dealerQualifiziertAb: { kategorie: 'pair', rang: 4 }, maxRueckflussBps: 950000, rtpBps: 9781 },
  },
];

// Step 1 is the deal (round open, waiting for the decision), step 2 the decision: `from: 1` keeps the dealt table.
export const incremental = [
  { name: 'deal, then call · two pair wins', from: 1, first: DEAL('hi1', R1, 'pair'), then: CALLED('hi1', R1, 'pair', 'twoPair', 'pair', true, 'win', WIN(20000, '600000000')), expect: [['reveal.won', { amount: '0.6' }], ['hd.hand.twoPair']] },
  {
    name: 'deal, then fold · turn, river and dealer stay face down',
    from: 1,
    first: DEAL('hi2', R5, 'highCard'),
    then: FOLDED_RAW('hi2', R5, 'highCard', 'twoPair', 'pair', true),
    blind: FOLDED('hi2', R5, 'highCard'),
    unplayed: ['Q♥', 'Q♣', '7♦', '2♠'],
    expect: [['reveal.holdem.folded'], ['hd.hand.highCard']],
  },
  { name: 'deal, then call · the dealer wins', from: 1, first: DEAL('hi3', R4, 'pair'), then: CALLED('hi3', R4, 'pair', 'pair', 'pair', true, 'loss', LOSS), expect: [['result.lost'], ['reveal.holdem.result.loss']] },
];
