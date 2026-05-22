import { t } from '../i18n/i18n';
import type { ExtractedData } from '../../types/import';

/** Production proxy; überschreibbar mit EXPO_PUBLIC_TERRANA_AI_PROXY_URL (trim, ohne Slash am Ende). */
const DEFAULT_AI_PROXY_ORIGIN = 'https://terrana-ai-proxy.terrana.workers.dev';
const MAX_USER_TEXT_LENGTH = 15_000;
const FETCH_TIMEOUT_MS = 30_000;

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

type AnthropicMessagesBody = {
  content?: Array<{ type?: string; text?: string }>;
  /** Anthropic upstream: `{ type, message }`; Worker-Fehler: string */
  error?: { type?: string; message?: string } | string;
  detail?: unknown;
};

function resolveAiProxyOrigin(): string {
  const explicit =
    typeof process.env.EXPO_PUBLIC_TERRANA_AI_PROXY_URL === 'string'
      ? process.env.EXPO_PUBLIC_TERRANA_AI_PROXY_URL.trim()
      : '';
  const base = explicit.length > 0 ? explicit : DEFAULT_AI_PROXY_ORIGIN;
  return base.replace(/\/+$/, '');
}

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
    tags: tags === null ? [] : Array.isArray(tags) ? tags.filter((x): x is string => typeof x === 'string') : [],
  };
}

/** Body shape vom Proxy ({ error: string }) vs. Anthropic ({ error: { … } }). */
function isWorkerFlatError(record: AnthropicMessagesBody): boolean {
  const e = record.error;
  return typeof e === 'string';
}

function mapWorkerFlatError(
  record: AnthropicMessagesBody & { detail?: unknown },
  httpStatus: number,
): string {
  const code = typeof record.error === 'string' ? record.error : '';
  switch (code) {
    case 'rate_limit_exceeded':
      return t('extractor.workerRateLimited') as string;
    case 'upstream_fetch_failed': {
      const d = typeof record.detail === 'string' ? sanitizeUserFacingError(record.detail.trim()) : '';
      if (d) {
        return `${t('extractor.workerUpstream') as string}: ${d}`;
      }
      return t('extractor.workerUpstream') as string;
    }
    default:
      return formatHttpApiError(httpStatus, code || (t('extractor.errorUnknown') as string));
  }
}

export async function extractProductFromText(
  userText: string
): Promise<ExtractProductResult> {
  const proxyOrigin = resolveAiProxyOrigin();

  const text = userText.trim();
  if (!text) {
    return { success: false, error: t('extractor.errorNoText') as string };
  }

  /** Gleiches Limit wie der Worker — kürzt überschüssiges still. */
  const excerpt = text.length > MAX_USER_TEXT_LENGTH ? text.slice(0, MAX_USER_TEXT_LENGTH) : text;

  const abort = new AbortController();
  const timeoutId = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(proxyOrigin, {
      method: 'POST',
      signal: abort.signal,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ text: excerpt }),
    });

    const rawText = await res.text();
    let body: AnthropicMessagesBody;
    try {
      body = rawText.trim() !== '' ? (JSON.parse(rawText) as AnthropicMessagesBody) : {};
    } catch {
      return {
        success: false,
        error: formatHttpApiError(res.status, t('extractor.errorGeneric') as string),
      };
    }

    if (!res.ok) {
      if (isWorkerFlatError(body)) {
        return {
          success: false,
          error: mapWorkerFlatError(body as AnthropicMessagesBody & { detail?: unknown }, res.status),
        };
      }

      const errObj = body.error;
      const msg =
        errObj !== undefined && typeof errObj === 'object' && errObj !== null && 'message' in errObj
          ? String((errObj as { message?: string }).message ?? '').trim()
          : '';
      const typ =
        errObj !== undefined && typeof errObj === 'object' && errObj !== null && 'type' in errObj
          ? String((errObj as { type?: string }).type ?? '').trim()
          : '';
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
    if (
      typeof e === 'object' &&
      e !== null &&
      'name' in e &&
      (e as { name?: string }).name === 'AbortError'
    ) {
      return { success: false, error: t('extractor.errorTimeout') as string };
    }
    const message = e instanceof Error ? e.message : String(e);
    const detail = sanitizeUserFacingError(
      message || (t('extractor.errorNetworkFallback') as string),
    );
    return {
      success: false,
      error: t('extractor.errorNetwork', { message: detail }) as string,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
