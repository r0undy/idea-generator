"use client";

/**
 * MuteToggle
 *
 * Header control for the pull sound effects. Reflects and flips the persisted
 * mute preference from SoundProvider. Icon-only with an accessible label and
 * `aria-pressed` so screen readers announce the on/off state.
 */

import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";

import { useSound } from "@/components/audio/useSound";

export default function MuteToggle() {
  const { muted, toggleMuted } = useSound();

  return (
    <button
      type="button"
      onClick={toggleMuted}
      aria-pressed={muted}
      aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
      title={muted ? "Unmute sound" : "Mute sound"}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-foreground/15 bg-white/5 text-foreground/70 transition-colors hover:text-foreground hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-[0.96] motion-reduce:active:scale-100"
    >
      {muted ? (
        <SpeakerSlash size={18} weight="fill" aria-hidden="true" />
      ) : (
        <SpeakerHigh size={18} weight="fill" aria-hidden="true" />
      )}
    </button>
  );
}
