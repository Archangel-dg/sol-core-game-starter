// Sol-Core reveal — coin-flip (single, Instant).
//
// One coin in the middle of the square tosses and flips (CSS 3D rotateY, two faces),
// decelerates and comes to rest on `details.landed`. The chip at the top shows the
// chosen side; the readout (multiplier, won/lost, roll · face) fades in once the coin
// has stopped — before that the nodes are EMPTY, so neither innerText, DevTools nor a
// screen reader can know the result early.
//
// The rotation is computed from the coin's CURRENT resting angle (0 = heads up, 180 =
// tails up): TURNS full turns plus the half turn needed to land on the server's face.
// Constant angular speed, so the flight is a function of (outcome, previous face) and
// the ~10 % duration difference shows no indicative face mid-flight. The resting angle
// survives rounds (a tails-resting coin never snaps to heads at the next start).
//
// Fairness (docs/RULES.md, rule 16): win, multiplier and payout come verbatim from the
// outcome, nothing is derived from the roll, nothing is random.
//
// Text goes through `ctx.text(...)` (four languages); colours through the theme tokens
// in globals.css. Edit freely — this file is design zone.

/** @type {import('../lib/reveal').RevealModule} */
export const reveal = {
  key: 'coin-flip',
  mechanic: 'single',
  strings: [
    'reveal.won',
    'result.lost',
    'coinflip.you',
    'coinflip.idle',
    'coinflip.roll',
    'engine.coin-flip.opt.side.heads',
    'engine.coin-flip.opt.side.tails',
  ],

  mount(root, ctx) {
    const C = 'sca-coin-flip';
    const SPIN_MS = 380;   // one full turn — constant angular speed, the same in every round
    const SHOW_MS = 220;   // readout fade after the coin rests
    const TURNS = 5;       // full turns before the landing half-turn (fixed, never random)
    const EASE_POW = 1.7;  // monotone deceleration: p = 1 - (1 - t)^EASE_POW
    const HOP_U = 7;       // toss height in % of the square

    const CSS = `
.${C}{position:absolute;inset:0;overflow:hidden;font-family:var(--mono);color:var(--fg);--u:3.6px;user-select:none;-webkit-user-select:none}
.${C} .${C}-chip{position:absolute;top:6%;left:50%;transform:translateX(-50%);padding:calc(var(--u)*1.4) calc(var(--u)*3.2);border:1px solid var(--line);border-radius:999px;background:var(--panel-strong);font-size:calc(var(--u)*3.8);line-height:1.2;white-space:nowrap;letter-spacing:.02em;color:var(--muted)}
.${C} .${C}-chip b{font-weight:600;color:var(--fg)}
.${C} .${C}-scene{position:absolute;left:30%;top:25%;width:40%;height:40%;perspective:calc(var(--u)*170)}
.${C} .${C}-coin{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform}
.${C} .${C}-face{position:absolute;inset:0;box-sizing:border-box;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;backface-visibility:hidden;-webkit-backface-visibility:hidden;border:calc(var(--u)*1.6) solid var(--muted);transition:border-color .25s ease}
.${C} .${C}-face.${C}-h{background:var(--fg);color:var(--night)}
.${C} .${C}-face.${C}-t{background:var(--night);color:var(--fg);border-color:var(--fg);transform:rotateY(180deg)}
.${C}.${C}-win .${C}-face.${C}-landed{border-color:var(--accent)}
.${C}.${C}-loss .${C}-face.${C}-landed{border-color:var(--red)}
.${C} .${C}-letter{font-size:calc(var(--u)*16);font-weight:700;line-height:1}
.${C} .${C}-word{font-size:calc(var(--u)*3.4);letter-spacing:.18em;margin-top:calc(var(--u)*1.2);opacity:.75;line-height:1;text-transform:uppercase}
.${C} .${C}-shadow{position:absolute;left:50%;top:66.5%;width:32%;height:3.5%;border-radius:50%;background:var(--panel-strong);transform:translateX(-50%) scale(1);transform-origin:center}
.${C} .${C}-readout{position:absolute;left:0;right:0;top:73%;text-align:center;opacity:0;transform:translateY(calc(var(--u)*1.5));transition:opacity .2s ease,transform .2s ease;font-variant-numeric:tabular-nums}
.${C}.${C}-done .${C}-readout{opacity:1;transform:none}
.${C} .${C}-hint{position:absolute;left:0;right:0;top:73%;padding:0 calc(var(--u)*5);text-align:center;font-size:calc(var(--u)*3.6);line-height:1.35;color:var(--muted)}
.${C}.${C}-done .${C}-hint,.${C}.${C}-live .${C}-hint{display:none}
.${C} .${C}-mult{font-size:calc(var(--u)*6);font-weight:700;line-height:1.1;color:var(--fg)}
.${C}.${C}-loss .${C}-mult{color:var(--red)}
.${C} .${C}-res{font-size:calc(var(--u)*4.4);line-height:1.2;margin-top:calc(var(--u)*1.2);font-weight:600}
.${C}.${C}-win .${C}-res{color:var(--accent)}
.${C}.${C}-loss .${C}-res{color:var(--red)}
.${C} .${C}-fiat{font-size:calc(var(--u)*3.3);line-height:1.2;margin-top:calc(var(--u)*.8);color:var(--muted);font-weight:400}
.${C} .${C}-roll{font-size:calc(var(--u)*3.3);line-height:1.2;margin-top:calc(var(--u)*1.2);color:var(--muted)}
.${C}.${C}-still .${C}-readout,.${C}.${C}-still .${C}-face{transition:none}
@media (prefers-reduced-motion:reduce){.${C} .${C}-readout,.${C} .${C}-face{transition:none}}
`;
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

    const style = el('style'); style.textContent = CSS; root.appendChild(style);
    const wrap = el('div', C);
    const chip = el('div', C + '-chip');
    const scene = el('div', C + '-scene');
    const coin = el('div', C + '-coin');
    const faceH = el('div', C + '-face ' + C + '-h');
    const letterH = el('div', C + '-letter'); const wordH = el('div', C + '-word');
    faceH.appendChild(letterH); faceH.appendChild(wordH);
    const faceT = el('div', C + '-face ' + C + '-t');
    const letterT = el('div', C + '-letter'); const wordT = el('div', C + '-word');
    faceT.appendChild(letterT); faceT.appendChild(wordT);
    coin.appendChild(faceH); coin.appendChild(faceT); scene.appendChild(coin);
    const shadow = el('div', C + '-shadow');
    const hint = el('div', C + '-hint');
    const readout = el('div', C + '-readout');
    const outMult = el('div', C + '-mult'); const outRes = el('div', C + '-res'); const outFiat = el('div', C + '-fiat'); const outRoll = el('div', C + '-roll');
    readout.appendChild(outMult); readout.appendChild(outRes); readout.appendChild(outFiat); readout.appendChild(outRoll);
    wrap.appendChild(chip); wrap.appendChild(shadow); wrap.appendChild(scene); wrap.appendChild(hint); wrap.appendChild(readout);
    root.appendChild(wrap);

    // Face words come from the catalog — the letter is the word's initial, so a French
    // coin reads F / FACE and P / PILE.
    const heads = () => ctx.text('engine.coin-flip.opt.side.heads');
    const tails = () => ctx.text('engine.coin-flip.opt.side.tails');
    const labelFaces = () => {
      const h = heads(), t = tails();
      letterH.textContent = h.charAt(0).toUpperCase(); wordH.textContent = h;
      letterT.textContent = t.charAt(0).toUpperCase(); wordT.textContent = t;
    };

    // one unit = 1 % of the square; measured, so text scales with the field
    const measure = () => {
      const r = root.getBoundingClientRect();
      const side = Math.min(r.width, r.height) || 360;
      wrap.style.setProperty('--u', (side / 100).toFixed(3) + 'px');
    };
    measure();
    let ro = null;
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(root); }

    let angle = 0;   // current rotateY in degrees (0 = heads up, 180 = tails up) — survives rounds
    let hopNow = 0;  // current toss height 0..1
    let raf = 0, timer = 0, pending = null;

    const apply = (a, hop) => {
      angle = a; hopNow = hop;
      coin.style.transform = 'translateY(calc(var(--u) * ' + (-hop * HOP_U).toFixed(3) + ')) rotateY(' + a.toFixed(2) + 'deg)';
      shadow.style.transform = 'translateX(-50%) scale(' + (1 - hop * 0.35).toFixed(3) + ')';
      shadow.style.opacity = (1 - hop * 0.45).toFixed(3);
    };
    const setChip = (side) => {
      chip.textContent = '';
      if (!side) { chip.appendChild(document.createTextNode(ctx.text('coinflip.idle'))); return; }
      chip.appendChild(document.createTextNode(ctx.text('coinflip.you') + ' '));
      chip.appendChild(el('b', null, side === 'heads' ? heads() : tails()));
    };
    const clearMarks = () => {
      wrap.classList.remove(C + '-win', C + '-loss', C + '-done', C + '-still', C + '-live');
      faceH.classList.remove(C + '-landed'); faceT.classList.remove(C + '-landed');
      outMult.textContent = ''; outRes.textContent = ''; outFiat.textContent = ''; outRoll.textContent = '';
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
      // never invent a face: anything but 'heads' | 'tails' is unknown (no ring, no suffix)
      const landed = d.landed === 'heads' || d.landed === 'tails' ? d.landed : null;
      const side = d.side === 'heads' || d.side === 'tails' ? d.side : null;
      const reduced = !!(opts && opts.reducedMotion);
      root.dataset.state = 'playing';
      clearMarks();
      wrap.classList.add(C + '-live');
      if (reduced) wrap.classList.add(C + '-still');
      measure();
      labelFaces();
      setChip(side);

      const start = angle;
      const startMod = ((start % 360) + 360) % 360;
      const landedAngle = landed === 'tails' ? 180 : 0;
      const landingTurn = landed ? (landedAngle - startMod + 360) % 360 : 0;
      const delta = TURNS * 360 + landingTurn;
      const target = start + delta;
      // constant angular speed ⇒ the duration follows the distance, never the result
      const flightMs = (delta / 360) * SPIN_MS;
      const hop0 = hopNow;

      const land = () => {
        apply(target, 0);
        // the readout is written only now — the coin has landed
        outMult.textContent = ctx.fmt.mult(o.multiplierBps);
        outRes.textContent = o.win ? ctx.fmt.won(o.payoutLamports) : ctx.fmt.lost();
        outFiat.textContent = (o.win && ctx.fmt.fiat(o.payoutLamports)) || '';
        const parts = [];
        if (typeof o.roll === 'number' && isFinite(o.roll)) parts.push(ctx.text('coinflip.roll', { roll: o.roll.toFixed(2) }));
        if (landed) parts.push(landed === 'heads' ? heads() : tails());
        outRoll.textContent = parts.join(' · ');
        if (landed) (landed === 'tails' ? faceT : faceH).classList.add(C + '-landed');
        wrap.classList.add(o.win ? C + '-win' : C + '-loss');
        wrap.classList.add(C + '-done');
      };

      return new Promise((resolve) => {
        pending = resolve;
        if (reduced) { land(); finish(); return; }
        const t0 = performance.now();
        const step = (now) => {
          let t = (now - t0) / flightMs; if (t < 0) t = 0; if (t > 1) t = 1;
          const p = 1 - Math.pow(1 - t, EASE_POW);
          const hop = hop0 * (1 - t) + (1 - hop0) * Math.sin(Math.PI * t);
          apply(start + delta * p, hop);
          if (t < 1) { raf = requestAnimationFrame(step); return; }
          raf = 0;
          land();
          timer = setTimeout(() => { timer = 0; finish(); }, SHOW_MS);
        };
        raf = requestAnimationFrame(step);
      });
    };

    const reset = () => {
      cancel();
      clearMarks();
      labelFaces();
      setChip(null);
      hint.textContent = ctx.hint || '';
      apply(0, 0);
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
