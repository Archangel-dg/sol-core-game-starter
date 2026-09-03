'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from './WalletButton';
import { BalanceBar } from './BalanceBar';
import { DemoBar } from './DemoBar';
import { GameMenu, type GameMenuProps } from './GameMenu';

/**
 * Kopfleiste (Design-Zone): links der Spielname, in der Mitte die Wallet —
 * erst der Verbinden-Knopf, nach der Verbindung der Saldo mit Aufklappfeld
 * (Einzahlen, Auszahlen, Historie) — rechts das Spielmenü.
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
}: {
  gameName: string;
  subtitle: string;
  devMock: boolean;
  /** Demo-Abzeichen/-Einstieg anzeigen (nicht bei Live-Mechaniken). */
  showDemo: boolean;
  menu: GameMenuProps;
}) {
  const { connected } = useWallet();
  return (
    // Volle Breite, nicht an die schmale Spielspalte gebunden: So hat der Name
    // am Desktop Platz, und die Mitte bleibt die Mitte des Bildschirms. Die
    // Spalten sind minmax(0,1fr), sonst schiebt der Wallet-Knopf am Handy das
    // Menü aus dem Bild (Grid-Spalten haben sonst min-width:auto).
    <header className="sticky top-0 z-20 mb-6 border-b border-white/10 bg-night/85 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-[minmax(3.5rem,1fr)_auto_minmax(2.5rem,1fr)] items-center gap-2 px-4 py-2.5 sm:py-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-white sm:text-lg">{gameName}</h1>
          <p className="truncate text-[10px] text-white/40 sm:text-[11px]">{subtitle}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          {showDemo && !connected && <DemoBar />}
          {connected ? <BalanceBar devMock={devMock} /> : <WalletButton />}
        </div>

        <div className="flex justify-end">
          <GameMenu {...menu} />
        </div>
      </div>
    </header>
  );
}
