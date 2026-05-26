import type { Step } from './Step.js';

export type CompileResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function topoSort(steps: Step[]): CompileResult<Step[]> {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const sorted: Step[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function visit(id: string): boolean {
    if (visited.has(id)) return true;
    if (inStack.has(id)) return false; // cycle
    inStack.add(id);
    const step = byId.get(id);
    if (!step) {
      inStack.delete(id);
      return true;
    }
    for (const dep of step.dependsOn) {
      if (!visit(dep)) return false;
    }
    inStack.delete(id);
    visited.add(id);
    sorted.push(step);
    return true;
  }

  for (const step of steps) {
    if (!visit(step.id)) {
      return { ok: false, error: `cycle detected in step dependencies` };
    }
  }

  return { ok: true, value: sorted };
}

export function compileSteps(steps: Step[]): CompileResult<Step[]> {
  return topoSort(steps);
}

export function renderMarkdown(steps: Step[]): CompileResult<string> {
  const sorted = topoSort(steps);
  if (!sorted.ok) return sorted;
  const lines: string[] = [];
  sorted.value.forEach((step, idx) => {
    lines.push(`## Step ${idx + 1}: ${step.title}`);
    if (step.group) lines.push(`*Group: ${step.group}*`);
    lines.push('');
    lines.push(step.body);
    lines.push('');
  });
  return { ok: true, value: lines.join('\n').trimEnd() };
}

export function renderHtml(steps: Step[]): CompileResult<string> {
  const sorted = topoSort(steps);
  if (!sorted.ok) return sorted;
  const items = sorted.value
    .map((step, idx) => {
      const groupAttr = step.group ? ` data-group="${escHtml(step.group)}"` : '';
      return `<li${groupAttr}>\n  <h3>${idx + 1}. ${escHtml(step.title)}</h3>\n  <p>${escHtml(step.body)}</p>\n</li>`;
    })
    .join('\n');
  return { ok: true, value: `<ol class="instructions">\n${items}\n</ol>` };
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
