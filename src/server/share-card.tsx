import type { ChecklistItemView } from "@/types/domain";
import { identiconCells } from "@/lib/identicon";

/**
 * Both cards render at 1.5x their "logical" 600x750 design size. Satori (via
 * `next/og`'s `ImageResponse`) has no separate device-pixel-ratio knob - the
 * JSX's pixel values *are* the output pixels - so oversampling means scaling
 * every literal dimension. `s()` does that scaling; every pixel value below
 * should go through it rather than being a bare number.
 */
const SCALE = 1.5;
const s = (px: number) => Math.round(px * SCALE);

const CARD_WIDTH = s(600);
const CARD_HEIGHT = s(750);

/**
 * A checkmark drawn as a stroked path rather than the "✓" glyph: Satori
 * falls back to a font with no glyph for U+2713 when no custom font is
 * registered, which rendered as a tofu box in place of every checked item.
 * A vector path always renders.
 */
function Check({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "flex" }}>
      <path
        d="M5 13l5 5L20 7"
        stroke={color}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * The share card's visual, as plain JSX for Satori (`next/og`'s
 * `ImageResponse`). Kept isolated from the sheet/preview UI: Satori only
 * supports a constrained subset of CSS (flexbox layout, no `gap` on some
 * versions, no CSS variables), so this tree uses literal colors rather
 * than the app's Tailwind tokens.
 */
export function ShareCard({
  name,
  color,
  avatarSeed,
  dayIndex,
  durationDays,
  doneToday,
  itemCount,
  streak,
  items,
  checkedItemIds,
}: {
  name: string;
  color: string;
  avatarSeed: string;
  dayIndex: number;
  durationDays: number;
  doneToday: number;
  itemCount: number;
  streak: number;
  items: ChecklistItemView[];
  checkedItemIds: Set<string>;
}) {
  const cells = identiconCells(avatarSeed);

  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        display: "flex",
        flexDirection: "column",
        background: "#0d0e0b",
        padding: `${s(40)}px ${s(38)}px`,
        fontFamily: "Figtree",
        color: "#f4f1e6",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: s(40),
              height: s(40),
              borderRadius: 999,
              background: "#f4f1e6",
              display: "flex",
              marginRight: s(12),
              overflow: "hidden",
            }}
          >
            <svg viewBox="0 0 7 7" width={s(40)} height={s(40)}>
              {cells.map((row, rowIndex) =>
                row.map(
                  (filled, colIndex) =>
                    filled && (
                      <rect
                        key={`${rowIndex}-${colIndex}`}
                        x={colIndex}
                        y={rowIndex}
                        width={1}
                        height={1}
                        fill={color}
                      />
                    ),
                ),
              )}
            </svg>
          </div>
          <span
            style={{
              fontSize: s(18),
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {name}
          </span>
        </div>
        <span style={{ fontSize: s(16), fontWeight: 800, letterSpacing: 3, color: "#6d7361" }}>
          DAY {dayIndex}/{durationDays}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", marginTop: s(36) }}>
        <span style={{ fontSize: s(128), lineHeight: 1, color: "#f4f1e6", fontWeight: 700 }}>
          {doneToday}
        </span>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: s(18),
            paddingBottom: s(10),
          }}
        >
          <span style={{ fontSize: s(38), color: "#8fa96a", fontWeight: 700 }}>of {itemCount}</span>
          <span style={{ fontSize: s(16), fontWeight: 700, letterSpacing: 2, color: "#6d7361" }}>
            DONE TODAY
          </span>
        </div>
      </div>

      <div style={{ display: "flex", marginTop: s(28) }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              flex: 1,
              height: s(10),
              borderRadius: 999,
              marginRight: s(6),
              background: checkedItemIds.has(item.id) ? "#8fa96a" : "rgba(244,241,230,0.14)",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: s(26) }}>
        {items.map((item) => {
          const done = checkedItemIds.has(item.id);
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: `${s(10)}px ${s(14)}px`,
                borderRadius: s(12),
                marginBottom: s(6),
                background: done ? "#8fa96a" : "transparent",
              }}
            >
              {done ? (
                <Check size={s(18)} color="#0d0e0b" />
              ) : (
                <span style={{ display: "flex", width: s(18) }} />
              )}
              <span
                style={{
                  display: "flex",
                  marginLeft: s(10),
                  fontSize: s(20),
                  fontWeight: 800,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: done ? "#0d0e0b" : "#5d6350",
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: "auto",
          paddingTop: s(20),
          borderTop: "1px solid rgba(244,241,230,0.12)",
        }}
      >
        <span style={{ fontSize: s(20), fontWeight: 800, letterSpacing: 1, color: "#eda061" }}>
          {"▲ "}
          {streak} DAY STREAK
        </span>
      </div>
    </div>
  );
}

export const SHARE_CARD_SIZE = { width: CARD_WIDTH, height: CARD_HEIGHT };
