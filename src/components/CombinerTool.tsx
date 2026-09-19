import { useRef, useState } from 'preact/hooks';
import { Heart, Flower2, Sparkles, Gem, Ship, Fingerprint, FilterX, Layers, Minus, Equal, AlignJustify, Combine, type LucideIcon } from 'lucide-preact';
import ResultPills, { SavedResults } from './ResultPills';
import { useSaved } from './saved';
import FormSection from './FormSection';
import { RadioPill, ButtonLabel } from './OptionPill';
import { validateName, normalize, TECHNIQUE_LABEL, type Style } from '../lib/combine';
import { buildCouplePool, pickCouple, type CoupleResult, type Vibe } from '../lib/couple';

const LENGTHS: { id: Style; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'short', label: 'Short', icon: Minus },
  { id: 'medium', label: 'Medium', icon: Equal },
  { id: 'long', label: 'Long', icon: AlignJustify },
];

const VIBES: { id: Vibe; label: string; help: string; icon: LucideIcon }[] = [
  { id: 'any', label: 'Any vibe', icon: FilterX, help: 'No preference. Every technique, ranked the standard way.' },
  { id: 'romantic', label: 'Romantic', icon: Flower2, help: 'Softer, flowing blends with open sounds and gentle endings.' },
  { id: 'cute', label: 'Cute', icon: Sparkles, help: 'Shorter names with soft endings, plus a few softened short blends like Bennie.' },
  { id: 'wedding', label: 'Wedding', icon: Gem, help: 'Names that read cleanly as a hashtag. Hyphenated results are dropped.' },
  { id: 'ship', label: 'Ship Name', icon: Ship, help: 'The classic portmanteau blends first, and pooled letters and shared-sound blends last.' },
  { id: 'unique', label: 'Unique', icon: Fingerprint, help: 'Rarer letters and unusual patterns. Simple joins and hyphenated results are dropped.' },
];

const inputClass =
  'block w-full rounded-[12px] border bg-white px-4 py-3 text-base text-ink placeholder:text-ink-soft/60';

