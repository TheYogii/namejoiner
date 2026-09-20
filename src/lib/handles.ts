/**
 * Shared handle engine: turns a base word plus a style's word lists into usernames.
 * Lists live in wordlists.ts as data, so another tool (a gamertag generator, say) can pass its own lists
 * and reuse the same techniques, scoring and length handling.
 */
import { generatePool, pronounceability, syllabify } from './combine';

export type HandleTechnique = 'prefix' | 'suffix' | 'pair' | 'blend' | 'number' | 'twist';

export interface StyleConfig {
  label: string;
  prefixes: string[];
  suffixes: string[];
  /** Standalone words, joined to the base with a separator or blended into it. */
  words: string[];
  /** Separators tried between the base and a whole word. '' means no separator. */
  separators: string[];
  /** Short digit tails such as "07". Leave empty for none. */
  numberTails: string[];
  /** Letter-level twists: reversed syllables, k/z spellings. */
  twists: boolean;
  /** Blend the base with list words using the shared combine.ts engine. */
  blends: boolean;
  /** Longest handle to return. Defaults to 30. */
  maxLength?: number;
  /** Length up to which a handle gets the full length bonus. Defaults to 15. */
  idealLength?: number;
}

/**
 * Optional per-call limits, such as a platform's rules. Anything left out falls back to the style's own settings,
 * so calling buildHandles without constraints behaves exactly as it always has.
 */
export interface Constraints {
  min?: number;
  max?: number;
  ideal?: number;
  /** false drops any handle containing an underscore. */
  allowUnderscore?: boolean;
  /** false drops any handle containing a period. */
  allowPeriod?: boolean;
  /** Most underscores a handle may contain. */
  maxUnderscores?: number;
  /** Small score bonuses for techniques that are conventional on the platform. They reorder results and never filter them. */
  nudges?: Partial<Record<HandleTechnique, number>>;
}

export interface Handle {
  name: string;
  technique: HandleTechnique;
  score: number;
}

export const TECHNIQUE_LABEL: Record<HandleTechnique, string> = {
  prefix: 'Word + your name',
  suffix: 'Your name + word',
  pair: 'Word pairing',
  blend: 'Blended with a word',
  number: 'Number tail',
  twist: 'Spelling twist',
};

/** Results per generation. The word lists hold enough distinct words to fill this without leaning on one word repeatedly. */
const DEFAULT_COUNT = 30;
/** Most Word-pairing results that may reuse the same list word (luna_honey and honey_luna count as two), so one word never fills the list. */
const PAIR_PER_WORD = 2;
const DEFAULT_MAX_LENGTH = 30;
const DEFAULT_IDEAL_LENGTH = 15;
const MIN_PRONOUNCEABILITY = 60;
const BLOCKED = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'rape', 'porn', 'sex', 'dick', 'slut', 'whore', 'bitch', 'nazi'];
const ORDER: HandleTechnique[] = ['prefix', 'suffix', 'pair', 'blend', 'twist', 'number'];

/** Lowercase A-Z only, since handles must be plain ASCII. Returns '' when nothing usable is left. */
export function toHandleBase(raw: string): string {
  return raw.trim().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '');
}

/** Longer names also get a short form, so "christopher" can become "chris". */
function baseForms(base: string): string[] {
  if (base.length <= 7) return [base];
  const syl = syllabify(base);
  let short = syl[0];
  for (let i = 1; i < syl.length && short.length < 4; i++) short += syl[i];
  return short.length >= 3 && short.length < base.length ? [base, short] : [base];
}

const validShape = (name: string) => /^[a-z0-9]/.test(name) && /[a-z0-9]$/.test(name) && !/[._]{2}/.test(name) && /^[a-z0-9._]+$/.test(name);

/** Pronounceability of each separated chunk, judged on its own. */
function chunkPronounceability(name: string): number {
  const chunks = name.split(/[._\d]+/).filter((c) => c.length >= 2);
  return chunks.length ? Math.min(...chunks.map(pronounceability)) : 0;
}

function twists(base: string): string[] {
  const out = new Set<string>();
  const syl = syllabify(base);
  if (syl.length >= 2) out.add(syl.slice().reverse().join(''));
  if (/c(?![eiy])/.test(base)) out.add(base.replace(/c(?![eiy])/g, 'k'));
  if (/s$/.test(base)) out.add(base.replace(/s$/, 'z'));
  if (/ph/.test(base)) out.add(base.replace(/ph/g, 'f'));
  if (/[aeiou]$/.test(base)) out.add(base + 'x');
  out.delete(base);
  return [...out];
}

export interface GenerateOptions {
  count?: number;
  /** Pass Math.random-style function to shuffle instead of ranking. Used by the Random style. */
  random?: (() => number) | null;
  constraints?: Constraints;
}

/**
 * Checks one finished handle against a style's and platform's rules and returns its base score, or null if it is not acceptable.
 * Shared by buildHandles and the two-word interest builder, so both apply exactly the same rules.
 */
