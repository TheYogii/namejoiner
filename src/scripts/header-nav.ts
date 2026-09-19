/**
 * Header behaviour: the mobile hamburger and the desktop "Tools" dropdown.
 * Markup and content come from Header.astro; this only toggles state and keeps ARIA in sync.
 * Open and closed are a data-open attribute the shared CSS animates, so panels ease in and out instead of snapping.
 */

const HOVER_CLOSE_DELAY = 150;

export function initHeaderNav(doc: Document = document): void {
  initMobileMenu(doc);
  initToolsDropdown(doc);
}

function initMobileMenu(doc: Document): void {
  const btn = doc.getElementById('nav-toggle') as HTMLButtonElement | null;
  const menu = doc.getElementById('mobile-nav');
  if (!btn || !menu) return;

  const set = (open: boolean) => {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.dataset.open = String(open);
    btn.querySelector('.icon-open')?.classList.toggle('hidden', open);
    btn.querySelector('.icon-close')?.classList.toggle('hidden', !open);
  };

  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      set(false);
      btn.focus();
    }
  });
  // Rotating a tablet or resizing past the breakpoint should never leave the mobile panel open.
  doc.defaultView?.matchMedia?.('(min-width: 768px)').addEventListener?.('change', (e) => e.matches && set(false));
}

function initToolsDropdown(doc: Document): void {
  const root = doc.querySelector<HTMLElement>('[data-tools-menu]');
  const trigger = root?.querySelector<HTMLButtonElement>('[data-tools-trigger]');
  const panel = root?.querySelector<HTMLElement>('[data-tools-panel]');
  if (!root || !trigger || !panel) return;

  const canHover = () => !!doc.defaultView?.matchMedia?.('(hover: hover)').matches;
  let openedByHover = false;
  let closeTimer: number | undefined;

  const isOpen = () => trigger.getAttribute('aria-expanded') === 'true';
  const set = (open: boolean) => {
    trigger.setAttribute('aria-expanded', String(open));
    panel.dataset.open = String(open);
    if (!open) openedByHover = false;
  };

  trigger.addEventListener('click', () => {
    // A click on a menu the pointer just opened pins it, instead of closing it straight away.
    if (isOpen() && openedByHover) {
      openedByHover = false;
      return;
    }
    set(!isOpen());
  });

  root.addEventListener('mouseenter', () => {
    if (!canHover()) return;
    window.clearTimeout(closeTimer);
    if (!isOpen()) {
      set(true);
      openedByHover = true;
    }
  });
  root.addEventListener('mouseleave', () => {
    if (!canHover() || !openedByHover) return;
    closeTimer = window.setTimeout(() => set(false), HOVER_CLOSE_DELAY);
  });

  // Keyboard users: Escape closes and returns focus, and tabbing out of the menu closes it.
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      set(false);
      trigger.focus();
    }
  });
  root.addEventListener('focusout', (e) => {
    const next = e.relatedTarget as Node | null;
    if (isOpen() && next && !root.contains(next)) set(false);
  });
  doc.addEventListener('click', (e) => {
    if (isOpen() && !root.contains(e.target as Node)) set(false);
  });
}
