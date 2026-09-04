// Sol-Core reveal — roulette (single, Table).
//
// An SVG ring of pockets in true wheel order (0 32 15 19 4 … for the single-zero wheel,
// the 38-pocket American sequence when the game runs with '00') sits under a fixed
// marker at the top; the hub carries the player's bet as a chip label while the wheel
// turns. On play the rotor turns clockwise a fixed number of turns plus exactly the
// arc that brings `details.pocket` under the marker, while the ball runs the other
// way on the outer track; both share ONE cubic ease-out and stop together, the ball
// dropping from the track into the pocket beneath it during the last stretch. Only
// when the ball rests are the pocket number (in its colour) and the readout
// (multiplier, won/lost, fiat, bet · pocket) written into the DOM — before that the
// result exists nowhere in the document, not even hidden.
//
// Wheel order is not a server constant (the resolver only draws the pocket number),
// so the module carries the standard sequences. The IDLE wheel follows the game:
// `engineConfig.pocketCount` 38 ⇒ American order with '00' before the first round;
// per round the outcome decides (a '00' pocket can only come from a 38-pocket wheel).
//
// Fairness (docs/RULES.md, rule 16): pocket, colour, multiplier, payout and win/loss
// are read verbatim from the outcome, never recomputed; no wobble, no bounce, no late
// slowdown near a chosen number. Text through `ctx.text(...)`, colours through the
// theme tokens. Design zone — edit freely.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'roulette',
  mechanic: 'single',
  strings: [
    'reveal.won',
    'result.lost',
    'reveal.roulette.cap',
    'reveal.roulette.capUs',
    'reveal.roulette.sub',
    'reveal.roulette.chips',
    'reveal.roulette.green',
    'reveal.roulette.straight',
    'reveal.roulette.basket',
    'reveal.roulette.inside',
    'reveal.roulette.splitName',
    'reveal.roulette.streetName',
    'reveal.roulette.cornerName',
    'reveal.roulette.sixLineName',
    'roulette.red',
    'roulette.black',
    'roulette.odd',
    'roulette.even',
    'roulette.low',
    'roulette.high',
    'roulette.dozen1',
    'roulette.dozen2',
    'roulette.dozen3',
    'roulette.column1',
    'roulette.column2',
    'roulette.column3',
  ],

  mount(root, ctx) {
    const C = 'sca-roulette';
    const SPIN_MS = 2600;               // shared ease-out for wheel and ball
    const HOLD_MS = 260;                // readout settle after the ball rests
    const TURNS_WHEEL = 4;              // fixed full turns of the wheel (clockwise)
    const TURNS_BALL = 3;               // fixed full turns of the ball (counter-clockwise)
    const DROP_FROM = 0.86;             // progress at which the ball starts dropping into the pocket
    const CX = 50, CY = 41;             // wheel centre in viewBox units (0..100)
    const R_OUT = 31, R_IN = 21;        // pocket ring
    const R_NUM = 25.6;                 // number labels
    const R_TRACK = 34;                 // ball track (outside the rim)
    const R_POCKET = 29.3;              // ball at rest in the pocket (outer half, clear of the number)
    const BALL = 1.6;

    // Same colouring as ROULETTE_RED in the engine (black = 1..36 minus red, 0/00 green).
    const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    const EU = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    const US = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2];

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;user-select:none;-webkit-user-select:none}
.${C} .${C}-svg{position:absolute;inset:0;width:100%;height:100%;display:block;font-family:var(--mono)}
.${C} .${C}-pk{transition:opacity .25s ease}
.${C} .${C}-pk path{stroke:var(--night);stroke-width:.5;stroke-linejoin:round}
.${C} .${C}-pk text{font-variant-numeric:tabular-nums;font-weight:600;fill:var(--fg)}
.${C} .${C}-red path{fill:var(--red);fill-opacity:.72}
.${C} .${C}-black path{fill:var(--panel-strong)}
.${C} .${C}-green path{fill:var(--accent);fill-opacity:.62}
.${C} .${C}-green text{fill:var(--night)}
.${C} .${C}-rim,.${C} .${C}-track{fill:none;stroke:var(--line);stroke-width:.6}
.${C} .${C}-hub{fill:var(--night);stroke:var(--line);stroke-width:.6}
.${C} .${C}-ball{fill:var(--fg);stroke:var(--night);stroke-width:.4}
.${C} .${C}-mark{fill:var(--fg);stroke:var(--night);stroke-width:.5;stroke-linejoin:round;transition:fill .25s ease}
.${C}.${C}-done .${C}-pk:not(.${C}-hit){opacity:.42}
.${C}.${C}-win .${C}-hit path{stroke:var(--accent);stroke-width:1}
.${C}.${C}-loss .${C}-hit path{stroke:var(--red);stroke-width:1}
.${C}.${C}-win .${C}-mark{fill:var(--accent)}
.${C}.${C}-loss .${C}-mark{fill:var(--red)}
.${C} .${C}-centre{position:absolute;left:50%;top:41%;width:40%;transform:translate(-50%,-50%);text-align:center;font-variant-numeric:tabular-nums;line-height:1.1}
.${C} .${C}-idle{font-size:calc(var(--u)*4.6);color:var(--muted);font-weight:600}
.${C} .${C}-chip{display:none;margin:0 auto;padding:calc(var(--u)*1.1) calc(var(--u)*2.2);border-radius:calc(var(--u)*6);font-size:calc(var(--u)*3.2);font-weight:700;letter-spacing:.02em;background:var(--panel-strong);border:1px solid var(--line);color:var(--fg);max-width:100%;overflow:hidden;white-space:nowrap}
.${C} .${C}-chip.${C}-onred{background:var(--red);color:var(--night);border-color:var(--red)}
.${C} .${C}-chip.${C}-onblack{background:var(--night);color:var(--fg)}
.${C} .${C}-num{display:none;font-size:calc(var(--u)*12);font-weight:700;line-height:1}
.${C} .${C}-col{display:none;font-size:calc(var(--u)*3.1);color:var(--muted);margin-top:calc(var(--u)*.6);text-transform:uppercase;letter-spacing:.08em}
.${C}.${C}-playing .${C}-chip{display:inline-block}
.${C}.${C}-playing .${C}-idle,.${C}.${C}-done .${C}-idle,.${C}.${C}-done .${C}-chip{display:none}
.${C}.${C}-done .${C}-num,.${C}.${C}-done .${C}-col{display:block}
.${C} .${C}-num.${C}-red{color:var(--red)}
.${C} .${C}-num.${C}-black{color:var(--fg)}
.${C} .${C}-num.${C}-green{color:var(--accent)}
.${C} .${C}-readout{position:absolute;left:0;right:0;top:75%;text-align:center;font-variant-numeric:tabular-nums}
.${C} .${C}-cap{font-size:calc(var(--u)*3.3);line-height:1.3;color:var(--muted);padding-top:calc(var(--u)*4)}
.${C} .${C}-out{visibility:hidden;opacity:0;transform:translateY(calc(var(--u)*1.5));transition:opacity .2s ease,transform .2s ease}
.${C}.${C}-done .${C}-out{visibility:visible;opacity:1;transform:none}
.${C}.${C}-done .${C}-cap{display:none}
.${C} .${C}-mult{font-size:calc(var(--u)*6);font-weight:700;line-height:1.1}
.${C}.${C}-loss .${C}-mult{color:var(--muted)}
.${C} .${C}-res{font-size:calc(var(--u)*4.2);line-height:1.2;margin-top:calc(var(--u)*1);font-weight:600}
.${C}.${C}-win .${C}-res{color:var(--accent)}
.${C}.${C}-loss .${C}-res{color:var(--red)}
.${C} .${C}-fiat{font-size:calc(var(--u)*3.2);line-height:1.2;margin-top:calc(var(--u)*.6);color:var(--muted)}
.${C} .${C}-sub{font-size:calc(var(--u)*3.2);line-height:1.2;margin-top:calc(var(--u)*1);color:var(--muted)}
.${C}.${C}-still .${C}-out,.${C}.${C}-still .${C}-pk,.${C}.${C}-still .${C}-mark{transition:none}
@media (prefers-reduced-motion:reduce){.${C} .${C}-out,.${C} .${C}-pk,.${C} .${C}-mark{transition:none}}
`;
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const NS = 'http://www.w3.org/2000/svg';   // XML namespace for createElementNS — an identifier, nothing is fetched
    const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    const rad = (deg) => deg * Math.PI / 180;
    const pt = (deg, r) => [CX + r * Math.sin(rad(deg)), CY - r * Math.cos(rad(deg))];
    const f3 = (n) => n.toFixed(3);
    const norm = (deg) => { let d = deg % 360; if (d > 180) d -= 360; if (d <= -180) d += 360; return d; };
    function pocketPath(a0, a1) {
      const [x0, y0] = pt(a0, R_OUT), [x1, y1] = pt(a1, R_OUT), [x2, y2] = pt(a1, R_IN), [x3, y3] = pt(a0, R_IN);
      return 'M' + f3(x0) + ' ' + f3(y0) + 'A' + R_OUT + ' ' + R_OUT + ' 0 0 1 ' + f3(x1) + ' ' + f3(y1) +
        'L' + f3(x2) + ' ' + f3(y2) + 'A' + R_IN + ' ' + R_IN + ' 0 0 0 ' + f3(x3) + ' ' + f3(y3) + 'Z';
    }
    const colorOf = (p) => (p === 0 || p === '00' || p === 37) ? 'green' : RED.has(Number(p)) ? 'red' : 'black';
    const colorText = (c) => c === 'red' ? ctx.text('roulette.red') : c === 'black' ? ctx.text('roulette.black') : ctx.text('reveal.roulette.green');
    const pn = (p) => (p === 37 ? '00' : String(p));   // pocket number as printed
    // 38 pockets ⇒ American wheel. Reads the round's own config echo first, then the game's.
    const pocketCountOf = (cfg) => { const n = cfg && Math.round(Number(cfg.pocketCount)); return n === 38 ? 38 : n === 37 ? 37 : 0; };

    // Inside bets: `value` is a layout index into the server's tables (rouletteInsideTable in
    // the engine — grid entries first, then the zero bets, which differ per wheel). Resolved
    // here to the pockets it covers and worded like the RouletteBoard labels.
    function insideLabel(t, v, us) {
      let nameKey, sep = '/', set = null;
      if (t === 'split') {
        nameKey = 'reveal.roulette.splitName';
        if (v < 24) { const l = 3 * Math.floor(v / 2) + 1 + (v % 2); set = [l, l + 1]; }           // within a row
        else if (v < 57) { const k = v - 24, a = 3 * Math.floor(k / 3) + 1 + (k % 3); set = [a, a + 3]; } // across rows
        else set = (us ? [[0, 1], [0, 2], [0, 37], [37, 2], [37, 3]] : [[0, 1], [0, 2], [0, 3]])[v - 57] || null;
      } else if (t === 'street') {
        nameKey = 'reveal.roulette.streetName'; sep = '-';
        if (v < 12) set = [3 * v + 1, 3 * v + 2, 3 * v + 3];
        else set = (us ? [[0, 1, 2], [0, 37, 2], [37, 2, 3]] : [[0, 1, 2], [0, 2, 3]])[v - 12] || null;
      } else if (t === 'corner') {
        nameKey = 'reveal.roulette.cornerName';
        if (v < 22) { const a = 3 * Math.floor(v / 2) + 1 + (v % 2); set = [a, a + 1, a + 3, a + 4]; }
      } else if (t === 'six-line') {
        nameKey = 'reveal.roulette.sixLineName'; sep = '-';
        if (v < 11) set = [3 * v + 1, 3 * v + 6];
      } else if (t === 'basket') {
        if (!us && v === 0) set = [0, 1, 2, 3];
        return ctx.text('reveal.roulette.basket', { set: set ? set.map(pn).join('-') : '#' + v });
      } else return null;
      return ctx.text('reveal.roulette.inside', { type: ctx.text(nameKey), set: set ? set.map(pn).join(sep) : '#' + v });   // unknown index: still say which
    }
    // Label of the bet the player placed, in the player's language.
    function betLabel(d, us) {
      const t = String(d.betType || 'red');
      const v = Math.round(Number(d.value) || 0);
      if (t === 'red' || t === 'black' || t === 'odd' || t === 'even' || t === 'low' || t === 'high') return ctx.text('roulette.' + t);
      if (t === 'dozen') return ctx.text('roulette.dozen' + Math.min(3, Math.max(1, v)));
      if (t === 'column') return ctx.text('roulette.column' + Math.min(3, Math.max(1, v)));
      if (t === 'straight') return ctx.text('reveal.roulette.straight', { n: pn(v) });
      return insideLabel(t, v, us) || t;
    }

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const wrap = el('div', C);
    const svg = svgEl('svg', { viewBox: '0 0 100 100', class: C + '-svg', 'aria-hidden': 'true' });
    const track = svgEl('circle', { class: C + '-track', cx: CX, cy: CY, r: R_TRACK });
    const rotor = svgEl('g', { class: C + '-rotor' });
    const rim = svgEl('circle', { class: C + '-rim', cx: CX, cy: CY, r: R_OUT + 0.4 });
    const hub = svgEl('circle', { class: C + '-hub', cx: CX, cy: CY, r: R_IN - 0.3 });
    const ball = svgEl('circle', { class: C + '-ball', r: BALL });
    const mark = svgEl('polygon', { class: C + '-mark', points: '47.4,0.6 52.6,0.6 50,4.6' });
    svg.appendChild(track); svg.appendChild(rotor); svg.appendChild(rim); svg.appendChild(hub); svg.appendChild(ball); svg.appendChild(mark);
    const centre = el('div', C + '-centre');
    const idleTxt = el('div', C + '-idle');
    const chip = el('div', C + '-chip');
    const num = el('div', C + '-num');
    const col = el('div', C + '-col');
    centre.appendChild(idleTxt); centre.appendChild(chip); centre.appendChild(num); centre.appendChild(col);
    const readout = el('div', C + '-readout');
    const cap = el('div', C + '-cap');
    const out = el('div', C + '-out');
    const outMult = el('div', C + '-mult'); const outRes = el('div', C + '-res'); const outFiat = el('div', C + '-fiat'); const outSub = el('div', C + '-sub');
    out.appendChild(outMult); out.appendChild(outRes); out.appendChild(outFiat); out.appendChild(outSub);
    readout.appendChild(cap); readout.appendChild(out);
    wrap.appendChild(svg); wrap.appendChild(centre); wrap.appendChild(readout);
    root.appendChild(wrap);

    // one unit = 1 % of the square; measured, so HTML text scales with the field
    const measure = () => {
      const r = root.getBoundingClientRect();
      const side = Math.min(r.width, r.height) || 360;
      wrap.style.setProperty('--u', (side / 100).toFixed(3) + 'px');
    };
    measure();
    let ro = null;
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(root); }

    let order = null;        // pocket sequence currently built
    let nodes = [];          // <g> per pocket
    let rot = 0;             // wheel angle in degrees (clockwise)
    let raf = 0, timer = 0, pending = null;

    const build = (seq) => {
      if (order === seq) return;
      order = seq; nodes = [];
      while (rotor.firstChild) rotor.removeChild(rotor.firstChild);
      const n = seq.length, w = 360 / n;
      for (let i = 0; i < n; i++) {
        const p = seq[i];
        const g = svgEl('g', { class: C + '-pk ' + C + '-' + colorOf(p) });
        g.appendChild(svgEl('path', { d: pocketPath(i * w, (i + 1) * w) }));
        const text = svgEl('text', { x: CX, y: CY - R_NUM, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': '3.2', transform: 'rotate(' + ((i + 0.5) * w).toFixed(3) + ' ' + CX + ' ' + CY + ')' });
        text.textContent = String(p);
        g.appendChild(text); rotor.appendChild(g); nodes.push(g);
      }
      cap.textContent = ctx.text(n === 38 ? 'reveal.roulette.capUs' : 'reveal.roulette.cap', { n });
      idleTxt.textContent = n === 38 ? '00 · 0–36' : '0–36';
    };
    const setRot = (a) => { rot = a; rotor.setAttribute('transform', 'rotate(' + a.toFixed(3) + ' ' + CX + ' ' + CY + ')'); };
    const setBall = (deg, r) => { const [x, y] = pt(deg, r); ball.setAttribute('cx', f3(x)); ball.setAttribute('cy', f3(y)); };
    // Blank every result-bearing element: nothing about the outcome may sit in the DOM while
    // the wheel is turning (not even hidden). land() writes it all at once.
    const clearMarks = () => {
      wrap.classList.remove(C + '-win', C + '-loss', C + '-done', C + '-still', C + '-playing');
      for (const g of nodes) g.classList.remove(C + '-hit');
      num.textContent = ''; num.className = C + '-num'; col.textContent = '';
      outMult.textContent = ''; outRes.textContent = ''; outFiat.textContent = ''; outSub.textContent = '';
    };
    const cancel = () => {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (timer) clearTimeout(timer); timer = 0;
      if (pending) { const r = pending; pending = null; r(); }   // superseded play settles
    };
    const finish = () => { root.dataset.state = 'done'; const r = pending; pending = null; if (r) r(); };

    const play = (outcome, opts) => {
      cancel();
      const o = outcome || {};
      const d = o.details || {};
      const reduced = !!(opts && opts.reducedMotion);
      root.dataset.state = 'playing';
      clearMarks();
      if (reduced) wrap.classList.add(C + '-still');
      wrap.classList.add(C + '-playing');
      measure();
      // pocket as the server names it: 0..36, or '00' (=37) on the American wheel. Anything
      // else is INVALID — the module never substitutes a pocket; it spins, lands nowhere
      // (no hit mark, '—' in the hub) and still reads mult / won / lost from the outcome.
      const raw = d.pocket;
      const pocket = raw === '00' || raw === 37 ? '00' : Math.round(Number(raw));
      const valid = pocket === '00' ||
        ((typeof raw === 'number' || typeof raw === 'string') && raw !== '' && Number.isInteger(pocket) && pocket >= 0 && pocket <= 36);
      const cfgN = pocketCountOf(o.engineConfig) || pocketCountOf(ctx.engineConfig);
      build((valid && pocket === '00') || cfgN === 38 ? US : cfgN === 37 ? EU : (order || EU));
      const n = order.length, w = 360 / n;
      const idx = valid ? order.indexOf(pocket) : -1;
      const colorOk = d.color === 'red' || d.color === 'black' || d.color === 'green';
      const color = colorOk ? d.color : idx >= 0 ? colorOf(pocket) : 'black';
      // PRO multi-bet outcomes carry `chips[]` instead of betType/value — name the single chip
      // or count them; the readout stays the server's total.
      const chips = Array.isArray(d.chips) ? d.chips : null;
      const chipD = chips ? (chips.length === 1 ? chips[0] || {} : null) : d;
      const bet = chipD ? betLabel(chipD, n === 38) : ctx.text('reveal.roulette.chips', { n: chips.length });
      chip.textContent = bet;
      chip.classList.remove(C + '-onred', C + '-onblack');
      if (chipD && chipD.betType === 'red') chip.classList.add(C + '-onred'); else if (chipD && chipD.betType === 'black') chip.classList.add(C + '-onblack');

      // pocket idx must sit under the marker: rot ≡ -(idx + 0.5) * w  (mod 360)
      const pocketOff = (Math.max(0, idx) + 0.5) * w;
      const targetMod = (((-pocketOff) % 360) + 360) % 360;
      const start = rot;
      const startMod = ((start % 360) + 360) % 360;
      const delta = TURNS_WHEEL * 360 + (idx >= 0 ? (targetMod - startMod + 360) % 360 : 0);   // fixed turns + landing arc
      const ballDelta = -TURNS_BALL * 360;                                                       // ball starts and ends at the marker

      // The ONLY place the result enters the DOM — runs when the ball rests (synchronously in
      // the reduced-motion path), so the final frame is identical either way.
      const land = () => {
        setRot(((start + delta) % 360 + 360) % 360);
        setBall(0, idx >= 0 ? R_POCKET : R_TRACK);
        if (idx >= 0) nodes[idx].classList.add(C + '-hit');
        num.textContent = idx >= 0 ? String(pocket) : '—';
        num.className = C + '-num ' + C + '-' + color;
        col.textContent = idx >= 0 || colorOk ? colorText(color) : '';
        outMult.textContent = ctx.fmt.mult(o.multiplierBps);
        outRes.textContent = o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
        outFiat.textContent = (o.win && ctx.fmt.fiat(o.payoutLamports)) || '';
        outSub.textContent = ctx.text('reveal.roulette.sub', { bet, pocket: idx >= 0 ? pocket + ' · ' + colorText(color) : '—' });
        wrap.classList.remove(C + '-playing');
        wrap.classList.add(o.win ? C + '-win' : C + '-loss');
        wrap.classList.add(C + '-done');
      };

      return new Promise((resolve) => {
        pending = resolve;
        if (reduced) { land(); finish(); return; }
        const t0 = performance.now();
        const step = (now) => {
          let t = (now - t0) / SPIN_MS; if (t < 0) t = 0; if (t > 1) t = 1;
          const p = 1 - Math.pow(1 - t, 3);                 // one cubic ease-out for wheel AND ball
          const a = start + delta * p;
          setRot(a);
          // the ball follows its own track, then settles into the pocket that is under it
          let drop = (t - DROP_FROM) / (1 - DROP_FROM); if (drop < 0) drop = 0; if (drop > 1) drop = 1;
          drop = drop * drop * (3 - 2 * drop);
          if (idx < 0) drop = 0;                            // no pocket to drop into
          const own = norm(ballDelta * p);
          const pocketAt = norm(a + pocketOff);
          const ang = own + norm(pocketAt - own) * drop;
          setBall(ang, R_TRACK + (R_POCKET - R_TRACK) * drop);
          if (t < 1) { raf = requestAnimationFrame(step); return; }
          raf = 0;
          land();
          timer = setTimeout(() => { timer = 0; finish(); }, HOLD_MS);
        };
        raf = requestAnimationFrame(step);
      });
    };

    const reset = () => {
      cancel();
      clearMarks();
      build(pocketCountOf(ctx.engineConfig) === 38 ? US : EU);
      chip.textContent = '';
      setRot(0);
      setBall(0, R_TRACK);
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
