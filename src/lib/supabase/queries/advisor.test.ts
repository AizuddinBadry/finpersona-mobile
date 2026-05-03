import { describe, it, expect } from 'vitest';
import { shapeAdvisor, type AdvisorMessageRow, type ContentBlock } from './advisor';
import { advisorMock } from '@/mocks/seed';

function row(
  id: string,
  role: 'user' | 'assistant',
  content_text: string,
  content_blocks: ContentBlock[] | null = null,
): AdvisorMessageRow {
  return {
    id,
    user_id: 'u1',
    role,
    persona: role === 'assistant' ? 'coach' : null,
    content_text,
    content_blocks,
    created_at: '2026-05-01T00:00:00Z',
  };
}

describe('shapeAdvisor — empty input', () => {
  it('falls back to advisorMock when there are no rows', () => {
    expect(shapeAdvisor([])).toEqual(advisorMock);
  });
});

describe('shapeAdvisor — greeting + plain text', () => {
  it('hoists the first assistant text into greeting and keeps follow-up turns as messages', () => {
    const result = shapeAdvisor([
      row('1', 'assistant', 'Hello, I pulled your spending.'),
      row('2', 'user', 'Show me dining.'),
      row('3', 'assistant', 'Dining is up 38%.'),
    ]);
    expect(result.greeting).toBe('Hello, I pulled your spending.');
    expect(result.messages).toEqual([
      { kind: 'text', from: 'user', text: 'Show me dining.' },
      { kind: 'text', from: 'ai', text: 'Dining is up 38%.' },
    ]);
  });
});

describe('shapeAdvisor — mobile-shape chart blocks', () => {
  it('passes mobile chart fields through unchanged', () => {
    const result = shapeAdvisor([
      row('a', 'assistant', 'Greeting'),
      row('b', 'assistant', 'Here is your dining trend.', [
        {
          type: 'chart',
          label: '30-day · Dining',
          valueRm: 666,
          deltaPct: 38,
          points: [40, 38, 42, 30, 12, 8],
          axis: ['30 Mar', '14 Apr', '28 Apr'],
        },
      ]),
    ]);
    expect(result.chart).toEqual({
      label: '30-day · Dining',
      valueRm: 666,
      deltaPct: 38,
      points: [40, 38, 42, 30, 12, 8],
      axis: ['30 Mar', '14 Apr', '28 Apr'],
    });
    expect(result.messages.some((m) => m.kind === 'chart')).toBe(true);
  });
});

describe('shapeAdvisor — server-shape chart blocks', () => {
  it('projects server {x,y}[] points down to numeric points + sampled axis', () => {
    const result = shapeAdvisor([
      row('a', 'assistant', 'Greeting'),
      row('b', 'assistant', 'Spending by month.', [
        {
          type: 'chart',
          metric: 'monthly_spend',
          points: [
            { x: 'Jan', y: 100 },
            { x: 'Feb', y: 150 },
            { x: 'Mar', y: 175 },
            { x: 'Apr', y: 220 },
          ],
        },
      ]),
    ]);
    expect(result.chart.points).toEqual([100, 150, 175, 220]);
    expect(result.chart.label).toBe('monthly_spend');
    // valueRm uses the latest sample.
    expect(result.chart.valueRm).toBe(220);
    // No MoM delta in server shape.
    expect(result.chart.deltaPct).toBe(0);
    // 4-point axis is sampled to first/mid/last (mid = floor(4/2) = index 2).
    expect(result.chart.axis).toEqual(['Jan', 'Mar', 'Apr']);
  });

  it('keeps the full axis when there are 3 or fewer points', () => {
    const result = shapeAdvisor([
      row('a', 'assistant', 'Greeting'),
      row('b', 'assistant', 'Tiny chart.', [
        {
          type: 'chart',
          metric: 'tiny',
          points: [
            { x: 'Q1', y: 1 },
            { x: 'Q2', y: 2 },
          ],
        },
      ]),
    ]);
    expect(result.chart.axis).toEqual(['Q1', 'Q2']);
    expect(result.chart.points).toEqual([1, 2]);
  });
});

describe('shapeAdvisor — mobile-shape recs blocks', () => {
  it('preserves explicit subtitle + icon and synthesizes ids when missing', () => {
    const result = shapeAdvisor([
      row('a', 'assistant', 'Greeting'),
      row('b', 'assistant', 'Top three:', [
        {
          type: 'recommendations',
          items: [
            { title: 'Cap delivery', subtitle: 'saves RM180/mo', icon: 'food' },
            { id: 'r2', title: 'Move streaming', subtitle: 'saves RM42/mo', icon: 'gift' },
          ],
        },
      ]),
    ]);
    expect(result.recs).toEqual([
      { id: 'b-0', title: 'Cap delivery', subtitle: 'saves RM180/mo', icon: 'food' },
      { id: 'r2', title: 'Move streaming', subtitle: 'saves RM42/mo', icon: 'gift' },
    ]);
  });
});

describe('shapeAdvisor — server-shape recs blocks', () => {
  it('uses `body` as subtitle when items lack `subtitle`, and falls icons back to receipt', () => {
    const result = shapeAdvisor([
      row('a', 'assistant', 'Greeting'),
      row('b', 'assistant', 'Two ways to save:', [
        {
          type: 'recommendations',
          items: [
            {
              title: 'Open EPF i-Saraan',
              body: 'Voluntary EPF contributions get matched at 15% up to RM500.',
              action: { label: 'Open', route: '/savings' },
            },
            { title: 'Switch to family plan', body: 'Two streaming subs.' },
          ],
        },
      ]),
    ]);
    expect(result.recs).toEqual([
      {
        id: 'b-0',
        title: 'Open EPF i-Saraan',
        subtitle: 'Voluntary EPF contributions get matched at 15% up to RM500.',
        icon: 'receipt',
      },
      {
        id: 'b-1',
        title: 'Switch to family plan',
        subtitle: 'Two streaming subs.',
        icon: 'receipt',
      },
    ]);
  });
});

describe('shapeAdvisor — mixed shapes in one history', () => {
  it('handles a server chart followed by a mobile recs row in the same thread', () => {
    const result = shapeAdvisor([
      row('a', 'assistant', 'Greeting'),
      row('b', 'user', 'How am I doing?'),
      row('c', 'assistant', 'Trend over the last few months.', [
        {
          type: 'chart',
          metric: 'monthly_spend',
          points: [
            { x: 'Jan', y: 100 },
            { x: 'Feb', y: 200 },
          ],
        },
      ]),
      row('d', 'assistant', 'Where to trim:', [
        {
          type: 'recommendations',
          items: [{ title: 'Cancel one delivery', body: 'Save RM 90/mo.' }],
        },
      ]),
    ]);
    expect(result.chart.points).toEqual([100, 200]);
    expect(result.chart.label).toBe('monthly_spend');
    expect(result.recs).toEqual([
      {
        id: 'd-0',
        title: 'Cancel one delivery',
        subtitle: 'Save RM 90/mo.',
        icon: 'receipt',
      },
    ]);
    // The recs row's content_text becomes the recs marker intro.
    const recsMarker = result.messages.find((m) => m.kind === 'recs');
    expect(recsMarker).toBeDefined();
    if (recsMarker?.kind === 'recs') {
      expect(recsMarker.text).toBe('Where to trim:');
    }
  });
});
