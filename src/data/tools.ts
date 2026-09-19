export type ThemeName = 'couple' | 'baby' | 'business' | 'username' | 'gamertag' | 'nickname';

export interface Tool {
  slug: string;
  name: string;
  /** Compact label for tight spaces, such as the header at tablet widths. Falls back to `name`. */
  short?: string;
  description: string;
  theme: ThemeName;
  icon: 'heart' | 'baby' | 'briefcase' | 'at-sign' | 'smile' | 'gamepad';
  built: boolean;
}

export const tools: Tool[] = [
  { slug: 'couple-name-combiner', name: 'Couple Name Combiner', short: 'Couple Names', theme: 'couple', icon: 'heart', built: true,
    description: 'Blend two names into a ship name for you and your partner.' },
  { slug: 'baby-name-combiner', name: 'Baby Name Combiner', theme: 'baby', icon: 'baby', built: true,
    description: 'Mix both parents’ names into fresh baby name ideas.' },
  { slug: 'business-name-generator', name: 'Business Name Generator', theme: 'business', icon: 'briefcase', built: true,
    description: 'Combine words into brandable business and startup names.' },
  { slug: 'username-generator', name: 'Username Generator', short: 'Usernames', theme: 'username', icon: 'at-sign', built: true,
    description: 'Create cute, aesthetic or unique usernames for TikTok, Instagram and more.' },
  { slug: 'gamertag-generator', name: 'Gamertag Generator', short: 'Gamertags', theme: 'gamertag', icon: 'gamepad', built: true,
    description: 'Build gamertags that fit Xbox, PlayStation, Steam, Minecraft or Roblox.' },
  { slug: 'nickname-generator', name: 'Nickname Generator', theme: 'nickname', icon: 'smile', built: true,
    description: 'Type a name and get cute, funny, cool or classic nicknames for it.' },
];

export const toolBySlug = (slug: string) => tools.find((t) => t.slug === slug)!;

/**
 * Tools shown as direct links in the header, in this order. Every other tool goes in the "More Tools" dropdown,
 * so a new tool needs no header change: it lands in the dropdown, and can be promoted by adding its slug here.
 */
export const primaryNavSlugs = ['couple-name-combiner', 'gamertag-generator', 'username-generator'];

export const primaryTools: Tool[] = primaryNavSlugs.map((slug) => toolBySlug(slug));
export const moreTools: Tool[] = tools.filter((t) => !primaryNavSlugs.includes(t.slug));
