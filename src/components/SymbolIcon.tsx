'use client';

import { memo } from 'react';

import { symbolArt } from '@/lib/symbolArt';

/**
 * Symbolgrafik als Vektor (04.09.2026): jede bekannte Symbol-ID bekommt ein
 * eigenes SVG in einem gemeinsamen Stil — Verlauf aus dem Akzent von
 * `symbolArt`, dunkle Kante, heller Glanz oben. Kein Emoji mehr: Emojis sehen
 * auf jedem Gerät anders aus und lassen sich weder färben noch skalieren.
 * Unbekannte IDs bekommen wie bisher eine Farbkachel mit Kürzel.
 * Design-Zone: Creators ersetzen die Formen frei; die IDs bleiben der Vertrag.
 */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mischt eine Farbe mit Weiß (f > 0) oder Schwarz (f < 0), f in [-1, 1]. */
function mix(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  const to = f > 0 ? 255 : 0;
  const a = Math.abs(f);
  const c = (v: number) => Math.round(v + (to - v) * a);
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}

interface Palette {
  tint: string;
  light: string;
  dark: string;
  /** url(#…) des Haupt-Verlaufs (hell oben, dunkel unten). */
  g: string;
  /** url(#…) des Glanz-Verlaufs (weiß → transparent). */
  shine: string;
}

