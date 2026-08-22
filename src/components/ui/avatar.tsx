import { cn } from "@/lib/utils";
import { initialOf } from "@/lib/utils";

type AvatarProps = {
  name: string;
  color: string;
  size?: number;
  className?: string;
};

/** A solid-color circle with the member's initial, sized in pixels. */
export function Avatar({ name, color, size = 36, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "font-heading text-on-panel flex flex-none items-center justify-center rounded-full",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {initialOf(name)}
    </span>
  );
}
