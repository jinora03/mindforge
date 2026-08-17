import type { ResolvedText } from '@mindforge/engine';
import type { ThemePresentation } from '@mindforge/themes';

export function renderExportCaptions(
  context: CanvasRenderingContext2D,
  texts: readonly ResolvedText[],
  presentation: ThemePresentation,
  width: number,
  height: number,
): void {
  for (const text of texts) {
    const style = presentation.typography[text.style];
    const fontSize = resolveCssSize(style.fontSize, height, 32);
    const fontWeight = style.fontWeight ?? 700;
    const family = typeof style.fontFamily === 'string' ? style.fontFamily : 'system-ui, sans-serif';
    const lineHeight = typeof style.lineHeight === 'number' ? style.lineHeight : 1.2;
    const maxWidth = width * presentation.safeZones.centralWidth;
    const content = style.textTransform === 'uppercase' ? text.content.toUpperCase() : text.content;

    context.save();
    context.globalAlpha = typeof style.opacity === 'number' ? style.opacity : 1;
    context.fillStyle = typeof style.color === 'string' ? style.color : '#ffffff';
    context.font = `${fontWeight} ${fontSize}px ${family}`;
    context.textBaseline = 'middle';
    context.textAlign = style.textAlign === 'left' || style.textAlign === 'right' ? style.textAlign : 'center';
    context.shadowColor = 'rgba(0,0,0,0.58)';
    context.shadowBlur = Math.max(4, fontSize * 0.2);
    context.shadowOffsetY = Math.max(2, fontSize * 0.08);

    const lines = wrapText(context, content, maxWidth);
    const step = fontSize * lineHeight;
    const centerY = height * presentation.safeZones.placementY[text.placement];
    const firstY = centerY - ((lines.length - 1) * step) / 2;
    const left = (width - maxWidth) / 2;
    const x = context.textAlign === 'left' ? left : context.textAlign === 'right' ? left + maxWidth : width / 2;
    lines.forEach((line, index) => context.fillText(line, x, firstY + index * step, maxWidth));
    context.restore();
  }
}

function wrapText(context: CanvasRenderingContext2D, content: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of content.split(/\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let line = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`;
      if (context.measureText(candidate).width <= maxWidth) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

function resolveCssSize(value: unknown, viewportHeight: number, fallback: number): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return fallback;
  const px = /^([\d.]+)px$/.exec(value.trim());
  if (px) return Number(px[1]);
  const vh = /^([\d.]+)vh$/.exec(value.trim());
  if (vh) return (Number(vh[1]) / 100) * viewportHeight;
  const clamp = /^clamp\(\s*([\d.]+)px\s*,\s*([\d.]+)vh\s*,\s*([\d.]+)px\s*\)$/.exec(value.trim());
  if (clamp) {
    const min = Number(clamp[1]);
    const preferred = (Number(clamp[2]) / 100) * viewportHeight;
    const max = Number(clamp[3]);
    return Math.max(min, Math.min(max, preferred));
  }
  return fallback;
}
