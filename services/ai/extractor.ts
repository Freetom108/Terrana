import type { ExtractedData } from '../../types/import';
import { EXTRACTION_PROMPT } from './prompt';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1000;
const ANTHROPIC_VERSION = '2023-06-01';

export type ExtractProductResult =
  | { success: true; data: ExtractedData }
  | { success: false; error: string };

type RawExtracted = {
  productName?: string | null;
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

function parseModelJson(text: string): unknown {
  return JSON.parse(stripCodeFence(text));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeExtracted(raw: unknown): ExtractedData {
  if (!isRecord(raw)) {
    throw new Error('Extraktion lieferte kein JSON-Objekt.');
  }

  const r = raw as RawExtracted;
  const usage = r.usage;
  const tags = r.tags;

  return {
    productName: typeof r.productName === 'string' ? r.productName : r.productName === null ? '' : '',
    category: typeof r.category === 'string' ? r.category : r.category === null ? '' : '',
    usage: usage === null ? [] : Array.isArray(usage) ? usage.filter((u): u is string => typeof u === 'string') : [],
    notes: typeof r.notes === 'string' ? r.notes : r.notes === null ? '' : '',
    tags: tags === null ? [] : Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [],
  };
}

export async function extractProductFromText(
  userText: string
): Promise<ExtractProductResult> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      error: 'EXPO_PUBLIC_ANTHROPIC_API_KEY ist nicht gesetzt (.env im Projektroot).',
    };
  }

  const text = userText.trim();
  if (!text) {
    return { success: false, error: 'Kein Text zum Extrahieren.' };
  }

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey.trim(),
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
                text: `Extract structured data from the following text. Follow the system instructions exactly. Return only the JSON object.\n\n---\n\n${text}`,
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
      const msg = body.error?.message ?? res.statusText ?? 'Unbekannter API-Fehler';
      return { success: false, error: msg };
    }

    const block = body.content?.find((c) => c.type === 'text' && typeof c.text === 'string');
    if (!block?.text) {
      return { success: false, error: 'Leere oder ungültige Modell-Antwort.' };
    }

    let parsed: unknown;
    try {
      parsed = parseModelJson(block.text);
    } catch {
      return { success: false, error: 'Konnte JSON aus der Modell-Antwort nicht lesen.' };
    }

    const data = normalizeExtracted(parsed);
    return { success: true, data };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, error: message || 'Netzwerk- oder Laufzeitfehler.' };
  }
}
