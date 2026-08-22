import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export function IconButton({
  className,
  bordered = true,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { bordered?: boolean }) {
  return (
    <button
      className={cn(
        "hover:bg-text/[0.06] flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-transparent transition-colors",
        bordered && "border-text/[0.16] border-[1.5px]",
        className,
      )}
      {...props}
    />
  );
}
