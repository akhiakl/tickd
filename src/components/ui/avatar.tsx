import { cn } from "@/lib/utils";
import { identiconCells } from "@/lib/identicon";

type AvatarProps = {
  name: string;
  color: string;
  seed: string;
  size?: number;
  className?: string;
};

/**
 * A circular identicon: a symmetric pattern (from `seed`) in `color` on a
 * neutral background. Random per person on join, not derived from `name` -
 * two members can share a name (or initial) and still look different at a
 * glance, which a color+initial avatar couldn't guarantee.
 */
export function Avatar({ name, color, seed, size = 36, className }: AvatarProps) {
  const cells = identiconCells(seed);

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
      <svg viewBox="0 0 5 5" width={size} height={size} aria-hidden="true">
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
    </span>
  );
}
