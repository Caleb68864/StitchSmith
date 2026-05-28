// Minimal toast pub-sub. Module-level so any code (hooks, generators, validation)
// can call `notify(...)` without prop-drilling a toast context. <Toaster> in
// the App shell subscribes and renders the queue.

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastMsg {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  /** Auto-dismiss after this many ms. Default 4000. 0 = sticky. */
  durationMs?: number;
}

type Listener = (msg: ToastMsg) => void;
const listeners = new Set<Listener>();

let counter = 0;
function makeId(): string {
  counter += 1;
  return `t${Date.now().toString(36)}-${counter}`;
}

export function notify(input: Omit<ToastMsg, 'id'> & { id?: string }): string {
  const msg: ToastMsg = { id: input.id ?? makeId(), ...input };
  listeners.forEach(l => l(msg));
  return msg.id;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// Convenience wrappers — the only API generators / hooks should reach for.
export const toast = {
  info: (title: string, description?: string) => notify({ tone: 'info', title, description }),
  success: (title: string, description?: string) => notify({ tone: 'success', title, description }),
  warning: (title: string, description?: string) => notify({ tone: 'warning', title, description }),
  error: (title: string, description?: string) => notify({ tone: 'error', title, description }),
};
