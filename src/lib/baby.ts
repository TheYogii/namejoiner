/**
 * Baby-name layer on top of the shared blending engine in combine.ts.
 * Adds sibling-style matching, middle-name mode and a sound-preference filter.
 */
import { generatePool, pickResults, syllabify, normalize, validateName, letters, type Combo } from './combine';

export type Lean = 'any' | 'neutral' | 'feminine' | 'masculine';
export type MiddleParent = null | 1 | 2;

export interface BabyOptions {
  middleParent: MiddleParent;
  /** Already-validated, normalised sibling names. */
  siblings: string[];
  lean: Lean;
}

export interface BabyResult {
  key: string;
  first: string;
  middle?: string;
  /** What gets copied, e.g. "Adihan Rohan". */
  full: string;
  /** Syllable breaks for pronunciation, e.g. "A·di·han". */
  syllables: string;
  technique: Combo['technique'];
}

export const MAX_SIBLINGS = 4;
const MIN_RESULTS = 12;

/** Parses "Maya, Nora" into up to MAX_SIBLINGS validated names; extras are ignored. */
export function parseSiblings(raw: string): { names: string[]; error: string | null } {
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean).slice(0, MAX_SIBLINGS);
  for (const part of parts) {
    if (validateName(part)) return { names: [], error: `“${part}” doesn’t look like a name. Use letters only, separated by commas.` };
  }
  return { names: parts.map(normalize), error: null };
}

/**
 * Blend candidates for first names. Plain joins like "AditiRohan" read as two names, and very long or
 * doubled-vowel results ("Riysaa") make poor first names, so those are dropped.
 */
export function babyPool(parent1: string, parent2: string): Combo[] {
  const keys = [parent1, parent2].map((p) => letters(normalize(p)).toLowerCase());
  return generatePool(parent1, parent2, {
    minPool: 14,
    keep: (name, technique) => {
      const k = letters(name).toLowerCase();
      // Only a whole parent name of 4+ letters marks a glued name (Ryansabel); Ben inside Bennifer is a genuine blend.
      return technique !== 'compound' && k.length >= 3 && k.length <= 9 && !/([aiuy])\1/.test(k) && !keys.some((n) => n.length >= 4 && k.includes(n));
    },
  });
}

/* ---------- sound helpers ---------- */

const endsInVowel = (w: string) => /[aeiouy]$/.test(w);

/** The last syllable minus its opening consonants: "Aiden" → "en", "Maya" → "a". */
function rime(name: string): string {
  const last = syllabify(name).pop() ?? name.toLowerCase();
  return last.replace(/^[^aeiouy]+/, '') || last;
}

/**
 * Rough ending-sound lean, based on common endings, used as a preference and never as a rule.
 * Feminine-leaning: -a, -ah, -ia, -elle, -ette, -ine, -lyn, -ee. Masculine-leaning: -o and most consonant endings.
 */
export function soundLean(name: string): Exclude<Lean, 'any'> {
  const w = name.toLowerCase();
  if (/(a|ah|ia|elle|ette|ine|lyn|ee)$/.test(w)) return 'feminine';
  if (/(o|ck|[bdgkmnprstxz])$/.test(w)) return 'masculine';
  return 'neutral';
}


const display = (name: string) => {
  const parts = syllabify(name);
  parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  return parts.join('·');
};

/* ---------- sibling matching ---------- */

/** Nudges scores toward the siblings' typical syllable count and ending sound. Never removes results. */
export function rerankForSiblings(pool: Combo[], siblings: string[]): Combo[] {
  if (!siblings.length) return pool;
  const counts = siblings.map((s) => syllabify(s).length);
  const target = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
  const rimes = siblings.map((s) => rime(s));
  const finals = siblings.map((s) => s.toLowerCase().slice(-1));
  const vowelEndings = siblings.filter((s) => endsInVowel(s.toLowerCase())).length;
  const vowelLean = vowelEndings * 2 >= siblings.length;
  const taken = new Set(siblings.map((s) => s.toLowerCase()));

  return pool
    .filter((c) => !taken.has(c.name.toLowerCase()))
    .map((c) => {
      const w = c.name.toLowerCase();
      const gap = Math.min(2, Math.abs(syllabify(c.name).length - target));
      let bonus = 30 - 15 * gap;
      if (rimes.includes(rime(c.name))) bonus += 45;
      else if (finals.includes(w.slice(-1))) bonus += 20;
      else if (endsInVowel(w) === vowelLean) bonus += 10;
      return { ...c, score: c.score + bonus };
    });
}

/* ---------- filtering & output ---------- */

/** Keeps names matching the preferred lean, topping up from the best of the rest so the list never runs thin. */
function applyLean(pool: Combo[], lean: Lean): Combo[] {
  if (lean === 'any') return pool;
  const preferred = pool.filter((c) => soundLean(c.name) === lean);
  if (preferred.length >= MIN_RESULTS) return preferred;
  const rest = pool.filter((c) => soundLean(c.name) !== lean).sort((p, q) => q.score - p.score);
  return [...preferred, ...rest.slice(0, MIN_RESULTS - preferred.length)];
}

/**
 * Builds the final result list from a pool.
 * In middle-name mode the chosen parent's name stays whole and first names come from the blends.
 */
export function babyResults(pool: Combo[], parent1: string, parent2: string, opts: BabyOptions): BabyResult[] {
  const middle = opts.middleParent ? normalize(opts.middleParent === 1 ? parent1 : parent2) : undefined;
  const middleKey = middle ? letters(middle).toLowerCase() : '';

  let candidates = pool;
  if (middle) {
    candidates = candidates.filter((c) => {
      const k = letters(c.name).toLowerCase();
      const sameStart = middleKey.length > 3 && k.slice(0, 3) === middleKey.slice(0, 3);
      return !k.includes(middleKey) && !middleKey.includes(k) && !sameStart;
    });
  }
  candidates = rerankForSiblings(candidates, opts.siblings);
  candidates = applyLean(candidates, opts.lean);

  const picked = pickResults(candidates, 'all');
  // With sibling matching on, lead with the closest matches instead of technique variety.
  if (opts.siblings.length) picked.sort((p, q) => q.score - p.score);

  return picked.map((c) => ({
    key: `${c.name}|${middle ?? ''}`,
    first: c.name,
    middle,
    full: middle ? `${c.name} ${middle}` : c.name,
    syllables: middle ? `${display(c.name)}  ${display(middle)}` : display(c.name),
    technique: c.technique,
  }));
}
