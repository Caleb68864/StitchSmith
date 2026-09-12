import { MOCK_DERIVED_SENTENCE } from './NumericField.js';

/**
 * One note at the top of a group whose numbers are all open in the vault,
 * so the fields below carry only the compact "measure" chip.
 */
export function VaultOpenNote({ children }: { children?: React.ReactNode }) {
  return (
    <p className="rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
      <span className="font-medium text-amber-700 dark:text-amber-400">Measure these yourself. </span>
      {children ?? MOCK_DERIVED_SENTENCE + ' The starting values below are placeholders, not a spec.'}
    </p>
  );
}
