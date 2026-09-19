/**
 * Content-safety check for nicknames marked as being for a child.
 *
 * Scope: sexual and anatomy innuendo, profanity, slurs, and bullying words. It does not cover drug or violence terms.
 * It deliberately over-blocks. Dropping a harmless nickname like "Cassie" is a better failure than passing a bad one,
 * and there is no exemption for terms that already appear in the child's own name.
 *
 * It is a word-list check, so it cannot promise to catch every double meaning or words in other languages.
 * The page and the tool both tell people to read each nickname before using it.
 */

/** Matched anywhere in the nickname with spaces and hyphens removed, so a word split across a seam is still caught. */
const SEVERE = [
  'sex', 'sexy', 'sexi', 'anal', 'anus', 'arse', 'boob', 'booty', 'cock', 'cum', 'dick', 'dildo', 'fag', 'fuck', 'fuk',
  'horny', 'kinky', 'naked', 'nipple', 'nude', 'orgy', 'penis', 'porn', 'pussy', 'rape', 'shit', 'slut', 'twat', 'vagina',
  'wank', 'whore', 'hooker', 'bitch', 'cunt', 'nigg', 'nazi', 'milf', 'thot', 'boner', 'hump', 'pimp', 'tits',
  'kike', 'chink', 'spic', 'tranny', 'retard', 'dyke',
];

/**
 * Matched inside any single word (3+ letters) and also across word breaks, so "Cassie", "Anthoster", "Cas Shmas"
 * and "Ni Prime" are all dropped. That over-blocks a few harmless names on purpose.
 */
const AMBIGUOUS_SUBSTRING = [
  'ass', 'tit', 'nip', 'bum', 'butt', 'hoe', 'hos', 'bang', 'balls', 'ballz', 'junk', 'nuts', 'pee', 'poo', 'poop', 'fart', 'crap',
  'damn', 'hell', 'screw', 'lick', 'suck', 'cox', 'dic', 'fat', 'ugly', 'dumb', 'stupid', 'idiot',
];

/** Too short or too common to match inside other words. Only a whole word counts. */
const WHOLE_WORD_ONLY = new Set(['ho', 'hard', 'bone', 'jerk']);

const words = (text: string) => text.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);

/** True when nothing in the nickname matches the lists above. */
export function kidSafe(text: string): boolean {
  const parts = words(text);
  const collapsed = parts.join('');
  if (SEVERE.some((t) => collapsed.includes(t))) return false;
  if (AMBIGUOUS_SUBSTRING.some((t) => t.length >= 3 && collapsed.includes(t))) return false;
  return !parts.some((w) => WHOLE_WORD_ONLY.has(w) || AMBIGUOUS_SUBSTRING.some((t) => w === t || (t.length >= 3 && w.includes(t))));
}
