// Sol-Core reveal — towers (session, Chain).
//
// A tower of `levels` floors × `columns` covered tiles, floor 1 at the bottom (geometry from
// the engine config, per-floor `floors[]` when the server sends them). Every step of the
// session lights the chosen tile in accent, a marker climbs to that floor and the floor's
// multiplier (from the server step) appears on the left. On a bust the chosen tile turns
// red, the marker stops there and the bomb tiles of every floor are turned up dimmed. The
// readout enters the DOM only at the end — while climbing the nodes are EMPTY.
//
// INCREMENTAL: `play(o, { from })` — the first `from` steps of the SAME session
// (`o.sessionId`) are set instantly without transitions, only the new step and the
// ending are animated. A different session (e.g. after a reload) replays everything.
//
// Fairness (docs/RULES.md, rule 16): every tile looks the same until the transcript lights
// it; columns, order, safe or bomb, per-floor multipliers and the bomb layout come from
// the server as they are; a bust shows the red tile at the same pace as every climb.
// Text through `ctx.text(...)`, colours through the theme tokens. Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'towers',
  mechanic: 'session',
  strings: ['reveal.won', 'result.lost', 'reveal.towers.title', 'reveal.towers.floor', 'reveal.towers.shape', 'reveal.towers.mixed', 'reveal.towers.cleared', 'reveal.towers.bust', 'reveal.towers.bustShown', 'reveal.cashedOut', 'reveal.topReached'],

  mount(root, ctx) {
    const C = 'sca-towers';
    const LEAD = 380;                   // ms of rest before a floor is climbed
    const MOVE = 280;                   // ms the marker takes to climb one floor
    const BUST_HOLD = 320;              // ms the red tile stands alone before the bombs turn up
    const SWEEP = 360;                  // ms the dimmed bomb reveal takes before the readout
    const SETTLE = 400;                 // ms between the last safe floor and the readout
    const TAIL = 320;                   // ms the readout takes to settle
    const DEFAULT_LEVELS = 6, DEFAULT_COLUMNS = 3, DEFAULT_BOMBS = 1;
    // ~450 ms per floor; tall towers are compressed so a full replay stays under 4.5 s.
    const stepMs = (n) => (n <= 7 ? 450 : Math.max(240, Math.floor(3150 / n)));

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums}
.${C} .${C}-head{position:absolute;left:6%;right:8%;top:5%;display:flex;justify-content:space-between;align-items:baseline;gap:calc(var(--u)*2.5);font-size:calc(var(--u)*3.2);line-height:1;letter-spacing:.05em;color:var(--muted);white-space:nowrap}
.${C} .${C}-head b{font-weight:600;color:var(--fg)}
.${C} .${C}-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
.${C} .${C}-run{flex:0 0 auto;font-weight:600;color:var(--fg);letter-spacing:0;transition:color .25s ease}
.${C}.${C}-win .${C}-run{color:var(--accent)}
.${C}.${C}-loss .${C}-run{color:var(--red)}
.${C} .${C}-tower{position:absolute;left:8%;width:82%;top:12.5%;height:61%}
.${C} .${C}-ground{position:absolute;left:0;right:0;bottom:calc(var(--u)*-1.2);height:1px;background:var(--line)}
.${C} .${C}-rows{position:absolute;inset:0;display:grid;grid-auto-rows:1fr}
.${C} .${C}-row{position:relative;display:flex;align-items:stretch}
.${C} .${C}-lab{flex:0 0 22%;box-sizing:border-box;padding-right:calc(var(--u)*2.2);display:flex;align-items:center;justify-content:flex-end;font-size:calc(var(--u)*3.1);line-height:1;color:var(--faint);white-space:nowrap}
.${C} .${C}-lab.${C}-set{color:var(--fg)}
.${C} .${C}-lab.${C}-top{color:var(--accent);font-weight:600}
.${C}.${C}-loss .${C}-lab.${C}-top{color:var(--red)}
.${C} .${C}-tiles{flex:1 1 auto;display:flex;gap:calc(var(--u)*1.4);padding:calc(var(--u)*.7) 0}
.${C} .${C}-tile{position:relative;flex:1 1 0;box-sizing:border-box;border-radius:calc(var(--u)*1.1);border:1px solid var(--line);background:var(--panel-strong);transition:background .22s ease,border-color .22s ease,opacity .3s ease}
.${C} .${C}-tile::after{content:'';position:absolute;left:50%;top:50%;width:calc(var(--u)*1.2);height:calc(var(--u)*1.2);margin:calc(var(--u)*-.6) 0 0 calc(var(--u)*-.6);border-radius:50%;background:var(--faint);transition:background .22s ease}
.${C} .${C}-tile.${C}-safe{border-color:var(--accent);background:rgba(var(--accent-rgb)/.16)}
.${C} .${C}-tile.${C}-safe::after{background:var(--accent)}
.${C} .${C}-tile.${C}-bust{border-color:var(--red);background:var(--panel)}
.${C} .${C}-tile.${C}-bomb{border-color:var(--red);background:var(--panel);opacity:.45}
.${C} .${C}-tile.${C}-bust::after,.${C} .${C}-tile.${C}-bomb::after{display:none}
.${C} .${C}-tile svg{position:absolute;left:50%;top:50%;width:calc(var(--u)*4.2);height:calc(var(--u)*4.2);max-width:70%;max-height:70%;transform:translate(-50%,-50%);color:var(--red);display:none}
.${C} .${C}-tile.${C}-bust svg,.${C} .${C}-tile.${C}-bomb svg{display:block}
.${C}.${C}-done.${C}-loss .${C}-tile:not(.${C}-safe):not(.${C}-bust):not(.${C}-bomb){opacity:.5}
.${C} .${C}-marker{position:absolute;left:22%;margin-left:calc(var(--u)*-1.9);top:100%;width:0;height:0;border-top:calc(var(--u)*1.6) solid transparent;border-bottom:calc(var(--u)*1.6) solid transparent;border-left:calc(var(--u)*2.1) solid var(--muted);transform:translateY(-50%);transition:top ${MOVE}ms cubic-bezier(.4,0,.2,1),border-color .25s ease}
.${C}.${C}-live .${C}-marker{border-left-color:var(--accent)}
.${C}.${C}-loss .${C}-marker{border-left-color:var(--red)}
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
.${C}.${C}-still .${C}-marker,.${C}.${C}-still .${C}-tile,.${C}.${C}-still .${C}-tile::after,.${C}.${C}-still .${C}-readout,.${C}.${C}-still .${C}-hint,.${C}.${C}-still .${C}-run{transition:none}
@media (prefers-reduced-motion:reduce){.${C} .${C}-marker,.${C} .${C}-tile,.${C} .${C}-tile::after,.${C} .${C}-readout,.${C} .${C}-hint,.${C} .${C}-run{transition:none}}
`;
    const BOMB = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="6" fill="currentColor" opacity=".28"/><circle cx="12" cy="13" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 4v3M12 19v3M3 13h3M18 13h3M5.6 6.6l2.2 2.2M16.2 17.2l2.2 2.2M5.6 19.4l2.2-2.2M16.2 8.8l2.2-2.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const clamp = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

    // Tower geometry: per-floor `floors[]` when the server sent them, else the scalars
    // {levels, columns, bombs}. Round echo first, then the game's config (idle). Never
    // shorter than the transcript itself.
    function config(o) {
      const c = (o && o.engineConfig) || ctx.engineConfig || {};
      const steps = o && Array.isArray(o.steps) ? o.steps.length : 0;
      let floors;
      if (Array.isArray(c.floors) && c.floors.length > 0) {
        floors = c.floors.slice(0, 12).map((f) => {
          const columns = clamp(f && f.columns, 2, 4, DEFAULT_COLUMNS);
          return { columns, bombs: clamp(f && f.bombs, 1, columns - 1, DEFAULT_BOMBS) };
        });
      } else {
        const columns = clamp(c.columns, 2, 4, DEFAULT_COLUMNS);
        const bombs = clamp(c.bombs, 1, columns - 1, DEFAULT_BOMBS);
        const levels = clamp(c.levels, 1, 12, DEFAULT_LEVELS);
        floors = Array.from({ length: levels }, () => ({ columns, bombs }));
      }
      while (floors.length < steps) floors.push(floors[floors.length - 1] || { columns: DEFAULT_COLUMNS, bombs: DEFAULT_BOMBS });
      const uniform = floors.every((f) => f.columns === floors[0].columns && f.bombs === floors[0].bombs);
      return { floors, levels: floors.length, uniform };
    }
    // Replay plan — a pure function of the outcome: which tile lights when, what it shows.
    function plan(o) {
      const cfg = config(o);
      const steps = Array.isArray(o.steps) ? o.steps : [];
      const live = o.status === 'active';
      const busted = o.status === 'busted';
      const n = steps.length;
      const step = stepMs(n);
      const climbs = steps.map((s, i) => ({
        floor: i,
        column: Math.round(Number(s.column)),
        at: LEAD + i * step,
        bust: busted && (s.safe === false || i === n - 1),
        multiplierBps: s.multiplierBps,
      }));
      const bombs = [];
      if (busted && Array.isArray(o.bombColumns)) {
        o.bombColumns.forEach((row, f) => {
          const cols = Array.isArray(row) ? row : typeof row === 'number' ? [row] : [];
          cols.forEach((col) => { if (typeof col === 'number') bombs.push({ floor: f, column: Math.round(col) }); });
        });
      }
      const lastAt = n ? climbs[n - 1].at : LEAD;
      const sweepAt = busted ? lastAt + MOVE + BUST_HOLD : null;
      const readoutAt = busted ? sweepAt + SWEEP : lastAt + MOVE + SETTLE;
      return { cfg, climbs, bombs, busted, live, sweepAt, readoutAt, end: live ? lastAt + MOVE : readoutAt + TAIL };
    }

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const box = el('div', C);
    const head = el('div', C + '-head');
    const title = el('span', C + '-title');
    const run = el('span', C + '-run', '1.00×');
    head.appendChild(title); head.appendChild(run);
    const tower = el('div', C + '-tower');
    const rows = el('div', C + '-rows');
    const ground = el('div', C + '-ground');
    const marker = el('div', C + '-marker');
    tower.appendChild(rows); tower.appendChild(ground); tower.appendChild(marker);
    const hint = el('div', C + '-hint', ctx.hint || '');
    const readout = el('div', C + '-readout');
    const multEl = el('div', C + '-mult', '');
    const resEl = el('div', C + '-res', '');
    const fiatEl = el('div', C + '-fiat', '');
    const subEl = el('div', C + '-sub', '');
    readout.appendChild(multEl); readout.appendChild(resEl); readout.appendChild(fiatEl); readout.appendChild(subEl);
    box.appendChild(head); box.appendChild(tower); box.appendChild(hint); box.appendChild(readout);
    root.appendChild(box);

    let floors = [];     // floors[f] = { lab, tiles[] }, f = 0 is the bottom floor
    let levels = DEFAULT_LEVELS;
    const measure = () => {
      const w = root.getBoundingClientRect().width;
      if (w > 0) box.style.setProperty('--u', (w / 100).toFixed(3) + 'px');
    };
    measure();
    let ro = null;
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(root); }

    // Build the covered tower, top row first so floor 1 lands at the bottom. Every tile identical.
    function build(cfg) {
      rows.innerHTML = '';
      floors = [];
      levels = cfg.levels;
      rows.style.gridTemplateRows = 'repeat(' + levels + ',1fr)';
      for (let f = levels - 1; f >= 0; f--) {
        const row = el('div', C + '-row');
        const lab = el('div', C + '-lab', ctx.text('reveal.towers.floor', { n: f + 1 }));
        const tiles = el('div', C + '-tiles');
        const list = [];
        for (let c = 0; c < cfg.floors[f].columns; c++) {
          const t = el('div', C + '-tile');
          t.innerHTML = BOMB;
          tiles.appendChild(t);
          list.push(t);
        }
        row.appendChild(lab); row.appendChild(tiles);
        rows.appendChild(row);
        floors[f] = { lab, tiles: list };
      }
      const first = cfg.floors[0];
      title.innerHTML = '';
      title.appendChild(el('b', null, ctx.text('reveal.towers.title')));
      title.appendChild(document.createTextNode(' · ' + (cfg.uniform
        ? ctx.text('reveal.towers.shape', { levels, columns: first.columns, bombs: first.bombs })
        : ctx.text('reveal.towers.mixed', { levels }))));
      markerTo(-1);
    }
    // Marker at floor f (0 = bottom); -1 = the ground line below the tower.
    function markerTo(f) {
      marker.style.top = f < 0 ? '100%' : (((levels - 1 - f) + 0.5) / levels * 100).toFixed(3) + '%';
    }
    function climb(k) {
      const fl = floors[k.floor]; if (!fl) return;
      const t = fl.tiles[k.column];
      if (t) t.classList.add(k.bust ? C + '-bust' : C + '-safe');
      if (k.bust) box.classList.add(C + '-loss');
      else {
        fl.lab.textContent = ctx.fmt.mult(k.multiplierBps);
        fl.lab.classList.add(C + '-set');
        run.textContent = ctx.fmt.mult(k.multiplierBps);
      }
      markerTo(k.floor);
    }
    const clearReadout = () => { multEl.textContent = ''; resEl.textContent = ''; fiatEl.textContent = ''; subEl.textContent = ''; };
    function idle() {
      box.className = C;
      hint.textContent = ctx.hint || '';
      build(config(null));
      run.textContent = '1.00×';
      clearReadout();
    }
    // The ONLY place the result enters the DOM — the final frame.
    function finish(o, p) {
      const n = p.climbs.length;
      box.classList.add(C + '-done', o.win ? C + '-win' : C + '-loss');
      const top = n ? p.climbs[n - 1] : null;
      if (top && floors[top.floor]) floors[top.floor].lab.classList.add(C + '-top');
      run.textContent = ctx.fmt.mult(o.multiplierBps);
      multEl.textContent = ctx.fmt.mult(o.multiplierBps);
      resEl.textContent = o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
      fiatEl.textContent = (o.win && ctx.fmt.fiat(o.payoutLamports)) || '';
      const bombs = p.cfg.floors[0].bombs;
      subEl.textContent = o.win
        ? ctx.text('reveal.towers.cleared', { n, end: ctx.text(n >= p.cfg.levels ? 'reveal.topReached' : 'reveal.cashedOut') })
        : p.cfg.uniform ? ctx.text('reveal.towers.bust', { n, bombs }) : ctx.text('reveal.towers.bustShown', { n });
    }

    let raf = 0, pending = null;
    let shown = null;   // { key, n } — the session and step count standing on the tower
    const cancel = () => { if (raf) cancelAnimationFrame(raf); raf = 0; if (pending) { const r = pending; pending = null; r(); } };
    idle();
    root.dataset.state = 'idle';

    return {
      play(o, opts) {
        cancel();
        measure();
        o = o || {};
        const p = plan(o);
        const n = p.climbs.length;
        const reduced = !!(opts && opts.reducedMotion);
        const from = opts && Number.isInteger(opts.from) ? Math.max(0, Math.min(n, opts.from)) : 0;
        const inc = from > 0 && !!shown && shown.key === o.sessionId && shown.n === from;
        root.dataset.state = 'playing';
        box.className = C + ' ' + C + '-live ' + C + '-still';
        build(p.cfg);
        run.textContent = '1.00×';
        clearReadout();
        const events = [];
        p.climbs.forEach((k) => events.push({ at: k.at, fn: () => climb(k) }));
        if (p.busted) {
          events.push({ at: p.sweepAt, fn: () => {
            p.bombs.forEach((b) => {
              const fl = floors[b.floor]; const t = fl && fl.tiles[b.column];
              if (t && !t.classList.contains(C + '-bust')) t.classList.add(C + '-bomb');
            });
          } });
        }
        if (!p.live) events.push({ at: p.readoutAt, fn: () => finish(o, p) });
        const cut = inc ? (from < n ? p.climbs[from].at : p.readoutAt) : 0;
        const skip = inc ? Math.max(0, from < n ? p.climbs[from].at - LEAD : p.readoutAt - 200) : 0;
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
