import { useRef, useState } from 'preact/hooks';
import ResultPills, { SavedResults } from './ResultPills';
import { useSaved } from './saved';
import { RadioPill, ButtonLabel } from './OptionPill';
import { Sparkles, Laugh, Snowflake, BookOpen, Type, Quote, FilterX, User, Handshake, Heart, Users, PawPrint, ToyBrick, WandSparkles, type LucideIcon } from 'lucide-preact';
import FormSection from './FormSection';
import { validateName, normalize } from '../lib/combine';
import { kidSafe } from '../lib/nickname-safety';
import {
  generateNicknames, audiencesFor, validateTrait, NICKNAME_TECHNIQUE_LABEL, AUDIENCE_LABEL,
  type Audience, type Nickname, type NicknameFormat, type NicknameStyle,
} from '../lib/nicknames';

const STYLES: { id: NicknameStyle; label: string; help: string; icon: LucideIcon }[] = [
  { id: 'cute', label: 'Cute', icon: Sparkles, help: 'Soft endings and pet-name sounds, like Alexie or Benbug.' },
  { id: 'funny', label: 'Funny', icon: Laugh, help: 'Playful endings and rhymes, like Alexster or Alex Shmalex.' },
  { id: 'cool', label: 'Cool', icon: Snowflake, help: 'Short and punchy, with titles like Big Ben or Dr. Alex.' },
  { id: 'classic', label: 'Classic', icon: BookOpen, help: 'Traditional shortened forms only, like Alex, Xander or Liz.' },
];

const FORMATS: { id: NicknameFormat; label: string; help: string; icon: LucideIcon }[] = [
  { id: 'word', label: 'Single Word', icon: Type, help: 'One continuous word, like Alexie or Xander.' },
  { id: 'phrase', label: 'Phrase', icon: Quote, help: 'Two words with a space, like Captain Alex or Sleepy Sarah. Nicknames can have spaces, unlike usernames.' },
];

const AUDIENCES: { id: Audience; label: string; help: string; icon: LucideIcon }[] = [
  { id: 'anyone', label: 'Anyone', icon: FilterX, help: 'No preference. Every kind of nickname, ranked the standard way.' },
  { id: 'myself', label: 'Myself', icon: User, help: 'Leans toward shortened and cool forms, since people are usually more conservative with their own nickname.' },
  { id: 'friend', label: 'Friend', icon: Handshake, help: 'General purpose, with a slight lean toward playful rhymes and endings.' },
  { id: 'partner', label: 'Partner', icon: Heart, help: 'Leans toward soft, affectionate endings whatever style you pick, and much more strongly with Cute.' },
  { id: 'sibling', label: 'Sibling', icon: Users, help: 'General purpose, with a slight lean toward short forms and teasing titles.' },
  { id: 'pet', label: 'Pet', icon: PawPrint, help: 'Only short forms of one or two syllables, with repeated sounds like Bebe or Lele.' },
  { id: 'kid', label: 'Kid', icon: ToyBrick, help: 'Playful and gentle, with a filter that removes adult, rude and unkind words. It cannot catch everything, so read each nickname first.' },
];

const inputClass =
  'block w-full rounded-[12px] border bg-white px-4 py-3 text-base text-ink placeholder:text-ink-soft/60';

/** Friendlier message than the generic validator when someone types a non-Latin script. */
function checkName(value: string): string | null {
  const v = value.trim();
  if (/\p{L}/u.test(v) && !/\p{Script=Latin}/u.test(v)) return 'Please type the name in Latin letters, for example Priya or Wei.';
  return validateName(value);
}

/** Result-pill line: which audiences the nickname suits, selected one first, plus the kid-filter note when it is on. */
function suitsLine(n: Nickname, selected: Audience): string {
  const all = audiencesFor(n);
  const ordered = selected !== 'anyone' && all.includes(selected) ? [selected, ...all.filter((a) => a !== selected)] : all;
  const labels = ordered.slice(0, 3).map((a) => AUDIENCE_LABEL[a]);
  const suits = labels.length ? `Suits: ${labels.join(', ')}` : 'General purpose';
  return selected === 'kid' ? `${suits} · kid-safe checked` : suits;
}

