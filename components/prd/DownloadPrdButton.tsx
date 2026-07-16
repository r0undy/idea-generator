"use client";

/**
 * DownloadPrdButton
 *
 * A link that downloads the Kiro-style PRD (prd.md) for a specific idea from
 * the GET /api/ideas/[id]/prd route. Rendered inside clickable/tappable
 * containers (the reveal modal card, history rows), so it stops click
 * propagation to avoid triggering the parent's tap handler (e.g. modal close).
 *
 * `variant`:
 *  - "full"    full-width labeled button (single reveal card, history row)
 *  - "compact" small icon + short label (batch reveal cards)
 */

import { DownloadSimple } from "@phosphor-icons/react";

export interface DownloadPrdButtonProps {
  ideaId: string;
  variant?: "full" | "compact";
  className?: string;
}

export default function DownloadPrdButton({
  ideaId,
  variant = "full",
  className,
}: DownloadPrdButtonProps) {
  const compact = variant === "compact";

  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 font-semibold text-brand transition-colors hover:bg-brand/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-[0.98] motion-reduce:active:scale-100";
  const sizing = compact
    ? "px-2.5 py-1.5 text-[11px]"
    : "min-h-11 w-full px-4 py-2.5 text-sm";

  return (
    <a
      href={`/api/ideas/${ideaId}/prd`}
      download="prd.md"
      onClick={(e) => e.stopPropagation()}
      className={[base, sizing, className].filter(Boolean).join(" ")}
    >
      <DownloadSimple size={compact ? 14 : 17} weight="bold" aria-hidden="true" />
      {compact ? "PRD" : "Download PRD"}
    </a>
  );
}
