"use client";

import { useCallback, useRef, useState } from "react";

import type { PullMode, PullResultItem } from "../../lib/pull/types";

/**
 * Pull controls: 1x / 10x buttons that POST to /api/pull.
 *
 * Owns the fetch + single-flight lock for triggering a pull. The parent page
 * (task 9.6) wires `onPullStart` / `onPullSuccess` / `onPullError` to drive
 * the chest animation (Chest3D / ChestReducedMotion) and the result reveal
 * (ResultReveal). This component contains no odds logic; it only calls the
 * server and reports the outcome.
 *
 * In-progress lock: while a request is in flight, both buttons are disabled
 * and show a pending indicator. A tap during this window is ignored, not
 * queued - `pendingRef` closes the race between a click and the next render
 * so a second tap before React re-renders can't slip through.
 *
 * Requirements: 2.1, 3.1, 7.2, 7.4
 */

export interface PullControlsProps {
  /** Fired immediately when a pull is initiated, before the request resolves. */
  onPullStart?: (mode: PullMode) => void;
  /** Fired when the server returns a successful pull result. */
  onPullSuccess?: (result: { items: PullResultItem[]; pityAfter: number }) => void;
  /** Fired when the request fails, with the server's error code (or a
   * client-side fallback such as "network-error" when the request itself
   * could not be completed). */
  onPullError?: (error: string) => void;
}

interface PullApiSuccess {
  items: PullResultItem[];
  pityAfter: number;
}

interface PullApiFailure {
  error: string;
}

export default function PullControls({
  onPullStart,
  onPullSuccess,
  onPullError,
}: PullControlsProps) {
  const [pending, setPending] = useState(false);
  // Guards against a second tap slipping in before the `pending` state
  // update from the first tap has been committed and re-rendered.
  const pendingRef = useRef(false);

  const runPull = useCallback(
    async (mode: PullMode) => {
      if (pendingRef.current) {
        return;
      }
      pendingRef.current = true;
      setPending(true);
      onPullStart?.(mode);

      try {
        const response = await fetch("/api/pull", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode }),
        });

        const data: unknown = await response.json().catch(() => null);

        if (!response.ok || !data || (data as PullApiFailure).error) {
          const errorCode =
            data && typeof (data as PullApiFailure).error === "string"
              ? (data as PullApiFailure).error
              : "internal";
          onPullError?.(errorCode);
        } else {
          const success = data as PullApiSuccess;
          onPullSuccess?.({ items: success.items, pityAfter: success.pityAfter });
        }
      } catch {
        onPullError?.("network-error");
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    },
    [onPullStart, onPullSuccess, onPullError],
  );

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex w-full items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => runPull("single")}
          disabled={pending}
          aria-disabled={pending}
          className="min-h-11 min-w-11 flex-1 max-w-40 rounded-xl border border-black/20 bg-rarity-common px-4 py-3 text-sm font-bold text-[#1a1524] shadow-[inset_0_2px_0_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.25),0_4px_0_rgba(0,0,0,0.35),0_6px_10px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-100 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-[3px] active:shadow-[inset_0_2px_0_rgba(255,255,255,0.4),inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_0_rgba(0,0,0,0.35)] motion-reduce:active:translate-y-0"
        >
          Pull x1
        </button>
        <button
          type="button"
          onClick={() => runPull("batch")}
          disabled={pending}
          aria-disabled={pending}
          className="min-h-11 min-w-11 flex-1 max-w-40 rounded-xl border border-black/20 bg-rarity-super-rare px-4 py-3 text-sm font-bold text-[#1a1524] shadow-[inset_0_2px_0_rgba(255,255,255,0.7),inset_0_-3px_4px_rgba(0,0,0,0.3),0_4px_0_rgba(158,110,0,0.55),0_6px_14px_rgba(242,193,78,0.35)] transition-[transform,box-shadow] duration-100 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-[3px] active:shadow-[inset_0_2px_0_rgba(255,255,255,0.5),inset_0_2px_4px_rgba(0,0,0,0.35),0_1px_0_rgba(158,110,0,0.55)] motion-reduce:active:translate-y-0"
        >
          Pull x10
        </button>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="min-h-5 text-xs font-medium uppercase tracking-wide text-foreground/70"
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-3 animate-pulse rounded-full bg-foreground/60 motion-reduce:animate-none"
            />
            Pulling...
          </span>
        ) : null}
      </div>
    </div>
  );
}
