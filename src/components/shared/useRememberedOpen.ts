import { useCallback, useState } from 'react';

/**
 * Open/closed state for a sidebar disclosure, remembered per key across
 * sessions. Reference panels (the legend, a long step list) open once, get
 * read, and then only cost the user scrolling; whichever way they leave it is
 * how it should come back.
 *
 * Storage is best-effort: a private window or blocked site data must not stop
 * the panel rendering, so every read and write is guarded.
 */
export function useRememberedOpen(key: string, defaultOpen: boolean): [boolean, (open: boolean) => void] {
  const storageKey = `stitchsmith.panel.${key}`;
  const [open, setOpenState] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw === null ? defaultOpen : raw === '1';
    } catch {
      return defaultOpen;
    }
  });
  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    try {
      localStorage.setItem(storageKey, next ? '1' : '0');
    } catch {
      // Storage unavailable — the panel still toggles for this session.
    }
  }, [storageKey]);
  return [open, setOpen];
}
