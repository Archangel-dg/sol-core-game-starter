// Sol-Core reveal — dice-ladder (session, Chain).
//
// The dice stand in the centre, the current sum above them. Per step: the guess is written
// between sum and dice ("▲ Higher than 7"), the dice tumble — hop, spin and run through a
// deterministic face sequence — and settle on the server's throw. The sum counts to the
// new total and is judged: correct ⇒ accent and the chain multiplier ticks up; wrong (or a
// tie under tieRule=lose) ⇒ red, the chain ends. Every settled sum is filed into the
// history row. The readout fades in at the end — its nodes are EMPTY before that.
// Every frame is a pure function of (transcript, elapsed time): one rAF timeline.
//
// INCREMENTAL: `play(o, { from })` renders the first `from` steps of the SAME session
// (`o.sessionId`) instantly and animates only the new step (or the ending).
//
// Fairness (docs/RULES.md, rule 16): the dice show only hash-driven faces until they settle
// on the server's throw; sums and multipliers are read from the transcript, never
// recomputed; a wrong guess or tie is shown plainly in red with no slowdown.
// Text through `ctx.text(...)`, colours through the theme tokens. Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'dice-ladder',
  mechanic: 'session',
  strings: ['reveal.won', 'result.lost', 'reveal.diceLadder.title', 'reveal.diceLadder.higher', 'reveal.diceLadder.lower', 'reveal.diceLadder.equal', 'reveal.diceLadder.tie', 'reveal.step', 'reveal.bustedStep', 'reveal.cashedSteps', 'reveal.capped'],

  mount(root, ctx) {
    const C = 'sca-dice-ladder';
    const INTRO_MS = 400;                       // the start throw tumbles in
    const OUTRO_MS = 420;                       // readout fades in
    const STEP_BUDGET = 3300;                   // all steps of a full replay aim at this (ms)
    const STEP_MIN = 260, STEP_MAX = 1250;
    const PH = { guess: 0.10, tumble: 0.60, count: 0.80 }; // phase ends within one step
    const TICKS = 10;                           // face changes per tumble
    const HIST_MAX = 7;                         // chips shown; older ones collapse into "…"
    const PIPS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums}
