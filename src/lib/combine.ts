/**
 * Name blending logic for the Couple Name Combiner.
 * Pure functions, no DOM access, so it can be tested or reused by other tools.
 */

export type Technique = 'portmanteau' | 'reverse' | 'syllable' | 'pooling' | 'overlap' | 'compound';
export type Style = 'all' | 'short' | 'medium' | 'long';

export interface Combo {
  name: string;
  technique: Technique;
  score: number;
}

export const TECHNIQUE_LABEL: Record<Technique, string> = {
  portmanteau: 'Portmanteau',
  reverse: 'Reverse portmanteau',
  syllable: 'Syllable mix',
  pooling: 'Letter pooling',
  overlap: 'Shared sound',
  compound: 'Compound',
};

const VOWELS = new Set('aeiouàáâãäåæèéêëìíîïòóôõöøùúûüœ');
const DIGRAPH = /sh|ch|th|ph|kh|dh|bh|gh|wh/g;

/* Consonant-cluster tables used by the pronounceability check. "ʃ" stands for a digraph such as sh/ch/th. */
const ONSETS = new Set('bl br cl cr dr dw fl fr gl gr gw kl kr kn kw pl pr ps qu rh sc sk sl sm sn sp st sw tr tw vr wr'.split(' '));
/* Onsets that can follow another consonant inside a word (Ankle, Andrew); kn, ps, kw etc. only open a word. */
const MEDIAL_ONSETS = new Set('bl br cl cr dr fl fr gl gr kl kr pl pr sc sk sl sm sn sp st sw tr'.split(' '));
const START_TRIPLES = /^(str|spr|spl|scr|skr|skw|squ)/;
const CODAS = new Set('lb ld lf lk lm ln lp lt ls mp mb ms nd ng nk nt ns rb rc rd rf rk rl rm rn rp rs rt rv sk sp st ft pt ct ks ts ds ll ss ff tt rr nn mm'.split(' '));
const MEDIAL_OK = new Set('nj rj lj nc nv vn tn tm dm kt tv dv sv'.split(' '));
const MEDIAL_FIRST = new Set('nrlsmdtkpfx');
const HIATUS = new Set(['ia', 'io', 'iu', 'ua', 'uo', 'eo']);
const LADDER = [70, 64];
const FLOOR_POOL = 16;
const QUALITY_BAND = 45;

/* ---------- validation & normalising ---------- */

/** Returns an error message, or null when the value is a usable name. */
export function validateName(raw: string): string | null {
  const v = raw.trim();
  if (!v) return 'Enter a name to continue.';
  if (!/^\p{Script=Latin}+$/u.test(v)) return 'Use letters only, with no spaces, numbers or symbols.';
  if (v.length < 2) return 'Names need at least two letters.';
  return null;
}

