import { z } from "zod";
import { isJsonObject } from "@/types/json";
import { KIND_KEY } from "@ai-matrx/content-ir";
import {
  collectProblems,
  ProblemList,
  readCollectionList,
  repeatsProblem,
} from "@ai-matrx/chat/surfaces/runtime/collection-write-targets";
import {
  emptyScenario,
  type Expectation,
  type ProofScenario,
  type ProofMandateOption,
} from "./types";

// Runtime validation is the command contract. Registration schemas are derived
// from these exports, never maintained as a second hand-written JSON schema.
const marker = { __kind: z.string().optional() };
export const expectationWriteSchema = z.strictObject({
  ...marker,
  id: z.string().min(1),
  rule: z.enum([
    "contains_marker",
    "excludes_marker",
    "routes_exist",
    "path_present",
    "path_absent",
    "path_equals",
    "path_not_equals",
    "min_items",
    "max_items",
    "matches",
    "judge",
  ]),
  title: z.string().optional(),
  proves: z.string().optional(),
  path: z.string().optional(),
  marker: z.string().optional(),
  value: z.json().optional(),
  count: z.number().int().nonnegative().optional(),
  rubric: z.string().optional(),
  required: z.boolean().optional(),
}) satisfies z.ZodType<Expectation>;

// Cost and cadence remain operator-owned controls. Saving authored test data
// never runs a check, raises a ceiling, or changes an execution schedule.
const authoredFields = {
  label: z.string().trim().min(1).max(200),
  description: z.string(),
  mandate_key: z.string().min(1),
  variables: z.record(z.string(), z.json()),
  allowed_routes: z.array(z.string()),
  expectations: z.array(expectationWriteSchema),
  user_input: z.string().nullable(),
  is_active: z.boolean(),
};
const slug = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9_]{2,60}$/,
    "slug must contain 3–61 lowercase letters, digits or underscores and start with a letter or digit",
  );
export const scenarioDraftSchema = z.strictObject({
  [KIND_KEY]: z.literal("json"),
  slug: slug.optional(),
  ...z.object(authoredFields).partial().shape,
});
export const scenarioCreateSchema = z.strictObject({
  ...marker,
  slug,
  ...z.object(authoredFields).partial().shape,
  label: authoredFields.label,
  mandate_key: authoredFields.mandate_key,
});
export const scenarioUpdateSchema = z.strictObject({
  ...marker,
  id: slug,
  ...z.object(authoredFields).partial().shape,
});
export const scenarioCreateListSchema = z
  .array(scenarioCreateSchema)
  .min(1)
  .max(25);
export const scenarioUpdateListSchema = z
  .array(scenarioUpdateSchema)
  .min(1)
  .max(25);
export const scenarioDeleteListSchema = z
  .array(z.union([slug, z.strictObject({ ...marker, id: slug })]))
  .min(1)
  .max(25);
export type ScenarioDraftFields = z.infer<typeof scenarioDraftSchema>;
export type ScenarioAuthoredPatch = Omit<ScenarioDraftFields, typeof KIND_KEY>;