.${C} .${C}-hd{position:absolute;left:6%;right:6%;top:5%;display:flex;justify-content:space-between;align-items:baseline;line-height:1.2;white-space:nowrap}
.${C} .${C}-hd-l{font-size:calc(var(--u)*3.4);color:var(--muted);letter-spacing:.06em}
.${C} .${C}-hd-r{font-size:calc(var(--u)*4.4);font-weight:700;color:var(--muted)}
.${C}.${C}-live .${C}-hd-r{color:var(--fg)}
.${C} .${C}-sum{position:absolute;left:0;right:0;top:13%;text-align:center;font-size:calc(var(--u)*13);font-weight:700;line-height:1;color:var(--fg)}
.${C} .${C}-sum.${C}-idle{color:var(--faint)}
.${C} .${C}-sum.${C}-ok{color:var(--accent)}
.${C} .${C}-sum.${C}-bad{color:var(--red)}
.${C} .${C}-guess{position:absolute;left:0;right:0;top:27.5%;text-align:center;font-size:calc(var(--u)*3.4);line-height:1.3;white-space:nowrap;color:var(--fg);opacity:0}
.${C} .${C}-guess.${C}-ok{color:var(--accent)}
.${C} .${C}-guess.${C}-bad{color:var(--red)}
.${C} .${C}-die{position:absolute;top:38%;box-sizing:border-box;border-radius:calc(var(--u)*2.4);background:var(--fg);display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:calc(var(--u)*2.2);will-change:transform}
.${C} .${C}-die.${C}-empty{background:var(--panel-strong);border:1px dashed var(--faint)}
.${C} .${C}-pip{place-self:center;width:62%;height:62%;border-radius:50%;background:var(--night);visibility:hidden}
.${C} .${C}-die.${C}-empty .${C}-pip{background:var(--faint)}
.${C} .${C}-pip.${C}-on{visibility:visible}
.${C} .${C}-num{position:absolute;inset:0;display:grid;place-items:center;font-size:calc(var(--u)*7.5);font-weight:700;color:var(--night);line-height:1}
.${C} .${C}-hist{position:absolute;left:6%;right:6%;top:66%;height:7%;overflow:hidden;display:flex;justify-content:center;align-items:center;gap:calc(var(--u)*1.3)}
.${C} .${C}-chip{min-width:calc(var(--u)*7);height:100%;box-sizing:border-box;padding:0 calc(var(--u)*1.2);border:1px solid var(--line);border-radius:calc(var(--u)*1.2);display:grid;place-items:center;font-size:calc(var(--u)*3.2);color:var(--muted);line-height:1;white-space:nowrap}
.${C} .${C}-chip.${C}-ok{border-color:var(--accent);color:var(--fg)}
.${C} .${C}-chip.${C}-bad{border-color:var(--red);color:var(--red)}
.${C} .${C}-arr{font-size:calc(var(--u)*3.2);color:var(--faint);line-height:1}
.${C} .${C}-hint{position:absolute;left:0;right:0;top:80%;text-align:center;font-size:calc(var(--u)*3.1);line-height:1.3;color:var(--muted);white-space:nowrap}
.${C}.${C}-live .${C}-hint{display:none}
.${C} .${C}-readout{position:absolute;left:0;right:0;top:78%;text-align:center;opacity:0}
.${C} .${C}-mult{font-size:calc(var(--u)*5.6);font-weight:700;line-height:1.1}
.${C} .${C}-res{font-size:calc(var(--u)*4.2);font-weight:600;line-height:1.2;margin-top:calc(var(--u)*.8)}
.${C} .${C}-fiat{font-size:calc(var(--u)*3.1);line-height:1.2;margin-top:calc(var(--u)*.5);color:var(--muted)}
.${C} .${C}-note{font-size:calc(var(--u)*3.2);line-height:1.2;margin-top:calc(var(--u)*.8);color:var(--muted)}
.${C}.${C}-win .${C}-res{color:var(--accent)}
.${C}.${C}-loss .${C}-res{color:var(--red)}
.${C}.${C}-loss .${C}-mult,.${C}.${C}-loss .${C}-hd-r{color:var(--muted)}
@media (prefers-reduced-motion:reduce){.${C} *{transition:none!important;animation:none!important}}
`;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const eo = (p) => 1 - Math.pow(1 - p, 3);          // ease-out cubic
    // deterministic scatter: the fractional part of a sine — no Math.random anywhere
    const hash = (i, seed) => { const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x); };
    const sumOf = (arr) => (arr || []).reduce((a, b) => a + Number(b || 0), 0);
    const guessText = (g, from) => ctx.text(g === 'higher' ? 'reveal.diceLadder.higher' : g === 'lower' ? 'reveal.diceLadder.lower' : 'reveal.diceLadder.equal', { n: from });
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

    // deterministic tumble of one die: face sequence + spin + hop, all from (progress, seed)
    function tumble(q, d, seed, faces, finalFace) {
      if (q >= 1) return { face: finalFace, rot: 0, lift: 0 };
      const tick = Math.floor(q * TICKS);
      const face = 1 + Math.floor(hash(tick * 7 + d * 3 + 1, seed) * faces);
      const turns = 2 + (d % 2);
      const dir = d % 2 ? -1 : 1;
      return { face, rot: dir * 360 * turns * eo(q), lift: -Math.sin(Math.PI * q) * 6.5 };
    }

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const wrap = el('div', C);
    const hd = el('div', C + '-hd');
    const hdL = el('span', C + '-hd-l', ''); const hdR = el('span', C + '-hd-r', '1.00×');
    hd.appendChild(hdL); hd.appendChild(hdR);
    const sumEl = el('div', C + '-sum ' + C + '-idle', '—');
    const guessEl = el('div', C + '-guess');
    const diceBox = el('div', C + '-dice');
    const histEl = el('div', C + '-hist');
    const hint = el('div', C + '-hint', ctx.hint || '');
    const readout = el('div', C + '-readout');
    const outMult = el('div', C + '-mult'); const outRes = el('div', C + '-res'); const outFiat = el('div', C + '-fiat'); const outNote = el('div', C + '-note');
    readout.appendChild(outMult); readout.appendChild(outRes); readout.appendChild(outFiat); readout.appendChild(outNote);
    wrap.appendChild(hd); wrap.appendChild(sumEl); wrap.appendChild(guessEl); wrap.appendChild(diceBox); wrap.appendChild(histEl); wrap.appendChild(hint); wrap.appendChild(readout);
    root.appendChild(wrap);

    // ── dice DOM (rebuilt only when the count changes) ──
    let dice = [];
    function buildDice(n) {
      n = clamp(n | 0, 1, 4);
      if (dice.length === n) return;
      diceBox.innerHTML = '';
      dice = [];
      const w = n <= 2 ? 20 : n === 3 ? 16 : 13, gap = n <= 2 ? 6 : 4;
      const left0 = 50 - (n * w + (n - 1) * gap) / 2;
      for (let i = 0; i < n; i++) {
        const d = el('div', C + '-die');
        d.style.left = (left0 + i * (w + gap)) + '%';
        d.style.width = w + '%';
        d.style.height = w + '%';
        d.style.padding = 'calc(var(--u)*' + (w * 0.11).toFixed(2) + ')';
        const pips = [];
        for (let p = 0; p < 9; p++) { const pip = el('i', C + '-pip'); d.appendChild(pip); pips.push(pip); }
        const num = el('div', C + '-num');
        d.appendChild(num);
        diceBox.appendChild(d);
        dice.push({ el: d, pips, num, face: -1, empty: null });
      }
    }
    function setDie(d, face, rot, lift, empty) {
      if (d.face !== face || d.empty !== empty) {
        d.face = face; d.empty = empty;
        d.el.classList.toggle(C + '-empty', !!empty);
        const pat = (!empty && face >= 1 && face <= 6) ? PIPS[face] : [];
        for (let p = 0; p < 9; p++) d.pips[p].classList.toggle(C + '-on', pat.indexOf(p) >= 0);
        d.num.textContent = (!empty && face > 6) ? String(face) : '';
      }
      d.el.style.transform = (rot || lift) ? 'translateY(calc(var(--u)*' + lift.toFixed(2) + ')) rotate(' + rot.toFixed(1) + 'deg)' : '';
    }
    function setHist(entries) {
      let list = entries, more = false;
      if (list.length > HIST_MAX) { list = list.slice(list.length - HIST_MAX); more = true; }
      const key = (more ? '…|' : '') + list.map((e) => e.v + e.cls).join('|');
      if (histEl.dataset.key === key) return;
      histEl.dataset.key = key;
      histEl.innerHTML = '';
      if (more) histEl.appendChild(el('span', C + '-chip', '…'));
      list.forEach((e, i) => {
        if (i > 0 || more) histEl.appendChild(el('span', C + '-arr', '›'));
        histEl.appendChild(el('span', C + '-chip' + (e.cls ? ' ' + C + '-' + e.cls : ''), String(e.v)));
      });
    }
    function setUnit() {
      const w = root.getBoundingClientRect().width || 360;
      wrap.style.setProperty('--u', (w / 100).toFixed(3) + 'px');
    }
    let ro = null;
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(setUnit); ro.observe(root); }
    setUnit();

    const clearReadout = () => { readout.style.opacity = '0'; outMult.textContent = ''; outRes.textContent = ''; outFiat.textContent = ''; outNote.textContent = ''; };
    function idle() {
      wrap.classList.remove(C + '-live', C + '-win', C + '-loss');
      hdL.textContent = ctx.text('reveal.diceLadder.title');
      hdR.textContent = '1.00×';
      hint.textContent = ctx.hint || '';
      sumEl.textContent = '—'; sumEl.className = C + '-sum ' + C + '-idle';
      guessEl.textContent = ''; guessEl.className = C + '-guess'; guessEl.style.opacity = '0';
      const cfg = ctx.engineConfig || {};
      buildDice(Math.round(Number(cfg.diceCount)) || Math.round(Number(cfg.dice)) || 2);
      for (let i = 0; i < dice.length; i++) setDie(dice[i], 0, 0, 0, true);
      setHist([]);
      clearReadout();
    }
    idle();
    root.dataset.state = 'idle';

    // ── timeline ──
    let raf = 0, timer = 0, pending = null, run = null;
    let shown = null;   // { key, n } — the session and step count standing on the field
    function cancel() {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (timer) clearTimeout(timer); timer = 0;
      if (pending) { const r = pending; pending = null; r(); }
      run = null;
    }
    function prepare(o) {
      const steps = Array.isArray(o.steps) ? o.steps : [];
      const start = Array.isArray(o.startThrow) && o.startThrow.length ? o.startThrow.map(Number) : [];
      const n = Math.max(1, start.length || Number(o.dice) || 2);
      const startSum = start.length ? sumOf(start) : Number(steps[0] && steps[0].fromSum) || 0;
      let faces = 6;
      for (const s of steps) for (const f of (s.throw || [])) faces = Math.max(faces, Number(f) || 0);
      for (const f of start) faces = Math.max(faces, f);
      let seed = startSum * 7 + 3;
      steps.forEach((s, i) => { seed += (Number(s.toSum) || 0) * (i + 2) + sumOf(s.throw) * 13; });
      const live = o.status === 'active';
      const stepMs = clamp(STEP_BUDGET / Math.max(1, steps.length), STEP_MIN, STEP_MAX);
      return { o, steps, start, n, startSum, faces, seed, stepMs, live, total: INTRO_MS + steps.length * stepMs + (live ? 0 : OUTRO_MS), readoutSet: false };
    }
    function frame(R, t) {
      const { o, steps, start, n, startSum, faces, seed, stepMs } = R;
      buildDice(n);
      wrap.classList.add(C + '-live');
      const ip = clamp(t / INTRO_MS, 0, 1);
      let k = steps.length ? Math.floor((t - INTRO_MS) / stepMs) : -1;
      if (t < INTRO_MS) k = -1;
      const cur = (k >= 0 && k < steps.length) ? steps[k] : null;
      const p = cur ? clamp((t - INTRO_MS - k * stepMs) / stepMs, 0, 1) : 0;
      const done = k >= steps.length;

      if (ip < 1) {
        for (let i = 0; i < n; i++) { const d = tumble(ip, i, seed, faces, start[i] || 1); setDie(dice[i], d.face, d.rot, d.lift, false); }
      } else if (cur && p >= PH.guess && p < PH.tumble) {
        const q = (p - PH.guess) / (PH.tumble - PH.guess);
        for (let i = 0; i < n; i++) { const d = tumble(q, i, seed + (k + 1) * 11, faces, Number((cur.throw || [])[i]) || 1); setDie(dice[i], d.face, d.rot, d.lift, false); }
      } else {
        const src = cur && p >= PH.tumble ? cur.throw : (k > 0 || done) ? steps[Math.min(k, steps.length) - 1].throw : start;
        for (let i = 0; i < n; i++) setDie(dice[i], Number((src || [])[i]) || 1, 0, 0, false);
      }

      hdL.textContent = ctx.text('reveal.diceLadder.title') + (cur || (done && steps.length) ? ' · ' + ctx.text('reveal.step', { n: Math.min(steps.length, Math.max(1, k + 1)) }) : '');

      let sumText = ip < 1 ? '—' : String(startSum), sumCls = ip < 1 ? 'idle' : '';
      let gText = '', gCls = '', gOp = 0;
      let mBps = 10000;
      for (let i = 0; i < Math.min(k, steps.length); i++) if (steps[i].correct) mBps = Number(steps[i].multiplierBps) || mBps;
      if (k > 0 || done) {
        const last = steps[Math.min(k, steps.length) - 1];
        if (last) {
          sumText = String(last.toSum); sumCls = last.correct ? 'ok' : 'bad';
          gText = guessText(last.guess, last.fromSum); gCls = sumCls; gOp = 1;
        }
      }
      if (cur) {
        const from = Number(cur.fromSum), to = Number(cur.toSum);
        gText = guessText(cur.guess, from);
        gOp = clamp(p / PH.guess, 0, 1);
        gCls = '';
        if (p < PH.tumble) { sumText = String(from); sumCls = ''; }
        else if (p < PH.count) {
          const q = eo((p - PH.tumble) / (PH.count - PH.tumble));
          sumText = String(Math.round(from + (to - from) * q)); sumCls = '';
        } else {
          sumText = String(to); sumCls = cur.correct ? 'ok' : 'bad'; gCls = sumCls;
          if (cur.correct) {
            const q = eo((p - PH.count) / (1 - PH.count));
            mBps = Math.round(mBps + ((Number(cur.multiplierBps) || mBps) - mBps) * q);
          }
        }
      }
      sumEl.textContent = sumText; sumEl.className = C + '-sum' + (sumCls ? ' ' + C + '-' + sumCls : '');
      guessEl.textContent = gText; guessEl.className = C + '-guess' + (gCls ? ' ' + C + '-' + gCls : ''); guessEl.style.opacity = gOp.toFixed(2);
      hdR.textContent = ctx.fmt.mult(mBps);

      const hist = [];
      if (ip >= 1) hist.push({ v: startSum, cls: '' });
      const settled = done ? steps.length : cur ? (p >= PH.count ? k + 1 : k) : 0;
      for (let i = 0; i < settled; i++) hist.push({ v: steps[i].toSum, cls: steps[i].correct ? 'ok' : 'bad' });
      setHist(hist);

      // outro: the readout enters the DOM only now — the final frame
      if (done && !R.live) {
        if (!R.readoutSet) {
          R.readoutSet = true;
          wrap.classList.add(o.win ? C + '-win' : C + '-loss');
          outMult.textContent = ctx.fmt.mult(o.multiplierBps);
          outRes.textContent = o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
          outFiat.textContent = (o.win && ctx.fmt.fiat(o.payoutLamports)) || '';
          const last = steps[steps.length - 1];
          outNote.textContent = o.win
            ? ctx.text('reveal.cashedSteps', { n: steps.length }) + (o.capped ? ' · ' + ctx.text('reveal.capped') : '')
            : last && Number(last.toSum) === Number(last.fromSum) ? ctx.text('reveal.diceLadder.tie', { n: last.toSum })
            : ctx.text('reveal.bustedStep', { n: Math.max(1, steps.length) });
        }
        const op = clamp((t - INTRO_MS - steps.length * stepMs) / OUTRO_MS, 0, 1);
        readout.style.opacity = eo(op).toFixed(2);
      } else readout.style.opacity = '0';
    }

    return {
      play(outcome, opts) {
        cancel();
        const o = outcome || {};
        const R = prepare(o);
        run = R;
        root.dataset.state = 'playing';
        clearReadout();
        const from = opts && Number.isInteger(opts.from) ? Math.max(0, Math.min(R.steps.length, opts.from)) : 0;
        const inc = from > 0 && !!shown && shown.key === o.sessionId && shown.n === from;
        const skip = inc ? (from < R.steps.length ? INTRO_MS + from * R.stepMs : Math.max(0, R.total - OUTRO_MS - 200)) : 0;
        return new Promise((resolve) => {
          pending = resolve;
          const finish = () => {
            frame(R, R.total);
            shown = { key: o.sessionId, n: R.steps.length };
            root.dataset.state = 'done';
            raf = 0; timer = 0; run = null;
            const r = pending; pending = null; if (r) r();
          };
          if (opts && opts.reducedMotion) { timer = setTimeout(finish, 16); return; }
          const t0 = performance.now() - skip;
          const tick = (now) => {
            if (run !== R) return;
            const t = now - t0;
            if (t >= R.total) { finish(); return; }
            frame(R, t);
            raf = requestAnimationFrame(tick);
          };
          frame(R, skip);
          raf = requestAnimationFrame(tick);
        });
      },
      reset() { cancel(); shown = null; idle(); root.dataset.state = 'idle'; },
      destroy() { cancel(); if (ro) ro.disconnect(); ro = null; },
    };
  },
};
