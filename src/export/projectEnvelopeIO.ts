// Tiny helpers every generator page uses for "Save Project" + "Load Project"
// buttons. The shape is intentionally minimal — generators that need richer
// import/export (e.g. Tool Roll's SVG export) keep their own ExportPanel for
// those; PatternPageShell's Import/Export buttons are project-JSON only.

interface ProjectEnvelope {
  generatorId: string;
  projectName: string;
  // ...plus whatever the generator stores.
}

/**
 * Parse incoming JSON text and assert it matches the expected generatorId.
 * Throws a friendly error if the generatorId is wrong or the JSON is broken;
 * PatternPageShell catches and surfaces via alert().
 */
export function parseProjectJson<T extends ProjectEnvelope>(
  jsonText: string,
  expectedGeneratorId: T['generatorId'],
): T {
  const parsed = JSON.parse(jsonText) as Partial<ProjectEnvelope>;
  if (parsed?.generatorId !== expectedGeneratorId) {
    throw new Error(
      `This file is a "${parsed?.generatorId ?? 'unknown'}" project, not a ${expectedGeneratorId} project.`,
    );
  }
  return parsed as T;
}

/**
 * Trigger a browser download of `project` as pretty-printed JSON.
 * Filename: `<sanitized projectName>.<generatorId>.json`.
 */
export function downloadProjectJson<T extends ProjectEnvelope>(project: T): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.projectName.replace(/[^a-z0-9-]/gi, '_')}.${project.generatorId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
