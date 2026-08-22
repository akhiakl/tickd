import type { ChecklistItemView } from "@/types/domain";

const CARD_WIDTH = 600;
const CARD_HEIGHT = 750;

/**
 * The share card's visual, as plain JSX for Satori (`next/og`'s
 * `ImageResponse`). Kept isolated from the sheet/preview UI: Satori only
 * supports a constrained subset of CSS (flexbox layout, no `gap` on some
 * versions, no CSS variables), so this tree uses literal colors rather
 * than the app's Tailwind tokens.
 */
export function ShareCard({
  name,
  initial,
  color,
  dayIndex,
  durationDays,
  doneToday,
  itemCount,
  streak,
  items,
  checkedItemIds,
}: {
  name: string;
  initial: string;
  color: string;
  dayIndex: number;
  durationDays: number;
  doneToday: number;
  itemCount: number;
  streak: number;
  items: ChecklistItemView[];
  checkedItemIds: Set<string>;
}) {
  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        display: "flex",
        flexDirection: "column",
        background: "#0d0e0b",
        padding: "40px 38px",
        fontFamily: "Figtree",
        color: "#f4f1e6",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: color,
              color: "#0d0e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              marginRight: 12,
            }}
          >
            {initial}
          </div>
          <span
            style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}
          >
            {name}
          </span>
        </div>
        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 3, color: "#6d7361" }}>
          DAY {dayIndex}/{durationDays}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", marginTop: 36 }}>
        <span style={{ fontSize: 128, lineHeight: 1, color: "#f4f1e6", fontWeight: 700 }}>
          {doneToday}
        </span>
        <div
          style={{ display: "flex", flexDirection: "column", marginLeft: 18, paddingBottom: 10 }}
        >
          <span style={{ fontSize: 38, color: "#8fa96a", fontWeight: 700 }}>of {itemCount}</span>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 2, color: "#6d7361" }}>
            DONE TODAY
          </span>
        </div>
      </div>

      <div style={{ display: "flex", marginTop: 28 }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              flex: 1,
              height: 10,
              borderRadius: 999,
              marginRight: 6,
              background: checkedItemIds.has(item.id) ? "#8fa96a" : "rgba(244,241,230,0.14)",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 26 }}>
        {items.map((item) => {
          const done = checkedItemIds.has(item.id);
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: 12,
                marginBottom: 6,
                background: done ? "#8fa96a" : "transparent",
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: done ? "#0d0e0b" : "#5d6350",
                }}
              >
                {done ? "✓ " : "- "}
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
          paddingTop: 20,
          borderTop: "1px solid rgba(244,241,230,0.12)",
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1, color: "#eda061" }}>
          {"▲ "}
          {streak} DAY STREAK
        </span>
      </div>
    </div>
  );
}

export const SHARE_CARD_SIZE = { width: CARD_WIDTH, height: CARD_HEIGHT };
