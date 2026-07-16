/**
 * FantasyBackground
 *
 * A fixed, full-viewport dark-fantasy backdrop: a starfield plus three slow
 * "ember" glows tinted with the app's existing rarity accents (silver /
 * purple / gold), so the background reads as part of the same gacha world
 * as the chest and reveal cards rather than a generic AI-purple gradient.
 * Purely decorative - `pointer-events-none`, `aria-hidden`, and mounted once
 * behind all page content (see app/layout.tsx).
 *
 * No JavaScript is needed: the drift/breathe motion is plain CSS animation,
 * gated behind `@media (prefers-reduced-motion: no-preference)` so it
 * collapses to a static backdrop automatically when the OS/browser signals
 * reduced motion (Requirement 7.3's spirit extended to page chrome).
 *
 * Server Component - safe to render from the root layout without adding to
 * the client bundle.
 */
export default function FantasyBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-background"
    >
      {/* Starfield: two offset dot-grids at different scales/opacities. */}
      <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:3px_3px] [background-position:0_0]" />
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.4)_1px,transparent_1px)] [background-size:5px_5px] [background-position:2px_3px]" />

      {/* Ember glows, tinted with the locked rarity accents. */}
      <div className="fantasy-ember fantasy-ember--gold absolute left-[8%] top-[12%] h-72 w-72 rounded-full bg-rarity-super-rare/25 blur-3xl" />
      <div className="fantasy-ember fantasy-ember--purple absolute right-[10%] top-[38%] h-96 w-96 rounded-full bg-rarity-rare/25 blur-3xl" />
      <div className="fantasy-ember fantasy-ember--silver absolute bottom-[8%] left-[22%] h-80 w-80 rounded-full bg-rarity-common/15 blur-3xl" />

      {/* Vignette to keep foreground content readable (WCAG contrast) over the glows. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_78%)]" />
    </div>
  );
}
