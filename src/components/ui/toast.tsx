/** Ephemeral pill message anchored above the bottom nav. Render conditionally by message. */
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="animate-toast-in bg-panel text-on-panel absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full px-5 py-[11px] text-[13.5px] font-semibold whitespace-nowrap shadow-lg"
    >
      {message}
    </div>
  );
}
