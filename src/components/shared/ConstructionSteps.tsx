import type { Step } from '../../lib/pattern-engine/instructions/Step.js';

interface Props {
  steps: Step[];
  /** Optional heading; defaults to "Construction steps". */
  title?: string;
}

/**
 * Renders an engine Step[] as a numbered, group-headed assembly guide.
 * Steps are presented in the order the generator emitted them; if every step
 * carries a `group`, sub-headings are rendered for each group. Groups are
 * grouped by first-occurrence order so the generator controls flow.
 */
export function ConstructionSteps({ steps, title = 'Construction steps' }: Props) {
  if (steps.length === 0) {
    return (
      <div className="rounded border border-border p-3">
        <h3 className="text-xs font-semibold mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground">No instructions available.</p>
      </div>
    );
  }

  // Bucket by group while preserving first-occurrence order.
  const groups: { name: string; items: Step[] }[] = [];
  const groupIndex = new Map<string, number>();
  for (const step of steps) {
    const key = step.group ?? '';
    const idx = groupIndex.get(key);
    if (idx === undefined) {
      groupIndex.set(key, groups.length);
      groups.push({ name: key, items: [step] });
    } else {
      groups[idx].items.push(step);
    }
  }
  const hasNamedGroups = groups.some((g) => g.name !== '');

  return (
    <details className="rounded border border-border bg-card text-xs" open>
      <summary className="cursor-pointer select-none px-3 py-2 font-semibold">
        {title} <span className="font-normal text-muted-foreground">({steps.length} step{steps.length === 1 ? '' : 's'})</span>
      </summary>
      <div className="px-3 pb-3 space-y-3">
        {groups.map((g, gi) => (
          <section key={g.name || `group-${gi}`} className="space-y-1.5">
            {hasNamedGroups && g.name && (
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
                {g.name}
              </h4>
            )}
            <ol className="space-y-2 list-decimal list-inside">
              {g.items.map((step) => (
                <li key={step.id} className="text-xs leading-snug">
                  <span className="font-medium text-foreground">{step.title}.</span>{' '}
                  <span className="text-muted-foreground">{step.body}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </details>
  );
}
