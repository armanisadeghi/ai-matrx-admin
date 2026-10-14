"use client";

/**
 * The FULL seed for a kind-creator launch on an EXISTING Shape — every
 * declared variable the platform has a real value for, never just the
 * instruction and the schema.
 *
 * `composeKindAgentIntent` alone sends `task_brief` + `kind_schema`; the
 * creator then spent its first turns re-fetching what the page already knew
 * (registration, component, examples). This reads the live registration once
 * (`loadShapeReadiness` — the same preflight Convert to Shape uses), reads up
 * to three saved examples (canonical first), and fills:
 *
 *   task_brief, kind_schema                    — composeKindAgentIntent
 *   existing_kind_context                      — registration + readiness (+ the
 *                                                caller's extra facts, e.g. the
 *                                                admin page's doctor row)
 *   existing_component_context / _source       — the web output component
 *   user_data_sample                           — up to 3 saved examples
 *   shape_name / shape_disposition / shape_visibility — the stored answers
 *
 * `shape_cardinality`, `shape_render_style` and `shape_assets` are never
 * stored on a Shape, so they stay blank rather than guessed.
 *
 * A failed read never blocks the launch: the user is told the agent has less
 * context and the base seed goes out.
 */

import { toast } from "@/lib/toast";
import { isJsonObject } from "@/types/json";
import type { KindExampleListItem } from "@/features/content-ir/admin/kind-detail-types";
import { isKindDisposition } from "@/features/content-ir/registry/kind-dispositions";
import {
  buildExistingShapeVariables,
  buildShapeReadiness,
  type ShapeReadiness,
} from "@/features/content-ir/studio/convert-to-shape";
import {
  composeKindAgentIntent,
  composeNewShapeIntent,
  type KindAgentIntentInput,
  type KindAgentSeed,
} from "@/features/content-ir/studio/kind-agent-intents";
import { fetchKindExamples } from "@/features/content-ir/studio/kind-examples";
import { loadShapeReadiness } from "@/features/content-ir/studio/shape-readiness-service";

/** How many saved examples ride `user_data_sample`. */
export const KIND_EDIT_SEED_EXAMPLE_LIMIT = 3;

function formatExamples(examples: readonly KindExampleListItem[]): string {
  const picked = examples.slice(0, KIND_EDIT_SEED_EXAMPLE_LIMIT);
  if (picked.length === 0) return "";
  return picked
    .map((example, index) => {
      const tags = [
        example.isCanonical ? "canonical" : null,
        example.validationStatus ? `validation: ${example.validationStatus}` : null,
      ].filter(Boolean);
      const title = example.label?.trim() ? ` — "${example.label.trim()}"` : "";
      const suffix = tags.length ? ` (${tags.join(", ")})` : "";
      const description = example.description?.trim()
        ? `\n${example.description.trim()}`
        : "";
      return (
        `Saved example ${index + 1} of ${picked.length}${title}${suffix}:${description}\n\n` +
        `\`\`\`json\n${JSON.stringify(example.data, null, 2)}\n\`\`\``
      );
    })
    .join("\n\n");
}

export interface ComposeKindEditSeedInput extends KindAgentIntentInput {
  readiness: ShapeReadiness;
  examples: readonly KindExampleListItem[];
  /** Extra facts the calling page already holds (doctor row, skills, …). */
  extraKindContext?: Record<string, unknown>;
}

/** Pure: compose the full seed from data already in hand. */
export function composeKindEditSeed(
  input: ComposeKindEditSeedInput,
): KindAgentSeed {
  const { readiness, examples, extraKindContext, ...intent } = input;
  const definition = readiness.definition;
  const base = composeKindAgentIntent({
    ...intent,
    emittedJsonSchema: definition?.emittedJsonSchema ?? intent.emittedJsonSchema,
  });
  const existing = buildExistingShapeVariables(readiness);
  if (!existing.kind_schema) existing.kind_schema = base.variables.kind_schema;
  if (extraKindContext && Object.keys(extraKindContext).length > 0) {
    const extra = `What this page also knows about the Shape:\n\n\`\`\`json\n${JSON.stringify(extraKindContext, null, 2)}\n\`\`\``;
    existing.existing_kind_context = existing.existing_kind_context
      ? `${existing.existing_kind_context}\n\n${extra}`
      : extra;
  }

  const metadata = definition && isJsonObject(definition.metadata)
    ? definition.metadata
    : null;
  const disposition = metadata?.disposition;

  return {
    draftText: base.draftText,
    variables: {
      ...base.variables,
      ...existing,
      user_data_sample: formatExamples(examples),
      shape_name: definition?.label?.trim() || intent.label,
      shape_disposition: isKindDisposition(disposition) ? disposition : "",
      shape_visibility: definition
        ? definition.publishedToWeb
          ? "published_to_web"
          : "not_published"
        : "",
    },
  };
}

/** Read the live Shape + its top saved examples, then compose the full seed. */
export async function loadKindEditSeed(
  input: KindAgentIntentInput & { extraKindContext?: Record<string, unknown> },
): Promise<KindAgentSeed> {
  // Each read stands alone: a failed example read keeps the registration,
  // and a failed registration read keeps the page's own facts.
  const failures: string[] = [];
  const note = (what: string, error: unknown) => {
    console.error(`[kind-edit-seed] ${what} for "${input.kind}":`, error);
    failures.push(error instanceof Error ? error.message : String(error));
  };

  let readiness: ShapeReadiness;
  try {
    readiness = await loadShapeReadiness(input.kind);
  } catch (error) {
    note("could not read the Shape registration", error);
    readiness = buildShapeReadiness({ rootKind: input.kind });
  }

  let examples: KindExampleListItem[] = [];
  if (readiness.definition) {
    try {
      examples = await fetchKindExamples(
        readiness.definition.id,
        KIND_EDIT_SEED_EXAMPLE_LIMIT,
      );
    } catch (error) {
      note("could not read saved examples", error);
    }
  }

  if (failures.length > 0) {
    toast.message("Agent starting with less context", {
      description: failures.join(" · "),
    });
  }
  return composeKindEditSeed({ ...input, readiness, examples });
}

/**
 * Seed for "Build with agent" on a Shape the viewer cannot edit: a NEW Shape
 * modeled on this one. The instruction is the create brief; this Shape's
 * schema, registration, component and saved examples ride along as the
 * reference. The `shape_*` answers belong to the new Shape, so they stay
 * blank for the person to give.
 */
export async function loadKindReferenceSeed(input: {
  kind: string;
  label: string;
}): Promise<KindAgentSeed> {
  const reference = await loadKindEditSeed({ ...input, part: "edit" });
  const create = composeNewShapeIntent({
    likeKind: input.kind,
    likeLabel: input.label,
  });
  const {
    shape_name: _name,
    shape_disposition: _disposition,
    shape_visibility: _visibility,
    ...referenceVariables
  } = reference.variables;
  return {
    draftText: create.draftText,
    variables: {
      ...referenceVariables,
      task_brief: create.variables.task_brief,
    },
  };
}
