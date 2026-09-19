/**
 * Aesthetic Unicode text for bios and display names. A separate step applied after names are generated, never mixed
 * into the blending logic. Usernames themselves must stay plain ASCII on every platform, so the plain text always
 * stays available alongside the stylized version.
 *
 * Every look is a code-point offset or an explicit table, so unstylize() can reverse it exactly for testing.
 */

export type Look = 'smallcaps' | 'script' | 'fullwidth';
export type StyleId = 'cute' | 'aesthetic' | 'unique' | 'random';

const A = 'abcdefghijklmnopqrstuvwxyz';

/** Small capitals. "x" has no small-capital glyph and "q" uses the closest one, so both are lossy but readable. */
const SMALL_CAPS = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ';

const shift = (base: number) => (ch: string) => String.fromCodePoint(base + (ch.charCodeAt(0) - 97));

const LOOKS: Record<Look, { letter: (c: string) => string; digit: (c: string) => string; punct: Record<string, string> }> = {
  smallcaps: { letter: (c) => [...SMALL_CAPS][A.indexOf(c)], digit: (c) => c, punct: {} },
  // Mathematical Bold Script has no gaps in its alphabet, unlike plain script.
  script: { letter: shift(0x1d4ea), digit: (c) => c, punct: {} },
  fullwidth: {
    letter: shift(0xff41),
    digit: (c) => String.fromCodePoint(0xff10 + Number(c)),
    punct: { '.': '．', _: '＿' },
  },
};

/** Text-presentation symbols only, since emoji glyphs render differently on every device. */
const DECORATION: Record<Look, [string, string]> = {
  smallcaps: ['⋆˚ ', ' ˚⋆'],
  script: ['♡ ', ' ♡'],
  fullwidth: ['✧ ', ' ✧'],
};

/** The look each style uses. Random varies it by name, so the same name always gets the same look. */
export function lookFor(style: StyleId, plain: string): Look {
  if (style === 'cute') return 'script';
  if (style === 'aesthetic') return 'smallcaps';
  if (style === 'unique') return 'fullwidth';
  const order: Look[] = ['smallcaps', 'script', 'fullwidth'];
  return order[[...plain].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % order.length];
}

/** Converts plain a-z, 0-9, dots and underscores. Anything else passes through untouched. */
export function applyLook(plain: string, look: Look): string {
  const rule = LOOKS[look];
  return [...plain.toLowerCase()].map((ch) => {
    if (ch >= 'a' && ch <= 'z') return rule.letter(ch);
    if (ch >= '0' && ch <= '9') return rule.digit(ch);
    return rule.punct[ch] ?? ch;
  }).join('');
}

/** The stylized version of a username, ready for a bio or display name. */
export function stylize(plain: string, style: StyleId): string {
  const look = lookFor(style, plain);
  const [open, close] = DECORATION[look];
  return `${open}${applyLook(plain, look)}${close}`;
}

/** Reverses stylize() back to plain text. Used to prove the stylized text never loses the original name. */
export function unstylize(styled: string): string {
  const out: string[] = [];
  const maps = (Object.keys(LOOKS) as Look[]).map((look) => {
    const rule = LOOKS[look];
    const table = new Map<string, string>();
    for (const c of A) table.set(rule.letter(c), c);
    for (const d of '0123456789') table.set(rule.digit(d), d);
    for (const [plainCh, fancy] of Object.entries(rule.punct)) table.set(fancy, plainCh);
    return table;
  });
  const decor = new Set(Object.values(DECORATION).flatMap((d) => [...d[0], ...d[1]]).filter((c) => c.trim()));
  for (const ch of [...styled]) {
    if (decor.has(ch) || ch === ' ') continue;
    const hit = maps.map((m) => m.get(ch)).find((v) => v !== undefined);
    out.push(hit ?? ch);
  }
  return out.join('');
}
