// Sol-Core reveal — gauntlet (tournament, Tournament).
//
// A track of `maxSteps` cells across the middle, the live score at the top right. Every
// step of the run: the chosen risk tier appears as a chip with its survive chance and
// points, a roll bar fills to the roll against the tier's threshold (90 / 60 / 30), a
// survived step turns its cell accent and its points fly into the score, a bust turns the
// cell red and zeroes the score. A stop banks the score. The readout ("Banked 65 pts" /
// "Bust on step 5") enters the DOM only at the end — while a step runs the nodes are EMPTY.
//
// INCREMENTAL: `play(o, { from })` sets the first `from` steps of the SAME run (`o.runId`)
// instantly without transitions and animates only the new step (or the banking).
//
// Fairness (docs/RULES.md, rule 16): tier, roll, survived and points are read from the
// server's run history, never recomputed; the roll bar fills at one linear pace to the
// exact roll with no slowing down near the survive line; the final frame keeps the track,
// the last roll and the score the server settled. Text through `ctx.text(...)`. Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'gauntlet',
  mechanic: 'tournament',
  strings: ['reveal.gauntlet.title', 'reveal.gauntlet.steps', 'reveal.gauntlet.roll', 'reveal.gauntlet.survived', 'reveal.gauntlet.bust', 'reveal.gauntlet.banked', 'reveal.gauntlet.stop', 'reveal.gauntlet.full', 'reveal.gauntlet.pts', 'reveal.gauntlet.bustStep', 'reveal.gauntlet.expired', 'reveal.gauntlet.bankedPts', 'reveal.gauntlet.sub', 'reveal.step', 'tournament.stepOf', 'tournament.riskSafe', 'tournament.riskMedium', 'tournament.riskRisky'],

  mount(root, ctx) {
    const C = 'sca-gauntlet';
    const LEAD = 380;                   // ms of rest before a step
    const SETTLE = 420;                 // ms between the last verdict and the readout
    const TAIL = 300;                   // ms the readout takes to settle
    const FLY = 280;                    // ms the points take to reach the score
    const DEFAULT_MAX = 30;             // server default (gauntletConfig maxSteps)
    const TIERS = { safe: { thr: 90, pts: 10, key: 'tournament.riskSafe' }, medium: { thr: 60, pts: 15, key: 'tournament.riskMedium' }, risky: { thr: 30, pts: 30, key: 'tournament.riskRisky' } };
    // ~550 ms per step; long transcripts are compressed so a full replay stays under 4.5 s.
    const stepMs = (n) => (n <= 6 ? 550 : Math.max(170, Math.floor(3000 / n)));

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums}
.${C} .${C}-head{position:absolute;left:6%;right:6%;top:5%;display:flex;justify-content:space-between;align-items:baseline;gap:calc(var(--u)*2);font-size:calc(var(--u)*3.2);line-height:1;letter-spacing:.05em;color:var(--muted);white-space:nowrap}
.${C} .${C}-head b{font-weight:600;color:var(--fg)}
.${C} .${C}-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
.${C} .${C}-score{flex:0 0 auto;font-weight:700;font-size:calc(var(--u)*3.8);color:var(--fg);letter-spacing:0;transition:color .2s ease}
.${C}.${C}-win .${C}-score{color:var(--accent)}
.${C}.${C}-loss .${C}-score{color:var(--red)}
.${C} .${C}-track{position:absolute;left:6%;right:6%;top:15.5%;height:9%;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:calc(var(--u)*.8)}
.${C} .${C}-cell{box-sizing:border-box;border:1px solid var(--line);background:var(--panel-strong);border-radius:calc(var(--u)*.6);transition:background .18s ease,border-color .18s ease}
.${C} .${C}-cell.${C}-cur{border-color:var(--fg)}
.${C} .${C}-cell.${C}-ok{background:var(--accent);border-color:var(--accent)}
.${C} .${C}-cell.${C}-bust{background:var(--red);border-color:var(--red)}
.${C} .${C}-ticks{position:absolute;left:6%;right:6%;top:25.5%;display:flex;justify-content:space-between;font-size:calc(var(--u)*3.1);line-height:1;color:var(--faint);white-space:nowrap}
.${C} .${C}-panel{position:absolute;left:6%;right:6%;top:33%;height:34%}
.${C} .${C}-legend{position:absolute;inset:0;display:grid;grid-template-rows:repeat(3,1fr);align-items:center;font-size:calc(var(--u)*3.2);line-height:1;color:var(--muted);white-space:nowrap}
.${C} .${C}-legend div{display:flex;align-items:center;gap:calc(var(--u)*2.4)}
.${C} .${C}-legend span{flex:1 1 auto;text-align:right}
.${C}.${C}-live .${C}-legend{display:none}
.${C} .${C}-step{position:absolute;inset:0;display:none}
.${C}.${C}-live .${C}-step{display:block}
.${C} .${C}-row1{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:calc(var(--u)*2.2);font-size:calc(var(--u)*3.2);line-height:1;color:var(--muted);white-space:nowrap}
.${C} .${C}-chip{box-sizing:border-box;display:inline-block;padding:calc(var(--u)*1.4) calc(var(--u)*2.2);border:1px solid var(--line);border-radius:calc(var(--u)*1.2);font-size:calc(var(--u)*3.2);font-weight:600;line-height:1;letter-spacing:.08em;text-transform:uppercase;color:var(--fg);transition:opacity .15s ease}
.${C} .${C}-chip.${C}-safe{color:var(--accent);border-color:var(--accent)}
.${C} .${C}-chip.${C}-medium{color:var(--amber);border-color:var(--amber)}
.${C} .${C}-chip.${C}-risky{color:var(--red);border-color:var(--red)}
.${C} .${C}-chip.${C}-stop{color:var(--amber);border-color:var(--amber)}
.${C} .${C}-chip[hidden]{display:none}
.${C} .${C}-odds{flex:1 1 auto;text-align:right}
.${C} .${C}-row2{position:absolute;left:0;right:0;top:44%;display:flex;align-items:center;gap:calc(var(--u)*2.2);font-size:calc(var(--u)*3.2);line-height:1;color:var(--muted);white-space:nowrap}
.${C} .${C}-lab{flex:0 0 auto;width:calc(var(--u)*7)}
.${C} .${C}-bar{position:relative;flex:1 1 auto;height:calc(var(--u)*3.2);border:1px solid var(--line);border-radius:calc(var(--u)*.6);background:var(--panel);overflow:hidden}
.${C} .${C}-zone{position:absolute;left:0;top:0;bottom:0;background:var(--panel-strong)}
.${C} .${C}-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:var(--fg);transition:width 240ms linear,background .15s ease}
.${C} .${C}-fill.${C}-ok{background:var(--accent)}
.${C} .${C}-fill.${C}-bust{background:var(--red)}
.${C} .${C}-thr{position:absolute;top:-1px;bottom:-1px;width:2px;margin-left:-1px;background:var(--fg)}
.${C} .${C}-val{flex:0 0 auto;width:calc(var(--u)*9);text-align:right;font-weight:600;color:var(--fg)}
.${C} .${C}-row3{position:absolute;left:calc(var(--u)*9.2);right:calc(var(--u)*11.2);top:66%;font-size:calc(var(--u)*3.1);line-height:1;color:var(--faint);white-space:nowrap}
.${C} .${C}-thrlab{position:absolute;top:0;transform:translateX(-50%)}
.${C} .${C}-verdict{position:absolute;left:0;right:0;top:82%;font-size:calc(var(--u)*3.4);line-height:1;font-weight:600;white-space:nowrap;opacity:0;transition:opacity .15s ease}
.${C} .${C}-verdict.${C}-on{opacity:1}
.${C} .${C}-verdict.${C}-ok{color:var(--accent)}
.${C} .${C}-verdict.${C}-bust{color:var(--red)}
.${C} .${C}-fly{position:absolute;left:12%;top:36%;font-size:calc(var(--u)*3.4);font-weight:700;line-height:1;color:var(--accent);opacity:0;transition:left ${FLY}ms ease-in,top ${FLY}ms ease-in,opacity .12s ease;pointer-events:none}
.${C} .${C}-fly.${C}-go{opacity:1}
.${C} .${C}-hint{position:absolute;left:0;right:0;top:72%;text-align:center;font-size:calc(var(--u)*3.1);line-height:1.3;color:var(--muted);white-space:nowrap}
.${C}.${C}-live .${C}-hint{display:none}
.${C} .${C}-readout{position:absolute;left:0;right:0;top:71%;text-align:center;opacity:0;transform:translateY(calc(var(--u)*1.5));transition:opacity .22s ease,transform .22s ease}
.${C}.${C}-done .${C}-readout{opacity:1;transform:none}
.${C} .${C}-big{font-size:calc(var(--u)*6);font-weight:700;line-height:1.1;color:var(--fg)}
.${C}.${C}-loss .${C}-big{color:var(--muted)}
.${C} .${C}-res{font-size:calc(var(--u)*4.4);line-height:1.2;margin-top:calc(var(--u)*1.1);font-weight:600}
.${C}.${C}-win .${C}-res{color:var(--accent)}
.${C}.${C}-loss .${C}-res{color:var(--red)}
.${C} .${C}-sub{font-size:calc(var(--u)*3.1);line-height:1.2;margin-top:calc(var(--u)*1);color:var(--muted);white-space:nowrap}
.${C}.${C}-still *{transition:none!important}
@media (prefers-reduced-motion:reduce){.${C} *{transition:none!important}}
`;
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const int = (v, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : d; };
    const roll2 = (r) => { const n = Number(r); return Number.isFinite(n) ? n.toFixed(2) : '—'; };
    const pts = (n) => ctx.text('reveal.gauntlet.pts', { n });
    const maxOf = (o) => { const c = (o && o.engineConfig) || ctx.engineConfig || {}; let m = int(o && o.maxSteps, int(c.maxSteps, DEFAULT_MAX)); return m < 1 ? DEFAULT_MAX : m; };

    // Replay plan — a pure function of the outcome: which cell turns when, what the score reads.
    function plan(o) {
      const hist = Array.isArray(o.history) ? o.history : [];
      const n = hist.length;
      let max = maxOf(o);
      if (max < n) max = n;
      const live = o.status === 'active';
      const step = stepMs(n);
      const fill = Math.min(240, Math.max(90, Math.round(step * 0.45)));
      let score = 0;
      const moves = hist.map((h, i) => {
        const risk = h && TIERS[h.risk] ? h.risk : 'safe';
        const survived = !!(h && h.survived);
        const points = int(h && h.points, survived ? TIERS[risk].pts : 0);
        score = survived ? score + points : 0;
        return {
          at: LEAD + i * step,
          idx: int(h && h.step, i),
          risk, thr: TIERS[risk].thr,
          roll: Math.min(99.99, Math.max(0, Number(h && h.roll) || 0)),
          survived, points, scoreAfter: score, fill,
          verdictAt: LEAD + i * step + 60 + fill + 40,
        };
      });
      const busted = o.status === 'busted';
      const last = n ? moves[n - 1] : null;
      const settledAt = last ? last.verdictAt + (last.survived ? FLY + 20 : 0) : LEAD;
      const readoutAt = settledAt + SETTLE;
      return { max, moves, busted, live, readoutAt, end: live ? settledAt : readoutAt + TAIL };
    }

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const box = el('div', C);
    const head = el('div', C + '-head');
    const title = el('span', C + '-title');
    const score = el('span', C + '-score');
    head.appendChild(title); head.appendChild(score);
    const track = el('div', C + '-track');
    const ticks = el('div', C + '-ticks');
    const panel = el('div', C + '-panel');
    const legend = el('div', C + '-legend');
    const legendRows = ['safe', 'medium', 'risky'].map((k) => {
      const row = el('div');
      const chipEl = el('span', C + '-chip ' + C + '-' + k, '');
      chipEl.style.flex = '0 0 auto';
      row.appendChild(chipEl);
      row.appendChild(el('span', null, TIERS[k].thr + '% · +' + TIERS[k].pts));
      legend.appendChild(row);
      return { k, chipEl };
    });
    const stepBox = el('div', C + '-step');
    const row1 = el('div', C + '-row1');
    const stepLab = el('span', null, '');
    const chip = el('span', C + '-chip', '');
    const stopChip = el('span', C + '-chip ' + C + '-stop', '');
    stopChip.hidden = true;
    const odds = el('span', C + '-odds', '');
    row1.appendChild(stepLab); row1.appendChild(chip); row1.appendChild(stopChip); row1.appendChild(odds);
    const row2 = el('div', C + '-row2');
    const rollLab = el('span', C + '-lab', '');
    const bar = el('div', C + '-bar');
    const zone = el('div', C + '-zone');
    const fillEl = el('div', C + '-fill');
    const thr = el('div', C + '-thr');
    bar.appendChild(zone); bar.appendChild(fillEl); bar.appendChild(thr);
    const val = el('span', C + '-val', '');
    row2.appendChild(rollLab); row2.appendChild(bar); row2.appendChild(val);
    const row3 = el('div', C + '-row3');
    const thrLab = el('span', C + '-thrlab', '');
    row3.appendChild(thrLab);
    const verdict = el('div', C + '-verdict', '');
    stepBox.appendChild(row1); stepBox.appendChild(row2); stepBox.appendChild(row3); stepBox.appendChild(verdict);
    panel.appendChild(legend); panel.appendChild(stepBox);
    const fly = el('div', C + '-fly', '');
    const hint = el('div', C + '-hint', ctx.hint || '');
    const readout = el('div', C + '-readout');
    const bigEl = el('div', C + '-big', '');
    const resEl = el('div', C + '-res', '');
    const subEl = el('div', C + '-sub', '');
    readout.appendChild(bigEl); readout.appendChild(resEl); readout.appendChild(subEl);
    box.appendChild(head); box.appendChild(track); box.appendChild(ticks); box.appendChild(panel);
    box.appendChild(hint); box.appendChild(readout); box.appendChild(fly);
    root.appendChild(box);

    let cells = [];
    let N = DEFAULT_MAX;
    const measure = () => {
      const w = root.getBoundingClientRect().width;
      if (w > 0) box.style.setProperty('--u', (w / 100).toFixed(3) + 'px');
    };
    measure();
    let ro = null;
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(root); }

    function setScore(n) { score.textContent = pts(n); }
    function setTitle(k, max) {
      title.innerHTML = '';
      title.appendChild(el('b', null, ctx.text('reveal.gauntlet.title')));
      title.appendChild(document.createTextNode(' · ' + (k == null ? ctx.text('reveal.gauntlet.steps', { n: max }) : ctx.text('tournament.stepOf', { n: k, max }))));
    }
    // The track: one cell per step; the gap shrinks on long tracks so 100 cells still fit.
    function build(max) {
      N = max;
      track.innerHTML = '';
      cells = [];
      track.style.gap = 'calc(var(--u)*' + (max <= 20 ? 0.8 : max <= 40 ? 0.5 : 0.2) + ')';
      for (let i = 0; i < max; i++) { const c = el('div', C + '-cell'); track.appendChild(c); cells.push(c); }
      ticks.innerHTML = '';
      ticks.appendChild(el('span', null, '1'));
      ticks.appendChild(el('span', null, String(max)));
      legendRows.forEach((r) => { r.chipEl.textContent = ctx.text(TIERS[r.k].key); });
      rollLab.textContent = ctx.text('reveal.gauntlet.roll');
      hint.textContent = ctx.hint || '';
      setTitle(null, max);
      setScore(0);
    }
    function clearStep() {
      stepLab.textContent = ''; chip.textContent = ''; chip.className = C + '-chip'; odds.textContent = '';
      stopChip.hidden = true; stopChip.textContent = '';
      fillEl.className = C + '-fill'; fillEl.style.width = '0%';
      val.textContent = ''; thrLab.textContent = '';
      verdict.className = C + '-verdict'; verdict.textContent = '';
      fly.className = C + '-fly'; fly.textContent = ''; fly.style.left = ''; fly.style.top = '';
    }
    // Step start: chip + threshold shown, the roll bar begins to fill.
    function begin(m) {
      cells.forEach((c) => c.classList.remove(C + '-cur'));
      const cell = cells[m.idx]; if (cell) cell.classList.add(C + '-cur');
      setTitle(m.idx + 1, N);
      stepLab.textContent = ctx.text('reveal.step', { n: m.idx + 1 });
      chip.textContent = ctx.text(TIERS[m.risk].key); chip.className = C + '-chip ' + C + '-' + m.risk;
      odds.textContent = m.thr + '% · +' + TIERS[m.risk].pts;
      zone.style.width = m.thr + '%'; thr.style.left = m.thr + '%';
      thrLab.textContent = '< ' + m.thr; thrLab.style.left = m.thr + '%';
      verdict.className = C + '-verdict'; verdict.textContent = '';
      fly.className = C + '-fly'; fly.style.left = ''; fly.style.top = '';
      fillEl.className = C + '-fill'; fillEl.style.transitionDuration = '0ms,150ms'; fillEl.style.width = '0%';
      val.textContent = '';
    }
    function fillTo(m) {
      fillEl.style.transitionDuration = m.fill + 'ms,150ms';
      fillEl.style.width = m.roll + '%';
    }
    // Verdict: the cell turns, the roll is printed; survived ⇒ points fly, bust ⇒ score zeroes.
    function decide(m) {
      val.textContent = roll2(m.roll);
      const cell = cells[m.idx];
      if (m.survived) {
        fillEl.classList.add(C + '-ok');
        if (cell) { cell.classList.remove(C + '-cur'); cell.classList.add(C + '-ok'); }
        verdict.className = C + '-verdict ' + C + '-on ' + C + '-ok';
        verdict.textContent = ctx.text('reveal.gauntlet.survived', { n: m.points });
        fly.textContent = '+' + m.points;
        fly.className = C + '-fly ' + C + '-go';
        fly.style.left = '12%'; fly.style.top = '36%';
      } else {
        fillEl.classList.add(C + '-bust');
        if (cell) { cell.classList.remove(C + '-cur'); cell.classList.add(C + '-bust'); }
        verdict.className = C + '-verdict ' + C + '-on ' + C + '-bust';
        verdict.textContent = ctx.text('reveal.gauntlet.bust', { roll: roll2(m.roll), thr: m.thr });
        box.classList.add(C + '-loss');
        setScore(0);
      }
    }
    function flyOff() { fly.style.left = '82%'; fly.style.top = '5%'; }
    function land(m) { fly.className = C + '-fly'; fly.textContent = ''; setScore(m.scoreAfter); }
    const clearReadout = () => { bigEl.textContent = ''; resEl.textContent = ''; subEl.textContent = ''; };
    function idle() {
      box.className = C;
      build(maxOf(null));
      clearStep();
      clearReadout();
    }
    // The ONLY place the result enters the DOM — the final frame.
    function finish(o, p) {
      const n = p.moves.length;
      const last = n ? p.moves[n - 1] : null;
      const scoreNow = int(o.score, last ? last.scoreAfter : 0);
      const expired = o.status === 'expired';
      const win = !p.busted && !expired;
      box.classList.add(C + '-done', win ? C + '-win' : C + '-loss');
      setScore(scoreNow);
      setTitle(n, N);
      if (win) {
        stopChip.textContent = ctx.text(n >= N ? 'reveal.gauntlet.full' : 'reveal.gauntlet.stop'); stopChip.hidden = false;
        verdict.className = C + '-verdict ' + C + '-on ' + C + '-ok';
        verdict.textContent = ctx.text('reveal.gauntlet.banked');
      }
      bigEl.textContent = pts(scoreNow);
      resEl.textContent = p.busted ? ctx.text('reveal.gauntlet.bustStep', { n: last ? last.idx + 1 : 1 })
        : expired ? ctx.text('reveal.gauntlet.expired') : ctx.text('reveal.gauntlet.bankedPts', { pts: pts(scoreNow) });
      subEl.textContent = ctx.text('reveal.gauntlet.sub', { n, max: N, fee: ctx.fmt.sol(o.entryLamports != null ? o.entryLamports : o.betLamports) });
    }

    let raf = 0, pending = null;
    let shown = null;   // { key, n } — the run and step count standing on the track
    const cancel = () => { if (raf) cancelAnimationFrame(raf); raf = 0; if (pending) { const r = pending; pending = null; r(); } };
    idle();
    root.dataset.state = 'idle';

    return {
      play(o, opts) {
        cancel();
        measure();
        o = o || {};
        const p = plan(o);
        const n = p.moves.length;
        const reduced = !!(opts && opts.reducedMotion);
        const from = opts && Number.isInteger(opts.from) ? Math.max(0, Math.min(n, opts.from)) : 0;
        const inc = from > 0 && !!shown && shown.key === o.runId && shown.n === from;
        root.dataset.state = 'playing';
        box.className = C + ' ' + C + '-live ' + C + '-still';
        build(p.max);
        clearStep();
        clearReadout();
        const events = [];
        p.moves.forEach((m) => {
          events.push({ at: m.at, fn: () => begin(m) });
          events.push({ at: m.at + 60, fn: () => fillTo(m) });
          events.push({ at: m.verdictAt, fn: () => decide(m) });
          if (m.survived) {
            events.push({ at: m.verdictAt + 20, fn: () => flyOff(m) });
            events.push({ at: m.verdictAt + 20 + FLY, fn: () => land(m) });
          }
        });
        if (!p.live) events.push({ at: p.readoutAt, fn: () => finish(o, p) });
        events.sort((a, b) => a.at - b.at);
        const cut = inc ? (from < n ? p.moves[from].at : p.readoutAt) : 0;
        const skip = inc ? Math.max(0, from < n ? p.moves[from].at - LEAD : p.readoutAt - 200) : 0;
        let next = 0;
        while (next < events.length && events[next].at < cut) events[next++].fn();
        void box.offsetWidth;
        if (!reduced) box.classList.remove(C + '-still');
        const finishAll = () => {
          while (next < events.length) events[next++].fn();
          shown = { key: o.runId, n };
          root.dataset.state = 'done';
        };
        return new Promise((resolve) => {
          if (reduced) { finishAll(); resolve(); return; }
          pending = resolve;
          const t0 = performance.now() - skip;
          const tick = (now) => {
            const t = now - t0;
            while (next < events.length && events[next].at <= t) events[next++].fn();
            if (t >= p.end) { finishAll(); raf = 0; const r = pending; pending = null; if (r) r(); return; }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        });
      },
      reset() { cancel(); shown = null; idle(); root.dataset.state = 'idle'; },
      destroy() { cancel(); if (ro) ro.disconnect(); ro = null; },
    };
  },
};
