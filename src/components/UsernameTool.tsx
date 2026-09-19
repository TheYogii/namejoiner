import HandleTool from './HandleTool';
import { Sparkles, Moon, Fingerprint, Dices, FilterX, Camera, Music, Ghost, MessageCircle } from 'lucide-preact';
import { SOCIAL_STYLES } from '../lib/wordlists';
import { buildInterestHandles, type InterestStyle } from '../lib/interest';
import { stylize, type StyleId } from '../lib/stylize';
import {
  GENERAL_HINT, SOCIAL_RULES, describeSocialFit, profileCheck, socialRuleFor, type SocialPlatformId,
} from '../lib/platforms';

const STYLES = [
  { id: 'cute', label: 'Cute', icon: Sparkles, help: 'Soft, playful words like bun, honey and sprout.' },
  { id: 'aesthetic', label: 'Aesthetic', icon: Moon, help: 'Dreamy, muted words like velvet, dusk and lilac, with dots and underscores.' },
  { id: 'unique', label: 'Unique', icon: Fingerprint, help: 'Rarer words and spelling twists that are harder for anyone else to have.' },
  { id: 'random', label: 'Random', icon: Dices, help: 'A mix from every list. Click Generate again for a fresh set.' },
];

const PLATFORM_ICONS = { instagram: Camera, tiktok: Music, snapchat: Ghost, x: MessageCircle };

const PLATFORMS = [
  { id: 'general', label: 'General', hint: GENERAL_HINT, icon: FilterX },
  // Generic metaphors instead of brand logos: a camera, music, a ghost and a speech bubble.
  ...SOCIAL_RULES.map((r) => ({ id: r.id, label: r.label, hint: r.hint, icon: PLATFORM_ICONS[r.id] })),
];

/** Social-profile usernames for Instagram, TikTok, Snapchat and X, with per-platform limits and profile-check links. */
export default function UsernameTool() {
  return (
    <HandleTool
      sectioned
      saveKey="namejoiner:saved:username"
      formLabel="Username generator"
      placeholder="e.g. Luna"
      helpText="Your name, nickname or a favorite word. One word, letters only."
      buttonLabel="Generate usernames"
      styles={STYLES}
      configs={SOCIAL_STYLES}
      defaultStyle="cute"
      interest={{
        label: 'Interest or theme (optional)',
        placeholder: 'e.g. soccer',
        help: 'Add a hobby or theme and the two words are blended into names like sarah_soccer. Leave it empty for single-word names.',
        build: (base, interestWord, style, constraints, shuffle) =>
          buildInterestHandles(base, interestWord, style as InterestStyle, SOCIAL_STYLES[style as InterestStyle], { constraints, random: shuffle ? Math.random : null }),
      }}
      stylize={{
        apply: (plain, style) => stylize(plain, style as StyleId),
        help: 'Turns each result into aesthetic text for your bio or display name, using small caps, script or full-width letters with symbols. The plain version stays available to copy.',
        note: 'Fancy text is for bios and display names only. Usernames must stay plain letters on every platform, so the character counts and profile links use the plain version. Some apps and fonts show empty boxes for these characters, so test it before you post.',
      }}
      platforms={PLATFORMS}
      defaultPlatform="general"
      platformNote="Limits are the platforms’ published rules as we understand them, not checked live."
      constraintsFor={(id) => socialRuleFor(id as SocialPlatformId)}
      resultSub={(name, id) => describeSocialFit(name, id as SocialPlatformId)}
      resultLink={(name, id) => profileCheck(name, id as SocialPlatformId)}
      footnote={
        <>
          With a platform selected, the limit above is enforced, and each result gets a “Check if taken” link that opens that
          platform’s profile page in a new tab. It does not confirm availability for you: if the profile page loads, the name is
          probably in use, and if it says the page does not exist, it may be free, but the app itself has the final say.
          Platforms change their rules, so confirm before you commit.
        </>
      }
    />
  );
}
