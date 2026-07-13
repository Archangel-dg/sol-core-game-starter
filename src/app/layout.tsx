import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_GAME_NAME ?? 'Sol-Core Game',
  description: 'Ein Sol-Core-Spiel (Devnet).',
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
      <body className="min-h-screen font-mono antialiased" style={accentStyle()}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
