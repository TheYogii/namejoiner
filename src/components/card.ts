/**
 * Draws a shareable 1080x1080 card of the saved names on a canvas and downloads it as a PNG. Everything happens in the browser:
 * no service, no upload. Colors are read from the page's theme, so each tool's card matches its page.
 */

const SIZE = 1080;
// The site uses the system font stack (no web fonts are loaded), so the card uses the same stack and matches the page.
const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export interface CardOptions {
  /** What the card is called, e.g. "couple names" gives the heading "My favorite couple names". */
  noun: string;
  /** Used in the file name, e.g. "couple-name-combiner". */
  slug: string;
  names: string[];
  /** An element inside the themed page, so the card can read that theme's colors. */
  themeSource: HTMLElement;
}

/** Turns any CSS color expression (including var() and color-mix()) into a plain rgb() string the canvas always accepts. */
function resolveColor(source: HTMLElement, value: string): string {
  const probe = document.createElement('span');
  probe.style.color = value;
  probe.style.display = 'none';
  source.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  return rgb;
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // the card still works without the logo: a text wordmark is drawn instead
    img.src = '/logo.png';
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

interface Placed { text: string; x: number; y: number; w: number; h: number }

/** Flows pills left to right, wrapping rows. Returns the placed pills and the bottom edge of the last row. */
function flow(ctx: CanvasRenderingContext2D, labels: string[], size: number, left: number, width: number, top: number) {
  const padX = Math.round(size * 0.55);
  const h = Math.round(size * 1.8);
  const gap = Math.round(size * 0.32);
  ctx.font = `600 ${size}px ${FONT}`;
  const placed: Placed[] = [];
  let x = left;
  let y = top;
  for (const raw of labels) {
    let text = raw;
    // A single name wider than the card is cut with an ellipsis instead of overflowing the edge.
    while (ctx.measureText(text).width + padX * 2 > width && text.length > 1) text = text.slice(0, -2) + '…';
    const w = Math.round(ctx.measureText(text).width + padX * 2);
    if (x + w > left + width && x > left) { x = left; y += h + gap; }
    placed.push({ text, x, y, w, h });
    x += w + gap;
  }
  const last = placed[placed.length - 1];
  return { placed, bottom: last ? last.y + last.h : top };
}

export async function downloadCard({ noun, slug, names, themeSource }: CardOptions): Promise<void> {
  // Make sure the intended fonts are ready before any text is measured or drawn.
  try {
    await document.fonts.ready;
    await document.fonts.load(`600 40px ${FONT}`);
  } catch {
    /* fonts API unavailable: the system stack is drawn as is */
  }

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  const c = (v: string) => resolveColor(themeSource, v);
  const bg = c('var(--accent-bg)');
  const accent = c('var(--accent)');
  const dark = c('var(--accent-dark)');
  const pillA = c('var(--pill-a)');
  const pillB = c('var(--pill-b)');
  const ink = c('var(--color-ink)');
  const soft = c('var(--color-ink-soft)');
  const line = c('var(--color-line)');

  const logo = await loadLogo();

  // Page background, then a white panel with a themed border, and a themed bar along the top of the panel.
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const panel = { x: 48, y: 48, w: SIZE - 96, h: SIZE - 96 };
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 44);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = line;
  ctx.stroke();
  ctx.save();
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 44);
  ctx.clip();
  const bar = ctx.createLinearGradient(panel.x, 0, panel.x + panel.w, 0);
  bar.addColorStop(0, accent);
  bar.addColorStop(1, dark);
  ctx.fillStyle = bar;
  ctx.fillRect(panel.x, panel.y, panel.w, 22);
  ctx.restore();

  const left = 110;
  const width = SIZE - left * 2;

  // Logo, top left. Without it (failed load), the name is drawn as text.
  if (logo && logo.naturalWidth > 0) {
    const h = 132;
    ctx.drawImage(logo, left - 12, 96, Math.round((logo.naturalWidth / logo.naturalHeight) * h), h);
  } else {
    ctx.fillStyle = dark;
    ctx.font = `800 64px ${FONT}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('NameJoiner', left, 170);
  }

  // Heading.
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = dark;
  ctx.font = `800 64px ${FONT}`;
  const heading = `My favorite ${noun}`;
  let headingSize = 64;
  while (ctx.measureText(heading).width > width && headingSize > 40) { headingSize -= 2; ctx.font = `800 ${headingSize}px ${FONT}`; }
  ctx.fillText(heading, left, 300);

  // Names: the biggest size that fits, shrinking to a readable minimum, then capped with "+N more".
  const listTop = 350;
  const listBottom = 890;
  const MAX = 66;
  const MIN = 30;
  let size = MIN;
  let layout: ReturnType<typeof flow> | null = null;
  let hidden = 0;
  for (let s = MAX; s >= MIN; s -= 2) {
    const trial = flow(ctx, names, s, left, width, listTop);
    if (trial.bottom <= listBottom) { size = s; layout = trial; break; }
  }
  if (!layout) {
    // Even the smallest size does not fit them all: keep as many as fit and add a "+N more" pill.
    for (let count = names.length - 1; count >= 1 && !layout; count--) {
      const trial = flow(ctx, [...names.slice(0, count), `+${names.length - count} more`], MIN, left, width, listTop);
      if (trial.bottom <= listBottom) { layout = trial; hidden = names.length - count; }
    }
    if (!layout) layout = flow(ctx, [names[0]], MIN, left, width, listTop);
  }

  ctx.font = `600 ${size}px ${FONT}`;
  ctx.textBaseline = 'middle';
  // Short lists sit a little lower, so the card does not look top-heavy; long ones already fill the space.
  const drop = Math.min(110, Math.max(0, Math.round((listBottom - layout.bottom) / 2)));
  const placedPills = layout.placed.map((p) => ({ ...p, y: p.y + drop }));
  placedPills.forEach((p, i) => {
    const isMore = hidden > 0 && i === placedPills.length - 1;
    ctx.fillStyle = isMore ? 'rgba(0,0,0,0)' : i % 2 ? pillB : pillA;
    roundRect(ctx, p.x, p.y, p.w, p.h, p.h / 2);
    ctx.fill();
    if (isMore) { ctx.lineWidth = 3; ctx.strokeStyle = accent; ctx.stroke(); }
    ctx.fillStyle = isMore ? dark : ink;
    ctx.fillText(p.text, p.x + Math.round(size * 0.55), p.y + p.h / 2 + 1);
  });

  // Footer: a divider and the site address, so the card leads back to the tool even without the shared link.
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left, 930);
  ctx.lineTo(SIZE - left, 930);
  ctx.stroke();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = soft;
  ctx.font = `600 32px ${FONT}`;
  ctx.fillText('Made with', left, 985);
  const madeWith = ctx.measureText('Made with ').width;
  ctx.fillStyle = dark;
  ctx.font = `800 32px ${FONT}`;
  ctx.fillText('namejoiner.com', left + madeWith, 985);

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not create the image');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `namejoiner-${slug}-favorites.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
