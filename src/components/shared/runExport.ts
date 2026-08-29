import { toast } from '../../lib/toast/toast.js';
import { downloadTextFile } from '../../utils/download.js';

/**
 * Run an async export behind a busy flag and surface any failure as a toast.
 *
 * The exporters are lazy `import()`s (see pattern-engine/exports/lazy.ts). After
 * a redeploy the old chunk URL 404s and the import rejects; with a bare
 * `try/finally` that rejection was silently swallowed — the button un-greyed and
 * nothing happened. Every ExportPanel routes its async handlers through here so
 * the user always sees *why* nothing downloaded.
 */
export async function runExport(
  label: string,
  setBusy: (busy: boolean) => void,
  fn: () => void | Promise<void>,
): Promise<void> {
  setBusy(true);
  try {
    await fn();
  } catch (err) {
    console.error(`[stitchsmith] ${label} export failed`, err);
    toast.error(
      `${label} export failed`,
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    setBusy(false);
  }
}

/**
 * Open `html` in a new window and print it — the tiled-page workflow. When the
 * browser blocks the popup (`window.open` returns null) fall back to downloading
 * the same document so the export is never a silent no-op.
 */
export function printOrDownloadHtml(html: string, filename: string): void {
  const win = window.open('about:blank', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
    return;
  }
  downloadTextFile(filename, html, 'text/html');
  toast.info('Popup blocked — downloaded instead', `Open ${filename} and print it from your browser.`);
}
