'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useT } from '@/lib/i18n';
import { useSound } from '@/lib/sounds';
import { LangSwitch } from './LangSwitch';
import { Popover } from './Popover';
import { History } from './History';
import { FairnessPanel } from './FairnessPanel';
import type { RoundLog } from './SingleBetGame';

export interface GameMenuProps {
  history: RoundLog[];
  serverSeedHash: string | null;
  roundId: string | null;
  apiUrl: string;
  verifierUrl: string;
  demo: boolean;
}

/**
 * Spielmenü rechts in der Kopfleiste (Design-Zone). Von oben nach unten:
 * Wallet (Kürzel, Icon des Adapters, kopieren, trennen) · Sprache · Sound ·
 * letzte Runden · Seed-Hash.
 *
 * Verify-Links und Seed-Hash sind seit dem 03.09.2026 hier erreichbar statt
 * unter dem Spiel sichtbar — das Menü ist die eine Stelle, an der ein Spieler
 * nachsieht. Die Bausteine selbst (History, FairnessPanel) sind unverändert.
 */
export function GameMenu({ history, serverSeedHash, roundId, apiUrl, verifierUrl, demo }: GameMenuProps) {
  const t = useT();
  const { wallet, publicKey, connected, disconnect } = useWallet();
  const { enabled: soundOn, setEnabled: setSoundOn, play } = useSound();
  const [copied, setCopied] = useState(false);
  const [seedOpen, setSeedOpen] = useState(false);

  const address = publicKey?.toBase58() ?? null;
  const short = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : null;

  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Zwischenablage gesperrt — dann eben nicht */
    }
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    // Der erste Klick ist die Interaktion, die der Browser für Audio verlangt —
    // ein kurzer Ton als Bestätigung, dass es jetzt geht.
    if (next) play('click');
  };

  const sectionCls = 'border-t border-white/10 pt-3';
  const labelCls = 'mb-1 text-[10px] uppercase tracking-wide text-white/40';

  return (
    <Popover
      align="end"
      panelClassName="w-80 max-w-[calc(100vw-2rem)]"
      trigger={(open) => (
        <span
          title={t('menu.open')}
          aria-label={t('menu.open')}
          className={`grid h-10 w-10 place-items-center rounded-full border transition-colors ${
            open ? 'border-accent/50 bg-accent/10 text-accent' : 'border-white/15 text-white/70 hover:text-white'
          }`}
        >
          <svg viewBox="0 0 20 20" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
          </svg>
        </span>
      )}
    >
      {(close) => (
        <div className="space-y-3 text-sm">
          {/* Wallet */}
          <div>
            <div className={labelCls}>{t('menu.wallet')}</div>
            {connected && address ? (
              <div className="flex items-center gap-2">
                {wallet?.adapter.icon && (
                  // Icon und Name kommen vom Wallet-Adapter (Phantom, Solflare …).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={wallet.adapter.icon} alt="" className="h-6 w-6 rounded" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold tabular-nums text-white">{short}</span>
                  <span className="block text-[11px] text-white/40">{wallet?.adapter.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void copy()}
                  title={t('menu.copyAddress')}
                  className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:text-white"
                >
                  {copied ? t('menu.copied') : t('menu.copyAddress')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void disconnect();
                    close();
                  }}
                  className="rounded-full border border-red-400/40 px-2.5 py-1 text-xs text-red-300 hover:bg-red-400/10"
                >
                  {t('menu.disconnect')}
                </button>
              </div>
            ) : (
              <p className="text-xs text-white/40">{t('menu.notConnected')}</p>
            )}
          </div>

          {/* Sprache — der Umschalter muss erreichbar bleiben (Systemvertrag). */}
          <div className={`${sectionCls} flex items-center justify-between`}>
            <span className="text-xs text-white/60">{t('menu.language')}</span>
            <LangSwitch />
          </div>

          {/* Sound */}
          <div className={`${sectionCls} flex items-center justify-between`}>
            <span className="text-xs text-white/60">{t('menu.sound')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={soundOn}
              onClick={toggleSound}
              className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs ${
                soundOn ? 'border-accent/50 text-accent' : 'border-white/15 text-white/50'
              }`}
            >
              <span
                className={`relative inline-block h-4 w-7 rounded-full transition-colors ${
                  soundOn ? 'bg-accent' : 'bg-white/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-night transition-all ${
                    soundOn ? 'left-3.5' : 'left-0.5'
                  }`}
                />
              </span>
              {soundOn ? t('menu.soundOn') : t('menu.soundOff')}
            </button>
          </div>

          {/* Letzte Runden */}
          <div className={sectionCls}>
            <div className={labelCls}>{t('verify.recentRounds')}</div>
            {history.length === 0 ? (
              <p className="text-xs text-white/40">{t('menu.noRounds')}</p>
            ) : (
              <History rounds={history} apiUrl={apiUrl} verifierUrl={verifierUrl} demo={demo} />
            )}
          </div>

          {/* Seed-Hash — Nachprüfbarkeit (Systemvertrag: erreichbar halten). */}
          <div className={sectionCls}>
            <button
              type="button"
              onClick={() => setSeedOpen((o) => !o)}
              aria-expanded={seedOpen}
              className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                seedOpen ? 'border-accent/40 text-accent' : 'border-white/15 text-white/70 hover:text-white'
              }`}
            >
              {t('menu.seedHash')}
            </button>
            {seedOpen && (
              <div className="mt-2">
                <FairnessPanel
                  apiUrl={apiUrl}
                  verifierUrl={verifierUrl}
                  serverSeedHash={serverSeedHash}
                  roundId={roundId}
                  demo={demo}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </Popover>
  );
}
