import type { ChecklistItemView } from "@/types/domain";

/** See the matching comment in `share-card.tsx` - same oversampling approach. */
const SCALE = 1.5;
const s = (px: number) => Math.round(px * SCALE);

const CARD_WIDTH = s(600);
const CARD_HEIGHT = s(880);

const ORANGE = "#e8632c";
const CREAM = "#f6f2e6";
const LIME = "#cddc4e";
const GREEN = "#35c46a";
const INK = "#0d0e0b";

function Check({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "flex" }}>
      <path
        d="M4 13l5 6L20 6"
        stroke={GREEN}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * A punchier alternate to `ShareCard` - bold outlined title, a two-tone
 * progress bar, and checkbox-style rows - modeled on the kind of
 * hand-styled challenge-tracker templates people post to Stories. Same
 * Satori constraints as `share-card.tsx` apply (flex layout, literal
 * colors, no CSS variables).
 */
export function ShareCardBold({
  dayIndex,
  durationDays,
  doneToday,
  itemCount,
  totalDone,
  totalPossible,
  items,
  checkedItemIds,
}: {
  dayIndex: number;
  durationDays: number;
  doneToday: number;
  itemCount: number;
  totalDone: number;
  totalPossible: number;
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
        background: INK,
        padding: `${s(36)}px ${s(30)}px`,
        fontFamily: "Figtree",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span
          style={{
            fontSize: s(46),
            fontWeight: 800,
            letterSpacing: 4,
            color: CREAM,
            textTransform: "uppercase",
          }}
        >
          TICKD
        </span>
        <span
          style={{
            fontSize: s(20),
            fontWeight: 800,
            letterSpacing: 6,
            color: ORANGE,
            textTransform: "uppercase",
            marginTop: s(2),
          }}
        >
          CHALLENGE
        </span>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: s(26),
          borderRadius: s(10),
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            background: CREAM,
            color: INK,
            fontSize: s(18),
            fontWeight: 800,
            letterSpacing: 2,
            padding: `${s(12)}px ${s(20)}px`,
          }}
        >
          DAY
        </span>
        <span
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "flex-end",
            background: ORANGE,
            color: INK,
            fontSize: s(20),
            fontWeight: 800,
            letterSpacing: 1,
            padding: `${s(12)}px ${s(20)}px`,
          }}
        >
          {dayIndex}/{durationDays}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: s(24) }}>
        {items.map((item) => {
          const done = checkedItemIds.has(item.id);
          const isSideQuest = item.isSideQuest;
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: s(10),
                borderRadius: s(8),
                overflow: "hidden",
                border: isSideQuest ? "none" : `2px solid ${ORANGE}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: s(44),
                  height: s(44),
                  background: CREAM,
                  flexShrink: 0,
                }}
              >
                {done && <Check size={s(24)} />}
              </div>
              <span
                style={{
                  display: "flex",
                  flex: 1,
                  height: s(44),
                  alignItems: "center",
                  paddingLeft: s(18),
                  background: isSideQuest ? LIME : CREAM,
                  color: isSideQuest ? "#6b7420" : INK,
                  fontSize: s(17),
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
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
          marginTop: "auto",
          borderRadius: s(10),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            background: CREAM,
            padding: `${s(14)}px 0`,
          }}
        >
          <span style={{ fontSize: s(26), fontWeight: 800, color: INK }}>
            {doneToday}/{itemCount}
          </span>
          <span style={{ fontSize: s(13), fontWeight: 800, letterSpacing: 2, color: ORANGE }}>
            TODAY
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            background: ORANGE,
            padding: `${s(14)}px 0`,
          }}
        >
          <span style={{ fontSize: s(26), fontWeight: 800, color: INK }}>
            {totalDone}/{totalPossible}
          </span>
          <span style={{ fontSize: s(13), fontWeight: 800, letterSpacing: 2, color: INK }}>
            TOTAL
          </span>
        </div>
      </div>
    </div>
  );
}

export const SHARE_CARD_BOLD_SIZE = { width: CARD_WIDTH, height: CARD_HEIGHT };
