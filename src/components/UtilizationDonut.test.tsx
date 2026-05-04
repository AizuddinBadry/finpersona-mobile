/**
 * UtilizationDonut tests — verify segment count, proportional arc lengths,
 * two-tone fill (solid + faded), center label split, all-zero-claimed
 * fallback, and the empty (sum cap === 0) fallback ring.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { UtilizationDonut } from './UtilizationDonut';

type Segment = {
  code: string;
  color: string;
  cap: number;
  claimed: number;
};

function getSegmentPaths(container: HTMLElement): SVGCircleElement[] {
  return Array.from(
    container.querySelectorAll<SVGCircleElement>('circle[data-segment]'),
  );
}

describe('UtilizationDonut', () => {
  const baseSegments: Segment[] = [
    { code: 'lifestyle', color: '#D97636', cap: 2500, claimed: 1000 },
    { code: 'medical_health', color: '#1F8B7E', cap: 8000, claimed: 2000 },
    { code: 'sports', color: '#3F7CC8', cap: 500, claimed: 0 },
  ];

  it('renders two paths per segment (solid + faded) and skips zero-cap entries', () => {
    const segments: Segment[] = [
      ...baseSegments,
      // Synthetic Other-claimable bucket: cap === 0 must be skipped.
      { code: 'other-claimable', color: '#A0A0B6', cap: 0, claimed: 50 },
    ];
    const { container } = render(
      <UtilizationDonut segments={segments} centerLabel="RM 3,000 of RM 11,000" />,
    );
    const paths = getSegmentPaths(container);
    // baseSegments has 3 entries: two with claimed > 0 (2 paths each = 4),
    // one with claimed === 0 (1 path = faded only). Zero-cap is skipped.
    expect(paths.length).toBe(5);
  });

  it('arc length per segment is proportional to its cap', () => {
    const { container } = render(
      <UtilizationDonut segments={baseSegments} centerLabel="RM 3,000 of RM 11,000" />,
    );
    // Sum the data-arc-len for each segment code.
    const paths = getSegmentPaths(container);
    const lensByCode = new Map<string, number>();
    for (const p of paths) {
      const code = p.getAttribute('data-segment')!;
      const len = Number(p.getAttribute('data-arc-len'));
      lensByCode.set(code, (lensByCode.get(code) ?? 0) + len);
    }
    const totalCap = baseSegments.reduce((s, c) => s + c.cap, 0);
    const totalLen = [...lensByCode.values()].reduce((s, n) => s + n, 0);
    for (const seg of baseSegments) {
      const len = lensByCode.get(seg.code)!;
      const expected = (seg.cap / totalCap) * totalLen;
      // Allow 0.5px tolerance for the 1px gap subtraction rounding.
      expect(Math.abs(len - expected)).toBeLessThan(2);
    }
  });

  it('renders both a solid and a 25%-opacity faded path for partially-claimed segments', () => {
    const { container } = render(
      <UtilizationDonut segments={baseSegments} centerLabel="RM 3,000 of RM 11,000" />,
    );
    const lifestylePaths = Array.from(
      container.querySelectorAll<SVGCircleElement>('circle[data-segment="lifestyle"]'),
    );
    expect(lifestylePaths.length).toBe(2);
    const opacities = lifestylePaths
      .map((p) => Number(p.getAttribute('stroke-opacity') ?? '1'))
      .sort((a, b) => a - b);
    expect(opacities[0]).toBeCloseTo(0.25, 5);
    expect(opacities[1]).toBeCloseTo(1, 5);
  });

  it('renders the center label split on " of " into two stacked lines', () => {
    const { getByText } = render(
      <UtilizationDonut
        segments={baseSegments}
        centerLabel="RM 4,720 of RM 10,000"
      />,
    );
    expect(getByText('RM 4,720')).toBeInTheDocument();
    expect(getByText('of RM 10,000')).toBeInTheDocument();
  });

  it('all-zero claimed: every segment is faded only — no solid arcs', () => {
    const segments: Segment[] = [
      { code: 'a', color: '#D97636', cap: 1000, claimed: 0 },
      { code: 'b', color: '#1F8B7E', cap: 2000, claimed: 0 },
    ];
    const { container } = render(
      <UtilizationDonut segments={segments} centerLabel="RM 0 of RM 3,000" />,
    );
    const paths = getSegmentPaths(container);
    expect(paths.length).toBe(2);
    for (const p of paths) {
      const opacity = Number(p.getAttribute('stroke-opacity') ?? '1');
      expect(opacity).toBeCloseTo(0.25, 5);
    }
  });

  it('claimed = NaN clamps to 0: only the faded path renders for that segment', () => {
    const segments: Segment[] = [
      { code: 'lifestyle', color: '#D97636', cap: 1000, claimed: Number.NaN },
      { code: 'medical_health', color: '#1F8B7E', cap: 2000, claimed: 500 },
    ];
    const { container } = render(
      <UtilizationDonut segments={segments} centerLabel="RM 500 of RM 3,000" />,
    );
    const lifestylePaths = Array.from(
      container.querySelectorAll<SVGCircleElement>('circle[data-segment="lifestyle"]'),
    );
    expect(lifestylePaths.length).toBe(1);
    const opacity = Number(lifestylePaths[0].getAttribute('stroke-opacity') ?? '1');
    expect(opacity).toBeCloseTo(0.25, 5);
  });

  it('claimed = -50 clamps to 0: only the faded path renders for that segment', () => {
    const segments: Segment[] = [
      { code: 'lifestyle', color: '#D97636', cap: 1000, claimed: -50 },
      { code: 'medical_health', color: '#1F8B7E', cap: 2000, claimed: 500 },
    ];
    const { container } = render(
      <UtilizationDonut segments={segments} centerLabel="RM 500 of RM 3,000" />,
    );
    const lifestylePaths = Array.from(
      container.querySelectorAll<SVGCircleElement>('circle[data-segment="lifestyle"]'),
    );
    expect(lifestylePaths.length).toBe(1);
    const opacity = Number(lifestylePaths[0].getAttribute('stroke-opacity') ?? '1');
    expect(opacity).toBeCloseTo(0.25, 5);
  });

  it('sum(cap) === 0: renders a faded fallback ring + center label, no segment paths', () => {
    const segments: Segment[] = [
      { code: 'other-claimable', color: '#A0A0B6', cap: 0, claimed: 200 },
    ];
    const { container, getByText } = render(
      <UtilizationDonut segments={segments} centerLabel="RM 200 of RM 0" />,
    );
    expect(getSegmentPaths(container).length).toBe(0);
    // Should still render a faded fallback ring.
    const fallback = container.querySelector('circle[data-fallback]');
    expect(fallback).not.toBeNull();
    expect(getByText('RM 200')).toBeInTheDocument();
    expect(getByText('of RM 0')).toBeInTheDocument();
  });
});
