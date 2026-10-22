import { useEffect } from 'react';

/** Global keyboard shortcut hook (e.g. useKeyboard('f2', openSearch)). */
export function useKeyboard(key: string, handler: () => void): void {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === key.toLowerCase() && !e.ctrlKey && !e.metaKey && !e.altKey) {
        handler();
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [key, handler]);
}
