import { useState, useRef } from 'preact/hooks';
import { Plus, Layers, Minus, Tag, Combine, WandSparkles, type LucideIcon } from 'lucide-preact';
import ResultPills, { SavedResults } from './ResultPills';
import { useSaved } from './saved';
import { TogglePill, ButtonLabel } from './OptionPill';
import { validateName, normalize } from '../lib/combine';
import { businessPool, pickBusiness, BIZ_TECHNIQUE_LABEL, type BizPool, type BizStyle } from '../lib/business';
import { domainCheckLink, isMonetized, REGISTRAR_NAME } from '../lib/registrar';

const STYLES: { id: BizStyle; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'short', label: 'Short', icon: Minus },
  { id: 'brandable', label: 'Brandable', icon: Tag },
  { id: 'compound', label: 'Compound', icon: Combine },
];

const STYLE_HELP: Record<BizStyle, string> = {
  all: 'A mix of blended names and simple joins.',
  short: 'Blends of four to six letters, easy to type into a browser.',
  brandable: 'Blends that merge both words into one invented name.',
  compound: 'Both words joined whole, with or without a prefix like Get or a suffix like Labs.',
};

const inputClass =
  'block w-full rounded-[12px] border bg-white px-4 py-3 text-base text-ink placeholder:text-ink-soft/60';

export default function BusinessNameTool() {
  const saved = useSaved('namejoiner:saved:business');
  const [w1, setW1] = useState('');
  const [w2, setW2] = useState('');
  const [err1, setErr1] = useState<string | null>(null);
  const [err2, setErr2] = useState<string | null>(null);
  const [pool, setPool] = useState<{ data: BizPool; a: string; b: string } | null>(null);
  const [style, setStyle] = useState<BizStyle>('all');
  const [run, setRun] = useState(0);
  const [status, setStatus] = useState('');
  const in1 = useRef<HTMLInputElement>(null);
  const in2 = useRef<HTMLInputElement>(null);

  const results = pool ? pickBusiness(pool.data, style) : [];

  function onSubmit(e: Event) {
    e.preventDefault();
    const e1 = validateName(w1);
    const e2 = validateName(w2);
    setErr1(e1);
    setErr2(e2);
    if (e1 || e2) {
      (e1 ? in1 : in2).current?.focus();
      setPool(null);
      setStatus('Please fix the highlighted fields.');
      return;
    }
    const next = { data: businessPool(w1, w2), a: normalize(w1), b: normalize(w2) };
    setPool(next);
    setRun((r) => r + 1);
    setStatus(`${pickBusiness(next.data, style).length} business name ideas generated.`);
  }

  function chooseStyle(s: BizStyle) {
    setStyle(s);
    setRun((r) => r + 1);
    if (pool) setStatus(`Showing ${s} names: ${pickBusiness(pool.data, s).length} results.`);
  }

  return (
    <div class="card p-5 sm:p-8">
      <form onSubmit={onSubmit} noValidate aria-label="Business name generator">
        <div class="grid gap-4 min-[480px]:grid-cols-[1fr_auto_1fr] min-[480px]:items-start">
          <div>
            <label for="word1" class="mb-1.5 block text-sm font-medium text-ink">Word or name 1</label>
            <input
              ref={in1} id="word1" name="word1" type="text" value={w1} maxLength={24}
              autoComplete="off" autoCapitalize="none" spellcheck={false} placeholder="e.g. Fresh"
              aria-invalid={err1 ? 'true' : undefined} aria-describedby={err1 ? 'word1-error word-help' : 'word-help'}
              onInput={(e) => { setW1((e.target as HTMLInputElement).value); setErr1(null); }}
              class={`${inputClass} ${err1 ? 'border-red-700' : 'border-line'}`}
            />
            {err1 && <p id="word1-error" class="mt-1.5 text-sm text-red-700">{err1}</p>}
          </div>

          <div class="flex items-center justify-center text-ink-soft min-[480px]:mt-[2.15rem]" aria-hidden="true">
            <span class="flex size-10 items-center justify-center rounded-full border border-line bg-paper"><Plus size={18} strokeWidth={1.75} /></span>
          </div>

          <div>
            <label for="word2" class="mb-1.5 block text-sm font-medium text-ink">Word or name 2</label>
            <input
              ref={in2} id="word2" name="word2" type="text" value={w2} maxLength={24}
              autoComplete="off" autoCapitalize="none" spellcheck={false} placeholder="e.g. Ledger"
              aria-invalid={err2 ? 'true' : undefined} aria-describedby={err2 ? 'word2-error word-help' : 'word-help'}
              onInput={(e) => { setW2((e.target as HTMLInputElement).value); setErr2(null); }}
              class={`${inputClass} ${err2 ? 'border-red-700' : 'border-line'}`}
            />
            {err2 && <p id="word2-error" class="mt-1.5 text-sm text-red-700">{err2}</p>}
          </div>
        </div>
        <p id="word-help" class="mt-3 text-sm text-ink-soft">One word per box: an industry keyword, a quality word, a product idea or a founder’s name.</p>

        <button type="submit" class="btn-primary mt-6 inline-flex w-full items-center justify-center rounded-full font-medium focus-visible:outline-offset-4 sm:w-auto">
          <ButtonLabel icon={WandSparkles}>Generate names</ButtonLabel>
        </button>
      </form>

      <p class="sr-only" role="status" aria-live="polite">{status}</p>

      {pool && (
        <div class="mt-8 border-t border-line pt-6" aria-labelledby="biz-results-heading">
          <h2 id="biz-results-heading" class="text-xl">Business name ideas from {pool.a} and {pool.b}</h2>

          <div role="group" aria-label="Name style" class="mt-4 flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <TogglePill key={s.id} pressed={style === s.id} onClick={() => chooseStyle(s.id)} label={s.label} icon={s.icon} />
            ))}
          </div>
          <p class="mt-2 text-sm text-ink-soft">{STYLE_HELP[style]}</p>

          {results.length < 12 && (
            <p class="mt-3 rounded-[12px] bg-paper px-4 py-3 text-sm text-ink-soft">
              These two words share few sounds to work with, so we kept only the cleanest blends instead of padding the list. Longer words, or a different pairing, usually give more options.
            </p>
          )}

          <ResultPills
            run={run} announce={setStatus} saved={saved}
            items={results.map((r) => ({
              key: r.name, label: r.name, copy: r.name, title: BIZ_TECHNIQUE_LABEL[r.technique],
              link: {
                ...domainCheckLink(r.name), label: 'Check .com',
                ariaLabel: `Check whether ${r.name.toLowerCase()}.com is available at ${REGISTRAR_NAME} (opens in a new tab)`,
              },
            }))}
          />

          <p class="mt-4 text-sm text-ink-soft">
            “Check .com” opens a {REGISTRAR_NAME} search in a new tab. Availability changes quickly, so confirm at the registrar.
            {isMonetized && ' NameJoiner may earn a commission if you register a domain through these links, at no extra cost to you.'}
          </p>
        </div>
      )}

      <SavedResults saved={saved} announce={setStatus} tool="business" />
    </div>
  );
}
