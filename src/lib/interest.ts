/**
 * Two-word username builder: blends the person's base word with an interest or theme word, using the same
 * combine.ts blending engine as the Couple, Baby and Business tools. It is only used when both fields are filled;
 * with an empty interest the Username Generator runs the single-word engine in handles.ts exactly as before.
 */
import { pronounceability, syllabify } from './combine';
import { buildCouplePool, type Vibe } from './couple';
import { evaluateHandle, toHandleBase, type Constraints, type Handle, type StyleConfig } from './handles';

export type InterestStyle = 'cute' | 'aesthetic' | 'unique' | 'random';

/** Each username style leans on the Couple vibe that suits it. Random draws from all three. */
const VIBES: Record<InterestStyle, Vibe[]> = {
  cute: ['cute'],
  aesthetic: ['romantic'],
  unique: ['unique'],
  random: ['cute', 'romantic', 'unique'],
};

export interface InterestOptions {
  count?: number;
  random?: (() => number) | null;
  constraints?: Constraints;
}

/** The word itself and, for longer words, a short form: "soccer" → "soc", "sarah" → "sar". */
function forms(word: string): string[] {
  if (word.length <= 4) return [word];
  const syl = syllabify(word);
  const short = syl[0].length >= 3 ? syl[0] : syl.slice(0, 2).join('');
  return short.length >= 3 && short.length < word.length ? [word, short] : [word];
}

/** True when the result starts like one word and ends like the other, each for at least three letters. */
function recognisable(name: string, a: string, b: string): boolean {
  const head = (w: string) => w.slice(0, Math.min(3, w.length));
  const tail = (w: string) => w.slice(-Math.min(3, w.length));
  return (name.startsWith(head(a)) && name.endsWith(tail(b))) || (name.startsWith(head(b)) && name.endsWith(tail(a)));
}

/** Builds up to `count` handles from a base word and an interest word. Returns [] if either has fewer than two letters. */
export function buildInterestHandles(
  rawBase: string, rawInterest: string, style: InterestStyle, config: StyleConfig,
  { count = 20, random = null, constraints = {} }: InterestOptions = {},
): Handle[] {
  const base = toHandleBase(rawBase);
  const interest = toHandleBase(rawInterest);
  if (base.length < 2 || interest.length < 2) return [];

  const found = new Map<string, Handle>();
  const add = (name: string, technique: Handle['technique'], bonus: number) => {
    if (found.has(name) || name === interest) return;
    const score = evaluateHandle(name, base, config, constraints);
    if (score !== null) found.set(name, { name, technique, score: score + bonus });
  };

  // Blends of the two words. Hyphens are not valid in handles, so those results are dropped before ranking.
  for (const vibe of VIBES[style]) {
    for (const c of buildCouplePool(base, interest, vibe, (n) => !n.includes('-'))) {
      const name = c.name.toLowerCase().replace(/[^a-z]/g, '');
      // The vibe layer's own adjustment carries over in a small dose, so its taste still shows.
      const taste = Math.max(-8, Math.min(8, (c.score - 60) / 8));
      if (c.technique === 'compound') add(name, 'pair', taste);
      // A blend has to keep the front of one word and the ending of the other, or it reads as noise (sacer, saraer).
      else if (recognisable(name, base, interest) && pronounceability(name) >= 75) add(name, 'blend', taste);
    }
  }

  // Joins of the two words, whole or shortened, with the style's separators: sarah_soccer, sar.soccer, soccer.sarah.
  for (const b of forms(base)) {
    for (const i of forms(interest)) {
      const whole = b === base && i === interest;
      for (const sep of ['', ...config.separators.filter(Boolean)]) {
        // Whole words with a separator read best, so they get the biggest boost.
        const bonus = whole ? (sep ? 10 : 2) : sep ? 6 : 0;
        for (const joined of [b + sep + i, i + sep + b]) {
          add(joined, 'pair', bonus);
          if (whole) config.numberTails.forEach((tail) => add(joined + tail, 'pair', bonus - 8));
        }
      }
    }
  }

  const lanes = (['blend', 'pair'] as const).map((t) => [...found.values()].filter((h) => h.technique === t));
  for (const lane of lanes) {
    if (random) lane.sort(() => random() - 0.5);
    else lane.sort((a, b) => b.score - a.score);
  }
  const picked: Handle[] = [];
  for (let round = 0; picked.length < count && lanes.some((l) => l.length > round); round++) {
    for (const lane of lanes) if (lane[round] && picked.length < count) picked.push(lane[round]);
  }
  return picked;
}
