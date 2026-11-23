// Sol-Core reveal — holdem-dealer (session, Table).
//
// Texas Hold'em against the dealer, three rows: the dealer's two cards on top, the board (flop,
// turn, river) in the middle, your two cards below. DEAL: you, dealer, you, dealer, then the
// flop — one card after the other; yours and the flop turn face up, the dealer's stay face down,
// turn and river are empty places. The round then waits for your ONE decision — the buttons
// belong to the flow (`HoldemDealerGame`), the board is not an input. CALL: turn and river
// arrive, then the dealer's cards turn over; then both hands and the readout. FOLD: your cards
// are laid aside and nothing else moves.
//
// AFTER A FOLD ONLY WHAT WAS PLAYED (docs/RULES.md rule 16 — the same rule as video poker's
// undrawn cards). The server's answer carries all nine cards; they belong on the proof page.
// "What would have come" is a near miss, so this module reads turn, river, the dealer's cards
// and the seven-card hands ONLY when the player called — even if a transcript carried them after
// a fold. The hand next to "You" is then the hand with the flop. `scripts/check-reveals.mjs`
// plays every fold with and without those cards and wants the same DOM.
//
// Every frame is a pure function of (transcript, elapsed time): one rAF timeline. A card's face
// is written into the DOM only in the moment it turns towards the player; the hands, the result
// and the readout are empty until the final frame.
//
// INCREMENTAL: two steps — the deal (1) and the decision (2). `play(o, { from: 1 })` on the
// session that stands on the board keeps the dealt table and animates only the decision.
//
// Fairness (docs/RULES.md, rule 16): every card moves with the same timing whatever it is; the
// hands, the result, the multiplier and the payout are read from the transcript, never evaluated
// here; a loss is shown as a loss at the same pace. Text through `ctx.text(...)`, colours through
// the theme tokens (plus one card red). Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'holdem-dealer',
  mechanic: 'session',
  strings: [
    'reveal.won', 'result.lost', 'result.back', 'reveal.capped',
    'reveal.holdem.title', 'reveal.holdem.idle', 'reveal.holdem.dealer', 'reveal.holdem.you',
    'reveal.holdem.decide', 'reveal.holdem.qualifies', 'reveal.holdem.notQualified',
    'reveal.holdem.result.win', 'reveal.holdem.result.loss', 'reveal.holdem.result.tie',
    'reveal.holdem.result.noQualify', 'reveal.holdem.folded', 'reveal.holdem.timedOut',
    'hd.hand.highCard', 'hd.hand.pair', 'hd.hand.twoPair', 'hd.hand.threeOfAKind', 'hd.hand.straight',
    'hd.hand.flush', 'hd.hand.fullHouse', 'hd.hand.fourOfAKind', 'hd.hand.straightFlush', 'hd.hand.royalFlush',
  ],

  mount(root, ctx) {
    const C = 'sca-holdem-dealer';
    const DEAL_T0 = 40, DEAL_GAP = 140, FLY = 240, FLIP = 280;   // deal: one card after the other
    const DECIDE_PAUSE = 220;                                     // replaying a finished round: a breath before the decision
    const CALL_LEAD = 120, STREET_GAP = 300;                      // call: turn, then river
    const DEALER_LEAD = 260, DEALER_GAP = 160;                    // then the dealer's cards turn over
    const FOLD_MS = 360;                                          // fold: your cards are laid aside
    const OUT_LEAD = 160, OUTRO_MS = 380;                         // readout fades in after the last move
    const COLLECT = 240;                                          // a new round first clears the old table
    const W = 13.6, H = 19, GAP = 2.2;
    const LEFT_BOARD = (100 - (5 * W + 4 * GAP)) / 2;
    const LEFT_PAIR = (100 - (2 * W + GAP)) / 2;
    const TOP = { d: 12.5, b: 35.5, p: 58.5 };
    // The nine places: 0–1 you, 2–3 dealer, 4–6 flop, 7 turn, 8 river (the server's card order).
    const SLOTS = [
      { row: 'p', col: 0 }, { row: 'p', col: 1 },
      { row: 'd', col: 0 }, { row: 'd', col: 1 },
      { row: 'b', col: 0 }, { row: 'b', col: 1 }, { row: 'b', col: 2 }, { row: 'b', col: 3 }, { row: 'b', col: 4 },
    ];
    const DEAL_ORDER = [0, 2, 1, 3, 4, 5, 6];
    const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const SUITS = ['♠', '♥', '♦', '♣'];
    const HANDS = ['highCard', 'pair', 'twoPair', 'threeOfAKind', 'straight', 'flush', 'fullHouse', 'fourOfAKind', 'straightFlush', 'royalFlush'];
    const RESULTS = ['win', 'loss', 'tie', 'noQualify'];

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;--card-red:#c8283d;user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums}
.${C} .${C}-hd{position:absolute;left:5%;right:5%;top:3.5%;display:flex;justify-content:space-between;align-items:baseline;line-height:1.2;white-space:nowrap}
.${C} .${C}-hd-l{font-size:calc(var(--u)*3.4);color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
.${C} .${C}-spot{position:absolute;width:${W}%;height:${H}%;box-sizing:border-box;border:1px dashed var(--line);border-radius:calc(var(--u)*1.6)}
.${C} .${C}-card{position:absolute;width:${W}%;height:${H}%;perspective:calc(var(--u)*160);opacity:0;will-change:transform,opacity}
.${C} .${C}-flip{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform}
.${C} .${C}-face{position:absolute;inset:0;box-sizing:border-box;border-radius:calc(var(--u)*1.6);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.${C} .${C}-front{background:var(--fg);color:var(--night);border:calc(var(--u)*.45) solid var(--fg);display:grid;place-items:center}
.${C} .${C}-front.${C}-red{color:var(--card-red)}
.${C} .${C}-back{background:repeating-linear-gradient(45deg,rgba(var(--accent-rgb)/.16) 0 calc(var(--u)*.7),transparent calc(var(--u)*.7) calc(var(--u)*1.7)),var(--panel-strong);border:1px solid var(--line);transform:rotateY(180deg)}
.${C} .${C}-back:after{content:"";position:absolute;inset:9%;border:1px solid rgba(var(--accent-rgb)/.25);border-radius:calc(var(--u)*1)}
.${C} .${C}-idx{position:absolute;left:8%;top:5%;display:flex;flex-direction:column;align-items:center;font-size:calc(var(--u)*3.9);font-weight:800;line-height:.95;letter-spacing:-.04em}
.${C} .${C}-idx-s{font-size:calc(var(--u)*3.1);margin-top:calc(var(--u)*.3)}
.${C} .${C}-pip{font-size:calc(var(--u)*8);line-height:1;margin-top:calc(var(--u)*2.2)}
.${C} .${C}-lbl{position:absolute;left:4%;transform:translateY(-50%);font-size:calc(var(--u)*3.1);line-height:1.2;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.${C} .${C}-hand{position:absolute;right:3%;transform:translateY(-50%);font-size:calc(var(--u)*3.1);font-weight:700;line-height:1.15}
.${C} .${C}-qual{display:block;font-size:calc(var(--u)*2.7);font-weight:500;color:var(--muted);margin-top:calc(var(--u)*.4)}
.${C} .${C}-status{position:absolute;left:5%;right:5%;top:83%;text-align:center;font-size:calc(var(--u)*3.4);line-height:1.3;color:var(--muted)}
.${C} .${C}-readout{position:absolute;left:0;right:0;top:80.5%;text-align:center;opacity:0}
.${C} .${C}-head{font-size:calc(var(--u)*4.4);font-weight:800;line-height:1.15}
.${C} .${C}-line{font-size:calc(var(--u)*3.9);font-weight:600;line-height:1.2;margin-top:calc(var(--u)*.5)}
.${C} .${C}-sep{color:var(--muted);font-weight:400}
.${C} .${C}-fiat{font-size:calc(var(--u)*3);line-height:1.2;margin-top:calc(var(--u)*.3);color:var(--muted)}
.${C} .${C}-note{font-size:calc(var(--u)*2.9);line-height:1.2;margin-top:calc(var(--u)*.4);color:var(--muted)}
.${C}.${C}-win .${C}-head,.${C}.${C}-win .${C}-res{color:var(--accent)}
.${C}.${C}-win .${C}-card[data-row="p"] .${C}-front{border-color:var(--accent)}
.${C}.${C}-push .${C}-res{color:var(--muted)}
.${C}.${C}-loss .${C}-res{color:var(--red)}
.${C}.${C}-loss .${C}-head,.${C}.${C}-loss .${C}-mult{color:var(--muted)}
@media (prefers-reduced-motion:reduce){.${C} *{transition:none!important}}
`;
    const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
    const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const put = (node, text) => { if (node.textContent !== text) node.textContent = text; };
    const isCard = (k) => Number.isInteger(k) && k >= 0 && k <= 51;
    const handName = (cat) => (HANDS.indexOf(cat) >= 0 ? ctx.text('hd.hand.' + cat) : '');
    const left = (s) => (s.row === 'b' ? LEFT_BOARD : LEFT_PAIR) + s.col * (W + GAP);

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const wrap = el('div', C);
    const hd = el('div', C + '-hd');
    const hdL = el('div', C + '-hd-l', ''); const hdR = el('div', C + '-hd-r', '');
    hd.appendChild(hdL); hd.appendChild(hdR);
    wrap.appendChild(hd);

    // Row captions (static) and the hands (empty until the final frame — a hand is a result).
    const lblD = el('div', C + '-lbl'); lblD.style.top = (TOP.d + H / 2) + '%';
    const lblP = el('div', C + '-lbl'); lblP.style.top = (TOP.p + H / 2) + '%';
    const handD = el('div', C + '-hand'); handD.style.top = (TOP.d + H / 2) + '%'; handD.style.left = (LEFT_PAIR + 2 * W + GAP + 2.5) + '%';
    const handDName = el('span', C + '-hname'); const handDQual = el('span', C + '-qual');
    handD.appendChild(handDName); handD.appendChild(handDQual);
    const handP = el('div', C + '-hand'); handP.style.top = (TOP.p + H / 2) + '%'; handP.style.left = (LEFT_PAIR + 2 * W + GAP + 2.5) + '%';
    wrap.appendChild(lblD); wrap.appendChild(lblP); wrap.appendChild(handD); wrap.appendChild(handP);

    const cards = SLOTS.map((s) => {
      const spot = el('div', C + '-spot');
      spot.style.left = left(s).toFixed(3) + '%'; spot.style.top = TOP[s.row] + '%';
      const card = el('div', C + '-card');
      card.dataset.row = s.row;
      card.style.left = left(s).toFixed(3) + '%'; card.style.top = TOP[s.row] + '%';
      const flip = el('div', C + '-flip');
      const front = el('div', C + '-face ' + C + '-front');
      const idx = el('div', C + '-idx');
      const idxR = el('span', C + '-idx-r'); const idxS = el('span', C + '-idx-s');
      idx.appendChild(idxR); idx.appendChild(idxS);
      const pip = el('div', C + '-pip');
      front.appendChild(idx); front.appendChild(pip);
      flip.appendChild(front); flip.appendChild(el('div', C + '-face ' + C + '-back'));
      card.appendChild(flip);
      wrap.appendChild(spot); wrap.appendChild(card);
      return { card, flip, front, idxR, idxS, pip, st: { pres: 0, angle: 180, face: -1, dim: 0, drop: 0 } };
    });

    const status = el('div', C + '-status');
    const readout = el('div', C + '-readout');
    const outHead = el('div', C + '-head');
    const line = el('div', C + '-line');
    const outMult = el('span', C + '-mult'); const outSep = el('span', C + '-sep'); const outRes = el('span', C + '-res');
    line.appendChild(outMult); line.appendChild(outSep); line.appendChild(outRes);
    const outFiat = el('div', C + '-fiat'); const outNote = el('div', C + '-note');
    readout.appendChild(outHead); readout.appendChild(line); readout.appendChild(outFiat); readout.appendChild(outNote);
    wrap.appendChild(status); wrap.appendChild(readout);
    root.appendChild(wrap);

    const measure = () => {
      const r = root.getBoundingClientRect();
      const side = Math.min(r.width, r.height) || 360;
      wrap.style.setProperty('--u', (side / 100).toFixed(3) + 'px');
    };
    measure();
    let ro = null;
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(root); }

    let raf = 0, pending = null;
    let shown = null;          // { key, n } — the session and protocol step standing on the board

    // Write a card's face — or clear it. Only touches the DOM when the face changes.
    const setFace = (c, k) => {
      if (c.st.face === k) return;
      c.st.face = k;
      if (!isCard(k)) { c.idxR.textContent = ''; c.idxS.textContent = ''; c.pip.textContent = ''; c.front.classList.remove(C + '-red'); return; }
      const suit = Math.floor(k / 13);
      c.idxR.textContent = RANKS[k % 13];
      c.idxS.textContent = SUITS[suit];
      c.pip.textContent = SUITS[suit];
      c.front.classList.toggle(C + '-red', suit === 1 || suit === 2);
    };
    // pres 0 = not on the table (only the empty place shows), 1 = lying there; angle 180 = back to
    // the player, 0 = face to the player; dim/drop = laid aside (fold).
    const pose = (c, pres, angle, dim, drop) => {
      c.st.pres = pres; c.st.angle = angle; c.st.dim = dim; c.st.drop = drop;
      c.card.style.opacity = (pres * (1 - 0.55 * dim)).toFixed(3);
      c.card.style.transform = 'translateY(calc(var(--u)*' + ((1 - pres) * -5 + drop * 2.2).toFixed(3) + '))';
      c.flip.style.transform = 'rotateY(' + angle.toFixed(2) + 'deg)';
    };
    const captions = () => {
      put(hdL, ctx.text('reveal.holdem.title'));
      put(lblD, ctx.text('reveal.holdem.dealer'));
      put(lblP, ctx.text('reveal.holdem.you'));
    };
    const clearHands = () => { put(handP, ''); put(handDName, ''); put(handDQual, ''); };
    const clearReadout = () => {
      put(outHead, ''); put(outMult, ''); put(outSep, ''); put(outRes, ''); put(outFiat, ''); put(outNote, '');
      readout.style.opacity = '0'; readout.style.transform = '';
    };
    const cancel = () => {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (pending) { const r = pending; pending = null; r(); }
    };

    // The frame for elapsed time t (ms) — a pure function of (outcome, t). `prev`: the table
    // standing when this round starts; a new round clears it first (COLLECT) instead of snapping
    // to an empty table (rule 7: from the picture on screen).
    const timeline = (o, prev) => {
      const live = o.status === 'active';
      const called = !live && o.action === 'call';
      // Without a readable call everything not played stays face down (`called` is false), but
      // only a real fold lays your cards aside and says "Folded".
      const folded = !live && o.action === 'fold';
      const pick = (a, i) => (Array.isArray(a) && isCard(a[i]) ? a[i] : -1);
      // House rule: turn, river and the dealer's cards are read ONLY after a call.
      const code = [
        pick(o.player, 0), pick(o.player, 1),
        called ? pick(o.dealer, 0) : -1, called ? pick(o.dealer, 1) : -1,
        pick(o.flop, 0), pick(o.flop, 1), pick(o.flop, 2),
        called && isCard(o.turn) ? o.turn : -1, called && isCard(o.river) ? o.river : -1,
      ];
      const collect = prev && prev.some((p) => p.pres > 0.01) ? COLLECT : 0;
      const dealT0 = collect + DEAL_T0;
      const arrive = SLOTS.map(() => Infinity);
      DEAL_ORDER.forEach((slot, k) => { arrive[slot] = dealT0 + k * DEAL_GAP; });
      const dealEnd = dealT0 + (DEAL_ORDER.length - 1) * DEAL_GAP + FLY + FLIP;
      const decideAt = live ? dealEnd : dealEnd + DECIDE_PAUSE;
      if (called) { arrive[7] = decideAt + CALL_LEAD; arrive[8] = arrive[7] + STREET_GAP; }
      const riverEnd = decideAt + CALL_LEAD + STREET_GAP + FLY + FLIP;
      const dealerFlip = [riverEnd + DEALER_LEAD, riverEnd + DEALER_LEAD + DEALER_GAP];
      const outAt = (called ? dealerFlip[1] + FLIP : decideAt + FOLD_MS) + OUT_LEAD;
      const total = live ? dealEnd + 60 : outAt + OUTRO_MS;
      let filled = false;
      const render = (t) => {
        for (let i = 0; i < SLOTS.length; i++) {
          const c = cards[i];
          let pres = 0, angle = 180, face = -1, dim = 0, drop = 0;
          if (collect && t < collect) {
            const q = easeIO(clamp01(t / collect));
            const p = prev[i];
            pres = p.pres * (1 - q); angle = p.angle; face = p.face; dim = p.dim; drop = p.drop;
          } else if (t >= arrive[i]) {
            pres = easeOut(clamp01((t - arrive[i]) / FLY));
            // Yours, the flop, turn and river turn up as they land; the dealer's only after a call.
            const turnAt = i === 2 || i === 3 ? (called ? dealerFlip[i - 2] : Infinity) : arrive[i] + FLY;
            const f = easeIO(clamp01((t - turnAt) / FLIP));
            angle = 180 - 180 * f;
            face = f >= 0.5 ? code[i] : -1;
            if (folded && i < 2) { dim = easeIO(clamp01((t - decideAt) / FOLD_MS)); drop = dim; }
          }
          setFace(c, face);
          pose(c, pres, angle, dim, drop);
        }
        if (live) {
          // The dealt table waits for the decision: the hand with the flop is the picture on the
          // table, not a result.
          put(handP, t >= dealEnd ? handName(o.flopHand) : '');
          put(status, t >= dealEnd ? ctx.text('reveal.holdem.decide') : '');
          return;
        }
        put(status, '');
        const po = clamp01((t - outAt) / OUTRO_MS);
        if (po > 0 && !filled) { filled = true; fillResult(o, called); }   // hands and readout enter the DOM only now
        readout.style.opacity = po.toFixed(3);
        readout.style.transform = 'translateY(calc(var(--u)*' + (1.5 * (1 - po)).toFixed(3) + '))';
      };
      return { render, total, live, n: live ? 1 : 2, tResume: decideAt };
    };
    const fillResult = (o, called) => {
      if (called) {
        put(handP, handName(o.playerHand));
        put(handDName, handName(o.dealerHand));
        put(handDQual, o.dealerQualified === true ? ctx.text('reveal.holdem.qualifies') : o.dealerQualified === false ? ctx.text('reveal.holdem.notQualified') : '');
        put(outHead, RESULTS.indexOf(o.result) >= 0 ? ctx.text('reveal.holdem.result.' + o.result) : '');
        put(outMult, ctx.fmt.mult(o.multiplierBps));
        put(outSep, ' · ');
        put(outRes, o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost(o.payoutLamports));
        put(outFiat, (o.win && ctx.fmt.fiat(o.payoutLamports)) || '');
      } else if (o.action === 'fold') {
        // Folded: only the hand that was on the table, no seven-card hand, nothing of the dealer.
        put(handP, handName(o.flopHand));
        put(outHead, ctx.text('reveal.holdem.folded'));
      } else {
        // A finished round without a readable decision: say only what was paid.
        put(outRes, o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost(o.payoutLamports));
      }
      const notes = [];
      if (o.timedOut) notes.push(ctx.text('reveal.holdem.timedOut'));
      if (o.capped) notes.push(ctx.text('reveal.capped'));
      put(outNote, notes.join(' · '));
    };

    const play = (outcome, opts) => {
      cancel();
      const o = outcome || {};
      const reduced = !!(opts && opts.reducedMotion);
      root.dataset.state = 'playing';
      measure();
      wrap.classList.remove(C + '-win', C + '-loss', C + '-push');
      clearReadout();
      clearHands();
      put(status, '');
      captions();
      const from = opts && Number.isInteger(opts.from) ? Math.max(0, opts.from) : 0;
      const inc = from >= 1 && !!shown && shown.key === o.sessionId && shown.n === from;
      const R = timeline(o, inc || reduced ? null : cards.map((c) => ({ ...c.st })));
      const skip = inc ? (from < R.n ? R.tResume : Math.max(0, R.total - OUTRO_MS - 200)) : 0;
      const finish = () => {
        R.render(R.total);
        if (!R.live) wrap.classList.add(o.win ? C + '-win' : o.hit ? C + '-push' : C + '-loss');
        shown = { key: o.sessionId, n: R.n };
        root.dataset.state = 'done';
        const r = pending; pending = null; if (r) r();
      };
      return new Promise((resolve) => {
        pending = resolve;
        if (reduced) { finish(); return; }
        const t0 = performance.now() - skip;
        R.render(skip);
        const step = (now) => {
          const t = now - t0;
          R.render(Math.min(t, R.total));
          if (t < R.total) { raf = requestAnimationFrame(step); return; }
          raf = 0; finish();
        };
        raf = requestAnimationFrame(step);
      });
    };

    const reset = () => {
      cancel();
      shown = null;
      wrap.classList.remove(C + '-win', C + '-loss', C + '-push');
      for (const c of cards) { setFace(c, -1); pose(c, 0, 180, 0, 0); }
      captions();
      put(hdR, '');
      clearHands();
      put(status, ctx.hint || ctx.text('reveal.holdem.idle'));
      clearReadout();
      root.dataset.state = 'idle';
    };

    reset();
    return {
      play,
      reset,
      destroy() { cancel(); if (ro) ro.disconnect(); ro = null; },
    };
  },
};
