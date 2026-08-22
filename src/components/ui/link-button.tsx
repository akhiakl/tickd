import Link from "next/link";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { buttonVariants } from "./button";
import { cn } from "@/lib/utils";

type LinkButtonProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants> & {
    children: ReactNode;
    className?: string;
  };

/** A `<Link>` styled as a button, for primary navigation CTAs. */
export function LinkButton({ variant, size, className, children, ...props }: LinkButtonProps) {
  return (
    <Link className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </Link>
  );
}
