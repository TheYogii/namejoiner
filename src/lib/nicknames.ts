/**
 * Nickname engine: one name in, nickname variants out. Unlike the blending tools it never combines two things.
 * It finds natural shortened forms of the name (stems), then applies each style's endings, titles and sound play.
 * Reuses syllabify and pronounceability from combine.ts and follows the same rank, dedupe and round-robin pattern.
 */
import { syllabify, pronounceability, normalize } from './combine';
import { kidSafe } from './nickname-safety';

export type NicknameStyle = 'cute' | 'funny' | 'cool' | 'classic';
export type NicknameTechnique = 'shortening' | 'tail' | 'inner' | 'diminutive' | 'doubling' | 'ending' | 'rhyme' | 'title' | 'trait' | 'traitPhrase';
export type NicknameFormat = 'word' | 'phrase';

export interface NicknameOptions {
  /** An optional trait or inside joke, such as "sleepy" or "always late". Empty means name-only nicknames. */
  trait?: string;
  /** Single Word keeps every nickname one continuous word. Phrase builds two-word nicknames with a space. */
  format?: NicknameFormat;
}

export type Audience = 'anyone' | 'myself' | 'friend' | 'partner' | 'sibling' | 'pet' | 'kid';

export interface Nickname {
  name: string;
  technique: NicknameTechnique;
  score: number;
  /** Soft, affectionate forms (Alexie, Benbug, Bebe). Used to bias results for partners and kids. */
  soft?: boolean;
}

export const NICKNAME_TECHNIQUE_LABEL: Record<NicknameTechnique, string> = {
  shortening: 'Shortened form',
  tail: 'Shortened from the end',
  inner: 'Shortened from the middle',
  diminutive: 'Friendly ending',
  doubling: 'Doubled sound',
  ending: 'Playful ending',
  rhyme: 'Rhyming twist',
  title: 'Title',
  trait: 'From your trait',
  traitPhrase: 'Trait phrase',
};

const VOWELS = /[aeiouyàáâãäåæèéêëìíîïòóôõöøùúûüœ]/;
const isVowel = (c: string | undefined) => !!c && VOWELS.test(c);
const MIN_PRON = 60;
const MAX_STEM = 6;
/**
 * Truncations that are technically valid but would produce an unkind, rude or off-putting nickname
 * (Fatima → Fat, Cassandra → Ass). A stem on this list never seeds any nickname.
 */
const STEM_DENYLIST = new Set([
  'christ', 'fat', 'fatt', 'ass', 'butt', 'bum', 'sex', 'tit', 'tits', 'poo', 'pee', 'fart', 'crap', 'damn', 'hell', 'die',
  'dick', 'cock', 'hoe', 'dumb', 'ugly', 'slut', 'kill', 'gross', 'nazi',
]);
/** Substrings never allowed in a finished nickname unless the person's own name already contains them. */
const BLOCKED_SUBSTRINGS = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'rape', 'porn', 'slut', 'whore', 'bitch', 'nazi', 'dick', 'cock'];

interface Stem {
  text: string;
  kind: 'shortening' | 'tail' | 'inner' | 'whole';
  score: number;
}

/**
 * Shortened forms of a name: every stretch of 2-6 letters that starts at the front or at a consonant before a vowel
 * (Alexander → Xander, Liz from Elizabeth) and ends at a syllable boundary or a consonant before a vowel (Alex, Al).
 */
