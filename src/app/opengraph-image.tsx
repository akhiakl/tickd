import { ImageResponse } from "next/og";

export const alt = "Tickd - a shared daily checklist for your group";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The site-wide Open Graph / Twitter Card image, generated with Satori (via
 * `next/og`'s `ImageResponse`) rather than shipped as a static file, so it
 * shares the app's brand colors directly instead of drifting from them.
 * Statically optimized at build time (no Request-time API or dynamic config
 * used here), so this renders once, not per-request.
 *
 * Mirrors the streak-trail motif from `src/app/icon.svg`: squares climbing
 * in size, the accent color giving way to the flame color on the last one.
 * Literal colors throughout, not the app's CSS custom properties - Satori's
 * constrained CSS subset doesn't resolve `var(...)`.
 */
export default function OpengraphImage() {
  const accent = "#9cbd72";
  const flame = "#e79457";
  const cellSizes = [64, 84, 64, 84, 104];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "#14160f",
        padding: "0 90px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 44 }}>
        {cellSizes.map((cellSize, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              width: cellSize,
              height: cellSize,
              borderRadius: 22,
              marginRight: 16,
              background: index === cellSizes.length - 1 ? flame : accent,
            }}
          />
        ))}
      </div>

      <span
        style={{
          display: "flex",
          fontSize: 132,
          fontWeight: 700,
          color: "#f1ece0",
          letterSpacing: -2,
        }}
      >
        Tickd
      </span>
      <span
        style={{
          display: "flex",
          fontSize: 40,
          fontWeight: 600,
          color: "#c7c2b3",
          marginTop: 20,
        }}
      >
        Everyone&apos;s in. Every day.
      </span>
    </div>,
    size,
  );
}
