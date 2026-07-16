/**
 * KiroGhost
 *
 * The Kiro ghost mascot mark. A single, simple brand glyph (the taste skill's
 * allowed exception to "no hand-rolled decorative SVG": the brief explicitly
 * asks for the Kiro ghost as the logo, and this is one clean geometric mark).
 *
 * The body fill is driven by `currentColor`, so callers tint the ghost by
 * setting `color` (e.g. the pink brand accent in chrome, or a rarity color
 * while the pull vessel charges). Eyes/mouth use their own dark ink so they
 * stay legible against any body color.
 *
 * `expression`:
 *  - "idle"  - calm open eyes (default; header, login, resting vessel)
 *  - "happy" - closed happy eyes + smile (reveal / celebratory moments)
 *
 * Purely presentational and `aria-hidden` by default; give it an
 * `aria-label` + `role="img"` at the call site when it needs a name.
 */

export type GhostExpression = "idle" | "happy";

export interface KiroGhostProps {
  /** Rendered width/height in px (the mark is square). */
  size?: number;
  className?: string;
  expression?: GhostExpression;
  /** Optional accessible name; when set, the SVG is exposed as an image. */
  title?: string;
  /** Inline style (e.g. `color` to tint the body via currentColor). */
  style?: React.CSSProperties;
}

export default function KiroGhost({
  size = 28,
  className,
  expression = "idle",
  title,
  style,
}: KiroGhostProps) {
  const labelled = Boolean(title);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {title ? <title>{title}</title> : null}

      {/* Ghost body: rounded dome top, straight sides, three-bump wavy hem.
       * Uses currentColor so the mark can be tinted by the caller. */}
      <path
        d="M50 8
           C29 8 16 24 16 46
           V80
           c0 5 6 8 10 4
           l6-6c2-2 5-2 7 0l5 5c2 2 5 2 7 0l5-5c2-2 5-2 7 0l6 6
           c4 4 10 1 10-4
           V46
           C84 24 71 8 50 8 Z"
        fill="currentColor"
      />

      {/* Soft inner highlight to give the body a little volume. */}
      <path
        d="M50 14 C34 14 24 27 24 45 V60 C24 40 34 22 50 22 Z"
        fill="#ffffff"
        opacity="0.18"
      />

      {expression === "happy" ? (
        <g stroke="#1a1524" strokeWidth="4.5" strokeLinecap="round" fill="none">
          {/* Happy closed eyes (upward arcs). */}
          <path d="M33 44 q6 -7 12 0" />
          <path d="M55 44 q6 -7 12 0" />
          {/* Smile. */}
          <path d="M42 56 q8 8 16 0" />
        </g>
      ) : (
        <g fill="#1a1524">
          {/* Calm open eyes. */}
          <ellipse cx="39" cy="46" rx="5" ry="6.5" />
          <ellipse cx="61" cy="46" rx="5" ry="6.5" />
          {/* Eye catchlights. */}
          <circle cx="41" cy="43.5" r="1.6" fill="#ffffff" />
          <circle cx="63" cy="43.5" r="1.6" fill="#ffffff" />
        </g>
      )}
    </svg>
  );
}
