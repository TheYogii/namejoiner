import type { ComponentChildren } from 'preact';

interface Props {
  /** true draws the bordered, tinted group. false is a plain spacer, for tools that keep the flat layout. */
  boxed?: boolean;
  children: ComponentChildren;
}

/** A bordered group of related controls inside a single form. No step numbers, so it reads as one form. */
export default function FormSection({ boxed = true, children }: Props) {
  if (!boxed) return <div class="mt-5 first:mt-0">{children}</div>;
  return <div class="rounded-[12px] border border-line bg-paper p-4 sm:p-5">{children}</div>;
}
