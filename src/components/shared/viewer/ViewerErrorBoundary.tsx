import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; onReset?: () => void }
interface State { error: Error | null }

/**
 * Keeps a 3D failure inside the preview panel: an assembly that throws mid-edit
 * shows "3D check failed" with the reason and a retry, and the page stays up.
 */
export class ViewerErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  reset = () => { this.setState({ error: null }); this.props.onReset?.(); };
  render() {
    if (this.state.error) {
      return (
        <div role="alert" data-testid="viewer-error" className="rounded border border-destructive/50 bg-destructive/5 p-3 text-xs space-y-2">
          <p className="font-semibold text-destructive">3D check failed: {this.state.error.message || 'unknown error'}</p>
          <p className="text-muted-foreground">The pattern itself is unaffected; the 3D check could not build this assembly with the current inputs.</p>
          <button type="button" className="rounded border border-border px-2 py-1 hover:bg-muted/40" onClick={this.reset}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
