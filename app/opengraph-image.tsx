import { ImageResponse } from "next/og";

/**
 * app/opengraph-image.tsx
 *
 * Social share image (Open Graph / Twitter card) for the whole app. Reuses
 * the same ghost mascot glyph as components/brand/KiroGhost.tsx and the
 * dark-fantasy gacha palette (background/brand/rarity accents from
 * app/globals.css) so a shared link matches the in-app look.
 */

export const alt = "Kiro Idea Vault - Kiroverse Week 5";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0a10",
          backgroundImage:
            "radial-gradient(circle at 22% 25%, rgba(242,193,78,0.28), transparent 42%), radial-gradient(circle at 78% 62%, rgba(165,108,240,0.28), transparent 45%), radial-gradient(circle at 50% 100%, rgba(199,205,214,0.14), transparent 40%)",
        }}
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ marginBottom: 28 }}
        >
          <path
            d="M50 8
               C29 8 16 24 16 46
               V80
               c0 5 6 8 10 4
               l6-6c2-2 5-2 7 0l5 5c2 2 5 2 7 0l5-5c2-2 5-2 7 0l6 6
               c4 4 10 1 10-4
               V46
               C84 24 71 8 50 8 Z"
            fill="#ff5fa8"
          />
          <path
            d="M50 14 C34 14 24 27 24 45 V60 C24 40 34 22 50 22 Z"
            fill="#ffffff"
            opacity="0.18"
          />
          <ellipse cx="39" cy="46" rx="5" ry="6.5" fill="#1a1524" />
          <ellipse cx="61" cy="46" rx="5" ry="6.5" fill="#1a1524" />
          <circle cx="41" cy="43.5" r="1.6" fill="#ffffff" />
          <circle cx="63" cy="43.5" r="1.6" fill="#ffffff" />
        </svg>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#f3f1f7",
            letterSpacing: -1,
          }}
        >
          Kiro Idea Vault
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 28,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 6,
            color: "#ff5fa8",
          }}
        >
          Kiroverse Week 5
        </div>
        <div
          style={{
            marginTop: 22,
            fontSize: 26,
            color: "rgba(243,241,247,0.75)",
          }}
        >
          Pull for your next project idea.
        </div>
      </div>
    ),
    { ...size },
  );
}
