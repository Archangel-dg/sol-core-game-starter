// Sol-Core reveal — mines (session, Interactive).
//
// A board of identical covered tiles (gridSize from the engine config). Every pick of the
// session turns one tile over (rotateX) and shows a gem while the running multiplier in
// the header climbs to the value the server paid at that step. On a bust the last pick
// turns over to a mine and the remaining mines are turned over dimmed; on a cash-out the
// gems stay lit. The readout (multiplier, won/lost, fiat, summary) enters the DOM only at
// the end — while tiles are turning the nodes are EMPTY.
//
// INCREMENTAL: the session flow plays the transcript step by step. `play(o, { from })`
// says how many steps already stand on the board — those are set instantly, without
// transitions, and only the new step (and the ending) is animated. The board is only
// trusted when it shows the SAME session (`o.sessionId`); otherwise the whole transcript
// is replayed (e.g. after a reload).
//
// Fairness (docs/RULES.md, rule 16): every tile looks the same until the transcript turns
// it; picked tiles, their order, gem or mine and the multiplier per step come from the
// server session as they are; a bust turns the mine at the same pace as every other pick.
// Text through `ctx.text(...)`, colours through the theme tokens. Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'mines',
  mechanic: 'session',
  strings: ['reveal.won', 'result.lost', 'reveal.mines.title', 'reveal.mines.board', 'reveal.mines.gems', 'reveal.mines.bust'],

  mount(root, ctx) {
    const C = 'sca-mines';              // class prefix — every rule is scoped with it
    const LEAD = 350;                   // ms of rest before a tile turns
    const FLIP = 420;                   // ms one tile takes to turn over
    const SWEEP = 140;                  // ms after the bust tile before the other mines turn
    const TAIL = 320;                   // ms the readout takes to settle
    const DEFAULT_GRID = 25;
    const DEFAULT_MINES = 3;
    // ~500 ms between two picks; long sessions are compressed so a full replay stays under 4.5 s.
    const stepMs = (n) => (n <= 6 ? 500 : Math.max(230, Math.floor(3000 / n)));

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums}
.${C} .${C}-head{position:absolute;left:20%;right:20%;top:5%;display:flex;justify-content:space-between;align-items:baseline;font-size:calc(var(--u)*3.2);line-height:1;letter-spacing:.08em;color:var(--muted);white-space:nowrap}
.${C} .${C}-head b{font-weight:600;color:var(--fg)}
.${C} .${C}-run{font-weight:600;color:var(--fg);letter-spacing:0;transition:color .25s ease}
.${C}.${C}-win .${C}-run{color:var(--accent)}
.${C}.${C}-loss .${C}-run{color:var(--red)}
.${C} .${C}-grid{position:absolute;left:20%;top:12%;width:60%;height:60%;display:grid;gap:calc(var(--u)*1.6)}
.${C} .${C}-tile{position:relative;perspective:calc(var(--u)*45)}
.${C} .${C}-card{position:absolute;inset:0;transform-style:preserve-3d;transition:transform ${FLIP}ms cubic-bezier(.45,0,.2,1)}
.${C} .${C}-open .${C}-card{transform:rotateX(180deg)}
.${C} .${C}-front,.${C} .${C}-back{position:absolute;inset:0;box-sizing:border-box;border-radius:calc(var(--u)*1.2);border:1px solid var(--line);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.${C} .${C}-front{background:var(--panel-strong)}
.${C} .${C}-front::after{content:'';position:absolute;left:50%;top:50%;width:calc(var(--u)*1.2);height:calc(var(--u)*1.2);margin:calc(var(--u)*-.6) 0 0 calc(var(--u)*-.6);border-radius:50%;background:var(--faint)}
.${C} .${C}-back{transform:rotateX(180deg);background:var(--panel);display:flex;align-items:center;justify-content:center}
.${C} .${C}-back svg{width:52%;height:52%;display:block}
.${C} .${C}-gem .${C}-back{border-color:var(--accent);color:var(--accent)}
.${C} .${C}-mine .${C}-back{border-color:var(--red);color:var(--red)}
.${C} .${C}-dim .${C}-back{opacity:.42}
.${C}.${C}-done.${C}-loss .${C}-tile:not(.${C}-open) .${C}-front{opacity:.55}
.${C} .${C}-hint{position:absolute;left:0;right:0;top:78%;text-align:center;font-size:calc(var(--u)*3.2);line-height:1.3;color:var(--muted);white-space:nowrap;transition:opacity .2s ease}
.${C}.${C}-live .${C}-hint{opacity:0}
.${C} .${C}-readout{position:absolute;left:0;right:0;top:75%;text-align:center;opacity:0;transform:translateY(calc(var(--u)*1.5));transition:opacity .22s ease,transform .22s ease}
.${C}.${C}-done .${C}-readout{opacity:1;transform:none}
.${C} .${C}-mult{font-size:calc(var(--u)*6);font-weight:700;line-height:1.1;color:var(--fg)}
.${C}.${C}-loss .${C}-mult{color:var(--muted)}
.${C} .${C}-res{font-size:calc(var(--u)*4.4);line-height:1.2;margin-top:calc(var(--u)*1.2);font-weight:600}
.${C}.${C}-win .${C}-res{color:var(--accent)}
.${C}.${C}-loss .${C}-res{color:var(--red)}
.${C} .${C}-fiat{font-size:calc(var(--u)*3.1);line-height:1.2;margin-top:calc(var(--u)*.6);color:var(--muted)}
.${C} .${C}-sub{font-size:calc(var(--u)*3.1);line-height:1.2;margin-top:calc(var(--u)*1);color:var(--muted);white-space:nowrap}
.${C}.${C}-still .${C}-card,.${C}.${C}-still .${C}-readout,.${C}.${C}-still .${C}-hint,.${C}.${C}-still .${C}-run{transition:none}
@media (prefers-reduced-motion:reduce){.${C} .${C}-card,.${C} .${C}-readout,.${C} .${C}-hint,.${C} .${C}-run{transition:none}}
`;
    const GEM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10l5 6-10 13L2 9z" fill="currentColor" opacity=".28"/><path d="M7 3h10l5 6-10 13L2 9zM2 9h20M7 3l5 6 5-6M12 9v13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    const MINE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="6" fill="currentColor" opacity=".28"/><circle cx="12" cy="13" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 4v3M12 19v3M3 13h3M18 13h3M5.6 6.6l2.2 2.2M16.2 17.2l2.2 2.2M5.6 19.4l2.2-2.2M16.2 8.8l2.2-2.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

    // Board dimensions: the round's own config echo first, then the game's (idle board).
    function config(o) {
      const c = (o && o.engineConfig) || ctx.engineConfig || {};
      const gridSize = Math.max(2, Math.round(Number(c.gridSize) || DEFAULT_GRID));
      const mineCount = Math.min(gridSize - 1, Math.max(1, Math.round(Number(c.mineCount) || DEFAULT_MINES)));
      const cols = Math.ceil(Math.sqrt(gridSize));
      return { gridSize, mineCount, cols, rows: Math.ceil(gridSize / cols) };
    }
    // Replay plan — a pure function of the outcome: which tile turns when, what it shows.
    function plan(o) {
      const cfg = config(o);
      const steps = Array.isArray(o.steps) ? o.steps : [];
      const live = o.status === 'active';
      const busted = o.status === 'busted';
      const n = steps.length;
      const step = stepMs(n);
      const picks = steps.map((s, i) => ({
        tile: Math.round(Number(s.tile)),
        at: LEAD + i * step,
        mine: busted && (s.safe === false || i === n - 1),
        multiplierBps: s.multiplierBps,
      }));
      const picked = new Set(picks.map((p) => p.tile));
      const others = busted && Array.isArray(o.minePositions)
        ? o.minePositions.map((t) => Math.round(Number(t))).filter((t) => !picked.has(t))
        : [];
      const lastEnd = n ? picks[n - 1].at + FLIP : LEAD;
      const sweepAt = busted ? lastEnd + SWEEP : null;
      const readoutAt = busted ? sweepAt + FLIP : lastEnd;
      return { cfg, picks, others, busted, live, sweepAt, readoutAt, end: live ? lastEnd : readoutAt + TAIL };
    }

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const box = el('div', C);
    const head = el('div', C + '-head');
    const title = el('span');
    const run = el('span', C + '-run', '1.00×');
    head.appendChild(title); head.appendChild(run);
    const grid = el('div', C + '-grid');
    const hint = el('div', C + '-hint', ctx.hint || '');
    const readout = el('div', C + '-readout');
    const multEl = el('div', C + '-mult', '');
    const resEl = el('div', C + '-res', '');
    const fiatEl = el('div', C + '-fiat', '');
    const subEl = el('div', C + '-sub', '');
    readout.appendChild(multEl); readout.appendChild(resEl); readout.appendChild(fiatEl); readout.appendChild(subEl);
    box.appendChild(head); box.appendChild(grid); box.appendChild(hint); box.appendChild(readout);
    root.appendChild(box);

    let tiles = [];
    const measure = () => {
      const w = root.getBoundingClientRect().width;
      if (w > 0) box.style.setProperty('--u', (w / 100).toFixed(3) + 'px');
    };
    measure();
    let ro = null;
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(root); }

    // Build the covered board — every tile identical, nothing underneath until it turns.
    function board(cfg) {
      grid.innerHTML = '';
      grid.style.gridTemplateColumns = 'repeat(' + cfg.cols + ',1fr)';
      grid.style.gridTemplateRows = 'repeat(' + cfg.rows + ',1fr)';
      tiles = [];
      for (let i = 0; i < cfg.gridSize; i++) {
        const t = el('div', C + '-tile');
        const card = el('div', C + '-card');
        card.appendChild(el('div', C + '-front'));
        card.appendChild(el('div', C + '-back'));
        t.appendChild(card);
        grid.appendChild(t);
        tiles.push(t);
      }
      title.innerHTML = '';
      title.appendChild(el('b', null, ctx.text('reveal.mines.title')));
      title.appendChild(document.createTextNode(' · ' + ctx.text('reveal.mines.board', { mines: cfg.mineCount, tiles: cfg.gridSize })));
    }
    // Turn one tile over. The back is filled the moment it turns — not before.
    function turn(i, kind, dim) {
      const t = tiles[i]; if (!t) return;
      t.lastChild.lastChild.innerHTML = kind === 'mine' ? MINE : GEM;
      t.classList.add(C + '-' + kind);
      if (dim) t.classList.add(C + '-dim');
      t.classList.add(C + '-open');
    }
    const clearReadout = () => { multEl.textContent = ''; resEl.textContent = ''; fiatEl.textContent = ''; subEl.textContent = ''; };
    function idle() {
      box.className = C;
      hint.textContent = ctx.hint || '';
      board(config(null));
      run.textContent = '1.00×';
      clearReadout();
    }
    // The ONLY place the result enters the DOM — the final frame.
    function finish(o, p) {
      const n = p.picks.length;
      box.classList.add(C + '-done', o.win ? C + '-win' : C + '-loss');
      run.textContent = ctx.fmt.mult(o.multiplierBps);
      multEl.textContent = ctx.fmt.mult(o.multiplierBps);
      resEl.textContent = o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
      fiatEl.textContent = (o.win && ctx.fmt.fiat(o.payoutLamports)) || '';
      subEl.textContent = o.win
        ? ctx.text('reveal.mines.gems', { n })
        : ctx.text('reveal.mines.bust', { n, mines: p.cfg.mineCount });
    }

    let raf = 0, pending = null;
    let shown = null;   // { key, n } — the session and step count standing on the board
    const cancel = () => { if (raf) cancelAnimationFrame(raf); raf = 0; if (pending) { const r = pending; pending = null; r(); } };
    idle();
    root.dataset.state = 'idle';

    return {
      play(o, opts) {
        cancel();
        measure();
        o = o || {};
        const p = plan(o);
        const n = p.picks.length;
        const reduced = !!(opts && opts.reducedMotion);
        const from = opts && Number.isInteger(opts.from) ? Math.max(0, Math.min(n, opts.from)) : 0;
        // Incremental: the board shows the first `from` steps of THIS session already.
        const inc = from > 0 && !!shown && shown.key === o.sessionId && shown.n === from;
        root.dataset.state = 'playing';
        box.className = C + ' ' + C + '-live ' + C + '-still';
        board(p.cfg);
        run.textContent = '1.00×';
        clearReadout();
        // Event list in time order — the frame at elapsed t is the same for every replay.
        const events = [];
        p.picks.forEach((k) => events.push({ at: k.at, fn: () => { turn(k.tile, k.mine ? 'mine' : 'gem', false); run.textContent = ctx.fmt.mult(k.mine ? o.multiplierBps : k.multiplierBps); } }));
        if (p.busted) events.push({ at: p.sweepAt, fn: () => { box.classList.add(C + '-loss'); p.others.forEach((t) => turn(t, 'mine', true)); } });
        if (!p.live) events.push({ at: p.readoutAt, fn: () => finish(o, p) });
        // Caught-up frame: everything before the new step is set now, without transitions.
        const cut = inc ? (from < n ? p.picks[from].at : p.readoutAt) : 0;
        const skip = inc ? Math.max(0, from < n ? p.picks[from].at - LEAD : p.readoutAt - 200) : 0;
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
