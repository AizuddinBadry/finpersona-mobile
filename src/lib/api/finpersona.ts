/**
 * Thin client for the finpersona web app's existing Next.js API routes.
 * The mobile app reuses /api/upload and /api/extract so OCR + storage logic
 * stays in one place (server-side, with ANTHROPIC_API_KEY and B2 credentials
 * out of the mobile bundle).
 *
 * Auth: we forward the user's Supabase access_token as a Bearer header so
 * the moment the web app adds JWT verification on these routes, mobile is
 * already compliant. Today the routes don't validate it, but we still pass
 * userId in the upload body to match the existing contract.
 *
 * CORS: the web app must allow the mobile origin (capacitor://localhost on
 * iOS, http://localhost on Android, plus the dev preview origin) on these
 * routes. That change lives in the finpersona repo.
 */
import { getEnv } from '@/lib/env';
import { supabase } from '@/lib/supabase/client';

export type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export type UploadResult = {
  url: string;
  fileId: string;
  fileName: string;
};

/**
 * The web app's ExtractedReceiptData mirror — keeping a local copy lets the
 * mobile build stay independent of the web app's TypeScript paths.
 */
export type ExtractedReceiptData = {
  merchant: string;
  date: string; // YYYY-MM-DD
  total: number;
  currency: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  suggested_category: string;
  purchase_type?: string;
  category_confidence: number;
  reasoning: string;
  is_eligible: boolean;
  eligibility_explanation: string;
  tax_relief_rules: string[];
  receipt_number?: string;
  store_location?: string;
  store_address?: string;
  store_chain?: string;
  purchase_time?: string;
  payment_method?: string;
};

export type ExtractResult =
  | { success: true; data: ExtractedReceiptData }
  | { success: false; error: string };

/**
 * Mirror of the web app's AdvisorResponse blocks. The web route writes these
 * directly to advisor_messages.content_blocks (JSONB), so the mobile read
 * path will see this shape on subsequent fetches.
 */
export type AdvisorChartBlock = {
  type: 'chart';
  metric: string;
  points: { x: string; y: number }[];
};

export type AdvisorRecommendationsBlock = {
  type: 'recommendations';
  items: {
    title: string;
    body: string;
    action?: { label: string; route: string };
  }[];
};

export type AdvisorContentBlock =
  | AdvisorChartBlock
  | AdvisorRecommendationsBlock;

export type AdvisorChatResponse = {
  /** advisor_messages row id of the persisted assistant turn. */
  id: string;
  text: string;
  blocks: AdvisorContentBlock[];
  suggestionChips: string[];
};

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Upload a base64-encoded image to /api/upload, which writes to Backblaze B2
 * and returns the public URL + file id. Caller passes userId so the server
 * can scope the file path under the user (matches the existing contract).
 */
export async function uploadReceipt(args: {
  imageBase64: string;
  userId: string;
  mediaType?: MediaType;
  fetchImpl?: typeof fetch;
}): Promise<UploadResult> {
  const { imageBase64, userId, mediaType = 'image/jpeg', fetchImpl = fetch } = args;
  const { API_BASE_URL } = getEnv();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
  };
  const res = await fetchImpl(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      image: imageBase64,
      userId,
      contentType: mediaType,
    }),
  });
  const json = (await res.json()) as
    | { success: true; url: string; fileId: string; fileName: string }
    | { success: false; error: string };
  if (!res.ok || !json.success) {
    throw new Error(
      'error' in json ? json.error : `Upload failed (${res.status})`,
    );
  }
  return { url: json.url, fileId: json.fileId, fileName: json.fileName };
}

/**
 * Send a base64 image to /api/extract and return Claude's structured
 * extraction. The web app figures out the tax year from the receipt date
 * if we don't pass one, so we leave taxYear undefined to let the server
 * decide.
 */
export async function extractReceipt(args: {
  imageBase64: string;
  mediaType?: MediaType;
  taxYear?: number;
  isBusinessAccount?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<ExtractedReceiptData> {
  const {
    imageBase64,
    mediaType = 'image/jpeg',
    taxYear,
    isBusinessAccount = false,
    fetchImpl = fetch,
  } = args;
  const { API_BASE_URL } = getEnv();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
  };
  const res = await fetchImpl(`${API_BASE_URL}/api/extract`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      image: imageBase64,
      mediaType,
      taxYear,
      isBusinessAccount,
    }),
  });
  const json = (await res.json()) as ExtractResult;
  if (!res.ok || !json.success) {
    throw new Error(
      'error' in json && json.error
        ? json.error
        : `Extraction failed (${res.status})`,
    );
  }
  return json.data;
}

/**
 * Send a chat message to /api/advisor/chat. The server runs the LLM round-
 * trip with tool use, persists both the user turn and the assistant turn to
 * advisor_messages, and returns the saved assistant row id plus the
 * structured response. Caller is responsible for invalidating the
 * ['advisor', userId] cache so the read path picks up the new rows.
 */
export async function postAdvisorMessage(args: {
  message: string;
  fetchImpl?: typeof fetch;
}): Promise<AdvisorChatResponse> {
  const { message, fetchImpl = fetch } = args;
  const { API_BASE_URL } = getEnv();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
  };
  const res = await fetchImpl(`${API_BASE_URL}/api/advisor/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message }),
  });
  const json = (await res.json()) as
    | (AdvisorChatResponse & { error?: never })
    | { error: string; id?: never };
  if (!res.ok || 'error' in json) {
    throw new Error(
      'error' in json && json.error
        ? json.error
        : `Advisor request failed (${res.status})`,
    );
  }
  return {
    id: json.id,
    text: typeof json.text === 'string' ? json.text : '',
    blocks: Array.isArray(json.blocks) ? json.blocks : [],
    suggestionChips: Array.isArray(json.suggestionChips)
      ? json.suggestionChips
      : [],
  };
}
