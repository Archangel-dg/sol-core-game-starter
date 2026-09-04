'use client';

/**
 * Animations-Schalter (Design-Zone).
 *
 * Standardmäßig AN. Wer ihn im Spielmenü ausschaltet, bekommt jedes Ergebnis
 * binnen 300 ms als Endbild statt als Flug — für ungeduldige Spieler und für
 * alle, denen Bewegung nicht guttut. Die Betriebssystem-Einstellung
 * `prefers-reduced-motion` wirkt unabhängig davon; `isReducedMotion()` fasst
 * beides zusammen und ist das, was `RevealHost` an ein Modul weitergibt.
 *
 * Die Sperre der Ergebnisse bleibt davon unberührt: Auch ein 300-ms-Endbild
 * ist ein Endbild — Saldo, Ton und Verlauf warten darauf genauso.
 *
 * Gleiches Muster wie `lib/sounds.ts`: ein winziger externer Store, kein
 * Provider, `Providers.tsx` (Systemvertrag) bleibt unangetastet.
 */

import { useSyncExternalStore } from 'react';

const STORE_KEY = 'sc_motion';

let enabled = true;
let initialised = false;
const listeners = new Set<() => void>();

function init() {
  if (initialised || typeof window === 'undefined') return;
  initialised = true;
  try {
    enabled = localStorage.getItem(STORE_KEY) !== 'off';
  } catch {
    enabled = true;
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

export function isMotionEnabled(): boolean {
  init();
  return enabled;
}

export function setMotionEnabled(on: boolean) {
  init();
  enabled = on;
  try {
    localStorage.setItem(STORE_KEY, on ? 'on' : 'off');
  } catch {
    /* privater Modus — der Schalter gilt dann nur für diese Sitzung */
  }
  listeners.forEach((cb) => cb());
}

/** Schalter aus ODER Betriebssystem will weniger Bewegung. */
export function isReducedMotion(): boolean {
  if (!isMotionEnabled()) return true;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Hook für Komponenten: Zustand des Schalters und Umschalten. */
export function useMotion(): { enabled: boolean; setEnabled: (on: boolean) => void } {
  const on = useSyncExternalStore(subscribe, snapshot, () => true);
  return { enabled: on, setEnabled: setMotionEnabled };
}
