/**
 * The two answer-action kinds: `contact` (a person or business to reach) and `event` (one thing on
 * a calendar). Each renders with one real action: Save contact (the governed CRM save dialog) and
 * Add to calendar (an importable `.ics`).
 *
 * PLATFORM-OWNED rows in `content_ir.kind_definition` (minted by the `kind_create` tool with
 * `platform_kind`); the generated payload types live in `kinds/generated/kinds.generated.ts`
 * (`pnpm shape:types`). These `KindSchema`s are the front-end parser mirrors and must list exactly
 * the registry's fields. The bridge is the search family's ONE uniform `{ value, isComplete }`
 * streaming wrapper, never a second copy.
 */

import type { KindDefinition, KindSchema } from "@ai-matrx/content-ir";
import { makeSearchKindBridge } from "./search-results";

export const contactKindSchema: KindSchema = {
  kind: "contact",
  fields: {
    name: { type: "string", required: true },
    title: { type: "string" },
    organization: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    website: { type: "string" },
    address: { type: "string" },
    notes: { type: "string" },
  },
};

export const eventKindSchema: KindSchema = {
  kind: "event",
  fields: {
    title: { type: "string", required: true },
    start: { type: "string", required: true, description: "ISO 8601 date or date-time." },
    end: { type: "string" },
    time_zone: { type: "string" },
    location: { type: "string" },
    description: { type: "string" },
    url: { type: "string" },
  },
};

export const ANSWER_KINDS_KIND_DEFINITIONS: KindDefinition[] = [contactKindSchema, eventKindSchema].map(
  (schema): KindDefinition => ({
    kind: schema.kind,
    schemaSource: "system",
    tier: "eager",
    legacyBlockType: schema.kind,
    toLegacyServerData: makeSearchKindBridge(schema.kind),
    persistence: { persistStructured: true },
    schema,
  }),
);
