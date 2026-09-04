// Sol-Core reveal — hilo (session, Interactive).
//
// The current card stands large left of centre. Per step: the guess (▲ higher / ▼ lower)
// is written under the empty slot on the right, a new card slides in face-down and flips
// to its rank. Correct ⇒ the old card shrinks into the history row, the new card takes the
// current slot and the chain multiplier ticks up. Wrong or tie ⇒ the new card turns red
// and stays; the chain ends. Then the readout fades in — its nodes are EMPTY before that.
// Every frame is a pure function of (transcript, elapsed time): one rAF timeline.
//
// INCREMENTAL: `play(o, { from })` renders the first `from` steps of the SAME session
// (`o.sessionId`) instantly and animates only the new step (or the ending).
//
// Fairness (docs/RULES.md, rule 16): every card slides and flips with the same timing
// whatever its rank; guess, rank, correct, multiplier and payout are read from the
// transcript, never recomputed; a tie is shown plainly as a loss; the final card stays up.
// Text through `ctx.text(...)`, colours through the theme tokens. Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'hilo',
  mechanic: 'session',
  strings: ['reveal.won', 'result.lost', 'reveal.hilo.title', 'reveal.hilo.idle', 'reveal.step', 'reveal.tie', 'reveal.equal', 'reveal.bustedStep', 'reveal.cashedSteps', 'reveal.capped', 'session.higher', 'session.lower'],

  mount(root, ctx) {
    const C = 'sca-hilo';
    const INTRO_MS = 380;               // start card flips face-up
    const OUTRO_MS = 380;               // readout fades in
    const STEP_BUDGET = 3200;           // all steps of a full replay aim at this (ms)
    const STEP_MIN = 620, STEP_MAX = 1250;
    const W = 28, H = 40;               // card size in % of the square
    const CUR_X = 18, IN_X = 54, OFF_X = 108, CARD_Y = 15;
    const MINI = 0.25;                  // scale of a history card
    const HIST_X = 6, HIST_Y = 66, HIST_PITCH = 8.2;
    const SUITS = ['♠', '♥', '♦', '♣'];

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums}
.${C} .${C}-hd{position:absolute;left:6%;right:6%;top:5%;display:flex;justify-content:space-between;align-items:baseline;line-height:1.2;white-space:nowrap}
.${C} .${C}-hd-l{font-size:calc(var(--u)*3.4);color:var(--muted);letter-spacing:.06em}
.${C} .${C}-hd-r{font-size:calc(var(--u)*4.4);font-weight:700;color:var(--muted)}
.${C}.${C}-live .${C}-hd-r{color:var(--fg)}
.${C} .${C}-stage{position:absolute;inset:0;perspective:calc(var(--u)*170)}
.${C} .${C}-slot{position:absolute;left:${IN_X}%;top:${CARD_Y}%;width:${W}%;height:${H}%;box-sizing:border-box;border:1px dashed var(--faint);border-radius:calc(var(--u)*2);display:grid;place-items:center;font-size:calc(var(--u)*8);color:var(--faint)}
.${C} .${C}-card{position:absolute;left:0;top:0;width:${W}%;height:${H}%;transform-style:preserve-3d;will-change:transform;opacity:0}
.${C} .${C}-face{position:absolute;inset:0;box-sizing:border-box;border-radius:calc(var(--u)*2);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.${C} .${C}-front{background:var(--fg);color:var(--night);border:calc(var(--u)*.9) solid var(--fg);display:flex;flex-direction:column;align-items:center;justify-content:center}
.${C} .${C}-back{background:var(--panel-strong);border:1px solid var(--line);transform:rotateY(180deg)}
.${C} .${C}-back:after{content:"";position:absolute;inset:9%;border:1px dashed var(--faint);border-radius:calc(var(--u)*1.2)}
.${C} .${C}-rank{font-size:calc(var(--u)*13);font-weight:700;line-height:1}
.${C} .${C}-suit{font-size:calc(var(--u)*5.5);line-height:1;margin-top:calc(var(--u)*1.2);opacity:.8}
.${C} .${C}-idx{position:absolute;left:8%;top:5%;font-size:calc(var(--u)*3.4);font-weight:700;line-height:1}
.${C} .${C}-card.${C}-ok .${C}-front{border-color:var(--accent)}
.${C} .${C}-card.${C}-bad .${C}-front{border-color:var(--red);color:var(--red)}
.${C} .${C}-guess{position:absolute;left:${IN_X}%;width:${W}%;top:57%;text-align:center;font-size:calc(var(--u)*3.6);line-height:1.3;white-space:nowrap;color:var(--fg);opacity:0}
.${C} .${C}-guess.${C}-muted{color:var(--muted);opacity:1}
.${C} .${C}-guess.${C}-tie{color:var(--red)}
.${C} .${C}-readout{position:absolute;left:0;right:0;top:79%;text-align:center;opacity:0}
.${C} .${C}-mult{font-size:calc(var(--u)*5.6);font-weight:700;line-height:1.1}
.${C} .${C}-res{font-size:calc(var(--u)*4.2);font-weight:600;line-height:1.2;margin-top:calc(var(--u)*.8)}
.${C} .${C}-fiat{font-size:calc(var(--u)*3.1);line-height:1.2;margin-top:calc(var(--u)*.5);color:var(--muted)}
.${C} .${C}-note{font-size:calc(var(--u)*3.2);line-height:1.2;margin-top:calc(var(--u)*.8);color:var(--muted)}
.${C}.${C}-win .${C}-res{color:var(--accent)}
.${C}.${C}-loss .${C}-res{color:var(--red)}
.${C}.${C}-loss .${C}-mult,.${C}.${C}-loss .${C}-hd-r{color:var(--muted)}
@media (prefers-reduced-motion:reduce){.${C} *{transition:none!important}}
`;
    const rankText = (v) => v === 1 ? 'A' : v === 11 ? 'J' : v === 12 ? 'Q' : v === 13 ? 'K' : String(v);
    // decorative suit — the server deals ranks only; chosen deterministically, all in the same ink
    const suitOf = (v, i) => SUITS[(v * 7 + i * 3) % 4];
    const clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const easeIO = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const lerp = (a, b, t) => a + (b - a) * t;
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const guessWord = (g) => g === 'higher' ? '▲ ' + ctx.text('session.higher') : g === 'lower' ? '▼ ' + ctx.text('session.lower') : g === 'equal' ? '= ' + ctx.text('reveal.equal') : '?';
    const histPitch = (count) => count > 10 ? 82 / (count - 1) : HIST_PITCH;

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const wrap = el('div', C);
    const hd = el('div', C + '-hd');
    const hdL = el('div', C + '-hd-l', ''); const hdR = el('div', C + '-hd-r', '1.00×');
    hd.appendChild(hdL); hd.appendChild(hdR);
    const stage = el('div', C + '-stage');
    const slot = el('div', C + '-slot', '?');
    stage.appendChild(slot);
    const guess = el('div', C + '-guess');
    const readout = el('div', C + '-readout');
    const outMult = el('div', C + '-mult'); const outRes = el('div', C + '-res'); const outFiat = el('div', C + '-fiat'); const outNote = el('div', C + '-note');
    readout.appendChild(outMult); readout.appendChild(outRes); readout.appendChild(outFiat); readout.appendChild(outNote);
    wrap.appendChild(hd); wrap.appendChild(stage); wrap.appendChild(guess); wrap.appendChild(readout);
    root.appendChild(wrap);

    const measure = () => {
      const r = root.getBoundingClientRect();
      const side = Math.min(r.width, r.height) || 360;
      wrap.style.setProperty('--u', (side / 100).toFixed(3) + 'px');
    };
    measure();
    let ro = null;
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(root); }

    let cards = [];            // card elements, index 0 = start card, i+1 = steps[i].nextCard
    let raf = 0, pending = null;
    let shown = null;          // { key, n } — the session and step count standing on the stage

    const makeCard = (value, i) => {
      const c = el('div', C + '-card');
      const front = el('div', C + '-face ' + C + '-front');
      front.appendChild(el('div', C + '-idx', rankText(value)));
      front.appendChild(el('div', C + '-rank', rankText(value)));
      front.appendChild(el('div', C + '-suit', suitOf(value, i)));
      c.appendChild(front); c.appendChild(el('div', C + '-face ' + C + '-back'));
      stage.appendChild(c);
      return c;
    };
    const place = (c, x, y, angle, scale, opacity) => {
      const tx = x + W * (scale - 1) / 2, ty = y + H * (scale - 1) / 2;   // origin is the centre
      c.style.transform = 'translate(calc(var(--u)*' + tx.toFixed(3) + '),calc(var(--u)*' + ty.toFixed(3) + ')) rotateY(' + angle.toFixed(2) + 'deg) scale(' + scale.toFixed(4) + ')';
      c.style.opacity = opacity.toFixed(3);
    };
    const mark = (c, state) => {
      c.classList.toggle(C + '-ok', state === 'ok');
      c.classList.toggle(C + '-bad', state === 'bad');
    };
    const clearCards = () => { for (const c of cards) c.remove(); cards = []; };
    const clearReadout = () => { outMult.textContent = ''; outRes.textContent = ''; outFiat.textContent = ''; outNote.textContent = ''; readout.style.opacity = '0'; readout.style.transform = ''; };
    const cancel = () => {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (pending) { const r = pending; pending = null; r(); }
    };

    // Build the frame for elapsed time t (ms) — pure function of (outcome, t).
    const buildRenderer = (o) => {
      const steps = Array.isArray(o.steps) ? o.steps : [];
      const n = steps.length;
      const live = o.status === 'active';
      const T = n ? Math.max(STEP_MIN, Math.min(STEP_MAX, STEP_BUDGET / n)) : 0;
      const total = INTRO_MS + n * T + (live ? 0 : OUTRO_MS);
      const values = [Number(o.startCard) || 0].concat(steps.map((s) => Number(s.nextCard) || 0));
      clearCards();
      cards = values.map(makeCard);
      const bpsBefore = (k) => k > 0 ? Number(steps[k - 1].multiplierBps) || 10000 : 10000;
      const render = (t) => {
        const pi = clamp01(t / INTRO_MS);
        let k = n ? Math.min(n - 1, Math.max(0, Math.floor((t - INTRO_MS) / T))) : 0;
        let u = n ? clamp01((t - INTRO_MS - k * T) / T) : 1;
        if (t < INTRO_MS) { k = 0; u = 0; }
        const st = steps[k];
        const correct = !!(st && st.correct);
        const sp = correct ? clamp01((u - 0.8) / 0.2) : 0;        // shift progress of step k
        const pitch = lerp(histPitch(k), histPitch(k + 1), sp);
        const histX = (i) => HIST_X + i * pitch;
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (i < k) { place(c, histX(i), HIST_Y, 360, MINI, 1); mark(c, null); continue; }
          if (i === k) {
            const a = i === 0 ? 180 + 180 * easeIO(pi) : 360;
            if (sp > 0) {
              const e = easeIO(sp);
              place(c, lerp(CUR_X, histX(i), e), lerp(CARD_Y, HIST_Y, e), 360, lerp(1, MINI, e), 1);
            } else place(c, CUR_X, CARD_Y, a, 1, 1);
            mark(c, null); continue;
          }
          if (i === k + 1 && t >= INTRO_MS) {
            const slide = easeOut(clamp01(u / 0.3));
            let x = lerp(OFF_X, IN_X, slide);
            const flip = easeIO(clamp01((u - 0.3) / 0.3));
            const angle = 180 + 180 * flip;
            if (sp > 0) x = lerp(IN_X, CUR_X, easeIO(sp));
            place(c, x, CARD_Y, angle, 1, 1);
            mark(c, u >= 0.6 && (sp < 0.999 || k === n - 1) ? (correct ? 'ok' : 'bad') : null);
            continue;
          }
          place(c, OFF_X, CARD_Y, 180, 1, 0); mark(c, null);
        }
        guess.classList.remove(C + '-muted');
        if (st && t >= INTRO_MS) {
          const tie = !correct && st.nextCard === st.card;
          guess.textContent = guessWord(st.guess) + (u >= 0.6 && tie ? ' · ' + ctx.text('reveal.tie') : '');
          guess.classList.toggle(C + '-tie', u >= 0.6 && tie);
          guess.style.opacity = (correct ? Math.min(clamp01(u / 0.2), 1 - sp) : clamp01(u / 0.2)).toFixed(3);
        } else { guess.textContent = ''; guess.style.opacity = '0'; }
        hdL.textContent = ctx.text('reveal.hilo.title') + (t >= INTRO_MS && n ? ' · ' + ctx.text('reveal.step', { n: k + 1 }) : '');
        hdR.textContent = ctx.fmt.mult(correct ? lerp(bpsBefore(k), Number(st.multiplierBps) || bpsBefore(k), sp) : bpsBefore(k));
        if (!live) {
          const po = clamp01((t - (total - OUTRO_MS)) / OUTRO_MS);
          if (po > 0 && !outMult.textContent) fillReadout(o, n);   // the readout enters the DOM only when it starts to fade in
          readout.style.opacity = po.toFixed(3);
          readout.style.transform = 'translateY(calc(var(--u)*' + (1.5 * (1 - po)).toFixed(3) + '))';
        }
      };
      const tStep = (k) => INTRO_MS + k * T;
      return { render, total, n, live, tStep };
    };
    const fillReadout = (o, n) => {
      outMult.textContent = ctx.fmt.mult(o.multiplierBps);
      outRes.textContent = o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
      outFiat.textContent = (o.win && ctx.fmt.fiat(o.payoutLamports)) || '';
      outNote.textContent = o.win
        ? ctx.text('reveal.cashedSteps', { n }) + (o.capped ? ' · ' + ctx.text('reveal.capped') : '')
        : ctx.text('reveal.bustedStep', { n: Math.max(1, n) });
    };

    const play = (outcome, opts) => {
      cancel();
      const o = outcome || {};
      const reduced = !!(opts && opts.reducedMotion);
      root.dataset.state = 'playing';
      measure();
      wrap.classList.remove(C + '-win', C + '-loss');
      wrap.classList.add(C + '-live');
      clearReadout();
      const R = buildRenderer(o);
      const from = opts && Number.isInteger(opts.from) ? Math.max(0, Math.min(R.n, opts.from)) : 0;
      const inc = from > 0 && !!shown && shown.key === o.sessionId && shown.n === from;
      const skip = inc ? (from < R.n ? R.tStep(from) : Math.max(0, R.total - OUTRO_MS - 200)) : 0;
      const finish = () => {
        R.render(R.total);
        if (!R.live) wrap.classList.add(o.win ? C + '-win' : C + '-loss');
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
      clearCards();
      wrap.classList.remove(C + '-win', C + '-loss', C + '-live');
      const c = makeCard(0, 0); cards = [c];
      place(c, CUR_X, CARD_Y, 180, 1, 1);
      hdL.textContent = ctx.text('reveal.hilo.title'); hdR.textContent = '1.00×';
      guess.textContent = ctx.hint || ctx.text('reveal.hilo.idle'); guess.classList.add(C + '-muted'); guess.classList.remove(C + '-tie'); guess.style.opacity = '';
      clearReadout();
      root.dataset.state = 'idle';
    };

    reset();
    return {
      play,
      reset,
      destroy() { cancel(); if (ro) ro.disconnect(); ro = null; clearCards(); },
    };
  },
};
