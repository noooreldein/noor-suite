/** Desktop (Tauri) integration — no-ops in the browser build. */
export const isDesktop = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Open a URL in the user's default browser instead of navigating the app window. */
export async function openExternal(url: string): Promise<void> {
  if (isDesktop()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    } catch { /* fall through */ }
  }
  window.open(url, '_blank', 'noopener');
}

/** Route every external http(s) link (WhatsApp, GitHub…) through the system browser. */
export function installDesktopLinkHandler(): void {
  if (!isDesktop()) return;
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute('href') ?? '';
    if (!/^https?:\/\//i.test(href)) return;
    if (href.startsWith(location.origin)) return;
    e.preventDefault();
    void openExternal(href);
  });
}
