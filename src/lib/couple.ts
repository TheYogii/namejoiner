/**
 * Vibe layer for the Couple Name Combiner. It re-ranks the pool that combine.ts already builds and never changes
 * how the engine scores anything, so choosing no vibe gives exactly the same results as calling combine.ts directly.
 * A vibe adds a bounded score adjustment, reorders which techniques lead, and in two cases drops unsuitable results.
 * Pronounceability stays the floor: a vibe can reorder good blends but cannot admit junk.
 */
import {
  generatePool, pickResults, letters, normalize, pronounceability,
  type Combo, type Style, type Technique, type TechniqueNudges,
} from './combine';

export type Vibe = 'any' | 'romantic' | 'cute' | 'wedding' | 'ship' | 'unique';

export interface CoupleResult extends Combo {
  /** Overrides the technique tooltip, for results the vibe layer added itself. */
  label?: string;
  /** Short reason the result fits the chosen vibe, shown under the name. */
  reason?: string;
}

const LANE_CAP = 16;
const MAX_ADJUST = 35;
/** Smallest score lift that earns a reason label on a result. */
const BOOSTED = 8;

/* ---------- sound features ---------- */

const SOFT = new Set('aeiouylmnrvwfhs'.split(''));
const HARD = new Set('kptbdgxzqcj'.split(''));
const RARE = new Set('kzxvwyjq'.split(''));
const endsSoftly = (w: string) => /(ie|y|i)$/.test(w);
const endsOpen = (w: string) => /[aeiouy]$/.test(w) || /[lnmr]$/.test(w);

/** 0-1: how much of the word is soft, liquid or vowel sound. */
function softness(w: string): number {
  const ls = w.split('');
  return ls.length ? ls.filter((c) => SOFT.has(c)).length / ls.length : 0;
}

/** Counts back-to-back hard stops (kt, pd, gx), which read as harsh. */
const hardRuns = (w: string) => (w.match(/[kptbdgxzqcj]{2,}/g) ?? []).length;

const flowAdjust = (w: string) => {
  const soft = (softness(w) - 0.55) * 60;
  return Math.max(-15, Math.min(20, soft)) + (endsSoftly(w) || /[aeo]$/.test(w) ? 8 : endsOpen(w) ? 5 : 0) - Math.min(12, hardRuns(w) * 6);
};

const rarity = (w: string) => w.split('').filter((c) => RARE.has(c)).length;

/** Very common English letter pairs. A blend built from few of these has an unusual, distinctive shape. */
const COMMON_PAIRS = new Set(
  'th he in er an re on at en nd ti es or te of ed is it al ar st to nt ng se ha as ou io le ve co me de hi ri ro ic ne ea ra ce li ch ll be ma si om ur ca el ta la ns di fo ho pe ec pr no ct us ac ot il tr ly nc et ut ss so rs un lo wa ge ie'.split(' '),
);

/** 0-1: the share of letter pairs that are not among the common ones. */
function uncommonPairs(w: string): number {
  if (w.length < 2) return 0;
  let odd = 0;
  for (let i = 0; i < w.length - 1; i++) if (!COMMON_PAIRS.has(w.slice(i, i + 2))) odd++;
  return odd / (w.length - 1);
}

/* ---------- per-vibe rules ---------- */

interface Ctx {
  /** Lowercase letters of each input name. */
  a: string;
  b: string;
}

interface VibeRule {
  nudges: TechniqueNudges;
  /** Filter applied before ranking, so removed results never take a slot. */
  keep?: (name: string, technique: Technique) => boolean;
  adjust: (w: string, technique: Technique, ctx: Ctx) => number;
  reason: (w: string, technique: Technique, ctx: Ctx) => string | undefined;
}

