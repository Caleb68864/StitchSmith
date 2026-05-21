import type { ReactNode } from 'react'

interface PageShellProps {
  children: ReactNode
}

export function PageShell({ children }: PageShellProps) {
  return (
    <main className="flex-1 overflow-auto p-4">
      {children}
    </main>
  )
}
