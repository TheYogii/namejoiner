import { useState, useRef } from 'preact/hooks';
import { Plus, ChevronDown, Combine, UserRound, FilterX, Scale, Feather, Mountain, WandSparkles, type LucideIcon } from 'lucide-preact';
import ResultPills, { SavedResults } from './ResultPills';
import { useSaved } from './saved';
import { RadioPill, TogglePill, ButtonLabel } from './OptionPill';
import { validateName, normalize, TECHNIQUE_LABEL, type Combo } from '../lib/combine';
import { babyPool, babyResults, parseSiblings, MAX_SIBLINGS, type Lean, type MiddleParent } from '../lib/baby';

type Placement = 'first' | 'p1' | 'p2';

const PLACEMENTS: { id: Placement; label: string; icon: LucideIcon }[] = [
  { id: 'first', label: 'Blend into a first name', icon: Combine },
  { id: 'p1', label: 'Keep Parent 1 as the middle name', icon: UserRound },
  { id: 'p2', label: 'Keep Parent 2 as the middle name', icon: UserRound },
];

// Abstract icons on purpose: the sound preference is about ending sounds, so it avoids gendered symbols.
const LEANS: { id: Lean; label: string; icon: LucideIcon }[] = [
  { id: 'any', label: 'Any sound', icon: FilterX },
  { id: 'neutral', label: 'Gender-neutral', icon: Scale },
  { id: 'feminine', label: 'Leans traditionally feminine', icon: Feather },
  { id: 'masculine', label: 'Leans traditionally masculine', icon: Mountain },
];

interface Snapshot { pool: Combo[]; p1: string; p2: string; siblings: string[] }

const inputClass =
  'block w-full rounded-[12px] border bg-white px-4 py-3 text-base text-ink placeholder:text-ink-soft/60';