function parsed<T>(schema: z.ZodType<T>, raw: unknown, at: string): T {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  const problems = new ProblemList(at);
  for (const issue of result.error.issues)
    problems.add(
      `${at}${issue.path.length ? `.${issue.path.join(".")}` : ""}: ${issue.message}`,
    );
  problems.throwIfAny();
  throw new Error(`${at}: invalid value. Nothing was changed.`);
}
function checkMandate(
  fields: { mandate_key?: string },
  mandates: readonly ProofMandateOption[],
  at: string,
) {
  if (
    fields.mandate_key !== undefined &&
    !mandates.some((mandate) => mandate.mandate_key === fields.mandate_key)
  )
    throw new Error(
      `${at}.mandate_key must name a mandate in mandate_catalog.`,
    );
}
export function parseScenarioDraft(
  value: unknown,
  mandates: readonly ProofMandateOption[],
  current: {
    saving?: boolean;
    variablesError?: string | null;
    immutableSlug?: string;
    catalogReady?: boolean;
  } = {},
): ScenarioDraftFields {
  const fields = parsed(scenarioDraftSchema, value, "scenario_draft");
  if (!Object.keys(fields).some((key) => key !== KIND_KEY))
    throw new Error(
      "scenario_draft needs at least one authored field. Nothing was changed.",
    );
  const problems = new ProblemList("scenario_draft");
  problems.check(() => checkMandate(fields, mandates, "scenario_draft"));
  if (current.catalogReady === false)
    problems.add(
      "Wait for a successful current mandate catalog read before staging a scenario.",
    );
  if (current.saving)
    problems.add("Wait for the current scenario save to finish.");
  if (current.variablesError && fields.variables === undefined)
    problems.add(
      "The draft has invalid JSON. Include corrected variables or fix the JSON before proposing another draft change.",
    );
  if (
    current.immutableSlug &&
    fields.slug !== undefined &&
    fields.slug !== current.immutableSlug
  )
    problems.add("A saved scenario's slug cannot change.");
  problems.throwIfAny();
  return fields;
}
export function mergeScenarioDraft(
  previous: ProofScenario,
  fields: ScenarioAuthoredPatch,
): ProofScenario {
  // This is an authored-field command applied to existing controls, not a
  // serialized kind being rewritten; its command identity is not a form field.
  return {
    ...previous,
    slug: fields.slug ?? previous.slug,
    label: fields.label ?? previous.label,
    description: fields.description ?? previous.description,
    mandate_key: fields.mandate_key ?? previous.mandate_key,
    variables: fields.variables ?? previous.variables,
    allowed_routes: fields.allowed_routes ?? previous.allowed_routes,
    expectations: fields.expectations ?? previous.expectations,
    user_input:
      fields.user_input === undefined ? previous.user_input : fields.user_input,
    is_active: fields.is_active ?? previous.is_active,
  };
}
export function parseCreateScenarios(
  value: unknown,
  current: readonly ProofScenario[],
  mandates: readonly ProofMandateOption[],
): ProofScenario[] {
  const raw = readCollectionList("create_scenarios", "scenarios", value);
  return collectProblems(
    "create_scenarios",
    raw,
    (item, index) => {
      const at = `create_scenarios[${index}]`;
      const fields = parsed(scenarioCreateSchema, item, at);
      const problems = new ProblemList(at);
      problems.check(() => checkMandate(fields, mandates, at));
      if (current.some((scenario) => scenario.slug === fields.slug))
        problems.add(
          `${at}.slug ${fields.slug} already exists; use update_scenarios.`,
        );
      problems.throwIfAny();
      return mergeScenarioDraft(emptyScenario(), fields);
    },
    {
      listChecks: () => [
        repeatsProblem(
          "create_scenarios",
          raw.map((item) => {
            return isJsonObject(item) && typeof item.slug === "string"
              ? item.slug
              : undefined;
          }),
          "slug",
        ),
      ],
    },
  );
}
export function parseUpdateScenarios(
  value: unknown,
  current: readonly ProofScenario[],
  mandates: readonly ProofMandateOption[],
): { scenario: ProofScenario; changed: string[] }[] {
  const raw = readCollectionList("update_scenarios", "scenarios", value);
  return collectProblems(
    "update_scenarios",
    raw,
    (item, index) => {
      const at = `update_scenarios[${index}]`;
      const fields = parsed(scenarioUpdateSchema, item, at);
      const previous = current.find((scenario) => scenario.slug === fields.id);
      if (!previous)
        throw new Error(`${at}.id ${fields.id} is not a loaded scenario slug.`);
      const { id: _id, ...patch } = fields;
      const changed = Object.keys(patch).filter((key) => key !== KIND_KEY);
      if (!changed.length)
        throw new Error(`${at} needs at least one authored field to change.`);
      checkMandate(patch, mandates, at);
      return { scenario: mergeScenarioDraft(previous, patch), changed };
    },
    {
      listChecks: () => [
        repeatsProblem(
          "update_scenarios",
          raw.map((item) => {
            return isJsonObject(item) && typeof item.id === "string"
              ? item.id
              : undefined;
          }),
          "id",
        ),
      ],
    },
  );
}
export function parseDeleteScenarios(
  value: unknown,
  current: readonly ProofScenario[],
): ProofScenario[] {
  const raw = readCollectionList("delete_scenarios", "scenarios", value);
  const readId = (item: unknown) => {
    const read = z
      .union([slug, z.strictObject({ ...marker, id: slug })])
      .safeParse(item);
    return read.success
      ? typeof read.data === "string"
        ? read.data
        : read.data.id
      : undefined;
  };
  return collectProblems(
    "delete_scenarios",
    raw,
    (item, index) => {
      const id = readId(item);
      if (!id)
        throw new Error(
          `delete_scenarios[${index}] must be a slug string or {id: slug}.`,
        );
      const scenario = current.find((row) => row.slug === id);
      if (!scenario)
        throw new Error(
          `delete_scenarios[${index}].id ${id} is not a loaded scenario slug.`,
        );
      return scenario;
    },
    {
      listChecks: () => [
        repeatsProblem("delete_scenarios", raw.map(readId), "id"),
      ],
    },
  );
}
export function parseViewText(value: unknown, target: string): string {
  if (typeof value !== "string")
    throw new Error(`${target} expects plain text. Nothing was changed.`);
  return value;
}
