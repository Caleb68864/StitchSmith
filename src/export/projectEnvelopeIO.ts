// Tiny helpers every generator page uses for "Save Project" + "Load Project"
// buttons. The shape is intentionally minimal — generators that need richer
// import/export (e.g. Tool Roll's SVG export) keep their own ExportPanel for
// those; PatternPageShell's Import/Export buttons are project-JSON only.

/**
 * The schemaVersion each generator writes today (CLAUDE.md "Project JSON envelope").
 * Kept here, not imported from the hooks, so this module stays a leaf; a test in
 * src/state/__tests__ asserts it matches the hooks.
 */
export const KNOWN_SCHEMA_VERSIONS: Readonly<Record<string, number>> = Object.freeze({
  'tool-roll': 1,
  'roll-top-sack': 1,
  'tri-zip-backpack': 2,
  'mag-pouch': 3,
  'book-cover': 4,
  'zip-pouch': 5,
  'circle-skirt': 6,
  'padded-strap': 7,
  'micro-rig': 8,
  'sling': 9,
  'organizer': 10,
  'fanny-pack': 11,
  'clamshell-pack': 12,
  'plate-carrier': 13,
  'lbv': 14,
});

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
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON: could not parse project file.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid project file: expected a JSON object.');
  }
  const obj = parsed as Partial<ProjectEnvelope> & { inputs?: unknown };
  if (obj.generatorId !== expectedGeneratorId) {
    throw new Error(
      `This file is a "${obj.generatorId ?? 'unknown'}" project, not a ${expectedGeneratorId} project.`,
    );
  }
  // A file written by a newer StitchSmith carries a schemaVersion this build does not know.
  // Say so instead of loading half of it (CLAUDE.md: unknown future versions return a friendly error).
  const known = KNOWN_SCHEMA_VERSIONS[expectedGeneratorId];
  const sv = (obj as { schemaVersion?: unknown }).schemaVersion;
  if (sv !== undefined && (typeof sv !== 'number' || !Number.isInteger(sv) || sv < 1)) {
    throw new Error(`Invalid project file: schemaVersion must be a whole number (got ${JSON.stringify(sv)}).`);
  }
  if (known !== undefined && typeof sv === 'number' && sv > known) {
    throw new Error(
      `This ${expectedGeneratorId} project was saved by a newer StitchSmith (schemaVersion ${sv}; this build reads ${known}). Update StitchSmith to load it.`,
    );
  }
  if (typeof obj.projectName !== 'string' || obj.projectName.trim() === '') {
    throw new Error('Invalid project file: missing or empty "projectName".');
  }
  // Every generator page does `buildPattern(project.inputs)` straight after
  // import and the autosave effect persists whatever is in state, so a file
  // with the right generatorId but no inputs would crash and then survive
  // reload. Reject it here instead.
  if (typeof obj.inputs !== 'object' || obj.inputs === null || Array.isArray(obj.inputs)) {
    throw new Error('Invalid project file: missing or invalid "inputs" object.');
  }
  return obj as T;
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
