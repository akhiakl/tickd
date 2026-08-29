const POT_COLOR = "#8c491a";
const STEM_COLOR = "#55743f";
const LEAF_COLORS = ["#55743f", "#7a8a5e", "#8fa073"];

const STAGES = [
  { min: 0, label: "Freshly planted", leaves: 0 },
  { min: 1, label: "Sprouting", leaves: 1 },
  { min: 3, label: "Taking root", leaves: 2 },
  { min: 7, label: "Growing strong", leaves: 3 },
  { min: 14, label: "Thriving", leaves: 4 },
  { min: 30, label: "In full bloom", leaves: 6 },
] as const;

function stageFor(avgStreak: number) {
  let stage: (typeof STAGES)[number] = STAGES[0];
  for (const s of STAGES) if (avgStreak >= s.min) stage = s;
  return stage;
}

/** Leaf positions along the stem, alternating sides and growing outward
 * as there are more of them - purely geometric, no per-leaf data. */
function leafPositions(count: number): { x: number; y: number; side: 1 | -1 }[] {
  return Array.from({ length: count }, (_, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const row = Math.floor(i / 2);
    // FIXED: Changed 58 to 46 so the first row sits above the pot
    return { x: 32 + side * (6 + row * 3), y: 46 - row * 12, side };
  });
}

/**
 * A little plant that grows with the group's collective momentum - the
 * average of every member's own current streak (each computed in their
 * own timezone, same as everywhere else in this app; see
 * src/types/domain.ts's MemberSnapshot comments). Deliberately reuses
 * AVATAR_SWATCHES' earthy green/brown tones rather than picking new
 * mascot colors - they already read as plant-appropriate and stay
 * consistent with the identicons using them everywhere else.
 *
 * Purely decorative and re-derived on every render from data the page
 * already has - nothing about "the mascot" is stored anywhere.
 */
export function GroupMascot({ avgStreak }: { avgStreak: number }) {
  const stage = stageFor(avgStreak);
  const leaves = leafPositions(stage.leaves);
  // FIXED: Changed 58 to 46 here as well to match the leaf coordinates
  const stemTop = stage.leaves === 0 ? 62 : 46 - Math.floor((stage.leaves - 1) / 2) * 12 - 6;

  return (
    <div className="bg-surface mx-4 mt-5.5 flex items-center gap-3.5 rounded-3xl px-4.5 py-3.5 lg:mx-0 lg:mt-0">
      <svg width="56" height="56" viewBox="0 0 64 64" aria-hidden className="flex-none">
        <path d="M20 52 L44 52 L40 62 L24 62 Z" fill={POT_COLOR} />
        {stage.leaves > 0 && (
          <line
            x1="32"
            y1="52"
            x2="32"
            y2={stemTop}
            stroke={STEM_COLOR}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}
        {stage.leaves === 0 && <circle cx="32" cy="49" r="3" fill={STEM_COLOR} />}
        {leaves.map((leaf, i) => (
          <ellipse
            key={i}
            cx={leaf.x}
            cy={leaf.y}
            rx={7}
            ry={4.5}
            fill={LEAF_COLORS[i % LEAF_COLORS.length]}
            transform={`rotate(${leaf.side * 35} ${leaf.x} ${leaf.y})`}
          />
        ))}
      </svg>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold">{stage.label}</div>
        <div className="text-muted mt-0.5 text-[12.5px]">Grows with the group&apos;s momentum</div>
      </div>
    </div>
  );
}
