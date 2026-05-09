import { Share } from 'react-native';
import { categoryLabelKey } from '../../constants/categories';
import { t } from '../i18n/i18n';
import type { Blend } from '../../types/blend';
import type { Product } from '../../types/product';

function formatProduct(product: Product): string {
  const lines: string[] = [];
  lines.push(`🌿 ${product.name}`);
  const meta = [(t(categoryLabelKey(product.category)) as string), product.brand.trim()].filter(Boolean).join(' · ');
  if (meta) lines.push(meta);
  if (product.usages.length > 0) {
    lines.push('');
    lines.push((t('share.usages') as string) + ':');
    product.usages.forEach((u) => lines.push(`• ${u}`));
  }
  if (product.tags.length > 0) {
    lines.push('');
    lines.push(product.tags.map((tag) => `#${tag}`).join(' '));
  }
  const desc = [product.description.trim(), product.notes.trim()].filter(Boolean).join('\n\n');
  if (desc) {
    lines.push('');
    lines.push(desc);
  }
  lines.push('');
  lines.push(t('share.footer') as string);
  return lines.join('\n');
}

function formatBlend(blend: Blend): string {
  const lines: string[] = [];
  lines.push(`🧪 ${blend.name}`);
  if (blend.description.trim()) lines.push(blend.description.trim());

  if (blend.kind === 'mix' && blend.mixRecipe) {
    const { droplets, baseOil } = blend.mixRecipe;
    if (baseOil?.name) lines.push(`${baseOil.name}${baseOil.amount != null ? ` ${String(baseOil.amount)} ${baseOil.unit ?? ''}` : ''}`.trim());
    if (droplets.length > 0) {
      lines.push('');
      lines.push((t('share.ingredients') as string) + ':');
      droplets.forEach((d) => {
        const qty = d.quantityLabel?.trim() || `${String(d.drops)} ${t('pdf.dropsUnit') as string}`;
        lines.push(`• ${d.productName}: ${qty}`);
      });
    }
  } else if (blend.kind === 'combination' && blend.combinationSlots) {
    lines.push('');
    blend.combinationSlots.forEach((s) => lines.push(`• ${s.productName}`));
  } else if (blend.kind === 'protocol' && blend.protocolSteps) {
    lines.push('');
    blend.protocolSteps.forEach((s) => lines.push(`• ${s.productName}`));
  }

  if (blend.notes.trim()) {
    lines.push('');
    lines.push(blend.notes.trim());
  }
  if (blend.tags.length > 0) {
    lines.push('');
    lines.push(blend.tags.map((tag) => `#${tag}`).join(' '));
  }
  lines.push('');
  lines.push(t('share.footer') as string);
  return lines.join('\n');
}

export async function shareProduct(product: Product): Promise<void> {
  await Share.share({ message: formatProduct(product), title: product.name });
}

export async function shareBlend(blend: Blend): Promise<void> {
  await Share.share({ message: formatBlend(blend), title: blend.name });
}

export async function shareProducts(products: Product[]): Promise<void> {
  const sections = products.map((p) => formatProduct(p));
  const message = sections.join('\n\n---\n\n');
  await Share.share({
    message,
    title: t('share.multiProducts', { count: products.length }) as string,
  });
}
