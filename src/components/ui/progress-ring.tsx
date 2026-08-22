type ProgressRingProps = {
  done: number;
  total: number;
  size?: number;
};

/** A conic-gradient ring around a solid center showing "done / total". */
export function ProgressRing({ done, total, size = 78 }: ProgressRingProps) {
  const degrees = total > 0 ? (done / total) * 360 : 0;
  const innerSize = size - 16;
  return (
    <div
      data-testid="progress-ring"
      className="flex flex-none items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--color-flame-light) ${degrees}deg, rgba(246, 241, 230, 0.16) 0deg)`,
      }}
    >
      <div
        className="bg-panel flex flex-col items-center justify-center rounded-full leading-none"
        style={{ width: innerSize, height: innerSize }}
      >
        <span className="font-heading text-on-panel text-[22px]">{done}</span>
        <span className="text-panel-soft text-[9px] tracking-[0.1em]">OF {total}</span>
      </div>
    </div>
  );
}