export function evaluateHandle(name: string, base: string, config: StyleConfig, constraints: Constraints = {}): number | null {
  const maxLength = Math.min(config.maxLength ?? DEFAULT_MAX_LENGTH, constraints.max ?? Infinity);
  const ideal = constraints.ideal ?? config.idealLength ?? DEFAULT_IDEAL_LENGTH;
  const minLength = constraints.min ?? 0;
  const maxUnderscores = constraints.allowUnderscore === false ? 0 : constraints.maxUnderscores ?? Infinity;
  if (!validShape(name) || name.length > maxLength || name.replace(/[._\d]/g, '').length < 3) return null;
  if (name === base) return null;
  if (name.length < minLength || (name.match(/_/g)?.length ?? 0) > maxUnderscores) return null;
  if (constraints.allowPeriod === false && name.includes('.')) return null;
  if (BLOCKED.some((term) => name.includes(term) && !base.includes(term))) return null;
  const pron = chunkPronounceability(name);
  if (pron < MIN_PRONOUNCEABILITY) return null;
  const fit = name.length <= ideal ? 18 : name.length <= maxLength * 0.8 ? 8 : -4;
  const tooShort = name.length < 5 ? -10 : 0;
  return pron + fit + tooShort;
}

/** Builds up to `count` handles for one base word from a style's lists, best-first and varied across techniques. */
export function buildHandles(rawBase: string, config: StyleConfig, { count = DEFAULT_COUNT, random = null, constraints = {} }: GenerateOptions = {}): Handle[] {
  const base = toHandleBase(rawBase);
  if (base.length < 2) return [];

  const found = new Map<string, Handle>();
  const pairWord = new Map<string, string>();
  const add = (name: string, technique: HandleTechnique, bonus = 0) => {
    if (found.has(name)) return;
    const base_ = evaluateHandle(name, base, config, constraints);
    if (base_ === null) return;
    found.set(name, { name, technique, score: base_ + bonus + (constraints.nudges?.[technique] ?? 0) });
  };

  for (const b of baseForms(base)) {
    config.prefixes.forEach((p) => add(p + b, 'prefix'));
    config.suffixes.forEach((s) => add(b + s, 'suffix'));
    for (const w of config.words) {
      for (const sep of config.separators) {
        add(b + sep + w, 'pair', sep ? 4 : 0);
        add(w + sep + b, 'pair', sep ? 4 : 0);
        pairWord.set(b + sep + w, w);
        pairWord.set(w + sep + b, w);
      }
    }
    if (config.blends) {
      // Base-first blends only, and the base must stay recognisable at the front with the word's ending intact.
      const head = b.slice(0, Math.min(3, b.length));
      for (const w of config.words) {
        const blends = generatePool(b, w, { minPool: 6, keep: (n, t) => t !== 'compound' && !n.includes('-') && n.length >= 5 && n.length <= 12 });
        blends
          .filter((c) => c.name.toLowerCase().startsWith(head) && c.name.toLowerCase().endsWith(w.slice(-2)) && pronounceability(c.name) >= 75)
          .slice(0, 2)
          .forEach((c) => add(c.name.toLowerCase(), 'blend', 2));
      }
    }
    if (config.twists) twists(b).forEach((t) => add(t, 'twist', 6));
    config.numberTails.forEach((n) => add(b + n, 'number', -6));
  }

  // Techniques a platform favours lead each round and get an extra pick, so its conventions show up near the top.
  const nudge = (t: HandleTechnique) => constraints.nudges?.[t] ?? 0;
  const order = ORDER.slice().sort((x, y) => nudge(y) - nudge(x));
  const lanes = order.map((t) => ({
    picks: nudge(t) >= 3 ? 2 : 1,
    items: [...found.values()].filter((h) => h.technique === t),
  }));
  for (const lane of lanes) {
    if (random) lane.items.sort(() => random() - 0.5);
    else lane.items.sort((p, q) => q.score - p.score);
  }

  const picked: Handle[] = [];
  const cursor = lanes.map(() => 0);
  const pairUses = new Map<string, number>();
  const pairIndex = order.indexOf('pair');
  while (picked.length < count && lanes.some((l, i) => cursor[i] < l.items.length)) {
    lanes.forEach((lane, i) => {
      for (let n = 0; n < lane.picks && picked.length < count && cursor[i] < lane.items.length; n++) {
        const item = lane.items[cursor[i]++];
        if (i === pairIndex) {
          const word = pairWord.get(item.name) ?? item.name;
          const used = pairUses.get(word) ?? 0;
          if (used >= PAIR_PER_WORD) { n--; continue; }
          pairUses.set(word, used + 1);
        }
        picked.push(item);
      }
    });
  }
  return picked;
}

export interface FitTier {
  /** Longest handle, in characters, that this tier covers. */
  max: number;
  label: string;
}

/** Short label for which platforms a handle's length suits, from a list of tiers ordered shortest first. */
export function fitLabel(length: number, tiers: FitTier[], over = 'too long'): string {
  return tiers.find((t) => length <= t.max)?.label ?? over;
}

/** Social limits: X and Snapchat 15, TikTok 24, Instagram 30. Platforms change their rules. */
export const SOCIAL_FIT: FitTier[] = [
  { max: 15, label: 'fits every platform' },
  { max: 24, label: 'TikTok and Instagram' },
  { max: 30, label: 'Instagram only' },
];

export const platformFit = (length: number) => fitLabel(length, SOCIAL_FIT);
