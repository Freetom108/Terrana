import { t } from '../i18n/i18n';
import type { ExtractedData } from '../../types/import';
import { EXTRACTION_PROMPT } from './prompt';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 1000;
const MAX_USER_TEXT_LENGTH = 3000;
const ANTHROPIC_VERSION = '2023-06-01';

export type ExtractProductResult =
  | { success: true; data: ExtractedData }
  | { success: false; error: string };

type RawExtracted = {
  productName?: string | null;
  brand?: string | null;
  /** Some model responses use "source" for retailer / website — treated like brand */
  source?: string | null;
  category?: string | null;
  usage?: string[] | null;
  notes?: string | null;
  tags?: string[] | null;
};

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fence ? fence[1].trim() : trimmed;
}

function sanitizeUserFacingError(message: string): string {
  const stripped = message
    .replace(/model:\s*[^\n\r]+/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^\s*,\s*|\s*,\s*$/g, '')
    .trim();
  return stripped.length > 0 ? stripped : (t('extractor.errorGeneric') as string);
}

/** User-facing HTTP / API failure line (localized). */
function formatHttpApiError(status: number, apiMessage: string): string {
  const message = sanitizeUserFacingError(apiMessage);
  return t('extractor.errorHttp', {
    status: String(status),
    message,
  }) as string;
}

function parseExtractedJson(text: string): unknown {
  return JSON.parse(stripCodeFence(text));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeExtracted(raw: unknown): ExtractedData {
  if (!isRecord(raw)) {
    throw new Error(t('extractor.errorNoJson') as string);
  }

  const r = raw as RawExtracted;
  const usage = r.usage;
  const tags = r.tags;

  const brandFromBrand = typeof r.brand === 'string' ? r.brand.trim() : '';
  const brandFromSource = typeof r.source === 'string' ? r.source.trim() : '';
  const brand = brandFromBrand.length > 0 ? brandFromBrand : brandFromSource;

  return {
    productName: typeof r.productName === 'string' ? r.productName : '',
    brand,
    category: typeof r.category === 'string' ? r.category : '',
    usage: usage === null ? [] : Array.isArray(usage) ? usage.filter((u): u is string => typeof u === 'string') : [],
    notes: typeof r.notes === 'string' ? r.notes : '',
    tags: tags === null ? [] : Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [],
  };
}

function logApiKeyFingerprint(trimmedKey: string): void {
  if (!__DEV__) return;
  const len = trimmedKey.length;
  if (len === 0) {
    console.log('[Anthropic] EXPO_PUBLIC_ANTHROPIC_API_KEY: empty after trim');
    return;
  }
  if (len < 8) {
    console.log(
      '[Anthropic] EXPO_PUBLIC_ANTHROPIC_API_KEY: loaded, length:',
      len,
      '(skipped 4+4 fingerprint — key too short)'
    );
    return;
  }
  const first = trimmedKey.slice(0, 4);
  const last = trimmedKey.slice(-4);
  console.log(
    '[Anthropic] EXPO_PUBLIC_ANTHROPIC_API_KEY fingerprint:',
    `${first}...${last}`,
    'length:',
    len
  );
}

export async function extractProductFromText(
  userText: string
): Promise<ExtractProductResult> {
  const rawKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  const trimmedKey = typeof rawKey === 'string' ? rawKey.trim() : '';

  if (!trimmedKey) {
    return {
      success: false,
      error: t('extractor.errorNoKey') as string,
    };
  }

  logApiKeyFingerprint(trimmedKey);

  const text = userText.trim();
  if (!text) {
    return { success: false, error: t('extractor.errorNoText') as string };
  }

  /** Long input is truncated silently — no user-facing error. */
  const excerpt = text.length > MAX_USER_TEXT_LENGTH ? text.slice(0, MAX_USER_TEXT_LENGTH) : text;

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': trimmedKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: EXTRACTION_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract structured data from the following text. Follow the system instructions exactly. Return only the JSON object.\n\n---\n\n${excerpt}`,
              },
            ],
          },
        ],
      }),
    });

    const body = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      error?: { type?: string; message?: string };
    };

    if (!res.ok) {
      const errObj = body.error;
      const msg = typeof errObj?.message === 'string' ? errObj.message.trim() : '';
      const typ = typeof errObj?.type === 'string' ? errObj.type.trim() : '';
      let raw: string;
      if (msg && typ) {
        raw = msg.includes(typ) ? msg : `${typ}: ${msg}`;
      } else {
        raw =
          msg || typ || res.statusText || (t('extractor.errorUnknown') as string);
      }
      return { success: false, error: formatHttpApiError(res.status, raw) };
    }

    const block = body.content?.find((c) => c.type === 'text' && typeof c.text === 'string');
    if (!block?.text) {
      return {
        success: false,
        error: formatHttpApiError(res.status, t('extractor.errorEmptyResponse') as string),
      };
    }

    let parsed: unknown;
    try {
      parsed = parseExtractedJson(block.text);
    } catch {
      return {
        success: false,
        error: formatHttpApiError(res.status, t('extractor.errorParseJson') as string),
      };
    }

    const data = normalizeExtracted(parsed);
    return { success: true, data };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const detail = sanitizeUserFacingError(
      message || (t('extractor.errorNetworkFallback') as string),
    );
    return {
      success: false,
      error: t('extractor.errorNetwork', { message: detail }) as string,
    };
  }
}
