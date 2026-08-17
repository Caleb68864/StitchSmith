/**
 * Escape a string for safe interpolation into HTML text content or attribute
 * values. Used by exporters that build HTML documents from user-controlled
 * text (project names, notes) via template literals.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
