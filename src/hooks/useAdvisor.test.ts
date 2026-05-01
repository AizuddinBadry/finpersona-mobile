import { describe, it, expect } from 'vitest';
import {
  shapeAdvisor,
  type AdvisorMessageRow,
  type ContentBlock,
} from '@/lib/supabase/queries/advisor';
import { advisorMock } from '@/mocks/seed';

function row(
  overrides: Partial<AdvisorMessageRow> & { id: string; role: 'user' | 'assistant' },
): AdvisorMessageRow {
  return {
    user_id: 'u',
    persona: null,
    content_text: '',
    content_blocks: null,
    created_at: '2026-04-30T10:00:00Z',
    ...overrides,
  };
}

describe('shapeAdvisor', () => {
  it('falls back to advisorMock when there are no rows', () => {
    const out = shapeAdvisor([]);
    expect(out).toBe(advisorMock);
  });

  it('uses the first assistant message as greeting and removes it from messages', () => {
    const rows: AdvisorMessageRow[] = [
      row({ id: 'a1', role: 'assistant', content_text: 'Hello there!' }),
      row({ id: 'u1', role: 'user', content_text: 'Hi' }),
    ];
    const out = shapeAdvisor(rows);
    expect(out.greeting).toBe('Hello there!');
    // The greeting row's text should NOT be repeated as a bubble.
    const aiTextBubbles = out.messages.filter(
      (m) => m.kind === 'text' && m.from === 'ai',
    );
    expect(aiTextBubbles).toHaveLength(0);
    // The user row should still appear.
    expect(
      out.messages.some((m) => m.kind === 'text' && m.from === 'user' && m.text === 'Hi'),
    ).toBe(true);
  });

  it('hoists the first chart block onto AdvisorMock.chart and emits a chart marker', () => {
    const chartBlock: ContentBlock = {
      type: 'chart',
      label: 'Dining trend',
      valueRm: 500,
      deltaPct: 25,
      points: [10, 20, 30],
      axis: ['Mon', 'Tue', 'Wed'],
    };
    const rows: AdvisorMessageRow[] = [
      row({
        id: 'a1',
        role: 'assistant',
        content_text: 'Look at this',
        content_blocks: [chartBlock],
      }),
    ];
    const out = shapeAdvisor(rows);
    expect(out.chart.label).toBe('Dining trend');
    expect(out.chart.valueRm).toBe(500);
    expect(out.chart.deltaPct).toBe(25);
    expect(out.chart.points).toEqual([10, 20, 30]);
    expect(out.messages.some((m) => m.kind === 'chart')).toBe(true);
  });

  it('keeps only the first chart block when multiple are present', () => {
    const c1: ContentBlock = { type: 'chart', label: 'First', points: [1] };
    const c2: ContentBlock = { type: 'chart', label: 'Second', points: [2] };
    const rows: AdvisorMessageRow[] = [
      row({ id: 'a1', role: 'assistant', content_text: 'one', content_blocks: [c1] }),
      row({ id: 'a2', role: 'assistant', content_text: 'two', content_blocks: [c2] }),
    ];
    const out = shapeAdvisor(rows);
    expect(out.chart.label).toBe('First');
    // Two chart markers in stream (one per block emitted).
    expect(out.messages.filter((m) => m.kind === 'chart')).toHaveLength(2);
  });

  it('unfolds recommendations blocks into recs[] and emits a recs marker', () => {
    const recsBlock: ContentBlock = {
      type: 'recommendations',
      items: [
        { id: 'rec1', title: 'Cut dining', subtitle: 'Saves RM 180', icon: 'food' },
        { title: 'Switch plan', subtitle: 'Saves RM 42', icon: 'gift' },
      ],
    };
    const rows: AdvisorMessageRow[] = [
      row({
        id: 'a1',
        role: 'assistant',
        content_text: 'Top picks:',
        content_blocks: [recsBlock],
      }),
    ];
    const out = shapeAdvisor(rows);
    expect(out.recs).toHaveLength(2);
    expect(out.recs[0]).toMatchObject({
      id: 'rec1',
      title: 'Cut dining',
      subtitle: 'Saves RM 180',
      icon: 'food',
    });
    // Item without an id gets a generated one.
    expect(out.recs[1].id).toBe('a1-1');
    // Recs marker uses the row's content_text as the intro line.
    const recsMarker = out.messages.find((m) => m.kind === 'recs');
    expect(recsMarker).toBeDefined();
    expect(recsMarker && 'text' in recsMarker && recsMarker.text).toBe('Top picks:');
  });

  it('coerces unknown icon names onto the safe "receipt" fallback', () => {
    const recsBlock: ContentBlock = {
      type: 'recommendations',
      // @ts-expect-error — testing untrusted JSONB shape
      items: [{ title: 'Weird item', icon: 'not-a-real-icon' }],
    };
    const rows: AdvisorMessageRow[] = [
      row({ id: 'a1', role: 'assistant', content_text: '', content_blocks: [recsBlock] }),
    ];
    const out = shapeAdvisor(rows);
    expect(out.recs[0].icon).toBe('receipt');
  });

  it('emits text bubbles for user and ai roles in order', () => {
    const rows: AdvisorMessageRow[] = [
      row({ id: 'a1', role: 'assistant', content_text: 'greet' }),
      row({ id: 'u1', role: 'user', content_text: 'hello' }),
      row({ id: 'a2', role: 'assistant', content_text: 'hi back' }),
    ];
    const out = shapeAdvisor(rows);
    // greet is greeting, so messages contain user "hello" and ai "hi back".
    expect(out.messages).toEqual([
      { kind: 'text', from: 'user', text: 'hello' },
      { kind: 'text', from: 'ai', text: 'hi back' },
    ]);
  });

  it('does not emit a separate text bubble for a row whose text becomes the recs intro', () => {
    const recsBlock: ContentBlock = {
      type: 'recommendations',
      items: [{ title: 'do it', icon: 'star' }],
    };
    const rows: AdvisorMessageRow[] = [
      row({ id: 'a1', role: 'assistant', content_text: 'first message' }), // greeting
      row({
        id: 'a2',
        role: 'assistant',
        content_text: 'Here are some ideas',
        content_blocks: [recsBlock],
      }),
    ];
    const out = shapeAdvisor(rows);
    // 'Here are some ideas' should appear ONLY as the recs marker text.
    const textBubbles = out.messages.filter((m) => m.kind === 'text');
    expect(textBubbles.find((m) => m.kind === 'text' && m.text === 'Here are some ideas')).toBeUndefined();
    const recsMarker = out.messages.find((m) => m.kind === 'recs');
    expect(recsMarker && 'text' in recsMarker && recsMarker.text).toBe('Here are some ideas');
  });

  it('keeps suggestions on advisorMock (persona-driven UI hints, not stored)', () => {
    const rows: AdvisorMessageRow[] = [
      row({ id: 'a1', role: 'assistant', content_text: 'hey' }),
    ];
    const out = shapeAdvisor(rows);
    expect(out.suggestions).toEqual(advisorMock.suggestions);
  });

  it('falls back to mock recs when no recommendations blocks are present', () => {
    const rows: AdvisorMessageRow[] = [
      row({ id: 'a1', role: 'assistant', content_text: 'just text' }),
    ];
    const out = shapeAdvisor(rows);
    expect(out.recs).toEqual(advisorMock.recs);
  });

  it('falls back to mock chart when no chart blocks are present', () => {
    const rows: AdvisorMessageRow[] = [
      row({ id: 'a1', role: 'assistant', content_text: 'no chart' }),
    ];
    const out = shapeAdvisor(rows);
    expect(out.chart).toEqual(advisorMock.chart);
  });
});
