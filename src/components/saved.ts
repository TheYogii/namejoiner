import { useEffect, useState } from 'preact/hooks';
import type { PillItem } from './ResultPills';

/** What a tool needs to save, list and remove favorites. `available` is false when browser storage is blocked, and the feature then hides itself. */
export interface Saved {
  available: boolean;
  items: PillItem[];
  isSaved: (key: string) => boolean;
  /** Saves or removes an item and returns true when it is now saved. */
  toggle: (item: PillItem) => boolean;
  clear: () => void;
}

const MAX_SAVED = 100;

/** localStorage, or null when it is missing, blocked (private browsing, site settings) or throws. */
function getStorage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = '__namejoiner_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function isPillItem(x: unknown): x is PillItem {
  const o = x as PillItem;
  return !!o && typeof o.key === 'string' && typeof o.label === 'string' && typeof o.copy === 'string';
}

/**
 * Favorites for one tool, kept in localStorage under `storageKey` (one key per tool, so tools never mix).
 * Reads happen after mount so server and browser markup match. Every storage call is wrapped, so a failure never throws.
 */
export function useSaved(storageKey: string): Saved {
  const [items, setItems] = useState<PillItem[]>([]);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;
    setAvailable(true);
    try {
      const parsed = JSON.parse(storage.getItem(storageKey) ?? '[]');
      if (Array.isArray(parsed)) setItems(parsed.filter(isPillItem).slice(0, MAX_SAVED));
    } catch {
      /* unreadable or corrupt data: start empty */
    }
  }, [storageKey]);

  function persist(next: PillItem[]) {
    setItems(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* quota exceeded or blocked mid-visit: the list still works until the page closes */
    }
  }

  const isSaved = (key: string) => items.some((i) => i.key === key);

  function toggle(item: PillItem) {
    if (isSaved(item.key)) {
      persist(items.filter((i) => i.key !== item.key));
      return false;
    }
    persist([item, ...items].slice(0, MAX_SAVED));
    return true;
  }

  return { available, items, isSaved, toggle, clear: () => persist([]) };
}
