import { useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import ResultPills, { SavedResults } from './ResultPills';
import { useSaved } from './saved';
import { RadioPill, ButtonLabel } from './OptionPill';
import { ToggleLeft, ToggleRight, WandSparkles, type LucideIcon } from 'lucide-preact';
import FormSection from './FormSection';
import { validateName } from '../lib/combine';
import { buildHandles, toHandleBase, TECHNIQUE_LABEL, type Constraints, type Handle, type StyleConfig } from '../lib/handles';

export interface HandleStyleOption {
  id: string;
  label: string;
  help: string;
  /** Required, so no option can be added without an icon. */
  icon: LucideIcon;
}

export interface PlatformOption {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

export interface HandleToolProps {
  /** Accessible name for the form, e.g. "Username generator". */
  formLabel: string;
  placeholder: string;
  helpText: string;
  buttonLabel: string;
  styles: HandleStyleOption[];
  configs: Record<string, StyleConfig>;
  defaultStyle: string;
  /** Short platform-fit label for a handle's length. Used when there is no platform selector. */
  fit?: (length: number) => string;
  footnote: ComponentChildren;
  /** Optional second control. When given, results are built against the chosen platform's constraints. */
  platforms?: PlatformOption[];
  defaultPlatform?: string;
  platformNote?: ComponentChildren;
  constraintsFor?: (platformId: string) => Constraints | undefined;
  /** Optional per-result link, such as a profile check. Return null for none. */
  resultLink?: (name: string, platformId: string) => { href: string; rel: string; label: string; ariaLabel: string; icon?: 'globe' | 'external' } | null;
  /** Text under each result. Receives the platform so it can say where the name fits. */
  resultSub?: (name: string, platformId: string) => string;
  /** Optional second word. When it is filled in, `build` replaces the single-word engine. When empty, nothing changes. */
  interest?: {
    label: string;
    placeholder: string;
    help: string;
    build: (base: string, interest: string, style: string, constraints: Constraints | undefined, shuffle: boolean) => Handle[];
  };
  /** Optional Off/On toggle that shows each result in a decorative form, keeping the plain text available to copy. */
  stylize?: {
    apply: (plain: string, style: string) => string;
    help: ComponentChildren;
    /** Shown under the results while it is on. */
    note: ComponentChildren;
  };
  /** localStorage key for this tool's saved favorites, unique per tool so lists never mix. */
  saveKey: string;
  /** Lay the controls out as separate bordered sections instead of one flat block. */
  sectioned?: boolean;
}

const inputClass =
  'block w-full rounded-[12px] border bg-white px-4 py-3 text-base text-ink placeholder:text-ink-soft/60';


/** Shared form, style picker and result list for handle-style tools. The lists, limits and platforms are passed in as props. */
export default function HandleTool(props: HandleToolProps) {
  const { formLabel, placeholder, helpText, buttonLabel, styles, configs, defaultStyle, fit, footnote, platforms, platformNote, constraintsFor, resultSub, resultLink } = props;
  const sectioned = props.sectioned ?? false;
  const noFilter = props.defaultPlatform ?? '';
  const saved = useSaved(props.saveKey);

  const [raw, setRaw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [style, setStyle] = useState(defaultStyle);
  const [platform, setPlatform] = useState(props.defaultPlatform ?? '');
  const [base, setBase] = useState<string | null>(null);
  const [handles, setHandles] = useState<ReturnType<typeof buildHandles>>([]);
  const [run, setRun] = useState(0);
  const [status, setStatus] = useState('');
  const [interestRaw, setInterestRaw] = useState('');
  const [errInterest, setErrInterest] = useState<string | null>(null);
  const [snapInterest, setSnapInterest] = useState('');
  const [styled, setStyled] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const interestInput = useRef<HTMLInputElement>(null);

  function generate(forBase: string, forStyle: string, forPlatform: string, forInterest = snapInterest) {
    const constraints = constraintsFor?.(forPlatform);
    // With an interest word, the two-word engine runs. With none, the single-word engine runs exactly as it always has.
    const next = props.interest && forInterest
      ? props.interest.build(forBase, forInterest, forStyle, constraints, forStyle === 'random')
      : buildHandles(forBase, configs[forStyle], { random: forStyle === 'random' ? Math.random : null, constraints });
    setHandles(next);
    setRun((r) => r + 1);
    const where = platforms ? ` for ${platforms.find((p) => p.id === forPlatform)?.label}` : '';
    setStatus(`${next.length} ${forStyle} name ideas generated${where}.`);
  }

  function onSubmit(e: Event) {
    e.preventDefault();
    const problem = validateName(raw) ?? (toHandleBase(raw).length < 2 ? 'Use letters A to Z so the name works on every platform.' : null);
    const interestProblem = props.interest && interestRaw.trim()
      ? validateName(interestRaw) ?? (toHandleBase(interestRaw).length < 2 ? 'Use letters A to Z so the name works on every platform.' : null)
      : null;
    setErr(problem);
    setErrInterest(interestProblem);
    if (problem || interestProblem) {
      (problem ? input : interestInput).current?.focus();
      setBase(null);
      setHandles([]);
      setStatus('Please fix the highlighted field.');
      return;
    }
    const b = toHandleBase(raw);
    const i = props.interest && interestRaw.trim() ? toHandleBase(interestRaw) : '';
    setBase(b);
    setSnapInterest(i);
    generate(b, style, platform, i);
  }

  function chooseStyle(id: string) {
    setStyle(id);
    if (base) generate(base, id, platform);
  }

  function choosePlatform(id: string) {
    setPlatform(id);
    if (base) generate(base, style, id);
  }

  const currentStyle = styles.find((s) => s.id === style)!;
  const currentPlatform = platforms?.find((p) => p.id === platform);
  const subFor = (name: string) => (resultSub ? resultSub(name, platform) : `${name.length} characters${fit ? ` · ${fit(name.length)}` : ''}`);

  const styleSection = (
    <FormSection boxed={sectioned}>
      <fieldset>
        <legend class="mb-2 text-sm font-medium text-ink">Style</legend>
        <div class="flex flex-wrap gap-2">
          {styles.map((s) => (
            <RadioPill key={s.id} name="style" value={s.id} checked={style === s.id} onChange={() => chooseStyle(s.id)} label={s.label} icon={s.icon} />
          ))}
        </div>
        <p class="mt-2 text-sm text-ink-soft">{currentStyle.help}</p>
      </fieldset>
    </FormSection>
  );

  const fancySection = props.stylize && (
    <FormSection boxed={sectioned}>
      <fieldset>
        <legend class="mb-2 text-sm font-medium text-ink">Fancy Text</legend>
        <div class="flex flex-wrap gap-2">
          {[{ id: 'off', label: 'Off', icon: ToggleLeft }, { id: 'on', label: 'On', icon: ToggleRight }].map((o) => (
            <RadioPill key={o.id} name="stylize" value={o.id} checked={(o.id === 'on') === styled} onChange={() => setStyled(o.id === 'on')} label={o.label} icon={o.icon} />
          ))}
        </div>
        <p class="mt-2 text-sm text-ink-soft">{props.stylize.help}</p>
      </fieldset>
    </FormSection>
  );

  const platformSection = platforms && (
        <FormSection boxed={sectioned}>
          <fieldset>
            <legend class="mb-2 text-sm font-medium text-ink">Platform</legend>
            <div class="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <RadioPill key={p.id} name="platform" value={p.id} checked={platform === p.id} onChange={() => choosePlatform(p.id)} label={p.label} icon={p.icon} />
              ))}
            </div>
            <p class="mt-2 text-sm text-ink-soft" aria-live="polite">{currentPlatform?.hint}</p>
            {platformNote && <p class="mt-1 text-sm text-ink-soft">{platformNote}</p>}
          </fieldset>
        </FormSection>
  );

  return (
    <div class="card p-5 sm:p-8">
      <form onSubmit={onSubmit} noValidate aria-label={formLabel}>
        <div class={sectioned ? 'space-y-3' : ''}>
          <FormSection boxed={sectioned}>
            <div class={props.interest ? 'grid gap-4 sm:grid-cols-2' : ''}>
              <div>
                <label for="handle-base" class="mb-1.5 block text-sm font-medium text-ink">Word or name to build on</label>
                <input
                  ref={input} id="handle-base" name="handle-base" type="text" value={raw} maxLength={24}
                  autoComplete="off" autoCapitalize="none" spellcheck={false} placeholder={placeholder}
                  aria-invalid={err ? 'true' : undefined} aria-describedby={err ? 'handle-error handle-help' : 'handle-help'}
                  onInput={(e) => { setRaw((e.target as HTMLInputElement).value); setErr(null); }}
                  class={`${inputClass} ${err ? 'border-red-700' : 'border-line'}`}
                />
                <p id="handle-help" class="mt-1.5 text-sm text-ink-soft">{helpText}</p>
                {err && <p id="handle-error" class="mt-1.5 text-sm text-red-700">{err}</p>}
              </div>
              {props.interest && (
                <div>
                  <label for="handle-interest" class="mb-1.5 block text-sm font-medium text-ink">{props.interest.label}</label>
                  <input
                    ref={interestInput} id="handle-interest" name="handle-interest" type="text" value={interestRaw} maxLength={24}
                    autoComplete="off" autoCapitalize="none" spellcheck={false} placeholder={props.interest.placeholder}
                    aria-invalid={errInterest ? 'true' : undefined} aria-describedby={errInterest ? 'interest-error interest-help' : 'interest-help'}
                    onInput={(e) => { setInterestRaw((e.target as HTMLInputElement).value); setErrInterest(null); }}
                    class={`${inputClass} ${errInterest ? 'border-red-700' : 'border-line'}`}
                  />
                  <p id="interest-help" class="mt-1.5 text-sm text-ink-soft">{props.interest.help}</p>
                  {errInterest && <p id="interest-error" class="mt-1.5 text-sm text-red-700">{errInterest}</p>}
                </div>
              )}
            </div>
          </FormSection>


          {fancySection ? (
            <>
              <div class="grid gap-3 md:grid-cols-2">{styleSection}{fancySection}</div>
              {platformSection}
            </>
          ) : platformSection ? (
            // Style and Platform sit side by side once the card is wide enough; stacked below that.
            <div class="grid gap-3 lg:grid-cols-2">{styleSection}{platformSection}</div>
          ) : styleSection}
        </div>

        <button type="submit" class="btn-primary mt-6 inline-flex w-full items-center justify-center rounded-full font-medium focus-visible:outline-offset-4 sm:w-auto">
          <ButtonLabel icon={WandSparkles}>{buttonLabel}</ButtonLabel>
        </button>
      </form>

      <p class="sr-only" role="status" aria-live="polite">{status}</p>

      {base && (
        <div class="mt-8 border-t border-line pt-6" aria-labelledby="handle-results-heading">
          <h2 id="handle-results-heading" class="text-xl">
            {currentStyle.label} ideas for “{base}”{snapInterest ? ` and “${snapInterest}”` : ''}{currentPlatform && platform !== noFilter ? ` on ${currentPlatform.label}` : ''}
          </h2>

          {handles.length < 12 && (snapInterest || (platforms && platform !== noFilter)) && (
            <p class="mt-3 rounded-[12px] bg-paper px-4 py-3 text-sm text-ink-soft">
              {snapInterest
                ? 'Two short words leave little to blend, so we kept only the cleanest combinations instead of padding the list. Longer words, or a different interest, usually give more.'
                : `${currentPlatform?.label}’s limits rule out many combinations for this word, so we kept only the names that fit. A shorter word gives more options.`}
            </p>
          )}

          <ResultPills
            run={run} announce={setStatus} saved={saved}
            items={handles.map((h) => {
              const display = styled && props.stylize ? props.stylize.apply(h.name, style) : undefined;
              return {
                key: h.name, label: h.name, display, copy: h.name, title: TECHNIQUE_LABEL[h.technique], sub: subFor(h.name),
                copies: display ? [{ label: 'Plain', value: h.name }, { label: 'Fancy', value: display }] : undefined,
                link: resultLink?.(h.name, platform) ?? undefined,
              };
            })}
          />
          {styled && props.stylize && <p class="mt-3 text-sm text-ink-soft">{props.stylize.note}</p>}

          <p class="mt-4 text-sm text-ink-soft">{footnote}</p>
        </div>
      )}

      <SavedResults saved={saved} announce={setStatus} tool={props.saveKey.split(':').pop()!} />
    </div>
  );
}
