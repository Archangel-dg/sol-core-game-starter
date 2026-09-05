import type { Metadata, Viewport } from 'next';
import { networkLabel } from '@/lib/solana';
import type { CSSProperties, ReactNode } from 'react';
import './globals.css';
import { Providers } from '@/components/Providers';
import { PoweredBy } from '@/components/PoweredBy';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_GAME_NAME ?? 'Sol-Core Game',
  // Metadaten rendert der Server, bevor die Sprache des Besuchers feststeht —
  // deshalb bewusst die Hauptsprache Englisch (siehe lib/i18n.tsx).
  // Netzwerkabhängig (Build-Zeit): NEXT_PUBLIC_SOLANA_NETWORK via lib/solana.
  // Metadaten rendert der Server, bevor die Sprache des Besuchers feststeht —
  // deshalb bewusst die Hauptsprache Englisch (siehe lib/i18n.tsx).
  description: `A Sol-Core game (${networkLabel}).`,
  // Auf dem Homescreen (iOS „Zum Home-Bildschirm") läuft das Spiel ohne
  // Safari-Rahmen; die Statusleiste liegt dann transparent über der Seite —
  // deshalb `viewport-fit=cover` unten und die Safe-Area-Ränder in globals.css.
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: process.env.NEXT_PUBLIC_GAME_NAME ?? 'Sol-Core Game' },
  formatDetection: { telephone: false },
};

/**
 * Viewport (Design-Zone, aber mit zwei Zusagen, die keine Geschmacksfrage sind):
 *
 *  - `viewportFit: 'cover'` — die Seite reicht bis unter Notch, Dynamic Island
 *    und Home-Leiste; was dort nicht liegen darf, hält `env(safe-area-inset-*)`
 *    in globals.css frei. Ohne `cover` sind die Insets immer 0.
 *  - KEIN `maximumScale: 1`, KEIN `userScalable: false`. Das wäre der bequeme
 *    Weg gegen das Hineinzoomen beim Tippen — und sperrt auf Android den
 *    Pinch-Zoom komplett (WCAG 1.4.4). Die echte Ursache des Zooms ist eine
 *    Eingabeschrift unter 16px; die Regel dagegen steht in globals.css.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0f',
};

/** Optionales Re-Skin ohne Code: NEXT_PUBLIC_ACCENT_COLOR=#RRGGBB
 * überschreibt die Akzentfarbe. Ungültige Werte ⇒ Default (Sol-Grün). */
function accentStyle(): CSSProperties | undefined {
  const m = /^#?([0-9a-fA-F]{6})$/.exec((process.env.NEXT_PUBLIC_ACCENT_COLOR ?? '').trim());
  if (!m) return undefined;
  const n = parseInt(m[1], 16);
  const rgb = `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
  return { '--accent-rgb': rgb, '--accent-soft-rgb': rgb } as CSSProperties;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/* Spalte + flex-1: Ist eine Seite kürzer als der Bildschirm, steht die
          Herkunftszeile trotzdem unten und nicht mitten im Bild. */}
      <body className="sc-vh flex flex-col font-mono antialiased" style={accentStyle()}>
        <Providers>
          <div className="flex-1">{children}</div>
          {/* Systemvertrag: auf JEDER Seite, unter allen Render-Pfaden. */}
          <PoweredBy />
        </Providers>
      </body>
    </html>
  );
}
