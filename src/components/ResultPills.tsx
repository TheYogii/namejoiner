import { useEffect, useRef, useState } from 'preact/hooks';
import { Copy, Check, Globe, ExternalLink, Bookmark, Share2, MessageCircle, Send, Mail, Users, X, Volume2 } from 'lucide-preact';
import { copyText } from '../lib/clipboard';
import type { Saved } from './saved';
import { canSpeak, speak, stopIfCurrent } from './speak';

export interface PillItem {
  key: string;
  label: string;
  /** Optional decorative version of the label, such as stylized Unicode. Screen readers still hear `label`. */
  display?: string;
  copy: string;
  /** Extra copy options. When given, each gets its own labelled button instead of the single copy icon. */
  copies?: { label: string; value: string }[];
  /** Small line under the label, e.g. a syllable break. */
  sub?: string;
  title?: string;
  /** Optional outbound action shown after the copy button, e.g. a domain search. */
  link?: { href: string; rel: string; label: string; ariaLabel: string; icon?: 'globe' | 'external' };
}

interface PillProps {
  item: PillItem;
  index: number;
  /** Changes whenever results are regenerated, so the fade-in replays. */
  run: number | string;
  announce: (message: string) => void;
  saved: Saved;
}

/** One tinted result pill: label, copy button(s), a save toggle (when storage works) and an optional outbound link. */
function Pill({ item, index: i, run, announce, saved }: PillProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number>();
  const isSaved = saved.isSaved(item.key);
  const [speaking, setSpeaking] = useState(false);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const speechOk = canSpeak();

  // If this pill goes away while it is speaking (new results, an unsave), stop its speech. Another pill's speech is left alone.
  useEffect(() => () => stopIfCurrent(utterance.current), []);

  function onListen() {
    utterance.current = speak(item.label, {
      onStart: (u) => { if (utterance.current === u) setSpeaking(true); },
      // A cancelled utterance also ends, so only the pill's latest utterance may clear the state.
      onEnd: (u) => { if (utterance.current === u) { utterance.current = null; setSpeaking(false); } },
    });
    if (!utterance.current) setSpeaking(false);
  }

  async function onCopy(value = item.copy, which = item.key) {
    const ok = await copyText(value);
    announce(ok ? `Copied ${item.label}${value === item.copy ? '' : ' (fancy text)'}` : `Could not copy ${item.label}. Select and copy it manually.`);
    if (!ok) return;
    setCopied(which);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 1600);
  }

  function onSave() {
    const nowSaved = saved.toggle(item);
    announce(nowSaved ? `Saved ${item.label}.` : `Removed ${item.label} from saved.`);
  }

  return (
    <li
      key={`${run}-${item.key}`}
      class={`pill-in flex max-w-full items-center gap-0.5 sm:gap-1 rounded-3xl border border-accent/20 py-1.5 pl-3.5 pr-1 sm:py-1.5 sm:pl-4 sm:pr-1.5 ${i % 2 ? 'bg-pill-b' : 'bg-pill-a'}`}
      style={{ animation: `pill-in .35s ease-out ${Math.min(i, 20) * 35}ms both` }}
      title={item.title}
    >
      <span class="flex flex-col leading-tight">
        {item.display ? (
          <span class="text-base font-medium text-ink">
            <span aria-hidden="true">{item.display}</span>
            <span class="sr-only">{item.label}</span>
          </span>
        ) : (
          <span class="text-base font-medium text-ink">{item.label}</span>
        )}
        {item.sub && <span class="text-xs text-ink-soft">{item.sub}</span>}
      </span>
      {item.copies ? (
        item.copies.map((c) => (
          <button
            type="button" key={c.label} onClick={() => onCopy(c.value, `${item.key}|${c.label}`)}
            aria-label={`Copy ${c.label.toLowerCase()} version of ${item.label}`}
            class="inline-flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium text-accent-dark hover:bg-white/70 sm:min-h-9 sm:px-2.5"
          >
            {copied === `${item.key}|${c.label}` ? <Check size={14} strokeWidth={1.75} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.75} aria-hidden="true" />}
            {c.label}
          </button>
        ))
      ) : (
        <button
          type="button" onClick={() => onCopy()} aria-label={`Copy ${item.copy}`}
          class="flex size-8 shrink-0 items-center justify-center rounded-full text-accent-dark hover:bg-white/70 sm:size-9"
        >
          {copied === item.key ? <Check size={16} strokeWidth={1.75} aria-hidden="true" class="size-3.5 sm:size-4" /> : <Copy size={16} strokeWidth={1.75} aria-hidden="true" class="size-3.5 sm:size-4" />}
        </button>
      )}
      {speechOk && (
        <button
          type="button" onClick={onListen} aria-label={`Hear ${item.label} spoken aloud`}
          class={`flex size-8 shrink-0 items-center justify-center rounded-full text-accent-dark hover:bg-white/70 sm:size-9 ${speaking ? 'bg-white/80' : ''}`}
        >
          <Volume2 size={16} strokeWidth={1.75} aria-hidden="true" class={`size-3.5 sm:size-4 ${speaking ? 'motion-safe:animate-pulse' : ''}`} />
        </button>
      )}
      {saved.available && (
        <button
          type="button" onClick={onSave} aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${item.label} from saved` : `Save ${item.label}`}
          class="flex size-8 shrink-0 items-center justify-center rounded-full text-accent-dark hover:bg-white/70 sm:size-9"
        >
          <Bookmark size={16} strokeWidth={1.75} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" class="size-3.5 sm:size-4" />
        </button>
      )}
      {item.link && (
        <a
          href={item.link.href} target="_blank" rel={item.link.rel} aria-label={item.link.ariaLabel}
          class="mr-0.5 inline-flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium text-accent-dark hover:bg-white/70 sm:min-h-9 sm:px-2.5"
        >
          {item.link.icon === 'external' ? <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" /> : <Globe size={14} strokeWidth={1.75} aria-hidden="true" />}
          {item.link.label}
        </a>
      )}
    </li>
  );
}

interface Props {
  items: PillItem[];
  run: number;
  announce: (message: string) => void;
  saved: Saved;
}

/** Alternating tinted result pills with copy and save buttons. Colours come from the page's data-theme. */
export default function ResultPills({ items, run, announce, saved }: Props) {
  return (
    <ul class="mt-5 flex flex-wrap gap-3">
      {items.map((item, i) => <Pill key={`${run}-${item.key}`} item={item} index={i} run={run} announce={announce} saved={saved} />)}
    </ul>
  );
}

/** What to call each tool's saved names in a shared message, and the page the message links back to. */
const SHARE_INFO: Record<string, { noun: string; path: string }> = {
  couple: { noun: 'couple names', path: '/couple-name-combiner' },
  baby: { noun: 'baby names', path: '/baby-name-combiner' },
  business: { noun: 'business names', path: '/business-name-generator' },
  username: { noun: 'usernames', path: '/username-generator' },
  gamertag: { noun: 'gamertags', path: '/gamertag-generator' },
  nickname: { noun: 'nicknames', path: '/nickname-generator' },
};
const SITE = 'https://namejoiner.com';
const MAX_SHARED_NAMES = 30;

/**
 * The text that gets shared: the saved names as plain text, plus a link back to the tool. It does not carry the generated results
 * or any page state (the site has no backend to hold that), so whoever receives it opens the tool fresh.
 */
function buildShare(tool: string, items: PillItem[]) {
  const info = SHARE_INFO[tool];
  const names = items.slice(0, MAX_SHARED_NAMES).map((i) => i.label);
  const more = items.length - names.length;
  const url = `${SITE}${info.path}`;
  const text = `My favorite ${info.noun} from NameJoiner: ${names.join(', ')}${more > 0 ? ` and ${more} more` : ''}`;
  return { text, url, block: `${text}\n${url}`, subject: `My favorite ${info.noun} from NameJoiner` };
}

const shareLinkClass = 'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-accent-dark hover:bg-accent-bg';
const optionClass = 'inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-medium text-accent-dark hover:border-accent hover:bg-accent-bg';

/** The "Saved results" section. It renders nothing until something is saved, and it does not depend on a search having been run. */
export function SavedResults({ saved, announce, tool }: { saved: Saved; announce: (message: string) => void; tool: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();
  const dialog = useRef<HTMLDialogElement>(null);
  const shareButton = useRef<HTMLButtonElement>(null);
  if (!saved.available || saved.items.length === 0) return null;

  const share = buildShare(tool, saved.items);

  function openDialog() {
    // showModal() traps focus inside the dialog, makes the rest of the page inert and closes on Escape.
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }

  function closeDialog() {
    dialog.current?.close();
  }

  // The page behind a modal dialog is inert, but Tab can still leave through the browser's own controls. Wrap it around inside the dialog instead.
  function trapTab(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !dialog.current) return;
    const focusable = dialog.current.querySelectorAll<HTMLElement>('button, a[href]');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  async function onShare() {
    // Native share sheet where the browser has one (mostly phones and tablets); otherwise the dialog with copy and quick-share options.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: share.subject, text: share.text, url: share.url });
        return;
      } catch (e) {
        // Closing the share sheet without choosing anything is not an error.
        if (e instanceof DOMException && e.name === 'AbortError') return;
        announce('Sharing did not open. Use the copy button or a share link instead.');
      }
    }
    openDialog();
  }

  async function onCopyShare() {
    const ok = await copyText(share.block);
    announce(ok ? 'Copied your saved names and link.' : 'Could not copy. Select the text and copy it manually.');
    if (!ok) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section class="mt-8 border-t border-line pt-6" aria-labelledby="saved-heading">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="saved-heading" class="text-xl">Saved results</h2>
        <div class="flex items-center gap-1">
          <button ref={shareButton} type="button" onClick={onShare} aria-haspopup="dialog" class={shareLinkClass}>
            <Share2 size={16} strokeWidth={1.75} aria-hidden="true" />
            Share
          </button>
          <button
            type="button"
            onClick={() => { saved.clear(); closeDialog(); announce('Cleared all saved results.'); }}
            class="inline-flex min-h-9 items-center rounded-full px-3 text-sm font-medium text-accent-dark hover:bg-accent-bg"
          >
            Clear saved
          </button>
        </div>
      </div>
      <p class="mt-1 text-sm text-ink-soft">
        Kept in this browser only. They stay after a refresh and are never sent anywhere until you share them. Sharing sends your saved names as plain text with a link to this tool, not your results page.
      </p>
      <ul class="mt-4 flex flex-wrap gap-3">
        {saved.items.map((item, i) => <Pill key={item.key} item={item} index={i} run="saved" announce={announce} saved={saved} />)}
      </ul>

      <dialog
        ref={dialog}
        aria-labelledby="share-title" aria-modal="true"
        class="share-dialog m-auto w-[min(30rem,calc(100vw-2rem))] rounded-[16px] border border-line bg-white p-0 text-ink"
        onClick={(e) => { if (e.target === e.currentTarget) closeDialog(); }}
        onClose={() => shareButton.current?.focus()}
        onKeyDown={trapTab}
      >
        <div class="p-5 sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <h2 id="share-title" class="text-xl">Share your saved names</h2>
            <button
              type="button" onClick={closeDialog} aria-label="Close"
              class="-mr-2 -mt-1 flex size-10 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-accent-bg hover:text-ink"
            >
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          <p class="mt-3 text-sm font-medium text-ink">Preview</p>
          <p class="mt-1 whitespace-pre-line break-words rounded-[12px] border border-line bg-paper p-3 text-sm leading-6 text-ink-soft">{share.block}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onCopyShare} autofocus class="btn-primary inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-medium">
              {copied ? <Check size={16} strokeWidth={1.75} aria-hidden="true" /> : <Copy size={16} strokeWidth={1.75} aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy to clipboard'}
            </button>
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(share.block)}`} target="_blank" rel="noopener noreferrer" class={optionClass}>
              <MessageCircle size={16} strokeWidth={1.75} aria-hidden="true" />
              WhatsApp<span class="sr-only"> (opens in a new tab)</span>
            </a>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(share.text)}&url=${encodeURIComponent(share.url)}`} target="_blank" rel="noopener noreferrer" class={optionClass}>
              <Send size={16} strokeWidth={1.75} aria-hidden="true" />
              X<span class="sr-only"> (opens in a new tab)</span>
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(share.url)}`} target="_blank" rel="noopener noreferrer" class={optionClass}>
              <Users size={16} strokeWidth={1.75} aria-hidden="true" />
              Facebook<span class="sr-only"> (opens in a new tab)</span>
            </a>
            <a href={`mailto:?subject=${encodeURIComponent(share.subject)}&body=${encodeURIComponent(share.block)}`} class={optionClass}>
              <Mail size={16} strokeWidth={1.75} aria-hidden="true" />
              Email
            </a>
          </div>
          <p class="mt-3 text-xs leading-5 text-ink-soft">Facebook only accepts a link, so it shares the link to this tool without your names. Use Copy, WhatsApp, X or Email to send the names too.</p>
        </div>
      </dialog>
    </section>
  );
}
