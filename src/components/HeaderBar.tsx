'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from './WalletButton';
import { BalanceBar } from './BalanceBar';
import { DemoBar } from './DemoBar';
import { GameMenu, type GameMenuProps } from './GameMenu';
import { WinToast, type WinToastProps } from './WinToast';

/**
 * Kopfleiste (Design-Zone): links der Spielname, rechts die Wallet-Gruppe
 * direkt neben dem Menü — erst der Verbinden-Knopf, nach der Verbindung der
 * Saldo mit Aufklappfeld (Einzahlen, Auszahlen, Historie), ganz rechts das
 * Spielmenü.
 *
 * Warum die Gruppe rechts steht und nicht mittig (04.09.2026): Saldo und Menü
 * gehören zusammen — beides ist „mein Konto, meine Einstellungen". Mittig
 * sprang die Anzeige außerdem beim Verbinden von der Mitte an ihren Platz,
 * weil Demo-Abzeichen und Saldo unterschiedlich breit sind. Links bleibt so
 * der ganze Rest für den Spielnamen.
 *
 * Das Demo-Abzeichen steht neben dem Wallet-Knopf, solange keine Wallet
 * verbunden ist; mit der Verbindung endet der Demo-Modus (app/page.tsx), und
 * an seine Stelle tritt der echte Saldo.
 *
 * Was hier NICHT wegfallen darf (Systemvertrag): Ein- und Auszahlen
 * (BalanceBar), der Demo-Einstieg (DemoBar), der Sprachumschalter und der
 * Verify-Zugang (beide im GameMenu).
 */
export function HeaderBar({
  gameName,
  subtitle,
  devMock,
  showDemo,
  menu,
  win,
}: {
  gameName: string;
  subtitle: string;
  devMock: boolean;
  /** Demo-Abzeichen/-Einstieg anzeigen (nicht bei Live-Mechaniken). */
  showDemo: boolean;
  menu: GameMenuProps;
  /** Zuletzt AUFGEDECKTER Gewinn — die Meldung unter dem Saldo. */
  win: WinToastProps['win'];
}) {
  const { connected } = useWallet();
  return (
    // Volle Breite, nicht an die schmale Spielspalte gebunden: So hat der Name
    // am Desktop Platz. Der Name schrumpft (min-w-0 flex-1 + truncate), die
    // rechte Gruppe nie (shrink-0) — sonst drückt ein langer Spielname am
    // Handy erst den Saldo und dann das Menü aus dem Bild.
    <header className="sc-header sticky top-0 z-20 mb-6 border-b border-white/10 bg-night/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5 sm:py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold text-white sm:text-lg">{gameName}</h1>
          <p className="truncate text-[10px] text-white/40 sm:text-[11px]">{subtitle}</p>
        </div>

        {/* Wallet-Gruppe und Menü als ein Block rechts. Die Gewinnmeldung
            hängt am Saldo (nicht an der ganzen Gruppe), deshalb sitzt das
            `relative` um Demo-Abzeichen und Saldo — und nicht ums Menü. Sie
            liegt absolut, damit die Leiste nicht springt, wenn sie kommt. */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="relative flex items-center gap-1.5 sm:gap-2">
            {showDemo && !connected && <DemoBar />}
            {connected ? <BalanceBar devMock={devMock} /> : <WalletButton />}
            <WinToast win={win} />
          </div>
          <GameMenu {...menu} />
        </div>
      </div>
    </header>
  );
}
