/**
 * Dev-Helfer (NICHT Teil des Creator-Flows): registriert einen Wegwerf-Creator
 * und legt ein Crash-Game an, druckt SOLCORE_API_KEY + SOLCORE_GAME_ID zum
 * Eintragen in die lokale .env. Nur für Devnet/Test.
 *
 *   SOLCORE_API_URL=https://api.sol-core.com node scripts/create-test-game.mjs
 */
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const API = (process.env.SOLCORE_API_URL ?? 'https://api.sol-core.com').replace(/\/$/, '');
const enc = (s) => new TextEncoder().encode(s);
const b58 = bs58.default ?? bs58;
const authMsg = (p, a, t) => `Sol-Core Gaming API\nAction: ${p}\nWallet: ${a}\nTimestamp: ${t}`;
const kp = nacl.sign.keyPair();
const address = b58.encode(kp.publicKey);
const sign = (m) => b58.encode(nacl.sign.detached(enc(m), kp.secretKey));
const wh = () => { const t = Date.now(); const m = authMsg('login', address, t); return { 'X-Wallet-Address': address, 'X-Wallet-Signature': sign(m), 'X-Wallet-Message': encodeURIComponent(m), 'X-Wallet-Timestamp': String(t) }; };

console.log('Backend:', API);
{
  const t = Date.now(); const m = authMsg('register', address, t);
  const r = await fetch(`${API}/api/creator/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ walletAddress: address, displayName: 'Starter Test', signature: sign(m), message: m, timestamp: t }) });
  if (!r.ok) { console.error('register fehlgeschlagen:', await r.text()); process.exit(1); }
}
const r = await fetch(`${API}/api/creator/games`, { method: 'POST', headers: { 'content-type': 'application/json', ...wh() }, body: JSON.stringify({ gameMode: 'crash', displayName: 'Starter Crash', creatorFeeBps: 200, config: { houseEdgeBps: 300 }, paytable: {}, maxMultiplierBps: 200000, domain: 'https://example.com/starter' }) });
const b = await r.json();
if (!r.ok) { console.error('game anlegen fehlgeschlagen:', JSON.stringify(b)); process.exit(1); }
console.log('\n✓ Test-Game angelegt. In deine .env eintragen:\n');
console.log(`SOLCORE_API_KEY=${b.apiKey}`);
console.log(`SOLCORE_GAME_ID=${b.gameId ?? b.game?.gameId ?? b.game?.id}`);
console.log(`\n(Creator-Wallet: ${address} — darf nicht selbst spielen, nutze eine ANDERE Wallet.)`);
