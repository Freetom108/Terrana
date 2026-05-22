/** Terrana — Cloudflare Worker: Anthropic Claude proxy + rate limiting. */

export interface Env {
  ANTHROPIC_API_KEY: string;
  /** Required for production (5 requests / minute / IP). */
  RATE_LIMIT_KV?: KVNamespace;
}

const EXTRACTION_PROMPT = `You are a strict information extraction assistant. Your only task is to read the user's pasted text and output a single JSON object with exactly these keys:

- "productName" (string or null)
- "brand" (string or null) — the manufacturer, brand name, retailer, or website/source (e.g. "doTERRA", "Wikipedia"); use null if not clearly identifiable
- "category" (string or null) — MUST be exactly one of these internal app keys when the product type matches (use null if unknown): "essentialOil", "carrierOil", "herbTea", "supplement", "bachFlower", "other". Map from any language or description into the closest key (e.g. essential oils → essentialOil; Wikipedia carrier/base oil → carrierOil; Bach / Rescue remedy → bachFlower).
- "usage" (array of strings, or null) — application hints, directions for use, or usage instructions that appear in the product-related text; each entry a short string
- "notes" (string or null) — product description, ingredients (Inhaltsstoffe), characteristics/properties, and other substantive product detail that does not belong in isolated usage bullets; combine coherently if needed
- "tags" (array of strings, or null) — short labels or keywords (e.g. key ingredients, product type hints) explicitly suggested by the product text

Content filtering (critical):
- IGNORE completely (do not summarise, do not copy into any field): site navigation, header/footer chrome, menus, sidebars, cookie consent banners and cookie-policy text, payment methods and checkout/shipping blocks, shopping-cart widgets, contact and support blocks, legal/impressum/terms/privacy boilerplate, newsletter and social-media links, ads, reviews unrelated to core product specs, and any other non-product page noise.
- FOCUS ONLY on product-related information: product name, product description, usage/application hints, ingredients (Inhaltsstoffe), and product properties or characteristics.
- Even when the paste is mostly irrelevant (full web pages, long storefront templates), extract ONLY fragments that clearly describe the product. If nothing is product-specific, return nulls. Never invent data from footer, navigation, cookies, or payment sections.

Rules you must follow:
1. Output only valid JSON. No markdown, no code fences, no commentary before or after the JSON.
2. Extract only what is clearly present or reasonably implied in the product-focused parts of the text. Do not invent product names, categories, usages, notes, or tags.
3. Do not add medical claims, health advice, dosing, diagnoses, or warnings that are not explicitly stated in the text. Never supplement with general medical or safety knowledge.
4. If a field cannot be filled from the text, use JSON null for that key (not an empty string or empty array unless the text explicitly describes emptiness — prefer null for "missing").
5. Do not translate or paraphrase unless needed for minimal clarity; prefer wording grounded in the source text.
6. For arrays, include only items supported by the text; if there are no usages or tags to extract, use null for that key.

Your entire reply must be one JSON object and nothing else.`;

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_CHARS = 15_000;
const MAX_RATE_PER_MINUTE = 5;
const WINDOW_MS = 60_000;
const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MAX_OUT_TOKENS = 1000;
const FETCH_TIMEOUT_MS = 30_000;

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type',
  'access-control-max-age': '86400',
} as const;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('True-Client-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

type RateBucket = { ts: number[] };

async function allowRequest(kv: KVNamespace, ip: string): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const key = `rl:v1:${ip}`;
  let bucket = (await kv.get<RateBucket>(key, 'json')) ?? { ts: [] };
  if (!Array.isArray(bucket.ts)) bucket.ts = [];
  bucket.ts = bucket.ts.filter((t: number) => t > windowStart);
  if (bucket.ts.length >= MAX_RATE_PER_MINUTE) return false;
  bucket.ts.push(now);
  await kv.put(key, JSON.stringify(bucket), { expirationTtl: Math.ceil(WINDOW_MS / 1000) + 120 });
  return true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...corsHeaders } });
    }

    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405);
    }

    if (!env.RATE_LIMIT_KV) {
      return json({ error: 'rate_limit_kv_not_configured' }, 503);
    }

    const ip = clientIp(request);
    if (!(await allowRequest(env.RATE_LIMIT_KV, ip))) {
      return json({ error: 'rate_limit_exceeded' }, 429);
    }

    if (!env.ANTHROPIC_API_KEY?.trim()) {
      return json({ error: 'anthropic_key_missing' }, 503);
    }

    let parsed: unknown;
    try {
      parsed = await request.json();
    } catch {
      return json({ error: 'invalid_json_body' }, 400);
    }

    const textRaw =
      typeof parsed === 'object' &&
      parsed !== null &&
      'text' in parsed &&
      typeof (parsed as { text?: unknown }).text === 'string'
        ? (parsed as { text: string }).text
        : null;

    if (textRaw === null) {
      return json({ error: 'missing_text_field' }, 400);
    }

    const trimmed = textRaw.trim();
    if (!trimmed) {
      return json({ error: 'empty_text' }, 400);
    }

    const excerpt = trimmed.length > MAX_CHARS ? trimmed.slice(0, MAX_CHARS) : trimmed;

    const anthropicBody = {
      model: MODEL,
      max_tokens: MAX_OUT_TOKENS,
      system: [
        {
          type: 'text',
          text: EXTRACTION_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
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
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let anthropicRes: Response;
    try {
      anthropicRes = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY.trim(),
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(anthropicBody),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return json({ error: 'upstream_fetch_failed', detail: msg }, 502);
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await anthropicRes.text();
    return new Response(responseText, {
      status: anthropicRes.status,
      headers: {
        ...corsHeaders,
        'content-type': anthropicRes.headers.get('content-type') ?? 'application/json; charset=utf-8',
      },
    });
  },
};
