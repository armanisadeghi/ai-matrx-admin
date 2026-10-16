/**
 * Which inputs a job asks for, read from its JSON Schema `parameters` (CONTRACT §10). The battle form is an
 * admin form: required inputs and `ui:primary` ones are shown, the rest sit behind "More".
 */

export interface InputField {
  key: string;
  title: string;
  type: "string" | "number" | "boolean";
  options: string[] | null;
  example: string | null;
  required: boolean;
  primary: boolean;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function inputFields(parameters: Record<string, unknown>): InputField[] {
  const props = isObj(parameters.properties) ? parameters.properties : {};
  const required = new Set(Array.isArray(parameters.required) ? parameters.required.map(String) : []);
  return Object.entries(props)
    .filter((e): e is [string, Record<string, unknown>] => isObj(e[1]))
    .map(([key, def]) => {
      const t = def.type === "number" || def.type === "integer" ? "number" : def.type === "boolean" ? "boolean" : "string";
      const example = def["ui:example"];
      return {
        key,
        title: typeof def.title === "string" && def.title ? def.title : key.replaceAll("_", " "),
        type: t,
        options: Array.isArray(def.enum) ? def.enum.map(String) : null,
        example: typeof example === "string" ? example : null,
        required: required.has(key),
        primary: def["ui:primary"] === true || required.has(key),
      } satisfies InputField;
    });
}

/** The value a typed string means for a field (numbers and booleans are typed, empty is absent). */
export function coerce(field: InputField, raw: string): unknown {
  const v = raw.trim();
  if (v === "") return undefined;
  if (field.type === "number") return Number.isFinite(Number(v)) ? Number(v) : v;
  if (field.type === "boolean") return v === "true";
  return v;
}

/** A short human label for a subject, from its first filled value. */
export function subjectLabel(values: Record<string, unknown>, fallback: string): string {
  const first = Object.values(values).find((v) => v !== undefined && v !== "");
  return first === undefined ? fallback : String(first).replace(/^https?:\/\/(www\.)?/, "").slice(0, 80);
}
