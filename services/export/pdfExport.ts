import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getLocale, t } from '../../services/i18n/i18n';
import type { Blend } from '../../types/blend';
import type { Product } from '../../types/product';

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  @page { margin: 24px; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #222;
    line-height: 1.6;
    max-width: 720px;
    margin: 0 auto;
    padding: 24px;
    font-size: 14px;
  }
  .doc-header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 20px;
  }
  .doc-brand {
    font-size: 36px;
    font-style: italic;
    font-weight: 700;
    color: #4A6B4E;
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
  p, ul, ol { margin: 0 0 8px; }
  ul, ol { padding-left: 1.2em; }
  li { margin-bottom: 4px; }
  .tags, .muted { color: #444; }
  .notes { white-space: pre-wrap; }
  .doc-footer {
    margin-top: 36px;
    padding-top: 12px;
    border-top: 1px solid #ddd;
    font-size: 20px;
    color: #7A9E7E;
    text-align: right;
  }
  @media print {
    body { max-width: none; }
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

type PdfMode = 'share' | 'print';

function wrapDocument(title: string, bodyInner: string, mode: PdfMode = 'share'): string {
  const footerText = mode === 'print'
    ? (t('pdf.footerPrint') as string)
    : (t('pdf.footerShare') as string);
  return `<!DOCTYPE html>
<html lang="${escapeHtml(getLocale())}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
<div class="doc-header"><span class="doc-brand">Terrana</span></div>
${bodyInner}
<div class="doc-footer">${escapeHtml(footerText)}</div>
</body>
</html>`;
}

function formatBlendIsoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleDateString(getLocale(), { dateStyle: 'medium' });
  } catch {
    return iso;
  }
}

/** Erstellt druckfreundliches HTML für eine Mischung. */
export function generateBlendHTML(blend: Blend, mode: PdfMode = 'share'): string {
  const kindLabels: Record<Blend['kind'], string> = {
    mix: t('blends.kindMix') as string,
    combination: t('blends.kindCombination') as string,
    protocol: t('blends.kindProtocol') as string,
  };
  const kindPretty = kindLabels[blend.kind];

  const timingLabels: Record<'morning' | 'evening' | 'as_needed' | 'flexible', string> = {
    morning: t('blends.timingMorning') as string,
    evening: t('blends.timingEvening') as string,
    as_needed: t('blends.timingAsNeeded') as string,
    flexible: t('blends.timingFlexible') as string,
  };

  const notesBlock = blend.notes.trim()
    ? `<p class="notes">${escapeHtml(blend.notes)}</p>`
    : '<p class="muted">—</p>';

  const tagsBlock =
    blend.tags.length > 0
      ? `<p class="tags">${escapeHtml(blend.tags.join(', '))}</p>`
      : '<p class="muted">—</p>';

  const created = escapeHtml(formatBlendIsoDate(blend.createdAt));

  let typeBody = '';

  if (blend.kind === 'mix') {
    const mr = blend.mixRecipe;
    const base = mr?.baseOil;
    let baseBlock = '';
    if (base) {
      const name = (base.name ?? '').trim();
      const amt =
        typeof base.amount === 'number' && Number.isFinite(base.amount) ? String(base.amount) : '';
      const unit = (base.unit ?? '').trim();
      let baseLine = '';
      if (name && amt && unit) baseLine = `${escapeHtml(name)}: ${escapeHtml(amt)} ${escapeHtml(unit)}`;
      else if (name && amt) baseLine = `${escapeHtml(name)}: ${escapeHtml(amt)}`;
      else if (amt && unit) baseLine = `${escapeHtml(amt)} ${escapeHtml(unit)}`;
      else if (name) baseLine = escapeHtml(name);
      if (baseLine) baseBlock = `<h2>${escapeHtml(t('pdf.blendBaseOil') as string)}</h2><p>${baseLine}</p>`;
    }
    const dropsUnit = t('pdf.dropsUnit') as string;
    const dropletsHtml =
      mr && mr.droplets.length > 0
        ? `<ul>${mr.droplets
            .map((d) => {
              const qty =
                typeof d.quantityLabel === 'string' && d.quantityLabel.trim()
                  ? d.quantityLabel.trim()
                  : `${String(d.drops)} ${dropsUnit}`;
              return `<li>${escapeHtml(d.productName)} — ${escapeHtml(qty)}</li>`;
            })
            .join('')}</ul>`
        : '<p class="muted">—</p>';

    const vol =
      mr?.totalVolumeAmount !== undefined && mr?.totalVolumeUnit
        ? `<p>${escapeHtml(String(mr.totalVolumeAmount))} ${escapeHtml(mr.totalVolumeUnit)}</p>`
        : '<p class="muted">—</p>';

    typeBody = `
  ${baseBlock}
  <h2>${escapeHtml(t('pdf.blendDroplets') as string)}</h2>
  ${dropletsHtml}
  <h2>${escapeHtml(t('pdf.blendTotalVolume') as string)}</h2>
  ${vol}
`;
  } else if (blend.kind === 'combination') {
    const slots = blend.combinationSlots ?? [];
    const siteLabel = t('pdf.blendApplicationSite') as string;
    const list =
      slots.length > 0
        ? `<ul>${slots
            .map(
              (s) =>
                `<li><strong>${escapeHtml(s.productName)}</strong><br /><span class="muted">${escapeHtml(siteLabel)}: ${escapeHtml(s.applicationSite || '—')}</span></li>`,
            )
            .join('')}</ul>`
        : '<p class="muted">—</p>';
    typeBody = `
  <h2>${escapeHtml(t('pdf.blendParallelProducts') as string)}</h2>
  ${list}
`;
  } else {
    const steps = blend.protocolSteps ?? [];
    const stepsHtml =
      steps.length > 0
        ? `<ol>${steps
            .map(
              (st) =>
                `<li><strong>${escapeHtml(st.productName)}</strong> — ${escapeHtml(timingLabels[st.timing])}${
                  st.stepNote?.trim()
                    ? `<br /><span class="muted">${escapeHtml(st.stepNote.trim())}</span>`
                    : ''
                }</li>`,
            )
            .join('')}</ol>`
        : '<p class="muted">—</p>';
    typeBody = `
  <h2>${escapeHtml(t('pdf.blendSteps') as string)}</h2>
  ${stepsHtml}
`;
  }

  const descPara = blend.description.trim()
    ? `<h2>${escapeHtml(t('pdf.blendDescription') as string)}</h2><p>${escapeHtml(blend.description.trim())}</p>`
    : '';

  const inner = `
  <h1>${escapeHtml(blend.name)}</h1>
  <p class="muted">${escapeHtml(t('pdf.blendType') as string)}: ${escapeHtml(kindPretty)}</p>
${descPara}
${typeBody}
  <h2>${escapeHtml(t('pdf.blendNotes') as string)}</h2>
  ${notesBlock}
  <h2>${escapeHtml(t('pdf.blendTags') as string)}</h2>
  ${tagsBlock}
  <h2>${escapeHtml(t('pdf.blendCreatedAt') as string)}</h2>
  <p>${created}</p>
`;

  return wrapDocument(blend.name, inner, mode);
}

function generateProductHTML(product: Product, mode: PdfMode = 'share'): string {
  const usagesHtml =
    product.usages.length === 0
      ? `<p class="muted">${escapeHtml(t('pdf.productNoUsages') as string)}</p>`
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
    ? `<p class="muted"><strong>${escapeHtml(t('pdf.productBrand') as string)}:</strong> ${escapeHtml(product.brand)}</p>`
    : '';

  const inner = `
  <h1>${escapeHtml(product.name)}</h1>
  ${brandLine}
  <p class="muted"><strong>${escapeHtml(t('pdf.productCategory') as string)}:</strong> ${escapeHtml(product.category)}</p>
  <h2>${escapeHtml(t('pdf.productUsages') as string)}</h2>
  ${usagesHtml}
  <h2>${escapeHtml(t('pdf.productDescriptionNotes') as string)}</h2>
  ${notesBlock}
  <h2>${escapeHtml(t('pdf.productTags') as string)}</h2>
  ${tagsBlock}
`;

  return wrapDocument(product.name, inner, mode);
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
    await shareHtmlAsPdf(
      generateBlendHTML(blend, 'share'),
      t('pdf.blendDialogTitle', { name: blend.name }) as string,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`PDF export failed: ${msg}`, { cause: e });
  }
}

