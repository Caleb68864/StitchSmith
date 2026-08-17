import { migrateData } from './migrators/index.js';

export interface ProjectEnvelope<TInputs = Record<string, unknown>> {
  schemaVersion: number;
  generatorId: string;
  inputs: TInputs;
  stylePresetName?: string;
}

export type ImportResult<T = Record<string, unknown>> =
  | { ok: true; envelope: ProjectEnvelope<T> }
  | { ok: false; error: string; errorCode: ImportErrorCode };

export type ImportErrorCode =
  | 'parse-error'
  | 'schema-error'
  | 'future-version'
  | 'wrong-generator'
  | 'validation-error'
  | 'migration-error';

export interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  enum?: readonly unknown[];
}

export type InputSchema = Record<string, FieldSchema>;

export interface GeneratorConfig<TInputs = Record<string, unknown>> {
  generatorId: string;
  currentSchemaVersion: number;
  inputSchema: InputSchema;
  validateInputs?: (inputs: unknown) => inputs is TInputs;
}

function validateAgainstSchema(
  inputs: unknown,
  schema: InputSchema,
): string | null {
  if (typeof inputs !== 'object' || inputs === null || Array.isArray(inputs)) {
    return 'inputs must be a plain object';
  }
  const obj = inputs as Record<string, unknown>;
  for (const [key, fieldSchema] of Object.entries(schema)) {
    const value = obj[key];
    if (fieldSchema.required && (value === undefined || value === null)) {
      return `Missing required field: ${key}`;
    }
    if (value !== undefined && value !== null) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== fieldSchema.type) {
        return `Field "${key}" expected type ${fieldSchema.type}, got ${actualType}`;
      }
      // JSON.parse('1e999') yields Infinity, which is typeof 'number' — reject it
      // here so non-finite dimensions never reach geometry.
      if (fieldSchema.type === 'number' && !Number.isFinite(value)) {
        return `Field "${key}" must be a finite number, got ${String(value)}`;
      }
      if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
        return `Field "${key}" must be one of [${fieldSchema.enum.join(', ')}], got ${JSON.stringify(value)}`;
      }
    }
  }
  return null;
}

export function exportProjectJson<TInputs>(
  envelope: ProjectEnvelope<TInputs>,
): string {
  return JSON.stringify(envelope);
}

export function importProjectJson<TInputs = Record<string, unknown>>(
  jsonString: string,
  config: GeneratorConfig<TInputs>,
): ImportResult<TInputs> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { ok: false, error: 'Invalid JSON: could not parse project file.', errorCode: 'parse-error' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'Project file must be a JSON object.', errorCode: 'schema-error' };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj['schemaVersion'] !== 'number') {
    return { ok: false, error: 'Missing or invalid schemaVersion field.', errorCode: 'schema-error' };
  }
  if (typeof obj['generatorId'] !== 'string') {
    return { ok: false, error: 'Missing or invalid generatorId field.', errorCode: 'schema-error' };
  }
  if (typeof obj['inputs'] !== 'object' || obj['inputs'] === null || Array.isArray(obj['inputs'])) {
    return { ok: false, error: 'Missing or invalid inputs field.', errorCode: 'schema-error' };
  }

  const fileSchemaVersion = obj['schemaVersion'] as number;
  const fileGeneratorId = obj['generatorId'] as string;

  if (fileGeneratorId !== config.generatorId) {
    return {
      ok: false,
      error: `This project was created for "${fileGeneratorId}" but you have "${config.generatorId}" open. Please open the correct generator page.`,
      errorCode: 'wrong-generator',
    };
  }

  if (fileSchemaVersion > config.currentSchemaVersion) {
    return {
      ok: false,
      error: `This project was saved by a newer version of StitchSmith (schema v${fileSchemaVersion}). Please upgrade StitchSmith to open it.`,
      errorCode: 'future-version',
    };
  }

  let inputs = obj['inputs'] as Record<string, unknown>;

  if (fileSchemaVersion < config.currentSchemaVersion) {
    const migrateResult = migrateData(
      config.generatorId,
      fileSchemaVersion,
      config.currentSchemaVersion,
      inputs,
    );
    if (!migrateResult.ok) {
      return { ok: false, error: migrateResult.error, errorCode: 'migration-error' };
    }
    inputs = migrateResult.data;
  }

  const validationError = validateAgainstSchema(inputs, config.inputSchema);
  if (validationError) {
    return { ok: false, error: validationError, errorCode: 'validation-error' };
  }

  if (config.validateInputs && !config.validateInputs(inputs)) {
    return { ok: false, error: 'Input validation failed: inputs do not match expected schema.', errorCode: 'validation-error' };
  }

  return {
    ok: true,
    envelope: {
      schemaVersion: config.currentSchemaVersion,
      generatorId: config.generatorId,
      inputs: inputs as TInputs,
      stylePresetName: typeof obj['stylePresetName'] === 'string'
        ? obj['stylePresetName']
        : undefined,
    },
  };
}

export function roundTripProjectJson<TInputs>(
  envelope: ProjectEnvelope<TInputs>,
  config: GeneratorConfig<TInputs>,
): { ok: true; jsonString: string } | { ok: false; error: string } {
  const exported = exportProjectJson(envelope);
  const imported = importProjectJson<TInputs>(exported, config);
  if (!imported.ok) {
    return { ok: false, error: imported.error };
  }
  const reexported = exportProjectJson(imported.envelope);
  return { ok: true, jsonString: reexported };
}
