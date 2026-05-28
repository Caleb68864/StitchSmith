import { useEffect, useState } from 'react';
import { subscribe, type ToastMsg } from '../../lib/toast/toast.js';

const TONE_CLASSES: Record<ToastMsg['tone'], string> = {
  info: 'border-blue-500/50 bg-blue-500/10 text-blue-900 dark:text-blue-100',
  success: 'border-green-500/50 bg-green-500/10 text-green-900 dark:text-green-100',
  warning: 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100',
  error: 'border-destructive/50 bg-destructive/10 text-destructive',
};

interface Live extends ToastMsg {
  /** Timestamp at which this toast should auto-dismiss. */
  expiresAt: number;
}

export function Toaster() {
  const [queue, setQueue] = useState<Live[]>([]);

  useEffect(() => {
    const unsub = subscribe((msg) => {
      const durationMs = msg.durationMs ?? 4000;
      const expiresAt = durationMs > 0 ? Date.now() + durationMs : Number.POSITIVE_INFINITY;
      setQueue((q) => [...q, { ...msg, expiresAt }]);
    });
    return unsub;
  }, []);

  // Tick to expire stale toasts.
  useEffect(() => {
    if (queue.length === 0) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setQueue((q) => q.filter((t) => t.expiresAt > now));
    }, 250);
    return () => window.clearInterval(id);
  }, [queue.length]);

  function dismiss(id: string) {
    setQueue((q) => q.filter((t) => t.id !== id));
  }

  if (queue.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm"
    >
      {queue.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto rounded border px-3 py-2 shadow-sm text-xs space-y-0.5 ${TONE_CLASSES[t.tone]}`}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="font-medium">{t.title}</p>
              {t.description && <p className="opacity-90">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-current opacity-70 hover:opacity-100 leading-none"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