export function stems(name: string): Stem[] {
  const w = name.toLowerCase();
  const syl = syllabify(w);
  const boundaries = new Set<number>();
  syl.reduce((sum, s) => { sum += s.length; boundaries.add(sum); return sum; }, 0);

  const starts = [0];
  for (let i = 1; i < w.length - 1; i++) if (!isVowel(w[i]) && isVowel(w[i + 1])) starts.push(i);
  const ends: number[] = [w.length];
  for (let j = 2; j < w.length; j++) if (boundaries.has(j) || (!isVowel(w[j - 1]) && isVowel(w[j]))) ends.push(j);

  const seen = new Map<string, Stem>();
  for (const i of starts) {
    for (const j of ends) {
      const len = j - i;
      const kind = i === 0 ? 'shortening' : j === w.length ? 'tail' : 'inner';
      // Tails (Xander, Beth) are whole endings of the name. Inner cuts only work when they drop a single lead-in letter (Lex, Liz).
      const minLen = kind === 'shortening' ? 2 : kind === 'tail' ? 4 : 3;
      if (len < minLen || len > MAX_STEM || len >= w.length) continue;
      if (kind === 'inner' && (i > 1 || len !== 3)) continue;
      if (kind === 'tail' && i > w.length * 0.6) continue; // late tails (Der, Min) rarely read as nicknames
      if (kind !== 'shortening' && w[i] === 'h') continue; // a silent-h lead-in (Herine, Han) reads as a fragment
      const text = w.slice(i, j);
      const pron = pronounceability(text);
      if (pron < MIN_PRON || STEM_DENYLIST.has(text)) continue;
      let score = pron / 2;
      if (kind === 'shortening') {
        score += 14 + (len >= 3 && len <= 4 ? 16 : len === 5 ? 6 : len === 2 ? 3 : 0);
        if (j < w.length && !boundaries.has(j) && !isVowel(w[j])) score -= 10; // cut inside a consonant cluster
        if (j < w.length && syllabify(text).length >= 3) score -= 8;
      } else if (kind === 'tail') {
        score += 12 + (len <= 5 ? 10 : 6);
      } else {
        score += 2 + 16;
      }
      if (!isVowel(text[text.length - 1])) score += 5;
      const prev = seen.get(text);
      if (!prev || prev.score < score) seen.set(text, { text, kind, score });
    }
  }
  const ranked = [...seen.values()].sort((a, b) => b.score - a.score);
  // Only the best two tails survive: they are the riskiest cuts, so we do not let them crowd the list.
  let tails = 0;
  return ranked.filter((st) => st.kind !== 'tail' || ++tails <= 2);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const chunkPron = (s: string) => {
  const chunks = s.split(/[\s.\-]+/).filter((c) => c.length >= 3);
  return chunks.length ? Math.min(...chunks.map(pronounceability)) : 100;
};

/** Stem + ending. Falls back to a hyphen when the join makes an awkward cluster (Alex-bug). */
function attach(stem: string, ending: string): string | null {
  // A seam that doubles a vowel (Pri + inator) reads badly, and a lone-letter ending never gets a hyphen (Alex-x).
  if (/(ii|uu|aa|yy)$/i.test(stem.slice(-1) + ending.charAt(0)) && isVowel(stem.slice(-1))) return null;
  const joined = stem + ending;
  if (pronounceability(joined) >= 65) return joined;
  if (ending.length < 3) return null;
  const hyphenated = `${stem}-${ending}`;
  return chunkPron(hyphenated) >= 65 ? hyphenated : null;
}

/** -ie / -y endings: drop a trailing vowel, double a lone final consonant after a short vowel (Sam → Sammy). */
function diminutives(stem: string): string[] {
  if (isVowel(stem[stem.length - 1])) return []; // Pri, Riya: an -ie ending would just clip the name
  const base = stem;
  if (base.length < 2) return [];
  const last = base[base.length - 1];
  const cvc = base.length >= 3 && !isVowel(last) && isVowel(base[base.length - 2]) && !isVowel(base[base.length - 3]) && !'wxyhqck'.includes(last);
  const doubled = cvc && syllabify(base).length === 1 ? base + last : base;
  return [doubled + 'ie', doubled + 'y'].filter((n) => n.toLowerCase() !== stem);
}

/** First consonant + vowel doubled: Ben → Bebe, Lili from Lisa. */
function doubled(name: string): string | null {
  const m = name.toLowerCase().match(/^([^aeiouy]+[aeiouy]+)/);
  if (!m || m[1].length > 3 || m[1].length >= name.length) return null;
  return m[1] + m[1];
}

/** Shm- rhyme play: Alex → Alex Shmalex, Ben → Ben Shmen. */
function rhyme(stem: string): string | null {
  const m = stem.match(/[aeiouy].*$/);
  return m ? `${cap(stem)} Shm${m[0]}` : null;
}

interface Config {
  endings: string[];
  titles: string[];
  suffixTitles: string[];
  diminutives: boolean;
  doubling: boolean;
  rhyme: boolean;
  pun: boolean;
}

const CONFIG: Record<Exclude<NicknameStyle, 'classic'>, Config> = {
  cute: { endings: ['bug', 'boo', 'bean', 'pie', 'kins'], titles: [], suffixTitles: [], diminutives: true, doubling: true, rhyme: false, pun: false },
  funny: { endings: ['ster', 'meister', 'inator', 'zilla'], titles: [], suffixTitles: [], diminutives: false, doubling: false, rhyme: true, pun: true },
  cool: { endings: ['x', 'z', 'o', 'ix'], titles: ['Big', 'Lil', 'Chief', 'Dr.', 'Agent'], suffixTitles: ['Prime', 'the Great'], diminutives: false, doubling: false, rhyme: false, pun: false },
};

const ORDER: NicknameTechnique[] = ['shortening', 'tail', 'inner', 'diminutive', 'doubling', 'ending', 'rhyme', 'title', 'trait', 'traitPhrase'];
const PER_STYLE_STEMS = 5;

/* ---------- trait or inside joke ---------- */

/** Words that carry no nickname on their own ("always late" → late). */
const FILLER = new Set(['always', 'very', 'so', 'too', 'super', 'really', 'just', 'a', 'an', 'the', 'of', 'is', 'are', 'to', 'my', 'me', 'and', 'never', 'forever']);

/** Unkind words that make a poor nickname whoever it is for. A trait containing one is rejected, and none seeds a nickname. */
const UNKIND = new Set([
  ...STEM_DENYLIST,
  'stupid', 'idiot', 'loser', 'moron', 'freak', 'weirdo', 'creep', 'pig', 'cow', 'trash', 'worthless', 'useless', 'annoying', 'psycho',
]);

/** Returns an error message, or null when the trait is usable. Traits are free text, so this runs before anything is built. */
export function validateTrait(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/\p{L}/u.test(v) && !/\p{Script=Latin}/u.test(v)) return 'Please type the trait in Latin letters, for example sleepy or always late.';
  if (!/^[\p{Script=Latin}]+(\s+[\p{Script=Latin}]+){0,2}$/u.test(v)) return 'Use one to three words of letters only, like sleepy or always late.';
  const words = v.toLowerCase().split(/\s+/);
  const collapsed = words.join('');
  if (words.some((w) => UNKIND.has(w)) || BLOCKED_SUBSTRINGS.some((t) => collapsed.includes(t))) {
    return 'That word could make an unkind or rude nickname. Try an affectionate trait, like sleepy, sunny or goofy.';
  }
  return null;
}

