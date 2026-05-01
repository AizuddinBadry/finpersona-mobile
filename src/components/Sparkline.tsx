/**
 * Sparkline — small SVG line chart with optional gradient area fill.
 *
 * Used by the Advisor chart bubble and (later) the Insights mini chart.
 * Points are y-values in SVG coordinate space (0 = top, height = bottom)
 * already mapped by the caller — keeping this dumb avoids duplicating the
 * scale math the mockups already encode.
 */
type Props = {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fillTopOpacity?: number;
  gradientId?: string;
  className?: string;
};

export function Sparkline({
  points,
  width = 240,
  height = 60,
  stroke = '#6E4CE6',
  fillTopOpacity = 0.3,
  gradientId = 'spark',
  className,
}: Props) {
  if (points.length === 0) return null;
  const step = width / (points.length - 1 || 1);
  const linePath = points
    .map((y, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
  const areaPath = `${linePath} L${width.toFixed(2)},${height} L0,${height} Z`;
  const uid = `${gradientId}-${Math.round(width)}x${Math.round(height)}`;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity={fillTopOpacity} />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${uid})`} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}
