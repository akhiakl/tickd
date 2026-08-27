import { cn } from "@/lib/utils";
import { identiconCells } from "@/lib/identicon";

const GRID_SIZE = 7;

type AvatarProps = {
  name: string;
  color: string;
  seed: string;
  size?: number;
  className?: string;
};

/**
 * A circular identicon: a symmetric pattern (from `seed`) in `color` on a
 * neutral background, with the person's first initial in a small badge at
 * the center - a person can be told apart from a same-colored, same-shaped
 * pattern at a glance (rare, but two members can land close by chance on a
 * small grid) even before the pattern itself registers. The pattern is
 * still what's random per person on join, not derived from `name` - two
 * members sharing a name (or initial) still look different overall, the
 * initial alone was never going to guarantee that.
 */
export function Avatar({ name, color, seed, size = 36, className }: AvatarProps) {
  const cells = identiconCells(seed, GRID_SIZE);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const center = GRID_SIZE / 2;

  return (
    <span
      className={cn(
        "bg-surface-2 flex flex-none items-center justify-center overflow-hidden rounded-full",
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={name}
    >
      <svg viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`} width={size} height={size} aria-hidden="true">
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
        {/* The badge behind the initial keeps it legible over whichever
            pattern cells happen to land underneath it, rather than relying
            on the letter's own fill to contrast against both the pattern
            color and the bare background. */}
        <circle cx={center} cy={center} r={center * 0.46} fill="var(--color-surface-2)" />
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={GRID_SIZE * 0.34}
          fontWeight={800}
          fill={color}
        >
          {initial}
        </text>
      </svg>
    </span>
  );
}