export function normalize(raw: string): string {
  const v = raw.trim().normalize('NFC').toLowerCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
export const letters = (s: string) => s.replace(/[^\p{L}]/gu, '');

/* ---------- phonetic helpers ---------- */

/**
 * y is a consonant at the start of a word or as a glide between vowels (Pri-ya, Ma-ya, Yara),
 * and a vowel otherwise (Ryan, Kyle, Kayla).
 */
function isVowelAt(s: string, i: number): boolean {
  const c = s[i];
  if (VOWELS.has(c)) return true;
  if (c !== 'y' || i === 0) return false;
  const glide = VOWELS.has(s[i - 1]) && i + 1 < s.length && VOWELS.has(s[i + 1]);
  return !glide;
}

/** True when the vowel at i starts a new syllable nucleus instead of extending the one before it. */
function startsNewNucleus(w: string, i: number): boolean {
  if (i < 1) return false;
  const prev = w[i - 1];
  // consonant + y + vowel: y is its own nucleus (Ry-an, Bry-an, Ky-ara)
  if (prev === 'y' && i >= 2 && !VOWELS.has(w[i - 2])) return true;
  // vowel pairs that are usually two syllables (Di-a-na, Le-o, Mi-a)
  if (HIATUS.has(prev + w[i])) return true;
  // Noah, Leah: the -oah / -eah ending
  return /^(oa|ea)h$/.test(w.slice(i - 1) ) && i + 2 === w.length;
}

/** Splits a consonant cluster into sound units, keeping digraphs like "sh" together. */
function consonantUnits(cluster: string): string[] {
  return cluster.match(/sh|ch|th|ph|kh|dh|bh|gh|wh|./g) ?? [];
}

/**
 * Approximate syllables using vowel boundaries:
 * V-CV when one consonant sits between vowels, VC-CV when two or more do.
 */
export function syllabify(word: string): string[] {
  const w = word.toLowerCase();
  const groups: { start: number; end: number }[] = [];
  for (let i = 0; i < w.length; i++) {
    if (!isVowelAt(w, i)) continue;
    const last = groups[groups.length - 1];
    if (last && last.end === i && !startsNewNucleus(w, i)) last.end = i + 1;
    else groups.push({ start: i, end: i + 1 });
  }
  if (groups.length <= 1) return [w];

  const cuts: number[] = [];
  for (let g = 0; g < groups.length - 1; g++) {
    const cluster = w.slice(groups[g].end, groups[g + 1].start);
    const units = consonantUnits(cluster);
    if (units.length <= 1) cuts.push(groups[g].end);
    else cuts.push(groups[g].end + units[0].length);
  }
  const out: string[] = [];
  let from = 0;
  for (const cut of cuts) {
    out.push(w.slice(from, cut));
    from = cut;
  }
  out.push(w.slice(from));
  return out;
}

/** Whether a run of consonants forms a plausible English sound pattern at its position in the word. */
function validCluster(run: string, atStart: boolean, atEnd: boolean): boolean {
  if (run.length === 2) {
    const [x, y] = run;
    if (atStart) return ONSETS.has(run) || (x === 'ʃ' && 'rlmnw'.includes(y));
    // digraph pairs: sh/ch/th + consonant (Ash-ley, Ash-win) or consonant + sh/ch/th (Marsh, Ansh, March)
    const digraphOk = (x === 'ʃ' && y !== 'ʃ' && (atEnd ? 'ts'.includes(y) : 'tlmnrwbk'.includes(y))) || (y === 'ʃ' && x !== 'ʃ' && 'nrltkdgbp'.includes(x));
    if (atEnd) return CODAS.has(run) || digraphOk;
    return ONSETS.has(run) || CODAS.has(run) || MEDIAL_OK.has(run) || digraphOk || (MEDIAL_FIRST.has(x) && 'dgkptbfvsz'.includes(y) && x !== y);
  }
  if (run.length === 3) {
    if (atStart) return START_TRIPLES.test(run);
    if (atEnd) return CODAS.has(run.slice(0, 2)) && 'std'.includes(run[2]);
    // coda + onset pair (An-drew) or coda pair + single (Kirs-ten)
    if (run[0] === 'k' && run[1] === 'ʃ') return true; // ksh as in Lakshmi, Akshay
    return (MEDIAL_FIRST.has(run[0]) && MEDIAL_ONSETS.has(run.slice(1)) && (run[0] !== 'n' || 'dtgksc'.includes(run[1]))) || (CODAS.has(run.slice(0, 2)) && 'std'.includes(run[2]));
  }
  // Four or more in a row is only plausible as a coda pair followed by an onset pair in mid-word.
  return !atStart && !atEnd && CODAS.has(run.slice(0, 2)) && ONSETS.has(run.slice(2));
}

/** True when some 3+ letter chunk appears twice, as in "Bryanryan": a sign of two names glued together. */
function hasRepeatedChunk(w: string): boolean {
  for (let i = 0; i + 3 <= w.length; i++) if (w.indexOf(w.slice(i, i + 3), i + 3) >= 0) return true;
  return false;
}

/**
 * 0-100 estimate of how easy a string is to say. Penalises consonant clusters that are not real English
 * sound patterns (Jennf, Chrnie), long vowel runs, doubled odd vowels (Riysaa), a stray q, and repeated chunks.
 */
export function pronounceability(text: string): number {
  const w = text.toLowerCase().replace(/[^\p{L}]/gu, '').replace(DIGRAPH, 'ʃ');
  if (w.length < 2) return 0;
  const mask = [...w].map((_, i) => (isVowelAt(w, i) ? 'V' : 'C')).join('');
  if (!mask.includes('V')) return 0;

  let score = 100;
  for (const m of mask.matchAll(/C{2,}/g)) {
    const run = w.slice(m.index, m.index + m[0].length);
    if (validCluster(run, m.index === 0, m.index + run.length === w.length)) continue;
    score -= run.length >= 3 ? 55 : m.index === 0 || m.index + run.length === w.length ? 45 : 40;
  }

  const maxV = Math.max(...(mask.match(/V+/g) ?? ['']).map((r) => r.length));
  if (maxV >= 3) score -= 35 * (maxV - 2);
  score -= 6 * (w.match(/ao|iu|uo|ui|ae|oe|eo|oa|ua/g) ?? []).length;
  if (/(.)\1\1/.test(w)) score -= 40;
  if (/ii|uu|yy/.test(w)) score -= 40;
  if (/aa/.test(w)) score -= 10;
  if (/q(?!u)/.test(w)) score -= 40;
  if (/iy(?![aeiou])|uy/.test(w)) score -= 30;
  if (hasRepeatedChunk(text.toLowerCase().replace(/[^\p{L}]/gu, ''))) score -= 45;

  let transitions = 0;
  for (let i = 1; i < mask.length; i++) if (mask[i] !== mask[i - 1]) transitions++;
  score += (transitions / (w.length - 1) - 0.5) * 20;
  return Math.max(0, Math.min(100, score));
}

/** Glue two pieces, collapsing a doubled letter at the seam ("Sam" + "Mia" → "Samia"). */
function join(left: string, right: string): { text: string; overlapped: boolean } {
  if (left.slice(-1).toLowerCase() === right.charAt(0).toLowerCase()) {
    return { text: left + right.slice(1), overlapped: true };
  }
  return { text: left + right, overlapped: false };
}

const lengthPenalty = (len: number) => 2 * Math.max(0, len - 9) + 4 * Math.max(0, 5 - len);
const balanceBonus = (leftLen: number, rightLen: number) => 25 - 50 * Math.abs(leftLen / (leftLen + rightLen) - 0.5);

/* ---------- techniques ---------- */

type Raw = { name: string; score: number };

function score(text: string, leftLen: number, rightLen: number, bonus = 0): number {
  return pronounceability(text) + balanceBonus(leftLen, rightLen) - lengthPenalty(text.length) + bonus;
}

/** First part of `a` + last part of `b`, trying every cut point. */
function portmanteaus(a: string, b: string): Raw[] {
  const out: Raw[] = [];
  const minA = a.length <= 3 ? 1 : 2;
  const minB = b.length <= 3 ? 1 : 2;
  for (let i = minA; i < a.length; i++) {
    for (let j = minB; j < b.length; j++) {
      const left = a.slice(0, i);
      const right = b.slice(b.length - j);
      const { text, overlapped } = join(left, right);
      if (text.length < 3) continue;
      out.push({ name: cap(text), score: score(text, left.length, right.length, overlapped ? 6 : 0) });
    }
  }
  return out;
}

/** Recombine approximate syllables: prefixes of one name's syllables with suffixes of the other's. */
function syllableMixes(a: string, b: string): Raw[] {
  const sa = syllabify(a);
  const sb = syllabify(b);
  const out: Raw[] = [];
  const push = (text: string, l: number, r: number) => {
    if (text.length >= 3) out.push({ name: cap(text), score: score(text, l, r, 4) });
  };
  const take = (x: string[], y: string[]) => {
    for (let i = 1; i <= x.length; i++) {
      for (let j = 0; j < y.length; j++) {
        const l = x.slice(0, i).join('');
        const r = y.slice(j).join('');
        if (i === x.length && j === 0) continue; // just both names stuck together
        push(join(l, r).text, l.length, r.length);
      }
    }
  };
  take(sa, sb);
  take(sb, sa);
  // Alternate syllables: a0 b0 a1 b1 ...
  for (const [x, y] of [[sa, sb], [sb, sa]] as const) {
    const n = Math.max(x.length, y.length);
    let mixed = '';
    for (let k = 0; k < n; k++) mixed += (x[k] ?? '') + (y[k] ?? '');
    push(mixed, x.join('').length, y.join('').length);
  }
  return out;
}

/** Pool the letters: interleave both names, or weave one name's consonants around the other's vowels. */
function letterPools(a: string, b: string): Raw[] {
  const out: Raw[] = [];
  const la = a.toLowerCase();
  const lb = b.toLowerCase();

  for (const [x, y] of [[la, lb], [lb, la]]) {
    let pooled = '';
    for (let k = 0; k < Math.max(x.length, y.length); k++) pooled += (x[k] ?? '') + (y[k] ?? '');
    for (let len = 5; len <= Math.min(9, pooled.length); len++) {
      const t = pooled.slice(0, len);
      out.push({ name: cap(t), score: pronounceability(t) - lengthPenalty(t.length) - 20 });
    }
  }

  const split = (s: string) => {
    const c: string[] = [], v: string[] = [];
    for (let i = 0; i < s.length; i++) (isVowelAt(s, i) ? v : c).push(s[i]);
    return { c, v };
  };
  for (const [x, y] of [[la, lb], [lb, la]]) {
    const cons = split(x).c;
    const vows = split(y).v;
    let woven = '';
    for (let k = 0; k < Math.max(cons.length, vows.length); k++) woven += (cons[k] ?? '') + (vows[k] ?? '');
    for (let len = 4; len <= Math.min(8, woven.length); len++) {
      const t = woven.slice(0, len);
      out.push({ name: cap(t), score: pronounceability(t) - lengthPenalty(t.length) - 4 });
    }
  }
  return out;
}

/** Build around a shared letter run: everything up to the overlap from one name, everything after it from the other. */
function overlaps(a: string, b: string): Raw[] {
  const out: Raw[] = [];
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  for (const [x, y, xo, yo] of [[la, lb, a, b], [lb, la, b, a]]) {
    for (let i = 0; i < x.length; i++) {
      for (let j = 0; j < y.length; j++) {
        if (x[i] !== y[j]) continue;
        let run = 1;
        while (i - run >= 0 && j - run >= 0 && x[i - run] === y[j - run]) run++;
        const left = xo.slice(0, i + 1);
        const right = yo.slice(j + 1);
        if (!right || left.length < 2) continue;
        const text = left + right;
        out.push({ name: cap(text), score: score(text, left.length, right.length, run >= 2 ? 18 : run === 1 && isVowelAt(x, i) ? 6 : 0) });
      }
    }
  }
  return out;
}

function compounds(a: string, b: string): Raw[] {
  const base = 50 - lengthPenalty(a.length + b.length);
  return [
    { name: `${a}${b}`, score: base },
    { name: `${a}-${b}`, score: base - 1 },
    { name: `${b}${a}`, score: base - 2 },
    { name: `${b}-${a}`, score: base - 3 },
  ];
}

/* ---------- pool building & selection ---------- */

const ORDER: Technique[] = ['portmanteau', 'reverse', 'syllable', 'overlap', 'pooling', 'compound'];

/** Builds every candidate, grouped by technique and ranked best-first. Deterministic for the same input. */
export interface PoolOptions {
  /** Extra per-tool filter applied before the per-technique cap, so rejected names don't use up slots. */
  keep?: (name: string, technique: Technique) => boolean;
  minPool?: number;
  /** Candidates kept per technique before ranking. Defaults to 10; a caller that re-ranks the pool can raise it. */
  laneCap?: number;
}

export function generatePool(name1: string, name2: string, { keep, minPool = FLOOR_POOL, laneCap = 10 }: PoolOptions = {}): Combo[] {
  const a = normalize(name1);
  const b = normalize(name2);
  const keyA = letters(a).toLowerCase();
  const keyB = letters(b).toLowerCase();

  const raw: Record<Technique, Raw[]> = {
    portmanteau: portmanteaus(a, b),
    reverse: portmanteaus(b, a),
    syllable: syllableMixes(a, b),
    pooling: letterPools(a, b),
    overlap: overlaps(a, b),
    compound: compounds(a, b),
  };

  const build = (threshold: number, seen: Set<string>) => {
    const pool: Combo[] = [];
    for (const technique of ORDER) {
      const ranked = raw[technique].slice().sort((p, q) => q.score - p.score);
      let kept = 0;
      for (const r of ranked) {
        if (kept >= (technique === 'compound' ? 4 : laneCap)) break;
        const key = r.name.toLowerCase();
        const plain = letters(r.name).toLowerCase();
        const echoes = [keyA, keyB].some((k) => k.startsWith(plain) || k.endsWith(plain));
        if (seen.has(key) || echoes) continue;
        if (keep && !keep(r.name, technique)) continue;
        if (technique !== 'compound' && pronounceability(r.name) < threshold) continue;
        seen.add(key);
        pool.push({ name: r.name, technique, score: r.score });
        kept++;
      }
    }
    return pool;
  };

  // Start strict. Very short or awkward name pairs may need a looser pass, but never below the floor.
  let pool: Combo[] = [];
  for (const threshold of LADDER) {
    pool = build(threshold, new Set<string>());
    if (pool.length >= minPool) break;
  }
  return pool;
}

const bucketOf = (len: number): Exclude<Style, 'all'> => (len <= 5 ? 'short' : len <= 8 ? 'medium' : 'long');
const TARGET: Record<Exclude<Style, 'all'>, number> = { short: 4, medium: 7, long: 10 };

/** Picks 12-20 results for the chosen length style, varied across techniques. */
/** Optional lane weights: the biggest nudge leads each round, and 3 or more earns an extra pick. Empty means no change. */
export type TechniqueNudges = Partial<Record<Technique, number>>;

export function pickResults(pool: Combo[], style: Style, max = 20, min = 12, nudges: TechniqueNudges = {}): Combo[] {
  const len = (c: Combo) => letters(c.name).length;
  const inStyle = style === 'all' ? pool : pool.filter((c) => bucketOf(len(c)) === style);

  // Keep clear of the weak tail: skip candidates far below the best score unless we need them to reach `min`.
  // Compounds are simple joins with a fixed score, so they are exempt.
  const best = Math.max(...inStyle.filter((c) => c.technique !== 'compound').map((c) => c.score), 0);
  const floor = best - QUALITY_BAND;
  const solid = (c: Combo) => c.technique === 'compound' || c.score >= floor;
  const nudge = (t: Technique) => nudges[t] ?? 0;
  const order = ORDER.slice().sort((x, y) => nudge(y) - nudge(x));
  const lanes = order.map((t) => ({
    picks: nudge(t) >= 3 ? 2 : 1,
    items: inStyle.filter((c) => c.technique === t && solid(c)).sort((p, q) => q.score - p.score),
  }));
  const picked: Combo[] = [];
  const cursor = lanes.map(() => 0);
  while (picked.length < max && lanes.some((l, i) => cursor[i] < l.items.length)) {
    lanes.forEach((lane, i) => {
      for (let n = 0; n < lane.picks && picked.length < max && cursor[i] < lane.items.length; n++) picked.push(lane.items[cursor[i]++]);
    });
  }

  if (picked.length < min) {
    const have = new Set(picked.map((c) => c.name));
    const rest = pool
      .filter((c) => !have.has(c.name))
      .sort((p, q) => (style === 'all' ? 0 : Math.abs(len(p) - TARGET[style]) - Math.abs(len(q) - TARGET[style])) || q.score - p.score);
    for (const c of rest) {
      if (picked.length >= min) break;
      picked.push(c);
    }
  }

  if (style === 'short') picked.sort((p, q) => len(p) - len(q) || q.score - p.score);
  else if (style === 'long') picked.sort((p, q) => len(q) - len(p) || q.score - p.score);
  else if (style === 'medium') picked.sort((p, q) => Math.abs(len(p) - 7) - Math.abs(len(q) - 7) || q.score - p.score);
  return picked;
}