function starPoints(cx: number, cy: number, outer: number, inner: number, n = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const FONT = "'Space Grotesk', Inter, system-ui, sans-serif";

function Letter({ text, p, size = 40 }: { text: string; p: Palette; size?: number }) {
  return (
    <text
      x="32"
      y="33"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily={FONT}
      fontSize={size}
      fontWeight={800}
      fill={p.g}
      stroke={p.dark}
      strokeWidth={1.4}
      paintOrder="stroke"
    >
      {text}
    </text>
  );
}

function shape(id: string, p: Palette): JSX.Element {
  switch (id) {
    case 'nine':
      return <Letter text="9" p={p} />;
    case 'ten':
      return <Letter text="10" p={p} size={34} />;
    case 'jack':
      return <Letter text="J" p={p} />;
    case 'queen':
      return <Letter text="Q" p={p} />;
    case 'king':
      return <Letter text="K" p={p} />;
    case 'ace':
      return <Letter text="A" p={p} />;
    case 'seven':
      return (
        <>
          <text x="32" y="34" textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontSize={50} fontWeight={900} fill={p.g} stroke={p.dark} strokeWidth={2} paintOrder="stroke">
            7
          </text>
          <text x="32" y="34" textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontSize={50} fontWeight={900} fill={p.shine}>
            7
          </text>
        </>
      );
    case 'bar':
      return (
        <>
          <rect x="6" y="20" width="52" height="24" rx="5" fill={p.g} stroke={p.dark} strokeWidth="1.5" />
          <rect x="6" y="20" width="52" height="11" rx="5" fill={p.shine} />
          <text x="32" y="32.5" textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontSize={17} fontWeight={800} fill="#0b1220" letterSpacing="1">
            BAR
          </text>
        </>
      );
    case 'wild':
      return (
        <>
          <polygon points={starPoints(32, 32, 30, 24, 12)} fill={p.light} opacity="0.35" />
          <rect x="7" y="19" width="50" height="26" rx="6" fill={p.g} stroke={p.dark} strokeWidth="1.5" />
          <rect x="7" y="19" width="50" height="12" rx="6" fill={p.shine} />
          <text x="32" y="32.5" textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontSize={15} fontWeight={800} fill="#0b1220" letterSpacing="1.5">
            WILD
          </text>
        </>
      );
    case 'scatter':
      return (
        <>
          <path d="M32 6 L37.5 26.5 L58 32 L37.5 37.5 L32 58 L26.5 37.5 L6 32 L26.5 26.5 Z" fill={p.g} stroke={p.dark} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M50 8 L52 14 L58 16 L52 18 L50 24 L48 18 L42 16 L48 14 Z" fill={p.light} />
          <circle cx="32" cy="32" r="5" fill={p.shine} />
        </>
      );
    case 'star':
      return (
        <>
          <polygon points={starPoints(32, 34, 27, 12)} fill={p.g} stroke={p.dark} strokeWidth="1.4" strokeLinejoin="round" />
          <polygon points={starPoints(32, 34, 27, 12)} fill={p.shine} />
        </>
      );
    case 'bell':
      return (
        <>
          <circle cx="32" cy="9" r="3.5" fill={p.dark} />
          <path d="M32 9 C21 9 17 18 17 28 V38 L11 46 H53 L47 38 V28 C47 18 43 9 32 9 Z" fill={p.g} stroke={p.dark} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M32 9 C21 9 17 18 17 28 V32 H47 V28 C47 18 43 9 32 9 Z" fill={p.shine} />
          <circle cx="32" cy="51" r="4.5" fill={p.dark} />
        </>
      );
    case 'coin':
      return (
        <>
          <circle cx="32" cy="32" r="24" fill={p.g} stroke={p.dark} strokeWidth="1.5" />
          <circle cx="32" cy="32" r="17" fill="none" stroke={p.dark} strokeWidth="2" opacity="0.6" />
          <circle cx="32" cy="32" r="24" fill={p.shine} />
          <text x="32" y="33" textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontSize={22} fontWeight={800} fill={p.dark}>
            $
          </text>
        </>
      );
    case 'diamond':
      return (
        <>
          <path d="M12 24 L22 11 H42 L52 24 L32 56 Z" fill={p.g} stroke={p.dark} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M12 24 H52 M22 11 L28 24 L32 56 M42 11 L36 24 L32 56 M28 24 L36 24 M22 11 L32 24 L42 11" fill="none" stroke="#fff" strokeWidth="1" opacity="0.6" />
          <path d="M22 11 H42 L52 24 H12 Z" fill={p.shine} />
        </>
      );
    case 'gem':
      return (
        <>
          <polygon points="32,9 51,20.5 51,43.5 32,55 13,43.5 13,20.5" fill={p.g} stroke={p.dark} strokeWidth="1.4" strokeLinejoin="round" />
          <polygon points="32,20 41,25.5 41,38.5 32,44 23,38.5 23,25.5" fill={p.light} opacity="0.55" />
          <polygon points="32,9 51,20.5 32,32 13,20.5" fill={p.shine} />
        </>
      );
    case 'crown':
      return (
        <>
          <path d="M10 48 V20 L23 31 L32 12 L41 31 L54 20 V48 Z" fill={p.g} stroke={p.dark} strokeWidth="1.4" strokeLinejoin="round" />
          <rect x="10" y="42" width="44" height="8" fill={p.dark} opacity="0.5" />
          <circle cx="10" cy="20" r="3" fill={p.light} />
          <circle cx="32" cy="12" r="3.2" fill={p.light} />
          <circle cx="54" cy="20" r="3" fill={p.light} />
          <path d="M10 48 V20 L23 31 L32 12 L41 31 L54 20 V30 H10 Z" fill={p.shine} />
        </>
      );
    case 'skull':
      return (
        <>
          <path d="M32 6 C18 6 10 16 10 28 C10 36 14 41 20 44 V52 H44 V44 C50 41 54 36 54 28 C54 16 46 6 32 6 Z" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <ellipse cx="24" cy="28" rx="5.5" ry="6.5" fill="#0b1220" />
          <ellipse cx="40" cy="28" rx="5.5" ry="6.5" fill="#0b1220" />
          <path d="M32 34 L29 40 H35 Z" fill="#0b1220" />
          <path d="M26 46 V52 M32 46 V52 M38 46 V52" stroke="#0b1220" strokeWidth="1.6" />
          <path d="M32 6 C18 6 10 16 10 28 H54 C54 16 46 6 32 6 Z" fill={p.shine} />
        </>
      );
    case 'fish':
      return (
        <>
          <path d="M44 32 L58 20 V44 Z" fill={p.dark} />
          <ellipse cx="28" cy="32" rx="19" ry="11.5" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <path d="M26 21 L32 12 L36 22" fill={p.dark} opacity="0.7" />
          <circle cx="18" cy="30" r="2.6" fill="#0b1220" />
          <ellipse cx="28" cy="32" rx="19" ry="11.5" fill={p.shine} />
        </>
      );
    case 'cherry':
      return (
        <>
          <path d="M24 34 Q28 14 42 9 M42 36 Q40 20 42 9" fill="none" stroke={p.dark} strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="46" cy="12" rx="8" ry="4" transform="rotate(-25 46 12)" fill="#22c55e" />
          <circle cx="23" cy="43" r="11" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <circle cx="42" cy="45" r="11" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <circle cx="23" cy="43" r="11" fill={p.shine} />
          <circle cx="42" cy="45" r="11" fill={p.shine} />
        </>
      );
    case 'lemon':
      return (
        <>
          <path d="M9 36 Q13 17 32 17 Q51 17 57 30 Q55 50 36 51 Q15 52 9 36 Z" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <path d="M9 36 Q13 17 32 17 Q51 17 57 30 Q40 30 9 36 Z" fill={p.shine} />
          <ellipse cx="18" cy="16" rx="7" ry="3.5" transform="rotate(-30 18 16)" fill="#22c55e" />
        </>
      );
    case 'orange':
      return (
        <>
          <circle cx="32" cy="36" r="21" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <path d="M32 15 V9" stroke={p.dark} strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="41" cy="11" rx="8" ry="3.8" transform="rotate(-20 41 11)" fill="#22c55e" />
          <circle cx="32" cy="36" r="21" fill={p.shine} />
        </>
      );
    case 'grape':
      return (
        <>
          <path d="M32 18 V8 M32 8 Q40 6 46 10" fill="none" stroke={p.dark} strokeWidth="2.4" strokeLinecap="round" />
          {[
            [32, 22], [23, 30], [41, 30], [32, 37], [18, 40], [46, 40], [26, 47], [38, 47], [32, 55],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="7.5" fill={p.g} stroke={p.dark} strokeWidth="1.2" />
          ))}
          <ellipse cx="22" cy="12" rx="7" ry="3.5" transform="rotate(-25 22 12)" fill="#22c55e" />
        </>
      );
    case 'melon':
      return (
        <>
          <path d="M6 24 A26 26 0 0 0 58 24 L32 58 Z" fill="#16a34a" />
          <path d="M11 26 A21 21 0 0 0 53 26 L32 52 Z" fill={p.g} />
          <path d="M11 26 A21 21 0 0 0 53 26 L32 34 Z" fill={p.shine} />
          {[[26, 34], [38, 34], [32, 42], [22, 30], [42, 30]].map(([x, y]) => (
            <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.6" ry="2.4" fill="#0b1220" />
          ))}
        </>
      );
    case 'strawberry':
      return (
        <>
          <path d="M32 57 C16 45 12 35 14 26 C16 17 26 15 32 21 C38 15 48 17 50 26 C52 35 48 45 32 57 Z" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          {[[24, 30], [32, 34], [40, 30], [28, 42], [36, 42], [32, 26]].map(([x, y]) => (
            <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.4" ry="2" fill="#fde68a" opacity="0.85" />
          ))}
          <path d="M32 21 L24 12 L30 18 L32 8 L34 18 L40 12 Z" fill="#22c55e" />
          <path d="M32 57 C16 45 12 35 14 26 C16 17 26 15 32 21 C38 15 48 17 50 26 L32 30 Z" fill={p.shine} />
        </>
      );
    case 'banana':
      return (
        <>
          <path d="M13 18 C17 40 33 55 54 51 C51 57 30 60 15 45 C9 38 9 27 13 18 Z" fill={p.g} stroke={p.dark} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M13 18 C17 40 33 55 54 51 C40 50 24 42 15 24 Z" fill={p.shine} />
          <path d="M11 20 L14 14" stroke={p.dark} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 'clover':
      return (
        <>
          <path d="M32 40 Q30 52 24 58" fill="none" stroke="#166534" strokeWidth="3" strokeLinecap="round" />
          {[[23, 23], [41, 23], [23, 41], [41, 41]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="10.5" fill={p.g} stroke={p.dark} strokeWidth="1.2" />
          ))}
          <circle cx="32" cy="32" r="5" fill={p.dark} opacity="0.5" />
          <circle cx="23" cy="23" r="10.5" fill={p.shine} />
          <circle cx="41" cy="23" r="10.5" fill={p.shine} />
        </>
      );
    case 'ruby':
      return (
        <>
          <path d="M18 16 H46 L56 30 L32 56 L8 30 Z" fill={p.g} stroke={p.dark} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M18 16 H46 L56 30 H8 Z" fill={p.shine} />
          <path d="M8 30 H56 M18 16 L24 30 L32 56 M46 16 L40 30 L32 56 M24 30 H40" fill="none" stroke="#fff" strokeWidth="1" opacity="0.5" />
        </>
      );
    case 'sapphire':
      return (
        <>
          <ellipse cx="32" cy="32" rx="19" ry="25" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <ellipse cx="32" cy="32" rx="11" ry="15" fill={p.light} opacity="0.5" />
          <path d="M13 32 H51 M32 7 V57 M19 15 L45 49 M45 15 L19 49" fill="none" stroke="#fff" strokeWidth="0.9" opacity="0.45" />
          <ellipse cx="32" cy="32" rx="19" ry="25" fill={p.shine} />
        </>
      );
    case 'emerald':
      return (
        <>
          <path d="M20 10 H44 L54 20 V44 L44 54 H20 L10 44 V20 Z" fill={p.g} stroke={p.dark} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M24 18 H40 L46 24 V40 L40 46 H24 L18 40 V24 Z" fill={p.light} opacity="0.55" />
          <path d="M20 10 L24 18 M44 10 L40 18 M54 20 L46 24 M54 44 L46 40 M44 54 L40 46 M20 54 L24 46 M10 44 L18 40 M10 20 L18 24" fill="none" stroke="#fff" strokeWidth="0.9" opacity="0.5" />
          <path d="M20 10 H44 L54 20 V32 H10 V20 Z" fill={p.shine} />
        </>
      );
    case 'amber':
      return (
        <>
          <circle cx="32" cy="32" r="23" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <circle cx="32" cy="32" r="12" fill={p.light} opacity="0.55" />
          {[0, 45, 90, 135].map((a) => (
            <path key={a} d="M9 32 H55" stroke="#fff" strokeWidth="0.9" opacity="0.45" transform={`rotate(${a} 32 32)`} />
          ))}
          <circle cx="32" cy="32" r="23" fill={p.shine} />
        </>
      );
    case 'ring':
      return (
        <>
          <circle cx="32" cy="38" r="15" fill="none" stroke={p.g} strokeWidth="7" />
          <circle cx="32" cy="38" r="15" fill="none" stroke={p.dark} strokeWidth="1" opacity="0.6" />
          <path d="M22 15 L32 8 L42 15 L32 24 Z" fill="#7dd3fc" stroke="#0369a1" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M22 15 H42 L32 8 Z" fill="#fff" opacity="0.6" />
        </>
      );
    case 'anchor':
      return (
        <>
          <circle cx="32" cy="11" r="5" fill="none" stroke={p.g} strokeWidth="4" />
          <path d="M32 16 V52 M18 26 H46" stroke={p.g} strokeWidth="5" strokeLinecap="round" />
          <path d="M10 38 Q14 56 32 56 Q50 56 54 38" fill="none" stroke={p.g} strokeWidth="5" strokeLinecap="round" />
          <path d="M10 38 L4 44 M10 38 L17 44 M54 38 L60 44 M54 38 L47 44" stroke={p.g} strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case 'ship':
      return (
        <>
          <path d="M6 42 H58 L50 55 H14 Z" fill={p.dark} />
          <path d="M6 42 H58 L55 47 H10 Z" fill={p.light} opacity="0.5" />
          <path d="M32 8 V42" stroke={p.dark} strokeWidth="2.5" />
          <path d="M34 11 L55 40 H34 Z" fill={p.g} stroke={p.dark} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M30 17 L12 40 H30 Z" fill={p.light} stroke={p.dark} strokeWidth="1.2" strokeLinejoin="round" />
        </>
      );
    case 'chest':
      return (
        <>
          <path d="M10 28 A22 15 0 0 1 54 28 V32 H10 Z" fill={p.dark} />
          <path d="M10 28 A22 15 0 0 1 54 28 V30 H10 Z" fill={p.shine} />
          <rect x="10" y="30" width="44" height="24" rx="3" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <path d="M20 30 V54 M44 30 V54" stroke={p.dark} strokeWidth="2.5" />
          <rect x="27" y="34" width="10" height="9" rx="2" fill={p.dark} />
          <circle cx="32" cy="38" r="1.8" fill={p.light} />
        </>
      );
    case 'parrot':
      return (
        <>
          <path d="M18 56 Q26 48 30 40" stroke="#92400e" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M20 46 Q22 58 10 60" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" fill="none" />
          <ellipse cx="30" cy="36" rx="12" ry="16" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <circle cx="35" cy="19" r="9.5" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <path d="M43 17 L54 22 L44 27 Z" fill="#f59e0b" stroke="#92400e" strokeWidth="1" strokeLinejoin="round" />
          <circle cx="37" cy="16" r="2.2" fill="#0b1220" />
          <ellipse cx="26" cy="34" rx="5" ry="10" fill={p.dark} opacity="0.45" />
        </>
      );
    case 'map':
      return (
        <>
          <path d="M8 16 L23 10 L41 16 L56 10 V48 L41 54 L23 48 L8 54 Z" fill={p.g} stroke={p.dark} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M23 10 V48 M41 16 V54" stroke={p.dark} strokeWidth="1" opacity="0.6" />
          <path d="M14 40 Q22 30 30 34 T46 24" fill="none" stroke={p.dark} strokeWidth="1.6" strokeDasharray="3 3" />
          <path d="M44 20 L52 28 M52 20 L44 28" stroke="#dc2626" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M8 16 L23 10 L41 16 L56 10 V24 L8 30 Z" fill={p.shine} />
        </>
      );
    case 'compass':
      return (
        <>
          <circle cx="32" cy="32" r="25" fill="#0f172a" stroke={p.g} strokeWidth="3.5" />
          <circle cx="32" cy="32" r="20" fill="none" stroke={p.dark} strokeWidth="1" opacity="0.7" />
          <path d="M32 10 L37 32 L32 54 L27 32 Z" fill="#e2e8f0" />
          <path d="M32 10 L37 32 H27 Z" fill={p.g} />
          <path d="M10 32 L32 28 L54 32 L32 36 Z" fill="#94a3b8" opacity="0.7" />
          <circle cx="32" cy="32" r="3" fill={p.dark} />
        </>
      );
    case 'rocket':
      return (
        <>
          <path d="M26 46 Q32 62 38 46 Z" fill="#fb923c" />
          <path d="M28 48 Q32 56 36 48 Z" fill="#fde68a" />
          <path d="M24 42 L13 52 L24 48 Z" fill={p.dark} />
          <path d="M40 42 L51 52 L40 48 Z" fill={p.dark} />
          <path d="M32 6 C43 16 45 30 41 44 H23 C19 30 21 16 32 6 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M32 6 C43 16 45 30 41 44 H32 Z" fill="#94a3b8" opacity="0.55" />
          <circle cx="32" cy="27" r="5.5" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <circle cx="30.5" cy="25.5" r="1.8" fill="#fff" opacity="0.8" />
        </>
      );
    case 'planet':
      return (
        <>
          <ellipse cx="32" cy="34" rx="29" ry="8" transform="rotate(-18 32 34)" fill="none" stroke={p.dark} strokeWidth="4" opacity="0.55" />
          <circle cx="32" cy="32" r="16" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <path d="M18 28 Q32 24 46 30" stroke={p.dark} strokeWidth="2" opacity="0.4" fill="none" />
          <circle cx="32" cy="32" r="16" fill={p.shine} />
          <path d="M3 37 Q32 50 61 31" fill="none" stroke={p.light} strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case 'alien':
      return (
        <>
          <path d="M32 7 C48 7 55 21 51 34 C47 46 39 57 32 57 C25 57 17 46 13 34 C9 21 16 7 32 7 Z" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <ellipse cx="24" cy="30" rx="6" ry="9" transform="rotate(20 24 30)" fill="#0b1220" />
          <ellipse cx="40" cy="30" rx="6" ry="9" transform="rotate(-20 40 30)" fill="#0b1220" />
          <path d="M28 46 Q32 49 36 46" stroke="#0b1220" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M32 7 C48 7 55 21 51 34 L13 34 C9 21 16 7 32 7 Z" fill={p.shine} />
        </>
      );
    case 'ufo':
      return (
        <>
          <path d="M22 40 L14 60 M42 40 L50 60" stroke={p.light} strokeWidth="2" opacity="0.35" />
          <ellipse cx="32" cy="24" rx="12" ry="11" fill="#7dd3fc" opacity="0.75" stroke="#0369a1" strokeWidth="1" />
          <ellipse cx="32" cy="34" rx="27" ry="9" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          {[12, 22, 32, 42, 52].map((x) => (
            <circle key={x} cx={x} cy="37" r="2.2" fill="#fde68a" />
          ))}
          <ellipse cx="32" cy="34" rx="27" ry="9" fill={p.shine} />
        </>
      );
    case 'comet':
      return (
        <>
          <path d="M40 24 L6 50 L24 40 L8 58 Z" fill={p.g} opacity="0.55" />
          <path d="M42 26 L14 44 L30 40 Z" fill={p.light} opacity="0.5" />
          <circle cx="45" cy="19" r="10" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <circle cx="45" cy="19" r="10" fill={p.shine} />
        </>
      );
    case 'moon':
      return (
        <>
          <path d="M40 8 A24 24 0 1 0 40 56 A19 19 0 1 1 40 8 Z" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <path d="M40 8 A24 24 0 0 0 16 32 H24 A19 19 0 0 1 40 8 Z" fill={p.shine} />
          <circle cx="22" cy="26" r="2.5" fill={p.dark} opacity="0.35" />
          <circle cx="26" cy="40" r="3.5" fill={p.dark} opacity="0.35" />
        </>
      );
    case 'sun':
      return (
        <>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path key={a} d="M32 4 V13" stroke={p.g} strokeWidth="4.5" strokeLinecap="round" transform={`rotate(${a} 32 32)`} />
          ))}
          <circle cx="32" cy="32" r="13" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <circle cx="32" cy="32" r="13" fill={p.shine} />
        </>
      );
    case 'galaxy':
      return (
        <>
          <path d="M32 32 C36 20 52 20 54 34 C56 48 40 58 26 54 C10 50 6 30 18 18 C28 8 46 10 52 22" fill="none" stroke={p.g} strokeWidth="4.5" strokeLinecap="round" opacity="0.9" />
          <path d="M32 32 C28 44 12 44 10 30 C8 16 24 6 38 10" fill="none" stroke={p.light} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          <circle cx="32" cy="32" r="6" fill="#fff" />
          <circle cx="32" cy="32" r="10" fill={p.light} opacity="0.45" />
          {[[12, 14], [52, 50], [56, 12]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" fill="#fff" opacity="0.8" />
          ))}
        </>
      );
    default:
      return (
        <>
          <rect x="8" y="8" width="48" height="48" rx="10" fill={p.g} stroke={p.dark} strokeWidth="1.4" />
          <rect x="8" y="8" width="48" height="22" rx="10" fill={p.shine} />
          <text x="32" y="33" textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontSize={22} fontWeight={800} fill="#0b1220">
            {id.slice(0, 2).toUpperCase()}
          </text>
        </>
      );
  }
}

