import type { Metadata } from 'next';
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
    <html lang="de">
      {/* Spalte + flex-1: Ist eine Seite kürzer als der Bildschirm, steht die
          Herkunftszeile trotzdem unten und nicht mitten im Bild. */}
      <body className="flex min-h-screen flex-col font-mono antialiased" style={accentStyle()}>
        <Providers>
          <div className="flex-1">{children}</div>
          {/* Systemvertrag: auf JEDER Seite, unter allen Render-Pfaden. */}
          <PoweredBy />
        </Providers>
      </body>
    </html>
  );
}
