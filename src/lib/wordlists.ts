/**
 * Curated word lists for username styles. Data only: the engine in handles.ts does the combining.
 * Add a new tool's lists here (for example gaming words for a gamertag generator) as another StyleConfig.
 */
import type { StyleConfig } from './handles';

export type SocialStyle = 'cute' | 'aesthetic' | 'unique' | 'random';
export type GamingStyle = 'competitive' | 'chill' | 'fantasy' | 'random';

const cute: StyleConfig = {
  label: 'Cute',
  prefixes: ['tiny', 'little', 'soft', 'sweet', 'bubble', 'honey', 'peachy', 'cozy', 'fluffy', 'sunny', 'lucky', 'dreamy', 'happy', 'jolly', 'snuggly', 'bouncy'],
  suffixes: ['bun', 'bee', 'pie', 'boo', 'pop', 'berry', 'bean', 'bug', 'pea', 'fluff', 'sprout', 'puff', 'pixie', 'cake', 'moo', 'doodle'],
  words: ['bunny', 'honey', 'peach', 'cloud', 'sprout', 'daisy', 'button', 'pudding', 'sugar', 'muffin', 'cookie', 'jelly', 'sparkle', 'mochi', 'tulip', 'teddy', 'pebble', 'blossom', 'lemon', 'pumpkin', 'waffle', 'pretzel', 'biscuit', 'snuggle', 'cupcake'],
  separators: ['', '_'],
  numberTails: ['07', '11', '22'],
  twists: false,
  blends: false,
};

const aesthetic: StyleConfig = {
  label: 'Aesthetic',
  prefixes: ['soft', 'velvet', 'pale', 'faded', 'hazy', 'golden', 'lunar', 'muted', 'quiet', 'amber', 'dusty', 'midnight', 'sepia', 'gilded', 'faint'],
  suffixes: ['core', 'wave', 'haze', 'glow', 'bloom', 'dust', 'muse', 'diary', 'noir', 'moon', 'light', 'veil', 'lore'],
  words: ['moon', 'velvet', 'ivory', 'linen', 'petal', 'dusk', 'opal', 'bloom', 'haze', 'lilac', 'sage', 'amber', 'ember', 'willow', 'fable', 'solstice', 'dawn', 'mist', 'aura', 'silk', 'fern', 'cedar', 'marble', 'coral', 'wisp', 'harbor', 'satin'],
  separators: ['.', '_'],
  numberTails: [],
  twists: false,
  blends: false,
};

const unique: StyleConfig = {
  label: 'Unique',
  prefixes: ['nova', 'zeta', 'flux', 'onyx', 'echo', 'orbit', 'quill', 'sable', 'neo', 'atlas', 'helix', 'void'],
  suffixes: ['ix', 'ora', 'ova', 'ex', 'yn', 'ari', 'elle', 'ium'],
  words: ['nova', 'flux', 'quill', 'onyx', 'sable', 'vesper', 'zephyr', 'cinder', 'lumen', 'mirage', 'wren', 'thorn', 'orbit', 'prism', 'kestrel', 'quartz', 'halo', 'vortex', 'atlas', 'helix', 'zenith', 'riven'],
  separators: ['', '_'],
  numberTails: [],
  twists: true,
  blends: true,
};

const uniq = (list: string[]) => [...new Set(list)];

const random: StyleConfig = {
  label: 'Random',
  prefixes: uniq([...cute.prefixes, ...aesthetic.prefixes, ...unique.prefixes]),
  suffixes: uniq([...cute.suffixes, ...aesthetic.suffixes, ...unique.suffixes]),
  words: uniq([...cute.words, ...aesthetic.words, ...unique.words]),
  separators: ['', '_', '.'],
  numberTails: ['07', '11', '22', '99'],
  twists: true,
  blends: false,
};

/** Social-media styles. Random shuffles across every list, so it changes on each click. */
export const SOCIAL_STYLES: Record<SocialStyle, StyleConfig> = { cute, aesthetic, unique, random };

/* ---------- Gaming ---------- */
/* Gaming handles avoid dots (Roblox and Minecraft reject them) and stay within 20 characters. No licensed game or brand names. */

const competitive: StyleConfig = {
  label: 'Competitive',
  prefixes: ['turbo', 'hyper', 'nitro', 'rapid', 'shadow', 'viper', 'rogue', 'ghost', 'storm', 'blaze', 'iron', 'swift', 'sharp', 'apex', 'omega', 'crimson'],
  suffixes: ['slayer', 'hunter', 'strike', 'blitz', 'wolf', 'fury', 'edge', 'ops', 'gg', 'tv', 'plays', 'clutch', 'rush', 'raid', 'king'],
  words: ['viper', 'ghost', 'shadow', 'storm', 'blaze', 'reaper', 'falcon', 'bolt', 'cobra', 'havoc', 'phantom', 'razor', 'titan', 'raptor', 'cipher', 'venom', 'apex', 'vector', 'saber', 'warden', 'fang'],
  separators: ['', '_'],
  numberTails: ['07', '13', '77', '99'],
  twists: true,
  blends: false,
  maxLength: 20,
  idealLength: 12,
};

const chill: StyleConfig = {
  label: 'Chill',
  prefixes: ['cozy', 'sleepy', 'lofi', 'mellow', 'fuzzy', 'tiny', 'soft', 'sunny', 'happy', 'snoozy', 'quiet', 'drowsy'],
  suffixes: ['bear', 'fox', 'moth', 'pixel', 'byte', 'bit', 'pup', 'toast', 'moss', 'plays', 'cat', 'nap', 'cocoa'],
  words: ['pixel', 'lofi', 'moss', 'otter', 'pancake', 'toast', 'noodle', 'panda', 'mochi', 'biscuit', 'pebble', 'cloud', 'mint', 'waffle', 'cocoa', 'bagel', 'lantern', 'breeze', 'clover', 'kettle', 'pillow'],
  separators: ['', '_'],
  numberTails: ['07', '11', '22'],
  twists: false,
  blends: false,
  maxLength: 20,
  idealLength: 12,
};

const fantasy: StyleConfig = {
  label: 'Fantasy',
  prefixes: ['ember', 'frost', 'rune', 'storm', 'iron', 'ash', 'thorn', 'raven', 'moon', 'wild', 'dusk', 'elder', 'silver'],
  suffixes: ['blade', 'born', 'wing', 'fall', 'ward', 'heart', 'mane', 'song', 'whisper', 'shade', 'bane', 'crest'],
  words: ['dragon', 'rune', 'wyrm', 'phoenix', 'ember', 'frost', 'raven', 'wolf', 'oak', 'thorn', 'griffin', 'ash', 'sage', 'druid', 'talon', 'wisp', 'elder', 'glade', 'tundra', 'sylph', 'warden'],
  separators: ['', '_'],
  numberTails: [],
  twists: true,
  blends: false,
  maxLength: 20,
  idealLength: 12,
};

const gamingRandom: StyleConfig = {
  label: 'Random',
  prefixes: uniq([...competitive.prefixes, ...chill.prefixes, ...fantasy.prefixes]),
  suffixes: uniq([...competitive.suffixes, ...chill.suffixes, ...fantasy.suffixes]),
  words: uniq([...competitive.words, ...chill.words, ...fantasy.words]),
  separators: ['', '_'],
  numberTails: ['07', '13', '77', '99'],
  twists: true,
  blends: false,
  maxLength: 20,
  idealLength: 12,
};

/** Gaming styles for the Gamertag Generator. Random shuffles across every list. */
export const GAMING_STYLES: Record<GamingStyle, StyleConfig> = { competitive, chill, fantasy, random: gamingRandom };