export default function BabyCombinerTool() {
  const saved = useSaved('namejoiner:saved:baby');
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [sibRaw, setSibRaw] = useState('');
  const [sibOpen, setSibOpen] = useState(false);
  const [err1, setErr1] = useState<string | null>(null);
  const [err2, setErr2] = useState<string | null>(null);
  const [errSib, setErrSib] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Placement>('first');
  const [lean, setLean] = useState<Lean>('any');
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [run, setRun] = useState(0);
  const [status, setStatus] = useState('');
  const in1 = useRef<HTMLInputElement>(null);
  const in2 = useRef<HTMLInputElement>(null);
  const inSib = useRef<HTMLInputElement>(null);

  const middleParent: MiddleParent = placement === 'p1' ? 1 : placement === 'p2' ? 2 : null;
  const results = snap ? babyResults(snap.pool, snap.p1, snap.p2, { middleParent, siblings: snap.siblings, lean }) : [];

  function onSubmit(e: Event) {
    e.preventDefault();
    const e1 = validateName(n1);
    const e2 = validateName(n2);
    const sib = parseSiblings(sibRaw);
    setErr1(e1); setErr2(e2); setErrSib(sib.error);
    if (sib.error) setSibOpen(true);
    if (e1 || e2 || sib.error) {
      (e1 ? in1 : e2 ? in2 : inSib).current?.focus();
      setSnap(null);
      setStatus('Please fix the highlighted fields.');
      return;
    }
    const s = { pool: babyPool(n1, n2), p1: normalize(n1), p2: normalize(n2), siblings: sib.names };
    setSnap(s);
    setRun((r) => r + 1);
    setStatus(`${babyResults(s.pool, s.p1, s.p2, { middleParent, siblings: s.siblings, lean }).length} baby name ideas generated.`);
  }

  function change(next: () => void, message: string) {
    next();
    setRun((r) => r + 1);
    setStatus(message);
  }

  return (
    <div class="card p-5 sm:p-8">
      <form onSubmit={onSubmit} noValidate aria-label="Baby name combiner">
        <div class="grid gap-4 min-[480px]:grid-cols-[1fr_auto_1fr] min-[480px]:items-start">
          <div>
            <label for="parent1" class="mb-1.5 block text-sm font-medium text-ink">Parent 1 name</label>
            <input
              ref={in1} id="parent1" name="parent1" type="text" value={n1} maxLength={24}
              autoComplete="off" autoCapitalize="words" spellcheck={false} placeholder="e.g. Ryan"
              aria-invalid={err1 ? 'true' : undefined} aria-describedby={err1 ? 'parent1-error' : undefined}
              onInput={(e) => { setN1((e.target as HTMLInputElement).value); setErr1(null); }}
              class={`${inputClass} ${err1 ? 'border-red-700' : 'border-line'}`}
            />
            {err1 && <p id="parent1-error" class="mt-1.5 text-sm text-red-700">{err1}</p>}
          </div>

          <div class="flex items-center justify-center text-accent min-[480px]:mt-[2.15rem]" aria-hidden="true">
            <span class="flex size-10 items-center justify-center rounded-full bg-pill-b"><Plus size={18} strokeWidth={1.75} /></span>
          </div>

          <div>
            <label for="parent2" class="mb-1.5 block text-sm font-medium text-ink">Parent 2 name</label>
            <input
              ref={in2} id="parent2" name="parent2" type="text" value={n2} maxLength={24}
              autoComplete="off" autoCapitalize="words" spellcheck={false} placeholder="e.g. Isabel"
              aria-invalid={err2 ? 'true' : undefined} aria-describedby={err2 ? 'parent2-error' : undefined}
              onInput={(e) => { setN2((e.target as HTMLInputElement).value); setErr2(null); }}
              class={`${inputClass} ${err2 ? 'border-red-700' : 'border-line'}`}
            />
            {err2 && <p id="parent2-error" class="mt-1.5 text-sm text-red-700">{err2}</p>}
          </div>
        </div>

        <details class="mt-5 rounded-[12px] border border-line bg-paper" open={sibOpen} onToggle={(e) => setSibOpen((e.currentTarget as HTMLDetailsElement).open)}>
          <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            Add sibling names (optional)
            <ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" class={`transition-transform ${sibOpen ? 'rotate-180' : ''}`} />
          </summary>
          <div class="px-4 pb-4">
            <label for="siblings" class="mb-1.5 block text-sm font-medium text-ink">Existing sibling name(s)</label>
            <input
              ref={inSib} id="siblings" name="siblings" type="text" value={sibRaw} autoComplete="off" spellcheck={false}
              placeholder="e.g. Maya, Nora"
              aria-invalid={errSib ? 'true' : undefined} aria-describedby={errSib ? 'siblings-error siblings-help' : 'siblings-help'}
              onInput={(e) => { setSibRaw((e.target as HTMLInputElement).value); setErrSib(null); }}
              class={`${inputClass} ${errSib ? 'border-red-700' : 'border-line'}`}
            />
            <p id="siblings-help" class="mt-1.5 text-sm text-ink-soft">Separate names with commas. Up to {MAX_SIBLINGS} are used and extras are ignored. Results lean toward a similar number of syllables and ending sound.</p>
            {errSib && <p id="siblings-error" class="mt-1.5 text-sm text-red-700">{errSib}</p>}
          </div>
        </details>

        <fieldset class="mt-5">
          <legend class="mb-2 text-sm font-medium text-ink">Where should the names go?</legend>
          <div class="flex flex-wrap gap-2">
            {PLACEMENTS.map((p) => (
              <RadioPill
                key={p.id} name="placement" value={p.id} checked={placement === p.id} label={p.label} icon={p.icon}
                onChange={() => change(() => setPlacement(p.id), `Placement set to: ${p.label}.`)}
              />
            ))}
          </div>
        </fieldset>

        <button type="submit" class="btn-primary mt-6 inline-flex w-full items-center justify-center rounded-full font-medium focus-visible:outline-offset-4 sm:w-auto">
          <ButtonLabel icon={WandSparkles}>Generate baby names</ButtonLabel>
        </button>
      </form>

      <p class="sr-only" role="status" aria-live="polite">{status}</p>

      {snap && (
        <div class="mt-8 border-t border-line pt-6" aria-labelledby="baby-results-heading">
          <h2 id="baby-results-heading" class="text-xl">Baby name ideas from {snap.p1} and {snap.p2}</h2>
          <p class="mt-1 text-sm text-ink-soft">
            {middleParent ? `Each name below is a new first name paired with ${middleParent === 1 ? snap.p1 : snap.p2} as the middle name.` : 'Each name is shown with a syllable break to help you say it.'}
            {snap.siblings.length > 0 && ` Nudged toward the style of ${snap.siblings.join(', ')}.`}
          </p>

          <div class="mt-4">
            <p id="lean-label" class="mb-2 text-sm font-medium text-ink">Sound preference (optional)</p>
            <div role="group" aria-labelledby="lean-label" class="flex flex-wrap gap-2">
              {LEANS.map((l) => (
                <TogglePill
                  key={l.id} pressed={lean === l.id} label={l.label} icon={l.icon}
                  onClick={() => change(() => setLean(l.id), `Sound preference: ${l.label}.`)}
                />
              ))}
            </div>
            <p class="mt-2 text-sm text-ink-soft">This filters by ending sound only. It is a preference, not a rule, and any name suits any child.</p>
          </div>

          {results.length < 12 && (
            <p class="mt-3 rounded-[12px] bg-paper px-4 py-3 text-sm text-ink-soft">
              These two names share few sounds to work with, so we kept only the cleanest blends instead of padding the list. Full names, or a longer spelling of each, usually give more options.
            </p>
          )}

          <ResultPills
            run={run} announce={setStatus} saved={saved}
            items={results.map((r) => ({
              key: r.key, label: r.full, copy: r.full, sub: r.syllables, title: TECHNIQUE_LABEL[r.technique],
            }))}
          />
          <p class="mt-4 text-sm text-ink-soft">Hover over a name to see which blending technique made it. Treat every result as a starting point.</p>
        </div>
      )}

      <SavedResults saved={saved} announce={setStatus} tool="baby" />
    </div>
  );
}
