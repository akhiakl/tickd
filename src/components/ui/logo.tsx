type LogoProps = {
  size?: number;
  className?: string;
};

/**
 * The Tickd mark: five rounded cells stepping down then back up, reading as
 * both a checkmark and a row lifted from the wall grid. The last cell sits
 * in clay - today's square, the one still to earn.
 */
export function Logo({ size = 34, className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label="Tickd"
      className={className}
    >
      <rect x="6" y="25" width="8" height="8" rx="2.6" className="fill-accent" />
      <rect x="14.5" y="33.5" width="8" height="8" rx="2.6" className="fill-accent" />
      <rect x="23" y="25" width="8" height="8" rx="2.6" className="fill-accent" />
      <rect x="31.5" y="16.5" width="8" height="8" rx="2.6" className="fill-accent" />
      <rect x="40" y="8" width="8" height="8" rx="2.6" className="fill-flame" />
    </svg>
  );
}
