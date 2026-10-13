// features/unified-data/standard-field-columns/loadStandardFields.ts
//
// THE READ BEHIND useStandardFieldColumns — the organization's own Fields of one token, across every
// organization a list spans. Split from the hook (2026-10-13) so the records clients it needs load
// only when a list asks: the hook reaches this module through ONE `import()` inside its effect,
// because the hook is bound on every route by the table host. Nothing else imports this file.

import { createRecordsClient } from "@ai-matrx/records/core";
import { optionKey, optionLabel } from "@ai-matrx/records";
import { personActor, recordsDataSource } from "@ai-matrx/records-ui/helpers";
import { createClient } from "@/utils/supabase/client";
import {
  mergeFieldDefinitions,
  optionsInDeclaredOrder,
  type StandardFieldColumn,
  type StandardFieldDefinition,
  type StandardFieldOption,
} from "./standardFieldColumns";

/** What one read of a token's Fields answers (the hook adds which request it was for). */
export interface LoadedStandardFields {
  fields: StandardFieldColumn[];
  unavailable: number;
  error: string | null;
}

type AcrossAnswer =
  | {
      ok: true;
      data: {
        fields: (Record<string, unknown> & { id: string; options?: Record<string, { label: string; retired?: boolean; position?: number | null }> | null })[];
        unavailable: { organization_id?: string; reason?: string | null }[];
      };
    }
  | { ok: false; error: { code?: string; message: string } };
type AcrossDoor = (args: { token: string; organization_ids: string[] }) => Promise<AcrossAnswer>;
let warnedClientLacksAcross = false;

export async function loadFields(
  token: string,
  organizationIds: readonly string[],
  userId: string | null,
): Promise<LoadedStandardFields> {
  if (organizationIds.length === 0) return { fields: [], unavailable: 0, error: null };
  const dataSource = recordsDataSource(createClient());
  // ONE READ ACROSS EVERY ORGANIZATION THE LIST SPANS: `custom.entity_fields_across` answers the
  // Fields and their choices together and names any organization it may not reach.
  const client = createRecordsClient({ dataSource, actor: personActor(userId), organizationId: organizationIds[0] });
  // 🚨 THE INSTALLED CLIENT MAY PREDATE THE DOOR (@ai-matrx/records 0.61.1 has no `entityFieldsAcross`;
  // it arrives in 0.63). Calling a missing method threw, and every list's custom columns failed. Until
  // the package lands, read once per organization — said once in the console, never silently.
  const acrossDoor = (client as unknown as { entityFieldsAcross?: AcrossDoor }).entityFieldsAcross;
  if (typeof acrossDoor !== "function") {
    if (!warnedClientLacksAcross) {
      warnedClientLacksAcross = true;
      console.warn(
        "[standard-field-columns] the installed @ai-matrx/records client has no entityFieldsAcross; reading Fields once per organization until it is updated.",
      );
    }
    return loadFieldsPerOrganization(token, organizationIds, userId, dataSource);
  }
  // THE DOOR READS AT MOST ACROSS_PAGE ORGANIZATIONS PER CALL (it refuses more, by name): a person
  // in more is read in pages and the answers merged — never an error that empties every column.
  const pages: string[][] = [];
  for (let i = 0; i < organizationIds.length; i += ACROSS_PAGE) pages.push(organizationIds.slice(i, i + ACROSS_PAGE));
  const answers = await Promise.all(
    pages.map((ids) => acrossDoor.call(client, { token, organization_ids: ids })),
  );
  const refused = answers.find((a): a is Extract<AcrossAnswer, { ok: false }> => !a.ok);
  if (!refused) {
    const definitions: StandardFieldDefinition[] = [];
    const optionsByField = new Map<string, StandardFieldOption[]>();
    let unavailableReasons: string[] = [];
    for (const across of answers) {
      if (!across.ok) continue;
      for (const field of across.data.fields) {
        definitions.push(field as unknown as StandardFieldDefinition);
        if (field.options && typeof field.options === "object") {
          optionsByField.set(
            field.id,
            optionsInDeclaredOrder(field.options),
          );
        }
      }
      unavailableReasons = unavailableReasons.concat(across.data.unavailable.map((u) => u.reason ?? "unavailable"));
    }
    const unavailable = unavailableReasons.length;
    return {
      fields: mergeFieldDefinitions(definitions, optionsByField),
      unavailable,
      error: unavailable === organizationIds.length ? (unavailableReasons[0] ?? null) : null,
    };
  }
  if (refused.error.code !== "door_absent") {
    return { fields: [], unavailable: organizationIds.length, error: refused.error.message };
  }
  // THE DOOR IS NOT ON THIS DATABASE YET (it is owed by lane7w2_b, the chair's apply): read once
  // per organization until it lands — said once in the console, never silently.
  if (!warnedPerOrganization) {
    warnedPerOrganization = true;
    console.warn(
      "[standard-field-columns] custom.entity_fields_across is not on this database yet; reading Fields once per organization.",
    );
  }
  return loadFieldsPerOrganization(token, organizationIds, userId, dataSource);
}

let warnedPerOrganization = false;

/** The most organizations one `custom.entity_fields_across` call reads (the door's own cap). */
export const ACROSS_PAGE = 200;

async function loadFieldsPerOrganization(
  token: string,
  organizationIds: readonly string[],
  userId: string | null,
  dataSource: ReturnType<typeof recordsDataSource>,
): Promise<LoadedStandardFields> {
  const definitions: StandardFieldDefinition[] = [];
  const optionsByField = new Map<string, StandardFieldOption[]>();
  let unavailable = 0;
  let lastError: string | null = null;
  await Promise.all(
    organizationIds.map(async (organizationId) => {
      const client = createRecordsClient({ dataSource, actor: personActor(userId), organizationId });
      const answer = await client.entityFields({ token });
      if (!answer.ok) {
        unavailable += 1;
        lastError = answer.error.message;
        return;
      }
      for (const field of answer.data as unknown as StandardFieldDefinition[]) {
        definitions.push(field);
        // The Field's own options column; config for a Field written before that column.
        const config = (field.config ?? {}) as Record<string, unknown>;
        const optionsTableId = field.options_table_id ?? config.options_table_id;
        if (field.type === "list" && typeof optionsTableId === "string" && optionsTableId) {
          const options = await client.fieldOptions({ field_id: field.id });
          // A choice list that cannot be read still lists its values as stored.
          if (options.ok) {
            optionsByField.set(
              field.id,
              options.data
                .filter((o) => !o.deleted_at)
                .map((o) => ({ key: optionKey(o), label: optionLabel(o) })),
            );
          }
        }
      }
    }),
  );
  const fields = mergeFieldDefinitions(definitions, optionsByField);
  const allFailed = organizationIds.length > 0 && unavailable === organizationIds.length;
  return { fields, unavailable, error: allFailed ? lastError : null };
}
