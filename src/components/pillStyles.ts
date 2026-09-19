/**
 * The one pill style used by every option selector on the site (vibes, styles, platforms, audiences, lengths, filters).
 * Keeping the classes here stops the tools drifting apart. A pill can hold an optional icon before its label.
 *
 * radioPill  → for a <label> wrapping a visually hidden radio input (state comes from :checked)
 * togglePill → for a <button aria-pressed> (state comes from aria-pressed)
 * Selected uses the theme's primary-dark fill, which keeps white text at AA contrast.
 */
const base =
  'group inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm text-ink-soft transition-colors hover:text-ink';

export const radioPill = `${base} cursor-pointer has-[:checked]:border-accent-dark has-[:checked]:bg-accent-dark has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-dark`;

export const togglePill = `${base} aria-pressed:border-accent-dark aria-pressed:bg-accent-dark aria-pressed:text-white focus-visible:outline-offset-2`;

/** Icon colour inside a pill: the theme accent when idle, white once selected. Works for both pill types. */
export const pillIcon = 'text-accent transition-colors group-has-[:checked]:text-white group-aria-pressed:text-white';
