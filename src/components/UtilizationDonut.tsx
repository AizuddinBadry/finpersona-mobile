/**
 * UtilizationDonut — pure-SVG two-tone donut for the Insights Claimable
 * tab. Each segment's arc length is sized by its `cap`; within the segment
 * the `claimed` portion uses solid color and the headroom is a 25%-opacity
 * tail so users see "what you've claimed" against "what's still available"
 * in one ring.
 *
 * Same SVG-circle stroke-dasharray pattern as DonutRing — no chart library,
 * no animation. Each segment renders 1–2 <circle> elements stamped with
 * data-segment / data-arc-len so the arc math is testable from the DOM.
 */

type Segment = {
  code: string;
  color: string;
  cap: number;
  claimed: number;
};

export type UtilizationDonutProps = {
  segments: Segment[];
  centerLabel: string;
  size?: number;
  strokeWidth?: number;
};

const FADED_OPACITY = 0.25;
// 1px gap between segments — subtracted from each segment's stroke-dasharray
// span so adjacent solid colors don't bleed into each other.
const SEGMENT_GAP_PX = 1;

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function splitCenterLabel(label: string): { top: string; bottom: string | null } {
  const idx = label.indexOf(' of ');
  if (idx < 0) return { top: label, bottom: null };
  return {
    top: label.slice(0, idx),
    bottom: `of ${label.slice(idx + ' of '.length)}`,
  };
}

export function UtilizationDonut({
  segments,
  centerLabel,
  size = 200,
  strokeWidth = 28,
}: UtilizationDonutProps) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  // Filter out cap === 0 entries (the synthetic Other-claimable bucket).
  const drawable = segments.filter((s) => s.cap > 0);
  const totalCap = drawable.reduce((s, x) => s + x.cap, 0);
  const { top, bottom } = splitCenterLabel(centerLabel);

  // Pre-compute each segment's start offset (in stroke length units) so we
  // can position both the solid and faded arcs without rotating the SVG.
  let cursor = 0;
  const segmentDraws: Array<{
    seg: Segment;
    offset: number;
    segmentLen: number;
    claimedLen: number;
    headroomLen: number;
  }> = [];
  for (const seg of drawable) {
    const rawLen = (seg.cap / totalCap) * c;
    // Reserve a 1px gap on the trailing edge of every segment.
    const segmentLen = Math.max(rawLen - SEGMENT_GAP_PX, 0);
    const claimedLen = clamp01(seg.claimed / seg.cap) * segmentLen;
    const headroomLen = Math.max(segmentLen - claimedLen, 0);
    segmentDraws.push({
      seg,
      offset: cursor,
      segmentLen,
      claimedLen,
      headroomLen,
    });
    cursor += rawLen;
  }

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        // Rotate -90deg so segment 0 starts at the 12 o'clock position,
        // matching DonutRing.tsx's foreground stroke convention.
        style={{ transform: 'rotate(-90deg)' }}
      >
        {totalCap === 0 ? (
          <circle
            data-fallback
            cx={cx}
            cy={cy}
            r={r}
            stroke="rgba(160,160,182,0.25)"
            strokeWidth={strokeWidth}
            fill="none"
          />
        ) : (
          segmentDraws.map(({ seg, offset, segmentLen, claimedLen, headroomLen }) => {
            const out: JSX.Element[] = [];
            // Solid claimed arc (omitted when claimed === 0).
            if (claimedLen > 0) {
              out.push(
                <circle
                  key={`${seg.code}-solid`}
                  data-segment={seg.code}
                  data-arc-len={claimedLen}
                  cx={cx}
                  cy={cy}
                  r={r}
                  stroke={seg.color}
                  strokeOpacity={1}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${claimedLen} ${c - claimedLen}`}
                  strokeDashoffset={-offset}
                />,
              );
            }
            // Faded headroom arc — sits immediately after the claimed arc.
            if (headroomLen > 0) {
              out.push(
                <circle
                  key={`${seg.code}-faded`}
                  data-segment={seg.code}
                  data-arc-len={headroomLen}
                  cx={cx}
                  cy={cy}
                  r={r}
                  stroke={seg.color}
                  strokeOpacity={FADED_OPACITY}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${headroomLen} ${c - headroomLen}`}
                  strokeDashoffset={-(offset + claimedLen)}
                />,
              );
            }
            return out;
          })
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 18, lineHeight: 1.15 }}>{top}</div>
        {bottom !== null && (
          <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.2, marginTop: 2 }}>
            {bottom}
          </div>
        )}
      </div>
    </div>
  );
}
