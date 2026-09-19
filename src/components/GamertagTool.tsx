import HandleTool from './HandleTool';
import { Swords, Coffee, Flame, Dices, FilterX, Gamepad2, Gamepad, Monitor, Blocks, Shapes } from 'lucide-preact';
import { GAMING_STYLES } from '../lib/wordlists';
import { ANY_HINT, PLATFORM_RULES, describeFit, ruleFor, type PlatformId } from '../lib/platforms';

const STYLES = [
  { id: 'competitive', label: 'Competitive', icon: Swords, help: 'Sharp, fast words like viper, storm and blitz, plus number tails and twists.' },
  { id: 'chill', label: 'Chill', icon: Coffee, help: 'Cozy, low-key words like lofi, otter and toast for relaxed players.' },
  { id: 'fantasy', label: 'Fantasy', icon: Flame, help: 'Words from myth and legend, like ember, rune and raven.' },
  { id: 'random', label: 'Random', icon: Dices, help: 'A mix from every list. Click Generate again for a fresh set.' },
];

const PLATFORM_ICONS = { xbox: Gamepad2, playstation: Gamepad, steam: Monitor, minecraft: Blocks, roblox: Shapes };

const PLATFORMS = [
  { id: 'any', label: 'Any', hint: ANY_HINT, icon: FilterX },
  ...PLATFORM_RULES.map((r) => ({ id: r.id, label: r.label, hint: r.hint, icon: PLATFORM_ICONS[r.id] })),
];

/** Gamertags for Xbox, PlayStation, Steam, Minecraft and Roblox, with per-platform limits and conventions. */
export default function GamertagTool() {
  return (
    <HandleTool
      sectioned
      saveKey="namejoiner:saved:gamertag"
      formLabel="Gamertag generator"
      placeholder="e.g. Kai"
      helpText="Your name, nickname or a favorite word. One word, letters only."
      buttonLabel="Generate gamertags"
      styles={STYLES}
      configs={GAMING_STYLES}
      defaultStyle="competitive"
      platforms={PLATFORMS}
      defaultPlatform="any"
      platformNote="Limits are the platforms’ published rules as we understand them, not checked live."
      constraintsFor={(id) => ruleFor(id as PlatformId)}
      resultSub={(name, id) => describeFit(name, id as PlatformId)}
      footnote={
        <>
          Platforms change their rules, so confirm on the platform’s own sign-up screen before you commit.
          Platform choice also nudges which kinds of name come first, using conventions we commonly see rather than rules.
        </>
      }
    />
  );
}
