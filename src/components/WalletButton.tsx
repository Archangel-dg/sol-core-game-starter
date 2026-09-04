'use client';

import dynamic from 'next/dynamic';
import { useT } from '@/lib/i18n';

/**
 * Der Verbinden-Knopf in der Kopfleiste (Design-Zone).
 *
 * Warum nicht `WalletMultiButton`: Der verdrahtet seine Beschriftungen fest auf
 * Englisch („Select Wallet", „Connecting …") und ließ sich weder übersetzen
 * noch kürzen. `BaseWalletMultiButton` ist derselbe Knopf mit derselben Logik,
 * nimmt die Texte aber als Prop — damit läuft auch dieser Knopf durch den
 * Katalog und folgt dem Sprachumschalter (Regel 11).
 *
 * „Connect" statt „Select Wallet" (04.09.2026): Der lange Text machte den Knopf
 * breiter als die Saldo-Anzeige, an deren Stelle er nach dem Verbinden tritt —
 * die Kopfleiste sprang beim Verbinden sichtbar um. Kurz gehalten heißt hier
 * auch: sagen, was passiert. „Wallet" wäre ein Hauptwort auf einem Knopf, und
 * „Login" verspricht ein Konto, das es nicht gibt — verbunden wird eine Wallet
 * per Signatur, ohne Anmeldung.
 */
const Base = dynamic(
  // Client-only, damit der Wallet-Adapter beim Prerender kein window anfasst.
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.BaseWalletMultiButton),
  { ssr: false, loading: () => <div className="h-10 w-28 rounded-full bg-white/5" /> },
);

export function WalletButton() {
  const t = useT();
  return (
    <Base
      labels={{
        'no-wallet': t('wallet.connect'),
        'has-wallet': t('wallet.connect'),
        connecting: t('wallet.connecting'),
        'change-wallet': t('wallet.change'),
        'copy-address': t('menu.copyAddress'),
        copied: t('menu.copied'),
        disconnect: t('menu.disconnect'),
      }}
    />
  );
}
