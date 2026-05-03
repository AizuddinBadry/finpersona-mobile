/**
 * Advisor screen query — pulls the user's chat history from advisor_messages
 * and reshapes it into the AdvisorMock shape Phase 2's Advisor.tsx renders.
 *
 * RLS scopes rows to the authenticated user (auth.uid() = user_id), and the
 * table has no UPDATE/DELETE policies — history is immutable. Phase 3-G is
 * read-only; the composer "Send" UI stays a placeholder until the assistant
 * write/stream pipeline is wired in a later phase.
 *
 * AdvisorMessage on the mobile side is a flat sequence of bubbles, but each
 * advisor_messages row can carry multiple structured blocks in content_blocks.
 * We unfold each row into:
 *   1. a text bubble (when content_text is non-empty)
 *   2. one chart placeholder per chart block (the chart payload itself is
 *      hoisted onto AdvisorMock.chart so the screen can render it once — the
 *      mobile mock only supports a single chart card today)
 *   3. one recs marker per recommendations block (populating AdvisorMock.recs
 *      from the block's items array)
 *
 * The greeting bubble in the mock is the first assistant message; subsequent
 * messages live in the messages[] array. Suggestion chips stay on the mock —
 * they are persona-driven UI hints, not stored chat content.
 */
import { supabase } from '@/lib/supabase/client';
import type { CatIconName } from '@/components/CatIcon';
import type { AdvisorMessage, AdvisorMock, AdvisorRec } from '@/mocks/seed';
import { advisorMock } from '@/mocks/seed';

export type AdvisorMessageRow = {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  persona: 'analyst' | 'coach' | 'witty' | null;
  content_text: string;
  content_blocks: ContentBlock[] | null;
  created_at: string;
};

/**
 * advisor_messages.content_blocks accepts two shapes:
 *
 *   "Mobile" shape — used by hand-seeded fixtures and earlier mocks. Numeric
 *   `points`, `valueRm`/`deltaPct` baked in, optional category-icon recs.
 *
 *   "Server" shape — emitted by the web app's runAdvisorAgent (see
 *   finpersona/lib/advisor/types.ts). Chart points are `{x: string, y:
 *   number}[]` and recommendations carry `{title, body, action?}`.
 *
 * shapeAdvisor accepts either and projects them down to the AdvisorMock
 * shape the screen renders. Callers don't need to disambiguate.
 */
export type ContentBlock = ChartBlockMobile | ChartBlockServer | RecsBlockMobile | RecsBlockServer;

type ChartBlockMobile = {
  type: 'chart';
  label?: string;
  metric?: string;
  valueRm?: number;
  deltaPct?: number;
  points: number[];
  axis?: string[];
};

type ChartBlockServer = {
  type: 'chart';
  metric: string;
  points: Array<{ x: string; y: number }>;
};

type RecsBlockMobile = {
  type: 'recommendations';
  items: Array<{
    id?: string;
    title: string;
    subtitle?: string;
    icon?: CatIconName;
  }>;
};

type RecsBlockServer = {
  type: 'recommendations';
  items: Array<{
    title: string;
    body: string;
    action?: { label: string; route: string };
  }>;
};

const HISTORY_LIMIT = 50;
const VALID_CAT_ICONS: ReadonlySet<CatIconName> = new Set<CatIconName>([
  'food',
  'coffee',
  'bag',
  'car',
  'home2',
  'medical',
  'book',
  'transfer',
  'bank',
  'gift',
  'receipt',
  'pulse',
  'flash',
  'star',
]);

function safeIcon(icon: string | undefined): CatIconName {
  if (icon && VALID_CAT_ICONS.has(icon as CatIconName)) return icon as CatIconName;
  return 'receipt';
}

/**
 * Project a chart block (mobile or server shape) onto the AdvisorMock.chart
 * shape the Sparkline renders. Returns null if neither shape's required
 * fields are present, in which case the caller falls back to the seed mock.
 */
function shapeChartBlock(
  block: ChartBlockMobile | ChartBlockServer,
): AdvisorMock['chart'] | null {
  // Server shape: points = [{x, y}, ...]. Detect by inspecting the first
  // entry — number[] is the legacy mobile shape.
  const isServerShape =
    Array.isArray(block.points) &&
    block.points.length > 0 &&
    typeof (block.points[0] as { x?: unknown; y?: unknown })?.y === 'number';

  if (isServerShape) {
    const serverPoints = (block as ChartBlockServer).points;
    const ys = serverPoints.map((p) => p.y);
    const xs = serverPoints.map((p) => p.x);
    return {
      label: block.metric ?? advisorMock.chart.label,
      // We don't carry an absolute total or MoM delta in the server shape,
      // so use the latest sample as a proxy and leave delta at 0. The text
      // bubble next to the chart is where the real narrative lives.
      valueRm: ys.at(-1) ?? advisorMock.chart.valueRm,
      deltaPct: 0,
      points: ys,
      // Sample first/middle/last x labels so the axis row stays readable
      // regardless of how many points the server emits.
      axis: sampleAxis(xs),
    };
  }

  // Mobile shape (or empty array — fall back to mock).
  const m = block as ChartBlockMobile;
  if (!Array.isArray(m.points) || m.points.length === 0) return null;
  return {
    label: m.label ?? m.metric ?? advisorMock.chart.label,
    valueRm: m.valueRm ?? advisorMock.chart.valueRm,
    deltaPct: m.deltaPct ?? advisorMock.chart.deltaPct,
    points: m.points,
    axis: m.axis ?? advisorMock.chart.axis,
  };
}

