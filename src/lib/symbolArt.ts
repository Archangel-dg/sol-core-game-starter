// Default-Symbolgrafik ohne externe Assets: bekannte Ids → Emoji + Akzent,
// unbekannte Ids → deterministische Farbkachel mit Kürzel. Creators ersetzen
// das frei (Design-Zone).
const KNOWN: Record<string, { glyph: string; tint: string }> = {
  ace: { glyph: 'A', tint: '#f43f5e' }, king: { glyph: 'K', tint: '#f59e0b' },
  queen: { glyph: 'Q', tint: '#a855f7' }, jack: { glyph: 'J', tint: '#3b82f6' },
  ten: { glyph: '10', tint: '#22c55e' }, nine: { glyph: '9', tint: '#14b8a6' },
  wild: { glyph: '🃏', tint: '#eab308' }, scatter: { glyph: '✨', tint: '#8b5cf6' },
  star: { glyph: '⭐', tint: '#8b5cf6' }, cherry: { glyph: '🍒', tint: '#ef4444' },
  lemon: { glyph: '🍋', tint: '#facc15' }, bell: { glyph: '🔔', tint: '#f59e0b' },
  seven: { glyph: '7️⃣', tint: '#ef4444' }, diamond: { glyph: '💎', tint: '#38bdf8' },
  bar: { glyph: 'BAR', tint: '#94a3b8' }, coin: { glyph: '🪙', tint: '#eab308' },
  gem: { glyph: '💠', tint: '#06b6d4' }, crown: { glyph: '👑', tint: '#f59e0b' },
  skull: { glyph: '💀', tint: '#64748b' }, fish: { glyph: '🐟', tint: '#0ea5e9' },
};

const PALETTE = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#14b8a6', '#f43f5e', '#eab308'];

export function symbolArt(id: string): { glyph: string; tint: string } {
  const known = KNOWN[id.toLowerCase()];
  if (known) return known;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { glyph: id.slice(0, 2).toUpperCase(), tint: PALETTE[h % PALETTE.length]! };
}
