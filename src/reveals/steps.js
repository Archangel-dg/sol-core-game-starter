// Sol-Core reveal — steps (session, Chain).
//
// A vertical ladder: one rung per `ladderBps` entry (engine config), labelled with its
// multiplier, checkpoints in amber, the ground (0×) at the bottom. Every climb of the
// session moves a marker up one rung; a failed climb turns the rung it did not reach red,
// darkens one life dot and drops the marker fast to the last checkpoint (or the ground);
// a fail with no life left is the bust — the marker goes red and falls to the ground.
// The readout enters the DOM only at the end — while climbing the nodes are EMPTY.
//
// INCREMENTAL: `play(o, { from })` sets the first `from` climbs of the SAME session
// (`o.sessionId`) instantly without transitions and animates only the new climb.
//
// Fairness (docs/RULES.md, rule 16): ladder, checkpoints and lives are the server's
// config and every move comes from the transcript as it is; the marker climbs and falls
// at one steady pace with no slowing down before a fall; a lost life shows the moment it
// is lost. Text through `ctx.text(...)`, colours through the theme tokens. Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'steps',
  mechanic: 'session',
  strings: ['reveal.won', 'result.lost', 'reveal.steps.title', 'reveal.steps.rungs', 'reveal.steps.checkpoints', 'reveal.steps.lives', 'reveal.steps.start', 'reveal.steps.safe', 'reveal.steps.top', 'reveal.steps.result', 'reveal.steps.falls', 'reveal.steps.bust', 'reveal.steps.noLives', 'reveal.steps.busted', 'reveal.topReached', 'reveal.cashedOut'],

  mount(root, ctx) {
    const C = 'sca-steps';
    const LEAD = 380;                   // ms of rest before a climb
    const FALL = 260;                   // ms a fall takes (fast — a drop, not a climb)
    const FLASH = 420;                  // ms the failed rung stays red after a protected fall
    const SETTLE = 420;                 // ms between the last climb and the readout
    const BUST_HOLD = 460;              // ms the red marker rests on the ground before the readout
    const TAIL = 320;                   // ms the readout takes to settle
    const DEFAULT_LADDER = [13900, 19800, 28300, 40400, 57700, 82400, 117700, 168200];
    const DEFAULT_CHECKPOINTS = [3, 6];
    const DEFAULT_LIVES = 3;
    // ~450 ms per climb; long transcripts are compressed so a full replay stays under 4.5 s.
    const stepMs = (n) => (n <= 7 ? 450 : Math.max(220, Math.floor(3150 / n)));

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums}
.${C} .${C}-head{position:absolute;left:6%;right:8%;top:5%;display:flex;justify-content:space-between;align-items:baseline;gap:calc(var(--u)*2.5);font-size:calc(var(--u)*3.2);line-height:1;letter-spacing:.05em;color:var(--muted);white-space:nowrap}
.${C} .${C}-head b{font-weight:600;color:var(--fg)}
.${C} .${C}-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
.${C} .${C}-run{flex:0 0 auto;font-weight:600;color:var(--fg);letter-spacing:0;transition:color .25s ease}
.${C}.${C}-win .${C}-run{color:var(--accent)}
.${C}.${C}-loss .${C}-run{color:var(--red)}
.${C} .${C}-lives{position:absolute;left:6%;right:8%;top:10.6%;display:flex;align-items:center;gap:calc(var(--u)*1.4);font-size:calc(var(--u)*3.1);line-height:1;letter-spacing:.05em;color:var(--muted);white-space:nowrap}
.${C} .${C}-lives.${C}-none{display:none}
.${C} .${C}-lives span{margin-right:calc(var(--u)*.6)}
.${C} .${C}-life{width:calc(var(--u)*2.4);height:calc(var(--u)*2.4);border-radius:50%;background:var(--fg);border:1px solid var(--fg);box-sizing:border-box;transition:background .25s ease,border-color .25s ease}
.${C} .${C}-life.${C}-lost{background:transparent;border-color:var(--red)}
.${C} .${C}-ladder{position:absolute;left:6%;right:8%;top:15.5%;height:58%}
.${C} .${C}-rows{position:absolute;inset:0;display:grid;grid-auto-rows:1fr}
.${C} .${C}-row{position:relative;display:flex;align-items:center}
.${C} .${C}-lab{flex:0 0 32%;box-sizing:border-box;padding-right:calc(var(--u)*2.4);text-align:right;font-size:calc(var(--u)*3.1);line-height:1;color:var(--faint);white-space:nowrap;transition:color .25s ease}
.${C} .${C}-lab.${C}-seen{color:var(--muted)}
.${C} .${C}-lab.${C}-cur{color:var(--fg);font-weight:600}
.${C} .${C}-lab.${C}-top{color:var(--accent);font-weight:600}
.${C}.${C}-loss .${C}-lab.${C}-top{color:var(--red)}
.${C} .${C}-rung{flex:0 0 30%;height:2px;background:var(--line);border-radius:1px;transition:background .18s ease}
.${C} .${C}-rung.${C}-safe{background:var(--amber)}
.${C} .${C}-rung.${C}-ground{background:var(--muted)}
.${C} .${C}-rung.${C}-fail{background:var(--red)}
.${C} .${C}-tag{flex:0 0 auto;margin-left:calc(var(--u)*2.2);font-size:calc(var(--u)*3.1);line-height:1;letter-spacing:.05em;color:var(--amber);white-space:nowrap}
.${C} .${C}-tag.${C}-dim{color:var(--faint)}
.${C} .${C}-rail{position:absolute;top:0;bottom:0;width:1px;background:var(--line)}
.${C} .${C}-marker{position:absolute;left:47%;top:100%;width:calc(var(--u)*2.8);height:calc(var(--u)*2.8);border-radius:50%;background:var(--accent);transform:translate(-50%,-50%);transition:top 450ms cubic-bezier(.4,0,.2,1),background .15s ease}
.${C} .${C}-marker.${C}-falling,.${C}.${C}-loss .${C}-marker{background:var(--red)}
.${C} .${C}-hint{position:absolute;left:0;right:0;top:80%;text-align:center;font-size:calc(var(--u)*3.1);line-height:1.3;color:var(--muted);white-space:nowrap;transition:opacity .2s ease}
.${C}.${C}-live .${C}-hint{opacity:0}
.${C} .${C}-readout{position:absolute;left:0;right:0;top:77%;text-align:center;opacity:0;transform:translateY(calc(var(--u)*1.5));transition:opacity .22s ease,transform .22s ease}
.${C}.${C}-done .${C}-readout{opacity:1;transform:none}
.${C} .${C}-mult{font-size:calc(var(--u)*6);font-weight:700;line-height:1.1;color:var(--fg)}
.${C}.${C}-loss .${C}-mult{color:var(--muted)}
.${C} .${C}-res{font-size:calc(var(--u)*4.4);line-height:1.2;margin-top:calc(var(--u)*1.1);font-weight:600}
.${C}.${C}-win .${C}-res{color:var(--accent)}
.${C}.${C}-loss .${C}-res{color:var(--red)}
.${C} .${C}-fiat{font-size:calc(var(--u)*3.1);line-height:1.2;margin-top:calc(var(--u)*.6);color:var(--muted)}
.${C} .${C}-sub{font-size:calc(var(--u)*3.1);line-height:1.2;margin-top:calc(var(--u)*1);color:var(--muted);white-space:nowrap}
.${C}.${C}-still .${C}-marker,.${C}.${C}-still .${C}-rung,.${C}.${C}-still .${C}-lab,.${C}.${C}-still .${C}-life,.${C}.${C}-still .${C}-readout,.${C}.${C}-still .${C}-hint,.${C}.${C}-still .${C}-run{transition:none!important}
@media (prefers-reduced-motion:reduce){.${C} .${C}-marker,.${C} .${C}-rung,.${C} .${C}-lab,.${C} .${C}-life,.${C} .${C}-readout,.${C} .${C}-hint,.${C} .${C}-run{transition:none!important}}
`;
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const int = (v, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : d; };

    // Ladder geometry from the config echo (ladderBps / checkpoints / lives): the round's own
    // first, then the game's (idle). Never shorter than the highest rung the transcript reaches.
    function config(o) {
      const c = (o && o.engineConfig) || ctx.engineConfig || {};
      const climbs = o && Array.isArray(o.climbs) ? o.climbs : [];
      let ladder = Array.isArray(c.ladderBps) ? c.ladderBps.map((v) => int(v, 0)).slice(0, 20) : [];
      const fromCfg = ladder.length > 0;
      if (!fromCfg) ladder = DEFAULT_LADDER.slice();
      let top = 0;
      climbs.forEach((k) => { top = Math.max(top, int(k && k.toRung, 0), int(k && k.fromRung, 0)); });
      while (ladder.length < top) ladder.push(Math.round(ladder[ladder.length - 1] * 1.4));
      const n = ladder.length;
      const cps = Array.isArray(c.checkpoints) ? c.checkpoints : (fromCfg ? [] : DEFAULT_CHECKPOINTS);
      const checkpoints = new Set(cps.map((v) => int(v, 0)).filter((v) => v >= 1 && v <= n - 1));
      const lives = Math.min(10, Math.max(0, int(c.lives, fromCfg ? 0 : DEFAULT_LIVES)));
      return { ladder, n, checkpoints, lives, fromCfg };
    }
    // Replay plan — a pure function of the outcome: which rung the marker reaches when.
    function plan(o) {
      const cfg = config(o);
      const climbs = Array.isArray(o.climbs) ? o.climbs : [];
      const live = o.status === 'active';
      const busted = o.status === 'busted';
      const n = climbs.length;
      const step = stepMs(n);
      const moves = climbs.map((k, i) => {
        const survived = !!(k && k.survived);
        const from = int(k && k.fromRung, 0);
        const to = int(k && k.toRung, survived ? from + 1 : 0);
        return {
          at: LEAD + i * step,
          survived, from, to,
          target: from + 1,                                   // the rung a failed climb did not reach
          livesLeft: k && typeof k.livesLeft === 'number' ? int(k.livesLeft, cfg.lives) : null,
          bust: busted && i === n - 1,
          move: Math.min(450, Math.max(160, step - 60)),      // climb duration for this pace
        };
      });
      const last = n ? moves[n - 1] : null;
      const lastAt = last ? last.at : LEAD;
      const readoutAt = !last ? lastAt + SETTLE
        : last.bust ? lastAt + FALL + BUST_HOLD
          : last.survived ? lastAt + last.move + SETTLE : lastAt + FALL + FLASH + SETTLE;
      const settledAt = !last ? lastAt : last.survived ? lastAt + last.move : lastAt + FALL + FLASH;
      return { cfg, moves, busted, live, readoutAt, end: live ? settledAt : readoutAt + TAIL };
    }

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const box = el('div', C);
    const head = el('div', C + '-head');
    const title = el('span', C + '-title');
    const run = el('span', C + '-run', '0.00×');
    head.appendChild(title); head.appendChild(run);
    const livesRow = el('div', C + '-lives');
    const ladder = el('div', C + '-ladder');
    const rows = el('div', C + '-rows');
    const railL = el('div', C + '-rail');
    const railR = el('div', C + '-rail');
    const marker = el('div', C + '-marker');
    ladder.appendChild(rows); ladder.appendChild(railL); ladder.appendChild(railR); ladder.appendChild(marker);
    const hint = el('div', C + '-hint', ctx.hint || '');
    const readout = el('div', C + '-readout');
    const multEl = el('div', C + '-mult', '');
    const resEl = el('div', C + '-res', '');
    const fiatEl = el('div', C + '-fiat', '');
    const subEl = el('div', C + '-sub', '');
    readout.appendChild(multEl); readout.appendChild(resEl); readout.appendChild(fiatEl); readout.appendChild(subEl);
    box.appendChild(head); box.appendChild(livesRow); box.appendChild(ladder); box.appendChild(hint); box.appendChild(readout);
    root.appendChild(box);

    let rungs = [];      // rungs[r] = { lab, line }, r = 0 is the ground
    let lifeDots = [];
    let N = DEFAULT_LADDER.length;
    let current = 0;
    const measure = () => {
      const w = root.getBoundingClientRect().width;
      if (w > 0) box.style.setProperty('--u', (w / 100).toFixed(3) + 'px');
    };
    measure();
    let ro = null;
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(root); }

    // Build the ladder, top rung first so the ground lands at the bottom. Labels are the config —
    // known to the player before the first climb — so they are all shown from the start.
    function build(cfg) {
      rows.innerHTML = '';
      rungs = [];
      N = cfg.n;
      rows.style.gridTemplateRows = 'repeat(' + (N + 1) + ',1fr)';
      const every = N > 12 ? Math.ceil(N / 10) : 1;
      for (let r = N; r >= 0; r--) {
        const row = el('div', C + '-row');
        const labelled = r === 0 || r === N || cfg.checkpoints.has(r) || r % every === 0;
        const lab = el('div', C + '-lab', labelled ? ctx.fmt.mult(r === 0 ? 0 : cfg.ladder[r - 1]) : '');
        const line = el('div', C + '-rung' + (r === 0 ? ' ' + C + '-ground' : cfg.checkpoints.has(r) ? ' ' + C + '-safe' : ''));
        row.appendChild(lab); row.appendChild(line);
        if (r === 0) row.appendChild(el('div', C + '-tag ' + C + '-dim', ctx.text('reveal.steps.start')));
        else if (cfg.checkpoints.has(r)) row.appendChild(el('div', C + '-tag', ctx.text('reveal.steps.safe')));
        else if (r === N) row.appendChild(el('div', C + '-tag ' + C + '-dim', ctx.text('reveal.steps.top')));
        rows.appendChild(row);
        rungs[r] = { lab, line };
      }
      railL.style.left = '32%'; railR.style.left = '62%';
      marker.style.left = '47%';
      livesRow.innerHTML = '';
      lifeDots = [];
      livesRow.classList.toggle(C + '-none', cfg.lives <= 0);
      if (cfg.lives > 0) {
        livesRow.appendChild(el('span', null, ctx.text('reveal.steps.lives')));
        for (let i = 0; i < cfg.lives; i++) { const d = el('div', C + '-life'); livesRow.appendChild(d); lifeDots.push(d); }
      }
      title.innerHTML = '';
      title.appendChild(el('b', null, ctx.text('reveal.steps.title')));
      title.appendChild(document.createTextNode(' · ' + ctx.text('reveal.steps.rungs', { n: N }) + (cfg.checkpoints.size ? ' · ' + ctx.text('reveal.steps.checkpoints', { n: cfg.checkpoints.size }) : '')));
      current = 0;
      rungs[0].lab.classList.add(C + '-cur');
      markerTo(0, 0);
    }
    // Marker at rung r (0 = ground) — `ms` is the duration of this move (0 = jump).
    function markerTo(r, ms) {
      marker.style.transitionDuration = ms + 'ms,150ms';
      marker.style.transitionTimingFunction = (ms > 0 && ms <= FALL ? 'cubic-bezier(.5,0,1,.6)' : 'cubic-bezier(.4,0,.2,1)') + ',ease';
      marker.style.top = (((N - r) + 0.5) / (N + 1) * 100).toFixed(3) + '%';
    }
    function setCurrent(r) {
      const prev = rungs[current];
      if (prev) { prev.lab.classList.remove(C + '-cur'); prev.lab.classList.add(C + '-seen'); }
      current = r;
      const now = rungs[r];
      if (now) now.lab.classList.add(C + '-cur');
    }
    function setLives(left) {
      if (left == null) return;
      lifeDots.forEach((d, i) => d.classList.toggle(C + '-lost', i >= left));
    }
    function climb(m, cfg) {
      if (m.survived) {
        setCurrent(m.to);
        run.textContent = ctx.fmt.mult(cfg.ladder[m.to - 1] || 0);
        markerTo(m.to, m.move);
      } else {
        const t = rungs[m.target];
        if (t) { t.line.classList.add(C + '-fail'); t.flashAt = m.at; }
        marker.classList.add(C + '-falling');
        marker.flashAt = m.at;
        if (m.bust) box.classList.add(C + '-loss');
        setCurrent(m.to);
        run.textContent = ctx.fmt.mult(m.bust ? 0 : m.to > 0 ? cfg.ladder[m.to - 1] : 0);
        markerTo(m.to, FALL);
      }
      setLives(m.livesLeft);
    }
    // Clears only the flash this move set — a later fail on the same rung (or the bust) keeps its red.
    function unflash(m) {
      const t = rungs[m.target];
      if (t && t.flashAt === m.at) t.line.classList.remove(C + '-fail');
      if (marker.flashAt === m.at) marker.classList.remove(C + '-falling');
    }
    const clearReadout = () => { multEl.textContent = ''; resEl.textContent = ''; fiatEl.textContent = ''; subEl.textContent = ''; };
    function idle() {
      box.className = C;
      hint.textContent = ctx.hint || '';
      build(config(null));
      run.textContent = '0.00×';
      clearReadout();
    }
    // The ONLY place the result enters the DOM — the final frame.
    function finish(o, p) {
      const n = p.moves.length;
      box.classList.add(C + '-done', o.win ? C + '-win' : C + '-loss');
      const last = n ? p.moves[n - 1] : null;
      const rung = last ? last.to : 0;
      if (o.win && rungs[rung]) rungs[rung].lab.classList.add(C + '-top');
      run.textContent = ctx.fmt.mult(o.multiplierBps);
      multEl.textContent = ctx.fmt.mult(o.multiplierBps);
      resEl.textContent = o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
      fiatEl.textContent = (o.win && ctx.fmt.fiat(o.payoutLamports)) || '';
      const falls = p.moves.filter((m) => !m.survived && !m.bust).length;
      subEl.textContent = o.win
        ? ctx.text('reveal.steps.result', { rung, n: p.cfg.n, end: ctx.text(rung >= p.cfg.n ? 'reveal.topReached' : 'reveal.cashedOut') }) + (falls ? ' · ' + ctx.text('reveal.steps.falls', { n: falls }) : '')
        : ctx.text('reveal.steps.bust', { n: last ? last.target : 1, why: ctx.text(p.cfg.lives > 0 ? 'reveal.steps.noLives' : 'reveal.steps.busted') });
    }

    let raf = 0, pending = null;
    let shown = null;   // { key, n } — the session and climb count standing on the ladder
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
        const inc = from > 0 && !!shown && shown.key === o.sessionId && shown.n === from;
        root.dataset.state = 'playing';
        box.className = C + ' ' + C + '-live ' + C + '-still';
        build(p.cfg);
        run.textContent = '0.00×';
        clearReadout();
        const events = [];
        p.moves.forEach((m) => {
          events.push({ at: m.at, fn: () => climb(m, p.cfg) });
          if (!m.survived && !m.bust) events.push({ at: m.at + FALL + FLASH, fn: () => unflash(m) });
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
          shown = { key: o.sessionId, n };
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
