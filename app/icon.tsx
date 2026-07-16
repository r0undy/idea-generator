import { ImageResponse } from "next/og";

/**
 * app/icon.tsx
 *
 * Generates the favicon from the Kiro ghost mascot mark (the same glyph as
 * components/brand/KiroGhost.tsx), so the browser tab icon matches the
 * in-app brand mark instead of the default Next.js icon. Rendered on the
 * app's dark background with the brand pink body, matching header chrome.
 */

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0a10",
          borderRadius: 7,
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
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
          <ellipse cx="39" cy="46" rx="5" ry="6.5" fill="#1a1524" />
          <ellipse cx="61" cy="46" rx="5" ry="6.5" fill="#1a1524" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
