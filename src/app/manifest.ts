import type { MetadataRoute } from 'next';

/**
 * Web-App-Manifest (Design-Zone). Damit kann ein Spieler das Spiel auf den
 * Homescreen legen und es startet ohne Browser-Rahmen, in der Nachtfarbe.
 * Icons stehen bewusst nicht hier: Ein erfundenes Icon wäre das Logo eines
 * anderen. Ein Creator legt seines unter public/ ab und trägt es hier ein.
 */
export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.NEXT_PUBLIC_GAME_NAME ?? 'Sol-Core Game';
  return {
    name,
    short_name: name,
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#0a0a0f',
  };
}
