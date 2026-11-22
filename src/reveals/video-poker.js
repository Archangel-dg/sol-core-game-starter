// Sol-Core reveal — video-poker (session, Table).
//
// Five cards lie face down in a row. DEAL: they turn face up one after the other, left to
// right. HOLD: the player taps the cards to keep — the board is the input (`setHolds`, contract
// in `src/lib/reveal.ts`), a HELD marker sits under every held card. DRAW: the held cards stay
// lifted, every other card turns face down and comes back as the next card of the draw pile —
// left to right, the same order the server uses. Then the readout fades in: the hand, the
// multiplier, won / lost / back. Its nodes are EMPTY before that.
//
// Every frame is a pure function of (transcript, elapsed time): one rAF timeline. A card's face
// is written into the DOM only in the moment it turns towards the player — the new cards of the
// draw are not in the document before they show (rule 16.2).
//
// INCREMENTAL: the transcript has two steps — the deal (1) and the draw (2). `play(o, { from: 1 })`
// on the session that stands on the board keeps the dealt hand and animates only the draw.
//
// Fairness (docs/RULES.md, rule 16): every card turns with the same timing whatever it is; the
// hand, the multiplier and the payout are read from the transcript, never evaluated here; a
// losing hand is shown as a loss at the same pace. Text through `ctx.text(...)`, colours through
// the theme tokens (plus one card red). Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'video-poker',
  mechanic: 'session',
  strings: [
    'reveal.won', 'result.lost', 'result.back', 'reveal.capped',
    'reveal.videoPoker.title', 'reveal.videoPoker.idle', 'reveal.videoPoker.card', 'reveal.videoPoker.auto',
    'session.vp.held', 'session.vp.holdHint', 'session.vp.dealt',
    'vp.hand.royalFlush', 'vp.hand.straightFlush', 'vp.hand.fourOfAKind', 'vp.hand.fullHouse', 'vp.hand.flush',
    'vp.hand.straight', 'vp.hand.threeOfAKind', 'vp.hand.twoPair', 'vp.hand.highPair', 'vp.hand.highPair.10',
    'vp.hand.highPair.11', 'vp.hand.highPair.12', 'vp.hand.highPair.13', 'vp.hand.highPair.14', 'vp.hand.none',
  ],

  mount(root, ctx) {
    const C = 'sca-video-poker';
    const N = 5;
    const DEAL_T0 = 40, DEAL_GAP = 105, FLIP = 300;   // deal: one card after the other
    const MARK_GAP = 120, DISC_LEAD = 260;             // held markers, then the discard starts
    const DISC_GAP = 70, DRAW_GAP = 150, DRAW_LEAD = 80;
    const OUT_LEAD = 160, OUTRO_MS = 380;              // readout fades in after the last card
    const COLLECT = 220;                               // a new round first turns the old cards down
    const W = 17.6, GAP = 1.8, CARD_TOP = 21, CARD_H = 25.6, LIFT = 2.4;
    const LEFT = (100 - (N * W + (N - 1) * GAP)) / 2;
    const BTN_H = CARD_H + 7;                                     // card + the HELD marker below it
    const FLIP_H = ((CARD_H / BTN_H) * 100).toFixed(3);
    const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const SUITS = ['♠', '♥', '♦', '♣'];
    const HANDS = ['royalFlush', 'straightFlush', 'fourOfAKind', 'fullHouse', 'flush', 'straight', 'threeOfAKind', 'twoPair', 'highPair', 'none'];

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;--card-red:#c8283d;user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums}
.${C} .${C}-hd{position:absolute;left:5%;right:5%;top:5%;display:flex;justify-content:space-between;align-items:baseline;line-height:1.2;white-space:nowrap}
.${C} .${C}-hd-l{font-size:calc(var(--u)*3.4);color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
.${C} .${C}-hd-r{font-size:calc(var(--u)*3.2);color:var(--muted)}
.${C} .${C}-card{position:absolute;top:${CARD_TOP}%;width:${W}%;height:${BTN_H}%;margin:0;padding:0;border:0;background:none;font:inherit;color:inherit;cursor:default;perspective:calc(var(--u)*160);-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.${C} .${C}-card:focus{outline:none}
.${C} .${C}-card:focus-visible .${C}-flip{outline:2px solid var(--accent);outline-offset:2px;border-radius:calc(var(--u)*1.6)}
.${C} .${C}-card[data-hold="on"]{cursor:pointer}
.${C} .${C}-card[data-hold="on"]:hover .${C}-front{box-shadow:0 0 0 calc(var(--u)*.5) rgba(var(--accent-rgb)/.55)}
.${C} .${C}-card[data-hold="on"]:active .${C}-flip{scale:.96}
.${C} .${C}-flip{position:absolute;left:0;right:0;top:0;height:${FLIP_H}%;transform-style:preserve-3d;will-change:transform}
.${C} .${C}-face{position:absolute;inset:0;box-sizing:border-box;border-radius:calc(var(--u)*1.6);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.${C} .${C}-front{background:var(--fg);color:var(--night);border:calc(var(--u)*.45) solid var(--fg);display:grid;place-items:center;transition:box-shadow .18s ease,border-color .18s ease}
.${C} .${C}-front.${C}-red{color:var(--card-red)}
.${C} .${C}-back{background:repeating-linear-gradient(45deg,rgba(var(--accent-rgb)/.16) 0 calc(var(--u)*.7),transparent calc(var(--u)*.7) calc(var(--u)*1.7)),var(--panel-strong);border:1px solid var(--line);transform:rotateY(180deg)}
.${C} .${C}-back:after{content:"";position:absolute;inset:9%;border:1px solid rgba(var(--accent-rgb)/.25);border-radius:calc(var(--u)*1)}
.${C} .${C}-idx{position:absolute;left:8%;top:5%;display:flex;flex-direction:column;align-items:center;font-size:calc(var(--u)*4.3);font-weight:800;line-height:.95;letter-spacing:-.04em}
.${C} .${C}-idx-s{font-size:calc(var(--u)*3.4);margin-top:calc(var(--u)*.3)}
.${C} .${C}-pip{font-size:calc(var(--u)*9.5);line-height:1;margin-top:calc(var(--u)*2.5)}
.${C} .${C}-mark{position:absolute;left:2%;right:2%;bottom:0;height:calc(var(--u)*4.8);display:grid;place-items:center;border-radius:calc(var(--u)*1.2);font-size:calc(var(--u)*2.7);font-weight:800;letter-spacing:.04em;white-space:nowrap;overflow:hidden;color:var(--night);background:var(--accent);opacity:0;transition:opacity .15s ease}
.${C} .${C}-card.${C}-held .${C}-mark{opacity:1}
.${C} .${C}-card.${C}-held .${C}-front{border-color:var(--accent)}
.${C} .${C}-status{position:absolute;left:5%;right:5%;top:58%;text-align:center;font-size:calc(var(--u)*3.4);line-height:1.3;color:var(--muted)}
.${C} .${C}-readout{position:absolute;left:0;right:0;top:61%;text-align:center;opacity:0}
.${C} .${C}-hand{font-size:calc(var(--u)*5.6);font-weight:800;line-height:1.1;letter-spacing:.01em}
.${C} .${C}-mult{font-size:calc(var(--u)*4.6);font-weight:700;line-height:1.15;margin-top:calc(var(--u)*.6)}
.${C} .${C}-res{font-size:calc(var(--u)*4);font-weight:600;line-height:1.2;margin-top:calc(var(--u)*.6)}
.${C} .${C}-fiat{font-size:calc(var(--u)*3.1);line-height:1.2;margin-top:calc(var(--u)*.4);color:var(--muted)}
.${C} .${C}-note{font-size:calc(var(--u)*3);line-height:1.2;margin-top:calc(var(--u)*.6);color:var(--muted)}
.${C}.${C}-win .${C}-hand,.${C}.${C}-win .${C}-res{color:var(--accent)}
.${C}.${C}-win .${C}-front{border-color:var(--accent)}
.${C}.${C}-push .${C}-res{color:var(--muted)}
.${C}.${C}-loss .${C}-res{color:var(--red)}
.${C}.${C}-loss .${C}-hand,.${C}.${C}-loss .${C}-mult{color:var(--muted)}
.${C}.${C}-loss .${C}-front{opacity:.72}
@media (prefers-reduced-motion:reduce){.${C} *{transition:none!important}}
`;
    const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
    const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const isCard = (k) => Number.isInteger(k) && k >= 0 && k <= 51;
    const handName = (cat, minPairRank) => {
      const c = HANDS.indexOf(cat) >= 0 ? cat : 'none';
      if (c !== 'highPair') return ctx.text('vp.hand.' + c);
      const r = Number(minPairRank) || 11;
      if (r >= 10 && r <= 14) return ctx.text('vp.hand.highPair.' + r);
      return ctx.text('vp.hand.highPair', { rank: r === 14 ? 'A' : RANKS[r - 1] || String(r) });
    };

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const wrap = el('div', C);
    const hd = el('div', C + '-hd');
    const hdL = el('div', C + '-hd-l', ''); const hdR = el('div', C + '-hd-r', '');
    hd.appendChild(hdL); hd.appendChild(hdR);
    const status = el('div', C + '-status');
    const readout = el('div', C + '-readout');
    const outHand = el('div', C + '-hand'); const outMult = el('div', C + '-mult'); const outRes = el('div', C + '-res');
    const outFiat = el('div', C + '-fiat'); const outNote = el('div', C + '-note');
    readout.appendChild(outHand); readout.appendChild(outMult); readout.appendChild(outRes); readout.appendChild(outFiat); readout.appendChild(outNote);
    wrap.appendChild(hd);

    // Five card buttons — the board IS the input in the hold phase (see `setHolds`). The label is
    // the position and nothing else; what the card is stands on its face once it shows.
    const cards = [];
    for (let i = 0; i < N; i++) {
      const b = el('button', C + '-card');
      b.type = 'button';
      b.disabled = true;
      b.dataset.i = String(i);
      b.style.left = (LEFT + i * (W + GAP)).toFixed(3) + '%';
      b.setAttribute('aria-label', ctx.text('reveal.videoPoker.card', { n: i + 1 }));
      const flip = el('div', C + '-flip');
      const front = el('div', C + '-face ' + C + '-front');
      const idx = el('div', C + '-idx');
      const idxR = el('span', C + '-idx-r'); const idxS = el('span', C + '-idx-s');
      idx.appendChild(idxR); idx.appendChild(idxS);
      const pip = el('div', C + '-pip');
      front.appendChild(idx); front.appendChild(pip);
      flip.appendChild(front); flip.appendChild(el('div', C + '-face ' + C + '-back'));
      const mark = el('div', C + '-mark');
      b.appendChild(flip); b.appendChild(mark);
      b.addEventListener('click', onCardClick);
      wrap.appendChild(b);
      cards.push({ b, flip, front, idxR, idxS, pip, mark, face: -1, held: false });
    }
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
    let phase = 'idle';        // idle | play | hold | done
    let holdOpts = null;       // what the flow currently allows (RevealHoldOptions)

    // Write a card's face — or clear it. Only called when the face changes.
    const setFace = (c, k) => {
      if (c.face === k) return;
      c.face = k;
      if (!isCard(k)) { c.idxR.textContent = ''; c.idxS.textContent = ''; c.pip.textContent = ''; c.front.classList.remove(C + '-red'); return; }
      const suit = Math.floor(k / 13);
      c.idxR.textContent = RANKS[k % 13];
      c.idxS.textContent = SUITS[suit];
      c.pip.textContent = SUITS[suit];
      c.front.classList.toggle(C + '-red', suit === 1 || suit === 2);
    };
    // angle 180 = back to the player, 0 = face to the player.
    const pose = (c, angle, lift) => {
      c.flip.style.transform = 'translateY(calc(var(--u)*' + (-lift).toFixed(3) + ')) rotateY(' + angle.toFixed(2) + 'deg)';
    };
    const setHeld = (c, on) => {
      c.held = on;
      c.b.classList.toggle(C + '-held', on);
      c.mark.textContent = on ? ctx.text('session.vp.held') : '';
    };
    const clearReadout = () => {
      outHand.textContent = ''; outMult.textContent = ''; outRes.textContent = ''; outFiat.textContent = ''; outNote.textContent = '';
      readout.style.opacity = '0'; readout.style.transform = '';
    };
    const cancel = () => {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (pending) { const r = pending; pending = null; r(); }
    };

    // ── The hold channel (contract: RevealHoldOptions in lib/reveal.ts) ────────
    // Only the open hand of a running round can be tapped. A tap REPORTS, it does not draw:
    // the HELD marker comes with the flow's next `setHolds`, so the board can never show a
    // selection other than the one the draw sends.
    function holdable() {
      return phase === 'hold' && !!holdOpts && holdOpts.enabled === true;
    }
    function applyHolds() {
      const on = holdable();
      const held = phase === 'hold' && holdOpts && Array.isArray(holdOpts.held) ? holdOpts.held : null;
      for (let i = 0; i < N; i++) {
        const c = cards[i];
        c.b.disabled = !on;
        if (on) c.b.dataset.hold = 'on'; else delete c.b.dataset.hold;
        if (phase === 'hold') {
          const h = !!held && held.indexOf(i) >= 0;
          setHeld(c, h);
          c.b.setAttribute('aria-pressed', h ? 'true' : 'false');
          pose(c, 0, h ? LIFT : 0);
        } else {
          c.b.removeAttribute('aria-pressed');
        }
      }
    }
    function onCardClick(ev) {
      const i = Number(ev.currentTarget.dataset.i);
      if (!holdable() || !(i >= 0 && i < N)) return;
      holdOpts.onToggle(i);
    }

    // Build the frame for elapsed time t (ms) — pure function of (outcome, t).
    // `prev`: the faces standing when this round starts. A new round does not snap the old hand
    // away — it turns it face down first (COLLECT), then deals (rule 7: from the picture on screen).
    const timeline = (o, prev) => {
      const live = o.status === 'active';
      const dealt = Array.isArray(o.dealt) ? o.dealt.slice(0, N) : [];
      const hand = Array.isArray(o.hand) && o.hand.length === N ? o.hand : dealt;
      const holds = live ? [] : (Array.isArray(o.holds) ? o.holds.filter((n) => Number.isInteger(n) && n >= 0 && n < N) : []);
      const isHeld = (i) => holds.indexOf(i) >= 0;
      const collect = prev && prev.some(isCard) ? COLLECT : 0;
      const dealT0 = collect + DEAL_T0;
      const dealEnd = dealT0 + (N - 1) * DEAL_GAP + FLIP;
      const markAt = dealEnd + MARK_GAP;
      const discAt = markAt + DISC_LEAD;
      // The discarded positions, left to right — the order the draw pile fills them.
      const disc = [];
      for (let i = 0; i < N; i++) if (!isHeld(i)) disc.push(i);
      const discStart = (i) => discAt + disc.indexOf(i) * DISC_GAP;
      const drawAt = discAt + Math.max(0, disc.length - 1) * DISC_GAP + FLIP + DRAW_LEAD;
      const drawStart = (i) => drawAt + disc.indexOf(i) * DRAW_GAP;
      const drawEnd = disc.length ? drawAt + (disc.length - 1) * DRAW_GAP + FLIP : markAt + 300;
      const outAt = drawEnd + OUT_LEAD;
      const total = live ? dealEnd + 60 : outAt + OUTRO_MS;
      const render = (t) => {
        for (let i = 0; i < N; i++) {
          const c = cards[i];
          const k0 = dealt[i];
          const d = easeIO(clamp01((t - (dealT0 + i * DEAL_GAP)) / FLIP));
          let angle = 180 - 180 * d;
          let face = d >= 0.5 ? k0 : -1;
          if (collect && t < collect && isCard(prev[i])) {
            const q = easeIO(clamp01(t / collect));
            angle = 180 * q;
            face = q < 0.5 ? prev[i] : -1;
          }
          const showMark = !live && t >= markAt && isHeld(i);
          if (!live && !isHeld(i) && t >= discStart(i)) {
            const g = easeIO(clamp01((t - discStart(i)) / FLIP));
            if (t < drawStart(i)) {
              angle = 180 * g;
              face = g < 0.5 ? k0 : -1;
            } else {
              const h = easeIO(clamp01((t - drawStart(i)) / FLIP));
              angle = 180 - 180 * h;
              face = h >= 0.5 ? hand[i] : -1;
            }
          }
          setFace(c, face);
          if (c.held !== showMark) setHeld(c, showMark);
          pose(c, angle, showMark ? LIFT : 0);
        }
        // The dealt hand's name stands once the deal is complete — it is the picture on the
        // table, not a result. During the draw the line is empty.
        if (live && t >= dealEnd) {
          const cat = typeof o.category === 'string' ? o.category : 'none';
          status.textContent = cat !== 'none'
            ? ctx.text('session.vp.dealt', { hand: handName(cat, o.minPairRank) })
            : ctx.text('session.vp.holdHint');
        } else status.textContent = '';
        if (!live) {
          const po = clamp01((t - outAt) / OUTRO_MS);
          if (po > 0 && !outRes.textContent) fillReadout(o);   // the readout enters the DOM only when it starts to fade in
          readout.style.opacity = po.toFixed(3);
          readout.style.transform = 'translateY(calc(var(--u)*' + (1.5 * (1 - po)).toFixed(3) + '))';
        }
      };
      return { render, total, live, n: live ? 1 : 2, tResume: markAt };
    };
    const fillReadout = (o) => {
      outHand.textContent = handName(o.category, o.minPairRank);
      outMult.textContent = ctx.fmt.mult(o.multiplierBps);
      outRes.textContent = o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost(o.payoutLamports);
      outFiat.textContent = (o.win && ctx.fmt.fiat(o.payoutLamports)) || '';
      const notes = [];
      if (o.autoDraw) notes.push(ctx.text('reveal.videoPoker.auto'));
      if (o.capped) notes.push(ctx.text('reveal.capped'));
      outNote.textContent = notes.join(' · ');
    };

    const play = (outcome, opts) => {
      cancel();
      const o = outcome || {};
      const reduced = !!(opts && opts.reducedMotion);
      root.dataset.state = 'playing';
      measure();
      wrap.classList.remove(C + '-win', C + '-loss', C + '-push');
      clearReadout();
      status.textContent = '';
      phase = 'play';
      applyHolds();
      hdL.textContent = ctx.text('reveal.videoPoker.title');
      const from = opts && Number.isInteger(opts.from) ? Math.max(0, opts.from) : 0;
      const inc = from >= 1 && !!shown && shown.key === o.sessionId && shown.n === from;
      const R = timeline(o, inc || reduced ? null : cards.map((c) => c.face));
      const skip = inc ? (from < R.n ? R.tResume : Math.max(0, R.total - OUTRO_MS - 200)) : 0;
      const finish = () => {
        R.render(R.total);
        if (!R.live) wrap.classList.add(o.win ? C + '-win' : o.hit ? C + '-push' : C + '-loss');
        shown = { key: o.sessionId, n: R.n };
        phase = R.live ? 'hold' : 'done';
        applyHolds();
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
      phase = 'idle';
      wrap.classList.remove(C + '-win', C + '-loss', C + '-push');
      for (const c of cards) { setFace(c, -1); setHeld(c, false); pose(c, 180, 0); }
      applyHolds();
      hdL.textContent = ctx.text('reveal.videoPoker.title'); hdR.textContent = '';
      status.textContent = ctx.hint || ctx.text('reveal.videoPoker.idle');
      clearReadout();
      root.dataset.state = 'idle';
    };

    reset();
    return {
      play,
      setHolds(opts) { holdOpts = opts || null; applyHolds(); },
      reset,
      destroy() { cancel(); if (ro) ro.disconnect(); ro = null; },
    };
  },
};
