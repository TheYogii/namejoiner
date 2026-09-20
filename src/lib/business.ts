/**
 * Business-name layer on top of the shared blending engine in combine.ts.
 * Blends come from the engine, minus anything unsuited to a domain (hyphens, very long names).
 * Compounds are built here: simple joins of the two words, plus joins with common brand prefixes and suffixes.
 */
import { generatePool, pickResults, normalize, letters, pronounceability, type Combo } from './combine';

export type BizStyle = 'all' | 'short' | 'brandable' | 'compound';
export type BizTechnique = Combo['technique'] | 'affix';

export interface BizResult {
  name: string;
  kind: 'brandable' | 'compound';
  technique: BizTechnique;
  score: number;
}

export const PREFIXES = ['Get', 'Try', 'Go'];
export const SUFFIXES = ['Labs', 'Hub', 'HQ', 'Works', 'Studio', 'Co', 'Kit'];

export const BIZ_TECHNIQUE_LABEL: Record<BizTechnique, string> = {
  portmanteau: 'Portmanteau',
  reverse: 'Reverse portmanteau',
  syllable: 'Syllable mix',
  pooling: 'Letter pooling',
  overlap: 'Shared sound',
  compound: 'Simple join',
  affix: 'Brand prefix or suffix',
};

export interface BizPool {
  brandable: BizResult[];
  compound: BizResult[];
}

const MAX_COMPOUND_LETTERS = 16;
const PER_AFFIX_CAP = 3;

/** Blends for brand names: 4-12 letters, no hyphens, and no result that just contains a whole word (that is a compound). */
function brandableBlends(word1: string, word2: string): BizResult[] {
  const keys = [word1, word2].map((w) => letters(normalize(w)).toLowerCase());
  const pool = generatePool(word1, word2, {
    minPool: 14,
    keep: (name, technique) => {
      const k = letters(name).toLowerCase();
      return technique !== 'compound' && !name.includes('-') && k.length >= 4 && k.length <= 12 && !keys.some((w) => w.length >= 4 && k.includes(w));
    },
  });
  return pool.map((c) => ({ name: c.name, kind: 'brandable', technique: c.technique, score: c.score }));
}

/** Joins of the two words, and joins or single words with brand prefixes and suffixes. */
function compoundNames(word1: string, word2: string): (BizResult & { group: string })[] {
  const a = normalize(word1);
  const b = normalize(word2);
  const out: (BizResult & { group: string })[] = [];
  const add = (name: string, technique: BizTechnique, group: string, base: number) => {
    const len = letters(name).length;
    if (len > MAX_COMPOUND_LETTERS) return;
    const pron = pronounceability(name);
    if (technique === 'affix' && pron < 60) return;
    out.push({ name, kind: 'compound', technique, group, score: base + pron / 10 - 4 * Math.max(0, len - 11) });
  };

  const joins = [a + b, b + a];
  joins.forEach((j) => add(j, 'compound', 'join', 70));
  for (const s of SUFFIXES) {
    joins.forEach((j) => add(j + s, 'affix', s, 55));
    [a, b].forEach((w) => add(w + s, 'affix', s, 58));
  }
  for (const p of PREFIXES) {
    joins.forEach((j) => add(p + j, 'affix', p, 52));
    [a, b].forEach((w) => add(p + w, 'affix', p, 56));
  }
  return out;
}

/** Best-first compounds, with a cap per prefix/suffix so one affix doesn't fill the list. */
function pickCompound(list: (BizResult & { group: string })[], max: number): BizResult[] {
  const used = new Map<string, number>();
  const picked: BizResult[] = [];
  const seen = new Set<string>();
  for (const c of list.slice().sort((p, q) => q.score - p.score)) {
    const n = used.get(c.group) ?? 0;
    const key = c.name.toLowerCase();
    if (seen.has(key) || n >= (c.group === 'join' ? 2 : PER_AFFIX_CAP)) continue;
    used.set(c.group, n + 1);
    seen.add(key);
    picked.push(c);
    if (picked.length >= max) break;
  }
  return picked;
}

/** Builds the candidate pool once per pair of words. */
export function businessPool(word1: string, word2: string): BizPool {
  const inputs = new Set([word1, word2].map((w) => normalize(w).toLowerCase()));
  const compound = compoundNames(word1, word2).filter((c) => !inputs.has(c.name.toLowerCase()));
  return { brandable: brandableBlends(word1, word2), compound: pickCompound(compound, 24) };
}

const len = (r: BizResult) => letters(r.name).length;

/** Picks up to 24 results for a style: Short (4-6 letters), Brandable (5+ letter blends) or Compound. */
export function pickBusiness(pool: BizPool, style: BizStyle, max = 24, min = 12): BizResult[] {
  const blends = (list: BizResult[], count: number) => pickResults(list as Combo[], 'all', count, Math.min(min, count)) as BizResult[];

  if (style === 'compound') return pool.compound.slice(0, max);

  if (style === 'short') {
    const short = blends(pool.brandable.filter((r) => len(r) <= 6), max);
    if (short.length >= min) return short;
    const have = new Set(short.map((r) => r.name));
    const rest = pool.brandable.filter((r) => !have.has(r.name)).sort((p, q) => len(p) - len(q) || q.score - p.score);
    return [...short, ...rest].slice(0, min);
  }

  // Four-letter blends are often accidental real words (Bash, Left), so Brandable and All start at five letters.
  const fiveUp = pool.brandable.filter((r) => len(r) >= 5);
  const brandable = fiveUp.length >= 8 ? fiveUp : pool.brandable;
  if (style === 'brandable') return blends(brandable, max);

  // all: mostly blends, with a few compounds for contrast
  const compoundShare = Math.min(pool.compound.length, 6);
  const mixed = blends(brandable, max - compoundShare);
  return [...mixed, ...pool.compound.slice(0, max - mixed.length)];
}
