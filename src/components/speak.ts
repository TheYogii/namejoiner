/**
 * Speaks a name aloud with the browser's built-in speech synthesis: no service, nothing sent anywhere. Blended names are often
 * pronounced wrongly by default voices, and that is an accepted limit. Every call is wrapped so a browser that throws never breaks the page.
 */

let current: SpeechSynthesisUtterance | null = null;

/** True when this browser has speech synthesis. Checked at render time, so the button is simply absent where it is missing. */
export function canSpeak(): boolean {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
  } catch {
    return false;
  }
}

interface Handlers {
  onStart: (u: SpeechSynthesisUtterance) => void;
  onEnd: (u: SpeechSynthesisUtterance) => void;
}

/** Cancels whatever is speaking, then speaks `text`. Returns the utterance, or null if speech could not start. */
export function speak(text: string, { onStart, onEnd }: Handlers): SpeechSynthesisUtterance | null {
  try {
    const synth = window.speechSynthesis;
    // Cancel first so clicking again (the same name or another) replaces the current speech instead of queuing behind it.
    synth.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.onstart = () => onStart(u);
    u.onend = () => { if (current === u) current = null; onEnd(u); };
    u.onerror = () => { if (current === u) current = null; onEnd(u); };
    current = u;
    synth.speak(u);
    return u;
  } catch {
    current = null;
    return null;
  }
}

/** Stops speech only if `u` is the utterance currently speaking. */
export function stopIfCurrent(u: SpeechSynthesisUtterance | null): void {
  try {
    if (u && current === u) {
      current = null;
      window.speechSynthesis.cancel();
    }
  } catch {
    /* nothing to stop */
  }
}
