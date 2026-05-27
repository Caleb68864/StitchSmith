interface Props {
  /** Map of field → error message. */
  errors: Record<string, string>;
  /** Optional pretty labels for known field names. */
  fieldLabels?: Record<string, string>;
  /** Heading text. Defaults to "Validation errors". */
  title?: string;
}

/**
 * Page-level validation error banner used above the PatternPageShell content.
 * Renders nothing when `errors` is empty.
 */
export function ValidationBanner({ errors, fieldLabels, title = 'Validation errors' }: Props) {
  const entries = Object.entries(errors);
  if (entries.length === 0) return null;
  return (
    <div className="rounded border border-destructive/30 bg-destructive/10 p-3 space-y-1">
      <p className="text-xs font-semibold text-destructive">{title}</p>
      <ul className="space-y-0.5">
        {entries.map(([field, msg]) => (
          <li key={field} className="text-xs text-destructive">
            <span className="font-medium">{fieldLabels?.[field] ?? field}:</span> {msg}
          </li>
        ))}
      </ul>
    </div>
  );
}