/** The nickname-worthy words in a trait: filler dropped, at most two kept. "always late" → ["late"]. */
function traitWords(raw: string | undefined): string[] {
  if (!raw || validateTrait(raw)) return [];
  const words = raw.trim().toLowerCase().split(/\s+/);
  const content = words.filter((w) => !FILLER.has(w));
  return (content.length ? content : words).filter((w) => w.length >= 3).slice(0, 2);
}

/** Adjective-looking words read naturally after "the": Sarah the Sleepy. Judged by ending, since there is no dictionary. */
const looksLikeAdjective = (w: string) => /(y|ed|ful|ish|ive|ous|able|less|ic)$/.test(w);

const PHRASE_TITLES: Record<NicknameStyle, string[]> = {
  cute: ['Tiny', 'Sweet', 'Sunny', 'Baby', 'Honey'],
  funny: ['Captain', 'Professor', 'Sir', 'Mr.'],
  cool: ['Big', 'Lil', 'Chief', 'Dr.', 'Agent'],
  classic: ['Big', 'Young'],
};

const TRAIT_SUFFIXES: Record<NicknameStyle, string[]> = {
  cute: ['bug', 'bean', 'pie', 'boo'],
  funny: ['pants', 'head', 'monster'],
  cool: [],
  classic: [],
};

/** Pets in Phrase mode: two short words, about nine letters in all. */
const isPetPhrase = (text: string) => text.split(' ').length === 2 && text.replace(/[^\p{L}]/gu, '').length <= 9 && syllabify(text.toLowerCase().replace(/ /g, '')).length <= 3;

export const AUDIENCE_LABEL: Record<Audience, string> = {
  anyone: 'Anyone', myself: 'Myself', friend: 'Friend', partner: 'Partner', sibling: 'Sibling', pet: 'Pet', kid: 'Kid',
};

/**
 * How each audience nudges the results. Nudges reorder which kinds of nickname come first and boosts adjust ranking
 * within a kind. Only Pet and Kid ever remove results. "Anyone" has no rule at all, so it behaves exactly as before.
 */
interface AudienceRule {
  /** Lane priority: the biggest nudge leads each round and 3 or more earns an extra pick. */
  nudges?: Partial<Record<NicknameTechnique, number>>;
  softBoost?: number;
  boost?: Partial<Record<NicknameTechnique, number>>;
}

function audienceRule(audience: Audience, style: NicknameStyle): AudienceRule {
  switch (audience) {
    case 'partner': return style === 'cute'
      ? { nudges: { diminutive: 3, doubling: 3, ending: 3 }, softBoost: 6 }
      : { nudges: { diminutive: 1, doubling: 1 }, softBoost: 8 };
    case 'myself': return { nudges: { shortening: 3, tail: 1, title: 1 }, softBoost: -6 };
    case 'friend': return { nudges: { rhyme: 1, ending: 1 } };
    case 'sibling': return { nudges: { shortening: 1, title: 1 } };
    case 'pet': return { nudges: { doubling: 3, diminutive: 3 }, boost: { doubling: 20, diminutive: 8 } };
    case 'kid': return { nudges: { diminutive: 3, doubling: 2 }, softBoost: 6, boost: { doubling: 6 } };
    default: return {};
  }
}

