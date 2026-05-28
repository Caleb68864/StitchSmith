import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary.js';

function Boom({ message = 'boom' }: { message?: string }): null {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  // React logs the error to console.error during the render that throws;
  // silence it so the test output stays clean.
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('renders children normally when nothing throws', () => {
    render(<ErrorBoundary><span>ok</span></ErrorBoundary>);
    expect(screen.getByText('ok')).toBeTruthy();
  });

  it('catches descendant render errors and shows the fallback', () => {
    render(<ErrorBoundary><Boom message="custom message" /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/something broke/i)).toBeTruthy();
    // Technical-details section contains the error message.
    expect(screen.getByText(/custom message/i)).toBeTruthy();
  });

  it('Try again button calls the reset callback and re-renders children', () => {
    let shouldThrow = true;
    function Toggle() {
      if (shouldThrow) throw new Error('once');
      return <span>recovered</span>;
    }
    render(<ErrorBoundary><Toggle /></ErrorBoundary>);
    expect(screen.getByText(/something broke/i)).toBeTruthy();
    // Flip the throw flag so the next render returns the recovered child.
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('recovered')).toBeTruthy();
  });

  it('renders a custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={(err) => <span data-testid="custom">{err.message}</span>}>
        <Boom message="x" />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('custom').textContent).toBe('x');
  });
});