const RULES: Record<Exclude<Vibe, 'any'>, VibeRule> = {
  romantic: {
    nudges: { portmanteau: 2, reverse: 2, syllable: 2 },
    adjust: (w, t) => flowAdjust(w) + (t === 'compound' ? -12 : 0),
    reason: (w, t) => (t !== 'compound' && softness(w) >= 0.62 && hardRuns(w) === 0 ? 'soft, flowing' : undefined),
  },
  cute: {
    nudges: { portmanteau: 1 },
    adjust: (w) => {
      const n = w.length;
      const shortness = n <= 5 ? 16 : n === 6 ? 12 : n === 7 ? 6 : n === 8 ? 0 : -4 * (n - 8);
      return shortness + (endsSoftly(w) ? 14 : /[aeo]$/.test(w) ? 6 : 0);
    },
    reason: (w) => (w.length <= 6 && endsSoftly(w) ? 'short and soft' : w.length <= 6 ? 'short and sweet' : undefined),
  },
  wedding: {
    nudges: {},
    keep: (name) => !name.includes('-'),
    adjust: (w, t) => {
      const n = w.length;
      const size = n >= 6 && n <= 12 ? 0 : n < 5 ? -10 : n < 6 ? -4 : -4 * (n - 12);
      const clean = Math.min(10, Math.max(0, (pronounceability(w) - 80) / 2));
      const lookalike = (w.match(/rn|vv|cl(?=[aeiou])/g) ?? []).length * -6;
      return size + clean + lookalike + (t === 'compound' ? 8 : 0);
    },
    reason: (w) => (w.length >= 6 && w.length <= 12 && hardRuns(w) === 0 && !/rn|vv/.test(w) ? 'hashtag-ready' : undefined),
  },
  ship: {
    nudges: { portmanteau: 3, reverse: 3, syllable: 1 },
    adjust: (w, t, { a, b }) => {
      const both = (n: number) => (w.startsWith(a.slice(0, n)) && w.endsWith(b.slice(-n))) || (w.startsWith(b.slice(0, n)) && w.endsWith(a.slice(-n)));
      const recognisable = both(3) ? 8 : both(2) ? 4 : 0;
      return (t === 'pooling' ? -12 : t === 'overlap' ? -8 : t === 'compound' ? -10 : 0) + recognisable + (w.length < 5 ? -12 : 0);
    },
    reason: (_w, t) => (t === 'portmanteau' || t === 'reverse' ? 'classic blend' : undefined),
  },
  unique: {
    nudges: { pooling: 3, overlap: 3, syllable: 1 },
    keep: (name, technique) => technique !== 'compound' && !name.includes('-'),
    adjust: (w, t) => Math.min(18, rarity(w) * 6) + Math.round(uncommonPairs(w) * 32) + (t === 'pooling' || t === 'overlap' ? 6 : t === 'syllable' ? 3 : 0),
    reason: (w, t) => (rarity(w) >= 1 ? 'rarer letters' : uncommonPairs(w) >= 0.5 ? 'uncommon pattern' : t === 'pooling' || t === 'overlap' || t === 'syllable' ? 'distinctive blend' : undefined),
  },
};

/* ---------- Cute: softened short blends ---------- */

/** Short blends given a friendly ending (Benni → Bennie). Cute only; they ride the syllable lane. */
function softened(pool: Combo[]): Combo[] {
  const out: Combo[] = [];
  const seen = new Set(pool.map((c) => c.name.toLowerCase()));
  const shorts = pool.filter((c) => c.technique !== 'compound' && letters(c.name).length >= 3 && letters(c.name).length <= 5 && !endsSoftly(c.name.toLowerCase()));
  for (const c of shorts.slice(0, 8)) {
    const w = c.name.toLowerCase();
    const base = /[aeo]$/.test(w) ? w.slice(0, -1) : w;
    for (const end of ['ie', 'y']) {
      const name = base.charAt(0).toUpperCase() + base.slice(1) + end;
      const id = name.toLowerCase();
      if (seen.has(id) || pronounceability(name) < 70 || letters(name).length > 8) continue;
      seen.add(id);
      out.push({ name, technique: 'syllable', score: c.score - 2 });
    }
  }
  return out;
}

/* ---------- public API ---------- */

/**
 * Builds the candidate pool for a pair of names under a vibe.
 * With no vibe this is exactly generatePool's default pool.
 */
export function buildCouplePool(name1: string, name2: string, vibe: Vibe, extraKeep?: (name: string, technique: Technique) => boolean): CoupleResult[] {
  if (vibe === 'any') return extraKeep ? generatePool(name1, name2, { keep: extraKeep }) : generatePool(name1, name2);

  const rule = RULES[vibe];
  const ctx: Ctx = { a: letters(normalize(name1)).toLowerCase(), b: letters(normalize(name2)).toLowerCase() };
  const base: CoupleResult[] = generatePool(name1, name2, {
    laneCap: LANE_CAP,
    keep: rule.keep || extraKeep ? (n, t) => (rule.keep?.(n, t) ?? true) && (extraKeep?.(n, t) ?? true) : undefined,
  });
  const extra: CoupleResult[] = vibe === 'cute' ? softened(base).map((c) => ({ ...c, label: 'Softened blend' })) : [];

  return [...base, ...extra].map((c) => {
    const w = letters(c.name).toLowerCase();
    const delta = Math.max(-MAX_ADJUST, Math.min(MAX_ADJUST, rule.adjust(w, c.technique, ctx)));
    // Only label results the vibe really lifted, so the note stays a signal and not noise on every pill.
    return { ...c, score: c.score + delta, reason: delta >= BOOSTED ? rule.reason(w, c.technique, ctx) : undefined };
  });
}

/** Picks 12-20 results for a length filter, leading with the techniques the vibe favors. */
export function pickCouple(pool: CoupleResult[], style: Style, vibe: Vibe): CoupleResult[] {
  return pickResults(pool, style, 20, 12, vibe === 'any' ? {} : RULES[vibe].nudges) as CoupleResult[];
}