/** Titles and puns that read as an adult reference, so a Kid nickname never uses them. */
const isAdultLeaning = (text: string) => /^(sir |big )/i.test(text);

const isPetShaped = (text: string) => !/[\s\-.]/.test(text) && text.replace(/[^\p{L}]/gu, '').length <= 6 && syllabify(text.toLowerCase()).length <= 2;

/** Builds up to `count` nicknames for one name in one style, best-first and varied across techniques. */
export function generateNicknames(rawName: string, style: NicknameStyle, count = 20, audience: Audience = 'anyone', options: NicknameOptions = {}): Nickname[] {
  const name = normalize(rawName);
  const key = name.toLowerCase();
  const all = stems(key);
  const found = new Map<string, Nickname>();
  const forKid = audience === 'kid';
  const phrase = options.format === 'phrase';
  const traits = traitWords(options.trait);

  const add = (display: string | null, technique: NicknameTechnique, stemScore: number, bonus = 0, soft = false) => {
    if (!display) return;
    const text = display.split(' ').map((p) => (p === 'the' ? p : cap(p))).join(' ');
    const id = text.toLowerCase();
    const letters = text.replace(/[^\p{L}]/gu, '');
    if (id === key || letters.length < 2 || found.has(id)) return;
    if (BLOCKED_SUBSTRINGS.some((t) => id.includes(t) && !key.includes(t))) return;
    // A finished nickname can land on a denied word even when no stem did (Se + x = Sex).
    if (id.split(/[\s\-.]+/).some((t) => STEM_DENYLIST.has(t) && t !== key)) return;
    if (forKid && (isAdultLeaning(text) || !kidSafe(text))) return;
    if (audience === 'pet' && !(phrase ? isPetPhrase(text) : isPetShaped(text))) return;
    const pron = chunkPron(text);
    if (pron < MIN_PRON) return;
    const lengthPenalty = 3 * Math.max(0, letters.length - 10);
    found.set(id, { name: text, technique, score: pron / 2 + stemScore + bonus - lengthPenalty, ...(soft ? { soft: true } : {}) });
  };

  // Shortened forms are the core of every style; Classic uses nothing else.
  const limit = style === 'classic' ? 12 : PER_STYLE_STEMS + 3;
  const floor = style === 'classic' && all.length ? all[0].score - 22 : -Infinity;
  // Phrase format builds two-word nicknames instead, so bare shortened forms are left out of it.
  if (!phrase) for (const s of all.filter((x) => x.score >= floor).slice(0, limit)) add(cap(s.text), s.kind === 'whole' ? 'shortening' : s.kind, s.score, 4);

  if (style !== 'classic' && !phrase) {
    // Very short names have no shortened form, so playful styles work from the name itself.
    const bases: Stem[] = all.length ? all.slice(0, PER_STYLE_STEMS) : [];
    if (key.length <= 6) bases.push({ text: key, kind: 'whole', score: 12 });

    const playful = (which: Exclude<NicknameStyle, 'classic'>) => {
      const cfg = CONFIG[which];
      const soft = which === 'cute';
      for (const s of bases) {
        // Endings suit short stems; a six-letter stem plus an ending (Xanderbug) is a mouthful.
        if (s.text.length <= 5) {
          if (cfg.diminutives) diminutives(s.text).forEach((d) => add(d, 'diminutive', s.score, 6, soft));
          cfg.endings.forEach((e) => add(attach(cap(s.text), e), 'ending', s.score, 2, soft));
        }
        if (cfg.rhyme) add(rhyme(s.text), 'rhyme', s.score, 8);
        cfg.titles.forEach((t) => add(`${t} ${cap(s.text)}`, 'title', s.score, 4));
        cfg.suffixTitles.forEach((t) => add(`${cap(s.text)} ${t}`, 'title', s.score, 2));
      }
      if (cfg.pun) all.filter((s) => s.text.length >= 3 && !isVowel(s.text.slice(-1))).slice(0, 2).forEach((s) => add(`Sir ${cap(s.text)}-a-Lot`, 'title', s.score, 6));
      if (cfg.doubling) add(cap(doubled(key) ?? ''), 'doubling', 10, 6, soft);
    };

    playful(style);
    // Some audiences pull in a second style: partners get soft endings whatever was picked, and people naming themselves get cool forms.
    if (audience === 'partner' && style !== 'cute') playful('cute');
    if (audience === 'myself' && (style === 'cute' || style === 'funny')) playful('cool');
    // Pets answer to repeated sounds, so double the opening sound of each short stem too (Lex → Lele).
    if (audience === 'pet') for (const s of bases.slice(0, 4)) add(cap(doubled(s.text) ?? ''), 'doubling', s.score, 6, true);
  }

  // Names people say a phrase over: Captain Alex, Sleepy Sarah. Spaces are fine in a nickname, unlike a username or gamertag.
  // Only clean forms go in a phrase: shortened forms that end in a consonant (Alex, Al, Sar), or the whole name when it is short.
  const nameForms: Stem[] = all.filter((x) => x.kind === 'shortening' && x.text.length <= 5 && !isVowel(x.text.slice(-1))).slice(0, 3);
  if (key.length <= 8) nameForms.push({ text: key, kind: 'whole', score: 12 });
  if (phrase) {
    for (const n of nameForms) {
      const N = cap(n.text);
      for (const t of PHRASE_TITLES[style]) add(`${t} ${N}`, 'title', n.score, 4);
      if (style === 'cool') { add(`${N} the Great`, 'title', n.score, 2); add(`${N} Prime`, 'title', n.score, 2); }
      for (const tw of traits) {
        add(`${cap(tw)} ${N}`, 'traitPhrase', n.score, 10, style === 'cute');
        if (looksLikeAdjective(tw)) add(`${N} the ${cap(tw)}`, 'traitPhrase', n.score, 6);
      }
    }
    if (style !== 'classic') for (const tw of traits.slice(0, 1)) for (const t of PHRASE_TITLES[style].slice(0, 3)) add(`${t} ${cap(tw)}`, 'traitPhrase', 14, 2);
  } else {
    // Single Word with a trait: the trait itself and the trait plus a friendly noun (Sleepy, Sleepyhead, Coffeebean).
    for (const tw of traits) {
      add(cap(tw), 'trait', 14, 6);
      for (const suffix of TRAIT_SUFFIXES[style]) add(attach(cap(tw), suffix), 'trait', 12, 4, style === 'cute');
    }
  }

  const rule = audienceRule(audience, style);
  if (traits.length) rule.nudges = { ...rule.nudges, trait: 3, traitPhrase: 3 };
  for (const n of found.values()) {
    n.score += (n.soft ? rule.softBoost ?? 0 : 0) + (rule.boost?.[n.technique] ?? 0);
  }
  return pick(found, count, rule.nudges);
}

