/**
 * Synthesized pull sound effects (Web Audio API).
 *
 * Sounds are generated at runtime with oscillators + gain envelopes rather than
 * shipped as audio files: nothing external is fetched, it works offline, and
 * each tier gets a distinct, tunable cue. Browsers block audio until a user
 * gesture, so the AudioContext is created lazily on first `play*` call (which
 * only happens in response to a Pull tap) and resumed if suspended.
 *
 * Public surface:
 *   - playPull()          the "pulling" cue (fired when a pull starts)
 *   - playReveal(tier)    the result cue (fired at the reveal moment)
 *
 * Callers gate these behind the user's mute preference (see SoundProvider);
 * every entry point is wrapped in try/catch so audio issues never break a pull.
 */

import type { RarityTier } from "@/lib/pull/types";

let ctx: AudioContext | null = null;

/** Lazily create/resume the shared AudioContext (must run in a user gesture). */
function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Plays a single enveloped tone. `start`/`end` are seconds relative to the
 * context's current time. The gain envelope is a quick attack + smooth
 * exponential decay so tones read as plucked/bell-like, not clicky.
 */
function tone(
  audio: AudioContext,
  {
    freq,
    start,
    duration,
    type = "sine",
    peak = 0.18,
    endFreq,
  }: {
    freq: number;
    start: number;
    duration: number;
    type?: OscillatorType;
    peak?: number;
    endFreq?: number;
  },
): void {
  const t0 = audio.currentTime + start;
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + duration);
  }

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** The "pulling" cue: a soft rising whoosh that builds anticipation. */
export function playPull(): void {
  const audio = getContext();
  if (!audio) return;
  try {
    tone(audio, {
      freq: 220,
      endFreq: 660,
      start: 0,
      duration: 0.5,
      type: "triangle",
      peak: 0.12,
    });
    tone(audio, {
      freq: 110,
      endFreq: 330,
      start: 0.02,
      duration: 0.45,
      type: "sine",
      peak: 0.08,
    });
  } catch {
    // Audio is best-effort; never let it interrupt a pull.
  }
}

/**
 * The result cue, escalating with rarity:
 *  - common     a light single pop
 *  - rare       a bright two-note chime
 *  - super_rare a triumphant ascending arpeggio + a shimmer top note
 */
export function playReveal(tier: RarityTier): void {
  const audio = getContext();
  if (!audio) return;
  try {
    if (tier === "common") {
      tone(audio, { freq: 523.25, start: 0, duration: 0.22, type: "sine", peak: 0.14 });
      return;
    }

    if (tier === "rare") {
      // A5 then E6: a clean, bright interval.
      tone(audio, { freq: 880, start: 0, duration: 0.28, type: "triangle", peak: 0.16 });
      tone(audio, { freq: 1318.5, start: 0.12, duration: 0.34, type: "sine", peak: 0.16 });
      return;
    }

    // super_rare: C-major arpeggio (C5 E5 G5 C6) + a high shimmer.
    const arp = [523.25, 659.25, 783.99, 1046.5];
    arp.forEach((freq, i) => {
      tone(audio, {
        freq,
        start: i * 0.09,
        duration: 0.4,
        type: "triangle",
        peak: 0.16,
      });
    });
    tone(audio, {
      freq: 2093,
      start: 0.36,
      duration: 0.6,
      type: "sine",
      peak: 0.1,
    });
  } catch {
    // Best-effort; ignore.
  }
}
