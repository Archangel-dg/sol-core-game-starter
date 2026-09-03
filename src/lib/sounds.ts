'use client';

/**
 * Standard-Soundeffekte der Vorlage (Design-Zone).
 *
 * Die Klänge liegen als Dateien unter `public/sounds/` und werden von
 * `scripts/generate-sounds.mjs` erzeugt. Ein Creator tauscht einen Klang aus,
 * indem er die Datei unter gleichem Namen ersetzt — oder hier den Pfad in
 * `SOUND_FILES` umbiegt. Code muss dafür niemand anfassen.
 *
 * Der Schalter ist STANDARDMÄSSIG AUS und liegt in localStorage (`sc_sound`).
 * Browser spielen ohnehin erst nach der ersten Interaktion Ton ab — der erste
 * Klick auf den Schalter im Menü ist genau diese Interaktion.
 *
 * Kein Provider nötig: Ein kleiner externer Store, den `useSound()` per
 * `useSyncExternalStore` liest. So bleibt `Providers.tsx` (Systemvertrag)
 * unangetastet.
 */

import { useCallback, useSyncExternalStore } from 'react';

export type SoundName = 'click' | 'bet' | 'reveal' | 'win' | 'lose' | 'cashout' | 'error';

/** Ereignis → Datei. Pfade relativ zu `public/`. */
export const SOUND_FILES: Record<SoundName, string> = {
  click: '/sounds/click.wav',
  bet: '/sounds/bet.wav',
  reveal: '/sounds/reveal.wav',
  win: '/sounds/win.wav',
  lose: '/sounds/lose.wav',
  cashout: '/sounds/cashout.wav',
  error: '/sounds/error.wav',
};

/** Lautstärke 0–1 für alle Effekte. */
export const SOUND_VOLUME = 0.5;

const STORE_KEY = 'sc_sound';

let enabled = false;
let initialised = false;
const listeners = new Set<() => void>();

function init() {
  if (initialised || typeof window === 'undefined') return;
  initialised = true;
  try {
    enabled = localStorage.getItem(STORE_KEY) === 'on';
  } catch {
    enabled = false;
  }
}

function subscribe(cb: () => void) {
  init();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function snapshot() {
  return enabled;
}

export function isSoundEnabled(): boolean {
  init();
  return enabled;
}

export function setSoundEnabled(on: boolean) {
  init();
  enabled = on;
  try {
    localStorage.setItem(STORE_KEY, on ? 'on' : 'off');
  } catch {
    /* privater Modus — der Schalter gilt dann nur für diese Sitzung */
  }
  listeners.forEach((cb) => cb());
}

const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};

/**
 * Spielt einen Effekt, wenn der Schalter an ist. Jeder Aufruf klont das
 * vorgeladene Element, damit sich schnelle Folgen (Klick, Klick) überlagern
 * dürfen statt sich abzuschneiden. Fällt still aus, wenn der Browser
 * Audio verweigert.
 */
export function playSound(name: SoundName) {
  if (!isSoundEnabled() || typeof window === 'undefined') return;
  try {
    const base = (cache[name] ??= new Audio(SOUND_FILES[name]));
    const a = base.cloneNode(true) as HTMLAudioElement;
    a.volume = SOUND_VOLUME;
    void a.play().catch(() => {
      /* Autoplay-Sperre o. Ä. — nichts zu tun */
    });
  } catch {
    /* kein Audio verfügbar */
  }
}

/** Hook für Komponenten: Zustand des Schalters, Umschalten, Abspielen. */
export function useSound(): {
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  play: (name: SoundName) => void;
} {
  const on = useSyncExternalStore(subscribe, snapshot, () => false);
  const play = useCallback((name: SoundName) => playSound(name), []);
  return { enabled: on, setEnabled: setSoundEnabled, play };
}
