import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export const buttonVariants = cva(
  "inline-flex w-full items-center justify-center gap-2 rounded-full font-heading text-[17px] transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-on-panel shadow-[0_6px_16px_-2px_rgba(85,116,63,0.35)] hover:bg-accent-d",
        outline: "border-[1.5px] border-text/20 bg-transparent text-text hover:bg-text/[0.06]",
        ghost: "bg-transparent text-muted hover:text-text",
      },
      size: {
        default: "px-5 py-[17px]",
        sm: "px-4 py-3 text-[15px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
