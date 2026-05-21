import type { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

/** Root provider wrapper — add context providers here as the app grows. */
export function Providers({ children }: ProvidersProps) {
  return <>{children}</>;
}
