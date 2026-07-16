"use client";

/**
 * useSound
 *
 * Sound controls backed by a tiny module-level external store (the mute
 * preference in localStorage), read via `useSyncExternalStore` so it is
 * SSR-safe and stays in sync across tabs and components without a Context
 * provider. Exposes `playPull` / `playReveal` wrappers that no-op when muted.
 *
 * Sound is controlled independently of `prefers-reduced-motion` (it is audio,
 * not motion); the MuteToggle in the header is the user's control.
 */

import { useCallback, useSyncExternalStore } from "react";

import { playPull as playPullFx, playReveal as playRevealFx } from "@/lib/audio/sound";
import type { RarityTier } from "@/lib/pull/types";

const STORAGE_KEY = "kiro-idea-vault:muted";
/** Same-tab change signal (the native "storage" event only fires cross-tab). */
const CHANGE_EVENT = "kiro-idea-vault:muted-change";

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function writeMuted(next: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Ignore storage write errors (private mode, etc.).
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export interface SoundControls {
  muted: boolean;
  toggleMuted: () => void;
  playPull: () => void;
  playReveal: (tier: RarityTier) => void;
}

export function useSound(): SoundControls {
  // Server snapshot is always "not muted" so the first client render matches;
  // useSyncExternalStore then reconciles with the persisted value.
  const muted = useSyncExternalStore(subscribe, readMuted, () => false);

  const toggleMuted = useCallback(() => {
    writeMuted(!readMuted());
  }, []);

  const playPull = useCallback(() => {
    if (!muted) playPullFx();
  }, [muted]);

  const playReveal = useCallback(
    (tier: RarityTier) => {
      if (!muted) playRevealFx(tier);
    },
    [muted],
  );

  return { muted, toggleMuted, playPull, playReveal };
}