function pick(found: Map<string, Nickname>, count: number, nudges: AudienceRule['nudges'] = {}): Nickname[] {
  const nudge = (t: NicknameTechnique) => nudges[t] ?? 0;
  const lanes = ORDER.slice().sort((x, y) => nudge(y) - nudge(x)).map((t) => ({
    picks: nudge(t) >= 3 ? 2 : 1,
    items: [...found.values()].filter((n) => n.technique === t).sort((a, b) => b.score - a.score),
  }));
  const picked: Nickname[] = [];
  const cursor = lanes.map(() => 0);
  while (picked.length < count && lanes.some((l, i) => cursor[i] < l.items.length)) {
    lanes.forEach((lane, i) => {
      for (let n = 0; n < lane.picks && picked.length < count && cursor[i] < lane.items.length; n++) picked.push(lane.items[cursor[i]++]);
    });
  }
  return picked;
}

/** Which audiences a finished nickname suits, most specific first. Used to label result pills. */
export function audiencesFor(n: Nickname): Audience[] {
  const t = n.technique;
  const single = !/[\s\-.]/.test(n.name);
  const out: Audience[] = [];
  const fromTrait = t === 'trait' || t === 'traitPhrase';
  if (n.soft || t === 'diminutive' || t === 'doubling' || fromTrait) out.push('partner');
  if (kidSafe(n.name) && !isAdultLeaning(n.name)) out.push('kid');
  if (single && isPetShaped(n.name) && t !== 'title') out.push('pet');
  if (t === 'rhyme' || t === 'ending' || t === 'title' || t === 'shortening' || fromTrait) out.push('friend');
  if (t === 'shortening' || t === 'tail' || t === 'inner' || t === 'rhyme' || t === 'ending' || t === 'title' || fromTrait) out.push('sibling');
  if (t === 'shortening' || t === 'tail' || t === 'inner' || ((t === 'ending' || t === 'title') && !n.soft)) out.push('myself');
  return out;
}