export default function NicknameTool() {
  const saved = useSaved('namejoiner:saved:nickname');
  const [raw, setRaw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [style, setStyle] = useState<NicknameStyle>('cute');
  const [audience, setAudience] = useState<Audience>('anyone');
  const [format, setFormat] = useState<NicknameFormat>('word');
  const [traitRaw, setTraitRaw] = useState('');
  const [errTrait, setErrTrait] = useState<string | null>(null);
  const [snapTrait, setSnapTrait] = useState('');
  const [name, setName] = useState<string | null>(null);
  const [results, setResults] = useState<Nickname[]>([]);
  const [run, setRun] = useState(0);
  const [status, setStatus] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const traitInput = useRef<HTMLInputElement>(null);

  /** Kid mode removes adult and rude words, so a trait that trips the filter has to be replaced, not silently ignored. */
  const kidTraitProblem = (trait: string, forAudience: Audience) =>
    forAudience === 'kid' && trait && !kidSafe(trait) ? 'Kid mode removes adult and rude words, so choose a different trait.' : null;

  function generate(forName: string, forStyle: NicknameStyle, forAudience: Audience, forFormat: NicknameFormat = format, forTrait: string = snapTrait) {
    const kidProblem = kidTraitProblem(forTrait, forAudience);
    setErrTrait(kidProblem);
    const next = generateNicknames(forName, forStyle, 28, forAudience, { format: forFormat, trait: kidProblem ? '' : forTrait });
    setResults(next);
    setRun((r) => r + 1);
    const who = forAudience === 'anyone' ? '' : ` for ${AUDIENCE_LABEL[forAudience].toLowerCase()}`;
    setStatus(`${next.length} ${forStyle} nicknames generated${who}.`);
  }

  function onSubmit(e: Event) {
    e.preventDefault();
    const problem = checkName(raw);
    const traitProblem = validateTrait(traitRaw) ?? kidTraitProblem(traitRaw.trim(), audience);
    setErr(problem);
    setErrTrait(traitProblem);
    if (problem || traitProblem) {
      (problem ? input : traitInput).current?.focus();
      setName(null);
      setResults([]);
      setStatus('Please fix the highlighted field.');
      return;
    }
    const n = normalize(raw);
    const t = traitRaw.trim();
    setName(n);
    setSnapTrait(t);
    generate(n, style, audience, format, t);
  }

  function chooseStyle(s: NicknameStyle) {
    setStyle(s);
    if (name) generate(name, s, audience);
  }

  function chooseFormat(f: NicknameFormat) {
    setFormat(f);
    if (name) generate(name, style, audience, f);
  }

  function chooseAudience(a: Audience) {
    setAudience(a);
    if (name) generate(name, style, a);
  }

  const currentStyle = STYLES.find((s) => s.id === style)!;
  const currentAudience = AUDIENCES.find((a) => a.id === audience)!;
  const currentFormat = FORMATS.find((f) => f.id === format)!;

  const shortNote = (): string => {
    if (audience === 'kid') return 'The kid filter removed some options, and it removes a name completely if part of it looks like an adult or rude word. That keeps the list short, and it is meant to.';
    if (format === 'phrase' && audience === 'pet') return 'Pet phrases have to be two short words, so many options were dropped. A shorter name or trait gives more to work with.';
    if (audience === 'pet') return 'Pet nicknames have to be short, so many options were dropped. A longer name gives more to work with.';
    if (style === 'classic' && format === 'phrase') return 'Classic phrases keep to the plainest titles, like Big Alex, so the list is short by design. Try Cute, Funny or Cool, or add a trait, for more.';
    if (style === 'classic') return `Classic keeps only traditional shortened forms, so ${results.length ? 'short names give a short list' : `${name} has none`}. Try Cute, Funny or Cool for more ideas.`;
    return 'Short names leave little to work with, so we kept only the cleanest options instead of padding the list. A longer version of the name usually gives more.';
  };

  return (
    <div class="card p-5 sm:p-8">
      <form onSubmit={onSubmit} noValidate aria-label="Nickname generator">
        <div class="space-y-3">
          <FormSection>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="nick-name" class="mb-1.5 block text-sm font-medium text-ink">Name</label>
                <input
                  ref={input} id="nick-name" name="nick-name" type="text" value={raw} maxLength={24}
                  autoComplete="off" autoCapitalize="words" spellcheck={false} placeholder="e.g. Alexander"
                  aria-invalid={err ? 'true' : undefined} aria-describedby={err ? 'nick-error nick-help' : 'nick-help'}
                  onInput={(e) => { setRaw((e.target as HTMLInputElement).value); setErr(null); }}
                  class={`${inputClass} ${err ? 'border-red-700' : 'border-line'}`}
                />
                <p id="nick-help" class="mt-1.5 text-sm text-ink-soft">Type a first name. The full formal name (Alexander) gives more variety than a short one (Alex).</p>
                {err && <p id="nick-error" class="mt-1.5 text-sm text-red-700">{err}</p>}
              </div>
              <div>
                <label for="nick-trait" class="mb-1.5 block text-sm font-medium text-ink">Trait or inside joke (optional)</label>
                <input
                  ref={traitInput} id="nick-trait" name="nick-trait" type="text" value={traitRaw} maxLength={30}
                  autoComplete="off" autoCapitalize="none" spellcheck={false} placeholder="e.g. sleepy, always late"
                  aria-invalid={errTrait ? 'true' : undefined} aria-describedby={errTrait ? 'trait-error trait-help' : 'trait-help'}
                  onInput={(e) => { setTraitRaw((e.target as HTMLInputElement).value); setErrTrait(null); }}
                  class={`${inputClass} ${errTrait ? 'border-red-700' : 'border-line'}`}
                />
                <p id="trait-help" class="mt-1.5 text-sm text-ink-soft">One to three words about them, like sleepy or coffee obsessed. It makes nicknames like Sleepy Sarah. Leave it empty for name-only nicknames.</p>
                {errTrait && <p id="trait-error" class="mt-1.5 text-sm text-red-700">{errTrait}</p>}
              </div>
            </div>
          </FormSection>

          <div class="grid gap-3 md:grid-cols-2">
            <FormSection>
              <fieldset>
                <legend class="mb-2 text-sm font-medium text-ink">Style</legend>
                <div class="flex flex-wrap gap-2">
                  {STYLES.map((s) => (
                    <RadioPill key={s.id} name="style" value={s.id} checked={style === s.id} onChange={() => chooseStyle(s.id)} label={s.label} icon={s.icon} />
                  ))}
                </div>
                <p class="mt-2 text-sm text-ink-soft">{currentStyle.help}</p>
              </fieldset>
            </FormSection>

            <FormSection>
              <fieldset>
                <legend class="mb-2 text-sm font-medium text-ink">Format</legend>
                <div class="flex flex-wrap gap-2">
                  {FORMATS.map((f) => (
                    <RadioPill key={f.id} name="format" value={f.id} checked={format === f.id} onChange={() => chooseFormat(f.id)} label={f.label} icon={f.icon} />
                  ))}
                </div>
                <p class="mt-2 text-sm text-ink-soft" aria-live="polite">{currentFormat.help}</p>
              </fieldset>
            </FormSection>
          </div>

          <FormSection>
            <fieldset>
              <legend class="mb-2 text-sm font-medium text-ink">Who’s it for?</legend>
              <div class="flex flex-wrap gap-2">
                {AUDIENCES.map((a) => (
                  <RadioPill key={a.id} name="audience" value={a.id} checked={audience === a.id} onChange={() => chooseAudience(a.id)} label={a.label} icon={a.icon} />
                ))}
              </div>
              <p class="mt-2 text-sm text-ink-soft" aria-live="polite">{currentAudience.help}</p>
            </fieldset>
          </FormSection>
        </div>

        <button type="submit" class="btn-primary mt-6 inline-flex w-full items-center justify-center rounded-full font-medium focus-visible:outline-offset-4 sm:w-auto">
          <ButtonLabel icon={WandSparkles}>Generate nicknames</ButtonLabel>
        </button>
      </form>

      <p class="sr-only" role="status" aria-live="polite">{status}</p>

      {name && (
        <div class="mt-8 border-t border-line pt-6" aria-labelledby="nick-results-heading">
          <h2 id="nick-results-heading" class="text-xl">
            {currentStyle.label} {format === 'phrase' ? 'phrase ' : ''}nicknames for {name}{snapTrait && !errTrait ? ` (“${snapTrait}”)` : ''}{audience !== 'anyone' ? `, for ${audience === 'myself' ? 'yourself' : `a ${audience}`}` : ''}
          </h2>

          {results.length < 12 && <p class="mt-3 rounded-[12px] bg-paper px-4 py-3 text-sm text-ink-soft">{shortNote()}</p>}

          <ResultPills
            run={run} announce={setStatus} saved={saved}
            items={results.map((r) => ({
              key: r.name, label: r.name, copy: r.name,
              title: NICKNAME_TECHNIQUE_LABEL[r.technique], sub: suitsLine(r, audience),
            }))}
          />
          <p class="mt-4 text-sm text-ink-soft">
            Hover over a nickname to see how it was made. Share it with the person first, since the best ones are the ones they like.
            {audience === 'kid' && ' The kid filter checks for common adult, rude and unkind words only, so read every nickname before you use it.'}
          </p>
        </div>
      )}

      <SavedResults saved={saved} announce={setStatus} tool="nickname" />
    </div>
  );
}
