/**
 * Legacy agent-settings keys -> the canonical key or field that does the same job.
 * The TypeScript twin of aidream `services/agent_service/settings_aliases.py` (the save door
 * `PATCH /agent-service/agents/{id}` converts the same keys and answers `X-Matrx-Warnings`).
 * The Builder writes agent.definition straight to Supabase, so it converts here, before the write.
 * Never blocks a save; the notes are shown after it.
 */

type Json = Record<string, unknown>;

export interface NormalizedLegacySettings {
  settings: Json;
  /** Set only when the schema should be written to the agent's output_schema column. */
  outputSchema: Json | null;
  notes: string[];
}

function innerSchema(value: unknown): Json | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Json;
  if (Object.keys(obj).length === 0) return null;
  const inner = obj.schema;
  if (inner && typeof inner === "object" && !Array.isArray(inner) && Object.keys(inner as Json).length > 0) {
    return inner as Json;
  }
  return obj;
}

export function normalizeLegacySettings(
  settings: Json,
  existingOutputSchema: unknown,
): NormalizedLegacySettings {
  const out: Json = { ...settings };
  const notes: string[] = [];
  let schemaForColumn: Json | null = null;
  let haveSchema = Boolean(existingOutputSchema);

  if ("image_size" in out) {
    const value = out.image_size;
    delete out.image_size;
    if (value != null && out.resolution == null) {
      out.resolution = value;
      notes.push(`image_size saved as resolution (${String(value)}).`);
    } else if (value != null) {
      notes.push("image_size dropped: resolution is already set.");
    }
  }

  if ("ai_model_id" in out) {
    const value = out.ai_model_id;
    delete out.ai_model_id;
    if (value != null && out.model_id == null) {
      out.model_id = value;
      notes.push("ai_model_id saved as model_id.");
    }
  }

  for (const key of ["json_schema", "output_schema"] as const) {
    if (!(key in out)) continue;
    const schema = innerSchema(out[key]);
    delete out[key];
    if (!schema) continue;
    if (haveSchema) {
      notes.push(`settings.${key} dropped: the output schema wins.`);
    } else {
      schemaForColumn = schema;
      haveSchema = true;
      notes.push(`settings.${key} saved as the output schema.`);
    }
  }

  if ("response_mime_type" in out) {
    const mime = out.response_mime_type;
    delete out.response_mime_type;
    if (typeof mime === "string" && mime.toLowerCase().startsWith("application/json")) {
      if (haveSchema) {
        notes.push("response_mime_type dropped: the output schema already asks for JSON.");
      } else if (out.response_format == null) {
        out.response_format = { type: "json_object" };
        notes.push("response_mime_type saved as response_format json_object.");
      }
    }
  }

  return { settings: out, outputSchema: schemaForColumn, notes };
}
