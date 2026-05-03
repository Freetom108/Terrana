import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Blend } from '../../types/blend';
import type { Product } from '../../types/product';

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #222;
    line-height: 1.45;
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 16px 32px;
    font-size: 14px;
  }
  h1 {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #ccc;
  }
  h2 {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #555;
    margin: 20px 0 8px;
  }
  p, ul { margin: 0 0 8px; }
  ul { padding-left: 1.2em; }
  li { margin-bottom: 4px; }
  .tags, .muted { color: #444; }
  .notes { white-space: pre-wrap; }
  @media print {
    body { padding: 0; max-width: none; }
    a { color: inherit; text-decoration: none; }
  }
`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapDocument(title: string, bodyInner: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
${bodyInner}
</body>
</html>`;
}

/** Erstellt druckfreundliches HTML für eine Mischung. */
export function generateBlendHTML(blend: Blend): string {
  const ingredientsHtml =
    blend.ingredients.length === 0
      ? '<p class="muted">Keine Zutaten hinterlegt.</p>'
      : `<ul>${blend.ingredients
          .map(
            (ing) =>
              `<li>${escapeHtml(ing.productName)} — ${escapeHtml(String(ing.amount))} ${escapeHtml(ing.unit)}</li>`
          )
          .join('')}</ul>`;

  const notesBlock = blend.notes.trim()
    ? `<p class="notes">${escapeHtml(blend.notes)}</p>`
    : '<p class="muted">—</p>';

  const tagsBlock =
    blend.tags.length > 0
      ? `<p class="tags">${escapeHtml(blend.tags.join(', '))}</p>`
      : '<p class="muted">—</p>';

  const inner = `
  <h1>${escapeHtml(blend.name)}</h1>
  <h2>Zutaten</h2>
  ${ingredientsHtml}
  <h2>Notizen</h2>
  ${notesBlock}
  <h2>Tags</h2>
  ${tagsBlock}
`;

  return wrapDocument(blend.name, inner);
}

function generateProductHTML(product: Product): string {
  const usagesHtml =
    product.usages.length === 0
      ? '<p class="muted">Keine Anwendungen hinterlegt.</p>'
      : `<ul>${product.usages.map((u) => `<li>${escapeHtml(u)}</li>`).join('')}</ul>`;

  const descParts = [product.description.trim(), product.notes.trim()].filter(Boolean);
  const detailText = descParts.length ? Array.from(new Set(descParts)).join('\n\n') : '';
  const notesBlock = detailText
    ? `<p class="notes">${escapeHtml(detailText)}</p>`
    : '<p class="muted">—</p>';

  const tagsBlock =
    product.tags.length > 0
      ? `<p class="tags">${escapeHtml(product.tags.join(', '))}</p>`
      : '<p class="muted">—</p>';

  const brandLine = product.brand.trim()
    ? `<p class="muted"><strong>Marke:</strong> ${escapeHtml(product.brand)}</p>`
    : '';

  const inner = `
  <h1>${escapeHtml(product.name)}</h1>
  ${brandLine}
  <p class="muted"><strong>Kategorie:</strong> ${escapeHtml(product.category)}</p>
  <h2>Anwendungen</h2>
  ${usagesHtml}
  <h2>Beschreibung & Notizen</h2>
  ${notesBlock}
  <h2>Tags</h2>
  ${tagsBlock}
`;

  return wrapDocument(product.name, inner);
}

async function shareHtmlAsPdf(html: string, dialogTitle: string): Promise<void> {
  let uri: string;
  try {
    const result = await Print.printToFileAsync({ html });
    uri = result.uri;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`PDF konnte nicht erzeugt werden: ${msg}`, { cause: e });
  }

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (!sharingAvailable) {
    throw new Error('Teilen ist auf diesem Gerät nicht verfügbar.');
  }

  try {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Teilen-Dialog konnte nicht geöffnet werden: ${msg}`, { cause: e });
  }
}

export async function exportBlendAsPDF(blend: Blend): Promise<void> {
  try {
    await shareHtmlAsPdf(generateBlendHTML(blend), `Mischung: ${blend.name}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Export der Mischung fehlgeschlagen: ${msg}`, { cause: e });
  }
}

export async function exportProductAsPDF(product: Product): Promise<void> {
  try {
    await shareHtmlAsPdf(generateProductHTML(product), `Produkt: ${product.name}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Export des Produkts fehlgeschlagen: ${msg}`, { cause: e });
  }
}
