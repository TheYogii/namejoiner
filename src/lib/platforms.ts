/**
 * Gaming platform rules used by the Gamertag Generator.
 *
 * These are the limits as we understand each platform's published rules. They are NOT checked live and platforms
 * change them, so the page tells people to confirm on the platform's own sign-up screen.
 * Nudges are conventions we commonly see, not rules: they only reorder results.
 */
import type { Constraints } from './handles';

export type PlatformId = 'any' | 'xbox' | 'playstation' | 'steam' | 'minecraft' | 'roblox';

export interface PlatformRule extends Constraints {
  id: Exclude<PlatformId, 'any'>;
  label: string;
  /** Short name for result pills. */
  short: string;
  /** One line describing what we enforce. */
  hint: string;
}

export const PLATFORM_RULES: PlatformRule[] = [
  {
    id: 'xbox', label: 'Xbox', short: 'Xbox',
    max: 12, ideal: 10, allowUnderscore: false,
    nudges: { prefix: 3, suffix: 3, number: -4 },
    hint: 'Up to 12 characters, letters and numbers only. Xbox adds a number suffix if the name is taken.',
  },
  {
    id: 'playstation', label: 'PlayStation', short: 'PlayStation',
    min: 3, max: 16, ideal: 12,
    nudges: { prefix: 2, suffix: 2 },
    hint: '3 to 16 characters: letters, numbers, hyphens and underscores, starting with a letter.',
  },
  {
    id: 'steam', label: 'Steam', short: 'Steam',
    max: 32, ideal: 16,
    nudges: { pair: 4 },
    hint: 'Profile names can run to 32 characters and allow almost anything, so longer pairings work.',
  },
  {
    id: 'minecraft', label: 'Minecraft', short: 'Minecraft',
    min: 3, max: 16, ideal: 12,
    nudges: { pair: 4 },
    hint: 'Java Edition names are 3 to 16 characters: letters, numbers and underscores.',
  },
  {
    id: 'roblox', label: 'Roblox', short: 'Roblox',
    min: 3, max: 20, ideal: 14, maxUnderscores: 1,
    nudges: { number: 4 },
    hint: '3 to 20 characters: letters, numbers and at most one underscore, never at the start or end.',
  },
];

export const ANY_HINT = 'No platform filter. Names are kept to 20 characters, and each one shows which platforms it fits.';

export const ruleFor = (id: PlatformId): PlatformRule | undefined => PLATFORM_RULES.find((r) => r.id === id);

/** Whether a finished handle satisfies a platform's length and character rules. */
export function fits(name: string, rule: PlatformRule): boolean {
  if (!/^[a-z][a-z0-9_]*$/i.test(name) || /_$/.test(name)) return false; // starts with a letter, never ends in an underscore
  if (name.length < (rule.min ?? 0) || name.length > (rule.max ?? Infinity)) return false;
  const underscores = name.match(/_/g)?.length ?? 0;
  if (rule.allowUnderscore === false) return underscores === 0;
  return underscores <= (rule.maxUnderscores ?? Infinity);
}

export const platformsFitting = (name: string): PlatformRule[] => PLATFORM_RULES.filter((r) => fits(name, r));

/** Text for a result pill: character count plus which platforms the name suits. */
export function describeFit(name: string, selected: PlatformId): string {
  const chars = `${name.length} characters`;
  const fitting = platformsFitting(name);
  if (selected === 'any') {
    return fitting.length ? `${chars} · fits ${fitting.map((r) => r.short).join(', ')}` : `${chars} · check platform limits`;
  }
  const others = fitting.filter((r) => r.id !== selected).map((r) => r.short);
  return `${chars} · made for ${ruleFor(selected)!.label}${others.length ? ` · also fits ${others.join(', ')}` : ''}`;
}

/* ---------- Social platforms (Username Generator) ---------- */

export type SocialPlatformId = 'general' | 'instagram' | 'tiktok' | 'snapchat' | 'x';

export interface SocialRule extends Constraints {
  id: Exclude<SocialPlatformId, 'general'>;
  label: string;
  hint: string;
  /** Profile page for a username, so people can look for themselves whether it is taken. */
  profileUrl: (name: string) => string;
}

/**
 * Limits as we understand each platform's published rules. Not checked live, and platforms change them.
 * Generated handles only ever contain a-z, 0-9, dots and underscores, and never end in a dot or underscore.
 */
export const SOCIAL_RULES: SocialRule[] = [
  {
    id: 'instagram', label: 'Instagram', max: 30, ideal: 20,
    hint: 'Up to 30 characters: letters, numbers, periods and underscores.',
    profileUrl: (n) => `https://www.instagram.com/${n}/`,
  },
  {
    id: 'tiktok', label: 'TikTok', max: 24, ideal: 16,
    hint: 'Up to 24 characters: letters, numbers, underscores and periods, and it cannot end in a period.',
    profileUrl: (n) => `https://www.tiktok.com/@${n}`,
  },
  {
    id: 'snapchat', label: 'Snapchat', min: 3, max: 15, ideal: 12,
    hint: '3 to 15 characters, starting with a letter and ending with a letter or number.',
    profileUrl: (n) => `https://www.snapchat.com/add/${n}`,
  },
  {
    id: 'x', label: 'X', min: 4, max: 15, ideal: 12, allowPeriod: false,
    hint: '4 to 15 characters: letters, numbers and underscores only, so no dots.',
    profileUrl: (n) => `https://x.com/${n}`,
  },
];

export const GENERAL_HINT = 'No platform filter. Names stay within 30 characters, and each shows which platforms it fits.';

export const socialRuleFor = (id: SocialPlatformId): SocialRule | undefined => SOCIAL_RULES.find((r) => r.id === id);

/** Whether a finished username satisfies a social platform's length and character rules. */
export function socialFits(name: string, rule: SocialRule): boolean {
  if (!/^[a-z0-9][a-z0-9._]*[a-z0-9]$/i.test(name)) return false;
  if (name.length < (rule.min ?? 0) || name.length > (rule.max ?? Infinity)) return false;
  if (rule.allowPeriod === false && name.includes('.')) return false;
  if (rule.id === 'snapchat' && !/^[a-z]/i.test(name)) return false;
  return true;
}

/** Text for a username pill: length plus where it fits, or which platform it was made for. */
export function describeSocialFit(name: string, selected: SocialPlatformId): string {
  if (selected !== 'general') {
    const rule = socialRuleFor(selected)!;
    return `${name.length} of ${rule.max} characters · made for ${rule.label}`;
  }
  const fitting = SOCIAL_RULES.filter((r) => socialFits(name, r)).map((r) => r.label);
  return `${name.length} characters · ${fitting.length ? `fits ${fitting.join(', ')}` : 'check platform limits'}`;
}

/** Link that opens the platform's profile page for a username. Null on General, where there is no single profile to check. */
export function profileCheck(name: string, selected: SocialPlatformId) {
  if (selected === 'general') return null;
  const rule = socialRuleFor(selected)!;
  return {
    href: rule.profileUrl(name),
    rel: 'noopener noreferrer',
    label: 'Check if taken',
    ariaLabel: `Open ${name} on ${rule.label} to see whether it is taken (opens in a new tab)`,
    icon: 'external' as const,
  };
}