export async function exportProductAsPDF(product: Product): Promise<void> {
  try {
    await shareHtmlAsPdf(
      generateProductHTML(product, 'share'),
      t('pdf.productDialogTitle', { name: product.name }) as string,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`PDF export failed: ${msg}`, { cause: e });
  }
}

export async function printProduct(product: Product): Promise<void> {
  await Print.printAsync({ html: generateProductHTML(product, 'print') });
}

export async function printBlend(blend: Blend): Promise<void> {
  await Print.printAsync({ html: generateBlendHTML(blend, 'print') });
}

function generateCollectionHTML(products: Product[]): string {
  const locale = getLocale();
  const date = new Date().toLocaleDateString(locale, { dateStyle: 'medium' });
  const title = t('pdf.collectionTitle') as string;

  // Extract only the body content from each product's HTML (strip full doc wrapper)
  const sections = products
    .map(
      (p, i) => `
  ${i > 0 ? '<hr style="margin:32px 0;border:none;border-top:1px solid #ddd" />' : ''}
  ${generateProductHTML(p, 'share')
    .replace(/^[\s\S]*?<body[^>]*>/, '')
    .replace(/<div class="doc-header">[\s\S]*?<\/div>/, '')
    .replace(/<div class="doc-footer">[\s\S]*?<\/div>/, '')
    .replace(/<\/body>[\s\S]*$/, '')}
`,
    )
    .join('');

  const inner = `
  <h1>${escapeHtml(title)}</h1>
  <p class="muted">${escapeHtml(date)} · ${products.length} ${escapeHtml(t('pdf.collectionCount') as string)}</p>
  ${sections}
`;
  return wrapDocument(title, inner, 'share');
}

export async function exportCollectionAsPDF(products: Product[]): Promise<void> {
  try {
    await shareHtmlAsPdf(
      generateCollectionHTML(products),
      t('pdf.collectionDialogTitle') as string,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`PDF export failed: ${msg}`, { cause: e });
  }
}
