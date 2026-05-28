import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Renders when a child throws. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary. Catches render-time exceptions in any descendant
 * so one generator's crash can't blank the whole app. Used in App.tsx
 * wrapping the page switch.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Keep this on the console so dev tooling sees it; production logging is
    // out of scope.
    console.error('[stitchsmith] uncaught error:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return (
        <div
          role="alert"
          className="max-w-2xl mx-auto mt-12 rounded border border-destructive/50 bg-destructive/5 p-6 space-y-3"
        >
          <h2 className="text-lg font-semibold text-destructive">Something broke</h2>
          <p className="text-sm">
            The page hit an unrecoverable error. Your saved work is still in browser
            storage and will be restored when you reload — try reloading first.
          </p>
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">Technical details</summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded bg-muted/30 p-2 text-[11px]">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          </details>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted/40"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted/40"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
