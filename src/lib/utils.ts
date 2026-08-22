import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, resolving conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** First letter of a display name, upper-cased, for avatar initials. */
export function initialOf(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

/** Clamp a number between a minimum and maximum (inclusive). */
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
