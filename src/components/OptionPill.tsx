/**
 * Shared option pills and button labels. Every selector on the site renders through these, so an icon is always the same
 * size, weight, spacing and color, and the `icon` prop is required: an option cannot be added without one.
 * Icons come from Lucide (outline, 1.75 stroke), the same set as the Couple Name Combiner's Vibe badges.
 */
import type { LucideIcon } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { radioPill, togglePill, pillIcon } from './pillStyles';

/** Icon size next to a pill label, and next to a primary-button label. The gap between icon and text is gap-2 in both. */
export const PILL_ICON_SIZE = 16;
export const BUTTON_ICON_SIZE = 18;
const STROKE = 1.75;

interface RadioPillProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  icon: LucideIcon;
}

/** One option of a radio group: a visually hidden radio input inside a pill with an icon and a label. */
export function RadioPill({ name, value, checked, onChange, label, icon: Icon }: RadioPillProps) {
  return (
    <label class={radioPill}>
      <input type="radio" name={name} value={value} checked={checked} class="sr-only" onChange={onChange} />
      <Icon size={PILL_ICON_SIZE} strokeWidth={STROKE} aria-hidden="true" class={pillIcon} />
      {label}
    </label>
  );
}

interface TogglePillProps {
  pressed: boolean;
  onClick: () => void;
  label: string;
  icon: LucideIcon;
}

/** One option of a filter group: a button with aria-pressed, an icon and a label. */
export function TogglePill({ pressed, onClick, label, icon: Icon }: TogglePillProps) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} class={togglePill}>
      <Icon size={PILL_ICON_SIZE} strokeWidth={STROKE} aria-hidden="true" class={pillIcon} />
      {label}
    </button>
  );
}

/** Leading icon plus label for a primary action button. Spacing comes from .btn-primary's gap. */
export function ButtonLabel({ icon: Icon, children }: { icon: LucideIcon; children: ComponentChildren }) {
  return (
    <>
      <Icon size={BUTTON_ICON_SIZE} strokeWidth={STROKE} aria-hidden="true" />
      {children}
    </>
  );
}
