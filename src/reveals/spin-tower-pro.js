// Sol-Core reveal — spin-tower-pro (session, Chain).
//
// T towers side by side, each a stack of level blocks labelled with its multiplier
// (engine config). Every paid spin: the outcome strip at the top steps through its chips
// at a constant pace and stops on the drawn outcome, then the towers answer — a climbed
// block lights in accent, a maxed tower flashes amber and its top multiplier moves into
// the Secured figure, a FAIL turns the lost blocks red (reset drops every block, step-down
// lowers each tower by one). Pot and Secured are always two figures; the readout enters
// the DOM only at the end. Every frame is a pure function of (transcript, elapsed time).
//
// INCREMENTAL: `play(o, { from })` renders the first `from` spins of the SAME session
// (`o.sessionId`) instantly and animates only the new spin (or the ending).
//
// Fairness (docs/RULES.md, rule 16): every spin is drawn from the transcript as it is —
// the strip stops on the recorded outcome, levels/pot/secured after each spin are read,
// never recomputed, and a FAIL is shown at the same pace as every climb.
// Text through `ctx.text(...)`, colours through the theme tokens. Design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'spin-tower-pro',
  mechanic: 'session',
  strings: ['reveal.won', 'result.lost', 'reveal.spinTower.title', 'reveal.spinTower.spin', 'reveal.spinTower.perSpin', 'reveal.spinTower.joker', 'reveal.spinTower.nothing', 'reveal.spinTower.fail', 'reveal.spinTower.pot', 'reveal.spinTower.secured', 'reveal.spinTower.reset', 'reveal.spinTower.stepdown', 'reveal.spinTower.busted', 'reveal.spinTower.capReached', 'reveal.spinTower.cashed', 'reveal.spinTower.sub', 'session.tower'],

  mount(root, ctx) {
    const C = 'sca-spin-tower-pro';
    const LEAD = 350;                   // ms of rest before a spin
    const SETTLE = 450;                 // ms between the last spin's flash and the readout
    const TAIL = 300;                   // ms the readout takes to settle
    const MAX_TOWERS = 5, MAX_LEVELS = 8;
    const DEFAULT_TOWERS = [
      { levels: 3, multipliersBps: [5000, 12000, 25000] },
      { levels: 4, multipliersBps: [4000, 9000, 16000, 30000] },
      { levels: 2, multipliersBps: [8000, 20000] },
    ];

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums}
.${C} .${C}-head{position:absolute;left:6%;right:6%;top:4.5%;display:flex;justify-content:space-between;align-items:baseline;gap:calc(var(--u)*2);font-size:calc(var(--u)*3.1);line-height:1;letter-spacing:.03em;color:var(--muted);white-space:nowrap}
.${C} .${C}-head b{font-weight:600;color:var(--fg)}
.${C} .${C}-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
.${C} .${C}-count{flex:0 0 auto;color:var(--fg);letter-spacing:0}
.${C} .${C}-strip{position:absolute;left:6%;right:6%;top:11%;height:8%;display:flex;gap:calc(var(--u)*1.2)}
.${C} .${C}-chip{flex:1 1 0;min-width:0;box-sizing:border-box;display:flex;align-items:center;justify-content:center;border-radius:calc(var(--u)*1.1);border:1px solid var(--line);background:var(--panel);font-size:calc(var(--u)*3.1);line-height:1;color:var(--faint);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;transition:background .16s ease,border-color .16s ease,color .16s ease}
.${C} .${C}-chip.${C}-cur{border-color:var(--muted);color:var(--fg);background:var(--panel-strong)}
.${C} .${C}-chip.${C}-hit{border-color:var(--muted);color:var(--fg);background:var(--panel-strong)}
.${C} .${C}-chip.${C}-hit.${C}-k-tower,.${C} .${C}-chip.${C}-hit.${C}-k-joker{border-color:var(--accent);color:var(--accent);background:rgba(var(--accent-rgb)/.16)}
.${C} .${C}-chip.${C}-hit.${C}-k-secure{border-color:var(--amber);color:var(--amber);background:var(--panel-strong)}
.${C} .${C}-chip.${C}-hit.${C}-k-fail{border-color:var(--red);color:var(--red);background:var(--panel-strong)}
.${C} .${C}-chip.${C}-last{border-color:var(--line);color:var(--muted);background:var(--panel-strong)}
.${C} .${C}-towers{position:absolute;left:6%;right:6%;top:22.5%;height:36%;display:flex;gap:calc(var(--u)*2.2)}
.${C} .${C}-col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:flex-end}
.${C} .${C}-blk{box-sizing:border-box;display:flex;align-items:center;justify-content:center;margin-top:calc(var(--u)*1);border-radius:calc(var(--u)*1.1);border:1px solid var(--line);background:var(--panel);font-size:calc(var(--u)*3.1);line-height:1;color:var(--faint);white-space:nowrap;overflow:hidden;transition:background .18s ease,border-color .18s ease,color .18s ease}
.${C} .${C}-blk:first-child{margin-top:0}
.${C} .${C}-blk.${C}-on{border-color:rgba(var(--accent-rgb)/.35);background:rgba(var(--accent-rgb)/.07);color:var(--accent-soft)}
.${C} .${C}-blk.${C}-top{border-color:var(--accent);background:rgba(var(--accent-rgb)/.16);color:var(--accent);font-weight:600}
.${C} .${C}-blk.${C}-new{background:rgba(var(--accent-rgb)/.34);color:var(--fg)}
.${C} .${C}-col.${C}-max .${C}-blk.${C}-top{border-color:var(--amber);color:var(--amber);background:var(--panel-strong)}
.${C} .${C}-blk.${C}-secure{background:rgba(255,209,102,.28);color:var(--fg);border-color:var(--amber)}
.${C} .${C}-blk.${C}-drop{border-color:var(--red);background:var(--panel-strong);color:var(--red)}
.${C} .${C}-names{position:absolute;left:6%;right:6%;top:59.5%;display:flex;gap:calc(var(--u)*2.2);font-size:calc(var(--u)*3.1);line-height:1;color:var(--faint);text-align:center}
.${C} .${C}-names span{flex:1 1 0;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.${C} .${C}-names span.${C}-max{color:var(--amber)}
.${C} .${C}-figs{position:absolute;left:6%;right:6%;top:65.5%;height:9.5%;display:flex;gap:calc(var(--u)*2.2)}
.${C} .${C}-fig{flex:1 1 0;min-width:0;box-sizing:border-box;border-radius:calc(var(--u)*1.1);border:1px solid var(--line);background:var(--panel);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(var(--u)*.9);white-space:nowrap;transition:border-color .18s ease}
.${C} .${C}-fig i{font-style:normal;font-size:calc(var(--u)*3.1);line-height:1;letter-spacing:.05em;color:var(--muted)}
.${C} .${C}-fig b{font-size:calc(var(--u)*4.6);line-height:1;font-weight:700;color:var(--fg);transition:color .18s ease}
.${C} .${C}-fig.${C}-pot.${C}-lost b{color:var(--red)}
.${C} .${C}-fig.${C}-sec.${C}-bump{border-color:var(--amber)}
.${C} .${C}-fig.${C}-sec.${C}-bump b,.${C} .${C}-fig.${C}-sec.${C}-has b{color:var(--amber)}
.${C} .${C}-hint{position:absolute;left:0;right:0;top:82%;text-align:center;font-size:calc(var(--u)*3.1);line-height:1.4;color:var(--muted);white-space:nowrap;transition:opacity .2s ease}
.${C}.${C}-live .${C}-hint{opacity:0}
.${C} .${C}-readout{position:absolute;left:0;right:0;top:78%;text-align:center;opacity:0;transform:translateY(calc(var(--u)*1.5));transition:opacity .22s ease,transform .22s ease}
.${C}.${C}-done .${C}-readout{opacity:1;transform:none}
.${C} .${C}-mult{font-size:calc(var(--u)*5.6);font-weight:700;line-height:1.1;color:var(--fg)}
.${C}.${C}-loss .${C}-mult{color:var(--muted)}
.${C} .${C}-res{font-size:calc(var(--u)*4.2);line-height:1.2;margin-top:calc(var(--u)*.8);font-weight:600}
.${C}.${C}-win .${C}-res{color:var(--accent)}
.${C}.${C}-loss .${C}-res{color:var(--red)}
.${C} .${C}-fiat{font-size:calc(var(--u)*3.1);line-height:1.2;margin-top:calc(var(--u)*.5);color:var(--muted)}
.${C} .${C}-sub{font-size:calc(var(--u)*3.1);line-height:1.2;margin-top:calc(var(--u)*.9);color:var(--muted);white-space:nowrap}
.${C}.${C}-still *{transition:none!important}
@media (prefers-reduced-motion:reduce){.${C} *{transition:none!important}}
`;
    const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

    // Board geometry from the config echo (`towers`, `failMode`, `maxSpins`): the round's own
    // first, then the game's (idle board).
    function config(o) {
      const c = (o && o.engineConfig) || ctx.engineConfig || {};
      let towers = [];
      if (Array.isArray(c.towers)) {
        towers = c.towers.slice(0, MAX_TOWERS).map((t) => {
          const raw = t && Array.isArray(t.multipliersBps) ? t.multipliersBps.filter((m) => num(m) !== null) : [];
          const levels = clampInt(t && t.levels, 1, MAX_LEVELS, raw.length || 1);
          const multipliersBps = Array.from({ length: levels }, (_, i) => raw[i] != null ? raw[i] : null);
          return { levels, multipliersBps };
        });
      }
      if (towers.length === 0) towers = DEFAULT_TOWERS.map((t) => ({ levels: t.levels, multipliersBps: t.multipliersBps.slice() }));
      const failMode = c.failMode === 'stepdown' ? 'stepdown' : 'reset';
      const maxSpins = num(c.maxSpins);
      const maxLevels = towers.reduce((m, t) => Math.max(m, t.levels), 1);
      return { towers, failMode, maxSpins, maxLevels };
    }
    // Replay plan — a pure function of the outcome: what every spin shows and when.
    function plan(o) {
      const cfg = config(o);
      const T = cfg.towers.length;
      const N = T + 3;                                     // chips: towers, joker, nothing, FAIL
      const spins = Array.isArray(o.spins) ? o.spins : [];
      const n = spins.length;
      const live = o.status === 'active';
      const step = n <= 5 ? 600 : Math.max(40, Math.min(550, Math.floor(3300 / (n - 1))));
      const cyc = Math.min(240, Math.round(step * 0.4));   // draw phase: the strip steps at a constant pace
      const tick = Math.max(8, cyc / 6);
      const flash = Math.min(320, step);
      let prev = cfg.towers.map(() => 0);
      let prevSec = 0;
      const potOf = (lv) => cfg.towers.reduce((s, t, i) => (lv[i] > 0 ? s + (num(t.multipliersBps[lv[i] - 1]) || 0) : s), 0);
      const events = spins.map((s, i) => {
        const at = LEAD + i * step;
        const oc = (s && s.outcome) || {};
        const kind = oc.kind === 'tower' || oc.kind === 'joker' || oc.kind === 'nothing' || oc.kind === 'fail' ? oc.kind : 'nothing';
        const idx = kind === 'tower' ? clampInt(oc.tower, 0, T - 1, 0) : kind === 'joker' ? T : kind === 'nothing' ? T + 1 : T + 2;
        const raw = s && Array.isArray(s.levels) ? s.levels : [];
        const levels = cfg.towers.map((t, k) => clampInt(raw[k], 0, t.levels, prev[k]));
        const secured = num(s && s.securedBps) != null ? s.securedBps : prevSec;
        const pot = num(s && s.potBps) != null ? s.potBps : potOf(levels);
        const towers = cfg.towers.map((t, k) => ({
          from: prev[k], to: levels[k],
          climb: levels[k] > prev[k],
          drop: levels[k] < prev[k],
          secure: prev[k] === t.levels && (kind === 'joker' || (kind === 'tower' && idx === k)),
        }));
        const gain = secured > prevSec;
        prev = levels; prevSec = secured;
        return { at, apply: at + cyc, idx, kind: gain ? 'secure' : kind, levels, pot, secured, towers, gain };
      });
      const lastApply = n ? events[n - 1].apply : LEAD;
      const readoutAt = lastApply + flash + SETTLE;
      const last = n ? events[n - 1] : null;
      const pot = num(o.potBps) != null ? o.potBps : last ? last.pot : 0;
      const secured = num(o.securedBps) != null ? o.securedBps : last ? last.secured : 0;
      const capped = o.endReason === 'max_spins' || o.status === 'max_spins';
      return { cfg, T, N, events, n, step, tick, flash, live, lastApply, readoutAt, end: live ? lastApply + flash : readoutAt + TAIL, pot, secured, win: o.win === true, status: o.status, capped, payout: o.payoutLamports, bet: o.betLamports };
    }

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const box = el('div', C);
    const head = el('div', C + '-head');
    const title = el('span', C + '-title');
    const count = el('span', C + '-count', '');
    head.appendChild(title); head.appendChild(count);
    const strip = el('div', C + '-strip');
    const towers = el('div', C + '-towers');
    const names = el('div', C + '-names');
    const figs = el('div', C + '-figs');
    const potFig = el('div', C + '-fig ' + C + '-pot');
    const potLab = el('i', null, ''); const potVal = el('b', null, '0.00×');
    potFig.appendChild(potLab); potFig.appendChild(potVal);
    const secFig = el('div', C + '-fig ' + C + '-sec');
    const secLab = el('i', null, ''); const secVal = el('b', null, '0.00×');
    secFig.appendChild(secLab); secFig.appendChild(secVal);
    figs.appendChild(potFig); figs.appendChild(secFig);
    const hint = el('div', C + '-hint', ctx.hint || '');
    const readout = el('div', C + '-readout');
    const multEl = el('div', C + '-mult', '');
    const resEl = el('div', C + '-res', '');
    const fiatEl = el('div', C + '-fiat', '');
    const subEl = el('div', C + '-sub', '');
    readout.appendChild(multEl); readout.appendChild(resEl); readout.appendChild(fiatEl); readout.appendChild(subEl);
    box.appendChild(head); box.appendChild(strip); box.appendChild(towers); box.appendChild(names);
    box.appendChild(figs); box.appendChild(hint); box.appendChild(readout);
    root.appendChild(box);

    const measure = () => {
      const w = root.getBoundingClientRect().width;
      if (w > 0) box.style.setProperty('--u', (w / 100).toFixed(3) + 'px');
    };
    measure();
    let ro = null;
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(root); }

    let chips = [];       // strip chips, index = outcome index
    let cols = [];        // cols[t] = { col, name, blocks[] }, blocks[0] = level 1 (bottom)
    let board = null;     // current cfg the DOM was built for
    let costLabel = '';   // ' · 0.1 ◎/spin' once a transcript with betLamports is played
    let P = null;         // current plan
    let raf = 0, pending = null, stillTimer = 0;
    let shown = null;     // { key, n } — the session and spin count standing on the board

    // Build the board: T columns of level blocks (top level first in the DOM so level 1 sits at
    // the bottom), one chip per outcome in the fixed server order tower 0..T-1, joker, nothing, FAIL.
    function build(cfg, betLamports) {
      board = cfg;
      strip.innerHTML = ''; towers.innerHTML = ''; names.innerHTML = '';
      chips = []; cols = [];
      const T = cfg.towers.length;
      for (let j = 0; j < T + 3; j++) {
        const label = j < T ? 'T' + (j + 1) : j === T ? ctx.text('reveal.spinTower.joker') : j === T + 1 ? ctx.text('reveal.spinTower.nothing') : ctx.text('reveal.spinTower.fail');
        const chip = el('div', C + '-chip', label);
        strip.appendChild(chip); chips.push(chip);
      }
      const gapPct = cfg.maxLevels > 5 ? 1.4 : 2.8;
      const bh = ((100 - (cfg.maxLevels - 1) * gapPct) / cfg.maxLevels).toFixed(3) + '%';
      const gapU = 'calc(var(--u)*' + (gapPct * 0.36).toFixed(2) + ')';
      cfg.towers.forEach((t, k) => {
        const col = el('div', C + '-col');
        const blocks = [];
        for (let l = t.levels; l >= 1; l--) {
          const m = t.multipliersBps[l - 1];
          const b = el('div', C + '-blk', m == null ? 'L' + l : ctx.fmt.mult(m));
          b.style.height = bh;
          if (l !== t.levels) b.style.marginTop = gapU;
          col.appendChild(b); blocks[l - 1] = b;
        }
        towers.appendChild(col);
        const name = el('span', null, ctx.text('session.tower', { n: k + 1 }));
        names.appendChild(name);
        cols.push({ col, name, blocks });
      });
      // Per-spin price stays visible next to the spin counter (product requirement).
      costLabel = betLamports != null ? ' · ' + ctx.text('reveal.spinTower.perSpin', { amount: ctx.fmt.sol(betLamports) }) : '';
      title.innerHTML = '';
      title.appendChild(el('b', null, ctx.text('reveal.spinTower.title')));
      title.appendChild(document.createTextNode(' · ' + ctx.text(cfg.failMode === 'stepdown' ? 'reveal.spinTower.stepdown' : 'reveal.spinTower.reset')));
      potLab.textContent = ctx.text('reveal.spinTower.pot');
      secLab.textContent = ctx.text('reveal.spinTower.secured');
      hint.textContent = ctx.hint || '';
    }

    // Frame at time t (ms since play started) — a pure function of the plan and t.
    function render(t) {
      const cfg = P.cfg;
      const ev = P.events;
      let k = 0;
      while (k < P.n && ev[k].apply <= t) k++;
      const cur = k ? ev[k - 1] : null;
      const inFlash = cur !== null && t < cur.apply + P.flash;
      const drawing = k < P.n && t >= ev[k].at;
      let cursor = -1;
      if (drawing) {
        const remaining = Math.ceil((ev[k].apply - t) / P.tick);
        cursor = ((ev[k].idx - remaining) % P.N + P.N) % P.N;
      }
      chips.forEach((chip, j) => {
        let cls = C + '-chip';
        if (j === cursor) cls += ' ' + C + '-cur';
        else if (cur && cur.idx === j && !drawing) cls += inFlash ? ' ' + C + '-hit ' + C + '-k-' + cur.kind : ' ' + C + '-last';
        chip.className = cls;
      });
      cols.forEach((c, i) => {
        const tw = cfg.towers[i];
        const lvl = cur ? cur.levels[i] : 0;
        const d = cur ? cur.towers[i] : null;
        c.col.className = C + '-col' + (lvl === tw.levels ? ' ' + C + '-max' : '');
        c.name.className = lvl === tw.levels ? C + '-max' : '';
        c.blocks.forEach((b, li) => {
          const l = li + 1;
          let cls = C + '-blk';
          if (l < lvl) cls += ' ' + C + '-on';
          else if (l === lvl) cls += ' ' + C + '-top';
          if (inFlash && d) {
            if (d.climb && l === d.to) cls += ' ' + C + '-new';
            else if (d.drop && l > d.to && l <= d.from) cls += ' ' + C + '-drop';
            else if (d.secure && l === tw.levels) cls += ' ' + C + '-secure';
          }
          b.className = cls;
        });
      });
      const done = !P.live && t >= P.readoutAt;
      const pot = done ? P.pot : cur ? cur.pot : 0;
      const sec = done ? P.secured : cur ? cur.secured : 0;
      potVal.textContent = ctx.fmt.mult(pot);
      secVal.textContent = ctx.fmt.mult(sec);
      potFig.className = C + '-fig ' + C + '-pot' + (inFlash && cur && cur.kind === 'fail' ? ' ' + C + '-lost' : '');
      secFig.className = C + '-fig ' + C + '-sec' + (inFlash && cur && cur.gain ? ' ' + C + '-bump' : '') + (sec > 0 ? ' ' + C + '-has' : '');
      count.textContent = ctx.text('reveal.spinTower.spin', { n: k }) + (cfg.maxSpins ? '/' + cfg.maxSpins : '') + costLabel;
      if (done && !multEl.textContent) fillReadout();   // the readout enters the DOM only now
      let cls = C + ' ' + C + '-live';
      if (done) cls += ' ' + C + '-done ' + (P.win ? C + '-win' : C + '-loss');
      if (box.classList.contains(C + '-still')) cls += ' ' + C + '-still';
      box.className = cls;
    }

    function fillReadout() {
      multEl.textContent = ctx.fmt.mult(P.pot + P.secured);
      resEl.textContent = P.win ? ctx.fmt.won(P.payout) : ctx.fmt.lost();
      fiatEl.textContent = (P.win && ctx.fmt.fiat(P.payout)) || '';
      const status = ctx.text(P.status === 'busted' ? 'reveal.spinTower.busted' : P.capped ? 'reveal.spinTower.capReached' : 'reveal.spinTower.cashed');
      let staked = '0';
      try { staked = ctx.fmt.sol((BigInt(String(P.bet == null ? '0' : P.bet)) * BigInt(P.n)).toString()); } catch (e) { staked = '0'; }
      subEl.textContent = ctx.text('reveal.spinTower.sub', { status, n: P.n, staked });
    }
    const clearReadout = () => { multEl.textContent = ''; resEl.textContent = ''; fiatEl.textContent = ''; subEl.textContent = ''; };
    function cancel() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      clearTimeout(stillTimer);
      if (pending) { const r = pending; pending = null; r(); }
    }
    function idle() {
      build(config(null), null);
      P = plan({ engineConfig: { towers: board.towers, failMode: board.failMode, maxSpins: board.maxSpins }, spins: [], status: 'active' });
      clearReadout();
      render(-1);
      box.classList.remove(C + '-live', C + '-done');
    }

    idle();
    root.dataset.state = 'idle';

    return {
      play(outcome, opts) {
        cancel();
        const o = outcome && typeof outcome === 'object' ? outcome : {};
        P = plan(o);
        build(P.cfg, o.betLamports);
        clearReadout();
        root.dataset.state = 'playing';
        const reduced = !!(opts && opts.reducedMotion);
        const from = opts && Number.isInteger(opts.from) ? Math.max(0, Math.min(P.n, opts.from)) : 0;
        const inc = from > 0 && !!shown && shown.key === o.sessionId && shown.n === from;
        const skip = inc ? (from < P.n ? from * P.step : P.lastApply + P.flash) : 0;
        return new Promise((resolve) => {
          const finish = () => {
            raf = 0;
            render(P.end);
            shown = { key: o.sessionId, n: P.n };
            root.dataset.state = 'done';
            const r = pending; pending = null;
            if (r) r();
          };
          pending = resolve;
          if (reduced) {
            box.classList.add(C + '-still');
            finish();
            stillTimer = setTimeout(() => box.classList.remove(C + '-still'), 50);
            return;
          }
          box.classList.add(C + '-still');
          render(skip);
          void box.offsetWidth;
          box.classList.remove(C + '-still');
          const t0 = performance.now() - skip;
          const loop = (now) => {
            const t = now - t0;
            if (t >= P.end) { finish(); return; }
            render(t);
            raf = requestAnimationFrame(loop);
          };
          raf = requestAnimationFrame(loop);
        });
      },
      reset() {
        cancel();
        shown = null;
        box.classList.add(C + '-still');
        idle();
        box.classList.remove(C + '-still');
        root.dataset.state = 'idle';
      },
      destroy() { cancel(); if (ro) ro.disconnect(); ro = null; },
    };
  },
};