export default function CombinerTool() {
  const saved = useSaved('namejoiner:saved:couple');
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [err1, setErr1] = useState<string | null>(null);
  const [err2, setErr2] = useState<string | null>(null);
  const [names, setNames] = useState<{ a: string; b: string } | null>(null);
  const [pool, setPool] = useState<CoupleResult[] | null>(null);
  const [style, setStyle] = useState<Style>('all');
  const [vibe, setVibe] = useState<Vibe>('any');
  const [run, setRun] = useState(0);
  const [status, setStatus] = useState('');
  const in1 = useRef<HTMLInputElement>(null);
  const in2 = useRef<HTMLInputElement>(null);

  const results = pool ? pickCouple(pool, style, vibe) : [];

  function onSubmit(e: Event) {
    e.preventDefault();
    const e1 = validateName(n1);
    const e2 = validateName(n2);
    setErr1(e1);
    setErr2(e2);
    if (e1 || e2) {
      (e1 ? in1 : in2).current?.focus();
      setPool(null);
      setNames(null);
      setStatus('Please fix the highlighted name fields.');
      return;
    }
    const next = buildCouplePool(n1, n2, vibe);
    setNames({ a: normalize(n1), b: normalize(n2) });
    setPool(next);
    setRun((r) => r + 1);
    setStatus(`${pickCouple(next, style, vibe).length} name ideas generated.`);
  }

  function chooseStyle(s: Style) {
    setStyle(s);
    setRun((r) => r + 1);
    if (pool) setStatus(`Showing ${s === 'all' ? 'all' : s} results: ${pickCouple(pool, s, vibe).length} names.`);
  }

  function chooseVibe(v: Vibe) {
    setVibe(v);
    if (!names) return;
    // Vibes change which candidates are built, not just their order, so rebuild the pool.
    const next = buildCouplePool(names.a, names.b, v);
    setPool(next);
    setRun((r) => r + 1);
    setStatus(`${pickCouple(next, style, v).length} ${v === 'any' ? '' : `${VIBES.find((x) => x.id === v)!.label} `}name ideas.`);
  }

  const currentVibe = VIBES.find((v) => v.id === vibe)!;

  return (
    <div class="card p-5 sm:p-8">
      <form onSubmit={onSubmit} noValidate aria-label="Couple name combiner">
        <div class="space-y-3">
          <FormSection>
            <div class="grid gap-4 min-[480px]:grid-cols-[1fr_auto_1fr] min-[480px]:items-start">
              <div>
                <label for="name1" class="mb-1.5 block text-sm font-medium text-ink">First name</label>
                <input
                  ref={in1} id="name1" name="name1" type="text" value={n1} maxLength={24}
                  autoComplete="off" autoCapitalize="words" spellcheck={false} placeholder="e.g. Priya"
                  aria-invalid={err1 ? 'true' : undefined} aria-describedby={err1 ? 'name1-error' : undefined}
                  onInput={(e) => { setN1((e.target as HTMLInputElement).value); setErr1(null); }}
                  class={`${inputClass} ${err1 ? 'border-red-700' : 'border-line'}`}
                />
                {err1 && <p id="name1-error" class="mt-1.5 text-sm text-red-700">{err1}</p>}
              </div>

              <div class="flex items-center justify-center text-accent min-[480px]:mt-[2.15rem]" aria-hidden="true">
                <span class="flex size-10 items-center justify-center rounded-full bg-pill-a">
                  <Heart size={18} strokeWidth={1.75} />
                </span>
              </div>

              <div>
                <label for="name2" class="mb-1.5 block text-sm font-medium text-ink">Second name</label>
                <input
                  ref={in2} id="name2" name="name2" type="text" value={n2} maxLength={24}
                  autoComplete="off" autoCapitalize="words" spellcheck={false} placeholder="e.g. Rohan"
                  aria-invalid={err2 ? 'true' : undefined} aria-describedby={err2 ? 'name2-error' : undefined}
                  onInput={(e) => { setN2((e.target as HTMLInputElement).value); setErr2(null); }}
                  class={`${inputClass} ${err2 ? 'border-red-700' : 'border-line'}`}
                />
                {err2 && <p id="name2-error" class="mt-1.5 text-sm text-red-700">{err2}</p>}
              </div>
            </div>
          </FormSection>

          <div class="grid gap-3 md:grid-cols-[3fr_2fr]">
            <FormSection>
              <fieldset>
                <legend class="mb-2 text-sm font-medium text-ink">Vibe</legend>
                <div class="flex flex-wrap gap-2">
                  {VIBES.map(({ id, label, icon }) => (
                    <RadioPill key={id} name="vibe" value={id} checked={vibe === id} onChange={() => chooseVibe(id)} label={label} icon={icon} />
                  ))}
                </div>
                <p class="mt-2 text-sm text-ink-soft" aria-live="polite">{currentVibe.help}</p>
              </fieldset>
            </FormSection>

            <FormSection>
              <fieldset>
                <legend class="mb-2 text-sm font-medium text-ink">Length</legend>
                <div role="group" aria-label="Filter by length" class="flex flex-wrap gap-2">
                  {LENGTHS.map((s) => (
                    <RadioPill key={s.id} name="length" value={s.id} checked={style === s.id} onChange={() => chooseStyle(s.id)} label={s.label} icon={s.icon} />
                  ))}
                </div>
                <p class="mt-2 text-sm text-ink-soft">Short is about five letters or fewer, Medium six to eight, Long nine or more.</p>
              </fieldset>
            </FormSection>
          </div>
        </div>

        <button type="submit" class="btn-primary mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full px-8 text-base font-medium focus-visible:outline-offset-4 sm:w-auto">
          <ButtonLabel icon={Combine}>Combine names</ButtonLabel>
        </button>
      </form>

      <p class="sr-only" role="status" aria-live="polite">{status}</p>

      {pool && (
        <div class="mt-8 border-t border-line pt-6" aria-labelledby="results-heading">
          <h2 id="results-heading" class="text-xl">Your combined names{vibe !== 'any' ? `, ${currentVibe.label.toLowerCase()} vibe` : ''}</h2>

          {results.length < 12 && (
            <p class="mt-3 rounded-[12px] bg-paper px-4 py-3 text-sm text-ink-soft">
              These two names share few sounds to work with, so we kept only the cleanest blends instead of padding the list. Full names, or a longer spelling of each, usually give more options.
            </p>
          )}

          <ResultPills
            run={run} announce={setStatus} saved={saved}
            items={results.map((r) => ({
              key: r.name, label: r.name, copy: r.name, title: r.label ?? TECHNIQUE_LABEL[r.technique],
              sub: vibe === 'wedding' && r.reason ? `${r.reason} · #${r.name}` : r.reason,
            }))}
          />
          <p class="mt-4 text-sm text-ink-soft">Hover over a name to see which blending technique made it.</p>
        </div>
      )}

      <SavedResults saved={saved} announce={setStatus} tool="couple" />
    </div>
  );
}