/** Pick first/middle/last from an axis array so the chart caption stays compact. */
function sampleAxis(xs: string[]): string[] {
  if (xs.length <= 3) return xs.slice();
  const mid = Math.floor(xs.length / 2);
  return [xs[0]!, xs[mid]!, xs[xs.length - 1]!];
}

/**
 * Project a recommendations block (mobile or server shape) onto AdvisorRec[].
 * Server items expose `body`; mobile items expose `subtitle`/`icon`. Either
 * works; missing fields fall back to safe defaults.
 */
function shapeRecsItems(
  block: RecsBlockMobile | RecsBlockServer,
  rowId: string,
  startIndex: number,
): AdvisorRec[] {
  return block.items.map((raw, i) => {
    const item = raw as Partial<RecsBlockMobile['items'][number]> &
      Partial<RecsBlockServer['items'][number]>;
    return {
      id: item.id ?? `${rowId}-${startIndex + i}`,
      title: item.title ?? '',
      // server-shape items use `body`; mobile-shape items use `subtitle`.
      subtitle: item.subtitle ?? item.body ?? '',
      icon: safeIcon(item.icon),
    };
  });
}

/**
 * Reshape rows (oldest-first) into the AdvisorMock shape. Caller is
 * responsible for ordering — fetchAdvisor passes ascending by created_at.
 */
export function shapeAdvisor(rows: AdvisorMessageRow[]): AdvisorMock {
  if (rows.length === 0) return advisorMock;

  // Greeting = first assistant message's content_text (if any). The screen
  // renders it as a special opening bubble, so we strip it from messages[].
  let greeting = advisorMock.greeting;
  let greetingConsumedRowId: string | null = null;
  const firstAssistant = rows.find((r) => r.role === 'assistant' && r.content_text.trim().length > 0);
  if (firstAssistant) {
    greeting = firstAssistant.content_text;
    greetingConsumedRowId = firstAssistant.id;
  }

  let chart: AdvisorMock['chart'] = advisorMock.chart;
  let chartFound = false;
  const recs: AdvisorRec[] = [];
  const messages: AdvisorMessage[] = [];

  for (const row of rows) {
    const isGreetingRow = row.id === greetingConsumedRowId;
    const blocks = row.content_blocks ?? [];

    // Text bubble — but skip the assistant row whose text was hoisted into
    // greeting, AND skip if this row's text will be repeated as the recs
    // intro line below.
    const hasRecsBlock = blocks.some((b) => b.type === 'recommendations');
    const skipPlainText = isGreetingRow && blocks.length === 0;
    if (!skipPlainText && row.content_text.trim().length > 0 && !hasRecsBlock && !isGreetingRow) {
      messages.push({
        kind: 'text',
        from: row.role === 'user' ? 'user' : 'ai',
        text: row.content_text,
      });
    }

    for (const block of blocks) {
      if (block.type === 'chart') {
        // Hoist the first chart we find into AdvisorMock.chart and emit a
        // marker into the message stream so the screen renders it inline.
        if (!chartFound) {
          const shaped = shapeChartBlock(block);
          if (shaped) {
            chart = shaped;
            chartFound = true;
          }
        }
        messages.push({ kind: 'chart' });
      } else if (block.type === 'recommendations') {
        recs.push(...shapeRecsItems(block, row.id, recs.length));
        messages.push({
          kind: 'recs',
          // The recs marker carries an intro line that the screen renders
          // above the cards — use this row's content_text if present.
          text: row.content_text || advisorMock.messages.find((m) => m.kind === 'recs')?.text || 'Recommendations:',
        });
      }
    }
  }

  return {
    greeting,
    chart,
    messages,
    recs: recs.length > 0 ? recs : advisorMock.recs,
    // Suggestion chips are persona-driven UI hints, not chat content.
    suggestions: advisorMock.suggestions,
  };
}

export async function fetchAdvisor(userId: string): Promise<AdvisorMock> {
  const { data, error } = await supabase
    .from('advisor_messages')
    .select('id, user_id, role, persona, content_text, content_blocks, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(HISTORY_LIMIT);
  if (error) throw error;

  return shapeAdvisor((data ?? []) as AdvisorMessageRow[]);
}
