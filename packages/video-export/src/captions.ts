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
    const panelWidth = width * presentation.safeZones.centralWidth;
    const padding = resolvePadding(style.padding, fontSize);
    const maxTextWidth = Math.max(1, panelWidth - padding.horizontal * 2);
    const content = style.textTransform === 'uppercase' ? text.content.toUpperCase() : text.content;

    context.save();
    context.globalAlpha = typeof style.opacity === 'number' ? style.opacity : 1;
    context.font = `${fontWeight} ${fontSize}px ${family}`;
    context.textBaseline = 'middle';
    context.textAlign = style.textAlign === 'left' || style.textAlign === 'right' ? style.textAlign : 'center';

    const lines = wrapText(context, content, maxTextWidth);
    const step = fontSize * lineHeight;
    const centerY = height * presentation.safeZones.placementY[text.placement];
    const firstY = centerY - ((lines.length - 1) * step) / 2;
    const left = (width - panelWidth) / 2;
    const x = context.textAlign === 'left' ? left + padding.horizontal : context.textAlign === 'right' ? left + panelWidth - padding.horizontal : width / 2;

    if (typeof style.backgroundColor === 'string') {
      const contentWidth = Math.min(
        maxTextWidth,
        Math.max(0, ...lines.map((line) => context.measureText(line).width)),
      );
      const contentHeight = fontSize + Math.max(0, lines.length - 1) * step;
      const backdropWidth = Math.min(panelWidth, contentWidth + padding.horizontal * 2);
      const backdropHeight = contentHeight + padding.vertical * 2;
      const radius = Math.min(
        resolveCssLength(style.borderRadius, fontSize, fontSize * 0.58),
        backdropHeight / 2,
        backdropWidth / 2,
      );
      context.fillStyle = style.backgroundColor;
      context.shadowColor = 'rgba(0,0,0,0)';
      context.shadowBlur = 0;
      context.shadowOffsetY = 0;
      roundedRect(
        context,
        (width - backdropWidth) / 2,
        centerY - backdropHeight / 2,
        backdropWidth,
        backdropHeight,
        radius,
      );
      context.fill();
    }

    context.fillStyle = typeof style.color === 'string' ? style.color : '#ffffff';
    context.shadowColor = 'rgba(0,0,0,0.58)';
    context.shadowBlur = Math.max(4, fontSize * 0.2);
    context.shadowOffsetY = Math.max(2, fontSize * 0.08);
    lines.forEach((line, index) => context.fillText(line, x, firstY + index * step, maxTextWidth));
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

function resolvePadding(value: unknown, fontSize: number): { vertical: number; horizontal: number } {
  if (typeof value !== 'string') return { vertical: 0, horizontal: 0 };
  const parts = value.trim().split(/\s+/);
  if (!parts.length || parts.length > 2) return { vertical: 0, horizontal: 0 };
  const vertical = resolveCssLength(parts[0], fontSize, 0);
  const horizontal = resolveCssLength(parts[1] ?? parts[0], fontSize, 0);
  return { vertical, horizontal };
}

function resolveCssLength(value: unknown, fontSize: number, fallback: number): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  const px = /^([\d.]+)px$/.exec(trimmed);
  if (px) return Number(px[1]);
  const em = /^([\d.]+)em$/.exec(trimmed);
  if (em) return Number(em[1]) * fontSize;
  return fallback;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.max(0, radius);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
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