const KNOWN_SHAPES = new Set([
  'nine', 'ten', 'jack', 'queen', 'king', 'ace', 'seven', 'bar', 'wild', 'scatter', 'star', 'bell', 'coin', 'diamond', 'gem',
  'crown', 'skull', 'fish', 'cherry', 'lemon', 'orange', 'grape', 'melon', 'strawberry', 'banana', 'clover', 'ruby',
  'sapphire', 'emerald', 'amber', 'ring', 'anchor', 'ship', 'chest', 'parrot', 'map', 'compass', 'rocket', 'planet',
  'alien', 'ufo', 'comet', 'moon', 'sun', 'galaxy',
]);

/** Gibt es für diese ID eine gezeichnete Form (sonst Farbkachel mit Kürzel)? */
export function hasSymbolShape(id: string): boolean {
  return KNOWN_SHAPES.has(id.toLowerCase());
}

/**
 * Das Symbol als SVG — quadratisch, skaliert über `className` (z. B. `h-8 w-8`).
 * Farbe kommt aus `symbolArt(id).tint`; die Verlaufs-IDs enthalten die Symbol-ID,
 * damit mehrere Instanzen im selben Dokument dieselbe Definition teilen.
 */
export const SymbolIcon = memo(function SymbolIcon({ id, className, title }: { id: string; className?: string; title?: string }) {
  const key = id.toLowerCase();
  const art = symbolArt(id);
  const gid = `sym-g-${key.replace(/[^a-z0-9]/g, '')}`;
  const p: Palette = {
    tint: art.tint,
    light: mix(art.tint, 0.45),
    dark: mix(art.tint, -0.45),
    g: `url(#${gid})`,
    shine: `url(#${gid}-s)`,
  };
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title ?? id} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={p.light} />
          <stop offset="0.5" stopColor={art.tint} />
          <stop offset="1" stopColor={p.dark} />
        </linearGradient>
        <linearGradient id={`${gid}-s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {shape(key, p)}
    </svg>
  );
})
