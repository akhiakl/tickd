"use client";

import { useEffect, useState } from "react";
import { AVATAR_SWATCHES } from "@/lib/constants";

const PIECE_COUNT = 24;
const BURST_MS = 900;

type Piece = {
  id: number;
  color: string;
  dx: number;
  dy: number;
  rotate: number;
  delay: number;
  size: number;
};

function makeBurst(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    // Full radial spray rather than "up and out" - this celebrates
    // something you did (finishing today's list), not a firework you're
    // watching, so it reads as bursting from where your tap landed.
    const angle = (i / PIECE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const distance = 70 + Math.random() * 90;
    return {
      id: i,
      color: AVATAR_SWATCHES[i % AVATAR_SWATCHES.length],
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      rotate: (Math.random() - 0.5) * 720,
      delay: Math.random() * 80,
      size: 6 + Math.random() * 5,
    };
  });
}

/**
 * A one-shot radial confetti burst, centered on wherever this is rendered.
 * Fires whenever `trigger` changes to a new, truthy value - not on mount,
 * so a parent bumping a counter (or toggling a boolean) each time a real
 * celebration-worthy thing happens is the whole API. Unmounts its pieces
 * once the animation finishes rather than leaving inert nodes around.
 *
 * Pure CSS animation (see globals.css's confetti-burst keyframe) - no
 * canvas, no animation library, consistent with this app's existing
 * hand-rolled @keyframes for tick-pop/toast-in/shimmer.
 */
export function Confetti({ trigger }: { trigger: number | string | boolean }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  // The effect's own dependency array is what limits this to firing once
  // per distinct `trigger` value - no manual "have I seen this value
  // before" tracking needed. Both state updates are deferred via
  // setTimeout(0) rather than called synchronously in the effect body, so
  // they run as reactions to trigger changing rather than as part of the
  // render that produced it.
  useEffect(() => {
    if (!trigger) return;
    const burstId = setTimeout(() => setPieces(makeBurst()), 0);
    const clearId = setTimeout(() => setPieces([]), BURST_MS + 100);
    return () => {
      clearTimeout(burstId);
      clearTimeout(clearId);
    };
  }, [trigger]);

  if (pieces.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-40 overflow-visible">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="animate-confetti-burst absolute top-1/2 left-1/2 rounded-[2px]"
          style={
            {
              width: piece.size,
              height: piece.size * 0.6,
              background: piece.color,
              animationDelay: `${piece.delay}ms`,
              "--dx": `${piece.dx}px`,
              "--dy": `${piece.dy}px`,
              "--rotate": `${piece.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
