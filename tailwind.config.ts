import type { Config } from 'tailwindcss';

/** Minimal-Theme. Farben/Design sind die „Design-Zone" — hier anpassen. */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0a0a0f',
        // Akzent via CSS-Variable — überschreibbar per NEXT_PUBLIC_ACCENT_COLOR (layout.tsx).
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft-rgb) / <alpha-value>)',
        solana: '#9945ff',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
